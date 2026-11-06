import { supabase } from '../../lib/supabase';
import type { SocialComment, SocialPost, SocialWriteResult } from './types';

type DatabasePost = {
  id: string;
  user_id: string;
  caption: string | null;
  image_uri: string | null;
  created_at: string | null;
};

type DatabaseComment = {
  id: string;
  post_id: string;
  author_profile_id: string;
  parent_comment_id: string | null;
  content: string;
  created_at: string;
};

type Author = { id: string; handle: string; photo_url: string | null };

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function loadAuthors(ids: string[]): Promise<Map<string, Author>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await supabase
    .from('profiles')
    .select('id,handle,photo_url')
    .in('id', [...new Set(ids)]);
  if (error) throw new Error(error.message);
  const authors = new Map<string, Author>(
    ((data || []) as Author[]).map(author => [author.id, author])
  );
  for (const id of ids) {
    if (!authors.has(id)) throw new Error('A social-content author profile is unavailable.');
  }
  return authors;
}

async function hydratePosts(rows: DatabasePost[]): Promise<SocialPost[]> {
  if (rows.length === 0) return [];
  const ids = rows.map(row => row.id);
  const authors = await loadAuthors(rows.map(row => row.user_id));
  const [commentsResponse, reactionsResponse] = await Promise.all([
    supabase.from('social_post_comments').select('post_id').in('post_id', ids),
    supabase.from('social_post_reactions').select('post_id').in('post_id', ids),
  ]);
  if (commentsResponse.error) throw new Error(commentsResponse.error.message);
  if (reactionsResponse.error) throw new Error(reactionsResponse.error.message);

  const comments = new Map<string, number>();
  const reactions = new Map<string, number>();
  for (const row of commentsResponse.data || []) {
    comments.set(row.post_id, (comments.get(row.post_id) || 0) + 1);
  }
  for (const row of reactionsResponse.data || []) {
    reactions.set(row.post_id, (reactions.get(row.post_id) || 0) + 1);
  }

  return rows.map(row => {
    const author = authors.get(row.user_id)!;
    return {
      id: row.id,
      user_id: row.user_id,
      username: author.handle,
      avatar_url: author.photo_url || '',
      caption: row.caption || '',
      image_url: row.image_uri || '',
      created_at: row.created_at || '',
      reactions_count: reactions.get(row.id) || 0,
      comments_count: comments.get(row.id) || 0,
    };
  });
}

async function requireAuth(): Promise<void> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Sign in to modify social content.');
}

/** Read real D12 posts; database errors are never converted into an empty feed. */
export async function fetchVibePosts(): Promise<SocialPost[]> {
  const { data, error } = await supabase
    .from('social_posts')
    .select('id,user_id,caption,image_uri,created_at')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return hydratePosts((data || []) as DatabasePost[]);
}

/** RLS owns author authorization. A post is returned only after INSERT succeeds. */
export async function createSocialPost(
  caption: string,
  authorProfileId: string
): Promise<SocialWriteResult<SocialPost>> {
  const text = caption.trim();
  if (!text) return { success: false, error: 'Post text is required.' };
  if (!authorProfileId) return { success: false, error: 'Profile is required.' };
  try {
    await requireAuth();
    const { data, error } = await supabase
      .from('social_posts')
      .insert({
        id: crypto.randomUUID(),
        user_id: authorProfileId,
        caption: text,
        content_kind: 'gossip',
        live_capture: false,
      })
      .select('id,user_id,caption,image_uri,created_at')
      .single();
    if (error || !data) {
      return { success: false, error: error?.message || 'Post was not saved.' };
    }
    const [post] = await hydratePosts([data as DatabasePost]);
    return { success: true, post };
  } catch (error) {
    return { success: false, error: message(error) };
  }
}

/** Comments are real D12 rows and retain their database-generated IDs. */
export async function fetchCommentsForPost(postId: string): Promise<SocialComment[]> {
  const { data, error } = await supabase
    .from('social_post_comments')
    .select('id,post_id,author_profile_id,parent_comment_id,content,created_at')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  const rows = (data || []) as DatabaseComment[];
  const authors = await loadAuthors(rows.map(row => row.author_profile_id));
  return rows.map(row => ({
    id: row.id,
    post_id: row.post_id,
    username: authors.get(row.author_profile_id)!.handle,
    avatar_url: authors.get(row.author_profile_id)!.photo_url || '',
    content: row.content,
    created_at: row.created_at,
    parent_comment_id: row.parent_comment_id,
  }));
}

export async function addCommentToPost(
  postId: string,
  content: string,
  authorProfileId: string,
  parentCommentId?: string
): Promise<SocialComment> {
  const text = content.trim();
  if (!postId || !text || text.length > 2000) throw new Error('Comment must contain 1–2000 characters.');
  await requireAuth();
  const { data, error } = await supabase
    .from('social_post_comments')
    .insert({
      post_id: postId,
      author_profile_id: authorProfileId,
      content: text,
      parent_comment_id: parentCommentId || null,
    })
    .select('id,post_id,author_profile_id,parent_comment_id,content,created_at')
    .single();
  if (error || !data) throw new Error(error?.message || 'Comment was not saved.');
  const authors = await loadAuthors([authorProfileId]);
  const author = authors.get(authorProfileId)!;
  return {
    id: data.id,
    post_id: data.post_id,
    username: author.handle,
    avatar_url: author.photo_url || '',
    content: data.content,
    created_at: data.created_at,
    parent_comment_id: data.parent_comment_id,
  };
}

/** Unique key and RLS enforce one reaction per user/type/post. */
export async function addReactionToPost(postId: string, authorProfileId: string): Promise<void> {
  await requireAuth();
  const { error } = await supabase
    .from('social_post_reactions')
    .insert({ post_id: postId, author_profile_id: authorProfileId, reaction_type: 'like' });
  if (error) throw new Error(error.message);
}

export async function removeReactionFromPost(postId: string, authorProfileId: string): Promise<void> {
  await requireAuth();
  const { data, error } = await supabase
    .from('social_post_reactions')
    .delete()
    .eq('post_id', postId)
    .eq('author_profile_id', authorProfileId)
    .eq('reaction_type', 'like')
    .select('id');
  if (error || !data?.length) throw new Error(error?.message || 'No owned reaction was removed.');
}

export async function deleteSocialPost(postId: string, authorProfileId: string): Promise<void> {
  await requireAuth();
  const { data, error } = await supabase
    .from('social_posts')
    .delete()
    .eq('id', postId)
    .eq('user_id', authorProfileId)
    .select('id');
  if (error || !data?.length) throw new Error(error?.message || 'No owned post was deleted.');
}
