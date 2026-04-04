# CLAUDE.md - UFC Tapology Picks Tracker

## Project Overview

A web app for a small group of friends (4 people) to track UFC Tapology pick'em results and money wagered across events. Replaces a spreadsheet we currently use. The app is designed to grow — supporting more participants, multiple promotions, richer stats, and optional integrations like Discord reminders and screenshot-based result ingestion over time.

## Core Requirements

**Make sure to always ask clarifying questions!!**

### What the app tracks

- **Players**: Currently 4 friends, but the system should support a variable number of participants. Not every player participates in every event.
- **Events**: UFC cards and potentially other promotions (e.g. Bellator, PFL, ONE). Each event has a promotion field.
- **Per player per event**: Tapology points scored (entered manually or via screenshot ingestion). Additionally track: correct picks, perfect picks, semi-perfect picks, decision picks, and number of picks — when available.
- **Money is auto-calculated, not entered**: Everyone puts in $5 by default. The player with the highest Tapology score wins the pot. So the winner gets +$5×(number of other players) and everyone else gets -$5. For example with 4 players: winner = +$15, losers = -$5 each.
- **Variable buy-in (v2)**: Support events with different buy-in amounts. Some events may have no pool at all. When an event has no pool, it's still tracked for stats but doesn't affect money totals.
- **Ties**: If two or more players tie for the highest Tapology score, apply the tiebreaker chain: most points → most perfect picks → most correct picks → most semi-perfect picks → most decision picks. If still tied after all criteria, split the pot evenly and mark the event as a shared win.
- **Derived stats**: Total money (primary ranking metric), event wins, number of events participated in, and all the extended stats listed in the Statistics section below. Tapology points are tracked per-event for context but are NOT shown on the leaderboard.

### Main views

1. **Leaderboard** — Overall standings ranked by total money. Show rank, name, total money (+/- colored), event wins, and events played. The leader should feel visually distinct. Tapology points do NOT appear here — money is what matters.
2. **Event History** — Chronological list of events with each player's scores. Click an event to expand and see or edit scores. Most recent events on top. Filterable by year and promotion.
3. **Upcoming** — A list of future cards where players vote on whether they want to bet. See "Upcoming Cards" section below.
4. **Player Profiles** — Per-player stats page with earnings, event history, medals, performance charts, and filters by year/promotion. Publicly viewable by anyone.
5. **Analytics (v2)** — Global stats page with filters by year, promotion, and participant.
6. **Admin** — Event management, player management, screenshot ingestion, Discord settings (admin-only).

### Data management

- A "Manage" section to add/remove players
- Adding an event: name the card, set a date and promotion, enter each player's Tapology points (and optionally detailed pick stats). Money is calculated automatically.
- Editing: be able to go back and fix scores on past events (money recalculates)
- Deleting: be able to remove an event entirely
- Screenshot ingestion: admin uploads a Tapology results screenshot, system extracts data via OCR, admin reviews and confirms before saving. See "Screenshot Ingestion" section below.

## Tech Stack

- **React** (Next.js preferably so we can deploy on Vercel)
- **TypeScript**
- **Tailwind CSS** for styling
- **Supabase** for persistence and auth (free tier). All friends share the same data. See "Supabase Setup" section below for schema and implementation details.
- **`@supabase/supabase-js`** client library
- **Supabase Auth** for user accounts and invite-based registration (v2 — see Auth section)
- **Framer Motion** for animations
- **Recharts** for charts on profile/analytics pages (v2)
- **Zod** for input validation
- **Google Cloud Vision API** for screenshot ingestion OCR (v2 — see Screenshot Ingestion section)
- **Always use context7 for up to date documentation/library lookup**

## Data Model

