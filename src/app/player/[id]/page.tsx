"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { getPlayers, getEvents } from "@/lib/storage";
import { Player, UFCEvent, AppData } from "@/lib/types";
import { calculateMoney } from "@/lib/scoring";
import { computeMedals } from "@/lib/medals";
import MedalBadge from "@/components/MedalBadge";
import { supabase } from "@/lib/supabase";
import { updateOwnName } from "@/app/admin/actions";

// ─── helpers ────────────────────────────────────────────────────────────────

function fmt$(n: number): string {
  const abs = Math.round(Math.abs(n));
  return `${n >= 0 ? "+" : "-"}$${abs}`;
}

function fmtDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── stats computation ───────────────────────────────────────────────────────

interface ChartPoint {
  eventName: string;
  delta: number;
  cumulative: number;
}

interface ProfileStats {
  eventsPlayed: number;
  totalEvents: number; // all events in filtered window (for participation rate)
  totalEarnings: number;
  totalLosses: number;
  netMoney: number;
  eventWins: number;
  avgPoints: number;
  bestScore: number | null;
  bestScoreEventName: string | null;
  worstScore: number | null;
  worstScoreEventName: string | null;
  totalPerfectPicks: number | null;
  totalCorrectPicks: number | null;
  pickAccuracy: number | null;
  chartData: ChartPoint[];
  // sorted descending (most recent first) for the table
  participatedEventsSorted: UFCEvent[];
}

function computeProfileStats(
  playerId: string,
  filteredEvents: UFCEvent[]
): ProfileStats {
  // Events this player participated in, within the filtered window
  const participated = filteredEvents.filter((e) =>
    e.scores.some((s) => s.playerId === playerId)
  );

  // Ascending for chart, descending for table
  const ascending = [...participated].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let totalEarnings = 0;
  let totalLosses = 0;
  let eventWins = 0;
  let totalPoints = 0;
  let bestScore: number | null = null;
  let bestScoreEventName: string | null = null;
  let worstScore: number | null = null;
  let worstScoreEventName: string | null = null;
  let totalPerfectPicks = 0;
  let totalCorrectPicks = 0;
  let totalNumPicks = 0;
  let hasPerfect = false;
  let hasCorrect = false;
  let hasNumPicks = false;

  let cumulative = 0;
  const chartData: ChartPoint[] = [];

  for (const event of ascending) {
    const score = event.scores.find((s) => s.playerId === playerId);
    if (!score) continue;

    const money = calculateMoney(event);
    const delta = money.get(playerId) ?? 0;
    cumulative += delta;

    chartData.push({ eventName: event.name, delta, cumulative });

    if (delta > 0) {
      totalEarnings += delta;
      eventWins++;
    } else if (delta < 0) {
      totalLosses += Math.abs(delta);
    }

    totalPoints += score.points;

    if (bestScore === null || score.points > bestScore) {
      bestScore = score.points;
      bestScoreEventName = event.name;
    }
    if (worstScore === null || score.points < worstScore) {
      worstScore = score.points;
      worstScoreEventName = event.name;
    }

    if (score.perfectPicks !== undefined) {
      totalPerfectPicks += score.perfectPicks;
      hasPerfect = true;
    }
    if (score.correctPicks !== undefined) {
      totalCorrectPicks += score.correctPicks;
      hasCorrect = true;
    }
    if (score.numPicks !== undefined) {
      totalNumPicks += score.numPicks;
      hasNumPicks = true;
    }
  }

  const eventsPlayed = participated.length;

  return {
    eventsPlayed,
    totalEvents: filteredEvents.length,
    totalEarnings,
    totalLosses,
    netMoney: totalEarnings - totalLosses,
    eventWins,
    avgPoints: eventsPlayed > 0 ? totalPoints / eventsPlayed : 0,
    bestScore,
    bestScoreEventName,
    worstScore,
    worstScoreEventName,
    totalPerfectPicks: hasPerfect ? totalPerfectPicks : null,
    totalCorrectPicks: hasCorrect ? totalCorrectPicks : null,
    pickAccuracy:
      hasNumPicks && hasCorrect && totalNumPicks > 0
        ? totalCorrectPicks / totalNumPicks
        : null,
    chartData,
    participatedEventsSorted: [...ascending].reverse(),
  };
}

