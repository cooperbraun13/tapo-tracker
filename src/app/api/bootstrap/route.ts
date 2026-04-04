import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

/**
 * One-time admin bootstrap endpoint.
 *
 * POST /api/bootstrap
 * Body: { email: string; password: string }
 *
 * - Creates a Supabase Auth user with the supplied credentials
 * - Links it to the "Dyl" player record and marks Dyl as admin
 * - Also promotes "Coop" to admin (no auth account needed yet)
 * - Returns 409 if Dyl is already linked (idempotent guard)
 *
 * Delete or disable this file once the initial admin account is created.
 */

const DYL_ID = "7408b11b-5450-4bd9-8854-24f3d6dfed29";
const COOP_ID = "dba9a573-8222-4c9e-97a8-bc8362ccc381";

export async function POST(request: Request) {
  // Only allow in non-production or when the BOOTSTRAP_ENABLED flag is set
  if (
    process.env.NODE_ENV === "production" &&
    process.env.BOOTSTRAP_ENABLED !== "true"
  ) {
    return NextResponse.json({ error: "Disabled in production" }, { status: 403 });
  }

  const { email, password } = await request.json().catch(() => ({}));
  if (!email || !password) {
    return NextResponse.json(
      { error: "email and password are required" },
      { status: 400 }
    );
  }

  // Guard: skip if already bootstrapped
  const { data: dyl } = await supabaseAdmin
    .from("players")
    .select("auth_user_id")
    .eq("id", DYL_ID)
    .single();

  if (dyl?.auth_user_id) {
    return NextResponse.json({ message: "Already bootstrapped" }, { status: 409 });
  }

  // Create the auth user with email_confirm: true so they can log in immediately
  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  // Link auth user → Dyl player, promote to admin
  const { error: dylError } = await supabaseAdmin
    .from("players")
    .update({ auth_user_id: authData.user.id, role: "admin" })
    .eq("id", DYL_ID);

  if (dylError) {
    return NextResponse.json({ error: dylError.message }, { status: 500 });
  }

  // Promote Coop to admin (no auth account yet — will be invited later)
  await supabaseAdmin
    .from("players")
    .update({ role: "admin" })
    .eq("id", COOP_ID);

  return NextResponse.json({
    success: true,
    authUserId: authData.user.id,
    message: "Dyl linked and promoted to admin. Coop promoted to admin.",
  });
}
