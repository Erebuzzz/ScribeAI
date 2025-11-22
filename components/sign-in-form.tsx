"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function SignInForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email")?.toString().trim();
    const password = formData.get("password")?.toString();

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    setPending(true);
    try {
      const csrfToken = await fetchCsrfToken();
      const response = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, callbackURL: "/dashboard", csrfToken }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? "Unable to sign in. Check your credentials.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="text-xs uppercase tracking-[0.4em] text-text-secondary">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="mt-2 w-full rounded-button border border-border-subtle bg-surface-base/70 px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-brand-accent focus:outline-none"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label htmlFor="password" className="text-xs uppercase tracking-[0.4em] text-text-secondary">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="mt-2 w-full rounded-button border border-border-subtle bg-surface-base/70 px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-brand-accent focus:outline-none"
          placeholder="••••••••"
        />
      </div>
      {error && <p className="text-sm text-status-error">{error}</p>}
      <button
        type="submit"
        className="w-full rounded-button bg-brand-accent px-4 py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
        disabled={pending}
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-xs text-text-secondary">
        Demo credentials are managed via Better Auth. Create an account with the CLI or seed script before signing in.
      </p>
    </form>
  );
}

async function fetchCsrfToken() {
  const response = await fetch("/api/auth/csrf", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to fetch CSRF token.");
  }

  const payload = (await response.json().catch(() => null)) as { csrfToken?: string } | null;
  if (!payload?.csrfToken) {
    throw new Error("CSRF token missing in response.");
  }

  return payload.csrfToken;
}
