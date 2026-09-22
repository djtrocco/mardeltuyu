-- =========================================================
-- Base de Datos PostgreSQL para Alquiler Mar del Tuyú
-- Tabla de Reservas, Ingresos, Egresos, Pagos y Contratos
-- =========================================================

-- 1. Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Crear tabla principal 'reservas'
CREATE TABLE IF NOT EXISTS public.reservas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    fecha_ingreso DATE NOT NULL,
    fecha_egreso DATE NOT NULL,
    noches INTEGER NOT NULL CHECK (noches > 0),
    valor_total NUMERIC(12, 2) NOT NULL CHECK (valor_total >= 0),
    sena NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (sena >= 0),
    saldo NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (saldo >= 0),
    comunicacion TEXT NOT NULL DEFAULT 'WhatsApp',
    numero_contacto TEXT NOT NULL,
    estado_contrato TEXT NOT NULL DEFAULT 'pendiente_envio' 
        CHECK (estado_contrato IN ('pendiente_envio', 'enviado', 'recibido_firmado')),
    estado_reserva TEXT NOT NULL DEFAULT 'confirmada'
        CHECK (estado_reserva IN ('confirmada', 'en_curso', 'finalizada', 'cancelada')),
    notas TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Validación de coherencia de fechas
    CONSTRAINT check_fechas CHECK (fecha_egreso > fecha_ingreso)
);

-- 3. Índices para búsqueda rápida y ordenamiento
CREATE INDEX IF NOT EXISTS idx_reservas_fechas ON public.reservas (fecha_ingreso, fecha_egreso);
CREATE INDEX IF NOT EXISTS idx_reservas_nombre ON public.reservas (nombre);
CREATE INDEX IF NOT EXISTS idx_reservas_estado_contrato ON public.reservas (estado_contrato);

-- 4. Función y Trigger para auto-actualizar 'updated_at'
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_reservas_updated_at ON public.reservas;
CREATE TRIGGER trg_reservas_updated_at
    BEFORE UPDATE ON public.reservas
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- 5. Habilitar Seguridad a Nivel de Fila (Row Level Security - RLS)
ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;

-- Política de lectura y escritura para la app
DROP POLICY IF EXISTS "Permitir lectura y escritura completa" ON public.reservas;
CREATE POLICY "Permitir lectura y escritura completa"
    ON public.reservas
    FOR ALL
    USING (true)
    WITH CHECK (true);
