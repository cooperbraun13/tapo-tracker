"use client";

import { useState } from "react";
import { useAppData } from "@/hooks/useAppData";
import Layout, { Tab } from "@/components/Layout";
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
    updateEvent,
    updateEventScores,
    deleteEvent,
    addUpcomingCard,
    setVote,
    promoteCard,
    deleteUpcomingCard,
  } = useAppData();

  const [activeTab, setActiveTab] = useState<Tab>("Leaderboard");
  const [highlightEventId, setHighlightEventId] = useState<string | undefined>();

  function handleNavigate(target: "leaderboard" | "events", eventId?: string) {
    if (target === "events") {
      setActiveTab("Events");
      setHighlightEventId(eventId);
      // Clear after EventCard has consumed it (state is initialized once)
      setTimeout(() => setHighlightEventId(undefined), 500);
    } else {
      setActiveTab("Leaderboard");
    }
  }

  if (!loaded) return null;

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {(tab) => {
        if (tab === "Manage") {
          return (
            <PlayerManager
              players={data.players}
              onAddPlayer={addPlayer}
              onRemovePlayer={removePlayer}
            />
          );
        }
        if (tab === "Upcoming") {
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
        if (tab === "Events") {
          return (
            <EventList
              events={data.events}
              players={data.players}
              onAddEvent={addEvent}
              onUpdateEvent={updateEvent}
              onUpdateScores={updateEventScores}
              onDeleteEvent={deleteEvent}
              highlightEventId={highlightEventId}
            />
          );
        }
        return <Leaderboard data={data} onNavigate={handleNavigate} />;
      }}
    </Layout>
  );
}
