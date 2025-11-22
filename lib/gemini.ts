import { GoogleGenerativeAI } from "@google/generative-ai";

const modelName = process.env.GEMINI_MODEL ?? "models/gemini-1.5-pro";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  // eslint-disable-next-line no-console
  console.warn("GEMINI_API_KEY is not set. Gemini calls will fail until it is provided.");
}

const genAI = new GoogleGenerativeAI(apiKey ?? "test-key");

/**
 * Streams a single audio chunk to Gemini and invokes callbacks with incremental text tokens.
 */
export async function streamGeminiTranscription(
  audioChunk: Buffer,
  {
    mimeType = "audio/webm",
    onToken,
  }: {
    mimeType?: string;
    onToken?: (text: string) => void;
  } = {}
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: modelName });
  const prompt = {
    role: "user" as const,
    parts: [
      {
        text: "Transcribe the following audio chunk with speaker change hints if possible.",
      },
      {
        inlineData: {
          data: audioChunk.toString("base64"),
          mimeType,
        },
      },
    ],
  };

  const response = await model.generateContentStream({ contents: [prompt] });
  let textAccumulator = "";

  for await (const chunk of response.stream) {
    const text = chunk.text();
    if (text) {
      textAccumulator += text;
      onToken?.(text);
    }
  }

  return textAccumulator.trim();
}

/**
 * Summarizes the final transcript using a diarization-friendly prompt.
 */
export async function summarizeTranscript(transcript: string): Promise<string> {
  if (!transcript) {
    return "No transcript available to summarize.";
  }

  const model = genAI.getGenerativeModel({ model: modelName });
  const summaryPrompt = `You are an expert meeting assistant. Given the transcript below, summarize the meeting focusing on key points, decisions, owners, and action items with due dates if mentioned. Use bullet points.
Transcript:\n${transcript}`;

  const result = await model.generateContent(summaryPrompt);
  return result.response.text().trim();
}
