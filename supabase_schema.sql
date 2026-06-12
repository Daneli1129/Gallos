-- ================================================================================
--   GALLO GOLD — BRUNO'S
--   Esquema de Base de Datos para Supabase (PostgreSQL) — ACTIVO EN EL SERVIDOR
-- ================================================================================

-- 1. Tabla de Usuarios (Administradores y Empleados)
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- Almacenar siempre contraseñas con hash (ej. bcrypt)
    nombre_completo VARCHAR(100) NOT NULL,
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('admin', 'empleado')),
    esta_conectado BOOLEAN DEFAULT FALSE, -- Estado de conexión activa
    ultimo_acceso TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Para controlar inactividad y desconectar automáticamente
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Jugadores (Apostadores)
CREATE TABLE jugadores (
    id VARCHAR(20) PRIMARY KEY, -- Permite IDs personalizados como 'H1', 'P2' o autogenerados
    nombre VARCHAR(100) UNIQUE NOT NULL,
    color VARCHAR(10) DEFAULT '#C9A84C', -- Código hexadecimal de color
    saldo_anterior DECIMAL(12, 2) DEFAULT 0.00, -- Decimal para evitar errores de punto flotante en dinero
    registrado_por INT REFERENCES usuarios(id) ON DELETE SET NULL, -- Rastreo de quién creó al jugador
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla de Peleas
CREATE TABLE peleas (
    id SERIAL PRIMARY KEY,
    numero_pelea INT UNIQUE NOT NULL, -- Número ordinal de la pelea del día (Pelea #1, #2, etc.)
    estado VARCHAR(20) DEFAULT 'espera' CHECK (estado IN ('espera', 'activa', 'cerrada')),
    ganador VARCHAR(10) CHECK (ganador IN ('verde', 'rojo', NULL)), -- NULL mientras la pelea esté activa o en espera
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla de Apuestas
CREATE TABLE apuestas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Llave única global para las apuestas
    pelea_id INT NOT NULL REFERENCES peleas(id) ON DELETE CASCADE, -- Si se borra una pelea, se borran sus apuestas
    jugador_id VARCHAR(20) NOT NULL REFERENCES jugadores(id) ON DELETE RESTRICT, -- No permite borrar jugadores con apuestas activas
    bando VARCHAR(10) NOT NULL CHECK (bando IN ('verde', 'rojo')),
    monto DECIMAL(12, 2) NOT NULL CHECK (monto > 0),
    resultado VARCHAR(20) DEFAULT 'pendiente' CHECK (resultado IN ('pendiente', 'ganada', 'perdida')),
    autorizado_por INT REFERENCES usuarios(id) ON DELETE SET NULL, -- Registra quién autorizó en caso de saldo negativo
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabla de Bitácora (Historial de movimientos)
CREATE TABLE bitacora (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL, -- 'apuesta', 'resultado', 'eliminar', 'estado', etc.
    mensaje TEXT NOT NULL,
    icon VARCHAR(10), -- Emoji o identificador de icono
    usuario_id INT REFERENCES usuarios(id) ON DELETE SET NULL, -- Usuario que ejecutó la acción
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Índices para Optimización de Consultas Frecuentes
CREATE INDEX idx_apuestas_pelea ON apuestas(pelea_id);
CREATE INDEX idx_apuestas_jugador ON apuestas(jugador_id);
CREATE INDEX idx_bitacora_usuario ON bitacora(usuario_id);


-- Permitir a la anon key leer todo (necesario para el login)
CREATE POLICY "anon_select" ON usuarios FOR SELECT USING (true);

-- Permitir a la anon key actualizar (login/logout)
CREATE POLICY "anon_update" ON usuarios FOR UPDATE USING (true);


-- Políticas para la tabla usuarios
CREATE POLICY "usuarios_select" ON public.usuarios FOR SELECT USING (true);
CREATE POLICY "usuarios_update" ON public.usuarios FOR UPDATE USING (true);
CREATE POLICY "usuarios_insert" ON public.usuarios FOR INSERT WITH CHECK (true);
CREATE POLICY "usuarios_delete" ON public.usuarios FOR DELETE USING (true);

-- Políticas para jugadores
CREATE POLICY "jugadores_select" ON public.jugadores FOR SELECT USING (true);
CREATE POLICY "jugadores_insert" ON public.jugadores FOR INSERT WITH CHECK (true);
CREATE POLICY "jugadores_update" ON public.jugadores FOR UPDATE USING (true);
CREATE POLICY "jugadores_delete" ON public.jugadores FOR DELETE USING (true);

-- Políticas para peleas
CREATE POLICY "peleas_select" ON public.peleas FOR SELECT USING (true);
CREATE POLICY "peleas_insert" ON public.peleas FOR INSERT WITH CHECK (true);
CREATE POLICY "peleas_update" ON public.peleas FOR UPDATE USING (true);
CREATE POLICY "peleas_delete" ON public.peleas FOR DELETE USING (true);

-- Políticas para apuestas
CREATE POLICY "apuestas_select" ON public.apuestas FOR SELECT USING (true);
CREATE POLICY "apuestas_insert" ON public.apuestas FOR INSERT WITH CHECK (true);
CREATE POLICY "apuestas_update" ON public.apuestas FOR UPDATE USING (true);
CREATE POLICY "apuestas_delete" ON public.apuestas FOR DELETE USING (true);

-- Políticas para bitacora
CREATE POLICY "bitacora_select" ON public.bitacora FOR SELECT USING (true);
CREATE POLICY "bitacora_insert" ON public.bitacora FOR INSERT WITH CHECK (true);
CREATE POLICY "bitacora_update" ON public.bitacora FOR UPDATE USING (true);
CREATE POLICY "bitacora_delete" ON public.bitacora FOR DELETE USING (true);


INSERT INTO usuarios (username, password_hash, nombre_completo, rol) VALUES
('eliaglz', '&Pu!=BoDk)R$jEeM', 'Elián González', 'admin'),
('vgonzalez', 'UH_$ok;|z6gq_$', 'Vanessa González', 'empleado');