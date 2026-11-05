export interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  bio?: string;
  district?: string;
  city?: string;
  interests?: string[];
  languages?: string[];
  xHandle?: string;
  telegramHandle?: string;
  contactMethod?: string;
  cozyDiaryMode?: boolean;
  accountType?: string;
  tier?: string;
  trust_score?: number;
  vq_balance: number;
  streaks?: number;
  reputation: number;
  role: 'guardian' | 'explorer' | 'admin';
  created_at: string;
}

export interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
}

export interface ProfileRegistration {
  handle: string;
  displayName: string;
  email: string;
  password: string;
  bio?: string;
  city?: string;
  interests?: string[];
  languages?: string[];
  photoUrl?: string;
  avatarFile?: File | null;
  telegramHandle?: string;
  xHandle?: string;
  contactMethod?: string;
  cozyDiaryMode?: boolean;
}

export type RegistrationResult =
  | { pendingVerification: true; email: string; avatarUploadNote?: string }
  | { pendingVerification: false; profile: UserProfile; avatarUploadNote?: string };

export type ProfileEdits = {
  displayName?: string;
  photoUrl?: string;
  bio?: string;
  city?: string;
  interests?: string[];
  languages?: string[];
  avatarFile?: File | null;
  telegramHandle?: string;
  xHandle?: string;
  contactMethod?: string;
  cozyDiaryMode?: boolean;
};
