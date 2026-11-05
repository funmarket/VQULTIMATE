export interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  bio?: string;
  vq_balance: number;
  reputation: number;
  role: 'guardian' | 'explorer' | 'admin';
  created_at: string;
}

export interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
}
