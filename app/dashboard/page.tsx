import Link from "next/link";
import { redirect } from "next/navigation";
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

  return (
    <main className="space-y-8">
      <header className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.4em] text-white/50">Welcome back</p>
          <h1 className="text-3xl font-semibold">{user.name ?? user.email}</h1>
          <p className="text-sm text-white/70">Track live and historical sessions, then jump in with one click.</p>
        </div>
        <form action={createSession} className="flex w-full max-w-md gap-3">
          <input
            name="title"
            placeholder="Quarterly planning..."
            className="flex-1 rounded-2xl border border-white/20 bg-black/40 px-4 py-3 text-sm focus:border-accent focus:outline-none"
          />
          <button type="submit" className="rounded-2xl bg-primary px-4 py-3 text-sm font-semibold">
            Start session
          </button>
        </form>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        {sessions.map((session) => (
          <Link
            key={session.id}
            href={`/session/${session.id}`}
            className="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-accent"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">{session.state}</p>
            <h2 className="mt-2 text-xl font-semibold">{session.title}</h2>
            <p className="text-sm text-white/60">
              {session.summary?.slice(0, 140) ?? "Awaiting summary..."}
            </p>
            <p className="mt-4 text-xs text-white/40">
              {new Date(session.createdAt).toLocaleString()}
            </p>
          </Link>
        ))}
        {sessions.length === 0 && (
          <p className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-white/60">
            No sessions yet. Start one to see the real-time pipeline shine.
          </p>
        )}
      </section>
    </main>
  );
}
