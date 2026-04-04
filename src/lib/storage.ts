import { supabase } from "./supabase";
import { Player, UFCEvent, EventScore, UpcomingCard } from "./types";

// --- Players ---

const PLAYER_COLS = "id, name, tapology_username, discord_id, discord_username, role, auth_user_id";

export async function getPlayers(): Promise<Player[]> {
  const { data, error } = await supabase
    .from("players")
    .select(PLAYER_COLS)
    .order("created_at");
  if (error) throw error;
  return data.map(mapPlayer);
}

export async function addPlayer(
  name: string,
  opts?: { tapologyUsername?: string; discordId?: string; discordUsername?: string; role?: "admin" | "user" }
): Promise<Player> {
  const { data, error } = await supabase
    .from("players")
    .insert({
      name,
      tapology_username: opts?.tapologyUsername ?? null,
      discord_id: opts?.discordId ?? null,
      discord_username: opts?.discordUsername ?? null,
      role: opts?.role ?? "user",
    })
    .select(PLAYER_COLS)
    .single();
  if (error) throw error;
  return mapPlayer(data);
}

export async function updatePlayer(id: string, updates: Partial<Player>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (updates.name !== undefined) row.name = updates.name;
  if (updates.tapologyUsername !== undefined) row.tapology_username = updates.tapologyUsername;
  if (updates.discordId !== undefined) row.discord_id = updates.discordId;
  if (updates.discordUsername !== undefined) row.discord_username = updates.discordUsername;
  if (updates.role !== undefined) row.role = updates.role;
  const { error } = await supabase.from("players").update(row).eq("id", id);
  if (error) throw error;
}

export async function removePlayer(id: string): Promise<void> {
  const { error } = await supabase.from("players").delete().eq("id", id);
  if (error) throw error;
}

function mapPlayer(row: Record<string, unknown>): Player {
  return {
    id: row.id as string,
    name: row.name as string,
    tapologyUsername: (row.tapology_username as string) ?? undefined,
    discordId: (row.discord_id as string) ?? undefined,
    discordUsername: (row.discord_username as string) ?? undefined,
    role: (row.role as "admin" | "user") ?? "user",
    authUserId: (row.auth_user_id as string) ?? undefined,
  };
}

/**
 * Link a player record to a Supabase Auth user.
 * Called server-side after an invite is accepted or manually linked.
 */
export async function updatePlayerAuthId(
  playerId: string,
  authUserId: string
): Promise<void> {
  const { error } = await supabase
    .from("players")
    .update({ auth_user_id: authUserId })
    .eq("id", playerId);
  if (error) throw error;
}

// --- Events ---

const EVENT_COLS = "id, name, promotion, date, has_pool, buy_in, finalized";
const SCORE_JOIN = "event_scores(player_id, points, num_picks, correct_picks, perfect_picks, semi_perfect_picks, decision_picks)";

