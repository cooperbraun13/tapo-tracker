import { supabase } from "./supabase";
import { Player, UFCEvent, EventScore, UpcomingCard, PlayerVote } from "./types";

// --- Players ---

export async function getPlayers(): Promise<Player[]> {
  const { data, error } = await supabase
    .from("players")
    .select("id, name")
    .order("created_at");
  if (error) throw error;
  return data;
}

export async function addPlayer(name: string): Promise<Player> {
  const { data, error } = await supabase
    .from("players")
    .insert({ name })
    .select("id, name")
    .single();
  if (error) throw error;
  return data;
}

export async function removePlayer(id: string): Promise<void> {
  const { error } = await supabase.from("players").delete().eq("id", id);
  if (error) throw error;
}

// --- Events ---

export async function getEvents(): Promise<UFCEvent[]> {
  const { data, error } = await supabase
    .from("events")
    .select("id, name, date, event_scores(player_id, points)")
    .order("date", { ascending: false });
  if (error) throw error;
  return data.map((e: Record<string, unknown>) => ({
    id: e.id as string,
    name: e.name as string,
    date: e.date as string,
    scores: (
      (e.event_scores as Array<{ player_id: string; points: number }>) ?? []
    ).map((s) => ({
      playerId: s.player_id,
      points: s.points,
    })),
  }));
}

export async function addEvent(
  name: string,
  date: string,
  scores: { playerId: string; points: number }[]
): Promise<UFCEvent> {
  const { data: event, error: eventError } = await supabase
    .from("events")
    .insert({ name, date })
    .select("id, name, date")
    .single();
  if (eventError) throw eventError;

  if (scores.length > 0) {
    const rows = scores.map((s) => ({
      event_id: event.id,
      player_id: s.playerId,
      points: s.points,
    }));
    const { error: scoresError } = await supabase
      .from("event_scores")
      .insert(rows);
    if (scoresError) throw scoresError;
  }

  return {
    id: event.id,
    name: event.name,
    date: event.date,
    scores: scores.map((s) => ({ playerId: s.playerId, points: s.points })),
  };
}

export async function updateEventScores(
  eventId: string,
  scores: { playerId: string; points: number }[]
): Promise<void> {
  // Delete existing scores and re-insert
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
    }));
    const { error: insError } = await supabase
      .from("event_scores")
      .insert(rows);
    if (insError) throw insError;
  }
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw error;
}

// --- Upcoming Cards ---

export async function getUpcomingCards(): Promise<UpcomingCard[]> {
  const { data, error } = await supabase
    .from("upcoming_cards")
    .select("id, name, date, promoted, upcoming_votes(player_id, vote)")
    .order("date");
  if (error) throw error;
  return data.map((c: Record<string, unknown>) => ({
    id: c.id as string,
    name: c.name as string,
    date: c.date as string,
    promoted: c.promoted as boolean,
    votes: (
      (c.upcoming_votes as Array<{ player_id: string; vote: string | null }>) ??
      []
    ).map((v) => ({
      playerId: v.player_id,
      vote: v.vote as "in" | "out" | null,
    })),
  }));
}

export async function addUpcomingCard(
  name: string,
  date: string,
  playerIds: string[]
): Promise<UpcomingCard> {
  const { data: card, error: cardError } = await supabase
    .from("upcoming_cards")
    .insert({ name, date })
    .select("id, name, date, promoted")
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
  // Get the card with votes
  const { data: card, error: cardError } = await supabase
    .from("upcoming_cards")
    .select("id, name, date, upcoming_votes(player_id, vote)")
    .eq("id", cardId)
    .single();
  if (cardError) throw cardError;

  const inPlayers = (
    card.upcoming_votes as Array<{ player_id: string; vote: string | null }>
  )
    .filter((v) => v.vote === "in")
    .map((v) => v.player_id);

  // Create the event with scores for in-players
  const event = await addEvent(
    card.name,
    card.date,
    inPlayers.map((pid) => ({ playerId: pid, points: 0 }))
  );

  // Mark card as promoted
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

// --- Reset ---

export async function resetAllData(): Promise<void> {
  // Order matters due to foreign keys: scores/votes first, then parents
  await supabase.from("event_scores").delete().neq("id", "");
  await supabase.from("upcoming_votes").delete().neq("id", "");
  await supabase.from("events").delete().neq("id", "");
  await supabase.from("upcoming_cards").delete().neq("id", "");
  await supabase.from("players").delete().neq("id", "");
}
