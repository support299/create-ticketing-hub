
-- Create seat_assignments table for per-seat person info
CREATE TABLE public.seat_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attendee_id UUID NOT NULL REFERENCES public.attendees(id) ON DELETE CASCADE,
  seat_number INTEGER NOT NULL,
  name TEXT,
  email TEXT,
  phone TEXT,
  checked_in_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(attendee_id, seat_number)
);

-- Enable RLS
ALTER TABLE public.seat_assignments ENABLE ROW LEVEL SECURITY;

-- Public access policies (matching existing pattern)
CREATE POLICY "Seat assignments are publicly viewable"
ON public.seat_assignments FOR SELECT USING (true);

CREATE POLICY "Anyone can create seat assignments"
ON public.seat_assignments FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update seat assignments"
ON public.seat_assignments FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete seat assignments"
ON public.seat_assignments FOR DELETE USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_seat_assignments_updated_at
BEFORE UPDATE ON public.seat_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
