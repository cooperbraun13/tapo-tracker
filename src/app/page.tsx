"use client";

import { useAppData } from "@/hooks/useAppData";
import Layout from "@/components/Layout";
import Leaderboard from "@/components/Leaderboard";
import PlayerManager from "@/components/PlayerManager";
import EventList from "@/components/EventList";

export default function Home() {
  const {
    data,
    loaded,
    addPlayer,
    removePlayer,
    addEvent,
    updateEventScores,
    deleteEvent,
    resetData,
  } = useAppData();

  if (!loaded) return null;

  return (
    <Layout>
      {(activeTab) => {
        if (activeTab === "Manage") {
          return (
            <PlayerManager
              players={data.players}
              onAddPlayer={addPlayer}
              onRemovePlayer={removePlayer}
              onReset={resetData}
            />
          );
        }
        if (activeTab === "Events") {
          return (
            <EventList
              events={data.events}
              players={data.players}
              onAddEvent={addEvent}
              onUpdateScores={updateEventScores}
              onDeleteEvent={deleteEvent}
            />
          );
        }
        return <Leaderboard data={data} />;
      }}
    </Layout>
  );
}
