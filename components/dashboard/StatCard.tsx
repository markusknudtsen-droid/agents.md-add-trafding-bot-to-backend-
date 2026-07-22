import React from "react";

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  tone?: "neutral" | "up" | "down";
  accent?: boolean;
}

export default function StatCard({
  label,
  value,
  sub,
  tone = "neutral",
  accent = false,
}: StatCardProps) {
  const toneClass =
    tone === "up"
      ? "text-emerald-400"
      : tone === "down"
        ? "text-rose-400"
        : "text-white";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur ${
        accent ? "dash-accent-ring" : ""
      }`}
    >
      <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/40">
        {label}
      </div>
      <div className={`mt-2 text-2xl font-semibold tabular-nums ${toneClass}`}>
        {value}
      </div>
      {sub ? (
        <div className="mt-1 text-xs text-white/40 tabular-nums">{sub}</div>
      ) : null}
    </div>
  );
}
