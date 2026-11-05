import { supabase } from '../../lib/supabase';
import { ConnectionPull, ConfirmedVibe, PullActionResult } from './types';

export async function sendConnectionPull(
  senderId: string,
  recipientId: string,
  reason?: string
): Promise<PullActionResult> {
  if (!senderId) {
    return { success: false, error: 'Guests must authenticate before protected social actions.' };
  }
  if (senderId === recipientId) {
    return { success: false, error: 'Users cannot PULL themselves.' };
  }

  try {
    const { data, error } = await supabase
      .from('connection_pulls')
      .insert([
        {
          sender_id: senderId,
          recipient_id: recipientId,
          reason: reason || 'Sent connection Pull to expand mutual district orbit.',
          status: 'pending',
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      console.warn('Supabase sendConnectionPull error:', error);
      return { success: false, error: error.message };
    }
    return { success: true, pull: data as ConnectionPull };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to send Connection Pull' };
  }
}

export async function acceptConnectionPull(
  pullId: string,
  currentUserId: string,
  senderId: string
): Promise<PullActionResult> {
  if (!currentUserId) {
    return { success: false, error: 'Guests must authenticate before protected social actions.' };
  }

  try {
    // 1. Update pull status to accepted
    const { error: updateErr } = await supabase
      .from('connection_pulls')
      .update({ status: 'accepted' })
      .eq('id', pullId)
      .eq('recipient_id', currentUserId);

    if (updateErr) {
      console.warn('Supabase accept pull update error:', updateErr);
    }

    // 2. Establish Confirmed Vibe record (unlocks D14 DMs)
    const { error: vibeErr } = await supabase
      .from('confirmed_vibes')
      .insert([
        {
          user_1_id: senderId,
          user_2_id: currentUserId,
          vibe_score: 95,
          unlocked_at: new Date().toISOString()
        }
      ]);

    if (vibeErr) {
      console.warn('Supabase confirmed_vibes insertion error:', vibeErr);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to accept connection pull' };
  }
}

export async function passConnectionPull(
  pullId: string,
  currentUserId: string
): Promise<PullActionResult> {
  if (!currentUserId) {
    return { success: false, error: 'Guests must authenticate before protected social actions.' };
  }

  try {
    const { error } = await supabase
      .from('connection_pulls')
      .update({ status: 'passed' })
      .eq('id', pullId)
      .eq('recipient_id', currentUserId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to pass connection pull' };
  }
}

export async function fetchPendingPulls(userId: string): Promise<ConnectionPull[]> {
  if (!userId) return [];
  try {
    const { data, error } = await supabase
      .from('connection_pulls')
      .select('*')
      .eq('recipient_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data as ConnectionPull[];
  } catch {
    return [];
  }
}

export async function fetchConfirmedVibes(userId: string): Promise<ConfirmedVibe[]> {
  if (!userId) return [];
  try {
    const { data, error } = await supabase
      .from('confirmed_vibes')
      .select('*')
      .or(`user_1_id.eq.${userId},user_2_id.eq.${userId}`)
      .order('unlocked_at', { ascending: false });

    if (error || !data) return [];
    return data as ConfirmedVibe[];
  } catch {
    return [];
  }
}

export async function checkHasConfirmedVibe(user1Id: string, user2Id: string): Promise<boolean> {
  if (!user1Id || !user2Id) return false;
  try {
    const { data, error } = await supabase
      .from('confirmed_vibes')
      .select('id')
      .or(`and(user_1_id.eq.${user1Id},user_2_id.eq.${user2Id}),and(user_1_id.eq.${user2Id},user_2_id.eq.${user1Id})`)
      .maybeSingle();

    if (!error && data) return true;
    return false;
  } catch {
    return false;
  }
}
