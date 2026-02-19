import { supabase } from '@/integrations/supabase/client';

interface ConfirmContactParams {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  eventName: string;
  locationId: string;
}

/**
 * Fire-and-forget call to the confirm-contact edge function
 * when an attendee is checked in.
 */
export async function confirmContactOnCheckIn(params: ConfirmContactParams) {
  try {
    const { error } = await supabase.functions.invoke('confirm-contact', {
      body: {
        email: params.email,
        first_name: params.firstName,
        last_name: params.lastName,
        phone: params.phone,
        event_name: params.eventName,
        location_id: params.locationId,
      },
    });
    if (error) {
      console.error('confirm-contact invoke error:', error);
    }
  } catch (err) {
    console.error('confirm-contact failed:', err);
  }
}

/**
 * Helper to split a full name into first/last.
 */
export function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ') || '';
  return { firstName, lastName };
}
