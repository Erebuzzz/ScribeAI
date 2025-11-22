import { notFound } from "next/navigation";
import { SessionRecorder } from "@/components/session-recorder";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { RecorderStatus } from "@/hooks/useAudioStream";

const estimateTokens = (text: string) => Math.ceil(text.length / 4);

interface SessionPageProps {
  params: { id: string };
}

export default async function SessionPage({ params }: SessionPageProps) {
  const user = await requireUser();
  const session = await prisma.session.findFirst({
    where: { id: params.id, userId: user.id },
    include: {
      transcript: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!session) {
    notFound();
  }

  const transcriptLines = session.transcript?.map((segment) => segment.text) ?? [];

  const now = Date.now();
  const minuteWindow = new Date(now - 60 * 1000);
  const dayWindow = new Date(now - 24 * 60 * 60 * 1000);

  const recentSegments = await prisma.transcriptSegment.findMany({
    where: {
      session: { userId: user.id },
      createdAt: { gte: minuteWindow },
    },
    select: { text: true },
  });

  const rpmUsed = recentSegments.length;
  const tpmUsed = recentSegments.reduce((sum, segment) => sum + estimateTokens(segment.text), 0);

  const rpdUsed = await prisma.transcriptSegment.count({
    where: {
      session: { userId: user.id },
      createdAt: { gte: dayWindow },
    },
  });

  const tierLabel = process.env.GEMINI_TIER_LABEL ?? "Gemini Paid Tier";
  const rpmLimit = Number(process.env.GEMINI_RPM_LIMIT ?? 1000);
  const tpmLimit = Number(process.env.GEMINI_TPM_LIMIT ?? 1_000_000);
  const rpdLimit = Number(process.env.GEMINI_RPD_LIMIT ?? 10_000);

  const formatMetric = (label: string, used: number, limit: number, units: string) => ({
    label,
    used,
    limit,
    units,
    remaining: limit > 0 ? Math.max(0, limit - used) : 0,
  });

  const geminiQuota = {
    tierLabel,
    rpm: formatMetric("Requests / min", rpmUsed, rpmLimit, "req"),
    tpm: formatMetric("Tokens / min", tpmUsed, tpmLimit, "tok"),
    rpd: formatMetric("Requests / day", rpdUsed, rpdLimit, "req"),
  };

  return (
    <SessionRecorder
      sessionId={session.id}
      userId={user.id}
      title={session.title ?? "Untitled Session"}
      initialSummary={session.summary}
      initialTranscript={transcriptLines}
      initialStatus={session.state as RecorderStatus}
      geminiQuota={geminiQuota}
    />
  );
}
