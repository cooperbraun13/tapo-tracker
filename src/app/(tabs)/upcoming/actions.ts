"use server";

import { supabaseAdmin } from "@/lib/supabase-server";
import { UpcomingCard } from "@/lib/types";

/**
 * Add an upcoming card and initialise a null vote row for every player.
 * Uses the service-role admin client so the insert is not blocked by RLS.
 */
export async function addUpcomingCardAction(
  name: string,
  promotion: string,
  date: string,
  playerIds: string[]
): Promise<UpcomingCard> {
  const { data: card, error: cardError } = await supabaseAdmin
    .from("upcoming_cards")
    .insert({ name, promotion, date })
    .select("id, name, promotion, date, promoted")
    .single();
  if (cardError) throw new Error(cardError.message);

  if (playerIds.length > 0) {
    const rows = playerIds.map((pid) => ({
      card_id: card.id,
      player_id: pid,
      vote: null,
    }));
    const { error: votesError } = await supabaseAdmin
      .from("upcoming_votes")
      .insert(rows);
    if (votesError) throw new Error(votesError.message);
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