```typescript
interface Player {
  id: string;
  name: string;
  tapologyUsername?: string; // maps to their Tapology account
  discordId?: string; // for Discord reminder integration
  discordUsername?: string;
  role: "admin" | "user";
}

interface EventScore {
  playerId: string;
  points: number; // Tapology points (manually entered or via ingestion)
  numPicks?: number; // total picks made
  correctPicks?: number;
  perfectPicks?: number;
  semiPerfectPicks?: number;
  decisionPicks?: number;
  // money is NOT stored — it's computed from who won
}

interface UFCEvent {
  id: string;
  name: string; // e.g. "UFC 315"
  promotion: string; // e.g. "UFC", "Bellator", "PFL"
  date: string; // ISO date string
  hasPool: boolean; // whether money is on the line
  buyIn: number; // default 5, can vary per event
  finalized: boolean; // true once results are confirmed
  scores: EventScore[];
}

interface UpcomingCard {
  id: string;
  name: string;
  promotion: string;
  date: string;
  votes: PlayerVote[];
  promoted: boolean; // true once it's been sent to Events
}

interface PlayerVote {
  playerId: string;
  vote: "in" | "out" | null;
}

interface AppData {
  players: Player[];
  events: UFCEvent[];
  upcoming: UpcomingCard[];
}
```

### Tiebreaker logic (put this in `scoring.ts`)

```typescript
// Tiebreaker chain for determining event winner:
// 1. Most points
// 2. Most perfect picks
// 3. Most correct picks
// 4. Most semi-perfect picks
// 5. Most decision picks
// If still tied after all criteria, it's a shared win — split the pot.
function resolveWinner(scores: EventScore[]): EventScore[] {
  const maxPoints = Math.max(...scores.map((s) => s.points));
  let candidates = scores.filter((s) => s.points === maxPoints);

  if (candidates.length === 1) return candidates;

  // Only apply tiebreakers if the detailed stats are available
  const hasDetailedStats = candidates.every(
    (s) => s.perfectPicks !== undefined,
  );
  if (!hasDetailedStats) return candidates; // can't break tie without stats

  const tiebreakers: (keyof EventScore)[] = [
    "perfectPicks",
    "correctPicks",
    "semiPerfectPicks",
    "decisionPicks",
  ];

  for (const stat of tiebreakers) {
    const maxVal = Math.max(...candidates.map((s) => (s[stat] as number) ?? 0));
    const filtered = candidates.filter(
      (s) => ((s[stat] as number) ?? 0) === maxVal,
    );
    if (filtered.length < candidates.length) {
      candidates = filtered;
    }
    if (candidates.length === 1) return candidates;
  }

  return candidates; // still tied — shared win
}
```

### Money calculation logic (put this in `scoring.ts`)

