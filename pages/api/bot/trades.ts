import type { NextApiRequest, NextApiResponse } from "next";

import { fetchTrades } from "@/lib/bot/client";
import { methodAllowed, respondWithBot } from "@/lib/bot/route";
import type { BotEnvelope, BotTradePage } from "@/lib/bot/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BotEnvelope<BotTradePage>>
) {
  if (!methodAllowed(req, res, ["GET"])) return;

  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));

  await respondWithBot(res, () => fetchTrades(page, pageSize));
}
