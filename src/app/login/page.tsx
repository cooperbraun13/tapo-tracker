"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

// useSearchParams must live inside a Suspense boundary.
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/admin";
  const callbackError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    callbackError ? "Authentication failed. Please try again." : null
  );
  const [loading, setLoading] = useState(false);

  // If already signed in, redirect immediately.
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace(redirectTo);
    });
  }, [redirectTo, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.replace(redirectTo);
  }

  return (
    <main className="flex-1 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold uppercase tracking-widest text-text">
            Sign In
          </h1>
          <p className="text-text-muted text-sm mt-1 font-body">
            Admin access only.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="block text-text-muted text-xs font-heading uppercase tracking-widest">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full bg-surface border border-border px-3 py-2.5 text-text placeholder:text-text-muted focus:outline-none focus:border-gold transition-colors duration-150"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-text-muted text-xs font-heading uppercase tracking-widest">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full bg-surface border border-border px-3 py-2.5 text-text placeholder:text-text-muted focus:outline-none focus:border-gold transition-colors duration-150"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-red text-sm font-body border border-red/20 bg-red/5 px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full px-4 py-2.5 bg-gold/10 border border-gold/30 text-gold font-heading font-semibold uppercase text-sm tracking-wider hover:bg-gold/20 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-[880px] mx-auto px-4 py-4">
          <Link
            href="/"
            className="text-text-muted font-heading text-sm uppercase tracking-wider hover:text-text transition-colors duration-150"
          >
            ← Tapo Tracker
          </Link>
        </div>
      </header>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
