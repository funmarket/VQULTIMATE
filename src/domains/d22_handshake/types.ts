export interface HandshakeRecord {
  id: string;
  user_id: string;
  requester_id?: string;
  guardian_id: string;
  action_type?: string;
  status: 'pending' | 'accepted' | 'active' | 'declined';
  issued_at?: string;
  expires_at?: string;
  created_at?: string;
  updated_at?: string;
}

export type HandshakeStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted' | 'declined';