export async function getEvents(filters?: { year?: number; promotion?: string }): Promise<UFCEvent[]> {
  let query = supabase
    .from("events")
    .select(`${EVENT_COLS}, ${SCORE_JOIN}`)
    .order("date", { ascending: false });

  if (filters?.year) {
    query = query
      .gte("date", `${filters.year}-01-01`)
      .lte("date", `${filters.year}-12-31`);
  }
  if (filters?.promotion) {
    query = query.eq("promotion", filters.promotion);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data.map(mapEvent);
}

export async function addEvent(
  event: { name: string; promotion?: string; date: string; hasPool?: boolean; buyIn?: number },
  scores: EventScore[]
): Promise<UFCEvent> {
  const { data: row, error: eventError } = await supabase
    .from("events")
    .insert({
      name: event.name,
      promotion: event.promotion ?? "UFC",
      date: event.date,
      has_pool: event.hasPool ?? true,
      buy_in: event.buyIn ?? 5,
      finalized: false,
    })
    .select(EVENT_COLS)
    .single();
  if (eventError) throw eventError;

  if (scores.length > 0) {
    const rows = scores.map((s) => ({
      event_id: row.id,
      player_id: s.playerId,
      points: s.points,
      num_picks: s.numPicks ?? null,
      correct_picks: s.correctPicks ?? null,
      perfect_picks: s.perfectPicks ?? null,
      semi_perfect_picks: s.semiPerfectPicks ?? null,
      decision_picks: s.decisionPicks ?? null,
    }));
    const { error: scoresError } = await supabase
      .from("event_scores")
      .insert(rows);
    if (scoresError) throw scoresError;
  }

  return {
    id: row.id,
    name: row.name,
    promotion: row.promotion,
    date: row.date,
    hasPool: row.has_pool,
    buyIn: row.buy_in,
    finalized: row.finalized,
    scores,
  };
}

export async function updateEventScores(
  eventId: string,
  scores: EventScore[]
): Promise<void> {
  const { error: delError } = await supabase
    .from("event_scores")
    .delete()
    .eq("event_id", eventId);
  if (delError) throw delError;

  if (scores.length > 0) {
    const rows = scores.map((s) => ({
      event_id: eventId,
      player_id: s.playerId,
      points: s.points,
      num_picks: s.numPicks ?? null,
      correct_picks: s.correctPicks ?? null,
      perfect_picks: s.perfectPicks ?? null,
      semi_perfect_picks: s.semiPerfectPicks ?? null,
      decision_picks: s.decisionPicks ?? null,
    }));
    const { error: insError } = await supabase
      .from("event_scores")
      .insert(rows);
    if (insError) throw insError;
  }
}

export async function updateEvent(
  eventId: string,
  updates: { name?: string; promotion?: string; hasPool?: boolean; buyIn?: number }
): Promise<void> {
  const row: Record<string, unknown> = {};
  if (updates.name !== undefined) row.name = updates.name;
  if (updates.promotion !== undefined) row.promotion = updates.promotion;
  if (updates.hasPool !== undefined) row.has_pool = updates.hasPool;
  if (updates.buyIn !== undefined) row.buy_in = updates.buyIn;
  const { error } = await supabase.from("events").update(row).eq("id", eventId);
  if (error) throw error;
}

export async function finalizeEvent(eventId: string): Promise<void> {
  const { error } = await supabase
    .from("events")
    .update({ finalized: true })
    .eq("id", eventId);
  if (error) throw error;
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw error;
}

interface ScoreRow {
  player_id: string;
  points: number;
  num_picks: number | null;
  correct_picks: number | null;
  perfect_picks: number | null;
  semi_perfect_picks: number | null;
  decision_picks: number | null;
}

function mapEvent(row: Record<string, unknown>): UFCEvent {
  return {
    id: row.id as string,
    name: row.name as string,
    promotion: (row.promotion as string) ?? "UFC",
    date: row.date as string,
    hasPool: (row.has_pool as boolean) ?? true,
    buyIn: (row.buy_in as number) ?? 5,
    finalized: (row.finalized as boolean) ?? false,
    scores: ((row.event_scores as ScoreRow[]) ?? []).map(mapScore),
  };
}

function mapScore(s: ScoreRow): EventScore {
  return {
    playerId: s.player_id,
    points: s.points,
    numPicks: s.num_picks ?? undefined,
    correctPicks: s.correct_picks ?? undefined,
    perfectPicks: s.perfect_picks ?? undefined,
    semiPerfectPicks: s.semi_perfect_picks ?? undefined,
    decisionPicks: s.decision_picks ?? undefined,
  };
}

// --- Upcoming Cards ---

export async function getUpcomingCards(): Promise<UpcomingCard[]> {
  const { data, error } = await supabase
    .from("upcoming_cards")
    .select("id, name, promotion, date, promoted, upcoming_votes(player_id, vote)")
    .order("date");
  if (error) throw error;
  return data.map(mapUpcomingCard);
}

export async function addUpcomingCard(
  name: string,
  promotion: string,
  date: string,
  playerIds: string[]
): Promise<UpcomingCard> {
  const { data: card, error: cardError } = await supabase
    .from("upcoming_cards")
    .insert({ name, promotion, date })
    .select("id, name, promotion, date, promoted")
    .single();
  if (cardError) throw cardError;

  if (playerIds.length > 0) {
    const rows = playerIds.map((pid) => ({
      card_id: card.id,
      player_id: pid,
      vote: null,
    }));
    const { error: votesError } = await supabase
      .from("upcoming_votes")
      .insert(rows);
    if (votesError) throw votesError;
  }

  return {
    id: card.id,
    name: card.name,
    promotion: card.promotion,
    date: card.date,
    promoted: card.promoted,
    votes: playerIds.map((pid) => ({ playerId: pid, vote: null })),
  };
}

export async function setVote(
  cardId: string,
  playerId: string,
  vote: "in" | "out" | null
): Promise<void> {
  const { error } = await supabase
    .from("upcoming_votes")
    .upsert(
      { card_id: cardId, player_id: playerId, vote },
      { onConflict: "card_id,player_id" }
    );
  if (error) throw error;
}

export async function promoteCard(cardId: string): Promise<UFCEvent> {
  const { data: card, error: cardError } = await supabase
    .from("upcoming_cards")
    .select("id, name, promotion, date, upcoming_votes(player_id, vote)")
    .eq("id", cardId)
    .single();
  if (cardError) throw cardError;

  const inPlayers = (
    card.upcoming_votes as Array<{ player_id: string; vote: string | null }>
  )
    .filter((v) => v.vote === "in")
    .map((v) => v.player_id);

  const event = await addEvent(
    { name: card.name, promotion: card.promotion, date: card.date },
    inPlayers.map((pid) => ({ playerId: pid, points: 0 }))
  );

  const { error: updateError } = await supabase
    .from("upcoming_cards")
    .update({ promoted: true })
    .eq("id", cardId);
  if (updateError) throw updateError;

  return event;
}

export async function deleteUpcomingCard(id: string): Promise<void> {
  const { error } = await supabase
    .from("upcoming_cards")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

function mapUpcomingCard(row: Record<string, unknown>): UpcomingCard {
  return {
    id: row.id as string,
    name: row.name as string,
    promotion: (row.promotion as string) ?? "UFC",
    date: row.date as string,
    promoted: row.promoted as boolean,
    votes: (
      (row.upcoming_votes as Array<{ player_id: string; vote: string | null }>) ?? []
    ).map((v) => ({
      playerId: v.player_id,
      vote: v.vote as "in" | "out" | null,
    })),
  };
}
