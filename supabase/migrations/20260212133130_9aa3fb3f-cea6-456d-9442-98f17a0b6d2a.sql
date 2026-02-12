-- Enable realtime for attendees table
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendees;

-- Allow deleting orders
CREATE POLICY "Anyone can delete orders"
ON public.orders
FOR DELETE
USING (true);

-- Allow deleting attendees
CREATE POLICY "Anyone can delete attendees"
ON public.attendees
FOR DELETE
USING (true);
