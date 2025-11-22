import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ArrowUpRight, Trash2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function DashboardPage() {
  const user = await requireUser();
  const sessions = await prisma.session.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      state: true,
      summary: true,
      createdAt: true,
    },
  });

  async function createSession(formData: FormData) {
    "use server";
    const title = formData.get("title")?.toString().trim() || "Untitled Session";
    const session = await prisma.session.create({
      data: {
        title,
        userId: user.id,
      },
      select: { id: true },
    });
    redirect(`/session/${session.id}`);
  }

  async function deleteSession(formData: FormData) {
    "use server";
    const sessionId = formData.get("sessionId")?.toString();
    if (!sessionId) {
      return;
    }

    await prisma.session.deleteMany({ where: { id: sessionId, userId: user.id } });
    revalidatePath("/dashboard");
  }

  return (
    <main className="space-y-8">
      <header className="flex flex-col gap-6 rounded-card border border-border-subtle bg-surface-panel/90 p-6 shadow-surface md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.5em] text-text-secondary">Welcome back</p>
          <h1 className="font-display text-3xl text-text-primary">{user.name ?? user.email}</h1>
          <p className="text-sm text-text-secondary">Track live and historical sessions, then jump in with one click.</p>
        </div>
        <form action={createSession} className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
          <input
            name="title"
            placeholder="Quarterly planning..."
            className="flex-1 rounded-button border border-border-subtle bg-surface-base/70 px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-brand-accent focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-button bg-brand-accent px-5 py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-brand-hover"
          >
            Start session
          </button>
        </form>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        {sessions.map((session) => {
          const created = new Date(session.createdAt);
          return (
            <article
              key={session.id}
              className="flex flex-col gap-4 rounded-card border border-border-subtle bg-surface-raised/80 p-5 shadow-surface"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-text-tertiary">{session.state}</p>
                  <h2 className="mt-2 font-display text-xl text-text-primary">{session.title}</h2>
                </div>
                <form action={deleteSession}>
                  <input type="hidden" name="sessionId" value={session.id} />
                  <button
                    type="submit"
                    className="rounded-button border border-border-subtle/70 bg-surface-base/60 p-2 text-text-secondary transition hover:border-status-error/60 hover:text-status-error"
                    aria-label={`Delete session ${session.title}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </form>
              </div>
              <p className="text-sm text-text-secondary">
                {session.summary?.slice(0, 180) ?? "Awaiting summary..."}
              </p>
              <p className="text-xs text-text-tertiary">{created.toLocaleDateString()} · {created.toLocaleTimeString()}</p>
              <div className="flex flex-wrap justify-between gap-3">
                <Link
                  href={`/session/${session.id}`}
                  className="inline-flex items-center gap-2 rounded-button border border-border-subtle px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-text-primary transition hover:border-brand-accent"
                >
                  Open session <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </article>
          );
        })}

        {sessions.length === 0 && (
          <p className="rounded-card border border-dashed border-border-subtle p-6 text-center text-sm text-text-secondary">
            No sessions yet. Start one to see the real-time pipeline shine.
          </p>
        )}
      </section>
    </main>
  );
}
