import { supabase } from '@/lib/supabase';
import { SharePostPayload } from './types';

export async function uploadMediaBlob(blob: Blob, path: string, isProfilePhoto = false): Promise<string> {
  const bucketName = isProfilePhoto ? 'users' : 'media';
  try {
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });

    if (uploadError) {
      console.warn(`Storage upload error to ${bucketName} bucket:`, uploadError);
      return '';
    }

    const { data } = supabase.storage.from(bucketName).getPublicUrl(path);
    return data.publicUrl;
  } catch (err) {
    console.warn(`Storage exception uploading to ${bucketName}:`, err);
    return '';
  }
}

export async function publishVibePost(payload: SharePostPayload): Promise<boolean> {
  try {
    const { error } = await supabase.from('vibe_posts').insert([
      {
        ...payload,
        created_at: new Date().toISOString()
      }
    ]);
    if (error) {
      console.warn('Supabase insert post error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Publish post exception:', err);
    return false;
  }
}
