
-- Add location_id column to events table
ALTER TABLE public.events ADD COLUMN location_id text;

-- Add location_id column to orders table
ALTER TABLE public.orders ADD COLUMN location_id text;

-- Add location_id column to attendees table
ALTER TABLE public.attendees ADD COLUMN location_id text;

-- Create indexes for filtering by location_id
CREATE INDEX idx_events_location_id ON public.events (location_id);
CREATE INDEX idx_orders_location_id ON public.orders (location_id);
CREATE INDEX idx_attendees_location_id ON public.attendees (location_id);
