-- Bucket para imágenes pegadas en el editor TipTap
INSERT INTO storage.buckets (id, name, public)
VALUES ('journal_images', 'journal_images', true)
ON CONFLICT (id) DO NOTHING;

-- Policies pueden existir si ya corriste una migración previa
DROP POLICY IF EXISTS "Authenticated users can upload journal images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view journal images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete journal images" ON storage.objects;

CREATE POLICY "Authenticated users can upload journal images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'journal_images');

CREATE POLICY "Anyone can view journal images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'journal_images');

CREATE POLICY "Authenticated users can delete journal images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'journal_images');

