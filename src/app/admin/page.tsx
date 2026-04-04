"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getPlayers } from "@/lib/storage";
import { Player } from "@/lib/types";
import { invitePlayer, inviteNewPlayer, setPlayerRole } from "./actions";

// ─── Shared result banner ─────────────────────────────────────────────────────

function ResultBanner({
  result,
  onClose,
}: {
  result: { ok: boolean; msg: string };
  onClose: () => void;
}) {
  return (
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
  );
}

// ─── Invite-to-claim modal ────────────────────────────────────────────────────

function InviteClaimModal({
  player,
  onClose,
}: {
  player: Player;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await invitePlayer(player.id, email);
    setLoading(false);
    setResult(
      error
        ? { ok: false, msg: error }
        : { ok: true, msg: `Invite sent to ${email}` }
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-surface border border-border w-full max-w-sm mx-4 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading font-bold uppercase tracking-widest text-base">
              Invite {player.name}
            </h2>
            <p className="text-text-muted text-xs font-body mt-0.5">
              Link an existing account to this player record.
            </p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text text-lg leading-none">✕</button>
        </div>

        {result ? (
          <ResultBanner result={result} onClose={onClose} />
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
              They'll receive an invite link. Once accepted, their login will
              be linked to the <strong className="text-text">{player.name}</strong> record.
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

// ─── Invite-new-player modal ──────────────────────────────────────────────────

function InviteNewModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await inviteNewPlayer(name, email, role);
    setLoading(false);
    setResult(
      error
        ? { ok: false, msg: error }
        : { ok: true, msg: `${name} created and invite sent to ${email}` }
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-surface border border-border w-full max-w-sm mx-4 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading font-bold uppercase tracking-widest text-base">
              Invite New Player
            </h2>
            <p className="text-text-muted text-xs font-body mt-0.5">
              Create a player record and send an invite.
            </p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text text-lg leading-none">✕</button>
        </div>

        {result ? (
          <ResultBanner result={result} onClose={onClose} />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="block text-text-muted text-xs font-heading uppercase tracking-widest">
                Display Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
                placeholder="e.g. Alex"
                className="w-full bg-bg border border-border px-3 py-2 text-text placeholder:text-text-muted focus:outline-none focus:border-gold transition-colors duration-150"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-text-muted text-xs font-heading uppercase tracking-widest">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="player@example.com"
                className="w-full bg-bg border border-border px-3 py-2 text-text placeholder:text-text-muted focus:outline-none focus:border-gold transition-colors duration-150"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-text-muted text-xs font-heading uppercase tracking-widest">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "admin" | "user")}
                className="w-full bg-bg border border-border px-3 py-2 text-text focus:outline-none focus:border-gold transition-colors duration-150"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={loading || !name.trim() || !email}
                className="flex-1 px-4 py-2 bg-gold/10 border border-gold/30 text-gold font-heading font-semibold uppercase text-xs tracking-wider hover:bg-gold/20 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? "Creating…" : "Create & Invite"}
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
  const [inviteClaimTarget, setInviteClaimTarget] = useState<Player | null>(null);
  const [showInviteNew, setShowInviteNew] = useState(false);
  const [togglingRole, setTogglingRole] = useState<string | null>(null);

  const refreshPlayers = () => getPlayers().then(setPlayers);

  useEffect(() => {
    refreshPlayers().then(() => setLoaded(true));
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  async function handleRoleToggle(player: Player) {
    setTogglingRole(player.id);
    const newRole = player.role === "admin" ? "user" : "admin";
    await setPlayerRole(player.id, newRole);
    await refreshPlayers();
    setTogglingRole(null);
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
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xs font-bold uppercase tracking-widest text-text-muted">
              Players
            </h2>
            <button
              onClick={() => setShowInviteNew(true)}
              className="px-3 py-1.5 bg-gold/10 border border-gold/30 text-gold font-heading font-semibold uppercase text-xs tracking-wider hover:bg-gold/20 transition-colors duration-150"
            >
              + Invite New
            </button>
          </div>

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
                <span className="w-20 text-center hidden sm:block">Role</span>
                <span className="w-16 text-center hidden sm:block">Auth</span>
                <span className="w-36 text-right">Actions</span>
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

                  {/* Role badge */}
                  <div className="w-20 text-center hidden sm:block">
                    <span
                      className={`text-xs font-heading uppercase tracking-wider ${
                        player.role === "admin" ? "text-gold" : "text-text-muted"
                      }`}
                    >
                      {player.role}
                    </span>
                  </div>

                  {/* Auth status */}
                  <div className="w-16 text-center hidden sm:block">
                    {player.authUserId ? (
                      <span className="text-xs text-green font-heading uppercase tracking-wider">
                        Linked
                      </span>
                    ) : (
                      <span className="text-xs text-text-muted font-heading uppercase tracking-wider">
                        —
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="w-36 flex items-center justify-end gap-2">
                    {/* Role toggle */}
                    <button
                      onClick={() => handleRoleToggle(player)}
                      disabled={togglingRole === player.id}
                      className={`px-2.5 py-1 border font-heading font-semibold uppercase text-xs tracking-wider transition-colors duration-150 disabled:opacity-40 ${
                        player.role === "admin"
                          ? "border-gold/30 text-gold hover:bg-gold/10"
                          : "border-border text-text-muted hover:text-text hover:border-white/20"
                      }`}
                      title={
                        player.role === "admin"
                          ? "Demote to user"
                          : "Promote to admin"
                      }
                    >
                      {togglingRole === player.id
                        ? "…"
                        : player.role === "admin"
                        ? "Admin"
                        : "User"}
                    </button>

                    {/* Invite button — only for unlinked players */}
                    {!player.authUserId && (
                      <button
                        onClick={() => setInviteClaimTarget(player)}
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

      {/* Modals */}
      {inviteClaimTarget && (
        <InviteClaimModal
          player={inviteClaimTarget}
          onClose={() => {
            setInviteClaimTarget(null);
            refreshPlayers();
          }}
        />
      )}
      {showInviteNew && (
        <InviteNewModal
          onClose={() => {
            setShowInviteNew(false);
            refreshPlayers();
          }}
        />
      )}
    </div>
  );
}
