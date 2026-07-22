import React from "react";
import type { Asset } from "./useBotMarket";
import { usd, compactUsd, signed } from "./format";

interface FlowingPortfolioProps {
  assets: Asset[];
  totalValue: number;
}

/**
 * Portfolio holdings that "flow". Each row carries an animated gradient
 * stream whose direction and colour tracks the asset's live flow value:
 * accumulation (buys) lights the row emerald and streams right, distribution
 * (sells) lights it rose and streams left. The RGB glow intensity scales
 * with how strong the current flow is.
 */
export default function FlowingPortfolio({
  assets,
  totalValue,
}: FlowingPortfolioProps) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
      <header className="mb-5 flex items-end justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-white">
            Flowing Portfolio
          </h2>
          <p className="text-xs text-white/40">
            RGB light tracks live buy / sell pressure
          </p>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold tabular-nums text-white">
            {compactUsd(totalValue)}
          </div>
          <div className="text-[11px] text-white/40">total value</div>
        </div>
      </header>

      <div className="flex flex-col gap-3">
        {assets.map((a) => {
          const buy = a.flow >= 0;
          const intensity = Math.min(1, Math.abs(a.flow));
          const rgb = buy ? "16,185,129" : "244,63,94";
          const value = a.amount * a.price;
          const weight = totalValue > 0 ? (value / totalValue) * 100 : 0;

          return (
            <div
              key={a.symbol}
              className="dash-flow-row relative overflow-hidden rounded-2xl border bg-black/30 px-4 py-3"
              style={{
                borderColor: `rgba(${rgb},${0.2 + intensity * 0.5})`,
                boxShadow: `0 0 ${8 + intensity * 26}px rgba(${rgb},${
                  0.08 + intensity * 0.32
                }), inset 0 0 ${10 + intensity * 20}px rgba(${rgb},${
                  0.04 + intensity * 0.12
                })`,
              }}
            >
              {/* Flowing stream */}
              <div
                className={`dash-stream pointer-events-none absolute inset-0 ${
                  buy ? "" : "dash-stream-reverse"
                }`}
                style={{
                  opacity: 0.15 + intensity * 0.45,
                  background: `linear-gradient(90deg, transparent 0%, rgba(${rgb},0.55) 45%, rgba(${rgb},0.9) 50%, rgba(${rgb},0.55) 55%, transparent 100%)`,
                  animationDuration: `${3.4 - intensity * 1.8}s`,
                }}
              />

              <div className="relative flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-xl font-mono text-[11px] font-bold text-white"
                    style={{
                      background: `rgba(${rgb},0.14)`,
                      boxShadow: `0 0 10px rgba(${rgb},${0.3 + intensity * 0.5})`,
                    }}
                  >
                    {a.symbol}
                  </span>
                  <div>
                    <div className="text-sm font-medium text-white">{a.name}</div>
                    <div className="font-mono text-[11px] tabular-nums text-white/40">
                      {a.amount.toFixed(a.price > 1000 ? 3 : 1)} @ {usd(a.price)}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-semibold tabular-nums text-white">
                    {usd(value, 0, 0)}
                  </div>
                  <div
                    className={`font-mono text-[11px] tabular-nums ${
                      a.change >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {signed(a.change)}%
                  </div>
                </div>
              </div>

              {/* Allocation + flow meter */}
              <div className="relative mt-3 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${weight}%`,
                      background: `linear-gradient(90deg, rgba(${rgb},0.5), rgba(${rgb},1))`,
                    }}
                  />
                </div>
                <span
                  className="w-24 text-right font-mono text-[10px] uppercase tracking-wide"
                  style={{ color: `rgba(${rgb},0.9)` }}
                >
                  {buy ? "▲ accumulating" : "▼ distributing"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
