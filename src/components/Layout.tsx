"use client";

import { useState, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

const TABS = ["Leaderboard", "Events", "Upcoming", "Manage"] as const;
type Tab = (typeof TABS)[number];

interface LayoutProps {
  children: (activeTab: Tab) => ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [activeTab, setActiveTab] = useState<Tab>("Leaderboard");

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-border">
        <div className="max-w-[880px] mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="font-heading text-xl font-bold tracking-widest uppercase text-gold">
            Tapo Tracker
          </h1>
          <nav className="flex gap-1">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative px-4 py-1.5 font-heading text-sm font-semibold uppercase tracking-wider transition-colors duration-150 ${
                  activeTab === tab
                    ? "text-gold"
                    : "text-text-muted hover:text-text"
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <motion.div
                    layoutId="tab-underline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold"
                    transition={{ duration: 0.2 }}
                  />
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-[880px] w-full mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            {children(activeTab)}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