// ─── sub-components ──────────────────────────────────────────────────────────

function StatCell({
  label,
  value,
  color,
  sub,
}: {
  label: string;
  value: string;
  color?: "green" | "red" | "gold";
  sub?: string;
}) {
  const valueColor =
    color === "green"
      ? "text-green"
      : color === "red"
      ? "text-red"
      : color === "gold"
      ? "text-gold"
      : "text-text";

  return (
    <div className="bg-surface px-4 py-3 space-y-0.5">
      <p className="text-text-muted text-xs font-heading uppercase tracking-widest">
        {label}
      </p>
      <p className={`font-heading font-bold text-xl leading-tight ${valueColor}`}>
        {value}
      </p>
      {sub && (
        <p className="text-text-muted text-xs font-body truncate" title={sub}>
          {sub}
        </p>
      )}
    </div>
  );
}

interface TooltipPayload {
  payload: ChartPoint;
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-[#16161e] border border-white/10 px-3 py-2 shadow-xl">
      <p className="font-heading text-xs uppercase tracking-wider text-text mb-1">
        {d.eventName}
      </p>
      {d.delta === 0 ? (
        <p className="text-xs text-text-muted font-body">No pool</p>
      ) : (
        <p
          className={`text-xs font-body ${
            d.delta > 0 ? "text-green" : "text-red"
          }`}
        >
          {d.delta > 0 ? "+" : "-"}${Math.round(Math.abs(d.delta))}{" "}
          {d.delta > 0 ? "won" : "lost"}
        </p>
      )}
      <p className="text-xs text-text-muted font-body mt-0.5">
        Running total:{" "}
        <span className={d.cumulative >= 0 ? "text-green" : "text-red"}>
          {d.cumulative >= 0 ? "+" : "-"}${Math.round(Math.abs(d.cumulative))}
        </span>
      </p>
    </div>
  );
}

// ─── Account settings (own profile only) ────────────────────────────────────

function AccountSettings({
  playerId,
  currentName,
  onNameSaved,
}: {
  playerId: string;
  currentName: string;
  onNameSaved: (newName: string) => void;
}) {
  const [name, setName] = useState(currentName);
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMsg, setNameMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleNameSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || name.trim() === currentName) return;
    setNameSaving(true);
    setNameMsg(null);
    const { error } = await updateOwnName(playerId, name);
    setNameSaving(false);
    if (error) {
      setNameMsg({ ok: false, text: error });
    } else {
      setNameMsg({ ok: true, text: "Name updated." });
      onNameSaved(name.trim());
    }
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPwMsg({ ok: false, text: "Passwords do not match." });
      return;
    }
    if (newPassword.length < 6) {
      setPwMsg({ ok: false, text: "Password must be at least 6 characters." });
      return;
    }
    setPwSaving(true);
    setPwMsg(null);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwSaving(false);
    if (error) {
      setPwMsg({ ok: false, text: error.message });
    } else {
      setPwMsg({ ok: true, text: "Password updated." });
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  const inputCls =
    "w-full bg-bg border border-border px-3 py-2 text-text placeholder:text-text-muted focus:outline-none focus:border-gold transition-colors duration-150";
  const labelCls =
    "block text-text-muted text-xs font-heading uppercase tracking-widest";

  return (
    <section className="space-y-4 border border-border bg-surface p-5">
      <h2 className="font-heading text-xs font-bold uppercase tracking-widest text-text-muted">
        Account Settings
      </h2>

      {/* Change name */}
      <form onSubmit={handleNameSave} className="space-y-2">
        <label className={labelCls}>Display Name</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`${inputCls} flex-1`}
            placeholder="Your name"
            maxLength={40}
          />
          <button
            type="submit"
            disabled={nameSaving || !name.trim() || name.trim() === currentName}
            className="px-4 py-2 bg-gold/10 border border-gold/30 text-gold font-heading font-semibold uppercase text-xs tracking-wider hover:bg-gold/20 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {nameSaving ? "Saving…" : "Save"}
          </button>
        </div>
        {nameMsg && (
          <p className={`text-xs font-body ${nameMsg.ok ? "text-green" : "text-red"}`}>
            {nameMsg.text}
          </p>
        )}
      </form>

      <div className="border-t border-border" />

      {/* Change password */}
      <form onSubmit={handlePasswordSave} className="space-y-2">
        <label className={labelCls}>Change Password</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className={inputCls}
          placeholder="New password"
          autoComplete="new-password"
        />
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={inputCls}
          placeholder="Confirm new password"
          autoComplete="new-password"
        />
        {pwMsg && (
          <p className={`text-xs font-body ${pwMsg.ok ? "text-green" : "text-red"}`}>
            {pwMsg.text}
          </p>
        )}
        <button
          type="submit"
          disabled={pwSaving || !newPassword || !confirmPassword}
          className="px-4 py-2 bg-gold/10 border border-gold/30 text-gold font-heading font-semibold uppercase text-xs tracking-wider hover:bg-gold/20 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {pwSaving ? "Updating…" : "Update Password"}
        </button>
      </form>
    </section>
  );
}

