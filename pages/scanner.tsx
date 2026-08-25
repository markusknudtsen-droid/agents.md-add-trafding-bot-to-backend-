import React from "react";
import Head from "next/head";
import Link from "next/link";

import { useMemeScope } from "@/components/scanner/useMemeScope";
import ScannerColumn from "@/components/scanner/ScannerColumn";
import StatCard from "@/components/dashboard/StatCard";
import { compactUsd } from "@/components/dashboard/format";

export default function ScannerPage() {
  const { live, tokens, minted, graduated, totalVolume } = useMemeScope();

  const newTokens = tokens.filter((t) => t.stage === "new");
  const graduating = tokens
    .filter((t) => t.stage === "graduating")
    .sort((a, b) => b.progress - a.progress);
  const graduatedTokens = tokens
    .filter((t) => t.stage === "graduated")
    .sort((a, b) => b.marketCap - a.marketCap);

  const buying = tokens.filter((t) => t.pressure >= 0).length;

  return (
    <>
      <Head>
        <title>Memescope · Token Scanner</title>
        <meta
          name="description"
          content="Live meme-token scanner with lifecycle columns and RGB buy/sell pressure lighting."
        />
      </Head>

      <div className="dash-root min-h-screen text-white">
        <div className="dash-aurora" aria-hidden />

        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="dash-logo flex h-11 w-11 items-center justify-center rounded-2xl text-lg font-black">
                ◎
              </div>
              <div>
                <h1 className="text-lg font-semibold leading-tight">Memescope</h1>
                <p className="text-xs text-white/40">
                  Live token scanner · RGB buy / sell pressure
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/70">
                <span
                  className={`h-2 w-2 rounded-full ${
                    live ? "bg-emerald-400 dash-blink" : "bg-white/30"
                  }`}
                />
                {live ? "Streaming" : "Connecting…"}
              </span>
              <Link
                href="/dashboard"
                className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                Dashboard
              </Link>
              <Link
                href="/"
                className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                ← AGENTS.md
              </Link>
            </div>
          </header>

          {/* Stats */}
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Tracking"
              value={String(tokens.length)}
              sub={`${minted} minted this session`}
              accent
            />
            <StatCard
              label="Total Volume"
              value={compactUsd(totalVolume)}
              sub="across all tracked tokens"
            />
            <StatCard
              label="Graduated"
              value={String(graduated)}
              sub="hit 100% bonding curve"
              tone={graduated > 0 ? "up" : "neutral"}
            />
            <StatCard
              label="Buy Pressure"
              value={`${tokens.length ? Math.round((buying / tokens.length) * 100) : 0}%`}
              sub={`${buying} buying · ${tokens.length - buying} selling`}
              tone={buying * 2 >= tokens.length ? "up" : "down"}
            />
          </div>

          {/* Lifecycle columns */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ScannerColumn
              title="Newly Minted"
              hint="Fresh pairs, seconds old — highest risk, highest velocity."
              accent="#22d3ee"
              tokens={newTokens}
            />
            <ScannerColumn
              title="About to Graduate"
              hint="Climbing the bonding curve toward a real pool."
              accent="#a855f7"
              tokens={graduating}
            />
            <ScannerColumn
              title="Graduated"
              hint="Completed the curve and migrated to a DEX pool."
              accent="#10b981"
              tokens={graduatedTokens}
            />
          </div>

          <footer className="mt-10 text-center text-[11px] text-white/25">
            Simulated market data · front-end demo · no live chain connection
          </footer>
        </div>
      </div>
    </>
  );
}
