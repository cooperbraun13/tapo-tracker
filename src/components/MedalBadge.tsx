import { Medal } from "@/lib/medals";

interface MedalBadgeProps {
  medals: Medal[];
}

export default function MedalBadge({ medals }: MedalBadgeProps) {
  if (medals.length === 0) return null;
  return (
    <span className="flex items-center gap-0.5 ml-2">
      {medals.map((m) => (
        <span
          key={m.emoji}
          title={m.label}
          className="text-sm leading-none cursor-default"
          aria-label={m.label}
        >
          {m.emoji}
        </span>
      ))}
    </span>
  );
}
