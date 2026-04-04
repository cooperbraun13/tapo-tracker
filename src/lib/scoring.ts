import { UFCEvent, EventScore, AppData } from "./types";

/**
 * Tiebreaker chain for determining event winner:
 * 1. Most points
 * 2. Most perfect picks
 * 3. Most correct picks
 * 4. Most semi-perfect picks
 * 5. Most decision picks
 * If still tied after all criteria, it's a shared win.
 */
export function resolveWinner(scores: EventScore[]): EventScore[] {
  if (scores.length === 0) return [];

  const maxPoints = Math.max(...scores.map((s) => s.points));
  let candidates = scores.filter((s) => s.points === maxPoints);

  if (candidates.length === 1) return candidates;

  // Only apply tiebreakers if detailed stats are available
  const hasDetailedStats = candidates.every(
    (s) => s.perfectPicks !== undefined
  );
  if (!hasDetailedStats) return candidates;

  const tiebreakers: (keyof EventScore)[] = [
    "perfectPicks",
    "correctPicks",
    "semiPerfectPicks",
    "decisionPicks",
  ];

  for (const stat of tiebreakers) {
    const maxVal = Math.max(
      ...candidates.map((s) => (s[stat] as number) ?? 0)
    );
    const filtered = candidates.filter(
      (s) => ((s[stat] as number) ?? 0) === maxVal
    );
    if (filtered.length < candidates.length) {
      candidates = filtered;
    }
    if (candidates.length === 1) return candidates;
  }

  return candidates; // still tied — shared win
}

/**
 * Calculate money won/lost for each player in a single event.
 * No-pool events return $0 for everyone.
 * Uses tiebreaker chain then splits if still tied.
 */
export function calculateMoney(event: UFCEvent): Map<string, number> {
  const result = new Map<string, number>();
  if (event.scores.length === 0) return result;

  // No-pool events: $0 for everyone
  if (!event.hasPool) {
    for (const s of event.scores) result.set(s.playerId, 0);
    return result;
  }

  const winners = resolveWinner(event.scores);
  const winnerIds = new Set(winners.map((w) => w.playerId));
  const losers = event.scores.filter((s) => !winnerIds.has(s.playerId));

  // All tied — no one wins or loses
  if (losers.length === 0) {
    for (const s of event.scores) result.set(s.playerId, 0);
    return result;
  }

  const buyIn = event.buyIn || 5;
  const pot = losers.length * buyIn;
  const winnerPayout = pot / winners.length;

  for (const w of winners) result.set(w.playerId, winnerPayout);
  for (const l of losers) result.set(l.playerId, -buyIn);
  return result;
}

export interface PlayerStats {
  playerId: string;
  name: string;
  totalMoney: number;
  eventWins: number;
  eventsPlayed: number;
}

/**
 * Compute leaderboard stats for all players across all events.
 * Returns array sorted by totalMoney descending.
 */
export function computeLeaderboard(data: AppData): PlayerStats[] {
  const statsMap = new Map<string, PlayerStats>();

  for (const player of data.players) {
    statsMap.set(player.id, {
      playerId: player.id,
      name: player.name,
      totalMoney: 0,
      eventWins: 0,
      eventsPlayed: 0,
    });
  }

  for (const event of data.events) {
    const money = calculateMoney(event);

    for (const score of event.scores) {
      const stats = statsMap.get(score.playerId);
      if (!stats) continue;

      stats.eventsPlayed += 1;
      const earned = money.get(score.playerId) ?? 0;
      stats.totalMoney += earned;

      if (earned > 0) {
        stats.eventWins += 1;
      }
    }
  }

  return Array.from(statsMap.values()).sort(
    (a, b) => b.totalMoney - a.totalMoney
  );
}
