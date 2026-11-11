export interface PlaceMeetup {
  id: string;
  place_id: string;
  place_title: string;
  place_address: string;
  place_category: string;
  host_user_id: string;
  host_name: string;
  host_avatar?: string;
  title: string;
  description?: string;
  scheduled_at: string;
  is_live_checkin: boolean;
  attendee_ids: string[];
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
  photo_url?: string;
}

export interface CreateMeetupPayload {
  placeId: string;
  placeTitle: string;
  placeAddress: string;
  placeCategory: string;
  hostUserId: string;
  hostName: string;
  hostAvatar?: string;
  title: string;
  description?: string;
  scheduledAt: string;
  isLiveCheckin?: boolean;
  photo_url?: string;
}
