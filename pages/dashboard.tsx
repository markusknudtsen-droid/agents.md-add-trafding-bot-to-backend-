import React from "react";
import Head from "next/head";
import Link from "next/link";

import { useBotMarket } from "@/components/dashboard/useBotMarket";
import { compactUsd, usd, signed } from "@/components/dashboard/format";
import StatCard from "@/components/dashboard/StatCard";
import BotScanner from "@/components/dashboard/BotScanner";
import FlowingPortfolio from "@/components/dashboard/FlowingPortfolio";
import TradeFeed from "@/components/dashboard/TradeFeed";

export default function DashboardPage() {
  const { live, assets, signals, trades, totalValue, pnl, scanCount } =
    useBotMarket();

  const pnlPct = totalValue > 0 ? (pnl / totalValue) * 100 : 0;
  const buySignals = signals.filter((s) => s.side === "buy").length;
  const sellSignals = signals.length - buySignals;
  const bestConf = signals.reduce((m, s) => Math.max(m, s.confidence), 0);

  return (
    <>
      <Head>
        <title>Personal Dashboard · Trading Bot</title>
        <meta
          name="description"
          content="Personal trading dashboard with a live bot signal scanner and a flowing RGB portfolio."
        />
      </Head>

      <div className="dash-root min-h-screen text-white">
        <div className="dash-aurora" aria-hidden />

        <div className="relative mx-auto max-w-6xl px-5 py-8 sm:px-8">
          {/* Top bar */}
          <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="dash-logo flex h-11 w-11 items-center justify-center rounded-2xl text-lg font-black">
                ◈
              </div>
              <div>
                <h1 className="text-lg font-semibold leading-tight">
                  Aurora Bot
                </h1>
                <p className="text-xs text-white/40">Personal trading console</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/70">
                <span
                  className={`h-2 w-2 rounded-full ${
                    live ? "bg-emerald-400 dash-blink" : "bg-white/30"
                  }`}
                />
                {live ? "Bot online" : "Connecting…"}
              </span>
              <Link
                href="/"
                className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                ← AGENTS.md
              </Link>
            </div>
          </header>

          {/* Stat row */}
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Portfolio Value"
              value={compactUsd(totalValue)}
              sub={`${assets.length} assets held`}
              accent
            />
            <StatCard
              label="Session P&L"
              value={`${pnl >= 0 ? "+" : "-"}${usd(Math.abs(pnl), 0, 0)}`}
              sub={`${signed(pnlPct)}%`}
              tone={pnl >= 0 ? "up" : "down"}
            />
            <StatCard
              label="Live Signals"
              value={String(signals.length)}
              sub={`${buySignals} buy · ${sellSignals} sell`}
            />
            <StatCard
              label="Top Confidence"
              value={`${Math.round(bestConf * 100)}%`}
              sub={`${scanCount} scans run`}
              tone={bestConf > 0.75 ? "up" : "neutral"}
            />
          </div>

          {/* Main grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="lg:col-span-2">
              <BotScanner signals={signals} scanCount={scanCount} live={live} />
            </div>
            <FlowingPortfolio assets={assets} totalValue={totalValue} />
            <TradeFeed trades={trades} />
          </div>

          <footer className="mt-10 text-center text-[11px] text-white/25">
            Simulated market data · front-end demo · Aurora Bot console
          </footer>
        </div>
      </div>
    </>
  );
}
