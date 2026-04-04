export interface Player {
  id: string;
  name: string;
  tapologyUsername?: string;
  discordId?: string;
  discordUsername?: string;
  role: "admin" | "user";
}

export interface EventScore {
  playerId: string;
  points: number; // Tapology points (manually entered or via ingestion)
  numPicks?: number;
  correctPicks?: number;
  perfectPicks?: number;
  semiPerfectPicks?: number;
  decisionPicks?: number;
  // money is NOT stored — it's computed from who won
}

export interface UFCEvent {
  id: string;
  name: string; // e.g. "UFC 315"
  promotion: string; // e.g. "UFC", "Bellator", "PFL"
  date: string; // ISO date string
  hasPool: boolean; // whether money is on the line
  buyIn: number; // default 5, can vary per event
  finalized: boolean; // true once results are confirmed
  scores: EventScore[];
}

export interface PlayerVote {
  playerId: string;
  vote: "in" | "out" | null; // null = hasn't voted yet
}

export interface UpcomingCard {
  id: string;
  name: string;
  promotion: string;
  date: string;
  votes: PlayerVote[];
  promoted: boolean; // true once it's been sent to Events
}

export interface AppData {
  players: Player[];
  events: UFCEvent[];
  upcoming: UpcomingCard[];
}
