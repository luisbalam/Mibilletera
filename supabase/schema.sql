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

-- 2. Crear la tabla de configuración global (app_settings) para sincronizar el PIN
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- 4. Crear políticas para permitir acceso en ambas tablas
CREATE POLICY "Permitir lectura publica transactions" ON public.transactions
  FOR SELECT USING (true);

CREATE POLICY "Permitir insercion publica transactions" ON public.transactions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir actualizacion publica transactions" ON public.transactions
  FOR UPDATE USING (true);

CREATE POLICY "Permitir eliminacion publica transactions" ON public.transactions
  FOR DELETE USING (true);

-- Políticas para app_settings
CREATE POLICY "Permitir lectura publica app_settings" ON public.app_settings
  FOR SELECT USING (true);

CREATE POLICY "Permitir insercion/actualizacion publica app_settings" ON public.app_settings
  FOR ALL USING (true) WITH CHECK (true);

-- 5. Crear índices para acelerar búsquedas
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions (date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions (category);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions (type);

