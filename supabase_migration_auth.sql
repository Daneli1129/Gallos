-- ================================================================================
--   MIGRACIÓN: Supabase Auth + RLS + bcrypt (pgcrypto)
--   Ejecutar en el SQL Editor de Supabase
-- ================================================================================

-- 1. Habilitar pgcrypto (para bcrypt si se necesita a nivel DB)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ================================================================================
--   TABLA usuarios — agregar auth_id para vincular con Supabase Auth
-- ================================================================================
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

-- ================================================================================
--   FUNCIÓN helper: obtener rol del usuario autenticado
-- ================================================================================
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE SQL STABLE
AS $$
  SELECT rol FROM public.usuarios WHERE auth_id = auth.uid() LIMIT 1;
$$;

-- ================================================================================
--   FUNCIÓN helper: obtener ID del usuario autenticado en la tabla usuarios
-- ================================================================================
CREATE OR REPLACE FUNCTION public.get_usuario_id()
RETURNS INT
LANGUAGE SQL STABLE
AS $$
  SELECT id FROM public.usuarios WHERE auth_id = auth.uid() LIMIT 1;
$$;

-- ================================================================================
--   NUEVAS POLÍTICAS RLS — basadas en auth.uid()
-- ================================================================================

-- ── Remover políticas antiguas (todo USING true) ──
DROP POLICY IF EXISTS "anon_select" ON usuarios;
DROP POLICY IF EXISTS "anon_update" ON usuarios;
DROP POLICY IF EXISTS "usuarios_select" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_update" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_insert" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_delete" ON public.usuarios;
DROP POLICY IF EXISTS "jugadores_select" ON public.jugadores;
DROP POLICY IF EXISTS "jugadores_insert" ON public.jugadores;
DROP POLICY IF EXISTS "jugadores_update" ON public.jugadores;
DROP POLICY IF EXISTS "jugadores_delete" ON public.jugadores;
DROP POLICY IF EXISTS "peleas_select" ON public.peleas;
DROP POLICY IF EXISTS "peleas_insert" ON public.peleas;
DROP POLICY IF EXISTS "peleas_update" ON public.peleas;
DROP POLICY IF EXISTS "peleas_delete" ON public.peleas;
DROP POLICY IF EXISTS "apuestas_select" ON public.apuestas;
DROP POLICY IF EXISTS "apuestas_insert" ON public.apuestas;
DROP POLICY IF EXISTS "apuestas_update" ON public.apuestas;
DROP POLICY IF EXISTS "apuestas_delete" ON public.apuestas;
DROP POLICY IF EXISTS "bitacora_select" ON public.bitacora;
DROP POLICY IF EXISTS "bitacora_insert" ON public.bitacora;
DROP POLICY IF EXISTS "bitacora_update" ON public.bitacora;
DROP POLICY IF EXISTS "bitacora_delete" ON public.bitacora;

-- ── Asegurar RLS habilitado ──
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jugadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peleas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apuestas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bitacora ENABLE ROW LEVEL SECURITY;

-- ── usuarios: solo el propio usuario puede ver/editar su registro ──
CREATE POLICY "usuarios_select_own" ON public.usuarios
  FOR SELECT USING (auth.uid() = auth_id);

CREATE POLICY "usuarios_update_own" ON public.usuarios
  FOR UPDATE USING (auth.uid() = auth_id);

-- Para login inicial (buscar auth_id por username), necesitamos que anon pueda SELECT solo username y auth_id
-- En realidad: después del login con Supabase Auth, el cliente usa auth.uid()
-- No se necesita SELECT público. El login se hace vía Supabase Auth.

-- ── jugadores: todos los usuarios autenticados pueden ver ──
CREATE POLICY "jugadores_select_auth" ON public.jugadores
  FOR SELECT USING (get_user_role() IS NOT NULL);

CREATE POLICY "jugadores_insert_auth" ON public.jugadores
  FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'empleado'));

CREATE POLICY "jugadores_update_auth" ON public.jugadores
  FOR UPDATE USING (get_user_role() IN ('admin', 'empleado'));

CREATE POLICY "jugadores_delete_auth" ON public.jugadores
  FOR DELETE USING (get_user_role() = 'admin');

-- ── peleas: todos los usuarios autenticados pueden ver, admin/empleado pueden modificar ──
CREATE POLICY "peleas_select_auth" ON public.peleas
  FOR SELECT USING (get_user_role() IS NOT NULL);

CREATE POLICY "peleas_insert_auth" ON public.peleas
  FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'empleado'));

CREATE POLICY "peleas_update_auth" ON public.peleas
  FOR UPDATE USING (get_user_role() IN ('admin', 'empleado'));

CREATE POLICY "peleas_delete_auth" ON public.peleas
  FOR DELETE USING (get_user_role() IN ('admin', 'empleado'));

-- ── apuestas: todos los usuarios autenticados pueden ver ──
CREATE POLICY "apuestas_select_auth" ON public.apuestas
  FOR SELECT USING (get_user_role() IS NOT NULL);

CREATE POLICY "apuestas_insert_auth" ON public.apuestas
  FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'empleado'));

CREATE POLICY "apuestas_update_auth" ON public.apuestas
  FOR UPDATE USING (get_user_role() IN ('admin', 'empleado'));

CREATE POLICY "apuestas_delete_auth" ON public.apuestas
  FOR DELETE USING (get_user_role() IN ('admin', 'empleado'));

-- ── bitacora: todos los usuarios autenticados pueden ver ──
CREATE POLICY "bitacora_select_auth" ON public.bitacora
  FOR SELECT USING (get_user_role() IS NOT NULL);

CREATE POLICY "bitacora_insert_auth" ON public.bitacora
  FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'empleado'));

-- Política especial para anon: puede insertar intentos fallidos de login
CREATE POLICY "bitacora_insert_anon_failed_auth" ON public.bitacora
  FOR INSERT WITH CHECK (
    get_user_role() IS NULL
    AND tipo = 'auth_failed'
  );

CREATE POLICY "bitacora_update_auth" ON public.bitacora
  FOR UPDATE USING (get_user_role() = 'admin');

CREATE POLICY "bitacora_delete_auth" ON public.bitacora
  FOR DELETE USING (get_user_role() = 'admin');

-- ================================================================================
--   SEED DATA — solo usuarios de ejemplo (sin contraseñas en texto plano)
--   Las contraseñas se crean desde el Dashboard de Supabase Auth
-- ================================================================================
-- Insert solo si no existen
INSERT INTO usuarios (username, password_hash, nombre_completo, rol)
SELECT 'eliaglz', '', 'Elián González', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE username = 'eliaglz');

INSERT INTO usuarios (username, password_hash, nombre_completo, rol)
SELECT 'vgonzalez', '', 'Vanessa González', 'empleado'
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE username = 'vgonzalez');

-- IMPORTANTE: Después de ejecutar esta migración:
-- 1. Ir a Supabase Dashboard → Authentication → Users
-- 2. Crear usuarios con email = username@gallogold.local y la contraseña deseada
-- 3. Ejecutar: UPDATE usuarios SET auth_id = (SELECT id FROM auth.users WHERE email = username || '@gallogold.local') WHERE auth_id IS NULL;
