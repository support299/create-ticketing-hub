
-- Store parsed line items from LeadConnector order responses
CREATE TABLE public.order_line_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL,
  location_id TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  price_id TEXT NOT NULL,
  price_name TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'AUD',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.order_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create order line items" ON public.order_line_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Order line items are publicly viewable" ON public.order_line_items FOR SELECT USING (true);
CREATE POLICY "Anyone can update order line items" ON public.order_line_items FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete order line items" ON public.order_line_items FOR DELETE USING (true);
