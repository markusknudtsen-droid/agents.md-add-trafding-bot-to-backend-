import { useCallback, useEffect, useState } from "react";

import type { Asset, Signal, Trade } from "./useBotMarket";
import type {
  BotEnvelope,
  BotPortfolio,
  BotSettings,
  BotTradePage,
  BotTrendingToken,
} from "@/lib/bot/types";

/**
 * Connects the dashboard to the real trading bot.
 *
 * Everything is fetched through this app's own `/api/bot/*` routes, which
 * hold the bot's credentials server-side — the browser never sees them. When
 * no bot is configured or it cannot be reached, `connected` stays false and
 * the pages fall back to their simulation, clearly badged as such so live
 * money and fake numbers are never confused for one another.
 */

const POLL_INTERVAL_MS = 5_000;

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Stable pseudo-angle for a token, so a blip keeps its place on the radar
 * between polls instead of jumping around.
 */
function angleFor(address: string): number {
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = (hash * 31 + address.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
}

/**
 * Maps a position's P&L onto the portfolio's flow lighting.
 *
 * A position running toward its take-profit glows green; one sliding toward
 * its stop-loss glows red. The intensity is how far along that path it is,
 * so the RGB now reports real risk rather than a random walk.
 */
function flowFromPnl(pnlPercent: number, stopLoss: number, takeProfit: number): number {
  if (pnlPercent >= 0) {
    const target = takeProfit > 0 ? takeProfit : 50;
    return clamp(pnlPercent / target, 0, 1);
  }
  const floor = stopLoss > 0 ? stopLoss : 15;
  return -clamp(Math.abs(pnlPercent) / floor, 0, 1);
}

function toAssets(portfolio: BotPortfolio): Asset[] {
  return portfolio.positions.map((p) => ({
    symbol: p.symbol,
    name: `${p.symbol} · ${p.chain_id}`,
    // Position size in SOL; `value` carries the live worth so the row does
    // not try to multiply a SOL balance by a USD token price.
    amount: p.balance,
    price: p.current_price,
    change: p.pnl_percent,
    flow: flowFromPnl(p.pnl_percent, p.stop_loss, p.take_profit),
    value: p.current_value,
  }));
}

function toTrades(page: BotTradePage): Trade[] {
  return page.items.slice(0, 14).map((t) => ({
    id: t.id,
    symbol: t.pair,
    side: t.type.toUpperCase() === "SELL" ? "sell" : "buy",
    price: t.price ?? 0,
    amount: t.amount_sol ?? 0,
    ts: t.timestamp,
  }));
}

/**
 * Turns the bot's live scan candidates into radar blips.
 *
 * Confidence comes from real buy pressure, and distance from liquidity — so
 * a blip near the centre is a deep, heavily-bought pool rather than a random
 * coordinate.
 */
function toSignals(tokens: BotTrendingToken[]): Signal[] {
  return tokens.slice(0, 9).map((t, index) => {
    const ratio = Number.isFinite(t.buy_to_sell_ratio) ? t.buy_to_sell_ratio : 1;
    const confidence = clamp(ratio / 3, 0.05, 1);
    const liquidityScore = clamp(Math.log10(Math.max(1, t.liquidity_usd)) / 6, 0, 1);
    return {
      id: index,
      symbol: t.symbol,
      side: ratio >= 1 ? "buy" : "sell",
      confidence,
      angle: angleFor(t.address),
      // Deeper liquidity sits closer to the centre.
      distance: clamp(1 - liquidityScore, 0.25, 0.95),
      strength: 1,
    };
  });
}

export interface LiveBot {
  /** True only when the bot answered successfully on the last poll. */
  connected: boolean;
  /** Set when not connected — safe to display. */
  error: string | null;
  /** False until the first poll resolves, so the UI can avoid flashing. */
  ready: boolean;

  assets: Asset[];
  signals: Signal[];
  trades: Trade[];
  tokens: BotTrendingToken[];
  settings: BotSettings | null;

  /** Position value in SOL. */
  totalValue: number;
  /** Unrealised P&L in SOL. */
  pnl: number;
  pnlPercent: number;

  /** Reflects the bot's own pause gate: paused when override or inactive. */
  paused: boolean;
  /** Pauses or resumes the live bot. Resolves once the bot confirms. */
  setPaused: (paused: boolean) => Promise<void>;
  busy: boolean;
}

/**
 * Every `/api/bot/*` route replies with the `{ connected, data, error }`
 * envelope (see `lib/bot/route.ts` and `middleware.ts`), so this is not
 * expected to fail — but never assume a fetch response is JSON just because
 * the code that sent it usually returns JSON. A host's own error page (a
 * proxy timeout, a platform-level 502) would not be, and parsing that as
 * JSON throws a raw `SyntaxError` that tells the operator nothing. Falling
 * back to the response's status text keeps that case a readable envelope
 * instead of a swallowed exception.
 */
async function readEnvelope<T>(response: Response): Promise<BotEnvelope<T>> {
  const text = await response.text();
  try {
    return JSON.parse(text) as BotEnvelope<T>;
  } catch {
    return {
      connected: false,
      data: null,
      error: `Unexpected response (HTTP ${response.status} ${response.statusText || ""}).`.trim(),
    };
  }
}

async function getJson<T>(url: string): Promise<BotEnvelope<T>> {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  return readEnvelope<T>(response);
}

export function useLiveBot(): LiveBot {
  const [portfolio, setPortfolio] = useState<BotPortfolio | null>(null);
  const [tradePage, setTradePage] = useState<BotTradePage | null>(null);
  const [tokens, setTokens] = useState<BotTrendingToken[]>([]);
  const [settings, setSettings] = useState<BotSettings | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  const poll = useCallback(async (cancelled: () => boolean) => {
    try {
      const [portfolioRes, tradesRes, marketRes, settingsRes] = await Promise.all([
        getJson<BotPortfolio>("/api/bot/portfolio"),
        getJson<BotTradePage>("/api/bot/trades?pageSize=20"),
        getJson<BotTrendingToken[]>("/api/bot/market"),
        getJson<BotSettings>("/api/bot/settings"),
      ]);
      if (cancelled()) return;

      // The portfolio is the source of truth for "is the bot really there":
      // it is the cheapest authenticated call the dashboard makes.
      if (portfolioRes.connected && portfolioRes.data) {
        setPortfolio(portfolioRes.data);
        setConnected(true);
        setError(null);
      } else {
        setConnected(false);
        setError(portfolioRes.error ?? "Bot unavailable.");
      }

      if (tradesRes.data) setTradePage(tradesRes.data);
      if (marketRes.data) setTokens(marketRes.data);
      if (settingsRes.data) setSettings(settingsRes.data);
    } catch {
      if (cancelled()) return;
      setConnected(false);
      setError("Could not reach the dashboard's bot API route.");
    } finally {
      if (!cancelled()) setReady(true);
    }
  }, []);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cancelled = () => stopped;

    // Self-scheduling rather than setInterval: the bot client allows each
    // request up to 8s, so a fixed 5s interval could start a new cycle before
    // the previous one returned. Overlapping cycles can resolve out of order
    // and let a stale response overwrite fresher state — including flipping
    // `connected` back on after the bot has actually gone away. Waiting for
    // each cycle to finish keeps exactly one in flight.
    const scheduleNext = () => {
      if (stopped) return;
      timer = setTimeout(() => void run(), POLL_INTERVAL_MS);
    };

    const run = async () => {
      if (stopped) return;
      // A hidden tab is not being read, and each cycle is four authenticated
      // round-trips to the bot — don't spend them on nobody.
      if (document.visibilityState === "hidden") {
        scheduleNext();
        return;
      }
      await poll(cancelled);
      scheduleNext();
    };

    void run();

    // Refresh the moment the operator looks back at the tab, instead of
    // showing them stale numbers until the next interval elapses.
    const onVisibilityChange = () => {
      if (stopped || document.visibilityState !== "visible") return;
      if (timer) clearTimeout(timer);
      void run();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [poll]);

  const setPaused = useCallback(async (paused: boolean) => {
    setBusy(true);
    try {
      const response = await fetch("/api/bot/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        // `override_enabled` is the bot's manual pause gate; `active_status`
        // is its master switch. Drive both so the state is unambiguous.
        body: JSON.stringify({ override_enabled: paused, active_status: !paused }),
      });
      const body = await readEnvelope<BotSettings>(response);
      if (body.connected && body.data) {
        setSettings(body.data);
        setError(null);
      } else if (body.error) {
        setError(body.error);
      }
    } catch {
      setError("Failed to update the bot's pause state.");
    } finally {
      setBusy(false);
    }
  }, []);

  const assets = portfolio ? toAssets(portfolio) : [];
  const totalValue = portfolio?.summary.total_value_sol ?? 0;
  const totalCost = portfolio?.summary.total_cost_sol ?? 0;

  return {
    connected,
    error,
    ready,
    assets,
    signals: toSignals(tokens),
    trades: tradePage ? toTrades(tradePage) : [],
    tokens,
    settings,
    totalValue,
    pnl: totalValue - totalCost,
    pnlPercent: portfolio?.summary.pnl_percent ?? 0,
    paused: settings ? settings.override_enabled || !settings.active_status : false,
    setPaused,
    busy,
  };
}
