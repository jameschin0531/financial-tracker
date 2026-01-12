-- Net worth weekly snapshots
CREATE TABLE IF NOT EXISTS public.net_worth_snapshots (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  net_worth NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, week_start)
);

ALTER TABLE public.net_worth_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own net worth snapshots"
  ON public.net_worth_snapshots
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own net worth snapshots"
  ON public.net_worth_snapshots
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own net worth snapshots"
  ON public.net_worth_snapshots
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Reuse existing updated_at trigger function if present (created in initial migration)
CREATE TRIGGER set_net_worth_snapshots_updated_at
  BEFORE UPDATE ON public.net_worth_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_net_worth_snapshots_week_start ON public.net_worth_snapshots(week_start);
CREATE INDEX IF NOT EXISTS idx_net_worth_snapshots_updated_at ON public.net_worth_snapshots(updated_at);

