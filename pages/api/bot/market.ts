import type { NextApiRequest, NextApiResponse } from "next";

import { fetchTrending } from "@/lib/bot/client";
import { methodAllowed, respondWithBot } from "@/lib/bot/route";
import type { BotEnvelope, BotTrendingToken } from "@/lib/bot/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BotEnvelope<BotTrendingToken[]>>
) {
  if (!methodAllowed(req, res, ["GET"])) return;
  await respondWithBot(res, fetchTrending);
}
