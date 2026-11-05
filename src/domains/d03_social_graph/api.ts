import { supabase } from '../../lib/supabase';
import { UserProfile } from '../d02_users';
import { SocialFollowResult } from './types';

export async function followUser(followerId: string, targetUserId: string): Promise<SocialFollowResult> {
  if (!followerId) {
    return { success: false, following: false, error: 'Guests must authenticate before protected social actions.' };
  }
  if (followerId === targetUserId) {
    return { success: false, following: false, error: 'Users cannot ECHO themselves.' };
  }

  try {
    const { error } = await supabase
      .from('follows')
      .insert([{ follower_id: followerId, following_id: targetUserId, created_at: new Date().toISOString() }]);

    if (error) {
      console.warn('Supabase follow error:', error);
      return { success: false, following: false, error: error.message };
    }
    return { success: true, following: true };
  } catch (err: any) {
    return { success: false, following: false, error: err?.message || 'Failed to ECHO user' };
  }
}

export async function unfollowUser(followerId: string, targetUserId: string): Promise<SocialFollowResult> {
  if (!followerId) {
    return { success: false, following: true, error: 'Guests must authenticate before protected social actions.' };
  }

  try {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', targetUserId);

    if (error) {
      console.warn('Supabase unfollow error:', error);
      return { success: false, following: true, error: error.message };
    }
    return { success: true, following: false };
  } catch (err: any) {
    return { success: false, following: true, error: err?.message || 'Failed to remove from Orbit' };
  }
}

export async function checkIsFollowing(followerId: string, targetUserId: string): Promise<boolean> {
  if (!followerId || !targetUserId || followerId === targetUserId) return false;
  try {
    const { data, error } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', targetUserId)
      .maybeSingle();

    if (!error && data) return true;
    return false;
  } catch {
    return false;
  }
}

export async function fetchOrbitProfiles(userId: string): Promise<UserProfile[]> {
  if (!userId) return [];
  try {
    const { data: followRows, error } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId);

    if (error || !followRows || followRows.length === 0) return [];
    const followingIds = followRows.map((r: any) => r.following_id);

    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('*')
      .in('id', followingIds);

    if (profErr || !profiles) return [];
    return (profiles as any[]).map((row) => ({
      id: row.id,
      username: row.handle || row.username || 'explorer',
      full_name: row.display_name || row.full_name || 'Explorer',
      avatar_url: row.avatar_url || row.avatar || '',
      bio: row.bio || '',
      district: row.district || 'Heritage Node',
      vq_balance: row.vq_balance || 0,
      reputation: row.reputation || 0,
      role: (row.handle === 'funmarketmn' || row.email === 'funmarketmn@hotmail.com') ? 'admin' : (row.role || 'explorer'),
      tier: row.tier || 'EXPLORER',
      trust_score: row.trust_score || 90,
      created_at: row.created_at || new Date().toISOString()
    }));
  } catch {
    return [];
  }
}

export async function fetchEchoProfiles(userId: string): Promise<UserProfile[]> {
  if (!userId) return [];
  try {
    const { data: followRows, error } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('following_id', userId);

    if (error || !followRows || followRows.length === 0) return [];
    const followerIds = followRows.map((r: any) => r.follower_id);

    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('*')
      .in('id', followerIds);

    if (profErr || !profiles) return [];
    return (profiles as any[]).map((row) => ({
      id: row.id,
      username: row.handle || row.username || 'explorer',
      full_name: row.display_name || row.full_name || 'Explorer',
      avatar_url: row.avatar_url || row.avatar || '',
      bio: row.bio || '',
      district: row.district || 'Heritage Node',
      vq_balance: row.vq_balance || 0,
      reputation: row.reputation || 0,
      role: (row.handle === 'funmarketmn' || row.email === 'funmarketmn@hotmail.com') ? 'admin' : (row.role || 'explorer'),
      tier: row.tier || 'EXPLORER',
      trust_score: row.trust_score || 90,
      created_at: row.created_at || new Date().toISOString()
    }));
  } catch {
    return [];
  }
}
