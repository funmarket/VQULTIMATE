export interface DirectMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read: boolean;
}

export interface DmAuthorizationResult {
  authorized: boolean;
  reason?: string;
}

export interface SendMessageResult {
  success: boolean;
  message?: DirectMessage;
  error?: string;
}
