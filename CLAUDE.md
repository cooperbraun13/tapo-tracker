# CLAUDE.md - UFC Tapology Picks Tracker

## Project Overview

A web app for a small group of friends to track UFC Tapology pick'em results and money wagered across events. Replaces a spreadsheet. The app is designed to grow — supporting more participants, multiple promotions, richer stats, and optional integrations like Discord reminders and screenshot-based result ingestion over time.

## Core Requirements

**Make sure to always ask clarifying questions!!**

### What the app tracks

- **Players**: Currently 4 friends, but the system should support a variable number of participants. Not every player participates in every event.
- **Events**: UFC cards and potentially other promotions (e.g. Bellator, PFL, ONE, Other). Each event has a promotion field.
- **Per player per event**: Tapology points scored (entered manually or via screenshot ingestion). Additionally track: correct picks, perfect picks, semi-perfect picks, decision picks, and number of picks — when available.
- **Money is auto-calculated, not entered**: Everyone puts in $5 by default. The player with the highest Tapology score wins the pot. So the winner gets +$5×(number of other players) and everyone else gets -$5. For example with 4 players: winner = +$15, losers = -$5 each.
- **Variable buy-in**: Support events with different buy-in amounts. Some events may have no pool at all. When an event has no pool, it's still tracked for stats but doesn't affect money totals.
- **Ties**: If two or more players tie for the highest Tapology score, apply the tiebreaker chain: most points → most perfect picks → most correct picks → most semi-perfect picks → most decision picks. If still tied after all criteria, split the pot evenly and mark the event as a shared win.
- **Derived stats**: Total money (primary ranking metric), event wins, number of events participated in, and all the extended stats listed in the Statistics section below. Tapology points are tracked per-event for context but are NOT shown on the leaderboard.

### Main views

1. **Leaderboard** — Overall standings ranked by total money. Show rank, name, achievement medals, total money (+/- colored), event wins, and events played. The leader should feel visually distinct. Player names link to their profile page.
2. **Event History** — Chronological list of events with each player's scores. Click an event to expand and see or edit scores. Most recent events on top. Filterable by year and promotion.
3. **Upcoming** — A list of future cards where players vote on whether they want to bet. Votes lock once the event date passes.
4. **Player Profiles** — Per-player stats page at `/player/[id]`. Shows earnings, event history table, earnings-over-time chart (Recharts), medals, and filters. Authenticated users see Account Settings (change name, change password) on their own profile.
5. **Admin** — Player management (invite new players, link existing players to auth accounts, toggle admin role). Protected by Supabase Auth — only admins can access.
6. **Analytics (v2)** — Global stats page with filters by year, promotion, and participant.

### Data management

- A "Manage" section to add/remove players (public, no auth required)
- Adding an event: name the card, set a date, promotion, pool toggle, buy-in amount, and each player's Tapology points. Money is calculated automatically.
- Editing: expand any event card to edit scores and metadata (promotion, pool, buy-in). Money recalculates automatically.
- Deleting: remove an event entirely with two-click confirmation.
- Screenshot ingestion (v2): admin uploads a Tapology results screenshot, system extracts data via OCR, admin reviews and confirms before saving.

## Tech Stack

- **Next.js 16 + React + TypeScript** (App Router, deployed on Vercel)
- **Tailwind CSS v4** for styling
- **Supabase** for persistence and auth (free tier). All friends share the same data.
- **`@supabase/supabase-js`** — browser client
- **`@supabase/ssr`** — server-side auth helpers (used in proxy.ts, auth callback, server actions)
- **Framer Motion** for animations
- **Recharts** for earnings-over-time chart on player profiles
- **Google Cloud Vision API** for screenshot ingestion OCR (v2)
- **Always use context7 for up to date documentation/library lookup**

## Data Model

