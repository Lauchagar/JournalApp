-- global_counter expuesto a PostgREST: habilitar RLS y permitir solo lectura a usuarios autenticados.
-- Las escrituras siguen siendo vía RPC get_and_increment_counter / decrement_counter (SECURITY DEFINER).

ALTER TABLE global_counter ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_global_counter" ON global_counter;

CREATE POLICY "authenticated_select_global_counter"
  ON global_counter FOR SELECT
  TO authenticated
  USING (true);

-- Sin políticas de INSERT/UPDATE/DELETE para authenticated: no modificar la fila directamente.
