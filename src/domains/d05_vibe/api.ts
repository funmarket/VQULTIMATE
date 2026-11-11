import { supabase } from '@/lib/supabase';
import { VibePostItem, VibeComment } from './types';

const LOCAL_POSTS_KEY = 'vq_vibe_posts_local';

export async function fetchVibePosts(): Promise<VibePostItem[]> {
  let remotePosts: VibePostItem[] = [];
  try {
    const { data, error } = await supabase
      .from('vibe_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      remotePosts = (data as any[]).map((row) => ({
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
    }
  } catch (err) {
    console.warn('Error fetching vibe posts from Supabase:', err);
  }

  let localPosts: VibePostItem[] = [];
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_POSTS_KEY) : null;
    if (raw) {
      localPosts = JSON.parse(raw);
    }
  } catch {}

  const map = new Map<string, VibePostItem>();
  [...remotePosts, ...localPosts].forEach(p => {
    if (!map.has(p.id)) {
      map.set(p.id, p);
    }
  });

  const merged = Array.from(map.values());
  merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return merged;
}

export async function createVibePost(post: VibePostItem): Promise<boolean> {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_POSTS_KEY) : null;
    const list: VibePostItem[] = raw ? JSON.parse(raw) : [];
    list.unshift(post);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(list));
    }
  } catch {}

  try {
    const { error } = await supabase
      .from('vibe_posts')
      .insert([{
        id: post.id,
        user_id: post.user_id,
        username: post.username,
        avatar_url: post.avatar_url,
        caption: post.caption,
        image_url: post.image_url,
        selfie_url: post.selfie_url,
        created_at: post.created_at,
        reactions_count: post.reactions_count,
        comments_count: post.comments_count
      }]);
    if (error) {
      console.warn('Supabase vibe_posts insert warning:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase vibe_posts insert exception:', err);
    return false;
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
      console.warn('fetchCommentsForPost error:', error);
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
  } catch (err) {
    console.warn('fetchCommentsForPost exception:', err);
    return [];
  }
}

export async function addCommentToPost(
  postId: string,
  content: string,
  user: { username: string; avatar_url: string }
): Promise<VibeComment | null> {
  if (!content.trim()) return null;

  try {
    const commentId = 'comm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const payload = {
      id: commentId,
      post_id: postId,
      username: user.username,
      avatar_url: user.avatar_url,
      content: content.trim(),
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('vibe_comments')
      .insert([payload])
      .select()
      .single();

    if (error || !data) {
      console.warn('Supabase addCommentToPost error:', error);
      return null;
    }

    // Increment comments_count on vibe_posts
    try {
      const { data: postData } = await supabase.from('vibe_posts').select('comments_count').eq('id', postId).maybeSingle();
      const currentCount = (postData?.comments_count || 0) + 1;
      await supabase.from('vibe_posts').update({ comments_count: currentCount }).eq('id', postId);
    } catch (e) {
      console.warn('Failed to increment comments_count on vibe_posts:', e);
    }

    return data as VibeComment;
  } catch (err) {
    console.warn('Supabase addCommentToPost exception:', err);
    return null;
  }
}
