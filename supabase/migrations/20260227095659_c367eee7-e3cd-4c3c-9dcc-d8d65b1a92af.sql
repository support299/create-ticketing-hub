
CREATE TABLE public.location_custom_fields (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id text NOT NULL,
  field_id text NOT NULL,
  field_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(location_id, field_name)
);

ALTER TABLE public.location_custom_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read location_custom_fields" ON public.location_custom_fields FOR SELECT USING (true);
CREATE POLICY "Anyone can insert location_custom_fields" ON public.location_custom_fields FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update location_custom_fields" ON public.location_custom_fields FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete location_custom_fields" ON public.location_custom_fields FOR DELETE USING (true);

CREATE TRIGGER update_location_custom_fields_updated_at
BEFORE UPDATE ON public.location_custom_fields
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
