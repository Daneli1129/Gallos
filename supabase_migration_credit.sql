-- ================================================================================
--   MIGRACIÓN: Módulo de Gestión de Crédito y Control de Apostadores
--   Ejecutar en el SQL Editor de Supabase
-- ================================================================================

-- 1. Agregar columnas a la tabla jugadores (si no existen)
ALTER TABLE public.jugadores ADD COLUMN IF NOT EXISTS limite_credito DECIMAL(12, 2) DEFAULT 5000.00;
ALTER TABLE public.jugadores ADD COLUMN IF NOT EXISTS credito_utilizado DECIMAL(12, 2) DEFAULT 0.00;
ALTER TABLE public.jugadores ADD COLUMN IF NOT EXISTS estado_candado BOOLEAN DEFAULT FALSE;

-- 2. Agregar columna a la tabla apuestas para registrar tipo de pago (si no existe)
ALTER TABLE public.apuestas ADD COLUMN IF NOT EXISTS tipo_pago VARCHAR(20) DEFAULT 'efectivo' CHECK (tipo_pago IN ('efectivo', 'credito'));

-- 3. Actualizar la función registrar_apuesta_p2p para que soporte tipo_pago y validaciones
CREATE OR REPLACE FUNCTION public.registrar_apuesta_p2p(
  p_pelea_num INT,
  p_jugador_id VARCHAR,
  p_bando VARCHAR,
  p_monto NUMERIC,
  p_autorizado_por INT DEFAULT NULL,
  p_tipo_pago VARCHAR DEFAULT 'efectivo'
) RETURNS VOID AS $$
DECLARE
  v_pelea_id INT;
  v_nueva_apuesta_id UUID;
  v_monto_pendiente_actual NUMERIC;
  v_contra_record RECORD;
  v_monto_a_casar NUMERIC;
  v_limite NUMERIC;
  v_utilizado NUMERIC;
  v_candado BOOLEAN;
BEGIN
  -- A. Validar crédito si es a crédito
  IF p_tipo_pago = 'credito' THEN
    SELECT limite_credito, credito_utilizado, estado_candado INTO v_limite, v_utilizado, v_candado
    FROM jugadores WHERE id = p_jugador_id;
    
    IF v_candado THEN
      RAISE EXCEPTION 'Usuario bloqueado por administración';
    ELSIF (COALESCE(v_utilizado, 0.00) + p_monto) > COALESCE(v_limite, 5000.00) THEN
      RAISE EXCEPTION 'Crédito excedido';
    END IF;
  END IF;

  -- B. Obtener ID de la pelea
  SELECT id INTO v_pelea_id FROM peleas WHERE numero_pelea = p_pelea_num LIMIT 1;
  IF v_pelea_id IS NULL THEN
    RAISE EXCEPTION 'Pelea no encontrada';
  END IF;

  -- C. Insertar la nueva apuesta inicializada como pendiente
  INSERT INTO apuestas (
    pelea_id, jugador_id, bando, monto, monto_total, monto_casado, monto_pendiente, estado, autorizado_por, tipo_pago
  ) VALUES (
    v_pelea_id, p_jugador_id, p_bando, p_monto, p_monto, 0.00, p_monto, 'pendiente', p_autorizado_por, p_tipo_pago
  ) RETURNING id INTO v_nueva_apuesta_id;

  -- D. Incrementar el crédito utilizado si es a crédito
  IF p_tipo_pago = 'credito' THEN
    UPDATE jugadores 
    SET credito_utilizado = COALESCE(credito_utilizado, 0.00) + p_monto 
    WHERE id = p_jugador_id;
  END IF;

  v_monto_pendiente_actual := p_monto;

  -- E. Buscar apuestas del bando contrario pendientes/parciales en orden FIFO (por fecha)
  FOR v_contra_record IN 
    SELECT id, monto_pendiente, bando 
    FROM apuestas 
    WHERE pelea_id = v_pelea_id 
      AND bando != p_bando 
      AND estado IN ('pendiente', 'parcial')
    ORDER BY created_at ASC
  LOOP
    IF v_monto_pendiente_actual <= 0 THEN
      EXIT;
    END IF;

    v_monto_a_casar := LEAST(v_monto_pendiente_actual, v_contra_record.monto_pendiente);

    IF v_monto_a_casar > 0 THEN
      -- i. Insertar el registro de emparejamiento
      INSERT INTO apuestas_emparejadas (
        pelea_id, 
        apuesta_rojo_id, 
        apuesta_verde_id, 
        monto_emparejado
      ) VALUES (
        v_pelea_id,
        CASE WHEN p_bando = 'rojo' THEN v_nueva_apuesta_id ELSE v_contra_record.id END,
        CASE WHEN p_bando = 'verde' THEN v_nueva_apuesta_id ELSE v_contra_record.id END,
        v_monto_a_casar
      );

      -- ii. Actualizar el registro contrario
      UPDATE apuestas 
      SET 
        monto_casado = monto_casado + v_monto_a_casar,
        monto_pendiente = monto_pendiente - v_monto_a_casar,
        estado = CASE WHEN (monto_pendiente - v_monto_a_casar) <= 0 THEN 'casado' ELSE 'parcial' END
      WHERE id = v_contra_record.id;

      -- iii. Restar al saldo pendiente de la nueva apuesta
      v_monto_pendiente_actual := v_monto_pendiente_actual - v_monto_a_casar;
    END IF;
  END LOOP;

  -- F. Actualizar el estado de la nueva apuesta con lo que se haya logrado casar
  UPDATE apuestas 
  SET 
    monto_casado = p_monto - v_monto_pendiente_actual,
    monto_pendiente = v_monto_pendiente_actual,
    estado = CASE 
      WHEN v_monto_pendiente_actual <= 0 THEN 'casado'
      WHEN v_monto_pendiente_actual < p_monto THEN 'parcial'
      ELSE 'pendiente'
    END
  WHERE id = v_nueva_apuesta_id;

END;
$$ LANGUAGE plpgsql;

-- 4. Crear/Reemplazar la función y trigger para auto-ajustar credito_utilizado al actualizar o eliminar apuestas
CREATE OR REPLACE FUNCTION public.trg_apuestas_credito_adjust()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.tipo_pago = 'credito' THEN
      UPDATE jugadores 
      SET credito_utilizado = GREATEST(0.00, COALESCE(credito_utilizado, 0.00) - OLD.monto_total)
      WHERE id = OLD.jugador_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.tipo_pago = 'credito' AND NEW.tipo_pago = 'credito' THEN
      UPDATE jugadores 
      SET credito_utilizado = GREATEST(0.00, COALESCE(credito_utilizado, 0.00) + (NEW.monto_total - OLD.monto_total))
      WHERE id = OLD.jugador_id;
    ELSIF OLD.tipo_pago = 'efectivo' AND NEW.tipo_pago = 'credito' THEN
      UPDATE jugadores 
      SET credito_utilizado = COALESCE(credito_utilizado, 0.00) + NEW.monto_total
      WHERE id = NEW.jugador_id;
    ELSIF OLD.tipo_pago = 'credito' AND NEW.tipo_pago = 'efectivo' THEN
      UPDATE jugadores 
      SET credito_utilizado = GREATEST(0.00, COALESCE(credito_utilizado, 0.00) - OLD.monto_total)
      WHERE id = OLD.jugador_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tgr_apuestas_credito ON public.apuestas;
CREATE TRIGGER tgr_apuestas_credito
AFTER UPDATE OR DELETE ON public.apuestas
FOR EACH ROW
EXECUTE FUNCTION public.trg_apuestas_credito_adjust();
