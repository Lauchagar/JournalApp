-- Índices para las queries más frecuentes (filtros por user_id + date / created_at)
CREATE INDEX IF NOT EXISTS idx_trades_user_date
  ON trades(user_id, date);

CREATE INDEX IF NOT EXISTS idx_trades_user_created
  ON trades(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_daily_notes_user_date
  ON daily_notes(user_id, date);

CREATE INDEX IF NOT EXISTS idx_funding_accounts_user
  ON funding_accounts(user_id);
