
CREATE TABLE public.order_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL,
  location_id TEXT NOT NULL,
  response_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.order_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Order responses are publicly viewable"
ON public.order_responses FOR SELECT USING (true);

CREATE POLICY "Anyone can create order responses"
ON public.order_responses FOR INSERT WITH CHECK (true);