```typescript
interface Player {
  id: string;
  name: string;
  tapologyUsername?: string; // maps to their Tapology account
  discordId?: string;        // for Discord reminder integration
  discordUsername?: string;
  role: "admin" | "user";
  authUserId?: string;       // Supabase Auth user id — set when the player accepts an invite
}

interface EventScore {
  playerId: string;
  points: number; // Tapology points (manually entered or via ingestion)
  numPicks?: number;
  correctPicks?: number;
  perfectPicks?: number;
  semiPerfectPicks?: number;
  decisionPicks?: number;
  // money is NOT stored — it's computed from who won
}

interface UFCEvent {
  id: string;
  name: string;       // e.g. "UFC 315"
  promotion: string;  // e.g. "UFC", "Bellator", "PFL", "ONE", "Other"
  date: string;       // ISO date string
  hasPool: boolean;   // whether money is on the line
  buyIn: number;      // default 5, can vary per event
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

### Tiebreaker logic (`scoring.ts`)

```typescript
// Tiebreaker chain for determining event winner:
// 1. Most points → 2. Most perfect picks → 3. Most correct picks →
// 4. Most semi-perfect picks → 5. Most decision picks
// If still tied: shared win — split the pot evenly.
```

### Money calculation logic (`scoring.ts`)

```typescript
// Winner takes the losers' buy-ins. Default buy-in is $5.
// With 4 players at $5: winner = +15, losers = -5 each.
// Ties split the winnings evenly.
// No-pool events: return $0 for everyone.
```

### Medal logic (`medals.ts`)

Medals are computed, never stored. Ties mean both players get the medal.

- 🥇 Most money won all time (pool events only)
- 🏆 Most event wins (all events, including no-pool)
- ⭐ Highest single-event score (all events)
- 📊 Most total points (all events)
- 💩 Lowest single-event score (all events)
- 📉 Most money lost all time (pool events only)

Medal tooltips show on hover with a description. Medals on the leaderboard are clickable and navigate to the relevant tab/event.

## Design Direction

### Philosophy

Dark, minimalist, and sharp. Think sports broadcast scoreboard meets Bloomberg terminal — not a SaaS landing page. Every element earns its space. No rounded-everything softness, no gradient blobs, no decorative filler. Clean lines, tight spacing, high contrast.

### Theme & Color

- **Background**: Near-black (`#09090b`) with a slightly lighter surface tone for cards (`#111116`).
- **Accent**: Gold (`#d4a843`) used sparingly — #1 rank, current leader, key interactive elements.
- **Money**: Green for positive, red for negative. Desaturated tones.
- **Text**: Off-white primary (`#e8e6e1`), muted gray for secondary labels.
- **Borders**: Subtle, 1px, low-opacity.

### Typography

- **Headings / ranks / numbers**: Oswald (bold condensed, all-caps, wide letter-spacing)
- **Body / inputs / secondary**: Barlow
- No more than two font families.

### Layout & Responsiveness

- Web-first, max-width ~880px centered. Mobile-viable but not mobile-first.
- Information-dense. No hero sections, no excessive padding.

### Animation & Motion

- Framer Motion for tab transitions, leaderboard layout animations, staggered list entry
- `AnimatedNumber` component for counting money values (400ms ease-out)
- Hover states: 150ms transitions, subtle bg lighten
- Stagger tight: 30–50ms per item

## UX Details

- **Leaderboard**: Sorted by total money. Player names are clickable links to `/player/[id]`. Medals appear inline next to names with hover tooltips. Medal clicks navigate to the relevant tab.
- **Event cards**: Collapsed shows name + promotion badge (if not UFC) + no-pool badge + date. Expanded shows per-player scores with winner highlighted in gold. Edit mode exposes promotion selector, pool toggle, buy-in input, and points fields. Two-click delete confirmation.
- **Event filters**: Year and promotion dropdowns appear only when >1 distinct value exists. Filters work together. "Clear" resets both.
- **Upcoming Cards**: Votes lock once the event date passes ("Votes locked" label shown). Promote button appears for LOCKED IN past cards only. Past un-promoted cards dim to 40% opacity.
- **Player profiles**: Public, no auth required. Shows stats grid, earnings chart (only when >1 event), event history table. Account Settings section visible only to the authenticated owner of that profile.
- **Admin page**: Auth-protected. Shows player list with role, auth-link status, role toggle, and invite button for unlinked players. Two invite flows: invite an existing player to claim their record, or create a new player + invite in one step.

### Upcoming Cards (voting tab)

- Cards sorted: active upcoming first (ascending date), then past/promoted at bottom
- Status: **LOCKED IN** (majority voted in, all voted), **NOT ENOUGH** (majority voted out, all voted), **WAITING** (not everyone has voted)
- Votes toggle: null → in → out → null. Locked after event date passes.
- "Waiting on: [names]" shown when status is WAITING and votes are unlocked

### Player Profiles (`/player/[id]`)

Stats shown: Net Money, Total Earned, Total Lost, Event Wins, Events Played, Participation %, Avg Points, Best Score, Worst Score, Perfect Picks (if available), Correct Picks (if available), Pick Accuracy (if available).

Earnings-over-time chart: cumulative line chart in gold. Tooltip shows event name, delta (+/- won/lost), and running total. Chart only shown when player has >1 event.

Event history table: event name, promotion badge (if not UFC), date, score, money result, win indicator.

