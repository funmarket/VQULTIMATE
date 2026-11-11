import { supabase } from '@/lib/supabase';
import { getCurrentUserProfile } from '../d01_auth';

export interface TourReservationRequestInput {
  tourId: string;
  date: string;
  time: string;
  partySize: number;
  note: string;
}
export interface TourReservationRequestResult {
  id: string;
  status: 'pending';
  tour_id: string;
  requester_profile_id: string;
}

export async function requestTourReservation(input: TourReservationRequestInput): Promise<TourReservationRequestResult> {
  const current = await getCurrentUserProfile();
  if (!current) throw new Error('Sign in before requesting a Tour reservation.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !/^\d{2}:\d{2}$/.test(input.time)) {
    throw new Error('Select a real date and time for your Tour request.');
  }
  if (!Number.isInteger(input.partySize) || input.partySize < 1 || input.partySize > 30) {
    throw new Error('Enter a party size from 1 to 30.');
  }
  const { data: tour, error: lookupError } = await supabase
    .from('vibe_trails').select('id,is_tour').eq('id', input.tourId).single();
  if (lookupError || !tour?.is_tour) throw new Error('The selected Tour is unavailable.');
  const { data, error } = await supabase
    .from('tour_reservation_requests')
    .insert({
      tour_id: input.tourId,
      requester_profile_id: current.id,
      requested_date: input.date,
      requested_time: input.time,
      party_size: input.partySize,
      note: input.note.trim(),
      status: 'pending'
    }).select('id,status,tour_id,requester_profile_id').single();
  if (error || !data || data.status !== 'pending') {
    throw new Error(error?.message || 'Reservation request was not persisted.');
  }
  return data as TourReservationRequestResult;
}
