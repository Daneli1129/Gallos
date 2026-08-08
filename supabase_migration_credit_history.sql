-- ================================================================================
--   GALLO GOLD — MIGRACIÓN: Historial de Créditos y Pagos de Apostadores
--   Ejecutar en el SQL Editor de Supabase
-- ================================================================================

CREATE TABLE IF NOT EXISTS public.historial_credito (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jugador_id VARCHAR(20) NOT NULL REFERENCES public.jugadores(id) ON DELETE CASCADE,
  tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('pago', 'limite_modificado', 'apuesta_credito', 'desbloqueo', 'bloqueo')),
  monto DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  deuda_despues DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  limite_despues DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  nota TEXT,
  registrado_por INT REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para búsquedas rápidas por jugador y fecha
CREATE INDEX IF NOT EXISTS idx_historial_credito_jugador ON public.historial_credito(jugador_id);
CREATE INDEX IF NOT EXISTS idx_historial_credito_created ON public.historial_credito(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.historial_credito ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "historial_credito_select_auth" ON public.historial_credito 
  FOR SELECT USING (get_user_role() IS NOT NULL);

CREATE POLICY "historial_credito_insert_auth" ON public.historial_credito 
  FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'empleado'));

CREATE POLICY "historial_credito_delete_admin" ON public.historial_credito 
  FOR DELETE USING (get_user_role() = 'admin');
