
CREATE TABLE public.location_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id TEXT NOT NULL UNIQUE,
  api_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.location_api_keys ENABLE ROW LEVEL SECURITY;

-- Public read/write since this is an internal admin tool without auth
CREATE POLICY "Allow all access to location_api_keys"
  ON public.location_api_keys
  FOR ALL
  USING (true)
  WITH CHECK (true);
