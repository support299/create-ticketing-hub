
ALTER TABLE public.seat_assignments
ADD COLUMN is_minor boolean NOT NULL DEFAULT false,
ADD COLUMN guardian_name text,
ADD COLUMN guardian_email text,
ADD COLUMN guardian_phone text;
