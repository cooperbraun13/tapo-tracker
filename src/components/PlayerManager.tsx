"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Player } from "@/lib/types";

interface PlayerManagerProps {
  players: Player[];
  onAddPlayer: (name: string) => void;
  onRemovePlayer: (id: string) => void;
  onReset: () => void;
}

export default function PlayerManager({
  players,
  onAddPlayer,
  onRemovePlayer,
  onReset,
}: PlayerManagerProps) {
  const [name, setName] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAddPlayer(trimmed);
    setName("");
  };

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    onReset();
    setConfirmReset(false);
  };

  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-heading text-lg font-bold uppercase tracking-wider mb-4">
          Players
        </h2>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Player name"
            maxLength={24}
            className="flex-1 bg-surface border border-border px-3 py-2 text-text placeholder:text-text-muted focus:outline-none focus:border-gold transition-colors duration-150"
          />
          <button
            onClick={handleAdd}
            disabled={!name.trim()}
            className="px-4 py-2 bg-gold/10 border border-gold/30 text-gold font-heading font-semibold uppercase text-sm tracking-wider hover:bg-gold/20 transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>
        <div className="space-y-1">
          <AnimatePresence>
            {players.map((player, i) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.15, delay: i * 0.03 }}
                className="group flex items-center justify-between bg-surface border border-border px-3 py-2 hover:bg-white/[0.03] transition-colors duration-150"
              >
                <span className="font-body">{player.name}</span>
                <button
                  onClick={() => onRemovePlayer(player.id)}
                  className="text-text-muted hover:text-red text-sm font-body opacity-0 group-hover:opacity-100 transition-all duration-150"
                >
                  Remove
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          {players.length === 0 && (
            <p className="text-text-muted text-sm py-4">
              No players yet. Add some above to get started.
            </p>
          )}
        </div>
      </section>

      <section className="border-t border-border pt-6">
        <h2 className="font-heading text-lg font-bold uppercase tracking-wider mb-4">
          Data
        </h2>
        <button
          onClick={handleReset}
          onBlur={() => setConfirmReset(false)}
          className={`px-4 py-2 border font-heading font-semibold uppercase text-sm tracking-wider transition-colors duration-150 ${
            confirmReset
              ? "border-red text-red bg-red/10 hover:bg-red/20"
              : "border-border text-text-muted hover:text-red hover:border-red/50"
          }`}
        >
          {confirmReset ? "Confirm Reset — All Data Will Be Erased" : "Reset All Data"}
        </button>
      </section>
    </div>
  );
}