Account Settings (own profile only): change display name (calls `updateOwnName` server action), change password (calls `supabase.auth.updateUser`).

## Authentication

Auth is **implemented**. Supabase Auth with invite-based registration and role-based admin protection.

### How it works

- Admin creates a player record (works without auth — public)
- Admin goes to `/admin` and uses "Invite" to link an existing player record to an email, or "Invite New" to create a player + auth account in one step
- User clicks the invite email link → redirected to `/auth/callback?code=...` → session created → redirected to `/`
- Player can now log in via `/login` (email + password)
- On their own profile page (`/player/[id]`), logged-in users see Account Settings to change name/password

### Route protection

`proxy.ts` (Next.js 16's middleware file) handles:
- `/admin/*` — requires authenticated admin. Non-admins redirected to `/`. Unauthenticated redirected to `/login?redirectTo=/admin`.
- `/login` — if already authenticated, redirects to `/admin`.

### Roles

- `admin` — can access `/admin`, invite players, toggle roles
- `user` — can log in, edit own profile settings. Votes are currently public (not auth-gated yet)

### Public visitors (unauthenticated)

Can view: leaderboard, event history, player profiles. Cannot: access admin, edit their own account settings.

### Server-side auth pattern

- `src/lib/supabase.ts` — browser client using `createBrowserClient` from `@supabase/ssr`
- `src/lib/supabase-server.ts` — service-role admin client (server-only). Used in Server Actions and Route Handlers. Bypasses RLS. **Never import from client components.**
- `src/app/admin/actions.ts` — Server Actions: `invitePlayer`, `inviteNewPlayer`, `setPlayerRole`, `updateOwnName`
- `src/app/auth/callback/route.ts` — exchanges auth code for session, sets cookies

### Bootstrap

`/api/bootstrap` is a one-time POST endpoint used to create the first admin account. It's disabled in production unless `BOOTSTRAP_ENABLED=true`. Delete or disable after initial setup.

## File Structure

```
src/
  app/
    page.tsx                  # main app (tabs: Leaderboard, Events, Upcoming, Manage)
    layout.tsx                # HTML wrapper, metadata
    globals.css               # design tokens, font imports
    login/page.tsx            # email+password login
    admin/
      page.tsx                # player management (invite, role toggle) — admin only
      actions.ts              # server actions: invitePlayer, inviteNewPlayer, setPlayerRole, updateOwnName
    api/bootstrap/route.ts    # one-time admin bootstrap endpoint
    auth/callback/route.ts    # Supabase auth code exchange
    player/[id]/page.tsx      # public player profile page
  components/
    Layout.tsx                # tab nav with animated underline, tab transitions
    Leaderboard.tsx           # rankings, animated numbers, medals, player links
    EventList.tsx             # event list with filters, new event form
    EventCard.tsx             # collapsible event card with edit mode
    UpcomingCards.tsx         # voting tab with vote locking
    PlayerManager.tsx         # add/remove players
    MedalBadge.tsx            # medal emoji with tooltip and click navigation
    AnimatedNumber.tsx        # requestAnimationFrame number counting
  hooks/
    useAppData.ts             # all data loading/saving/mutations — wraps storage.ts
  lib/
    supabase.ts               # browser Supabase client (createBrowserClient from @supabase/ssr)
    supabase-server.ts        # service-role admin client — server-side ONLY
    storage.ts                # all Supabase queries — ONLY file that imports supabase
    scoring.ts                # resolveWinner, calculateMoney, computeLeaderboard
    medals.ts                 # computeMedals — derives medal map from AppData
    types.ts                  # TypeScript interfaces
  proxy.ts                    # Next.js 16 middleware: admin protection, login redirect
```

## Key Implementation Notes

- All derived stats (totals, rankings, who won each event, medals) are **computed, not stored**. Only store raw scores.
- **All Supabase queries live in `storage.ts`** — no Supabase imports anywhere else except `supabase.ts`, `supabase-server.ts`, and the auth callback/actions which require server-side session handling.
- `supabase-server.ts` is **server-only**. Never import it from client components.
- When editing scores, use local component state and save on explicit "Save" action — don't save on every keystroke.
- Points inputs use `type="text"` with `inputMode="numeric"` and digit-only regex. Avoids browser spin buttons.
- Medals are computed from `AppData` client-side. No medal data stored in DB.
- The `proxy.ts` file is Next.js 16's replacement for `middleware.ts`. Do not create a `middleware.ts` — it will conflict.

## Supabase Setup

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# v2 features
# GOOGLE_CLOUD_VISION_API_KEY=your-gcp-vision-key-here
# DISCORD_BOT_TOKEN=your-discord-bot-token
# DISCORD_WEBHOOK_URL=your-discord-webhook-url
```

### Database Schema

```sql
-- Players
create table players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tapology_username text,
  discord_id text,
  discord_username text,
  role text not null default 'user' check (role in ('admin', 'user')),
  auth_user_id uuid unique,  -- links to Supabase Auth user
  created_at timestamptz default now()
);

