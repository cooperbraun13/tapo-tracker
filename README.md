# Tapo Tracker

A web app for tracking UFC Tapology pick'em results and money wagered across events. Built for a small friend group to replace a spreadsheet.

## How It Works

Everyone puts in $5 per event. The player with the highest Tapology score wins the pot. Ties split the winnings evenly. Money is auto-calculated from scores — you just enter the points.

## Features

- **Leaderboard** — Rankings by total money with medals, gold highlight for #1, and animated rank changes
- **Events** — Add UFC cards, enter Tapology points per player, and money calculates automatically. Expand any event to view details or edit scores.
- **Upcoming Cards** — Vote on which future cards the group will bet on. Cards show consensus status (Locked In / Not Enough / Waiting). Locked-in cards can be promoted to Events after the date passes.
- **Manage** — Add/remove players and reset all data

## Tech Stack

- Next.js + React + TypeScript
- Tailwind CSS
- Framer Motion (animations)
- localStorage for persistence

## Running Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Other Commands

```bash
npm run build    # production build
npm run lint     # lint check
```

## Deploying

Deploy to [Vercel](https://vercel.com) — just connect the repo and it works out of the box.

Note: Data is stored in localStorage (per-browser, per-device). There is no shared backend.
