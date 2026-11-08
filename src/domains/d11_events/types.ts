export type SuggestionCategory = 'place' | 'event' | 'vibe';

export interface FlashEvent {
  id: string;
  title: string;
  description?: string;
  place_id?: string | null;
  secret_id?: string | null;
  starts_at?: string;
  ends_at: string;
  seconds_left: number;
  kind: 'secret_party' | 'after_hours' | 'private_game' | 'happy_hour' | 'limited_promo' | 'other';
}
