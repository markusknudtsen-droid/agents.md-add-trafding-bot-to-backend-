import type { Stage, Token } from "./useMemeScope";
import type { BotTrendingToken } from "@/lib/bot/types";

/**
 * Adapts the bot's live scan feed into the scanner's lifecycle cards.
 *
 * The simulated scanner models a bonding curve; real DexScreener pairs are
 * already trading, so the three columns become a maturity funnel instead —
 * fresh pairs, pairs building depth, and established pools. Every number
 * shown comes from the feed: fields the feed does not carry (holder counts,
 * market cap, absolute transaction counts) are left undefined so the cards
 * render a dash rather than a fabricated figure.
 */

const GLYPHS = ["🚀", "🐸", "🌙", "🐕", "💪", "🐱", "🍌", "⚡", "🐍", "🧠", "🔮", "📈", "🗿", "😔", "🔥"];

/** Liquidity (USD) at which a pool is treated as fully "established". */
const DEEP_LIQUIDITY_USD = 250_000;

function glyphFor(address: string): string {
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = (hash * 31 + address.charCodeAt(i)) >>> 0;
  }
  return GLYPHS[hash % GLYPHS.length];
}

function stageFor(ageHours: number): Stage {
  if (ageHours < 24) return "new";
  if (ageHours < 24 * 7) return "graduating";
  return "graduated";
}

/**
 * How far a pool has grown toward "established", on a log scale so a pool
 * going from $1k to $10k of liquidity reads as real progress rather than a
 * rounding error next to a $250k pool.
 */
function progressFor(liquidityUsd: number): number {
  if (liquidityUsd <= 0) return 0;
  const ratio = Math.log10(liquidityUsd) / Math.log10(DEEP_LIQUIDITY_USD);
  return Math.min(100, Math.max(0, ratio * 100));
}

export function toScannerTokens(tokens: BotTrendingToken[]): Token[] {
  return tokens.map((t) => {
    const ratio = Number.isFinite(t.buy_to_sell_ratio) && t.buy_to_sell_ratio > 0 ? t.buy_to_sell_ratio : 1;

    // Split the real ratio into two weights that sum to 100, so the card's
    // bar is proportionally correct without implying absolute trade counts.
    const buyShare = (ratio / (ratio + 1)) * 100;
    const stage = stageFor(t.age_hours);

    return {
      id: t.address,
      symbol: t.symbol,
      name: t.name,
      glyph: glyphFor(t.address),
      stage,
      age: Math.round(t.age_hours * 3600),
      volume: t.volume_24h,
      liquidity: t.liquidity_usd,
      buys: buyShare,
      sells: 100 - buyShare,
      progress: stage === "graduated" ? 100 : progressFor(t.liquidity_usd),
      change: t.price_change_24h,
      // Buy pressure in [-1, 1]: a 1:1 ratio is neutral, 3:1 is maximum heat.
      pressure: Math.max(-1, Math.min(1, (ratio - 1) / 2)),
      fresh: false,
      live: true,
      // Deliberately omitted — not present in the live feed:
      // marketCap, holders, txnCount.
    } satisfies Token;
  });
}
