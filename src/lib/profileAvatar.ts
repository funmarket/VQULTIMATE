import { supabase } from './supabase';

const DB_NAME = 'vq-profile-pending-media';
const STORE_NAME = 'avatars';
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function validateAvatar(file: File): void {
  if (!Object.hasOwn(MIME_EXTENSIONS, file.type)) {
    throw new Error('Select a JPG, PNG, or WebP image.');
  }
  if (file.size === 0 || file.size > MAX_FILE_BYTES) {
    throw new Error('Avatar must be between 1 byte and 5 MB.');
  }
}

function openAvatarDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('Your browser cannot retain an avatar until email verification.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME);
      }
    };
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
  });
}

async function avatarRecord<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openAvatarDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const req = action(tx.objectStore(STORE_NAME));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

/** Keep a selected signup avatar in this browser until the email is verified. */
export async function queuePendingProfileAvatar(authUserId: string, file: File): Promise<void> {
  validateAvatar(file);
  await avatarRecord('readwrite', store => store.put(file, authUserId));
}

/** Authenticated uploads go to an owner-scoped path in a public avatar-only bucket. */
export async function uploadProfileAvatar(file: File, profileId: string): Promise<string> {
  validateAvatar(file);
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error('Sign in before uploading your avatar.');
  const uid = auth.user.id;
  const extension = MIME_EXTENSIONS[file.type];
  const path = `${uid}/${crypto.randomUUID()}.${extension}`;
  const { error: storageError } = await supabase.storage.from('avatars').upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (storageError) throw new Error(`Avatar upload failed: ${storageError.message}`);
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  const { data: saved, error: profileError } = await supabase.from('profiles')
    .update({ photo_url: data.publicUrl }).eq('id', profileId).select('id').maybeSingle();
  if (profileError || !saved) {
    throw new Error('Avatar uploaded, but the profile link could not be saved.');
  }
  return data.publicUrl;
}

/** Called only after a verified authenticated session has loaded the user profile. */
export async function uploadPendingProfileAvatar(authUserId: string, profileId: string): Promise<string | null> {
  let queued: File | undefined;
  try {
    queued = await avatarRecord<File | undefined>('readonly', store => store.get(authUserId));
  } catch (error) {
    console.warn('Pending avatar unavailable in this browser:', error);
    return null;
  }
  if (!queued) return null;
  const url = await uploadProfileAvatar(queued, profileId);
  await avatarRecord('readwrite', store => store.delete(authUserId));
  return url;
}
