-- Add fields to track multiple check-ins per attendee
ALTER TABLE public.attendees 
ADD COLUMN total_tickets integer NOT NULL DEFAULT 1,
ADD COLUMN check_in_count integer NOT NULL DEFAULT 0;