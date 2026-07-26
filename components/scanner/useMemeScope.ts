import { useEffect, useRef, useState } from "react";

/**
 * Front-end-only simulation of a meme-token scanner feed.
 *
 * Tokens move through three lifecycle stages — freshly minted, climbing the
 * bonding curve ("graduating"), and fully graduated to a DEX pool. Each token
 * carries live buy/sell pressure that the UI renders as RGB light, matching
 * the treatment used on the trading dashboard.
 *
 * All randomness is deferred until after mount so the server render and the
 * first client render agree (no hydration mismatch).
 */

export type Stage = "new" | "graduating" | "graduated";

export interface Token {
  id: number;
  symbol: string;
  name: string;
  glyph: string;
  stage: Stage;
  /** Seconds since the token was minted. */
  age: number;
  marketCap: number;
  volume: number;
  liquidity: number;
  holders: number;
  buys: number;
  sells: number;
  /** Bonding-curve completion, 0-100. Reaches 100 to graduate. */
  progress: number;
  /** Percentage price change over the token's life. */
  change: number;
  /** Net buy/sell pressure in [-1, 1]: positive = buying. */
  pressure: number;
  /** Set briefly when the token just entered the feed, to flash the card. */
  fresh: boolean;
}

const NAMES: Array<[string, string, string]> = [
  ["WOJAK", "Wojak Finance", "😔"],
  ["PEPE", "Pepe Supreme", "🐸"],
  ["MOONR", "Moon Runner", "🌙"],
  ["DOGGO", "Doggo Inu", "🐕"],
  ["CHAD", "Gigachad", "💪"],
  ["BONKR", "Bonk Rocket", "🚀"],
  ["FROGE", "Froge Coin", "🐸"],
  ["CATNP", "Catnip", "🐱"],
  ["BANAN", "Banana Bill", "🍌"],
  ["TURBO", "Turbo Cat", "⚡"],
  ["SNEK", "Snek Money", "🐍"],
  ["GIGA", "Giga Brain", "🧠"],
  ["MYRAD", "Myriad", "🔮"],
  ["ZOOM", "Zoomer", "📈"],
  ["HODLR", "Hodler", "🗿"],
];

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

/** Deterministic seed so SSR and the first client paint match exactly. */
function seedTokens(): Token[] {
  const spec: Array<[number, Stage, number, number, number, number, number]> = [
    // [nameIdx, stage, age, marketCap, progress, change, pressure]
    [0, "new", 8, 4200, 6, 12, 0.6],
    [1, "new", 24, 7800, 14, 32, 0.4],
    [2, "new", 51, 12400, 22, -8, -0.3],
    [3, "graduating", 220, 41000, 68, 84, 0.7],
    [4, "graduating", 410, 58200, 82, 140, 0.5],
    [5, "graduating", 505, 66900, 91, -12, -0.4],
    [6, "graduated", 1900, 184000, 100, 320, 0.3],
    [7, "graduated", 3400, 262000, 100, 512, -0.2],
    [8, "graduated", 5200, 96000, 100, -34, -0.6],
  ];

  return spec.map(([idx, stage, age, marketCap, progress, change, pressure], i) => {
    const [symbol, name, glyph] = NAMES[idx];
    return {
      id: i + 1,
      symbol,
      name,
      glyph,
      stage,
      age,
      marketCap,
      volume: Math.round(marketCap * 0.6),
      liquidity: Math.round(marketCap * 0.22),
      holders: 20 + Math.round(marketCap / 900),
      buys: 40 + i * 17,
      sells: 20 + i * 9,
      progress,
      change,
      pressure,
      fresh: false,
    };
  });
}

export interface MemeScope {
  live: boolean;
  tokens: Token[];
  minted: number;
  graduated: number;
  totalVolume: number;
}

export function useMemeScope(): MemeScope {
  const [tokens, setTokens] = useState<Token[]>(seedTokens);
  const [live, setLive] = useState(false);
  const [minted, setMinted] = useState(0);
  const [graduated, setGraduated] = useState(0);
  const idRef = useRef(100);

  useEffect(() => {
    setLive(true);

    // Market tick: age tokens, move price/volume, advance the bonding curve
    // and promote tokens between stages.
    const tick = setInterval(() => {
      setTokens((prev) => {
        let justGraduated = 0;

        const next = prev.map((t) => {
          const pressure = clamp(t.pressure * 0.85 + (Math.random() - 0.5) * 0.6, -1, 1);
          const drift = pressure * (Math.random() * 6);
          const marketCap = Math.max(800, t.marketCap * (1 + drift / 100));
          const isBuy = pressure >= 0;

          // Bonding-curve progress only applies pre-graduation and tracks
          // buy pressure — selling can stall or reverse it.
          let progress = t.progress;
          let stage = t.stage;
          if (stage !== "graduated") {
            progress = clamp(progress + pressure * (0.6 + Math.random() * 2.2), 0, 100);
            if (stage === "new" && progress > 30) stage = "graduating";
            if (progress >= 100) {
              stage = "graduated";
              justGraduated += 1;
            }
          }

          return {
            ...t,
            stage,
            progress,
            pressure,
            marketCap,
            change: clamp(t.change + drift, -95, 4000),
            volume: t.volume + Math.round(Math.random() * marketCap * 0.05),
            liquidity: Math.round(marketCap * (0.18 + Math.random() * 0.08)),
            holders: t.holders + (Math.random() < 0.45 ? 1 + Math.floor(Math.random() * 4) : 0),
            buys: t.buys + (isBuy ? Math.floor(Math.random() * 5) : 0),
            sells: t.sells + (!isBuy ? Math.floor(Math.random() * 4) : 0),
            age: t.age + 1,
            fresh: false,
          };
        });

        if (justGraduated > 0) setGraduated((g) => g + justGraduated);

        // Retire the oldest graduated tokens so the column stays readable.
        const grads = next.filter((t) => t.stage === "graduated");
        if (grads.length > 6) {
          const cutoff = [...grads].sort((a, b) => b.age - a.age)[0];
          return next.filter((t) => t.id !== cutoff.id);
        }
        return next;
      });
    }, 1000);

    // Mint fresh tokens into the "new" column.
    const mint = setInterval(() => {
      setTokens((prev) => {
        if (prev.filter((t) => t.stage === "new").length >= 6) return prev;

        const [symbol, name, glyph] = NAMES[Math.floor(Math.random() * NAMES.length)];
        const marketCap = 1500 + Math.random() * 6000;
        setMinted((m) => m + 1);

        return [
          {
            id: idRef.current++,
            symbol,
            name,
            glyph,
            stage: "new" as Stage,
            age: 0,
            marketCap,
            volume: Math.round(marketCap * 0.3),
            liquidity: Math.round(marketCap * 0.2),
            holders: 1 + Math.floor(Math.random() * 12),
            buys: Math.floor(Math.random() * 12),
            sells: Math.floor(Math.random() * 4),
            progress: Math.random() * 8,
            change: Math.random() * 40 - 8,
            pressure: 0.3 + Math.random() * 0.5,
            fresh: true,
          },
          ...prev,
        ];
      });
    }, 3200);

    return () => {
      clearInterval(tick);
      clearInterval(mint);
    };
  }, []);

  const totalVolume = tokens.reduce((sum, t) => sum + t.volume, 0);

  return { live, tokens, minted, graduated, totalVolume };
}
