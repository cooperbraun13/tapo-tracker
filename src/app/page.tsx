"use client";

import { useAppData } from "@/hooks/useAppData";
import Layout from "@/components/Layout";
import Leaderboard from "@/components/Leaderboard";
import PlayerManager from "@/components/PlayerManager";
import EventList from "@/components/EventList";
import UpcomingCards from "@/components/UpcomingCards";

export default function Home() {
  const {
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
        if (activeTab === "Upcoming") {
          return (
            <UpcomingCards
              cards={data.upcoming}
              players={data.players}
              onAddCard={addUpcomingCard}
              onVote={setVote}
              onPromote={promoteCard}
              onDelete={deleteUpcomingCard}
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