```typescript
// Winner takes the losers' buy-ins. Default buy-in is $5.
// With 4 players at $5: winner = +15, losers = -5 each.
// Ties split the winnings evenly.
// No-pool events: return $0 for everyone.
function calculateMoney(event: UFCEvent): Map<string, number> {
  if (!event.hasPool) {
    const result = new Map<string, number>();
    for (const s of event.scores) result.set(s.playerId, 0);
    return result;
  }

  const winners = resolveWinner(event.scores);
  const winnerIds = new Set(winners.map((w) => w.playerId));
  const losers = event.scores.filter((s) => !winnerIds.has(s.playerId));
  const buyIn = event.buyIn || 5;
  const pot = losers.length * buyIn;
  const winnerPayout = pot / winners.length;

  const result = new Map<string, number>();
  for (const s of winners) result.set(s.playerId, winnerPayout);
  for (const s of losers) result.set(s.playerId, -buyIn);
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
- **Event list**: Collapsed by default showing event name, promotion, date, and a compact score summary for each player (Tapology points + computed money). Click to expand into edit mode with input fields for Tapology points per player. Money updates automatically based on who won. Support filtering by year and promotion.
- **Adding an event**: Button at top of event list. Form with event name, promotion selector, date picker, pool toggle, buy-in amount, and a Tapology points input per player. Pre-populate player rows automatically. Only required field is points — money is computed on save.
- **Empty states**: Helpful messages pointing users to the right tab when no players or events exist yet.

### Upcoming Cards (voting tab)

This is where the group decides which cards to bet on before the event happens.

**How it works:**

- You (the admin) add an upcoming card by name, promotion, and date.
- Each card shows a row per player with a simple toggle: ✓ (I'm in) or ✗ (I'm out). Default state is undecided (no vote yet).
- The card displays a clear consensus status:
  - **"LOCKED IN"** — majority or unanimous (e.g. 3-1 or 4-0). Visually distinct (gold border or accent). This means the group is betting on this card.
  - **"NOT ENOUGH"** — 2-2 or worse. Muted/dimmed styling. The group is skipping this one.
  - **"WAITING"** — not everyone has voted yet. Show who still needs to decide.

**Promoting to Events:**

- When a card is "LOCKED IN" and the event date has passed, show a button to promote it to the Events tab. This creates a new event pre-filled with the card name, date, promotion, and only the players who voted ✓ as participants.
- Alternatively, just use this tab as a visual indicator for you to manually add the event — either approach works, but the promote button is cleaner.

**UX details:**

- Upcoming cards sorted by date ascending (nearest event first).
- Past cards that were never promoted should auto-archive or dim out so they don't clutter the view.
- Keep it dead simple — this is a quick yes/no poll, not a discussion thread.

**Design:**

- Same dark aesthetic as the rest of the app.
- ✓ votes get a subtle green tint, ✗ gets a subtle red tint, undecided is neutral/muted.
- The "LOCKED IN" state should feel decisive — maybe a solid left border in gold or a badge.

### Player Profiles

Each player gets a public profile page accessible at `/player/[id]`.

**What to show:**

- Display name and Tapology username
- Medals / badges (see Medals section)
- All-time stats: total earnings, total losses, net profit/loss, event wins, events played, participation rate
- Performance stats (when available): average points per event, highest single-event score, lowest single-event score, most perfect picks all time, accuracy breakdowns
- Event history table: every event they participated in, their score, their money result, and whether they won
- Earnings-over-time chart (Recharts line chart)
- Filters by year and promotion

### Medals and Achievements

Computed badges displayed on player profiles. These are calculated from data, never manually assigned, and update automatically.

**Positive awards:**

- 🥇 Most money won all time
- 🏆 Most event wins
- ⭐ Highest single-event score ever
- 📊 Most total points all time

**Negative / joke awards:**

- 💩 Lowest single-event score ever
- 📉 Most money lost all time

**Rules:**

- Ties for a medal: both players display the badge
- Medals recalculate whenever data changes
- Keep the medal list small and meaningful — can expand later

## Statistics (v2)

### Global / All-Time Stats

Available on a dedicated analytics page and partially surfaced on the leaderboard:

- Total points all time (per player)
- Average points per event
- Most event wins
- Highest / lowest single-event score
- Most perfect picks all time
- Total money won / lost / net
- Participation count and rate
- Performance by promotion
- Performance by year

### Per-Event Stats

Shown on the event detail view:

- Standings with tiebreaker resolution
- Pool size and buy-in info (if applicable)
- Highest / lowest score that event
- Participation count

### Filtering

Stats should support filtering by:

- Year
- Promotion
- Participant

## Screenshot Ingestion (v2)

Admin-only feature to reduce manual data entry.

**Flow:**

1. Admin uploads a screenshot of Tapology results for an event
2. System sends the image to Google Cloud Vision API to extract text, then parses the structured data: event name, participant usernames, points, correct/perfect/semi-perfect/decision picks
3. System maps extracted Tapology usernames to internal player records (using the `tapologyUsername` field on the player)
4. System presents a review screen showing the parsed data with any username mismatches or confidence warnings highlighted
5. Admin confirms or edits the parsed data
6. System checks for duplicate events (matching name + date + promotion) and blocks duplicate inserts
7. On confirm, creates the event and scores in Supabase

**Safeguards:**

- Always show a review step — never auto-insert
- Flag any Tapology username that doesn't match a known player
- Block duplicate event creation
- Admin can cancel at any point

**Environment variable:** `GOOGLE_CLOUD_VISION_API_KEY` (server-side only, do NOT expose to client)

## Discord Integration (v2)

Optional integration for reminders. Requires a Discord bot or webhook.

**Reminder types:**

1. **Event Lock Reminder** — trigger 1 hour before event start. Mention `@tapology` role in the designated channel. Purpose: remind everyone that picks lock soon.

2. **Voting Reminder** — trigger 24 hours before event start. Target only users who have NOT yet voted on the upcoming card. Mention or DM the corresponding Discord user if a `discordId` mapping exists on their player record.

**Requirements:**

- Player records must support optional `discordId` and `discordUsername` fields
- System tracks who has voted to determine reminder targets
- Reminders should not fire multiple times for the same scheduled trigger
- Admin can configure Discord webhook URL / bot settings via an admin page

**Environment variables:** `DISCORD_BOT_TOKEN` and/or `DISCORD_WEBHOOK_URL` (server-side only)

## Authentication (v2)

Use **Supabase Auth** to add user accounts when the group is ready.

**Flow:**

1. Admin creates a player record (already works today)
2. Admin generates an invite link / token for that player
3. Player clicks the link, completes registration (email + password via Supabase Auth)
4. Player's auth account is linked to their existing player record
5. Player can now log in and vote directly (instead of admin toggling votes for everyone)

**Roles:**

- `admin` — can create/edit events, manage players, upload screenshots, access admin pages
- `user` — can vote on upcoming cards, view their own profile dashboard, view all public data

**Public visitors** (not logged in) can still:

- View the leaderboard
- View event history and results
- View player profiles and stats

**Public visitors cannot:**

- Vote
- Edit any data
- Access admin pages

**Important:** Auth is additive. The app should work fully without auth (as it does today). Auth adds ownership to votes and protects admin routes, but the core data model and Supabase tables stay the same. When implementing auth, update RLS policies to restrict write access by role instead of the current "allow all" policies.

## File Structure

```
src/
  components/
    Leaderboard.tsx
    EventList.tsx
    EventCard.tsx
    UpcomingCards.tsx
    PlayerProfile.tsx
    PlayerManager.tsx
    MedalBadge.tsx
    Layout.tsx
  hooks/
    useAppData.ts      # all data loading/saving/mutations — calls into storage.ts
  lib/
    supabase.ts        # Supabase client init (reads env vars)
    storage.ts         # all Supabase queries — single swap point if backend changes
    scoring.ts         # derived stat calculations (totals, rankings, wins, tiebreakers)
    medals.ts          # medal/achievement calculation logic
    types.ts           # TypeScript interfaces
  pages/ (or app/ if using App Router)
    player/[id].tsx    # player profile page
    admin/             # admin-only routes (screenshot ingestion, Discord settings)
  App.tsx
  main.tsx
