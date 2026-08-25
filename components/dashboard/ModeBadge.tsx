import React from "react";

interface ModeBadgeProps {
  live: boolean;
  ready: boolean;
  error: string | null;
}

/**
 * States whether the console is showing the real bot or the built-in
 * simulation.
 *
 * This deliberately shouts: the two modes render identical widgets, and the
 * only thing separating a real Solana position from a fabricated one is this
 * badge. When the bot is unreachable the reason is exposed as a tooltip so
 * the cause (not configured / down / bad password) is visible without
 * digging through logs.
 */
export default function ModeBadge({ live, ready, error }: ModeBadgeProps) {
  if (!ready) {
    return (
      <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/50">
        <span className="h-2 w-2 rounded-full bg-white/30" />
        Connecting…
      </span>
    );
  }

  if (live) {
    return (
      <span className="flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-emerald-300">
        <span className="dash-blink h-2 w-2 rounded-full bg-emerald-400" />
        LIVE BOT
      </span>
    );
  }

  return (
    <span
      title={error ?? undefined}
      className="flex cursor-help items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-amber-300"
    >
      <span className="h-2 w-2 rounded-full bg-amber-400" />
      SIMULATED
    </span>
  );
}
