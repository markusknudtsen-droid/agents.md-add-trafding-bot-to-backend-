import type { NextApiRequest, NextApiResponse } from "next";

import { fetchSettings, updateSettings } from "@/lib/bot/client";
import { methodAllowed, respondWithBot } from "@/lib/bot/route";
import type { BotEnvelope, BotSettings } from "@/lib/bot/types";

/**
 * Fields this dashboard is allowed to change on the bot.
 *
 * Deliberately excludes `private_withdrawal_address`: that field decides
 * where SOL goes, and nothing reachable from a browser should be able to
 * repoint it. Withdrawals stay in the bot's own Vault Portal, which requires
 * a separate confirmation code — this dashboard never proxies those routes.
 */
const BOOLEAN_FIELDS = ["active_status", "override_enabled"] as const;
const NUMERIC_FIELDS = [
  "buy_amount_sol",
  "min_confidence",
  "stop_loss_percent",
  "take_profit_percent",
] as const;

const EDITABLE: string[] = [...BOOLEAN_FIELDS, ...NUMERIC_FIELDS];

function pickEditable(body: unknown): Partial<BotSettings> {
  if (!body || typeof body !== "object") return {};
  const source = body as Record<string, unknown>;
  const patch: Partial<BotSettings> = {};

  for (const key of BOOLEAN_FIELDS) {
    const value = source[key];
    if (typeof value === "boolean") patch[key] = value;
  }
  for (const key of NUMERIC_FIELDS) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) patch[key] = value;
  }
  return patch;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BotEnvelope<BotSettings>>
) {
  if (!methodAllowed(req, res, ["GET", "PUT"])) return;

  if (req.method === "PUT") {
    const patch = pickEditable(req.body);
    if (Object.keys(patch).length === 0) {
      res.status(400).json({
        connected: false,
        data: null,
        error: `No editable settings in request. Allowed: ${EDITABLE.join(", ")}.`,
      });
      return;
    }
    await respondWithBot(res, () => updateSettings(patch));
    return;
  }

  await respondWithBot(res, fetchSettings);
}
