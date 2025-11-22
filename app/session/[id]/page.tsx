import { notFound } from "next/navigation";
import { SessionRecorder } from "@/components/session-recorder";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface SessionPageProps {
  params: { id: string };
}

export default async function SessionPage({ params }: SessionPageProps) {
  const user = await requireUser();
  const session = await prisma.session.findFirst({
    where: { id: params.id, userId: user.id },
  });

  if (!session) {
    notFound();
  }

  return (
    <SessionRecorder
      sessionId={session.id}
      userId={user.id}
      title={session.title ?? "Untitled Session"}
    />
  );
}
