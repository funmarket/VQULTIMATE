export interface ConnectionPull {
  id: string;
  sender_id: string;
  recipient_id: string;
  reason?: string;
  status: 'pending' | 'accepted' | 'passed';
  created_at: string;
  sender_profile?: {
    username: string;
    full_name: string;
    avatar_url: string;
  };
}

export interface ConfirmedVibe {
  id: string;
  user_1_id: string;
  user_2_id: string;
  vibe_score?: number;
  unlocked_at: string;
  partner_profile?: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
    tier?: string;
  };
}

export interface PullActionResult {
  success: boolean;
  pull?: ConnectionPull;
  error?: string;
}
