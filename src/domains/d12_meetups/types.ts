export interface PlaceMeetup {
  id: string;
  place_id: string;
  place_name: string;
  place_title: string;
  place_address?: string;
  place_category?: string;
  creator_id: string;
  creator_handle: string;
  creator_avatar?: string;
  host_user_id: string;
  host_name: string;
  host_avatar?: string;
  title: string;
  description: string;
  starts_at: string;
  scheduled_at: string;
  max_attendees: number;
  attendee_ids: string[];
  attendee_handles: string[];
  photo_url?: string;
  photoUrl?: string;
  is_live_checkin?: boolean;
  created_at: string;
}

export interface CreateMeetupInput {
  placeId: string;
  placeName?: string;
  placeTitle?: string;
  placeAddress?: string;
  placeCategory?: string;
  creatorId?: string;
  creatorHandle?: string;
  creatorAvatar?: string;
  hostUserId?: string;
  hostName?: string;
  hostAvatar?: string;
  title: string;
  description?: string;
  startsAt?: string;
  scheduledAt?: string;
  maxAttendees?: number;
  photoUrl?: string;
  photo_url?: string;
  photoFile?: File;
  isLiveCheckin?: boolean;
}
