-- ================================================================================
--   MIGRACIÓN: Vista de Espectadores (player-view) + RLS fix
--   Ejecutar en el SQL Editor de Supabase en orden.
-- ================================================================================

-- ── PASO 1: player_pin en configuraciones ──
INSERT INTO public.configuraciones (clave, valor)
SELECT 'player_pin', '123456'
WHERE NOT EXISTS (SELECT 1 FROM configuraciones WHERE clave = 'player_pin');

-- ── PASO 2: RPC con SECURITY DEFINER ──
CREATE OR REPLACE FUNCTION public.get_player_view_data(p_pin TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pin TEXT;
  v_result JSONB;
BEGIN
  SELECT valor INTO v_pin FROM configuraciones WHERE clave = 'player_pin';
  IF v_pin IS NULL OR v_pin != p_pin THEN
    RAISE EXCEPTION 'PIN inválido';
  END IF;
  SELECT jsonb_build_object(
    'peleas', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'num', p.numero_pelea,
        'estado', p.estado,
        'ganador', p.ganador,
        'apuestas', COALESCE(
          (SELECT jsonb_agg(jsonb_build_object(
            'jugador_nombre', j.nombre,
            'bando', a.bando,
            'monto', COALESCE(NULLIF(a.monto_total, 0), a.monto, 0),
            'resultado', a.resultado
          ))
          FROM apuestas a
          JOIN jugadores j ON j.id = a.jugador_id
          WHERE a.pelea_id = p.id
          ), '[]'::jsonb)
      ))
      FROM (
        SELECT * FROM peleas WHERE created_at::date = CURRENT_DATE ORDER BY numero_pelea DESC
      ) p), '[]'::jsonb
    )
  ) INTO v_result;
  RETURN v_result;
END;
$$;

-- ── PASO 3: RLS — empleado también necesita escribir configuraciones ──
DROP POLICY IF EXISTS configuraciones_write_admin ON public.configuraciones;
CREATE POLICY configuraciones_write_authorized ON public.configuraciones
  FOR ALL
  USING (get_user_role() IN ('admin', 'empleado'))
  WITH CHECK (get_user_role() IN ('admin', 'empleado'));
