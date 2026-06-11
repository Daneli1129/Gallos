-- ============================================================
-- GALLO GOLD — BRUNO'S
-- Esquema completo para Supabase (PostgreSQL)
-- Pega esto en el SQL Editor de tu proyecto Supabase
-- ============================================================

-- ── EXTENSIONES ────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ── USUARIOS DEL SISTEMA ──────────────────────────────────
create table if not exists usuarios (
  id        uuid primary key default gen_random_uuid(),
  usuario   text not null unique,
  pass      text not null,
  nombre    text not null,
  rol       text not null check (rol in ('admin','empleado')),
  activo    boolean not null default true,
  creado_en timestamptz not null default now()
);

-- ── SECUENCIA PARA CÓDIGOS DE JUGADOR ──────────────────────
-- Genera códigos del estilo J001, J002, J003...
create sequence if not exists seq_jugador_codigo start 1;

-- ── PALETA DE COLORES ──────────────────────────────────────
-- Los jugadores reciben un color automáticamente por su orden
create table if not exists colores_paleta (
  id    integer primary key generated always as identity,
  hex   text not null
);

insert into colores_paleta (hex) values
  ('#E8C97A'), ('#E74C3C'), ('#2ECC71'), ('#D4A24A'),
  ('#7c3aed'), ('#3AB0FF'), ('#C9A84C'), ('#C0392B')
on conflict (id) do nothing;

-- ── JUGADORES ─────────────────────────────────────────────
create table if not exists jugadores (
  id         uuid primary key default gen_random_uuid(),
  codigo     text not null unique,       -- ej: 'J001', 'J002' (legible para humanos)
  nombre     text not null,
  color      text,                        -- auto-asignado si es null
  saldo_ant  numeric(12,2) not null default 0,
  added_by   text,                        -- quién lo registró
  added_at   timestamptz default now(),
  creado_en  timestamptz not null default now()
);

-- Función que auto-asigna código y color al insertar un jugador
create or replace function jugador_before_insert()
returns trigger language plpgsql as $$
begin
  -- Asignar código secuencial J001, J002...
  new.codigo := 'J' || lpad(nextval('seq_jugador_codigo')::text, 3, '0');

  -- Asignar color automático de la paleta si no se especificó
  if new.color is null then
    select hex into new.color
    from colores_paleta
    where id = ((substring(new.codigo, 2)::integer - 1) % 8) + 1;
  end if;

  return new;
end;
$$;

create trigger trg_jugador_before_insert
  before insert on jugadores
  for each row execute function jugador_before_insert();

-- ── PELEAS ────────────────────────────────────────────────
create table if not exists peleas (
  id          uuid primary key default gen_random_uuid(),
  num         integer not null unique,  -- número de pelea (humano)
  estado      text not null default 'espera' check (estado in ('espera','activa','cerrada')),
  ganador     text check (ganador in ('rojo','verde')),
  minimizada  boolean not null default false,
  creado_en   timestamptz not null default now()
);

-- índice para ordenar peleas por número
create index if not exists idx_peleas_num on peleas (num desc);

-- ── APUESTAS ──────────────────────────────────────────────
create table if not exists apuestas (
  id          uuid primary key default gen_random_uuid(),
  pelea_id    uuid not null references peleas(id) on delete cascade,
  jugador_id  uuid not null references jugadores(id) on delete cascade,
  bando       text not null check (bando in ('rojo','verde')),
  monto       numeric(12,2) not null check (monto > 0),
  resultado   text not null default 'pendiente' check (resultado in ('pendiente','ganada','perdida')),
  autorizado_por text,                  -- quién autorizó si saldo negativo
  creado_en   timestamptz not null default now()
);

-- índices
create index if not exists idx_apuestas_pelea on apuestas (pelea_id);
create index if not exists idx_apuestas_jugador on apuestas (jugador_id);

-- ── BITÁCORA ──────────────────────────────────────────────
create table if not exists bitacora (
  id         uuid primary key default gen_random_uuid(),
  ts         time not null default current_time,
  usuario    text not null,
  rol        text not null check (rol in ('admin','empleado')),
  tipo       text not null,             -- apuesta, resultado, eliminar, estado, nueva-pelea, nuevo-jugador, saldo-negativo
  mensaje    text not null,
  icono      text default '📋',
  creado_en  timestamptz not null default now()
);

create index if not exists idx_bitacora_fecha on bitacora (creado_en desc);

