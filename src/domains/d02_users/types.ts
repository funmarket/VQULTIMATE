export interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  bio?: string;
  district?: string;
  interests?: string[];
  city?: string;
  vq_balance: number;
  reputation: number;
  role: 'guardian' | 'explorer' | 'admin';
  created_at: string;
  tier?: string;
  trust_score?: number;
}

export interface Guardian {
  id: string;
  name: string;
  district: string;
  avatar: string;
  badge: string;
  status: 'active' | 'patrolling' | 'resting';
  trustScore: number;
  lat?: number;
  lng?: number;
  bio?: string;
}


