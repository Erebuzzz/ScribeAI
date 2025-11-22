import { notFound } from "next/navigation";
import { SessionRecorder } from "@/components/session-recorder";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { RecorderStatus } from "@/hooks/useAudioStream";

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

  return (
    <SessionRecorder
      sessionId={session.id}
      userId={user.id}
      title={session.title ?? "Untitled Session"}
      initialSummary={session.summary}
      initialTranscript={transcriptLines}
      initialStatus={session.state as RecorderStatus}
    />
  );
}
