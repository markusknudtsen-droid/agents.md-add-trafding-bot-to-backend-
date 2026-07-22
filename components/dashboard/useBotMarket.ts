import { useEffect, useRef, useState } from "react";

/**
 * A self-contained, front-end-only market simulation that powers the
 * personal dashboard. It fabricates believable live data (price ticks,
 * scanner signals and executed trades) so the UI feels alive without a
 * backend. All randomness is deferred until after mount so the server and
 * first client render agree and React does not complain about hydration.
 */

export type Side = "buy" | "sell";

export interface Asset {
  symbol: string;
  name: string;
  amount: number;
  price: number;
  /** Percentage change over the simulated session. */
  change: number;
  /** Rolling flow value in [-1, 1]: positive = accumulating, negative = distributing. */
  flow: number;
}

export interface Signal {
  id: number;
  symbol: string;
  side: Side;
  /** Model confidence in [0, 1]. */
  confidence: number;
  /** Angle (deg) on the radar where the blip sits. */
  angle: number;
  /** Distance from radar centre in [0.2, 1]. */
  distance: number;
  strength: number;
}

export interface Trade {
  id: number;
  symbol: string;
  side: Side;
  price: number;
  amount: number;
  ts: number;
}

const UNIVERSE: Array<Pick<Asset, "symbol" | "name"> & { price: number }> = [
  { symbol: "BTC", name: "Bitcoin", price: 64210 },
  { symbol: "ETH", name: "Ethereum", price: 3420 },
  { symbol: "SOL", name: "Solana", price: 148.2 },
  { symbol: "AVAX", name: "Avalanche", price: 36.8 },
  { symbol: "LINK", name: "Chainlink", price: 17.4 },
  { symbol: "ARB", name: "Arbitrum", price: 1.12 },
];

// Deterministic seed values for the very first (server) render.
const SEED_ASSETS: Asset[] = [
  { symbol: "BTC", name: "Bitcoin", amount: 0.412, price: 64210, change: 2.4, flow: 0.6 },
  { symbol: "ETH", name: "Ethereum", amount: 5.2, price: 3420, change: 1.1, flow: 0.3 },
  { symbol: "SOL", name: "Solana", amount: 84, price: 148.2, change: -0.8, flow: -0.2 },
  { symbol: "AVAX", name: "Avalanche", amount: 210, price: 36.8, change: 3.2, flow: 0.5 },
  { symbol: "LINK", name: "Chainlink", amount: 320, price: 17.4, change: -1.4, flow: -0.4 },
];

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

export interface BotMarket {
  live: boolean;
  assets: Asset[];
  signals: Signal[];
  trades: Trade[];
  totalValue: number;
  pnl: number;
  scanCount: number;
}

export function useBotMarket(): BotMarket {
  const [assets, setAssets] = useState<Asset[]>(SEED_ASSETS);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [scanCount, setScanCount] = useState(0);
  const [live, setLive] = useState(false);
  const idRef = useRef(1);

  useEffect(() => {
    setLive(true);

    // Price + flow ticker.
    const priceTimer = setInterval(() => {
      setAssets((prev) =>
        prev.map((a) => {
          const drift = (Math.random() - 0.5) * 0.012;
          const nextPrice = Math.max(0.01, a.price * (1 + drift));
          const flow = clamp(a.flow * 0.82 + (Math.random() - 0.5) * 0.5, -1, 1);
          return {
            ...a,
            price: nextPrice,
            change: clamp(a.change + drift * 100, -18, 18),
            flow,
          };
        })
      );
    }, 1200);

    // Scanner sweep: emit new signals and let old ones decay.
    const scanTimer = setInterval(() => {
      setScanCount((c) => c + 1);
      setSignals((prev) => {
        const decayed = prev
          .map((s) => ({ ...s, strength: s.strength - 0.16 }))
          .filter((s) => s.strength > 0);

        if (Math.random() < 0.72 && decayed.length < 7) {
          const pick = UNIVERSE[Math.floor(Math.random() * UNIVERSE.length)];
          const side: Side = Math.random() > 0.45 ? "buy" : "sell";
          decayed.push({
            id: idRef.current++,
            symbol: pick.symbol,
            side,
            confidence: 0.55 + Math.random() * 0.44,
            angle: Math.random() * 360,
            distance: 0.28 + Math.random() * 0.68,
            strength: 1,
          });
        }
        return decayed;
      });
    }, 900);

    // Execution engine: occasionally turn a high-confidence signal into a trade.
    const tradeTimer = setInterval(() => {
      setSignals((prevSignals) => {
        const strong = prevSignals.find((s) => s.confidence > 0.78);
        if (!strong) return prevSignals;

        setAssets((prevAssets) => {
          const idx = prevAssets.findIndex((a) => a.symbol === strong.symbol);
          const price =
            idx >= 0
              ? prevAssets[idx].price
              : UNIVERSE.find((u) => u.symbol === strong.symbol)?.price ?? 100;
          const amount = +(Math.random() * (price > 1000 ? 0.05 : 40)).toFixed(4);

          setTrades((t) =>
            [
              {
                id: idRef.current++,
                symbol: strong.symbol,
                side: strong.side,
                price,
                amount,
                ts: Date.now(),
              },
              ...t,
            ].slice(0, 14)
          );

          if (idx < 0) return prevAssets;
          return prevAssets.map((a, i) =>
            i === idx
              ? {
                  ...a,
                  amount: Math.max(
                    0,
                    a.amount + (strong.side === "buy" ? amount : -amount)
                  ),
                  flow: clamp(
                    a.flow + (strong.side === "buy" ? 0.35 : -0.35),
                    -1,
                    1
                  ),
                }
              : a
          );
        });

        return prevSignals.filter((s) => s.id !== strong.id);
      });
    }, 2600);

    return () => {
      clearInterval(priceTimer);
      clearInterval(scanTimer);
      clearInterval(tradeTimer);
    };
  }, []);

  const totalValue = assets.reduce((sum, a) => sum + a.amount * a.price, 0);
  const pnl = assets.reduce((sum, a) => sum + (a.change / 100) * a.amount * a.price, 0);

  return { live, assets, signals, trades, totalValue, pnl, scanCount };
}
