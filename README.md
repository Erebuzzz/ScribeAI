# ScribeAI

AI-powered meeting assistant that captures microphone or tab-share audio, streams it to Google Gemini for real-time transcription, and persists the outputs in Postgres via Prisma. Built to satisfy the Attack Capital Assignment 3 specs with Better Auth, Socket.io, and a buffering pipeline capable of hour-long sessions.

## Features

- **Dual-source audio capture** using `MediaRecorder` with 1-second `timeslice` across both `getUserMedia` (mic) and `getDisplayMedia` (tab/system audio).
- **Custom Node + Socket.io server** that buffers binary chunks, streams them to Gemini with backpressure, and persists transcript segments.
- **Better Auth** integration that protects `/dashboard` and `/session/[id]`, exposing server actions that only run for authenticated users.
- **Prisma + Postgres schema** for `User`, `Session`, and `TranscriptSegment`, enabling summaries and history views.
- **Stateful UI** built on a reducer-driven hook (`useAudioStream`) that survives tab suspensions via `localStorage` and `beforeunload` finalization.

## Getting Started

```bash
pnpm install
pnpm prisma:generate
pnpm dev
```

### Environment Variables

```
DATABASE_URL=postgresql://user:pass@localhost:5432/scribeai
GEMINI_API_KEY=your-google-api-key
GEMINI_MODEL=models/gemini-1.5-pro
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
```

## Architecture Comparison Table

| Criteria | Streaming (MediaRecorder + Socket.io) | Post-recording Upload |
| --- | --- | --- |
| Latency | ~1-2s token latency via Gemini streaming | Entire duration before insight (>1hr worst-case) |
| Reliability | Buffered queue with overflow signaling; chunks retried individually | Single large upload prone to failure/resume complexity |
| Resource Usage | Constant memory footprint; chunks discarded after persistence | Client holds full recording until upload completes |
| User Feedback | Live tokens, pause/resume, real-time status to UI | Binary feedback: "uploading" vs "done" |
| Cost Control | Early stop prevents wasted inference minutes | You pay for whole file even if decisions already made |

## Data Flow Diagram

```mermaid
sequenceDiagram
	autonumber
	participant Mic as Mic/Tab Audio
	participant Browser
	participant Socket as Node + Socket.io
	participant Gemini
	participant DB as Postgres
	Mic->>Browser: MediaRecorder chunk (1s)
	Browser->>Socket: emit("audio-stream", ArrayBuffer)
	Socket->>Gemini: streamGenerateContent(chunk)
	Gemini-->>Socket: transcription tokens
	Socket-->>Browser: transcription-token/chunk events
	Socket->>DB: Prisma.save(TranscriptSegment)
	Browser->>Socket: stop-session
	Socket->>Gemini: meeting summary prompt
	Socket->>DB: persist summary
	Socket-->>Browser: completed(summary)
```

## Long-session Scalability (200 words)

Keeping latency low for 60-minute sessions requires guarding every hop. On the client, `MediaRecorder` emits deterministic 1-second blobs, so memory never grows beyond a couple of chunks. We immediately convert each blob to an `ArrayBuffer` and fire-and-forget through Socket.io, but also persist recorder state in `localStorage`. If the tab sleeps, the hook resumes by rejoining the same session ID, ensuring we do not generate duplicate `Session` rows. On the server, each session owns a FIFO queue capped at 32 chunks. Instead of dropping audio when Gemini slows, we emit a `buffer-overflow` warning back to the client while the queue drains asynchronously. With `maxHttpBufferSize` raised to 10 MB, we can comfortably hold 30–40 seconds of backlog without hitting Node’s memory ceiling. Transcript chunks are flushed into Postgres as soon as Gemini returns text, so replaying or summarizing does not require loading hourlong buffers into RAM. For summarization, we stitch the ordered segments into a single string, but only at `stop-session`, meaning the hot path remains lightweight. Finally, Socket.io rooms scope broadcasts per session, preventing noisy clients from overwhelming others. This combination keeps CPU bounded, allows horizontal scaling by sharding sessions across instances, and gives operators visibility when inference throughput becomes a bottleneck.

## Constraint Checklist

1. **Better Auth:** Configured in `lib/auth.ts` with Prisma adapter.
2. **Next.js App Router:** App directory structure with server components.
3. **Tab Audio:** `useAudioStream` leverages `navigator.mediaDevices.getDisplayMedia` for system audio.
4. **Custom Node Server:** `server.ts` boots Next + Socket.io.
5. **Gemini Prompting:** `lib/gemini.ts` optimizes both transcription tokens and diarization-focused summaries.