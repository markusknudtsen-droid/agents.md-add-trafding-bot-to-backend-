import React from "react";
import type { Trade } from "./useBotMarket";
import { usd } from "./format";

interface TradeFeedProps {
  trades: Trade[];
}

function timeAgo(ts: number): string {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s`;
  return `${Math.round(s / 60)}m`;
}

/**
 * Flowing feed of executed trades. Each new fill slides in and flashes its
 * RGB colour — emerald for buys, rose for sells.
 */
export default function TradeFeed({ trades }: TradeFeedProps) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide text-white">
          Execution Feed
        </h2>
        <span className="text-[11px] text-white/40">last {trades.length} fills</span>
      </header>

      {trades.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center text-xs text-white/30">
          Waiting for the bot to execute its first trade…
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {trades.map((t) => {
            const buy = t.side === "buy";
            const rgb = buy ? "16,185,129" : "244,63,94";
            return (
              <div
                key={t.id}
                className="dash-trade-in flex items-center justify-between gap-3 rounded-xl border px-3 py-2"
                style={{
                  borderColor: `rgba(${rgb},0.25)`,
                  background: `linear-gradient(90deg, rgba(${rgb},0.10), transparent 60%)`,
                }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-6 w-12 items-center justify-center rounded-md text-[10px] font-bold uppercase tracking-wide text-white"
                    style={{
                      background: `rgba(${rgb},0.2)`,
                      boxShadow: `0 0 10px rgba(${rgb},0.5)`,
                    }}
                  >
                    {t.side}
                  </span>
                  <span className="font-mono text-sm font-semibold text-white">
                    {t.symbol}
                  </span>
                  <span className="font-mono text-[11px] tabular-nums text-white/40">
                    {t.amount} @ {usd(t.price)}
                  </span>
                </div>
                <span className="font-mono text-[11px] tabular-nums text-white/30">
                  {timeAgo(t.ts)} ago
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
