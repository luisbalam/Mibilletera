-- ========================================================
-- SCRIPT DE INICIALIZACIÓN DE TABLA Y SEGURIDAD SUPABASE
-- Aplicación: Mi Billetera (Finanzas Personales en MXN)
-- ========================================================

-- 1. Crear la tabla de movimientos (transactions)
CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('ingreso', 'gasto')),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  concept TEXT NOT NULL,
  category TEXT NOT NULL,
  date TEXT NOT NULL, -- Formato YYYY-MM-DD
  time TEXT DEFAULT '00:00', -- Formato HH:mm
  payment_method TEXT NOT NULL,
  notes TEXT,
  created_at BIGINT NOT NULL
);

-- 2. Habilitar Row Level Security (RLS)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 3. Crear políticas para permitir lectura, inserción, actualización y eliminación pública/anónima
CREATE POLICY "Permitir lectura publica" ON public.transactions
  FOR SELECT USING (true);

CREATE POLICY "Permitir insercion publica" ON public.transactions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir actualizacion publica" ON public.transactions
  FOR UPDATE USING (true);

CREATE POLICY "Permitir eliminacion publica" ON public.transactions
  FOR DELETE USING (true);

-- 4. Crear índices para acelerar búsquedas y filtros por fecha y categoría
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions (date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions (category);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions (type);
