"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { UFCEvent, EventScore, Player } from "@/lib/types";
import { calculateMoney } from "@/lib/scoring";

interface EventCardProps {
  event: UFCEvent;
  players: Player[];
  onUpdateScores: (eventId: string, scores: EventScore[]) => void;
  onDelete: (eventId: string) => void;
  index: number;
}

function formatMoney(amount: number): string {
  const sign = amount > 0 ? "+" : "";
  return `${sign}$${Math.abs(amount)}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function EventCard({
  event,
  players,
  onUpdateScores,
  onDelete,
  index,
}: EventCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [editScores, setEditScores] = useState<EventScore[]>(event.scores);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const money = calculateMoney(event);

  const playerName = (id: string) =>
    players.find((p) => p.id === id)?.name ?? "Unknown";

  const handleEdit = () => {
    setEditScores(event.scores.map((s) => ({ ...s })));
    setEditing(true);
    setExpanded(true);
  };

  const handleSave = () => {
    onUpdateScores(event.id, editScores);
    setEditing(false);
  };

  const handleCancel = () => {
    setEditScores(event.scores);
    setEditing(false);
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete(event.id);
  };

  const updatePoints = (playerId: string, points: string) => {
    const val = points === "" ? 0 : parseInt(points, 10);
    if (isNaN(val)) return;
    setEditScores((prev) =>
      prev.map((s) => (s.playerId === playerId ? { ...s, points: val } : s))
    );
  };

  const maxPoints = event.scores.length > 0
    ? Math.max(...event.scores.map((s) => s.points))
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, delay: index * 0.04 }}
      className="border border-border bg-surface"
    >
      {/* Collapsed header */}
      <button
        onClick={() => {
          if (!editing) setExpanded(!expanded);
        }}
        className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors duration-150"
      >
        <div className="flex items-center gap-3">
          <span className="font-heading font-bold text-base uppercase tracking-wide">
            {event.name}
          </span>
          <span className="text-text-muted text-sm">{formatDate(event.date)}</span>
        </div>
        {!expanded && (
          <div className="flex gap-3 text-sm">
            {event.scores.map((s) => {
              const m = money.get(s.playerId) ?? 0;
              const isWinner = s.points === maxPoints && m > 0;
              return (
                <span key={s.playerId} className="flex items-center gap-1.5">
                  <span className={`text-text-muted ${isWinner ? "text-gold" : ""}`}>
                    {playerName(s.playerId)}
                  </span>
                  <span className="text-text-muted">{s.points}pts</span>
                  <span
                    className={
                      m > 0 ? "text-green" : m < 0 ? "text-red" : "text-text-muted"
                    }
                  >
                    {formatMoney(m)}
                  </span>
                </span>
              );
            })}
          </div>
        )}
        <span className="text-text-muted text-xs ml-2">
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-border px-4 py-3 space-y-3">
          <div className="space-y-1">
            {(editing ? editScores : event.scores).map((s) => {
              const m = editing ? null : money.get(s.playerId) ?? 0;
              const isWinner =
                !editing && s.points === maxPoints && (m ?? 0) > 0;
              return (
                <div
                  key={s.playerId}
                  className={`flex items-center justify-between py-1.5 px-2 ${
                    isWinner ? "border-l-2 border-gold bg-gold-dim" : ""
                  }`}
                >
                  <span
                    className={`font-body ${isWinner ? "text-gold font-semibold" : ""}`}
                  >
                    {playerName(s.playerId)}
                  </span>
                  <div className="flex items-center gap-4">
                    {editing ? (
                      <input
                        type="text"
                        inputMode="numeric"
                        value={s.points || ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === "" || /^\d+$/.test(v))
                            updatePoints(s.playerId, v);
                        }}
                        className="w-20 bg-bg border border-border px-2 py-1 text-right text-sm text-text focus:outline-none focus:border-gold transition-colors duration-150"
                        placeholder="0"
                      />
                    ) : (
                      <span className="text-text-muted text-sm">
                        {s.points} pts
                      </span>
                    )}
                    {!editing && m !== null && (
                      <span
                        className={`font-heading font-semibold text-sm w-16 text-right ${
                          m > 0 ? "text-green" : m < 0 ? "text-red" : "text-text-muted"
                        }`}
                      >
                        {formatMoney(m)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2 pt-1">
            {editing ? (
              <>
                <button
                  onClick={handleSave}
                  className="px-3 py-1.5 bg-gold/10 border border-gold/30 text-gold font-heading font-semibold uppercase text-xs tracking-wider hover:bg-gold/20 transition-colors duration-150"
                >
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="px-3 py-1.5 border border-border text-text-muted font-heading font-semibold uppercase text-xs tracking-wider hover:text-text transition-colors duration-150"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleEdit}
                  className="px-3 py-1.5 border border-border text-text-muted font-heading font-semibold uppercase text-xs tracking-wider hover:text-text hover:border-text/30 transition-colors duration-150"
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  onBlur={() => setConfirmDelete(false)}
                  className={`px-3 py-1.5 border font-heading font-semibold uppercase text-xs tracking-wider transition-colors duration-150 ${
                    confirmDelete
                      ? "border-red text-red bg-red/10"
                      : "border-border text-text-muted hover:text-red hover:border-red/50"
                  }`}
                >
                  {confirmDelete ? "Confirm Delete" : "Delete"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
