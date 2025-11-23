# ScribeAI

ScribeAI is a small but opinionated meeting assistant that captures microphone or tab audio, streams it to Google Gemini for transcription, and stores the results in Postgres through Prisma. It was built for the Attack Capital Assignment 3 spec and then polished into something that feels comfortable to use for real calls.

The project is deployed in a split setup:

- Frontend on Vercel: <https://scribe-ai-zeta.vercel.app/>
- Backend on Render: <https://scribeai-backend-r9er.onrender.com/>

If you want to say hello or report a bug you can reach me at `kshitiz23kumar@gmail.com`.

## Features

- Dual source audio capture using `MediaRecorder` for both `getUserMedia` (mic) and `getDisplayMedia` (tab audio).
- Custom Node plus Socket.io server that buffers binary chunks, streams them to Gemini with a small in memory queue, and persists transcript segments.
- Better Auth integration that protects `/dashboard` and `/session/[id]` so only authenticated users can start sessions.
- Prisma + Postgres schema for `User`, `Session`, and `TranscriptSegment`, which powers summaries, history views, and exports.
- Stateful UI built on the `useAudioStream` hook, which survives tab suspensions thanks to `localStorage` and a small XState machine.

## Getting Started

The dev script starts both Next.js and the custom Node server so you only need a single command.

```bash
pnpm install
pnpm prisma:generate
pnpm dev
```

### Environment Variables

The exact values will differ per environment, but the shape looks like this.

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/scribeai
DIRECT_URL=postgresql://user:pass@localhost:5432/scribeai
GEMINI_API_KEY=your-google-api-key
GEMINI_MODEL=models/gemini-1.5-pro
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
```

## Streaming Pipeline (Mermaid)

```mermaid
---
config:
  layout: elk
---
flowchart TB
 subgraph Client["Browser / Next.js app"]
    direction TB
        Mic["Mic / Tab Audio (MediaRecorder)"]
        Hook["useAudioStream hook (XState status + sockets)"]
        UI["SessionRecorder UI (controls + tokens)"]
 end
 subgraph Server["Node server + Socket.io"]
    direction TB
        Socket["Socket.io gateway (join-session, audio-stream, stop-session)"]
        Queue["Session buffer - bounded FIFO per session"]
 end
    
    %% Connections
    Mic -- "30s audio chunks" --> Hook
    Hook -- "emit 'audio-stream' with ArrayBuffer" --> Socket
    Socket -- "enqueue chunk" --> Queue
    Queue -- "processQueue - one chunk at a time" --> Gemini["Google Gemini API - streamGeminiTranscription / summarizeTranscript"]
    
    Gemini -- "tokens + text" --> Socket
    Socket -- "transcription-token / transcription-chunk" --> UI
    Socket -- "create TranscriptSegment" --> DB["Postgres via Prisma - Session + TranscriptSegment"]
    
    UI -- "stop-session" --> Socket
    Socket -- "load ordered segments" --> DB
    Socket -- "summarizeTranscript" --> Gemini
    Gemini -- "summary text" --> Socket
    Socket -- "state COMPLETED + downloadUrl" --> UI
```

## Architecture comparison

The core design choice is to stream audio chunks over Socket.io instead of uploading one large recording at the end.

| Criteria | Streaming (MediaRecorder + Socket.io) | Post recording upload |
| --- | --- | --- |
| Latency | First tokens within a few seconds and steady updates while speaking | No insight until the entire recording has been uploaded and processed |
| Reliability | Small chunks flow through a bounded queue, the server can warn about backlog, and a single failed chunk does not lose the whole meeting | A single network hiccup can corrupt or stall a very large upload, and resuming correctly is harder |
| Resource usage | The browser holds at most the current chunk, the server flushes text to Postgres as soon as Gemini responds | The client keeps the full recording in memory or disk until the upload finishes |
| User feedback | Live transcript, visible state machine (recording, paused, processing, completed) and a summary that appears as soon as Gemini finishes | Simple progress bar with a long quiet period where it is not obvious that anything is happening |
| Cost control | You can stop early when the important part of the conversation is done and avoid paying for the rest of the audio | You usually send the entire file even if most of it is silence or small talk |

## Long session scalability

Handling sessions that run close to an hour is mainly a matter of controlling memory and keeping the hot path predictable. On the client side `MediaRecorder` is configured to emit deterministic thirty second blobs. Each blob is turned into an `ArrayBuffer` and sent to the server, then the browser can forget about it. The hook keeps only lightweight state: the current status from the XState machine, a running list of tokens for a nice streaming effect, and the buffered transcript that was already persisted in the database.

On the server each session gets a small FIFO queue that holds pending audio chunks. The queue size is capped so it cannot grow without bound. When Gemini responds, the text is written to Postgres as a `TranscriptSegment` row and the corresponding chunk is dropped from memory. The summary step only happens when the client sends `stop-session`. At that point the server joins the ordered segments into a single string and calls Gemini once more with a focused summarization prompt. This keeps the realtime streaming loop lean while still giving you a rich summary at the end. Horizontal scaling is straightforward because sessions are independent and attach to their own Socket.io room.

## Constraint checklist

1. Better Auth configured in `lib/auth.ts` with Prisma adapter.
2. Next.js App Router layout under `app/` with server components for data fetching.
3. Tab audio capture implemented in `useAudioStream` via `navigator.mediaDevices.getDisplayMedia`.
4. Custom Node server in `server.ts` that boots Next and the Socket.io transport.
5. Gemini integration in `lib/gemini.ts` for both streaming transcription and post processing summaries.