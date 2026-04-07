"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Login failed");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-6 py-16">
      <h1
        className="mb-1 text-3xl font-extrabold tracking-tight"
        style={{ fontFamily: "var(--font-syne), system-ui" }}
      >
        BillFlow
      </h1>
      <p className="mb-8 text-sm text-[var(--muted)]">
        Sign in to your financial automation workspace.
      </p>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--muted)]">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3 py-2.5 text-[var(--foreground)] outline-none ring-[var(--accent)] focus:ring-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--muted)]">Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3 py-2.5 text-[var(--foreground)] outline-none ring-[var(--accent)] focus:ring-2"
          />
        </label>
        {error ? <p className="text-sm text-[var(--expense)]">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-[var(--accent-fg)] disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-[var(--muted)]">
        No account?{" "}
        <Link href="/register" className="text-[var(--accent)] hover:underline">
          Register
        </Link>
      </p>
    </div>
  );
}
