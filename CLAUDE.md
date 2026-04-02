# CLAUDE.md - UFC Tapology Picks Tracker

## Project Overview

A web app for a small group of friends (4 people) to track UFC Tapology pick'em results and money wagered across events. Replaces a spreadsheet we currently use.

## Core Requirements

### What the app tracks

- **Players**: 4 friends in a fixed group
- **Events**: Each UFC card (e.g. "UFC 315", "UFC Fight Night: X vs Y")
- **Per player per event**: Tapology points scored (entered manually after each event)
- **Money is auto-calculated, not entered**: Everyone puts in $5. The player with the highest Tapology score wins the pot. So the winner gets +$5×(number of other players) and everyone else gets -$5. For example with 4 players: winner = +$15, losers = -$5 each.
- **Ties**: If two or more players tie for the highest Tapology score, they split the pot evenly (remaining players still lose $5 each).
- **Derived stats**: Total money (primary ranking metric), event wins, number of events participated in. Tapology points are tracked per-event for context but are NOT shown on the leaderboard.

### Two main views, equally important

1. **Leaderboard** — Overall standings ranked by total money. Show rank, name, total money (+/- colored), event wins, and events played. The leader should feel visually distinct. Tapology points do NOT appear here — money is what matters.
2. **Event History** — Chronological list of all UFC events with each player's scores. Tap/click an event to expand and see or edit scores. Most recent events on top.

### Data management

- A "Manage" section to add/remove players and reset data
- Adding an event: name the card, set a date, enter each player's Tapology points. Money is calculated automatically.
- Editing: be able to go back and fix Tapology points on past events (money recalculates)
- Deleting: be able to remove an event entirely

## Tech Stack

- **React** (Next.js preferably so we can deploy on Vercel)
- **TypeScript**
- **Tailwind CSS** for styling
- **Persistence**: Start with localStorage. Structure the data so it could migrate to Supabase or a simple JSON API later without a rewrite. Keep all storage access behind a single module/hook (e.g. `useStorage` or `storage.ts`) so swapping backends is a one-file change.

## Data Model

```typescript
interface Player {
  id: string;
  name: string;
}

interface EventScore {
  playerId: string;
  points: number; // Tapology points (manually entered)
  // money is NOT stored — it's computed from who won
}

interface UFCEvent {
  id: string;
  name: string; // e.g. "UFC 315"
  date: string; // ISO date string
  scores: EventScore[];
}

interface AppData {
  players: Player[];
  events: UFCEvent[];
}
```

### Money calculation logic (put this in `scoring.ts`)

```typescript
// Everyone buys in at $5. Winner takes the rest of the pot.
// With 4 players: winner = +15, losers = -5 each.
// Ties split the winnings evenly.
function calculateMoney(event: UFCEvent): Map<string, number> {
  const maxPoints = Math.max(...event.scores.map((s) => s.points));
  const winners = event.scores.filter((s) => s.points === maxPoints);
  const losers = event.scores.filter((s) => s.points < maxPoints);
  const pot = losers.length * 5;
  const winnerPayout = pot / winners.length;

  const result = new Map<string, number>();
  for (const s of winners) result.set(s.playerId, winnerPayout);
  for (const s of losers) result.set(s.playerId, -5);
  return result;
}
```

## Design Direction

### Philosophy

Dark, minimalist, and sharp. Think sports broadcast scoreboard meets Bloomberg terminal — not a SaaS landing page. Every element earns its space. No rounded-everything softness, no gradient blobs, no decorative filler. Clean lines, tight spacing, high contrast. It should feel like a tool built by people who care about the data, not the decoration.

### Theme & Color

- **Background**: Near-black (e.g. `#09090b`) with a single slightly lighter surface tone for cards (`#111116`). Avoid stacking multiple grays — keep the palette razor-thin.
- **Accent**: Gold (`#d4a843` or similar muted gold) used sparingly — only for #1 rank, the current leader, and key interactive elements. If gold is everywhere, it means nothing.
- **Money**: Green for positive, red for negative. Use desaturated tones (not neon). The numbers should be readable, not screaming.
- **Text**: Off-white primary (`#e8e6e1`), muted gray for secondary labels. Two levels of text hierarchy max.
- **Borders**: Subtle, 1px, low-opacity. Used to separate, not decorate.

### Typography

- **Headings / ranks / numbers**: Bold condensed typeface — Oswald, Barlow Condensed, or similar. All-caps with wide letter-spacing for labels. These should hit hard and feel like a fight card.
- **Body / inputs / secondary text**: Clean sans-serif — Barlow, DM Sans, or similar. Regular weight, easy to scan.
- **No more than two font families total.** Consistency over variety.

