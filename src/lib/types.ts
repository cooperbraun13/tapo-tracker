export interface Player {
  id: string;
  name: string;
}

export interface EventScore {
  playerId: string;
  points: number; // Tapology points (manually entered)
  // money is NOT stored — it's computed from who won
}

export interface UFCEvent {
  id: string;
  name: string; // e.g. "UFC 315"
  date: string; // ISO date string
  scores: EventScore[];
}

export interface PlayerVote {
  playerId: string;
  vote: "in" | "out" | null; // null = hasn't voted yet
}

export interface UpcomingCard {
  id: string;
  name: string; // e.g. "UFC 320"
  date: string; // ISO date string
  votes: PlayerVote[];
  promoted: boolean; // true once it's been sent to Events
}

export interface AppData {
  players: Player[];
  events: UFCEvent[];
  upcoming: UpcomingCard[];
}
