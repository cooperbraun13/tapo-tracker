"use client";

import { useState, useEffect, useCallback } from "react";
import { AppData, Player, UFCEvent, EventScore } from "@/lib/types";
import { loadData, saveData } from "@/lib/storage";

const DEFAULT_DATA: AppData = { players: [], events: [] };

export function useAppData() {
  const [data, setData] = useState<AppData>(DEFAULT_DATA);
  const [loaded, setLoaded] = useState(false);

  // Load from storage on mount
  useEffect(() => {
    setData(loadData());
    setLoaded(true);
  }, []);

  // Persist whenever data changes (skip initial default)
  useEffect(() => {
    if (loaded) saveData(data);
  }, [data, loaded]);

  // --- Player mutations ---

  const addPlayer = useCallback((name: string) => {
    const player: Player = { id: crypto.randomUUID(), name };
    setData((prev) => ({ ...prev, players: [...prev.players, player] }));
  }, []);

  const removePlayer = useCallback((playerId: string) => {
    setData((prev) => ({
      players: prev.players.filter((p) => p.id !== playerId),
      events: prev.events.map((event) => ({
        ...event,
        scores: event.scores.filter((s) => s.playerId !== playerId),
      })),
    }));
  }, []);

  // --- Event mutations ---

  const addEvent = useCallback(
    (name: string, date: string, scores: EventScore[]) => {
      const event: UFCEvent = { id: crypto.randomUUID(), name, date, scores };
      setData((prev) => ({ ...prev, events: [...prev.events, event] }));
    },
    []
  );

  const updateEventScores = useCallback(
    (eventId: string, scores: EventScore[]) => {
      setData((prev) => ({
        ...prev,
        events: prev.events.map((e) =>
          e.id === eventId ? { ...e, scores } : e
        ),
      }));
    },
    []
  );

  const deleteEvent = useCallback((eventId: string) => {
    setData((prev) => ({
      ...prev,
      events: prev.events.filter((e) => e.id !== eventId),
    }));
  }, []);

  // --- Reset ---

  const resetData = useCallback(() => {
    setData({ players: [], events: [] });
  }, []);

  return {
    data,
    loaded,
    addPlayer,
    removePlayer,
    addEvent,
    updateEventScores,
    deleteEvent,
    resetData,
  };
}