```

## Key Implementation Notes

- All derived stats (totals, rankings, who won each event, medals) should be computed, not stored. Only store raw scores.
- Generate IDs with `crypto.randomUUID()` or a simple timestamp+random approach.
- **All Supabase queries live in `storage.ts`** — no Supabase imports anywhere else. The `useAppData` hook wraps storage calls and manages React state. If we ever swap backends, only `storage.ts` changes.
- When editing scores for an event, don't save on every keystroke. Use local component state and save on explicit "Save" action.
- Handle edge cases: tied Tapology scores (use tiebreaker chain then split if still tied), all players tie (nobody wins or loses money), player with no scores for an event (skip them in calculations, show dash in UI), events where not all players participated (only participating players are in the pot), no-pool events (track for stats but $0 money impact).
- The detailed pick stats (correct, perfect, semi-perfect, decision) are **optional fields**. The app must work fine with just points — the extra stats enable richer tiebreaking and profile analytics when available.

## Supabase Setup

### Environment Variables

Add these to `.env.local` (and to Vercel environment settings for production):

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# v2 features (add when ready)
# GOOGLE_CLOUD_VISION_API_KEY=your-gcp-vision-key-here
# DISCORD_BOT_TOKEN=your-discord-bot-token
# DISCORD_WEBHOOK_URL=your-discord-webhook-url
```

### Supabase Client (`lib/supabase.ts`)

```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### Database Schema (run this SQL in the Supabase SQL editor)

```sql
-- Players
create table players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tapology_username text,
  discord_id text,
  discord_username text,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz default now()
);

