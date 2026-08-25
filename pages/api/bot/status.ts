import type { NextApiRequest, NextApiResponse } from "next";

import { fetchHealth } from "@/lib/bot/client";
import { methodAllowed, respondWithBot } from "@/lib/bot/route";
import type { BotEnvelope } from "@/lib/bot/types";

interface BotStatus {
  status: string;
  timestamp: number;
}

/**
 * Cheap liveness probe the dashboard polls to decide between live and
 * simulated mode. Unauthenticated on the bot's side, so it answers even when
 * the dashboard password is wrong — which makes it useful for telling
 * "bot is down" apart from "bot is up but I can't log in".
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BotEnvelope<BotStatus>>
) {
  if (!methodAllowed(req, res, ["GET"])) return;
  await respondWithBot(res, fetchHealth);
}
