-- Notas diarias para días sin trades (comentarios/posibles entradas)
CREATE TABLE daily_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  content text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE daily_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own daily notes"
  ON daily_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert their daily notes"
  ON daily_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their daily notes"
  ON daily_notes FOR UPDATE
  USING (auth.uid() = user_id);

