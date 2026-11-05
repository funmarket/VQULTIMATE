import { supabase } from '../../lib/supabase';
import { SharePostPayload } from './types';

export async function uploadMediaBlob(blob: Blob, path: string): Promise<string> {
  try {
    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });

    if (uploadError) {
      console.warn('Storage upload error (using data URL fallback):', uploadError);
      return URL.createObjectURL(blob);
    }

    const { data } = supabase.storage.from('media').getPublicUrl(path);
    return data.publicUrl;
  } catch (err) {
    console.warn('Storage exception, returning object URL:', err);
    return URL.createObjectURL(blob);
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
      console.warn('Supabase insert post error, storing locally:', error);
      const existing = JSON.parse(localStorage.getItem('vq_local_posts') || '[]');
      localStorage.setItem('vq_local_posts', JSON.stringify([{ ...payload, id: 'local_' + Date.now(), created_at: new Date().toISOString() }, ...existing]));
    }
    return true;
  } catch (err) {
    console.warn('Publish post exception:', err);
    const existing = JSON.parse(localStorage.getItem('vq_local_posts') || '[]');
    localStorage.setItem('vq_local_posts', JSON.stringify([{ ...payload, id: 'local_' + Date.now(), created_at: new Date().toISOString() }, ...existing]));
    return true;
  }
}
