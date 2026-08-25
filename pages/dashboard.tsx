import React from "react";
import Head from "next/head";
import Link from "next/link";

import { useBotMarket } from "@/components/dashboard/useBotMarket";
import { useLiveBot } from "@/components/dashboard/useLiveBot";
import { compactUsd, compactSol, usd, sol, signed } from "@/components/dashboard/format";
import StatCard from "@/components/dashboard/StatCard";
import BotScanner from "@/components/dashboard/BotScanner";
import FlowingPortfolio from "@/components/dashboard/FlowingPortfolio";
import TradeFeed from "@/components/dashboard/TradeFeed";
import ModeBadge from "@/components/dashboard/ModeBadge";

export default function DashboardPage() {
  const bot = useLiveBot();
  const sim = useBotMarket();

  // The real bot wins whenever it is reachable; the simulation keeps running
  // underneath so the console stays alive if the bot goes away mid-session.
  const isLive = bot.connected;

  const assets = isLive ? bot.assets : sim.assets;
  const signals = isLive ? bot.signals : sim.signals;
  const trades = isLive ? bot.trades : sim.trades;
  const totalValue = isLive ? bot.totalValue : sim.totalValue;
  const pnl = isLive ? bot.pnl : sim.pnl;
  const pnlPct = isLive
    ? bot.pnlPercent
    : totalValue > 0
      ? (pnl / totalValue) * 100
      : 0;

  const buySignals = signals.filter((s) => s.side === "buy").length;
  const sellSignals = signals.length - buySignals;
  const bestConf = signals.reduce((m, s) => Math.max(m, s.confidence), 0);

  const money = (value: number) => (isLive ? compactSol(value) : compactUsd(value));
  const exact = (value: number) =>
    isLive ? sol(Math.abs(value)) : usd(Math.abs(value), 0, 0);

  return (
    <>
      <Head>
        <title>Personal Dashboard · Trading Bot</title>
        <meta
          name="description"
          content="Personal trading dashboard wired to a live Solana memecoin bot, with a signal scanner and a flowing RGB portfolio."
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
                <h1 className="text-lg font-semibold leading-tight">Aurora Bot</h1>
                <p className="text-xs text-white/40">
                  {isLive ? "Live bot console" : "Personal trading console"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ModeBadge live={isLive} ready={bot.ready} error={bot.error} />

              {isLive ? (
                <button
                  type="button"
                  onClick={() => void bot.setPaused(!bot.paused)}
                  disabled={bot.busy}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:opacity-40 ${
                    bot.paused
                      ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20"
                      : "border-amber-400/40 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20"
                  }`}
                >
                  {bot.busy ? "Saving…" : bot.paused ? "▶ Resume bot" : "⏸ Pause bot"}
                </button>
              ) : null}

              <Link
                href="/scanner"
                className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                Scanner
              </Link>
              <Link
                href="/"
                className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                ← AGENTS.md
              </Link>
            </div>
          </header>

          {/* Paused banner — the bot is connected but deliberately not trading. */}
          {isLive && bot.paused ? (
            <div className="mb-6 rounded-2xl border border-amber-400/30 bg-amber-400/[0.07] px-4 py-3 text-xs text-amber-200">
              <strong className="font-semibold">Bot paused.</strong> Existing positions are
              still monitored for stop-loss and take-profit, but no new trades will be
              opened until you resume.
            </div>
          ) : null}

          {/* Stat row */}
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label={isLive ? "Position Value" : "Portfolio Value"}
              value={money(totalValue)}
              sub={
                isLive
                  ? `${assets.length} open position${assets.length === 1 ? "" : "s"}`
                  : `${assets.length} assets held`
              }
              accent
            />
            <StatCard
              label={isLive ? "Unrealised P&L" : "Session P&L"}
              value={`${pnl >= 0 ? "+" : "-"}${exact(pnl)}`}
              sub={`${signed(pnlPct)}%`}
              tone={pnl >= 0 ? "up" : "down"}
            />
            <StatCard
              label={isLive ? "Scan Candidates" : "Live Signals"}
              value={String(signals.length)}
              sub={`${buySignals} buy · ${sellSignals} sell`}
            />
            <StatCard
              label={isLive ? "Top Buy Pressure" : "Top Confidence"}
              value={`${Math.round(bestConf * 100)}%`}
              sub={
                isLive
                  ? bot.settings
                    ? `trades at ${bot.settings.min_confidence}%+ conf`
                    : "live DexScreener scan"
                  : `${sim.scanCount} scans run`
              }
              tone={bestConf > 0.75 ? "up" : "neutral"}
            />
          </div>

          {/* Main grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="lg:col-span-2">
              <BotScanner
                signals={signals}
                scanCount={isLive ? bot.tokens.length : sim.scanCount}
                live={isLive || sim.live}
              />
            </div>
            <FlowingPortfolio
              assets={assets}
              totalValue={totalValue}
              denomination={isLive ? "sol" : "usd"}
              caption={
                isLive
                  ? "RGB light tracks each position toward take-profit or stop-loss"
                  : "RGB light tracks live buy / sell pressure"
              }
            />
            <TradeFeed trades={trades} denomination={isLive ? "sol" : "usd"} />
          </div>

          <footer className="mt-10 text-center text-[11px] text-white/25">
            {isLive
              ? "Live data from your trading bot · positions and fills are real"
              : "Simulated market data · no bot connected · Aurora Bot console"}
          </footer>
        </div>
      </div>
    </>
  );
}
