import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

const navTiles = [
  {
    title: "Home",
    description: "Landing overview",
    href: "/",
  },
  {
    title: "Dashboard",
    description: "Session control center",
    href: "/dashboard",
  },
  {
    title: "Recorder",
    description: "Jump into a new capture",
    href: "/dashboard#new-session",
  },
  {
    title: "Docs",
    description: "Project repository",
    href: "https://github.com/Erebuzzz/ScribeAI",
    external: true,
  },
];

export async function SiteNav() {
  const session = await auth.api.getSession({ headers: headers() });

  return (
    <section className="space-y-4 rounded-card border border-border-subtle bg-surface-panel/80 p-6 shadow-surface backdrop-blur">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Image
            src="/logo.svg"
            alt="ScribeAI logo"
            width={140}
            height={42}
            className="h-14 w-auto shadow-glow object-contain"
            priority
          />
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-text-secondary">ScribeAI Control Bar</p>
            <h1 className="font-display text-2xl text-text-primary">Navigate anywhere in one tap</h1>
            <p className="text-sm text-text-secondary">
              {session?.user ? `Signed in as ${session.user.name ?? session.user.email}` : "Guest session"}
            </p>
          </div>
        </div>
        <Link
          href="mailto:kshitiz23kumar@gmail.com"
          className="inline-flex items-center gap-2 rounded-button border border-border-subtle px-4 py-2 text-sm text-text-primary transition hover:border-brand-accent"
        >
          Contact support
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {navTiles.map((tile) => (
          <Link
            key={tile.title}
            href={tile.href}
            target={tile.external ? "_blank" : undefined}
            rel={tile.external ? "noreferrer" : undefined}
            className="rounded-card border border-border-subtle bg-surface-raised/70 p-4 shadow-surface transition hover:border-brand-accent hover:shadow-glow"
          >
            <p className="text-xs uppercase tracking-[0.4em] text-text-secondary">{tile.title}</p>
            <p className="mt-2 font-display text-lg text-text-primary">{tile.description}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-card border border-border-subtle bg-gradient-to-r from-brand-accent to-brand-cyan p-5 text-surface-base shadow-glow">
          <p className="text-xs uppercase tracking-[0.4em]">Need help?</p>
          <h2 className="mt-2 font-display text-xl">Contact & Source</h2>
          <p className="mt-2 text-sm text-white/80">
            Email support or explore the GitHub repository for implementation details.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="mailto:kshitiz23kumar@gmail.com"
              className="rounded-button bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/30"
            >
              Email us
            </Link>
            <Link
              href="https://github.com/Erebuzzz/ScribeAI"
              className="rounded-button bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </Link>
          </div>
        </div>
        <div className="rounded-card border border-border-subtle bg-surface-raised/80 p-5 text-text-primary shadow-surface">
          <p className="text-xs uppercase tracking-[0.4em] text-text-secondary">Quick tips</p>
          <p className="mt-2 text-sm text-text-secondary">
            Use the navigation tiles above to switch contexts without leaving a recording. The control bar stays
            fixed across dashboard, sessions, and landing pages.
          </p>
        </div>
      </div>
    </section>
  );
}
