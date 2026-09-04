import type { BotPortfolio, BotSettings, BotTradePage, BotTrendingToken } from "./types";

/**
 * Server-side client for the trading bot's dashboard API.
 *
 * This module must only ever be imported from `pages/api/**` — it reads the
 * dashboard password from the environment and holds a session token in
 * memory. Nothing here is safe to bundle into the browser, which is why the
 * dashboard talks to the bot through the `/api/bot/*` routes rather than
 * calling the bot directly.
 */

const LOGIN_PATH = "/api/auth/login";
const REQUEST_TIMEOUT_MS = 8_000;

/** Cached session token, refreshed on expiry or on a 401 from the bot. */
let session: { token: string; expiresAt: number } | null = null;

export class BotUnavailableError extends Error {}

function baseUrl(): string {
  const url = process.env.BOT_API_URL?.trim();
  if (!url) {
    throw new BotUnavailableError(
      "Bot API is not configured. Set BOT_API_URL (and BOT_DASHBOARD_PASSWORD) to connect this dashboard to your bot."
    );
  }
  return url.replace(/\/+$/, "");
}

function password(): string {
  const value = process.env.BOT_DASHBOARD_PASSWORD;
  if (!value) {
    throw new BotUnavailableError(
      "Bot API password is not configured. Set BOT_DASHBOARD_PASSWORD to the dashboard password you hashed with `npm run hash-password`."
    );
  }
  return value;
}

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(`${baseUrl()}${path}`, { ...init, signal: controller.signal });
  } catch (error) {
    // Surface connection problems as a clean, non-leaky message: the raw
    // cause can contain the bot's internal host/port.
    const reason = error instanceof Error && error.name === "AbortError" ? "timed out" : "is unreachable";
    throw new BotUnavailableError(`Bot API ${reason}. Is the bot's dashboard server running?`);
  } finally {
    clearTimeout(timeout);
  }
}

async function login(): Promise<string> {
  const response = await request(LOGIN_PATH, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password: password() }),
  });

  if (response.status === 401) {
    throw new BotUnavailableError("Bot API rejected the dashboard password. Check BOT_DASHBOARD_PASSWORD.");
  }
  if (!response.ok) {
    throw new BotUnavailableError(`Bot API login failed (HTTP ${response.status}).`);
  }

  const body = (await response.json()) as { token?: string; expiresIn?: number };
  if (!body.token) {
    throw new BotUnavailableError("Bot API login returned no session token.");
  }

  // Refresh a minute early so a request never races the expiry.
  const ttlSeconds = typeof body.expiresIn === "number" ? body.expiresIn : 3600;
  session = { token: body.token, expiresAt: Date.now() + Math.max(0, ttlSeconds - 60) * 1000 };
  return body.token;
}

async function token(): Promise<string> {
  if (session && session.expiresAt > Date.now()) return session.token;
  return login();
}

/**
 * Calls an authenticated bot endpoint, transparently re-authenticating once
 * if the cached session has been invalidated on the bot's side (e.g. the bot
 * restarted with a new JWT secret).
 */
async function authed<T>(path: string, init: RequestInit = {}): Promise<T> {
  const send = async (bearer: string) =>
    request(path, {
      ...init,
      headers: { ...init.headers, authorization: `Bearer ${bearer}` },
    });

  let response = await send(await token());

  if (response.status === 401) {
    session = null;
    response = await send(await token());
  }

  if (!response.ok) {
    throw new BotUnavailableError(`Bot API returned HTTP ${response.status} for ${path}.`);
  }

  return (await response.json()) as T;
}

export async function fetchPortfolio(): Promise<BotPortfolio> {
  return authed<BotPortfolio>("/api/portfolio");
}

export async function fetchTrades(page = 1, pageSize = 20): Promise<BotTradePage> {
  return authed<BotTradePage>(`/api/trades?page=${page}&pageSize=${pageSize}`);
}

export async function fetchTrending(): Promise<BotTrendingToken[]> {
  return authed<BotTrendingToken[]>("/api/market/trending");
}

export async function fetchSettings(): Promise<BotSettings> {
  return authed<BotSettings>("/api/settings");
}

export async function updateSettings(patch: Partial<BotSettings>): Promise<BotSettings> {
  return authed<BotSettings>("/api/settings", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch),
  });
}

export async function fetchHealth(): Promise<{ status: string; timestamp: number }> {
  const response = await request("/api/health");
  if (!response.ok) {
    throw new BotUnavailableError(`Bot API health check failed (HTTP ${response.status}).`);
  }
  return (await response.json()) as { status: string; timestamp: number };
}

/** True when the operator has configured a bot to talk to at all. */
export function isConfigured(): boolean {
  return Boolean(process.env.BOT_API_URL?.trim() && process.env.BOT_DASHBOARD_PASSWORD);
}
