export interface Trade {
  id: string;
  trade_number: number;
  date: string;
  units: number;
  direction: "Buy" | "Sell";
  result: "Stop Loss" | "Stop Loss - Error" | "Profit" | "Stop Loss - Positivo" | "BE";
  pnl: number;
  entry_type: string[];
  entry_time: string;
  operation_type: "Demo" | "PA";
  comments: string | null;
  photo_urls: string[];
  user_id: string;
  created_at: string;
}

export interface FundingAccount {
  id: string;
  user_id: string;
  name: string;
  initial_balance: number;
  account_type: "Evaluación" | "PA";
  start_date: string;
  is_active: boolean;
  created_at: string;
}

export interface DailyNote {
  id: string;
  user_id: string;
  date: string;
  content: string | null;
  created_at: string;
}

export interface NewsEvent {
  title: string;
  country: string;
  date: string;
  time: string;
  impact: string;
  forecast: string;
  previous: string;
}
