"use client";

import { useEffect, useState } from "react";
import { useAppData } from "@/hooks/useAppData";
import { supabase } from "@/lib/supabase";
import { getPlayers } from "@/lib/storage";
import UpcomingCards from "@/components/UpcomingCards";

export default function UpcomingPage() {
  const {
    data,
    loaded,
    addUpcomingCard,
    setVote,
    promoteCard,
    deleteUpcomingCard,
  } = useAppData();

  const [currentPlayerId, setCurrentPlayerId] = useState<string | undefined>();

  useEffect(() => {
    async function resolveCurrentPlayer() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const players = await getPlayers();
      const linked = players.find((p) => p.authUserId === user.id);
      if (linked) setCurrentPlayerId(linked.id);
    }

    resolveCurrentPlayer();
  }, []);

  if (!loaded) return null;

  return (
    <UpcomingCards
      cards={data.upcoming}
      players={data.players}
      onAddCard={addUpcomingCard}
      onVote={setVote}
      onPromote={promoteCard}
      onDelete={deleteUpcomingCard}
      currentPlayerId={currentPlayerId}
    />
  );
}