-- Events
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

-- Scores
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

-- Upcoming cards
create table upcoming_cards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  promotion text not null default 'UFC',
  date date not null,
  promoted boolean default false,
  created_at timestamptz default now()
);

-- Votes
create table upcoming_votes (
  id uuid primary key default gen_random_uuid(),
  card_id uuid references upcoming_cards(id) on delete cascade not null,
  player_id uuid references players(id) on delete cascade not null,
  vote text check (vote in ('in', 'out')) default null,
  unique(card_id, player_id)
);

-- RLS: allow all (no per-user restrictions yet — auth only gates admin routes)
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

**Migration — add auth_user_id to existing players table:**
```sql
alter table players add column if not exists auth_user_id uuid unique;
```

### Supabase Auth setup

1. Enable "Email" provider in Supabase Auth settings
2. Set Site URL and Redirect URLs in Auth settings:
   - Site URL: `https://your-app.vercel.app`
   - Redirect URL: `https://your-app.vercel.app/auth/callback`
3. Set `NEXT_PUBLIC_APP_URL` env var to match

## What NOT to Build (Keep It Simple)

- **No "Reset All Data" button** — data lives in shared DB. Players can be individually removed.
- No automated scraping from Tapology (not allowed)
- No real-money payment processing
- No native mobile apps
- No complex season system — stats are rolling all-time with year filters

## Implementation Priority

1. ✅ **Core**: Leaderboard, event list, player management, Supabase persistence, upcoming cards voting
2. ✅ **Extended event model**: Promotion, pool toggle, variable buy-in, finalized flag
3. ✅ **Detailed pick stats**: Optional fields on event scores, tiebreaker logic
4. ✅ **Player profiles**: Public pages with stats, event history, earnings chart, medals
5. ✅ **Event filtering**: Year and promotion filters on event list and profile pages
6. ✅ **Medals**: Computed achievement badges on leaderboard and profiles with tooltips
7. ✅ **Auth**: Supabase Auth, invite flow, admin page, proxy protection, account settings
8. **Screenshot ingestion (v2)**: Admin upload → OCR → review → save
9. **Discord integration (v2)**: Lock reminder and voting reminder webhooks
10. **Analytics page (v2)**: Global stats with filters
11. **Self-service voting (v2)**: Auth-gated votes — players can only toggle their own vote

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
9. **Open the site in a different browser or incognito** — confirm all data is visible (proves Supabase is working)
10. Add an upcoming card — confirm all players show as undecided
11. Vote 3 players "in" and 1 "out" — confirm status shows "LOCKED IN"
12. Vote 2 "in" and 2 "out" — confirm status shows "NOT ENOUGH"
13. Promote a locked-in card to Events — confirm it creates an event with only the "in" players
14. Test a no-pool event — confirm it tracks scores but shows $0 money impact
15. Filter events by promotion — confirm only matching events appear
16. View a player profile — confirm stats, event history, and medals display correctly
17. Hover a medal on the leaderboard — confirm tooltip appears with label and description
18. Navigate to `/admin` without being logged in — confirm redirect to `/login`
19. Log in as admin — confirm redirect to `/admin`
20. Invite a player from admin page — confirm invite email sent and player shows "Linked" after accepting
21. Log in as invited player, visit own profile — confirm Account Settings section visible
22. Visit another player's profile while logged in — confirm Account Settings NOT shown

## Confirmed Decisions

1. **Voting changes**: Users CAN change their vote up until the event date. Votes lock once the date passes.
2. **Discord voting reminders**: Use a channel mention (not DMs). Mention the specific users who haven't voted.
3. **Unresolved ties**: All tied players are co-winners. Split pot evenly. Both shown as winners on event card.
4. **Admin roles**: Multiple admins supported. `role` field on player record set to `'admin'`.
5. **No-pool events and stats**: Count toward all stats and medals EXCEPT money totals.
6. **Discord mapping**: Users can edit their own Discord mapping from their profile. Admin can edit for any player.
7. **Auth is additive**: Core app works fully without auth. Auth adds protection for admin routes and self-service account settings.
