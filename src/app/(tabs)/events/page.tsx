"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAppData } from "@/hooks/useAppData";
import EventList from "@/components/EventList";

function EventsContent() {
  const { data, loaded, addEvent, updateEvent, updateEventScores, deleteEvent } =
    useAppData();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Read directly from the URL — no intermediate state so there is no race
  // between the state update and data loading. The URL param is the source of
  // truth while it exists; we clean it up after the expand animation finishes.
  const highlightEventId = searchParams.get("highlight") ?? undefined;

  useEffect(() => {
    if (!highlightEventId) return;
    // Wait long enough for EventCard's expand + scroll animation (200ms) and
    // the gold highlight fade (1800ms) before removing the param from the URL.
    const timer = setTimeout(() => router.replace("/events"), 2200);
    return () => clearTimeout(timer);
  }, [highlightEventId, router]);

  if (!loaded) return null;

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

export default function EventsPage() {
  return (
    <Suspense fallback={null}>
      <EventsContent />
    </Suspense>
  );
}
