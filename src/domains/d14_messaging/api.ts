import { supabase } from '../../lib/supabase';
import { checkHasConfirmedVibe } from '../d17_matching';
import { DirectMessage, DmAuthorizationResult, SendMessageResult } from './types';

export async function checkDmAuthorization(senderId: string, recipientId: string): Promise<DmAuthorizationResult> {
  if (!senderId) {
    return { authorized: false, reason: 'Guests must authenticate before starting conversations.' };
  }
  if (senderId === recipientId) {
    return { authorized: false, reason: 'Cannot message yourself.' };
  }

  // Strict domain invariant: ECHO never grants DMs. Only an accepted D17 confirmed Vibe unlocks ordinary D14 1:1 DMs.
  const hasConfirmedVibe = await checkHasConfirmedVibe(senderId, recipientId);
  if (!hasConfirmedVibe) {
    return {
      authorized: false,
      reason: 'ECHO never grants DMs. Only an accepted D17 confirmed Vibe unlocks ordinary 1:1 personal messaging (SOC-002).'
    };
  }

  return { authorized: true };
}

export async function sendDirectMessage(
  senderId: string,
  recipientId: string,
  content: string
): Promise<SendMessageResult> {
  const authCheck = await checkDmAuthorization(senderId, recipientId);
  if (!authCheck.authorized) {
    return { success: false, error: authCheck.reason };
  }

  try {
    const { data, error } = await supabase
      .from('direct_messages')
      .insert([
        {
          sender_id: senderId,
          recipient_id: recipientId,
          content,
          read: false,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      console.warn('Supabase sendDirectMessage error:', error);
      return { success: false, error: error.message };
    }
    return { success: true, message: data as DirectMessage };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to send message' };
  }
}

export async function fetchDirectMessages(user1Id: string, user2Id: string): Promise<DirectMessage[]> {
  const authCheck = await checkDmAuthorization(user1Id, user2Id);
  if (!authCheck.authorized) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`and(sender_id.eq.${user1Id},recipient_id.eq.${user2Id}),and(sender_id.eq.${user2Id},recipient_id.eq.${user1Id})`)
      .order('created_at', { ascending: true });

    if (error || !data) return [];
    return data as DirectMessage[];
  } catch {
    return [];
  }
}