-- ── DATOS INICIALES ───────────────────────────────────────

-- Usuarios del sistema
insert into usuarios (usuario, pass, nombre, rol) values
  ('admin',     'admin',  'Bruno García',   'admin'),
  ('empleado',  '123',    'María Ramírez',  'empleado'),
  ('empleado2', '456',    'Carlos Mendoza', 'empleado')
on conflict (usuario) do nothing;

-- Jugadores predefinidos (7 iniciales)
-- El trigger asigna codigo y color automáticamente
insert into jugadores (nombre, saldo_ant) values
  ('Heri',        4600),
  ('Picuni',       0),
  ('Jaime Sosa',   0),
  ('Arias',        0),
  ('Maldonado',    0),
  ('Renata',       0),
  ('Tomas',        0)
on conflict (codigo) do nothing;

-- ── FUNCIONES ÚTILES ──────────────────────────────────────

-- Calcula la ficha financiera de un jugador
create or replace function calcular_ficha(p_jugador_id uuid)
returns table (
  saldo          numeric,
  total_ganadas  numeric,
  total_perdidas numeric,
  en_juego       bigint,
  ganadas_count  bigint,
  perdidas_count bigint
) language plpgsql stable as $$
declare
  v_saldo_ant numeric;
begin
  select saldo_ant into v_saldo_ant from jugadores where id = p_jugador_id;

  return query
  select
    coalesce(sum(case when a.resultado = 'ganada'  then a.monto * 0.9 end), 0)
    - (v_saldo_ant + coalesce(sum(case when a.resultado = 'perdida' then a.monto end), 0)) as saldo,
    coalesce(sum(case when a.resultado = 'ganada'  then a.monto * 0.9 end), 0)::numeric as total_ganadas,
    coalesce(sum(case when a.resultado = 'perdida' then a.monto end), 0)::numeric as total_perdidas,
    count(*) filter (where a.resultado = 'pendiente')::bigint as en_juego,
    count(*) filter (where a.resultado = 'ganada')::bigint as ganadas_count,
    count(*) filter (where a.resultado = 'perdida')::bigint as perdidas_count
  from apuestas a
  where a.jugador_id = p_jugador_id;
end;
$$;

-- Calcula el payout de una pelea
create or replace function calcular_payout(p_pelea_id uuid)
returns table (
  total_rojo  numeric,
  total_verde numeric,
  paga_rojo   numeric,  -- si gana rojo, cuánto paga
  paga_verde  numeric   -- si gana verde, cuánto paga
) language plpgsql stable as $$
begin
  return query
  select
    coalesce(sum(monto) filter (where bando = 'rojo'), 0)::numeric as total_rojo,
    coalesce(sum(monto) filter (where bando = 'verde'), 0)::numeric as total_verde,
    (coalesce(sum(monto) filter (where bando = 'verde'), 0) * 0.9)::numeric as paga_rojo,
    (coalesce(sum(monto) filter (where bando = 'rojo'), 0) * 0.9)::numeric as paga_verde
  from apuestas
  where pelea_id = p_pelea_id;
end;
$$;

-- ── SEGURIDAD (RLS) ───────────────────────────────────────

-- Habilita RLS en todas las tablas
alter table usuarios  enable row level security;
alter table jugadores enable row level security;
alter table peleas    enable row level security;
alter table apuestas  enable row level security;
alter table bitacora  enable row level security;

-- Políticas: solo usuarios autenticados pueden leer/escribir
-- (Ajusta según tu lógica de autenticación en Supabase)
create policy "Usuarios autenticados pueden leer usuarios"
  on usuarios for select using (auth.role() = 'authenticated');

create policy "Usuarios autenticados pueden todo en jugadores"
  on jugadores for all using (auth.role() = 'authenticated');

create policy "Usuarios autenticados pueden todo en peleas"
  on peleas for all using (auth.role() = 'authenticated');

create policy "Usuarios autenticados pueden todo en apuestas"
  on apuestas for all using (auth.role() = 'authenticated');

create policy "Usuarios autenticados pueden todo en bitacora"
  on bitacora for all using (auth.role() = 'authenticated');

-- ── EJEMPLO DE CONSULTA ───────────────────────────────────
-- Para obtener todas las peleas con sus totales:
-- select
--   p.num, p.estado, p.ganador,
--   (calcular_payout(p.id)).*
-- from peleas p
-- order by p.num desc;
