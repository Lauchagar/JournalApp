CREATE TABLE funding_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  initial_balance numeric(12,2) NOT NULL,
  account_type text CHECK (account_type IN ('Evaluación', 'PA')) NOT NULL,
  start_date date NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE funding_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own funding accounts"
  ON funding_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own funding accounts"
  ON funding_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own funding accounts"
  ON funding_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own funding accounts"
  ON funding_accounts FOR DELETE
  USING (auth.uid() = user_id);
