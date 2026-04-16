-- Change entry_type from single text to text array for multi-select
ALTER TABLE trades DROP CONSTRAINT IF EXISTS trades_entry_type_check;
ALTER TABLE trades ALTER COLUMN entry_type TYPE text[] USING ARRAY[entry_type];
ALTER TABLE trades ALTER COLUMN entry_type SET DEFAULT '{}';

-- Create journal_images storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('journal-images', 'journal-images', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "Authenticated users can upload journal images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'journal-images');

CREATE POLICY "Anyone can view journal images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'journal-images');

CREATE POLICY "Authenticated users can delete journal images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'journal-images');
