import type { NextApiRequest, NextApiResponse } from "next";

import { fetchPortfolio } from "@/lib/bot/client";
import { methodAllowed, respondWithBot } from "@/lib/bot/route";
import type { BotEnvelope, BotPortfolio } from "@/lib/bot/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BotEnvelope<BotPortfolio>>
) {
  if (!methodAllowed(req, res, ["GET"])) return;
  await respondWithBot(res, fetchPortfolio);
}
