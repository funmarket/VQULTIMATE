import { supabase } from '../../lib/supabase';
import { VibePostItem, VibeComment } from './types';

export async function fetchVibePosts(): Promise<VibePostItem[]> {
  const localPosts: VibePostItem[] = JSON.parse(localStorage.getItem('vq_local_posts') || '[]');
  try {
    const { data, error } = await supabase
      .from('vibe_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return localPosts;
    }

    const formatted = (data as any[]).map((row) => ({
      id: String(row.id),
      user_id: row.user_id || row.author_id || '',
      username: row.username || row.handle || row.author_name || 'explorer',
      avatar_url: row.avatar_url || row.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      caption: row.caption || row.content || '',
      image_url: row.image_url || row.image || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80',
      selfie_url: row.selfie_url || row.avatar_url || '',
      composite_url: row.composite_url || undefined,
      lat: row.lat || 25.2048,
      lng: row.lng || 55.2708,
      created_at: row.created_at || new Date().toISOString(),
      reactions_count: row.reactions_count || row.likes_count || 0,
      comments_count: row.comments_count || 0
    }));

    const existingIds = new Set(formatted.map((p) => p.id));
    const uniqueLocal = localPosts.filter((p) => !existingIds.has(p.id));
    return [...uniqueLocal, ...formatted];
  } catch (err) {
    console.warn('Error fetching vibe posts from Supabase:', err);
    return localPosts;
  }
}

export async function addReactionToPost(postId: string): Promise<boolean> {
  try {
    await supabase.from('vibe_reactions').insert([{ post_id: postId, created_at: new Date().toISOString() }]);
    return true;
  } catch {
    return true;
  }
}

export async function fetchCommentsForPost(postId: string): Promise<VibeComment[]> {
  try {
    const { data, error } = await supabase
      .from('vibe_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error || !data || data.length === 0) {
      const localComments: Record<string, VibeComment[]> = JSON.parse(localStorage.getItem('vq_local_comments') || '{}');
      return localComments[postId] || [];
    }

    return (data as any[]).map((row) => ({
      id: String(row.id),
      post_id: row.post_id,
      username: row.username || row.handle || 'explorer',
      avatar_url: row.avatar_url || row.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      content: row.content || row.comment || '',
      created_at: row.created_at || new Date().toISOString()
    }));
  } catch {
    const localComments: Record<string, VibeComment[]> = JSON.parse(localStorage.getItem('vq_local_comments') || '{}');
    return localComments[postId] || [];
  }
}

export async function addCommentToPost(
  postId: string,
  content: string,
  user: { username: string; avatar_url: string }
): Promise<VibeComment> {
  const newComment: VibeComment = {
    id: 'comm_' + Date.now(),
    post_id: postId,
    username: user.username,
    avatar_url: user.avatar_url,
    content,
    created_at: new Date().toISOString()
  };

  // Cache locally
  const localComments: Record<string, VibeComment[]> = JSON.parse(localStorage.getItem('vq_local_comments') || '{}');
  if (!localComments[postId]) localComments[postId] = [];
  localComments[postId].push(newComment);
  localStorage.setItem('vq_local_comments', JSON.stringify(localComments));

  try {
    await supabase.from('vibe_comments').insert([newComment]);
  } catch {
    // handled locally
  }
  return newComment;
}
