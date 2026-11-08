import { supabase } from '../../lib/supabase';
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
  // Browser object URLs expire with their creating context and must never
  // be persisted as post media or presented as durable remote content.
  if (post.image_url?.startsWith('blob:') || post.selfie_url?.startsWith('blob:')) {
    console.warn('Refusing to persist temporary blob URL as a Vibe post.');
    return false;
  }

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

    // Cache only after the backend has confirmed the durable post.
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_POSTS_KEY) : null;
      const list: VibePostItem[] = raw ? JSON.parse(raw) : [];
      if (!list.some(item => item.id === post.id)) list.unshift(post);
      if (typeof window !== 'undefined') localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(list));
    } catch {}
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
  let remoteComments: VibeComment[] = [];
  try {
    const { data, error } = await supabase
      .from('vibe_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      remoteComments = (data as any[]).map((row) => ({
        id: String(row.id),
        post_id: row.post_id,
        username: row.username || row.handle || 'explorer',
        avatar_url: row.avatar_url || row.avatar || '',
        content: row.content || row.comment || '',
        created_at: row.created_at || new Date().toISOString()
      }));
    }
  } catch (err) {
    console.warn('Error fetching comments from Supabase:', err);
  }

  let localComments: VibeComment[] = [];
  try {
    const key = `vq_vibe_comments_${postId}`;
    const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    if (raw) {
      localComments = JSON.parse(raw);
    }
  } catch {}

  const map = new Map<string, VibeComment>();
  [...remoteComments, ...localComments].forEach(c => {
    if (!map.has(c.id)) {
      map.set(c.id, c);
    }
  });

  const merged = Array.from(map.values());
  merged.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  return merged;
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
    const key = `vq_vibe_comments_${postId}`;
    const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    const list: VibeComment[] = raw ? JSON.parse(raw) : [];
    list.push(newComment);
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(list));
    }
  } catch {}

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
