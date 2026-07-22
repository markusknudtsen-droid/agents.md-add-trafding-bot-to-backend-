import React from "react";
import type { Signal } from "./useBotMarket";

interface BotScannerProps {
  signals: Signal[];
  scanCount: number;
  live: boolean;
}

/**
 * Radar-style scanner. A conic sweep rotates over concentric rings while
 * detected signals appear as blips positioned by angle/distance. Buy blips
 * glow emerald, sell blips glow rose.
 */
export default function BotScanner({ signals, scanCount, live }: BotScannerProps) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-white">
            Signal Scanner
          </h2>
          <p className="text-xs text-white/40">
            Sweeping {signals.length} live target{signals.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] text-white/60">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              live ? "bg-cyan-400 dash-blink" : "bg-white/30"
            }`}
          />
          {live ? "SCANNING" : "IDLE"} · #{scanCount}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,320px)_1fr]">
        {/* Radar */}
        <div className="relative mx-auto aspect-square w-full max-w-[320px]">
          <div className="dash-radar absolute inset-0 rounded-full border border-cyan-400/20">
            <div className="absolute inset-[14%] rounded-full border border-cyan-400/15" />
            <div className="absolute inset-[30%] rounded-full border border-cyan-400/15" />
            <div className="absolute inset-[46%] rounded-full border border-cyan-400/10" />
            {/* Cross hairs */}
            <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-cyan-400/10" />
            <div className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-cyan-400/10" />
            {/* Rotating sweep */}
            <div className="dash-radar-sweep absolute inset-0 rounded-full" />
          </div>

          {/* Blips */}
          {signals.map((s) => {
            const rad = (s.angle * Math.PI) / 180;
            const r = s.distance * 46; // percent from center
            const x = 50 + Math.cos(rad) * r;
            const y = 50 + Math.sin(rad) * r;
            const color = s.side === "buy" ? "16,185,129" : "244,63,94";
            return (
              <div
                key={s.id}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                <span
                  className="dash-blip block rounded-full"
                  style={{
                    width: `${8 + s.confidence * 8}px`,
                    height: `${8 + s.confidence * 8}px`,
                    background: `rgba(${color},${0.35 + s.strength * 0.5})`,
                    boxShadow: `0 0 ${6 + s.strength * 16}px rgba(${color},0.9)`,
                  }}
                />
              </div>
            );
          })}

          {/* Center hub */}
          <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.9)]" />
        </div>

        {/* Detected signal list */}
        <div className="flex flex-col gap-2">
          <div className="mb-1 grid grid-cols-[1fr_auto_auto] gap-3 px-1 text-[10px] uppercase tracking-[0.15em] text-white/30">
            <span>Target</span>
            <span>Side</span>
            <span className="text-right">Conf.</span>
          </div>
          {signals.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-xs text-white/30">
              Listening for market signals…
            </div>
          ) : (
            [...signals]
              .sort((a, b) => b.confidence - a.confidence)
              .map((s) => {
                const buy = s.side === "buy";
                return (
                  <div
                    key={s.id}
                    className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-xl border border-white/5 bg-black/20 px-3 py-2"
                    style={{ opacity: 0.4 + s.strength * 0.6 }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-white">
                        {s.symbol}
                      </span>
                      <span className="hidden text-[11px] text-white/30 sm:inline">
                        d{s.distance.toFixed(2)}
                      </span>
                    </div>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        buy
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-rose-500/15 text-rose-300"
                      }`}
                    >
                      {s.side}
                    </span>
                    <div className="flex w-24 items-center justify-end gap-2">
                      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-white/10">
                        <div
                          className={`h-full rounded-full ${
                            buy ? "bg-emerald-400" : "bg-rose-400"
                          }`}
                          style={{ width: `${s.confidence * 100}%` }}
                        />
                      </div>
                      <span className="w-8 text-right font-mono text-[11px] tabular-nums text-white/60">
                        {Math.round(s.confidence * 100)}
                      </span>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>
    </section>
  );
}
