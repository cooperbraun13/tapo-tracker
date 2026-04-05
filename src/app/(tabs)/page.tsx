"use client";

import { useRouter } from "next/navigation";
import { useAppData } from "@/hooks/useAppData";
import Leaderboard from "@/components/Leaderboard";

export default function LeaderboardPage() {
  const { data, loaded } = useAppData();
  const router = useRouter();

  function handleNavigate(target: "leaderboard" | "events", eventId?: string) {
    if (target === "events") {
      const url = eventId ? `/events?highlight=${eventId}` : "/events";
      router.push(url);
    }
    // "leaderboard" is the current page — no-op
  }

  if (!loaded) return null;

  return <Leaderboard data={data} onNavigate={handleNavigate} />;
}
