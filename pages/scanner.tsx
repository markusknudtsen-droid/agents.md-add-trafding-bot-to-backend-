import React from "react";
import Head from "next/head";
import Link from "next/link";

import { useMemeScope } from "@/components/scanner/useMemeScope";
import { toScannerTokens } from "@/components/scanner/liveTokens";
import ScannerColumn from "@/components/scanner/ScannerColumn";
import StatCard from "@/components/dashboard/StatCard";
import ModeBadge from "@/components/dashboard/ModeBadge";
import { useLiveBot } from "@/components/dashboard/useLiveBot";
import { compactUsd } from "@/components/dashboard/format";

export default function ScannerPage() {
  const bot = useLiveBot();
  const sim = useMemeScope();

  const isLive = bot.connected;
  const tokens = isLive ? toScannerTokens(bot.tokens) : sim.tokens;

  const newTokens = tokens.filter((t) => t.stage === "new");
  const graduating = tokens
    .filter((t) => t.stage === "graduating")
    .sort((a, b) => b.progress - a.progress);
  const graduatedTokens = tokens
    .filter((t) => t.stage === "graduated")
    .sort((a, b) => (b.marketCap ?? b.liquidity) - (a.marketCap ?? a.liquidity));

  const buying = tokens.filter((t) => t.pressure >= 0).length;
  const totalVolume = isLive
    ? tokens.reduce((sum, t) => sum + t.volume, 0)
    : sim.totalVolume;

  return (
    <>
      <Head>
        <title>Memescope · Token Scanner</title>
        <meta
          name="description"
          content="Live token scanner wired to a Solana trading bot, with lifecycle columns and RGB buy/sell pressure lighting."
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
                  {isLive
                    ? "Your bot's live scan feed · RGB buy / sell pressure"
                    : "Simulated token scanner · RGB buy / sell pressure"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ModeBadge live={isLive} ready={bot.ready} error={bot.error} />
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
              sub={
                isLive
                  ? "candidates passing bot filters"
                  : `${sim.minted} minted this session`
              }
              accent
            />
            <StatCard
              label="Total Volume"
              value={compactUsd(totalVolume)}
              sub="24h across tracked tokens"
            />
            <StatCard
              label={isLive ? "Established" : "Graduated"}
              value={String(isLive ? graduatedTokens.length : sim.graduated)}
              sub={isLive ? "pools older than 7 days" : "hit 100% bonding curve"}
              tone={(isLive ? graduatedTokens.length : sim.graduated) > 0 ? "up" : "neutral"}
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
              title={isLive ? "Fresh Pairs" : "Newly Minted"}
              hint={
                isLive
                  ? "Live pairs under 24h old — highest risk, highest velocity."
                  : "Fresh pairs, seconds old — highest risk, highest velocity."
              }
              accent="#22d3ee"
              tokens={newTokens}
            />
            <ScannerColumn
              title={isLive ? "Building Depth" : "About to Graduate"}
              hint={
                isLive
                  ? "Under a week old, still growing liquidity toward a deep pool."
                  : "Climbing the bonding curve toward a real pool."
              }
              accent="#a855f7"
              tokens={graduating}
            />
            <ScannerColumn
              title={isLive ? "Established" : "Graduated"}
              hint={
                isLive
                  ? "Older than a week with real depth behind them."
                  : "Completed the curve and migrated to a DEX pool."
              }
              accent="#10b981"
              tokens={graduatedTokens}
            />
          </div>

          <footer className="mt-10 text-center text-[11px] text-white/25">
            {isLive
              ? "Live DexScreener candidates from your bot's scanner · holder and market-cap figures are not in this feed"
              : "Simulated market data · no bot connected · front-end demo"}
          </footer>
        </div>
      </div>
    </>
  );
}
