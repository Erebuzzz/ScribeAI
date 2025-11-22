import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SignInForm } from "@/components/sign-in-form";
import { auth } from "@/lib/auth";

export default async function SignInPage() {
  const session = await auth.api.getSession({ headers: headers() });
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-8 rounded-card border border-border-subtle bg-surface-panel/90 p-8 shadow-surface">
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.5em] text-text-secondary">Welcome</p>
        <h1 className="font-display text-3xl text-text-primary">Sign in to ScribeAI</h1>
        <p className="text-sm text-text-secondary">
          Use the credentials you registered via Better Auth. Once signed in, you can launch real-time sessions and revisit summaries in your dashboard.
        </p>
      </div>
      <SignInForm />
      <p className="text-center text-xs text-text-secondary">
        Need an account? <Link href="/signup" className="text-brand-accent">Create one here</Link> to use the Better Auth email/password flow without leaving the app.
      </p>
      <Link href="/" className="text-center text-xs text-brand-accent">
        ← Back to landing
      </Link>
    </main>
  );
}
