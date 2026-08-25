import React from "react";
import type { Token } from "./useMemeScope";
import { compactUsd, compactNumber, signed } from "@/components/dashboard/format";

interface TokenCardProps {
  token: Token;
}

function age(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h`;
}

/**
 * A single meme-token row. The border and glow are driven by live buy/sell
 * pressure — emerald when buyers dominate, rose when sellers do — and the
 * intensity scales with how one-sided the flow currently is.
 */
export default function TokenCard({ token: t }: TokenCardProps) {
  const buy = t.pressure >= 0;
  const intensity = Math.min(1, Math.abs(t.pressure));
  const rgb = buy ? "16,185,129" : "244,63,94";
  const up = t.change >= 0;

  return (
    <article
      className={`scan-card relative overflow-hidden rounded-2xl border bg-black/40 p-3 ${
        t.fresh ? "scan-card-fresh" : ""
      }`}
      style={{
        borderColor: `rgba(${rgb},${0.22 + intensity * 0.5})`,
        boxShadow: `0 0 ${6 + intensity * 22}px rgba(${rgb},${0.07 + intensity * 0.28})`,
      }}
    >
      {/* Pressure stream sweeping across the card */}
      <div
        className={`scan-stream pointer-events-none absolute inset-0 ${
          buy ? "" : "scan-stream-reverse"
        }`}
        style={{
          opacity: 0.1 + intensity * 0.3,
          background: `linear-gradient(90deg, transparent, rgba(${rgb},0.7) 50%, transparent)`,
          animationDuration: `${3.2 - intensity * 1.6}s`,
        }}
      />

      <div className="relative">
        {/* Header: glyph, ticker, age, change */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg"
              style={{
                background: `rgba(${rgb},0.12)`,
                boxShadow: `0 0 10px rgba(${rgb},${0.25 + intensity * 0.45})`,
              }}
            >
              {t.glyph}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate font-mono text-sm font-bold text-white">
                  {t.symbol}
                </span>
                <span className="shrink-0 rounded bg-white/10 px-1 font-mono text-[9px] text-white/50">
                  {age(t.age)}
                </span>
              </div>
              <div className="truncate text-[11px] text-white/40">{t.name}</div>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <div className="font-mono text-sm font-semibold tabular-nums text-white">
              {compactUsd(t.marketCap)}
            </div>
            <div
              className={`font-mono text-[11px] tabular-nums ${
                up ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {signed(t.change, 0)}%
            </div>
          </div>
        </div>

        {/* Metrics grid */}
        <dl className="mt-2.5 grid grid-cols-4 gap-1.5 text-center">
          {[
            ["V", compactUsd(t.volume)],
            ["LIQ", compactUsd(t.liquidity)],
            ["HLD", compactNumber(t.holders)],
            ["TXN", compactNumber(t.buys + t.sells)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg bg-white/[0.04] py-1">
              <dt className="text-[9px] uppercase tracking-wide text-white/30">
                {label}
              </dt>
              <dd className="font-mono text-[11px] tabular-nums text-white/80">
                {value}
              </dd>
            </div>
          ))}
        </dl>

        {/* Buy / sell split bar */}
        <div className="mt-2.5 flex items-center gap-2">
          <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-emerald-400"
              style={{
                width: `${(t.buys / Math.max(1, t.buys + t.sells)) * 100}%`,
              }}
            />
            <div className="h-full flex-1 bg-rose-400/70" />
          </div>
          <span className="font-mono text-[9px] tabular-nums text-white/40">
            {compactNumber(t.buys)}B / {compactNumber(t.sells)}S
          </span>
        </div>

        {/* Bonding-curve progress (pre-graduation only) */}
        {t.stage !== "graduated" ? (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${t.progress}%`,
                  background: `linear-gradient(90deg, rgba(${rgb},0.6), rgba(${rgb},1))`,
                  boxShadow: `0 0 8px rgba(${rgb},0.8)`,
                }}
              />
            </div>
            <span className="font-mono text-[9px] tabular-nums text-white/40">
              {Math.round(t.progress)}%
            </span>
          </div>
        ) : (
          <div className="mt-2 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider text-cyan-300">
            <span className="h-1 w-1 rounded-full bg-cyan-300" />
            graduated to pool
          </div>
        )}
      </div>
    </article>
  );
}
