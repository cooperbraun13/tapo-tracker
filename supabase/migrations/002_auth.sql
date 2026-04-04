-- ============================================================
-- Migration 002: Auth — add auth_user_id column + update RLS
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor).
-- ============================================================

-- 1. Link players to Supabase Auth users
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS players_auth_user_id_idx ON players(auth_user_id);

-- ============================================================
-- 2. Helper function: returns true if the current auth user
--    has an admin player record.
-- ============================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM players
    WHERE auth_user_id = auth.uid()
      AND role = 'admin'
  );
$$;

-- ============================================================
-- 3. Update RLS policies
--    SELECT stays public (allow all) on every table.
--    INSERT/UPDATE/DELETE require an authenticated admin,
--    EXCEPT upcoming_votes where players can manage their own row.
-- ============================================================

-- ── events ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow all" ON events;

CREATE POLICY "Public read" ON events
  FOR SELECT USING (true);

CREATE POLICY "Admin write" ON events
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admin update" ON events
  FOR UPDATE USING (is_admin());

CREATE POLICY "Admin delete" ON events
  FOR DELETE USING (is_admin());

-- ── event_scores ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow all" ON event_scores;

CREATE POLICY "Public read" ON event_scores
  FOR SELECT USING (true);

CREATE POLICY "Admin write" ON event_scores
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admin update" ON event_scores
  FOR UPDATE USING (is_admin());

CREATE POLICY "Admin delete" ON event_scores
  FOR DELETE USING (is_admin());

-- ── upcoming_cards ───────────────────────────────────────────
DROP POLICY IF EXISTS "Allow all" ON upcoming_cards;

CREATE POLICY "Public read" ON upcoming_cards
  FOR SELECT USING (true);

CREATE POLICY "Admin write" ON upcoming_cards
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admin update" ON upcoming_cards
  FOR UPDATE USING (is_admin());

CREATE POLICY "Admin delete" ON upcoming_cards
  FOR DELETE USING (is_admin());

-- ── upcoming_votes ───────────────────────────────────────────
-- Players can upsert their own vote; admins can manage all votes.
DROP POLICY IF EXISTS "Allow all" ON upcoming_votes;

CREATE POLICY "Public read" ON upcoming_votes
  FOR SELECT USING (true);

CREATE POLICY "Own vote write" ON upcoming_votes
  FOR INSERT WITH CHECK (
    player_id = (
      SELECT id FROM players WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Own vote update" ON upcoming_votes
  FOR UPDATE USING (
    player_id = (
      SELECT id FROM players WHERE auth_user_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "Admin delete vote" ON upcoming_votes
  FOR DELETE USING (is_admin());

-- ── players ──────────────────────────────────────────────────
-- Keep the existing "Allow all" policy for now — auth user id
-- is written by the invite Server Action using the service role
-- client, which bypasses RLS entirely.
-- (No change needed to the players table policies.)
