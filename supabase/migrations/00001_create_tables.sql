-- Create trades table
CREATE TABLE trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_number integer NOT NULL,
  date date NOT NULL,
  units integer NOT NULL,
  direction text CHECK (direction IN ('Buy', 'Sell')) NOT NULL,
  result text CHECK (result IN ('Stop Loss', 'Stop Loss - Error', 'Profit', 'Stop Loss - Positivo', 'BE')) NOT NULL,
  pnl numeric(10,2) NOT NULL,
  entry_type text CHECK (entry_type IN ('OB', 'FVG', 'IFVG', 'CISD', 'SMT', 'SWEEP', 'Vela Superada')) NOT NULL,
  entry_time time NOT NULL,
  operation_type text CHECK (operation_type IN ('Demo', 'PA')) NOT NULL,
  comments text,
  photo_urls text[] DEFAULT '{}',
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Create global_counter table
CREATE TABLE global_counter (
  id integer PRIMARY KEY DEFAULT 1,
  next_number integer NOT NULL DEFAULT 1,
  CONSTRAINT single_row CHECK (id = 1)
);

-- Seed global_counter
INSERT INTO global_counter (id, next_number) VALUES (1, 1) ON CONFLICT DO NOTHING;

-- Enable RLS on trades
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own trades"
  ON trades FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trades"
  ON trades FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trades"
  ON trades FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trades"
  ON trades FOR DELETE
  USING (auth.uid() = user_id);

-- RPC: get_and_increment_counter
CREATE OR REPLACE FUNCTION get_and_increment_counter()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_number integer;
BEGIN
  UPDATE global_counter
  SET next_number = next_number + 1
  WHERE id = 1
  RETURNING next_number - 1 INTO current_number;

  RETURN current_number;
END;
$$;

-- RPC: decrement_counter
CREATE OR REPLACE FUNCTION decrement_counter()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE global_counter
  SET next_number = GREATEST(next_number - 1, 1)
  WHERE id = 1;
END;
$$;

-- Create storage bucket for trade photos
INSERT INTO storage.buckets (id, name, public) VALUES ('trade-photos', 'trade-photos', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "Authenticated users can upload trade photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'trade-photos');

CREATE POLICY "Anyone can view trade photos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'trade-photos');

CREATE POLICY "Authenticated users can delete trade photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'trade-photos');
