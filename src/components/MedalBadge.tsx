"use client";

import { Medal } from "@/lib/medals";

interface MedalBadgeProps {
  medals: Medal[];
  onNavigate?: (target: "leaderboard" | "events", eventId?: string) => void;
}

export default function MedalBadge({ medals, onNavigate }: MedalBadgeProps) {
  if (medals.length === 0) return null;
  return (
    <span className="flex items-center gap-0.5 ml-2">
      {medals.map((m) => (
        <span key={m.emoji} className="relative group inline-flex">
          <button
            onClick={() => onNavigate?.(m.target, m.eventId)}
            className={`text-sm leading-none transition-transform duration-100 ${
              onNavigate
                ? "cursor-pointer hover:scale-125"
                : "cursor-default"
            }`}
            aria-label={m.label}
          >
            {m.emoji}
          </button>

          {/* Tooltip */}
          <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <span className="block bg-[#16161e] border border-white/10 px-2.5 py-1.5 shadow-xl min-w-max">
              <span className="block text-xs font-heading uppercase tracking-wider text-text leading-snug">
                {m.label}
              </span>
              <span className="block text-xs text-text-muted mt-0.5 leading-snug font-body">
                {m.description}
              </span>
            </span>
            {/* Arrow */}
            <span className="block w-0 h-0 mx-auto border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-white/10" />
          </span>
        </span>
      ))}
    </span>
  );
}
