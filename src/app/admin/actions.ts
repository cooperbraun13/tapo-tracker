"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";
import { updatePlayerAuthId } from "@/lib/storage";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// ─── Auth helper ──────────────────────────────────────────────────────────────

/** Returns the Supabase auth user ID of the current request's caller. */
async function getCallerId(): Promise<string | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) =>
          list.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          ),
      },
    }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** Returns true if the caller is an authenticated admin. */
async function callerIsAdmin(): Promise<boolean> {
  const callerId = await getCallerId();
  if (!callerId) return false;
  const { data } = await supabaseAdmin
    .from("players")
    .select("role")
    .eq("auth_user_id", callerId)
    .maybeSingle();
  return data?.role === "admin";
}

// ─── Invite existing player (claim flow) ─────────────────────────────────────

/**
 * Send an invite email to an existing player so they can link their account.
 * The resulting auth user id is stored on the player record immediately.
 */
export async function invitePlayer(
  playerId: string,
  email: string
): Promise<{ error: string | null }> {
  if (!(await callerIsAdmin())) return { error: "Unauthorized" };

  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    email,
    { redirectTo: `${APP_URL}/auth/callback?next=/` }
  );

  if (error) return { error: error.message };

  if (data.user) {
    try {
      await updatePlayerAuthId(playerId, data.user.id);
    } catch (e) {
      return {
        error: `Invite sent but failed to link player: ${(e as Error).message}`,
      };
    }
  }

  return { error: null };
}

// ─── Invite new player (create flow) ─────────────────────────────────────────

/**
 * Create a brand-new player record AND send them an invite email.
 * Used when inviting someone who doesn't yet have a player record.
 */
export async function inviteNewPlayer(
  name: string,
  email: string,
  role: "admin" | "user"
): Promise<{ error: string | null }> {
  if (!(await callerIsAdmin())) return { error: "Unauthorized" };

  // Send the invite — creates an auth user immediately
  const { data, error: inviteError } =
    await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${APP_URL}/auth/callback?next=/`,
    });

  if (inviteError) return { error: inviteError.message };

  // Create the player record linked to the new auth user
  const { error: insertError } = await supabaseAdmin.from("players").insert({
    name: name.trim(),
    role,
    auth_user_id: data.user?.id ?? null,
  });

  if (insertError) return { error: insertError.message };

  return { error: null };
}

// ─── Role management ──────────────────────────────────────────────────────────

/** Toggle a player's role between admin and user. Admin-only. */
export async function setPlayerRole(
  playerId: string,
  role: "admin" | "user"
): Promise<{ error: string | null }> {
  if (!(await callerIsAdmin())) return { error: "Unauthorized" };

  const { error } = await supabaseAdmin
    .from("players")
    .update({ role })
    .eq("id", playerId);

  return { error: error?.message ?? null };
}

// ─── Self-service name update ─────────────────────────────────────────────────

/**
 * Let an authenticated user update their own display name.
 * Verifies that the caller owns the target player record.
 */
export async function updateOwnName(
  playerId: string,
  name: string
): Promise<{ error: string | null }> {
  const callerId = await getCallerId();
  if (!callerId) return { error: "Not authenticated" };

  // Verify ownership
  const { data: player } = await supabaseAdmin
    .from("players")
    .select("auth_user_id")
    .eq("id", playerId)
    .maybeSingle();

  if (!player || player.auth_user_id !== callerId) {
    return { error: "Unauthorized" };
  }

  const trimmed = name.trim();
  if (!trimmed) return { error: "Name cannot be empty" };

  const { error } = await supabaseAdmin
    .from("players")
    .update({ name: trimmed })
    .eq("id", playerId);

  return { error: error?.message ?? null };
}
