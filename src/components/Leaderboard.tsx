"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AppData } from "@/lib/types";
import { computeLeaderboard } from "@/lib/scoring";
import { computeMedals } from "@/lib/medals";
import AnimatedNumber from "./AnimatedNumber";
import MedalBadge from "./MedalBadge";

interface LeaderboardProps {
  data: AppData;
  onNavigate: (target: "leaderboard" | "events", eventId?: string) => void;
}

const MEDALS = ["🥇", "🥈", "🥉"];

function formatMoney(n: number): string {
  const rounded = Math.round(n);
  return `$${Math.abs(rounded)}`;
}

export default function Leaderboard({ data, onNavigate }: LeaderboardProps) {
  const stats = computeLeaderboard(data);
  const medals = computeMedals(data);

  if (data.players.length === 0) {
    return (
      <p className="text-text-muted text-sm py-4">
        No players yet. Head to the Manage tab to add some.
      </p>
    );
  }

  if (data.events.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="font-heading text-lg font-bold uppercase tracking-wider">
          Standings
        </h2>
        <p className="text-text-muted text-sm py-4">
          No events yet. Add one in the Events tab to see standings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="font-heading text-lg font-bold uppercase tracking-wider">
        Standings
      </h2>
      <div className="space-y-1">
        {stats.map((player, i) => {
          const rank = i + 1;
          const isFirst = rank === 1;
          return (
            <motion.div
              key={player.playerId}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                layout: { duration: 0.35, ease: "easeOut" },
                opacity: { duration: 0.2, delay: i * 0.04 },
                y: { duration: 0.2, delay: i * 0.04 },
              }}
              className={`flex items-center px-4 py-3 border transition-colors duration-150 hover:bg-white/[0.03] ${
                isFirst
                  ? "border-gold/40 bg-gold-dim border-l-2"
                  : "border-border bg-surface"
              }`}
            >
              {/* Rank */}
              <div className="w-10 shrink-0">
                {rank <= 3 ? (
                  <span className="text-lg">{MEDALS[rank - 1]}</span>
                ) : (
                  <span className="font-heading font-bold text-text-muted text-lg">
                    {rank}
                  </span>
                )}
              </div>

              {/* Name + medals */}
              <div className="flex-1 flex items-center min-w-0">
                <Link
                  href={`/player/${player.playerId}`}
                  className={`font-heading font-bold text-base uppercase tracking-wide truncate underline-offset-2 hover:underline decoration-gold/40 transition-colors duration-150 ${
                    isFirst ? "text-gold" : "hover:text-gold/80"
                  }`}
                >
                  {player.name}
                </Link>
                <MedalBadge
                  medals={medals.get(player.playerId) ?? []}
                  onNavigate={onNavigate}
                />
              </div>

              {/* Money */}
              <AnimatedNumber
                value={player.totalMoney}
                format={formatMoney}
                className={`font-heading font-bold text-lg w-24 text-right ${
                  player.totalMoney > 0
                    ? "text-green"
                    : player.totalMoney < 0
                    ? "text-red"
                    : "text-text-muted"
                }`}
              />

              {/* Wins */}
              <div className="w-20 text-right">
                <span className="text-text-muted text-sm">
                  {player.eventWins}W
                </span>
              </div>

              {/* Events played */}
              <div className="w-16 text-right">
                <span className="text-text-muted text-sm">
                  {player.eventsPlayed}E
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Column labels */}
      <div className="flex items-center px-4 text-text-muted text-xs font-heading uppercase tracking-widest">
        <div className="w-10 shrink-0" />
        <span className="flex-1">Player</span>
        <span className="w-24 text-right">Money</span>
        <span className="w-20 text-right">Wins</span>
        <span className="w-16 text-right">Events</span>
      </div>
    </div>
  );
}
