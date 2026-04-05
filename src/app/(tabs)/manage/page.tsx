"use client";

import { useAppData } from "@/hooks/useAppData";
import PlayerManager from "@/components/PlayerManager";

export default function ManagePage() {
  const { data, loaded, addPlayer, removePlayer } = useAppData();

  if (!loaded) return null;

  return (
    <PlayerManager
      players={data.players}
      onAddPlayer={addPlayer}
      onRemovePlayer={removePlayer}
    />
  );
}