-- Events (supports multiple promotions and variable buy-ins)
create table events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  promotion text not null default 'UFC',
  date date not null,
  has_pool boolean not null default true,
  buy_in integer not null default 5,
  finalized boolean not null default false,
  created_at timestamptz default now()
);

-- Scores (one row per player per event, with optional detailed stats)
create table event_scores (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade not null,
  player_id uuid references players(id) on delete cascade not null,
  points integer not null default 0,
  num_picks integer,
  correct_picks integer,
  perfect_picks integer,
  semi_perfect_picks integer,
  decision_picks integer,
  unique(event_id, player_id)
);

-- Upcoming cards for voting
create table upcoming_cards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  promotion text not null default 'UFC',
  date date not null,
  promoted boolean default false,
  created_at timestamptz default now()
);

-- Votes on upcoming cards
create table upcoming_votes (
  id uuid primary key default gen_random_uuid(),
  card_id uuid references upcoming_cards(id) on delete cascade not null,
  player_id uuid references players(id) on delete cascade not null,
  vote text check (vote in ('in', 'out')) default null,
  unique(card_id, player_id)
);

-- Enable Row Level Security but allow all access (no auth, friend group only)
-- When auth is added later, replace these with role-based policies
alter table players enable row level security;
alter table events enable row level security;
alter table event_scores enable row level security;
alter table upcoming_cards enable row level security;
alter table upcoming_votes enable row level security;

create policy "Allow all" on players for all using (true) with check (true);
create policy "Allow all" on events for all using (true) with check (true);
create policy "Allow all" on event_scores for all using (true) with check (true);
create policy "Allow all" on upcoming_cards for all using (true) with check (true);
create policy "Allow all" on upcoming_votes for all using (true) with check (true);
```

**Migration note:** If you already have the original schema running, add the new columns with ALTER statements instead of recreating tables:

```sql
-- Add new columns to existing tables
alter table players add column if not exists tapology_username text;
alter table players add column if not exists discord_id text;
alter table players add column if not exists discord_username text;
alter table players add column if not exists role text not null default 'user' check (role in ('admin', 'user'));

alter table events add column if not exists promotion text not null default 'UFC';
alter table events add column if not exists has_pool boolean not null default true;
alter table events add column if not exists buy_in integer not null default 5;
alter table events add column if not exists finalized boolean not null default false;

alter table event_scores add column if not exists num_picks integer;
alter table event_scores add column if not exists correct_picks integer;
alter table event_scores add column if not exists perfect_picks integer;
alter table event_scores add column if not exists semi_perfect_picks integer;
alter table event_scores add column if not exists decision_picks integer;

alter table upcoming_cards add column if not exists promotion text not null default 'UFC';
```

### Storage Module (`lib/storage.ts`)

This module is the **only file that imports Supabase**. It should expose functions like:

```typescript
// Players
getPlayers(): Promise<Player[]>
addPlayer(name: string, opts?: { tapologyUsername?: string; discordId?: string; role?: string }): Promise<Player>
updatePlayer(id: string, updates: Partial<Player>): Promise<void>
removePlayer(id: string): Promise<void>

// Events
getEvents(filters?: { year?: number; promotion?: string }): Promise<UFCEvent[]>
addEvent(event: { name: string; promotion: string; date: string; hasPool: boolean; buyIn: number }, scores: EventScore[]): Promise<UFCEvent>
updateEventScores(eventId: string, scores: EventScore[]): Promise<void>
finalizeEvent(eventId: string): Promise<void>
deleteEvent(id: string): Promise<void>

