import { supabase } from '../../lib/supabase';
import { VibePostItem, VibeComment } from './types';

export const INITIAL_VIBE_POSTS: VibePostItem[] = [
  {
    id: 'post-1',
    user_id: 'usr_guardian_01',
    username: 'tariq_guardian',
    avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    caption: 'Sunset patrol across the Old Souk textile arcades. The incense burn is electric tonight! #VibeCheck',
    image_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80',
    selfie_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    composite_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80',
    lat: 25.2048,
    lng: 55.2708,
    created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    reactions_count: 34,
    comments_count: 5
  },
  {
    id: 'post-2',
    user_id: 'usr_explorer_02',
    username: 'layla_vibes',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    caption: 'Found this hidden holographic mural behind the Marina dock 7. Augmented reality is breathing new life into old walls.',
    image_url: 'https://images.unsplash.com/photo-1561214115-f2f134cc4912?auto=format&fit=crop&w=800&q=80',
    selfie_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    lat: 25.2150,
    lng: 55.2850,
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    reactions_count: 52,
    comments_count: 12
  },
  {
    id: 'post-3',
    user_id: 'usr_admin_03',
    username: 'vq_admin',
    avatar_url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=200&q=80',
    caption: 'Network pulse check: 428 active explorers within the central orbit ring. Keep your locators tuned.',
    image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    lat: 25.1950,
    lng: 55.2500,
    created_at: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    reactions_count: 88,
    comments_count: 19
  }
];

export async function fetchVibePosts(): Promise<VibePostItem[]> {
  try {
    const { data, error } = await supabase
      .from('vibe_posts')
      .select('*')
      .order('created_at', { ascending: false });

    const localPosts = JSON.parse(localStorage.getItem('vq_local_posts') || '[]');

    if (error || !data || data.length === 0) {
      return [...localPosts, ...INITIAL_VIBE_POSTS];
    }
    return [...localPosts, ...(data as VibePostItem[])];
  } catch {
    const localPosts = JSON.parse(localStorage.getItem('vq_local_posts') || '[]');
    return [...localPosts, ...INITIAL_VIBE_POSTS];
  }
}

export async function addReactionToPost(postId: string): Promise<boolean> {
  try {
    // In real app, upsert reaction
    return true;
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
      return [
        {
          id: 'comm-1',
          post_id: postId,
          username: 'tariq_guardian',
          avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
          content: 'Amazing spot! Added to the Vibe Orbit ring.',
          created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString()
        }
      ];
    }
    return data as VibeComment[];
  } catch {
    return [];
  }
}

export async function addCommentToPost(postId: string, content: string, user: { username: string; avatar_url: string }): Promise<VibeComment> {
  const newComment: VibeComment = {
    id: 'comm_' + Date.now(),
    post_id: postId,
    username: user.username,
    avatar_url: user.avatar_url,
    content,
    created_at: new Date().toISOString()
  };
  try {
    await supabase.from('vibe_comments').insert([newComment]);
  } catch {
    // local fallback
  }
  return newComment;
}
