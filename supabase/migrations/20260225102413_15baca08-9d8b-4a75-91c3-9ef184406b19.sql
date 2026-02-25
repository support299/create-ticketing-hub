
CREATE TABLE public.bundle_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  package_name TEXT NOT NULL,
  package_price NUMERIC NOT NULL DEFAULT 0,
  bundle_quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bundle_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bundle options are publicly viewable" ON public.bundle_options FOR SELECT USING (true);
CREATE POLICY "Anyone can create bundle options" ON public.bundle_options FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update bundle options" ON public.bundle_options FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete bundle options" ON public.bundle_options FOR DELETE USING (true);
