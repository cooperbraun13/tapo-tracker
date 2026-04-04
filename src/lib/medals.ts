import { AppData } from "./types";
import { resolveWinner, calculateMoney } from "./scoring";

export interface Medal {
  emoji: string;
  label: string;
  description: string;
  target: "leaderboard" | "events";
  eventId?: string;
}

/**
 * Compute achievement medals for all players.
 * - No-pool events count for all medals EXCEPT money-based ones (🥇, 📉).
 * - Ties: all tied players receive the medal.
 * - A medal is only awarded if at least one player qualifies (e.g. someone
 *   must have actually won money for 🥇 to be given out).
 */
export function computeMedals(data: AppData): Map<string, Medal[]> {
  const { players, events } = data;
  const medalMap = new Map<string, Medal[]>();
  for (const p of players) medalMap.set(p.id, []);

  if (events.length === 0) return medalMap;

  const playerIds = new Set(players.map((p) => p.id));

  // Award to all players whose value equals the max.
  // minVal: skip award if max <= minVal (e.g. nobody won money).
  // eventMap: optionally attach the event ID for the winning score.
  function awardMax(
    base: Omit<Medal, "eventId">,
    valMap: Map<string, number>,
    minVal = -Infinity,
    eventMap?: Map<string, string>
  ) {
    const entries = [...valMap.entries()].filter(([id]) => playerIds.has(id));
    if (entries.length === 0) return;
    const max = Math.max(...entries.map(([, v]) => v));
    if (max <= minVal) return;
    for (const [id, v] of entries) {
      if (v === max) {
        const medal: Medal = eventMap
          ? { ...base, eventId: eventMap.get(id) }
          : { ...base };
        medalMap.get(id)?.push(medal);
      }
    }
  }

  // Award to all players whose value equals the min.
  function awardMin(
    base: Omit<Medal, "eventId">,
    valMap: Map<string, number>,
    eventMap?: Map<string, string>
  ) {
    const entries = [...valMap.entries()].filter(([id]) => playerIds.has(id));
    if (entries.length === 0) return;
    const min = Math.min(...entries.map(([, v]) => v));
    for (const [id, v] of entries) {
      if (v === min) {
        const medal: Medal = eventMap
          ? { ...base, eventId: eventMap.get(id) }
          : { ...base };
        medalMap.get(id)?.push(medal);
      }
    }
  }

  // --- Accumulate stats ---

  const totalPoints = new Map<string, number>();
  const allEventWins = new Map<string, number>();
  const bestScore = new Map<string, number>();
  const worstScore = new Map<string, number>();
  const totalMoneyWon = new Map<string, number>();
  const totalMoneyLost = new Map<string, number>();
  const bestScoreEvent = new Map<string, string>(); // playerId → eventId
  const worstScoreEvent = new Map<string, string>(); // playerId → eventId

  for (const p of players) {
    totalPoints.set(p.id, 0);
    allEventWins.set(p.id, 0);
    totalMoneyWon.set(p.id, 0);
    totalMoneyLost.set(p.id, 0);
  }

  for (const event of events) {
    // All events: total points and per-player best/worst score
    for (const s of event.scores) {
      if (!playerIds.has(s.playerId)) continue;
      totalPoints.set(s.playerId, (totalPoints.get(s.playerId) ?? 0) + s.points);

      const prev = bestScore.get(s.playerId);
      if (prev === undefined || s.points > prev) {
        bestScore.set(s.playerId, s.points);
        bestScoreEvent.set(s.playerId, event.id);
      }

      const prevWorst = worstScore.get(s.playerId);
      if (prevWorst === undefined || s.points < prevWorst) {
        worstScore.set(s.playerId, s.points);
        worstScoreEvent.set(s.playerId, event.id);
      }
    }

    // Win counting: all events (including no-pool).
    // A "win" requires at least one loser — solo or all-tied events don't count.
    if (event.scores.length > 1) {
      const winners = resolveWinner(event.scores);
      if (winners.length < event.scores.length) {
        for (const w of winners) {
          if (playerIds.has(w.playerId)) {
            allEventWins.set(w.playerId, (allEventWins.get(w.playerId) ?? 0) + 1);
          }
        }
      }
    }

    // Money stats: pool events only
    if (event.hasPool && event.scores.length > 1) {
      const money = calculateMoney(event);
      for (const [pid, amount] of money.entries()) {
        if (!playerIds.has(pid)) continue;
        if (amount > 0) {
          totalMoneyWon.set(pid, (totalMoneyWon.get(pid) ?? 0) + amount);
        } else if (amount < 0) {
          totalMoneyLost.set(pid, (totalMoneyLost.get(pid) ?? 0) + Math.abs(amount));
        }
      }
    }
  }

  // --- Award medals ---

  awardMax(
    {
      emoji: "🥇",
      label: "Most Money Won",
      description: "Leads all players in total money won",
      target: "leaderboard",
    },
    totalMoneyWon,
    0
  );
  awardMax(
    {
      emoji: "🏆",
      label: "Most Event Wins",
      description: "Most event victories all time",
      target: "leaderboard",
    },
    allEventWins,
    0
  );
  awardMax(
    {
      emoji: "⭐",
      label: "Highest Single-Event Score",
      description: "Highest Tapology score in a single event",
      target: "events",
    },
    bestScore,
    -Infinity,
    bestScoreEvent
  );
  awardMax(
    {
      emoji: "📊",
      label: "Most Total Points",
      description: "Most cumulative Tapology points all time",
      target: "leaderboard",
    },
    totalPoints,
    0
  );
  awardMin(
    {
      emoji: "💩",
      label: "Lowest Single-Event Score",
      description: "Lowest Tapology score in a single event",
      target: "events",
    },
    worstScore,
    worstScoreEvent
  );
  awardMax(
    {
      emoji: "📉",
      label: "Most Money Lost",
      description: "Most money lost all time",
      target: "leaderboard",
    },
    totalMoneyLost,
    0
  );

  return medalMap;
}