// Upcoming Cards
getUpcomingCards(): Promise<UpcomingCard[]>
addUpcomingCard(name: string, promotion: string, date: string): Promise<UpcomingCard>
setVote(cardId: string, playerId: string, vote: 'in' | 'out' | null): Promise<void>
promoteCard(cardId: string): Promise<UFCEvent>
deleteUpcomingCard(id: string): Promise<void>
```

### Important Supabase Notes

- **No auth (for now)**: This is a friend group tool. RLS policies allow all access via the anon key. When auth is added, update policies to restrict writes by role.
- **Scores are relational**: `event_scores` is a join table. When fetching events, join scores in the same query rather than making N+1 requests.
- **Votes are relational**: Same pattern — `upcoming_votes` is a join table on `upcoming_cards`.
- **Money is still computed client-side** from scores. Never store money in the database.
- **When promoting a card**: create the event + scores in a single operation, then set `promoted = true` on the card. Only include players who voted 'in'.
- **Deleting a player**: cascade deletes handle cleaning up their scores and votes automatically (set up in the foreign keys above).

## What NOT to Build (Keep It Simple)

- **No "Reset All Data" button** — data lives in a shared database now. A reset wipes everyone's data with no undo. Remove any existing reset functionality from the Manage tab. Players can still be individually removed.
- No automated scraping from Tapology — this is explicitly not allowed
- No real-money payment processing
- No native mobile apps
- No complex season system — stats are rolling all-time with year filters

## Implementation Priority

Build in this order:

1. **Core (already done)**: Leaderboard, event list, player management, Supabase persistence, upcoming cards voting
2. **Extended event model**: Add promotion field, pool toggle, variable buy-in, finalized flag. Run ALTER migration on existing Supabase tables.
3. **Detailed pick stats**: Add optional fields to event scores (correct, perfect, semi-perfect, decision picks). Update tiebreaker logic.
4. **Player profiles**: Public profile pages with stats, event history, earnings chart, and medals
5. **Event filtering**: Year and promotion filters on event list and stats
6. **Screenshot ingestion (v2)**: Admin-only upload → OCR → review → save flow
7. **Auth (v2)**: Supabase Auth, invite flow, role-based access, self-service voting
8. **Discord integration (v2)**: Lock reminder and voting reminder webhooks
9. **Analytics page (v2)**: Global stats with filters

## Commands

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run lint` — lint check

## Testing Notes

When verifying the build works:

1. Add 4 players — confirm they appear in Supabase `players` table
2. Add an event and enter Tapology points — confirm money auto-calculates (winner = +$15, losers = -$5 each)
3. Add a second event with a different winner — confirm leaderboard reranks by total money
4. Test a tie with only points: give two players the same highest points — confirm they split the pot
5. Test tiebreaker: give two players the same points but different perfect picks — confirm the player with more perfect picks wins
6. Confirm Tapology points appear on event cards but NOT on the leaderboard
7. Edit an event's points and confirm money and leaderboard recalculate
8. Delete a player and confirm their scores are cleaned up from all events (cascade delete)
9. **Open the site in a different browser or incognito** — confirm all data is visible (proves Supabase is working, not localStorage)
10. Add an upcoming card — confirm all players show as undecided
11. Vote 3 players "in" and 1 "out" — confirm status shows "LOCKED IN"
12. Vote 2 "in" and 2 "out" — confirm status shows "NOT ENOUGH"
13. Promote a locked-in card to Events — confirm it creates an event with only the "in" players
14. Test a no-pool event — confirm it tracks scores but shows $0 money impact
15. Filter events by promotion — confirm only matching events appear
16. View a player profile — confirm stats, event history, and medals display correctly

## Confirmed Decisions

These have been decided and should be followed during implementation:

1. **Voting changes**: Users CAN change their vote up until the voting deadline (event start time). Allow toggling between in/out freely.
2. **Discord voting reminders**: Use a channel mention (not DMs). Mention the specific users who haven't voted in the channel.
3. **Unresolved ties**: List ALL tied players as co-winners (1st place). Display both/all names as winners on the event card and leaderboard. Split the pot evenly.
4. **Admin roles**: Support multiple admins. The `role` field on the player record can be set to `'admin'` for any player.
5. **No-pool events and stats**: No-pool events count toward all stats and medals EXCEPT money totals. They affect win counts, point records, participation, etc. — just not earnings.
6. **Discord mapping**: Users CAN edit their own Discord mapping (discordId / discordUsername) from their profile. Admin can also edit it for any player.
