import { supabase } from '../../lib/supabase';
import { VibePostItem, VibeComment } from './types';

export async function fetchVibePosts(): Promise<VibePostItem[]> {
  try {
    const { data, error } = await supabase
      .from('vibe_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return [];
    }

    return (data as any[]).map((row) => ({
      id: String(row.id),
      user_id: row.user_id || row.author_id || '',
      username: row.username || row.handle || row.author_name || 'explorer',
      avatar_url: row.avatar_url || row.avatar || '',
      caption: row.caption || row.content || '',
      image_url: row.image_url || row.image || '',
      selfie_url: row.selfie_url || row.avatar_url || '',
      composite_url: row.composite_url || undefined,
      lat: row.lat !== undefined && row.lat !== null ? Number(row.lat) : undefined,
      lng: row.lng !== undefined && row.lng !== null ? Number(row.lng) : undefined,
      created_at: row.created_at || new Date().toISOString(),
      reactions_count: row.reactions_count || row.likes_count || 0,
      comments_count: row.comments_count || 0
    }));
  } catch (err) {
    console.warn('Error fetching vibe posts from Supabase:', err);
    return [];
  }
}

export async function addReactionToPost(postId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('vibe_reactions')
      .insert([{ post_id: postId, created_at: new Date().toISOString() }]);
    return !error;
  } catch {
    return false;
  }
}

export async function fetchCommentsForPost(postId: string): Promise<VibeComment[]> {
  try {
    const { data, error } = await supabase
      .from('vibe_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error || !data) {
      return [];
    }

    return (data as any[]).map((row) => ({
      id: String(row.id),
      post_id: row.post_id,
      username: row.username || row.handle || 'explorer',
      avatar_url: row.avatar_url || row.avatar || '',
      content: row.content || row.comment || '',
      created_at: row.created_at || new Date().toISOString()
    }));
  } catch {
    return [];
  }
}

export async function addCommentToPost(
  postId: string,
  content: string,
  user: { username: string; avatar_url: string }
): Promise<VibeComment | null> {
  const newComment: VibeComment = {
    id: 'comm_' + Date.now(),
    post_id: postId,
    username: user.username,
    avatar_url: user.avatar_url,
    content,
    created_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase
      .from('vibe_comments')
      .insert([newComment])
      .select()
      .single();

    if (error || !data) {
      console.warn('Supabase addCommentToPost error:', error);
      return newComment;
    }
    return data as VibeComment;
  } catch {
    return newComment;
  }
}