### Layout & Responsiveness

- **Web-first** — designed for desktop/laptop screens as the primary experience. Use the full width intelligently (max-width container around 800-900px, centered).
- **Mobile-viable** — should work fine on phones but don't sacrifice the desktop layout for mobile constraints. Stack columns on small screens, keep the core data readable.
- Information-dense. No hero sections, no excessive padding, no marketing fluff. This is a tool for a friend group, not a product launch.

### Animation & Motion

This is where the app should have personality. Use Framer Motion (or CSS transitions/keyframes if keeping it lightweight).

- **Event winner reveal**: When an event is saved/finalized, the winner's row should get a brief highlight animation — a gold shimmer or flash that fades to the normal gold accent state. Make it feel like a callout, like their name just got announced.
- **Leaderboard rank changes**: When rankings shift after a new event, rows should animate to their new positions (layout animation). Smooth slide, not instant reorder.
- **Number counting**: When the leaderboard recalculates, money totals should count up/tick to their new values rather than snapping. Keep it fast (300-500ms) — punchy, not slow.
- **Tab/view transitions**: Subtle fade or slide when switching between Leaderboard, Events, and Manage. Nothing fancy, just not a hard cut.
- **Hover states**: Cards and rows should have a crisp hover — slight background lighten and maybe a left border accent that slides in. Fast transitions (150ms).
- **Entry animations**: When the page loads or a list populates, stagger items in with a quick fade-up. Keep the stagger tight (30-50ms per item) so it feels snappy, not like a slow waterfall.

**What to avoid**: Bouncy/elastic easing, spinning loaders, confetti, anything that feels playful or cute. The motion language should be fast, clean, and decisive — like a punch stat graphic on a broadcast.

## UX Details

- **Leaderboard**: Sorted by total money descending. Each row shows rank medal, player name, total money (+/- colored), events played, and event wins. The #1 player's row should have a subtle gold highlight or border. No Tapology points on this view.
- **Event list**: Collapsed by default showing event name, date, and a compact score summary for each player (Tapology points + computed money). Click to expand into edit mode with input fields for Tapology points per player. Money updates automatically based on who won.
- **Adding an event**: Button at top of event list. Form with event name, date picker, and a Tapology points input per player. Pre-populate player rows automatically. Only field to fill in is points — money is computed on save.
- **Empty states**: Helpful messages pointing users to the right tab when no players or events exist yet.

## File Structure

```
src/
  components/
    Leaderboard.tsx
    EventList.tsx
    EventCard.tsx
    PlayerManager.tsx
    Layout.tsx
  hooks/
    useAppData.ts      # all data loading/saving/mutations
  lib/
    storage.ts         # localStorage wrapper, single swap point
    scoring.ts         # derived stat calculations (totals, rankings, wins)
    types.ts           # TypeScript interfaces
  App.tsx
  main.tsx
```

## Key Implementation Notes

- All derived stats (totals, rankings, who won each event) should be computed, not stored. Only store raw scores.
- Generate IDs with `crypto.randomUUID()` or a simple timestamp+random approach.
- The storage module should expose: `loadData(): AppData`, `saveData(data: AppData)`, and nothing else. Components use the `useAppData` hook which wraps these.
- When editing scores for an event, don't save on every keystroke. Use local component state and save on explicit "Save" action.
- Handle edge cases: tied Tapology scores for an event (split the pot evenly among winners), all players tie (nobody wins or loses money that event), player with no scores for an event (skip them in calculations, show dash in UI), events where not all players participated (only participating players are in the pot).

## What NOT to Build (Keep It Simple)

- No auth or user accounts — this is for a small friend group
- No real-time sync between devices (localStorage is fine for now)
- No individual fight-by-fight picks — just the Tapology total per event
- No charts or graphs in v1 (can add later)
- No import from spreadsheet (we'll enter past data manually if we want)

## Commands

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run lint` — lint check

## Testing Notes

When verifying the build works:

1. Add 4 players
2. Add an event and enter Tapology points — confirm money auto-calculates (winner = +$15, losers = -$5 each)
3. Add a second event with a different winner — confirm leaderboard reranks by total money
4. Test a tie: give two players the same highest points — confirm they split the pot
5. Confirm Tapology points appear on event cards but NOT on the leaderboard
6. Edit an event's points and confirm money and leaderboard recalculate
7. Delete a player and confirm their scores are cleaned up from all events
8. Refresh the page and confirm data persists
