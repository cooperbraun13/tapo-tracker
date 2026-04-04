"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Player, EventScore, UFCEvent } from "@/lib/types";
import EventCard from "./EventCard";

interface EventListProps {
  events: UFCEvent[];
  players: Player[];
  onAddEvent: (
    name: string,
    date: string,
    scores: EventScore[],
    opts?: { promotion?: string; hasPool?: boolean; buyIn?: number }
  ) => void;
  onUpdateScores: (eventId: string, scores: EventScore[]) => void;
  onDeleteEvent: (eventId: string) => void;
}

export default function EventList({
  events,
  players,
  onAddEvent,
  onUpdateScores,
  onDeleteEvent,
}: EventListProps) {
  const [adding, setAdding] = useState(false);
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [promotion, setPromotion] = useState("UFC");
  const [hasPool, setHasPool] = useState(true);
  const [buyIn, setBuyIn] = useState("5");
  const [scores, setScores] = useState<Record<string, string>>({});

  const resetForm = () => {
    setEventName("");
    setEventDate("");
    setPromotion("UFC");
    setHasPool(true);
    setBuyIn("5");
    setScores({});
    setAdding(false);
  };

  const handleStartAdd = () => {
    const initial: Record<string, string> = {};
    for (const p of players) initial[p.id] = "";
    setScores(initial);
    setEventDate(new Date().toISOString().split("T")[0]);
    setAdding(true);
  };

  const handleSave = () => {
    if (!eventName.trim() || !eventDate) return;
    const eventScores: EventScore[] = players
      .filter((p) => scores[p.id] !== undefined && scores[p.id] !== "")
      .map((p) => ({
        playerId: p.id,
        points: parseInt(scores[p.id], 10) || 0,
      }));
    if (eventScores.length === 0) return;
    onAddEvent(eventName.trim(), eventDate, eventScores, {
      promotion,
      hasPool,
      buyIn: hasPool ? (parseInt(buyIn, 10) || 5) : 5,
    });
    resetForm();
  };

  // Sort events: most recent first
  const sorted = [...events].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-bold uppercase tracking-wider">
          Events
        </h2>
        {!adding && players.length > 0 && (
          <button
            onClick={handleStartAdd}
            className="px-4 py-1.5 bg-gold/10 border border-gold/30 text-gold font-heading font-semibold uppercase text-sm tracking-wider hover:bg-gold/20 transition-colors duration-150"
          >
            + New Event
          </button>
        )}
      </div>

      {/* New event form */}
      <AnimatePresence>
        {adding && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="border border-gold/30 bg-surface p-4 space-y-3"
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder='e.g. "UFC 315"'
                className="flex-1 bg-bg border border-border px-3 py-2 text-text placeholder:text-text-muted focus:outline-none focus:border-gold transition-colors duration-150"
              />
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="bg-bg border border-border px-3 py-2 text-text focus:outline-none focus:border-gold transition-colors duration-150"
              />
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <select
                value={promotion}
                onChange={(e) => setPromotion(e.target.value)}
                className="bg-bg border border-border px-3 py-2 text-text focus:outline-none focus:border-gold transition-colors duration-150"
              >
                {["UFC", "Bellator", "PFL", "ONE"].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className="text-text-muted text-sm font-heading uppercase tracking-wider">Pool</span>
                <button
                  type="button"
                  onClick={() => setHasPool((v) => !v)}
                  className={`w-10 h-5 relative transition-colors duration-150 border ${hasPool ? "bg-gold/20 border-gold/40" : "bg-bg border-border"}`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 transition-transform duration-150 ${hasPool ? "translate-x-5 bg-gold" : "translate-x-0.5 bg-text-muted"}`}
                  />
                </button>
              </label>
              {hasPool && (
                <div className="flex items-center gap-1">
                  <span className="text-text-muted text-sm">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={buyIn}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "" || /^\d+$/.test(v)) setBuyIn(v);
                    }}
                    className="w-14 bg-bg border border-border px-2 py-2 text-text focus:outline-none focus:border-gold transition-colors duration-150"
                    placeholder="5"
                  />
                  <span className="text-text-muted text-sm">buy-in</span>
                </div>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-text-muted text-xs font-heading uppercase tracking-wider mb-2">
                Tapology Points
              </p>
              {players.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-1.5 px-2"
                >
                  <span className="font-body">{p.name}</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={scores[p.id] ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "" || /^\d+$/.test(v))
                        setScores((prev) => ({ ...prev, [p.id]: v }));
                    }}
                    className="w-20 bg-bg border border-border px-2 py-1 text-right text-sm text-text focus:outline-none focus:border-gold transition-colors duration-150"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={!eventName.trim() || !eventDate}
                className="px-4 py-1.5 bg-gold/10 border border-gold/30 text-gold font-heading font-semibold uppercase text-sm tracking-wider hover:bg-gold/20 transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Save Event
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

      {/* Event list */}
      <div className="space-y-1">
        {sorted.map((event, i) => (
          <EventCard
            key={event.id}
            event={event}
            players={players}
            onUpdateScores={onUpdateScores}
            onDelete={onDeleteEvent}
            index={i}
          />
        ))}
        {events.length === 0 && !adding && (
          <p className="text-text-muted text-sm py-4">
            {players.length === 0
              ? "Add players in the Manage tab first, then come back to add events."
              : "No events yet. Click \"+ New Event\" to add one."}
          </p>
        )}
      </div>
    </div>
  );
}
