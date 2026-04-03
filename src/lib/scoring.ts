import { UFCEvent, AppData } from "./types";

const BUY_IN = 5;

/**
 * Calculate money won/lost for each player in a single event.
 * Winner takes the pot (losers' buy-ins). Ties split evenly.
 * If all players tie, everyone gets $0.
 */
export function calculateMoney(event: UFCEvent): Map<string, number> {
  const result = new Map<string, number>();
  if (event.scores.length === 0) return result;

  const maxPoints = Math.max(...event.scores.map((s) => s.points));
  const winners = event.scores.filter((s) => s.points === maxPoints);
  const losers = event.scores.filter((s) => s.points < maxPoints);

  // All tied — no one wins or loses
  if (losers.length === 0) {
    for (const s of winners) result.set(s.playerId, 0);
    return result;
  }

  const pot = losers.length * BUY_IN;
  const winnerPayout = pot / winners.length;

  for (const s of winners) result.set(s.playerId, winnerPayout);
  for (const s of losers) result.set(s.playerId, -BUY_IN);
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

      // Count as a win if they earned positive money
      if (earned > 0) {
        stats.eventWins += 1;
      }
    }
  }

  return Array.from(statsMap.values()).sort(
    (a, b) => b.totalMoney - a.totalMoney
  );
}
