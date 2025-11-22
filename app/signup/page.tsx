import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SignUpForm } from "@/components/sign-up-form";
import { auth } from "@/lib/auth";

export default async function SignUpPage() {
  const session = await auth.api.getSession({ headers: headers() });
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-8 rounded-card border border-border-subtle bg-surface-panel/90 p-8 shadow-surface">
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.5em] text-text-secondary">Create account</p>
        <h1 className="font-display text-3xl text-text-primary">Join ScribeAI</h1>
        <p className="text-sm text-text-secondary">
          Accounts are powered by Better Auth with credentials stored in Postgres via Prisma. After registering you can sign in immediately and start capturing AI-assisted meeting notes.
        </p>
      </div>
      <SignUpForm />
      <div className="text-center text-xs text-text-secondary">
        Already registered? <Link href="/signin" className="text-brand-accent">Sign in instead.</Link>
      </div>
      <Link href="/" className="text-center text-xs text-brand-accent">
        ← Back to landing
      </Link>
    </main>
  );
}
