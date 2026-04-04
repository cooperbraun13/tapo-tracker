"use server";

import { supabaseAdmin } from "@/lib/supabase-server";
import { updatePlayerAuthId } from "@/lib/storage";

/**
 * Invite a player to create a Supabase Auth account.
 * Sends an invite email and links the resulting auth user id to the player record.
 *
 * Server Action — never called from the browser directly.
 */
export async function invitePlayer(
  playerId: string,
  email: string
): Promise<{ error: string | null }> {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    email,
    {
      redirectTo: `${appUrl}/auth/callback?next=/admin`,
    }
  );

  if (error) {
    return { error: error.message };
  }

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
