-- Net worth daily snapshots
CREATE TABLE IF NOT EXISTS public.net_worth_daily (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  net_worth NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, date)
);

ALTER TABLE public.net_worth_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own net worth daily snapshots"
  ON public.net_worth_daily
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own net worth daily snapshots"
  ON public.net_worth_daily
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own net worth daily snapshots"
  ON public.net_worth_daily
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Reuse existing updated_at trigger function if present (created in initial migration)
CREATE TRIGGER set_net_worth_daily_updated_at
  BEFORE UPDATE ON public.net_worth_daily
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_net_worth_daily_date ON public.net_worth_daily(date);
CREATE INDEX IF NOT EXISTS idx_net_worth_daily_updated_at ON public.net_worth_daily(updated_at);
