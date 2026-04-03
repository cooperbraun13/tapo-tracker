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

export interface AppData {
  players: Player[];
  events: UFCEvent[];
}
