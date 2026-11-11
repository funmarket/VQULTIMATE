import { supabase } from '@/lib/supabase';
import { AppNotification } from './types';

const LOCAL_NOTIFS_KEY = 'vq_notifications_local';

export async function fetchNotifications(): Promise<AppNotification[]> {
  let remoteNotifs: AppNotification[] = [];
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      remoteNotifs = (data as any[]).map((row) => ({
        id: String(row.id),
        title: row.title || 'Notification',
        message: row.message || row.content || '',
        type: row.type || 'system',
        created_at: row.created_at || new Date().toISOString(),
        read: Boolean(row.read)
      }));
    }
  } catch (err) {
    console.warn('Error fetching notifications from Supabase:', err);
  }

  let localNotifs: AppNotification[] = [];
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_NOTIFS_KEY) : null;
    if (raw) {
      localNotifs = JSON.parse(raw);
    }
  } catch {}

  const map = new Map<string, AppNotification>();
  [...remoteNotifs, ...localNotifs].forEach(n => {
    if (!map.has(n.id)) {
      map.set(n.id, n);
    }
  });

  const merged = Array.from(map.values());
  merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return merged;
}

export async function createNotification(notif: AppNotification): Promise<boolean> {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_NOTIFS_KEY) : null;
    const list: AppNotification[] = raw ? JSON.parse(raw) : [];
    list.unshift(notif);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify(list));
    }
  } catch {}

  try {
    const { error } = await supabase
      .from('notifications')
      .insert([{
        id: notif.id,
        title: notif.title,
        message: notif.message,
        type: notif.type,
        created_at: notif.created_at,
        read: notif.read
      }]);
    if (error) {
      console.warn('Supabase notifications insert warning:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase notifications insert exception:', err);
    return false;
  }
}

export async function markNotificationRead(id: string): Promise<boolean> {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_NOTIFS_KEY) : null;
    if (raw) {
      const list: AppNotification[] = JSON.parse(raw);
      const updated = list.map(n => n.id === id ? { ...n, read: true } : n);
      localStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify(updated));
    }
  } catch {}

  try {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
    return true;
  } catch {
    return false;
  }
}

export async function markAllNotificationsRead(): Promise<boolean> {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_NOTIFS_KEY) : null;
    if (raw) {
      const list: AppNotification[] = JSON.parse(raw);
      const updated = list.map(n => ({ ...n, read: true }));
      localStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify(updated));
    }
  } catch {}

  try {
    await supabase
      .from('notifications')
      .update({ read: true });
    return true;
  } catch {
    return false;
  }
}
