-- ================================================================================
--   GALLO GOLD — BRUNO'S
--   Esquema de Base de Datos para Supabase (PostgreSQL)
--   Versión con Supabase Auth + RLS + pgcrypto + Configuraciones + Mejoras
-- ================================================================================
--
--  ⚠️ NOTA DE MIGRACIÓN: Si ya tienes las tablas creadas en Supabase, ejecuta 
--  el siguiente script SQL en el SQL Editor de tu Dashboard de Supabase:
--
--  -- 1. Actualizar restricciones para admitir Empates y Cancelaciones
--  ALTER TABLE public.peleas DROP CONSTRAINT IF EXISTS peleas_ganador_check;
--  ALTER TABLE public.peleas ADD CONSTRAINT peleas_ganador_check CHECK (ganador IN ('verde', 'rojo', 'empate', 'anulada', NULL));
--
--  ALTER TABLE public.apuestas DROP CONSTRAINT IF EXISTS apuestas_resultado_check;
--  ALTER TABLE public.apuestas ADD CONSTRAINT apuestas_resultado_check CHECK (resultado IN ('pendiente', 'ganada', 'perdida', 'devuelta'));
--
--  -- 2. Crear tabla de configuraciones del sistema
--  CREATE TABLE IF NOT EXISTS public.configuraciones (
--      clave VARCHAR(50) PRIMARY KEY,
--      valor TEXT NOT NULL,
--      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
--  );
--
--  ALTER TABLE public.configuraciones ENABLE ROW LEVEL SECURITY;
--  CREATE POLICY "configuraciones_select_auth" ON public.configuraciones FOR SELECT USING (get_user_role() IS NOT NULL);
--  CREATE POLICY "configuraciones_write_admin" ON public.configuraciones FOR ALL USING (get_user_role() = 'admin');
--
--  -- 3. Valores iniciales de configuración
--  INSERT INTO public.configuraciones (clave, valor) VALUES 
--  ('comision_porcentaje', '10'),
--  ('limite_credito', '5000'),
--  ('pin_autorizacion', '8888')
--  ON CONFLICT (clave) DO NOTHING;
-- ================================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Tabla de Usuarios (Administradores y Empleados)
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL DEFAULT '',
    nombre_completo VARCHAR(100) NOT NULL,
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('admin', 'empleado')),
    esta_conectado BOOLEAN DEFAULT FALSE,
    ultimo_acceso TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Jugadores (Apostadores)
