export interface DriftRoom {
  id: string; // 'chill', 'sweat', etc.
  name: string;
  description: string;
  color: string;
  banner_url?: string;
  pinned_announcement?: string;
  created_at?: string;
}

export interface DriftAlias {
  id: string;
  room_id: string;
  user_id: string;
  handle: string;
  avatar_color: string;
  avatar_mask: string;
  gender?: 'M' | 'F' | null;
  created_at: string;
  expires_at: string;
}

export interface DriftPresence {
  id: string;
  room_id: string;
  user_id: string;
  alias_id?: string;
  alias_handle: string;
  avatar_color?: string;
  gender?: 'M' | 'F' | null;
  last_heartbeat: string;
  joined_at: string;
}

export interface DriftMessageReaction {
  id: string;
  message_id: string;
  alias_handle: string;
  emoji: string;
  created_at: string;
}

export interface DriftMessage {
  id: string;
  room_id: string;
  alias_id?: string;
  alias_handle: string;
  avatar_color?: string;
  gender?: 'M' | 'F' | null;
  sender_user_id: string;
  content: string | null;
  media_url?: string | null;
  media_type?: 'photo' | 'voice' | null;
  voice_duration?: number | null;
  reply_to_id?: string | null;
  reply_to_handle?: string | null;
  reply_to_snippet?: string | null;
  is_pinned?: boolean;
  created_at: string;
  expires_at: string;
  // Aggregated client reaction summary
  reactions?: Record<string, number>;
  my_reactions?: string[];
}

export interface DriftPrivateThread {
  id: string;
  room_id?: string;
  alias_1_id?: string;
  alias_1_handle: string;
  user_1_id: string;
  alias_2_id?: string;
  alias_2_handle: string;
  user_2_id: string;
  status: 'active' | 'closed' | 'blocked';
  created_at: string;
  expires_at: string;
}

export interface DriftPrivateMessage {
  id: string;
  thread_id: string;
  sender_user_id: string;
  sender_alias_handle: string;
  content: string | null;
  media_url?: string | null;
  media_type?: 'photo' | 'voice' | null;
  voice_duration?: number | null;
  created_at: string;
  expires_at: string;
}

export interface DriftBottle {
  id: string;
  room_id: string;
  sender_alias_id?: string;
  sender_alias_handle: string;
  sender_user_id: string;
  content: string;
  picked_up: boolean;
  picked_up_by_user_id?: string | null;
  picked_up_by_handle?: string | null;
  picked_up_at?: string | null;
  created_at: string;
  expires_at: string;
}

export interface DriftRevealRequest {
  id: string;
  thread_id: string;
  requester_user_id: string;
  target_user_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  updated_at: string;
}

export interface DriftModerationAction {
  id: string;
  room_id: string;
  action_type: 'pin' | 'unpin' | 'delete_message' | 'mute' | 'ban' | 'report';
  target_id: string;
  reason?: string;
  moderator_user_id: string;
  created_at: string;
}

export interface DriftEmoji {
  id: string;
  name: string;
  category: 'animated' | 'vibes' | 'smiles' | 'gestures' | 'symbols';
  character: string;
  animation_type?: 'pulse' | 'bounce' | 'spin' | 'shake' | 'glow' | 'float' | 'flame';
  is_animated?: boolean;
  sort_order?: number;
  created_at?: string;
}
