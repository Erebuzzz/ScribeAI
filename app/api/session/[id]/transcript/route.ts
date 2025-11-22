import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const session = await prisma.session.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
      include: {
        transcript: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!session) {
      return new NextResponse("Session not found", { status: 404 });
    }

    const transcriptText = session.transcript
      .map((segment) => segment.text)
      .join("\n");

    const content = `Title: ${session.title}\nDate: ${session.createdAt.toISOString()}\n\nSummary:\n${session.summary || "No summary available."}\n\nTranscript:\n${transcriptText}`;

    return new NextResponse(content, {
      headers: {
        "Content-Type": "text/plain",
        "Content-Disposition": `attachment; filename="transcript-${session.id}.txt"`,
      },
    });
  } catch (error) {
    console.error("Download error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
