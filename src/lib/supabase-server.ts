import { createClient } from "@supabase/supabase-js";

/**
 * Service-role admin client — server-side ONLY.
 * Bypasses RLS and can call auth.admin.*
 * Never import this from client components or any file that gets bundled
 * for the browser. Use it only from Server Actions and Route Handlers.
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
