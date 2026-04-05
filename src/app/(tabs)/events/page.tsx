"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAppData } from "@/hooks/useAppData";
import EventList from "@/components/EventList";

function EventsContent() {
  const { data, loaded, addEvent, updateEvent, updateEventScores, deleteEvent } =
    useAppData();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [highlightEventId, setHighlightEventId] = useState<string | undefined>();

  useEffect(() => {
    const highlight = searchParams.get("highlight");
    if (highlight) {
      setHighlightEventId(highlight);
      // Clear the query param without adding to history stack
      router.replace("/events");
      // Clear the highlight state after EventCard has consumed it
      const timer = setTimeout(() => setHighlightEventId(undefined), 2000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, router]);

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
