"use client";

import { useState, useEffect, useCallback } from "react";
import { AppData, EventScore } from "@/lib/types";
import * as storage from "@/lib/storage";

const EMPTY: AppData = { players: [], events: [], upcoming: [] };

export function useAppData() {
  const [data, setData] = useState<AppData>(EMPTY);
  const [loaded, setLoaded] = useState(false);

  // Load all data from Supabase on mount
  useEffect(() => {
    async function load() {
      const [players, events, upcoming] = await Promise.all([
        storage.getPlayers(),
        storage.getEvents(),
        storage.getUpcomingCards(),
      ]);
      setData({ players, events, upcoming });
      setLoaded(true);
    }
    load();
  }, []);

  // --- Player mutations ---

  const addPlayer = useCallback(async (name: string) => {
    const player = await storage.addPlayer(name);
    setData((prev) => ({ ...prev, players: [...prev.players, player] }));
  }, []);

  const removePlayer = useCallback(async (playerId: string) => {
    await storage.removePlayer(playerId);
    setData((prev) => ({
      ...prev,
      players: prev.players.filter((p) => p.id !== playerId),
      events: prev.events.map((event) => ({
        ...event,
        scores: event.scores.filter((s) => s.playerId !== playerId),
      })),
      upcoming: prev.upcoming.map((card) => ({
        ...card,
        votes: card.votes.filter((v) => v.playerId !== playerId),
      })),
    }));
  }, []);

  // --- Event mutations ---

  const addEvent = useCallback(
    async (name: string, date: string, scores: EventScore[]) => {
      const event = await storage.addEvent(name, date, scores);
      setData((prev) => ({ ...prev, events: [...prev.events, event] }));
    },
    []
  );

  const updateEventScores = useCallback(
    async (eventId: string, scores: EventScore[]) => {
      await storage.updateEventScores(eventId, scores);
      setData((prev) => ({
        ...prev,
        events: prev.events.map((e) =>
          e.id === eventId ? { ...e, scores } : e
        ),
      }));
    },
    []
  );

  const deleteEvent = useCallback(async (eventId: string) => {
    await storage.deleteEvent(eventId);
    setData((prev) => ({
      ...prev,
      events: prev.events.filter((e) => e.id !== eventId),
    }));
  }, []);

  // --- Upcoming card mutations ---

  const addUpcomingCard = useCallback(
    async (name: string, date: string) => {
      const playerIds = data.players.map((p) => p.id);
      const card = await storage.addUpcomingCard(name, date, playerIds);
      setData((prev) => ({ ...prev, upcoming: [...prev.upcoming, card] }));
    },
    [data.players]
  );

  const setVote = useCallback(
    async (cardId: string, playerId: string, vote: "in" | "out" | null) => {
      await storage.setVote(cardId, playerId, vote);
      setData((prev) => ({
        ...prev,
        upcoming: prev.upcoming.map((c) =>
          c.id === cardId
            ? {
                ...c,
                votes: c.votes.map((v) =>
                  v.playerId === playerId ? { ...v, vote } : v
                ),
              }
            : c
        ),
      }));
    },
    []
  );

  const promoteCard = useCallback(async (cardId: string) => {
    const event = await storage.promoteCard(cardId);
    setData((prev) => ({
      ...prev,
      events: [...prev.events, event],
      upcoming: prev.upcoming.map((c) =>
        c.id === cardId ? { ...c, promoted: true } : c
      ),
    }));
  }, []);

  const deleteUpcomingCard = useCallback(async (cardId: string) => {
    await storage.deleteUpcomingCard(cardId);
    setData((prev) => ({
      ...prev,
      upcoming: prev.upcoming.filter((c) => c.id !== cardId),
    }));
  }, []);

  // --- Reset ---

  const resetData = useCallback(async () => {
    await storage.resetAllData();
    setData({ players: [], events: [], upcoming: [] });
  }, []);

  return {
    data,
    loaded,
    addPlayer,
    removePlayer,
    addEvent,
    updateEventScores,
    deleteEvent,
    addUpcomingCard,
    setVote,
    promoteCard,
    deleteUpcomingCard,
    resetData,
  };
}
