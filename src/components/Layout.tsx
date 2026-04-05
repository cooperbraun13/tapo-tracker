"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

const TABS = [
  { label: "Leaderboard", path: "/" },
  { label: "Events", path: "/events" },
  { label: "Upcoming", path: "/upcoming" },
  { label: "Manage", path: "/manage" },
] as const;

export type TabPath = (typeof TABS)[number]["path"];

interface AuthState {
  isAdmin: boolean;
}

export default function Layout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);

  useEffect(() => {
    async function loadAuth(userId: string | undefined) {
      if (!userId) {
        setAuth(null);
        setAuthLoaded(true);
        return;
      }
      const { data } = await supabase
        .from("players")
        .select("role")
        .eq("auth_user_id", userId)
        .maybeSingle();
      setAuth({ isAdmin: data?.role === "admin" });
      setAuthLoaded(true);
    }

    supabase.auth.getUser().then(({ data: { user } }) => loadAuth(user?.id));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      loadAuth(session?.user?.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.refresh();
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-border">
        <div className="max-w-[880px] mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <h1 className="font-heading text-xl font-bold tracking-widest uppercase text-gold shrink-0">
            Tapo Tracker
          </h1>

          <div className="flex items-center gap-1 sm:gap-3 flex-wrap justify-end">
            {/* Tab nav */}
            <nav className="flex gap-1">
              {TABS.map((tab) => (
                <Link
                  key={tab.path}
                  href={tab.path}
                  className={`relative px-3 sm:px-4 py-1.5 font-heading text-sm font-semibold uppercase tracking-wider transition-colors duration-150 ${
                    pathname === tab.path
                      ? "text-gold"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  {tab.label}
                  {pathname === tab.path && (
                    <motion.div
                      layoutId="tab-underline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold"
                      transition={{ duration: 0.2 }}
                    />
                  )}
                </Link>
              ))}
            </nav>

            {/* Auth buttons */}
            {authLoaded && (
              <div className="flex items-center gap-3 pl-1 border-l border-border">
                {auth ? (
                  <>
                    {auth.isAdmin && (
                      <Link
                        href="/admin"
                        className="text-text-muted font-heading text-xs uppercase tracking-wider hover:text-gold transition-colors duration-150"
                      >
                        Admin
                      </Link>
                    )}
                    <button
                      onClick={handleSignOut}
                      className="text-text-muted font-heading text-xs uppercase tracking-wider hover:text-text transition-colors duration-150"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    className="text-text-muted font-heading text-xs uppercase tracking-wider hover:text-text transition-colors duration-150"
                  >
                    Login
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[880px] w-full mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
