/**
 * Response shapes returned by the trading bot's dashboard API
 * (the `server/` Express app in the private bot repository).
 *
 * These mirror the bot's JSON exactly — snake_case included — so the proxy
 * layer stays a thin pass-through and any drift shows up as a type error
 * rather than a silently empty widget.
 */

export interface BotPosition {
  token_address: string;
  symbol: string;
  chain_id: string;
  /** Size of the position, denominated in SOL. */
  balance: number;
  entry_price: number;
  current_price: number;
  current_value: number;
  pnl_percent: number;
  stop_loss: number;
  take_profit: number;
  entry_time: number;
  status: "in_profit" | "at_loss";
}

export interface BotPortfolio {
  positions: BotPosition[];
  summary: {
    total_positions: number;
    total_value_sol: number;
    total_cost_sol: number;
    pnl_percent: number;
  };
}

export interface BotTrade {
  id: string;
  type: string;
  pair: string;
  amount_sol?: number;
  price?: number;
  paper?: boolean;
  pnl_percent?: number;
  timestamp: number;
  confidence?: number;
  outcome: string;
  tx_signature?: string;
}

export interface BotTradePage {
  items: BotTrade[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface BotTrendingToken {
  address: string;
  symbol: string;
  name: string;
  chain_id: string;
  price_usd: number;
  price_change_24h: number;
  volume_24h: number;
  liquidity_usd: number;
  /** > 1 means more buys than sells over 24h. */
  buy_to_sell_ratio: number;
  age_hours: number;
  url: string;
}

export interface BotSettings {
  active_status: boolean;
  buy_amount_sol: number;
  override_enabled: boolean;
  private_withdrawal_address: string;
  min_confidence: number;
  stop_loss_percent: number;
  take_profit_percent: number;
  updated_at: number;
}

/** Envelope every `/api/bot/*` proxy route returns. */
export interface BotEnvelope<T> {
  connected: boolean;
  data: T | null;
  /** Present when `connected` is false, safe to show in the UI. */
  error?: string;
}
