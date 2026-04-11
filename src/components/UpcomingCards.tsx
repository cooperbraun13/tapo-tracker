"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Player, UpcomingCard } from "@/lib/types";

const PROMOTIONS = ["UFC", "Bellator", "PFL", "ONE", "Other"];

interface UpcomingCardsProps {
  cards: UpcomingCard[];
  players: Player[];
  onAddCard: (name: string, date: string, promotion: string) => void;
  onVote: (cardId: string, playerId: string, vote: "in" | "out" | null) => void;
  onPromote: (cardId: string) => void;
  onDelete: (cardId: string) => void;
  /** Auth'd player's ID — only this player's row shows interactive vote button */
  currentPlayerId?: string;
}

type Status = "LOCKED IN" | "NOT ENOUGH" | "WAITING";

function getStatus(card: UpcomingCard): Status {
  const total = card.votes.length;
  if (total === 0) return "WAITING";
  const undecided = card.votes.filter((v) => v.vote === null).length;
  if (undecided > 0) return "WAITING";
  const inCount = card.votes.filter((v) => v.vote === "in").length;
  return inCount > total / 2 ? "LOCKED IN" : "NOT ENOUGH";
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isPast(iso: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(iso + "T00:00:00") < today;
}

export default function UpcomingCards({
  cards,
  players,
  onAddCard,
  onVote,
  onPromote,
  onDelete,
  currentPlayerId,
}: UpcomingCardsProps) {
  const [adding, setAdding] = useState(false);
  const [cardName, setCardName] = useState("");
  const [cardDate, setCardDate] = useState("");
  const [promotion, setPromotion] = useState("UFC");

  const resetForm = () => {
    setCardName("");
    setCardDate("");
    setPromotion("UFC");
    setAdding(false);
  };

  const handleSave = () => {
    if (!cardName.trim() || !cardDate) return;
    onAddCard(cardName.trim(), cardDate, promotion);
    resetForm();
  };

  const playerName = (id: string) =>
    players.find((p) => p.id === id)?.name ?? "Unknown";

  // Sort: active upcoming first (ascending), then past/promoted at bottom
  const sorted = [...cards].sort((a, b) => {
    if (a.promoted !== b.promoted) return a.promoted ? 1 : -1;
    const aPast = isPast(a.date);
    const bPast = isPast(b.date);
    if (aPast !== bPast) return aPast ? 1 : -1;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  const cycleVote = (current: "in" | "out" | null): "in" | "out" | null => {
    if (current === null) return "in";
    if (current === "in") return "out";
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-bold uppercase tracking-wider">
          Upcoming Cards
        </h2>
        {!adding && players.length > 0 && (
          <button
            onClick={() => setAdding(true)}
            className="px-4 py-1.5 bg-gold/10 border border-gold/30 text-gold font-heading font-semibold uppercase text-sm tracking-wider hover:bg-gold/20 transition-colors duration-150"
          >
            + New Card
          </button>
        )}
      </div>

      {/* Add card form */}
      <AnimatePresence>
        {adding && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="border border-gold/30 bg-surface p-4 space-y-3"
          >
            <div className="flex gap-2 flex-wrap">
              <input
                id="new-card-name"
                type="text"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                placeholder='e.g. "UFC 320"'
                className="flex-1 min-w-40 bg-bg border border-border px-3 py-2 text-text placeholder:text-text-muted focus:outline-none focus:border-gold transition-colors duration-150"
              />
              <input
                id="new-card-date"
                type="date"
                value={cardDate}
                onChange={(e) => setCardDate(e.target.value)}
                className="bg-bg border border-border px-3 py-2 text-text focus:outline-none focus:border-gold transition-colors duration-150"
              />
            </div>
            <div>
              <select
                id="new-card-promotion"
                value={promotion}
                onChange={(e) => setPromotion(e.target.value)}
                className="bg-bg border border-border px-3 py-2 text-text focus:outline-none focus:border-gold transition-colors duration-150"
              >
                {PROMOTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={!cardName.trim() || !cardDate}
                className="px-4 py-1.5 bg-gold/10 border border-gold/30 text-gold font-heading font-semibold uppercase text-sm tracking-wider hover:bg-gold/20 transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Add Card
              </button>
              <button
                onClick={resetForm}
                className="px-4 py-1.5 border border-border text-text-muted font-heading font-semibold uppercase text-sm tracking-wider hover:text-text transition-colors duration-150"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cards list */}
      <div className="space-y-2">
        <AnimatePresence>
          {sorted.map((card, i) => {
            const status = getStatus(card);
            const past = isPast(card.date);
            const votesLocked = past; // votes locked once event date passes
            const dimmed = card.promoted || (past && status !== "LOCKED IN");
            const canPromote = status === "LOCKED IN" && past && !card.promoted;

            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: dimmed ? 0.4 : 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.15, delay: i * 0.04 }}
                className={`border bg-surface ${
                  status === "LOCKED IN" && !dimmed
                    ? "border-l-2 border-gold/40"
                    : "border-border"
                }`}
              >
                {/* Header */}
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-wrap">
                    <span className="font-heading font-bold text-base uppercase tracking-wide">
                      {card.name}
                    </span>
                    {card.promotion !== "UFC" && (
                      <span className="text-xs font-heading uppercase tracking-wider text-text-muted border border-border px-1.5 py-0.5 shrink-0">
                        {card.promotion}
                      </span>
                    )}
                    <span className="text-text-muted text-sm shrink-0">
                      {formatDate(card.date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {card.promoted ? (
                      <span className="font-heading text-xs uppercase tracking-wider text-text-muted">
                        Promoted
                      </span>
                    ) : (
                      <span
                        className={`font-heading text-xs font-semibold uppercase tracking-wider ${
                          status === "LOCKED IN"
                            ? "text-gold"
                            : status === "NOT ENOUGH"
                            ? "text-red"
                            : "text-text-muted"
                        }`}
                      >
                        {status}
                      </span>
                    )}
                  </div>
                </div>

                {/* Votes */}
                {!card.promoted && (
                  <div className="border-t border-border px-4 py-2 space-y-1">
                    {votesLocked && (
                      <p className="text-text-muted text-xs px-2 pb-1 font-heading uppercase tracking-wider">
                        Votes locked
                      </p>
                    )}
                    {card.votes.map((v) => {
                      const isOwnRow =
                        currentPlayerId !== undefined &&
                        v.playerId === currentPlayerId;
                      const canClick = isOwnRow && !votesLocked;

                      return (
                        <div
                          key={v.playerId}
                          className={`flex items-center justify-between py-1.5 px-2 ${
                            v.vote === "in"
                              ? "bg-green/10"
                              : v.vote === "out"
                              ? "bg-red/10"
                              : ""
                          }`}
                        >
                          <span className="font-body">{playerName(v.playerId)}</span>
                          {canClick ? (
                            <button
                              onClick={() =>
                                onVote(card.id, v.playerId, cycleVote(v.vote))
                              }
                              className={`w-8 h-8 flex items-center justify-center font-heading font-bold text-sm transition-colors duration-150 cursor-pointer ${
                                v.vote === "in"
                                  ? "text-green hover:text-green/70"
                                  : v.vote === "out"
                                  ? "text-red hover:text-red/70"
                                  : "text-text-muted hover:text-text"
                              }`}
                            >
                              {v.vote === "in" ? "✓" : v.vote === "out" ? "✗" : "—"}
                            </button>
                          ) : (
                            <span
                              className={`w-8 h-8 flex items-center justify-center font-heading font-bold text-sm opacity-60 ${
                                v.vote === "in"
                                  ? "text-green"
                                  : v.vote === "out"
                                  ? "text-red"
                                  : "text-text-muted"
                              }`}
                            >
                              {v.vote === "in" ? "✓" : v.vote === "out" ? "✗" : "—"}
                            </span>
                          )}
                        </div>
                      );
                    })}

                    {/* Waiting indicator */}
                    {status === "WAITING" && !votesLocked && (
                      <p className="text-text-muted text-xs pt-1 px-2">
                        Waiting on:{" "}
                        {card.votes
                          .filter((v) => v.vote === null)
                          .map((v) => playerName(v.playerId))
                          .join(", ")}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      {canPromote && (
                        <button
                          onClick={() => onPromote(card.id)}
                          className="px-3 py-1.5 bg-gold/10 border border-gold/30 text-gold font-heading font-semibold uppercase text-xs tracking-wider hover:bg-gold/20 transition-colors duration-150"
                        >
                          Promote to Events
                        </button>
                      )}
                      <button
                        onClick={() => onDelete(card.id)}
                        className="px-3 py-1.5 border border-border text-text-muted font-heading font-semibold uppercase text-xs tracking-wider hover:text-red hover:border-red/50 transition-colors duration-150"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
        {cards.length === 0 && !adding && (
          <p className="text-text-muted text-sm py-4">
            {players.length === 0
              ? "Add players in the Manage tab first."
              : 'No upcoming cards yet. Click "+ New Card" to add one.'}
          </p>
        )}
      </div>
    </div>
  );
}
