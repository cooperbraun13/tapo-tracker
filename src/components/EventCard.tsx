"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { UFCEvent, EventScore, Player } from "@/lib/types";
import { calculateMoney } from "@/lib/scoring";

const PROMOTIONS = ["UFC", "Bellator", "PFL", "ONE", "Other"];

interface EventCardProps {
  event: UFCEvent;
  players: Player[];
  onUpdateScores: (eventId: string, scores: EventScore[]) => void;
  onUpdateEvent: (
    eventId: string,
    updates: { promotion?: string; hasPool?: boolean; buyIn?: number }
  ) => void;
  onDelete: (eventId: string) => void;
  index: number;
}

function formatMoney(amount: number): string {
  return `$${Math.abs(amount)}`;
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
  onUpdateEvent,
  onDelete,
  index,
}: EventCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [editScores, setEditScores] = useState<EventScore[]>(event.scores);
  const [editPromotion, setEditPromotion] = useState(event.promotion);
  const [editHasPool, setEditHasPool] = useState(event.hasPool);
  const [editBuyIn, setEditBuyIn] = useState(String(event.buyIn ?? 5));
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const money = calculateMoney(event);

  const playerName = (id: string) =>
    players.find((p) => p.id === id)?.name ?? "Unknown";

  const handleEdit = () => {
    setEditScores(event.scores.map((s) => ({ ...s })));
    setEditPromotion(event.promotion);
    setEditHasPool(event.hasPool);
    setEditBuyIn(String(event.buyIn ?? 5));
    setEditing(true);
    setExpanded(true);
  };

  const handleSave = () => {
    onUpdateScores(event.id, editScores);
    const metaChanged =
      editPromotion !== event.promotion ||
      editHasPool !== event.hasPool ||
      (editHasPool && parseInt(editBuyIn, 10) !== event.buyIn);
    if (metaChanged) {
      onUpdateEvent(event.id, {
        promotion: editPromotion,
        hasPool: editHasPool,
        buyIn: editHasPool ? (parseInt(editBuyIn, 10) || 5) : event.buyIn,
      });
    }
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
          {event.promotion !== "UFC" && (
            <span className="text-xs font-heading uppercase tracking-wider text-text-muted border border-border px-1.5 py-0.5">
              {event.promotion}
            </span>
          )}
          {!event.hasPool && (
            <span className="text-xs font-heading uppercase tracking-wider text-text-muted border border-border px-1.5 py-0.5">
              No Pool
            </span>
          )}
          <span className="text-text-muted text-sm">{formatDate(event.date)}</span>
        </div>
        <span className="text-text-muted text-xs ml-2">
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-border px-4 py-3 space-y-3">
          {/* Metadata row in edit mode */}
          {editing && (
            <div className="flex gap-2 items-center flex-wrap pb-1">
              <select
                value={editPromotion}
                onChange={(e) => setEditPromotion(e.target.value)}
                className="bg-bg border border-border px-2 py-1.5 text-sm text-text focus:outline-none focus:border-gold transition-colors duration-150"
              >
                {PROMOTIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className="text-text-muted text-xs font-heading uppercase tracking-wider">Pool</span>
                <button
                  type="button"
                  onClick={() => setEditHasPool((v) => !v)}
                  className={`w-9 h-4 relative transition-colors duration-150 border ${editHasPool ? "bg-gold/20 border-gold/40" : "bg-bg border-border"}`}
                >
                  <span
                    className={`absolute top-0.5 w-3 h-3 transition-transform duration-150 ${editHasPool ? "translate-x-4.5 bg-gold" : "translate-x-0.5 bg-text-muted"}`}
                  />
                </button>
              </label>
              {editHasPool && (
                <div className="flex items-center gap-1">
                  <span className="text-text-muted text-xs">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={editBuyIn}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "" || /^\d+$/.test(v)) setEditBuyIn(v);
                    }}
                    className="w-12 bg-bg border border-border px-2 py-1 text-right text-sm text-text focus:outline-none focus:border-gold transition-colors duration-150"
                    placeholder="5"
                  />
                  <span className="text-text-muted text-xs">buy-in</span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-1">
            {(editing ? editScores : event.scores).map((s) => {
              const m = editing ? null : money.get(s.playerId) ?? 0;
              const isWinner = !editing && (m ?? 0) > 0;
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
