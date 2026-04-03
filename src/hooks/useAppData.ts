"use client";

import { useState, useEffect, useCallback } from "react";
import { AppData, Player, UFCEvent, EventScore, UpcomingCard, PlayerVote } from "@/lib/types";
import { loadData, saveData } from "@/lib/storage";

const DEFAULT_DATA: AppData = { players: [], events: [], upcoming: [] };

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

  // --- Upcoming card mutations ---

  const addUpcomingCard = useCallback(
    (name: string, date: string) => {
      setData((prev) => {
        const votes: PlayerVote[] = prev.players.map((p) => ({
          playerId: p.id,
          vote: null,
        }));
        const card: UpcomingCard = {
          id: crypto.randomUUID(),
          name,
          date,
          votes,
          promoted: false,
        };
        return { ...prev, upcoming: [...prev.upcoming, card] };
      });
    },
    []
  );

  const setVote = useCallback(
    (cardId: string, playerId: string, vote: "in" | "out" | null) => {
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

  const promoteCard = useCallback((cardId: string) => {
    setData((prev) => {
      const card = prev.upcoming.find((c) => c.id === cardId);
      if (!card) return prev;
      const inPlayers = card.votes
        .filter((v) => v.vote === "in")
        .map((v) => v.playerId);
      const scores: EventScore[] = inPlayers.map((pid) => ({
        playerId: pid,
        points: 0,
      }));
      const event: UFCEvent = {
        id: crypto.randomUUID(),
        name: card.name,
        date: card.date,
        scores,
      };
      return {
        ...prev,
        events: [...prev.events, event],
        upcoming: prev.upcoming.map((c) =>
          c.id === cardId ? { ...c, promoted: true } : c
        ),
      };
    });
  }, []);

  const deleteUpcomingCard = useCallback((cardId: string) => {
    setData((prev) => ({
      ...prev,
      upcoming: prev.upcoming.filter((c) => c.id !== cardId),
    }));
  }, []);

  // --- Reset ---

  const resetData = useCallback(() => {
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
