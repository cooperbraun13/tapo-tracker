"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/admin";
  const callbackError = searchParams.get("error");

  const [view, setView] = useState<"login" | "forgot">("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    callbackError ? "Authentication failed. Please try again." : null
  );
  const [loading, setLoading] = useState(false);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState<{ ok: boolean; text: string } | null>(null);

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

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setForgotLoading(true);
    setForgotMsg(null);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      forgotEmail,
      { redirectTo: `${APP_URL}/auth/callback?next=/auth/setup` }
    );

    setForgotLoading(false);

    if (resetError) {
      setForgotMsg({ ok: false, text: resetError.message });
    } else {
      setForgotMsg({
        ok: true,
        text: `Check ${forgotEmail} for a password reset link.`,
      });
    }
  }

  const inputCls =
    "w-full bg-surface border border-border px-3 py-2.5 text-text placeholder:text-text-muted focus:outline-none focus:border-gold transition-colors duration-150";
  const labelCls =
    "block text-text-muted text-xs font-heading uppercase tracking-widest";

  return (
    <main className="flex-1 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        {view === "login" ? (
          <>
            <div>
              <h1 className="font-heading text-2xl font-bold uppercase tracking-widest text-text">
                Sign In
              </h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className={labelCls}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className={inputCls}
                  placeholder="you@example.com"
                />
              </div>

              <div className="space-y-1">
                <label className={labelCls}>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className={inputCls}
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

            <button
              onClick={() => {
                setView("forgot");
                setForgotEmail(email);
                setForgotMsg(null);
              }}
              className="text-text-muted text-xs font-body hover:text-text transition-colors duration-150"
            >
              Forgot password?
            </button>
          </>
        ) : (
          <>
            <div>
              <h1 className="font-heading text-2xl font-bold uppercase tracking-widest text-text">
                Reset Password
              </h1>
              <p className="text-text-muted text-sm mt-1 font-body">
                We'll send a link to set a new password.
              </p>
            </div>

            {forgotMsg?.ok ? (
              <p className="text-green text-sm font-body border border-green/20 bg-green/5 px-3 py-2">
                {forgotMsg.text}
              </p>
            ) : (
              <form onSubmit={handleForgot} className="space-y-3">
                <div className="space-y-1">
                  <label className={labelCls}>Email</label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    autoFocus
                    autoComplete="email"
                    className={inputCls}
                    placeholder="you@example.com"
                  />
                </div>

                {forgotMsg && !forgotMsg.ok && (
                  <p className="text-red text-sm font-body border border-red/20 bg-red/5 px-3 py-2">
                    {forgotMsg.text}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={forgotLoading || !forgotEmail}
                  className="w-full px-4 py-2.5 bg-gold/10 border border-gold/30 text-gold font-heading font-semibold uppercase text-sm tracking-wider hover:bg-gold/20 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {forgotLoading ? "Sending…" : "Send Reset Link"}
                </button>
              </form>
            )}

            <button
              onClick={() => setView("login")}
              className="text-text-muted text-xs font-body hover:text-text transition-colors duration-150"
            >
              ← Back to sign in
            </button>
          </>
        )}
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
