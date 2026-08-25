import type { NextApiRequest, NextApiResponse } from "next";

import { BotUnavailableError, isConfigured } from "./client";
import type { BotEnvelope } from "./types";

/**
 * Wraps a bot API call in the envelope every `/api/bot/*` route returns.
 *
 * A missing or unreachable bot is a normal state, not a server error: the
 * dashboard is designed to fall back to its simulation, so those cases come
 * back as HTTP 200 with `connected: false` and a message the UI can show.
 * Only genuinely unexpected failures produce a 500.
 */
export async function respondWithBot<T>(
  res: NextApiResponse<BotEnvelope<T>>,
  load: () => Promise<T>
): Promise<void> {
  if (!isConfigured()) {
    res.status(200).json({
      connected: false,
      data: null,
      error: "No bot configured. Set BOT_API_URL and BOT_DASHBOARD_PASSWORD to go live.",
    });
    return;
  }

  try {
    const data = await load();
    // The bot's own numbers change constantly; never let a CDN or the browser
    // serve a stale portfolio.
    res.setHeader("cache-control", "no-store");
    res.status(200).json({ connected: true, data });
  } catch (error) {
    if (error instanceof BotUnavailableError) {
      res.status(200).json({ connected: false, data: null, error: error.message });
      return;
    }
    res.status(500).json({
      connected: false,
      data: null,
      error: "Unexpected error talking to the bot API.",
    });
  }
}

/** Rejects any method the route does not implement. */
export function methodAllowed(
  req: NextApiRequest,
  res: NextApiResponse,
  allowed: string[]
): boolean {
  if (allowed.includes(req.method ?? "GET")) return true;
  res.setHeader("allow", allowed.join(", "));
  res.status(405).json({ connected: false, data: null, error: `Method ${req.method} not allowed.` });
  return false;
}
