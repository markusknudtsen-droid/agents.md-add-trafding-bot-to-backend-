import React from "react";
import type { Token } from "./useMemeScope";
import TokenCard from "./TokenCard";

interface ScannerColumnProps {
  title: string;
  hint: string;
  accent: string;
  tokens: Token[];
}

/**
 * One lifecycle column of the scanner (new / graduating / graduated).
 */
export default function ScannerColumn({
  title,
  hint,
  accent,
  tokens,
}: ScannerColumnProps) {
  return (
    <section className="flex min-w-0 flex-col rounded-3xl border border-white/10 bg-white/[0.02] p-3 backdrop-blur">
      <header className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
          />
          <h2 className="text-sm font-semibold text-white">{title}</h2>
        </div>
        <span className="rounded-full bg-white/5 px-2 py-0.5 font-mono text-[10px] tabular-nums text-white/50">
          {tokens.length}
        </span>
      </header>
      <p className="mb-3 px-1 text-[11px] text-white/30">{hint}</p>

      <div className="flex flex-col gap-2">
        {tokens.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 px-3 py-8 text-center text-[11px] text-white/25">
            Nothing here yet…
          </div>
        ) : (
          tokens.map((t) => <TokenCard key={t.id} token={t} />)
        )}
      </div>
    </section>
  );
}