CREATE TABLE jugadores (
    id VARCHAR(20) PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    color VARCHAR(10) DEFAULT '#C9A84C',
    saldo_anterior DECIMAL(12, 2) DEFAULT 0.00,
    registrado_por INT REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla de Peleas
CREATE TABLE peleas (
    id SERIAL PRIMARY KEY,
    numero_pelea INT UNIQUE NOT NULL,
    estado VARCHAR(20) DEFAULT 'espera' CHECK (estado IN ('espera', 'activa', 'cerrada')),
    ganador VARCHAR(10) CHECK (ganador IN ('verde', 'rojo', 'empate', 'anulada', NULL)),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla de Apuestas
CREATE TABLE apuestas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pelea_id INT NOT NULL REFERENCES peleas(id) ON DELETE CASCADE,
    jugador_id VARCHAR(20) NOT NULL REFERENCES jugadores(id) ON DELETE RESTRICT,
    bando VARCHAR(10) NOT NULL CHECK (bando IN ('verde', 'rojo')),
    monto DECIMAL(12, 2) NOT NULL CHECK (monto > 0),
    resultado VARCHAR(20) DEFAULT 'pendiente' CHECK (resultado IN ('pendiente', 'ganada', 'perdida', 'devuelta')),
    autorizado_por INT REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabla de Configuraciones del sistema
CREATE TABLE configuraciones (
    clave VARCHAR(50) PRIMARY KEY,
    valor TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabla de Bitácora (Historial de movimientos)
CREATE TABLE bitacora (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL,
    mensaje TEXT NOT NULL,
    icon VARCHAR(10),
    usuario_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Índices
CREATE INDEX IF NOT EXISTS idx_apuestas_pelea ON apuestas(pelea_id);
CREATE INDEX IF NOT EXISTS idx_apuestas_jugador ON apuestas(jugador_id);
CREATE INDEX IF NOT EXISTS idx_bitacora_usuario ON bitacora(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_auth_id ON usuarios(auth_id);

-- 8. Funciones helper para RLS
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE SQL STABLE
AS $$
  SELECT rol FROM public.usuarios WHERE auth_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_usuario_id()
RETURNS INT
LANGUAGE SQL STABLE
AS $$
  SELECT id FROM public.usuarios WHERE auth_id = auth.uid() LIMIT 1;
$$;

-- 9. RLS Policies (basadas en auth.uid())
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jugadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peleas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apuestas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuraciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bitacora ENABLE ROW LEVEL SECURITY;

-- usuarios: todos los usuarios autenticados pueden ver, solo el propio usuario puede editar su registro
CREATE POLICY "usuarios_select_auth" ON public.usuarios FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "usuarios_update_own" ON public.usuarios FOR UPDATE USING (auth.uid() = auth_id);

-- jugadores: auth puede leer, admin/empleado insert/update, solo admin delete
CREATE POLICY "jugadores_select_auth" ON public.jugadores FOR SELECT USING (get_user_role() IS NOT NULL);
CREATE POLICY "jugadores_insert_auth" ON public.jugadores FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'empleado'));
CREATE POLICY "jugadores_update_auth" ON public.jugadores FOR UPDATE USING (get_user_role() IN ('admin', 'empleado'));
CREATE POLICY "jugadores_delete_auth" ON public.jugadores FOR DELETE USING (get_user_role() = 'admin');

-- peleas: auth puede leer, admin/empleado insert/update, solo admin delete
CREATE POLICY "peleas_select_auth" ON public.peleas FOR SELECT USING (get_user_role() IS NOT NULL);
CREATE POLICY "peleas_insert_auth" ON public.peleas FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'empleado'));
CREATE POLICY "peleas_update_auth" ON public.peleas FOR UPDATE USING (get_user_role() IN ('admin', 'empleado'));
CREATE POLICY "peleas_delete_auth" ON public.peleas FOR DELETE USING (get_user_role() IN ('admin', 'empleado'));

-- apuestas: auth puede leer, admin/empleado insert/update/delete
CREATE POLICY "apuestas_select_auth" ON public.apuestas FOR SELECT USING (get_user_role() IS NOT NULL);
CREATE POLICY "apuestas_insert_auth" ON public.apuestas FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'empleado'));
CREATE POLICY "apuestas_update_auth" ON public.apuestas FOR UPDATE USING (get_user_role() IN ('admin', 'empleado'));
CREATE POLICY "apuestas_delete_auth" ON public.apuestas FOR DELETE USING (get_user_role() IN ('admin', 'empleado'));

-- configuraciones: auth puede leer, solo admin puede escribir
CREATE POLICY "configuraciones_select_auth" ON public.configuraciones FOR SELECT USING (get_user_role() IS NOT NULL);
CREATE POLICY "configuraciones_all_admin" ON public.configuraciones FOR ALL USING (get_user_role() = 'admin');

-- bitacora: auth puede leer/insert, solo admin update/delete
CREATE POLICY "bitacora_select_auth" ON public.bitacora FOR SELECT USING (get_user_role() IS NOT NULL);
CREATE POLICY "bitacora_insert_auth" ON public.bitacora FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'empleado'));
CREATE POLICY "bitacora_insert_anon_failed_auth" ON public.bitacora
  FOR INSERT WITH CHECK (
    get_user_role() IS NULL
    AND tipo = 'auth_failed'
  );
CREATE POLICY "bitacora_update_auth" ON public.bitacora FOR UPDATE USING (get_user_role() = 'admin');
CREATE POLICY "bitacora_delete_auth" ON public.bitacora FOR DELETE USING (get_user_role() = 'admin');

-- 10. Seed data (sin contraseñas — se crean desde Supabase Auth Dashboard)
INSERT INTO usuarios (username, password_hash, nombre_completo, rol)
SELECT 'eliaglz', '', 'Elián González', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE username = 'eliaglz');

INSERT INTO usuarios (username, password_hash, nombre_completo, rol)
SELECT 'vgonzalez', '', 'Vanessa González', 'empleado'
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE username = 'vgonzalez');

INSERT INTO configuraciones (clave, valor) VALUES 
('comision_porcentaje', '10'),
('limite_credito', '5000'),
('pin_autorizacion', '8888')
ON CONFLICT (clave) DO NOTHING;