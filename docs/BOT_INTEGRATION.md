# Wiring the dashboard to the trading bot

The `/dashboard` and `/scanner` pages can run against a real Solana memecoin
trading bot instead of their built-in simulation. This document explains how
the two halves fit together and how to switch modes.

## How it fits together

The bot and the dashboard stay in separate repositories on purpose:

```
Browser  ──►  Next.js dashboard (this repo, public)
                   │
                   │  pages/api/bot/*  ← credentials live here, server-side only
                   ▼
              Bot dashboard API (private repo, Express)
                   │
                   ▼
              DexScreener · Jupiter · Solana wallet
```

The browser never talks to the bot directly and never receives its password.
Each page fetches this app's own `/api/bot/*` routes, which log into the bot
server-side with a bearer token and proxy the response back.

That split is deliberate: **this repository is public**, while the bot handles
Solana private keys and an encrypted wallet vault. Keeping the bot's code and
secrets in its own private repo means nothing sensitive is ever published here.

## Going live

1. Start the bot's dashboard API (in the bot repo):

   ```bash
   npm run server:dev     # or: npm run server:build && npm run server:start
   ```

2. Point this app at it — copy `.env.example` to `.env.local` and fill it in:

   ```bash
   BOT_API_URL=http://localhost:4000
   BOT_DASHBOARD_PASSWORD=the-password-you-hashed-for-the-bot
   ```

   `BOT_DASHBOARD_PASSWORD` is the plaintext password matching the bot's
   `DASHBOARD_PASSWORD_HASH`. `.env.local` is gitignored.

3. Start this app:

   ```bash
   pnpm dev
   ```

Open http://localhost:3000/dashboard. The header badge tells you which mode
you are in:

| Badge | Meaning |
|-------|---------|
| 🟢 **LIVE BOT** | Real positions, fills and scan candidates from your bot. |
| 🟡 **SIMULATED** | No bot reachable — generated data. Hover for the reason. |

The two modes render identical widgets, so the badge is the only thing
separating a real Solana position from a fabricated one. It is intentionally
loud.

## What each page shows when live

**`/dashboard`**

- **Position Value / Unrealised P&L** — from `/api/portfolio`, in SOL (`◎`).
- **Flowing Portfolio** — one row per open position. The RGB glow tracks how
  far the position has run toward its take-profit (green) or slid toward its
  stop-loss (red), so the lighting reports real risk.
- **Signal Scanner** — the bot's live DexScreener candidates. Confidence comes
  from the real buy/sell ratio; a blip sits closer to the centre the deeper
  the pool's liquidity.
- **Execution Feed** — real fills, sized in SOL.
- **Pause / Resume** — writes the bot's own pause gate. While paused the bot
  keeps monitoring open positions for stop-loss and take-profit but opens no
  new trades.

**`/scanner`**

The three columns become a maturity funnel over the bot's live candidates:
fresh pairs (under 24h), pairs building liquidity (under a week), and
established pools.

Fields the bot's scan feed does not carry — holder counts, market cap and
absolute transaction counts — render as `—` rather than being invented. The
buy/sell bar shows the real ratio as a share.

## Safety boundaries

- **No money can move from this dashboard.** The bot's vault and withdrawal
  routes are deliberately not proxied. Withdrawals stay in the bot's own Vault
  Portal, which requires a separate confirmation code.
- **The withdrawal address cannot be changed here.** `/api/bot/settings`
  accepts an allowlist covering only the pause gate and risk thresholds
  (`active_status`, `override_enabled`, `buy_amount_sol`, `min_confidence`,
  `stop_loss_percent`, `take_profit_percent`).
- **Credentials are server-only.** `BOT_API_URL` and `BOT_DASHBOARD_PASSWORD`
  have no `NEXT_PUBLIC_` prefix, so Next.js never bundles them for the browser.

## Failure behaviour

An unconfigured, unreachable, or unauthenticated bot is treated as a normal
state, not an error: `/api/bot/*` returns HTTP 200 with
`{ connected: false, error: "..." }`, and the pages fall back to simulation
with the amber badge. Hovering the badge shows which of the three it was. If
the bot disappears mid-session the dashboard drops back to simulation on the
next poll rather than freezing on stale numbers.
