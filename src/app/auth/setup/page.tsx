"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getPlayers } from "@/lib/storage";
import { Player } from "@/lib/types";
import { completeSetup } from "@/app/admin/actions";

export default function SetupPage() {
  const router = useRouter();

  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [tapologyUsername, setTapologyUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      // Find the player record linked to this auth user
      const players = await getPlayers();
      const linked = players.find((p) => p.authUserId === user.id);

      if (!linked) {
        setError("No player record found for your account. Contact an admin.");
        setLoading(false);
        return;
      }

      setPlayer(linked);
      setName(linked.name);
      setTapologyUsername(linked.tapologyUsername ?? "");
      setLoading(false);
    }

    init();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!player) return;

    if (password && password !== confirmPassword) {
      setSaveMsg({ ok: false, text: "Passwords do not match." });
      return;
    }
    if (password && password.length < 6) {
      setSaveMsg({ ok: false, text: "Password must be at least 6 characters." });
      return;
    }

    setSaving(true);
    setSaveMsg(null);

    // Update player record (name + tapology username)
    const { error: profileError } = await completeSetup(player.id, {
      name,
      tapologyUsername,
    });

    if (profileError) {
      setSaving(false);
      setSaveMsg({ ok: false, text: profileError });
      return;
    }

    // Update password if provided
    if (password) {
      const { error: pwError } = await supabase.auth.updateUser({ password });
      if (pwError) {
        setSaving(false);
        setSaveMsg({ ok: false, text: pwError.message });
        return;
      }
    }

    setSaving(false);
    setSaveMsg({ ok: true, text: "Account set up! Redirecting…" });
    setTimeout(() => router.replace("/"), 1200);
  }

  const inputCls =
    "w-full bg-bg border border-border px-3 py-2 text-text placeholder:text-text-muted focus:outline-none focus:border-gold transition-colors duration-150";
  const labelCls =
    "block text-text-muted text-xs font-heading uppercase tracking-widest mb-1";

  if (loading) return null;

  if (error) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-4">
          <p className="text-red font-body text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold uppercase tracking-widest text-gold">
            Tapo Tracker
          </h1>
          <p className="text-text-muted text-sm font-body mt-1">
            Set up your account to get started.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              placeholder="Your name"
              maxLength={40}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Tapology Username</label>
            <input
              type="text"
              value={tapologyUsername}
              onChange={(e) => setTapologyUsername(e.target.value)}
              placeholder="e.g. mma_fan99 (optional)"
              maxLength={80}
              className={inputCls}
            />
          </div>

          <div className="border-t border-border pt-4 space-y-3">
            <p className="text-text-muted text-xs font-body">
              Set a password to log in with email and password.
            </p>
            <div>
              <label className={labelCls}>New Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                autoComplete="new-password"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                autoComplete="new-password"
                className={inputCls}
              />
            </div>
          </div>

          {saveMsg && (
            <p
              className={`text-sm font-body ${
                saveMsg.ok ? "text-green" : "text-red"
              }`}
            >
              {saveMsg.text}
            </p>
          )}

          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="w-full px-4 py-2.5 bg-gold/10 border border-gold/30 text-gold font-heading font-semibold uppercase tracking-wider hover:bg-gold/20 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : "Complete Setup"}
          </button>
        </form>
      </div>
    </div>
  );
}