// ─── page ────────────────────────────────────────────────────────────────────

export default function PlayerProfilePage() {
  const { id } = useParams<{ id: string }>();

  const [players, setPlayers] = useState<Player[]>([]);
  const [events, setEvents] = useState<UFCEvent[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [yearFilter, setYearFilter] = useState("all");
  const [promoFilter, setPromoFilter] = useState("all");
  const [currentAuthId, setCurrentAuthId] = useState<string | null>(null);

  const refreshPlayers = () => getPlayers().then(setPlayers);

  useEffect(() => {
    Promise.all([
      getPlayers(),
      getEvents(),
      supabase.auth.getUser(),
    ]).then(([p, e, { data: { user } }]) => {
      setPlayers(p);
      setEvents(e);
      setCurrentAuthId(user?.id ?? null);
      setLoaded(true);
    });
  }, []);

  const player = players.find((p) => p.id === id);

  // Medals computed from all unfiltered data
  const medals = useMemo(() => {
    if (!player || events.length === 0) return [];
    const appData: AppData = { players, events, upcoming: [] };
    return computeMedals(appData).get(player.id) ?? [];
  }, [player, players, events]);

  // Player's participated events — used only to derive filter options
  const playerEvents = useMemo(() => {
    if (!player) return [];
    return events.filter((e) => e.scores.some((s) => s.playerId === player.id));
  }, [player, events]);

  const availableYears = useMemo(
    () =>
      Array.from(
        new Set(playerEvents.map((e) => new Date(e.date).getFullYear()))
      ).sort((a, b) => b - a),
    [playerEvents]
  );

  const availablePromos = useMemo(
    () =>
      Array.from(new Set(playerEvents.map((e) => e.promotion))).sort(),
    [playerEvents]
  );

  // All events matching the current filters (for participation rate denominator)
  const filteredEvents = useMemo(
    () =>
      events.filter((e) => {
        const year = new Date(e.date).getFullYear().toString();
        if (yearFilter !== "all" && year !== yearFilter) return false;
        if (promoFilter !== "all" && e.promotion !== promoFilter) return false;
        return true;
      }),
    [events, yearFilter, promoFilter]
  );

  const stats = useMemo(
    () => (player ? computeProfileStats(player.id, filteredEvents) : null),
    [player, filteredEvents]
  );

  if (!loaded) return null;

  if (!player) {
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
        <main className="flex-1 max-w-[880px] mx-auto px-4 py-6">
          <p className="text-text-muted">Player not found.</p>
        </main>
      </div>
    );
  }

  const showFilters =
    availableYears.length > 1 || availablePromos.length > 1;

  // Show account settings only when the logged-in user owns this profile
  const isOwnProfile =
    !!currentAuthId &&
    !!player?.authUserId &&
    currentAuthId === player.authUserId;

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
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

      <main className="flex-1 max-w-[880px] w-full mx-auto px-4 py-8 space-y-8">
        {/* Player header */}
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-heading text-3xl font-bold uppercase tracking-widest text-text">
              {player.name}
            </h1>
            <MedalBadge medals={medals} />
          </div>
          {player.tapologyUsername ? (
            <p className="text-text-muted text-sm mt-1 font-body">
              Tapology:{" "}
              <span className="text-text">{player.tapologyUsername}</span>
            </p>
          ) : null}
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="flex gap-2 items-center flex-wrap">
            {availableYears.length > 1 && (
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="bg-surface border border-border px-3 py-1.5 text-sm text-text focus:outline-none focus:border-gold transition-colors duration-150"
              >
                <option value="all">All Years</option>
                {availableYears.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
            )}
            {availablePromos.length > 1 && (
              <select
                value={promoFilter}
                onChange={(e) => setPromoFilter(e.target.value)}
                className="bg-surface border border-border px-3 py-1.5 text-sm text-text focus:outline-none focus:border-gold transition-colors duration-150"
              >
                <option value="all">All Promotions</option>
                {availablePromos.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            )}
            {(yearFilter !== "all" || promoFilter !== "all") && (
              <button
                onClick={() => {
                  setYearFilter("all");
                  setPromoFilter("all");
                }}
                className="text-xs text-text-muted hover:text-text font-heading uppercase tracking-wider transition-colors duration-150"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* No data state */}
        {stats && stats.eventsPlayed === 0 && (
          <p className="text-text-muted text-sm">
            No events match the current filters.
          </p>
        )}

        {stats && stats.eventsPlayed > 0 && (
          <>
            {/* Stats grid */}
            <section className="space-y-3">
              <h2 className="font-heading text-xs font-bold uppercase tracking-widest text-text-muted">
                Stats
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-border">
                <StatCell
                  label="Net Money"
                  value={
                    stats.netMoney === 0
                      ? "$0"
                      : fmt$(stats.netMoney)
                  }
                  color={
                    stats.netMoney > 0
                      ? "green"
                      : stats.netMoney < 0
                      ? "red"
                      : undefined
                  }
                />
                <StatCell
                  label="Total Earned"
                  value={stats.totalEarnings > 0 ? `+$${Math.round(stats.totalEarnings)}` : "$0"}
                  color={stats.totalEarnings > 0 ? "green" : undefined}
                />
                <StatCell
                  label="Total Lost"
                  value={stats.totalLosses > 0 ? `-$${Math.round(stats.totalLosses)}` : "$0"}
                  color={stats.totalLosses > 0 ? "red" : undefined}
                />
                <StatCell
                  label="Event Wins"
                  value={String(stats.eventWins)}
                  color={stats.eventWins > 0 ? "gold" : undefined}
                />
                <StatCell
                  label="Events Played"
                  value={String(stats.eventsPlayed)}
                />
                <StatCell
                  label="Participation"
                  value={
                    stats.totalEvents > 0
                      ? `${Math.round((stats.eventsPlayed / stats.totalEvents) * 100)}%`
                      : "—"
                  }
                />
                <StatCell
                  label="Avg Points"
                  value={
                    stats.avgPoints > 0 ? stats.avgPoints.toFixed(1) : "—"
                  }
                />
                <StatCell
                  label="Best Score"
                  value={stats.bestScore !== null ? String(stats.bestScore) : "—"}
                  sub={stats.bestScoreEventName ?? undefined}
                />
                <StatCell
                  label="Worst Score"
                  value={stats.worstScore !== null ? String(stats.worstScore) : "—"}
                  sub={stats.worstScoreEventName ?? undefined}
                />
                {stats.totalPerfectPicks !== null && (
                  <StatCell
                    label="Perfect Picks"
                    value={String(stats.totalPerfectPicks)}
                  />
                )}
                {stats.totalCorrectPicks !== null && (
                  <StatCell
                    label="Correct Picks"
                    value={String(stats.totalCorrectPicks)}
                  />
                )}
                {stats.pickAccuracy !== null && (
                  <StatCell
                    label="Pick Accuracy"
                    value={`${Math.round(stats.pickAccuracy * 100)}%`}
                  />
                )}
              </div>
            </section>

            {/* Earnings chart */}
            {stats.chartData.length > 1 && (
              <section className="space-y-3">
                <h2 className="font-heading text-xs font-bold uppercase tracking-widest text-text-muted">
                  Earnings Over Time
                </h2>
                <div className="border border-border bg-surface p-4">
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart
                      data={stats.chartData}
                      margin={{ top: 8, right: 12, bottom: 4, left: 4 }}
                    >
                      <CartesianGrid
                        stroke="#ffffff08"
                        vertical={false}
                        strokeDasharray="0"
                      />
                      <XAxis
                        dataKey="eventName"
                        tick={{
                          fill: "#6b6b6b",
                          fontSize: 10,
                          fontFamily: "Oswald, sans-serif",
                        }}
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                        tickFormatter={(v: string) =>
                          v.length > 12 ? v.slice(0, 12) + "…" : v
                        }
                      />
                      <YAxis
                        tick={{
                          fill: "#6b6b6b",
                          fontSize: 10,
                          fontFamily: "Barlow, sans-serif",
                        }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v: number) => `$${v}`}
                        width={42}
                      />
                      <ReferenceLine
                        y={0}
                        stroke="#ffffff18"
                        strokeDasharray="4 3"
                      />
                      <Tooltip
                        content={
                          <ChartTooltip />
                        }
                        cursor={{ stroke: "#ffffff14", strokeWidth: 1 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="cumulative"
                        stroke="#d4a843"
                        strokeWidth={2}
                        dot={{ r: 3, fill: "#d4a843", strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: "#d4a843", strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>
            )}

            {/* Event history table */}
            <section className="space-y-3">
              <h2 className="font-heading text-xs font-bold uppercase tracking-widest text-text-muted">
                Event History
              </h2>
              <div className="border border-border">
                {/* Column headers */}
                <div className="flex items-center px-4 py-2 border-b border-border bg-surface text-text-muted text-xs font-heading uppercase tracking-widest">
                  <span className="flex-1">Event</span>
                  <span className="w-28 text-right hidden sm:block">Date</span>
                  <span className="w-20 text-right">Score</span>
                  <span className="w-20 text-right">Money</span>
                  <span className="w-8 text-center">W</span>
                </div>
                {stats.participatedEventsSorted.map((event, i) => {
                  const score = event.scores.find(
                    (s) => s.playerId === player.id
                  );
                  const money = calculateMoney(event);
                  const earned = money.get(player.id) ?? 0;
                  const isWin = earned > 0;

                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.12, delay: i * 0.025 }}
                      className={`flex items-center px-4 py-3 border-b border-border last:border-b-0 border-l-2 hover:bg-white/[0.025] transition-colors duration-150 ${
                        isWin
                          ? "border-l-gold bg-gold-dim"
                          : "border-l-transparent"
                      }`}
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <span className="font-heading font-semibold text-sm uppercase tracking-wide block truncate">
                          {event.name}
                        </span>
                        {event.promotion !== "UFC" && (
                          <span className="text-xs text-text-muted font-heading uppercase tracking-wider">
                            {event.promotion}
                          </span>
                        )}
                      </div>
                      <span className="w-28 text-right text-text-muted text-xs hidden sm:block shrink-0">
                        {fmtDate(event.date)}
                      </span>
                      <span className="w-20 text-right text-text-muted text-sm shrink-0">
                        {score?.points ?? "—"} pts
                      </span>
                      <span
                        className={`w-20 text-right font-heading font-semibold text-sm shrink-0 ${
                          earned > 0
                            ? "text-green"
                            : earned < 0
                            ? "text-red"
                            : "text-text-muted"
                        }`}
                      >
                        {event.hasPool
                          ? earned > 0
                            ? `+$${Math.round(earned)}`
                            : earned < 0
                            ? `-$${Math.round(Math.abs(earned))}`
                            : "$0"
                          : "—"}
                      </span>
                      <span className="w-8 text-center shrink-0">
                        {isWin && (
                          <span className="text-gold font-heading font-bold text-xs">
                            W
                          </span>
                        )}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {/* Account settings — only shown to the profile owner */}
        {isOwnProfile && (
          <AccountSettings
            playerId={player.id}
            currentName={player.name}
            onNameSaved={() => refreshPlayers()}
          />
        )}
      </main>
    </div>
  );
}
