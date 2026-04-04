"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getPlayers } from "@/lib/storage";
import { Player } from "@/lib/types";
import { invitePlayer } from "./actions";

// ─── Invite modal ─────────────────────────────────────────────────────────────

interface InviteModalProps {
  player: Player;
  onClose: () => void;
}

function InviteModal({ player, onClose }: InviteModalProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(
    null
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    const { error } = await invitePlayer(player.id, email);
    setLoading(false);
    if (error) {
      setResult({ ok: false, msg: error });
    } else {
      setResult({ ok: true, msg: `Invite sent to ${email}` });
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-surface border border-border w-full max-w-sm mx-4 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-bold uppercase tracking-widest text-base">
            Invite {player.name}
          </h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text text-lg leading-none transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {result ? (
          <div className="space-y-4">
            <p
              className={`text-sm font-body border px-3 py-2 ${
                result.ok
                  ? "text-green border-green/20 bg-green/5"
                  : "text-red border-red/20 bg-red/5"
              }`}
            >
              {result.msg}
            </p>
            <button
              onClick={onClose}
              className="w-full px-4 py-2 border border-border text-text-muted font-heading font-semibold uppercase text-xs tracking-wider hover:text-text transition-colors duration-150"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="block text-text-muted text-xs font-heading uppercase tracking-widest">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                placeholder="player@example.com"
                className="w-full bg-bg border border-border px-3 py-2 text-text placeholder:text-text-muted focus:outline-none focus:border-gold transition-colors duration-150"
              />
            </div>
            <p className="text-text-muted text-xs font-body">
              An invite email will be sent. When accepted, the player will be
              able to log in and vote directly.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={loading || !email}
                className="flex-1 px-4 py-2 bg-gold/10 border border-gold/30 text-gold font-heading font-semibold uppercase text-xs tracking-wider hover:bg-gold/20 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? "Sending…" : "Send Invite"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-border text-text-muted font-heading font-semibold uppercase text-xs tracking-wider hover:text-text transition-colors duration-150"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Admin page ───────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [inviteTarget, setInviteTarget] = useState<Player | null>(null);

  useEffect(() => {
    getPlayers().then((p) => {
      setPlayers(p);
      setLoaded(true);
    });
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  // After a successful invite, refresh the player list so the linked state updates.
  function handleInviteClose() {
    setInviteTarget(null);
    getPlayers().then(setPlayers);
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-[880px] mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-text-muted font-heading text-sm uppercase tracking-wider hover:text-text transition-colors duration-150"
            >
              ← Tapo Tracker
            </Link>
            <span className="text-border">|</span>
            <h1 className="font-heading text-sm font-bold uppercase tracking-widest text-gold">
              Admin
            </h1>
          </div>
          <button
            onClick={handleSignOut}
            className="text-text-muted font-heading text-xs uppercase tracking-wider hover:text-text transition-colors duration-150"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-[880px] w-full mx-auto px-4 py-8 space-y-8">
        {/* Players section */}
        <section className="space-y-3">
          <h2 className="font-heading text-xs font-bold uppercase tracking-widest text-text-muted">
            Players
          </h2>

          {!loaded ? null : players.length === 0 ? (
            <p className="text-text-muted text-sm">
              No players yet. Add them in the{" "}
              <Link href="/" className="text-gold hover:underline">
                Manage tab
              </Link>
              .
            </p>
          ) : (
            <div className="border border-border">
              {/* Column headers */}
              <div className="flex items-center px-4 py-2 border-b border-border bg-surface text-text-muted text-xs font-heading uppercase tracking-widest">
                <span className="flex-1">Name</span>
                <span className="w-24 text-center hidden sm:block">Role</span>
                <span className="w-24 text-center hidden sm:block">Auth</span>
                <span className="w-24 text-right">Actions</span>
              </div>

              {players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center px-4 py-3 border-b border-border last:border-b-0 hover:bg-white/[0.02] transition-colors duration-150"
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-heading font-semibold text-sm uppercase tracking-wide">
                      {player.name}
                    </span>
                    {player.tapologyUsername && (
                      <span className="text-text-muted text-xs font-body block">
                        {player.tapologyUsername}
                      </span>
                    )}
                  </div>

                  <div className="w-24 text-center hidden sm:block">
                    <span
                      className={`text-xs font-heading uppercase tracking-wider ${
                        player.role === "admin" ? "text-gold" : "text-text-muted"
                      }`}
                    >
                      {player.role}
                    </span>
                  </div>

                  <div className="w-24 text-center hidden sm:block">
                    {player.authUserId ? (
                      <span className="text-xs text-green font-heading uppercase tracking-wider">
                        Linked
                      </span>
                    ) : (
                      <span className="text-xs text-text-muted font-heading uppercase tracking-wider">
                        None
                      </span>
                    )}
                  </div>

                  <div className="w-24 text-right">
                    {!player.authUserId && (
                      <button
                        onClick={() => setInviteTarget(player)}
                        className="px-2.5 py-1 border border-border text-text-muted font-heading font-semibold uppercase text-xs tracking-wider hover:text-gold hover:border-gold/30 transition-colors duration-150"
                      >
                        Invite
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Invite modal */}
      {inviteTarget && (
        <InviteModal player={inviteTarget} onClose={handleInviteClose} />
      )}
    </div>
  );
}
