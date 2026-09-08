# CLAUDE.md

Guidance for Claude Code (and other AI assistants) working in this repository.

See also **[AGENTS.md](./AGENTS.md)** — it is the canonical agent instruction
file for this repo and takes precedence where the two overlap. Its key rule:
**do not run `npm run build` / `pnpm build` during an interactive agent
session**, because it swaps `.next/` to production assets and breaks the dev
server's hot reload. Use `pnpm dev` while iterating.

## What this repo is

A fork of the [agents.md](https://agents.md) marketing site — a Next.js
**Pages Router** app that documents the AGENTS.md open format — plus a
locally-added personal trading dashboard at `/dashboard`.

Note the two are unrelated in code: the landing page and the dashboard share
only the app shell (`pages/_app.tsx`) and global styles.

## Stack

- Next.js 16 (Pages Router, **not** App Router), React 19, TypeScript strict
- Tailwind CSS v4 — configured entirely through
  `@import "tailwindcss"` in `styles/globals.css` and the
  `@tailwindcss/postcss` plugin. There is **no `tailwind.config.js`**; add
  theme customizations as CSS in `globals.css`.
- pnpm 9 (see `packageManager` in `package.json`) — use pnpm, not npm/yarn,
  so `pnpm-lock.yaml` stays consistent.
- `@svgr/webpack` is a dependency for importing SVGs as components.
- `@vercel/analytics` is mounted in `_app.tsx`.

## Commands

| Command      | Purpose                                                   |
| ------------ | --------------------------------------------------------- |
| `pnpm dev`   | Dev server with Turbopack + HMR — **the default**          |
| `pnpm lint`  | `next lint`                                                |
| `pnpm build` | Production build — avoid during agent sessions (AGENTS.md) |
| `pnpm start` | Serve a production build                                   |

There is no test suite and no CI workflow in this repo. `pnpm lint` plus
`pnpm dev` (checking the page renders) is the practical verification path.

## Layout

```
pages/
  _app.tsx            # App shell: global CSS, site-wide <Head> meta, Vercel Analytics
  _document.tsx       # Custom document
  index.tsx           # Landing page; getStaticProps fetches GitHub contributors
  dashboard.tsx       # Personal trading dashboard ("Aurora Bot")
components/
  Hero, WhySection, CompatibilitySection, ExamplesSection,
  ExampleListSection, HowToUseSection, AboutSection, FAQSection,
  CodeExample, Section, Footer     # Landing page sections
  dashboard/
    useBotMarket.ts   # Front-end-only market simulation hook (the data source)
    BotScanner.tsx    # Radar-style signal visualisation
    FlowingPortfolio.tsx # Animated RGB portfolio view
    TradeFeed.tsx     # Rolling trade list
    StatCard.tsx, format.ts
  icons/              # Small SVG icon components
styles/globals.css    # Tailwind import, @font-face declarations, custom classes
public/logos/         # Per-tool logos for the compatibility grid (light/dark variants)
```

Path alias: `@/*` → repo root (e.g. `@/components/Hero`, `@/styles/globals.css`).
Note this maps to the root, not to a `src/` directory.

## Conventions

- Function components with named default exports, TypeScript `.tsx`, props
  typed via an explicit `interface` above the component.
- Styling is Tailwind utility classes inline. Bespoke visual effects for the
  dashboard (`dash-root`, `dash-aurora`, `dash-logo`, …) are defined as custom
  classes in `styles/globals.css`.
- Landing page sections are self-contained components composed in
  `pages/index.tsx`; add a new section by creating a component and slotting it
  into that list.
- Adding a tool to the compatibility grid means dropping an SVG into
  `public/logos/` (with `-dark`/`-light` variants where the mark needs them)
  and referencing it from `CompatibilitySection.tsx`.

## Gotchas

- **The dashboard has no backend.** `useBotMarket.ts` fabricates prices,
  signals, and trades client-side. It renders from fixed `SEED_*` constants on
  the server and first client render, and only starts randomising *after*
  mount — this is deliberate, to avoid React hydration mismatches. Preserve
  that pattern if you extend it; introducing `Math.random()` or `Date.now()`
  into the initial render will produce hydration errors.
- Despite the repo name ("add trading bot to backend"), no backend exists here.
  The real trading bot lives in the separate `memecoin-trading-bot` repository.
- `index.tsx` calls the GitHub API in `getStaticProps` and keeps an in-process
  cache to avoid rate limits during development. Unauthenticated GitHub
  requests can fail in sandboxed environments — the page is written to degrade
  gracefully, so keep it that way.
- Fonts are loaded over the network from `cdn.openai.com` in `globals.css`;
  they will silently fall back offline.
- This is a fork of an upstream project. Keep changes to the landing-page
  components minimal and focused so future upstream merges stay tractable;
  new local work belongs under `components/dashboard/`.
