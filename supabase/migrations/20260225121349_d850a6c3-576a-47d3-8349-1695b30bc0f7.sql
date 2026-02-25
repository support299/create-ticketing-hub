
-- Add bundle_option_id to orders so we can track which bundle was used
ALTER TABLE public.orders ADD COLUMN bundle_option_id uuid REFERENCES public.bundle_options(id) ON DELETE SET NULL;

-- Create index for efficient per-bundle queries
CREATE INDEX idx_orders_bundle_option_id ON public.orders(bundle_option_id);
