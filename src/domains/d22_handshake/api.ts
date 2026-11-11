import { supabase } from '@/lib/supabase';
import { HandshakeRecord, HandshakeStatus } from './types';

const LOCAL_HANDSHAKES_KEY = 'vq_handshakes_store';

function getLocalHandshakes(): HandshakeRecord[] {
  try {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(LOCAL_HANDSHAKES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalHandshakes(records: HandshakeRecord[]): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_HANDSHAKES_KEY, JSON.stringify(records));
    }
  } catch {}
}

export async function initiateHandshake(
  requesterId: string,
  guardianId: string
): Promise<{ success: boolean; handshake?: HandshakeRecord; error?: string }> {
  if (!requesterId) return { success: false, error: 'Sign in before requesting a Handshake.' };
  if (!guardianId) return { success: false, error: 'Guardian identity is required.' };
  if (requesterId === guardianId) return { success: false, error: 'You cannot Handshake with yourself.' };

  const existingStatus = await getHandshakeStatus(requesterId, guardianId);
  if (existingStatus.status === 'accepted') {
    return { success: false, error: 'A verified Handshake is already established.' };
  }
  if (existingStatus.status === 'pending_sent') {
    return { success: false, error: 'A Handshake request is already pending with this Guardian.' };
  }

  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 7 * 86400 * 1000).toISOString();

  const newHandshake: HandshakeRecord = {
    id: 'hs_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    user_id: requesterId,
    requester_id: requesterId,
    guardian_id: guardianId,
    action_type: 'handshake',
    status: 'pending',
    issued_at: now,
    expires_at: expiresAt,
    created_at: now,
    updated_at: now
  };

  // Local fallback persistence
  const localList = getLocalHandshakes();
  localList.unshift(newHandshake);
  saveLocalHandshakes(localList);

  // Supabase remote persistence using the actual public.handshakes schema
  try {
    const { data, error } = await supabase
      .from('handshakes')
      .insert([{
        id: newHandshake.id,
        user_id: requesterId,
        guardian_id: guardianId,
        action_type: 'handshake',
        status: 'pending',
        issued_at: now,
        expires_at: expiresAt
      }])
      .select()
      .single();

    if (error || !data) {
      console.warn('Supabase handshakes insert notice:', error?.message);
      return { success: true, handshake: newHandshake };
    }
    const record: HandshakeRecord = {
      ...data,
      requester_id: data.user_id,
      created_at: data.issued_at || now,
      updated_at: data.issued_at || now
    };
    return { success: true, handshake: record };
  } catch {
    return { success: true, handshake: newHandshake };
  }
}

export async function acceptHandshake(
  handshakeId: string,
  guardianId: string
): Promise<{ success: boolean; error?: string }> {
  if (!handshakeId || !guardianId) return { success: false, error: 'Invalid Handshake acceptance.' };

  // Update local
  const localList = getLocalHandshakes();
  const index = localList.findIndex(h => h.id === handshakeId && h.guardian_id === guardianId);
  if (index !== -1) {
    localList[index].status = 'accepted';
    localList[index].updated_at = new Date().toISOString();
    saveLocalHandshakes(localList);
  }

  // Update Supabase
  try {
    const { error } = await supabase
      .from('handshakes')
      .update({ status: 'active' })
      .eq('id', handshakeId)
      .eq('guardian_id', guardianId);

    if (error) {
      console.warn('Supabase acceptHandshake notice:', error.message);
    }
    return { success: true };
  } catch {
    return { success: true };
  }
}

export async function declineHandshake(
  handshakeId: string,
  guardianId: string
): Promise<{ success: boolean; error?: string }> {
  if (!handshakeId || !guardianId) return { success: false, error: 'Invalid Handshake decision.' };

  // Update local
  const localList = getLocalHandshakes();
  const index = localList.findIndex(h => h.id === handshakeId && h.guardian_id === guardianId);
  if (index !== -1) {
    localList[index].status = 'declined';
    localList[index].updated_at = new Date().toISOString();
    saveLocalHandshakes(localList);
  }

  // Update Supabase
  try {
    const { error } = await supabase
      .from('handshakes')
      .update({ status: 'declined' })
      .eq('id', handshakeId)
      .eq('guardian_id', guardianId);

    if (error) {
      console.warn('Supabase declineHandshake notice:', error.message);
    }
    return { success: true };
  } catch {
    return { success: true };
  }
}

export async function getHandshakeStatus(
  currentUserId: string,
  guardianId: string
): Promise<{ status: HandshakeStatus; handshake?: HandshakeRecord }> {
  if (!currentUserId || !guardianId) return { status: 'none' };

  let remoteRecord: HandshakeRecord | null = null;
  try {
    const { data, error } = await supabase
      .from('handshakes')
      .select('*')
      .or(`and(user_id.eq.${currentUserId},guardian_id.eq.${guardianId}),and(user_id.eq.${guardianId},guardian_id.eq.${currentUserId})`)
      .order('issued_at', { ascending: false })
      .limit(1);

    if (!error && data && data.length > 0) {
      const raw = data[0];
      remoteRecord = {
        ...raw,
        requester_id: raw.user_id,
        created_at: raw.issued_at,
        updated_at: raw.issued_at
      } as HandshakeRecord;
    }
  } catch {}

  const localList = getLocalHandshakes();
  const localRecord = localList.find(
    h => ((h.user_id === currentUserId || h.requester_id === currentUserId) && h.guardian_id === guardianId) ||
         ((h.user_id === guardianId || h.requester_id === guardianId) && h.guardian_id === currentUserId)
  );

  const active = remoteRecord || localRecord;
  if (!active) return { status: 'none' };

  const isAccepted = active.status === 'accepted' || active.status === 'active';
  if (isAccepted) return { status: 'accepted', handshake: active };
  if (active.status === 'declined') return { status: 'declined', handshake: active };
  if (active.status === 'pending') {
    const sender = active.user_id || active.requester_id;
    if (sender === currentUserId) {
      return { status: 'pending_sent', handshake: active };
    }
    return { status: 'pending_received', handshake: active };
  }

  return { status: 'none' };
}

export async function hasCompletedHandshake(user1Id: string, user2Id: string): Promise<boolean> {
  const res = await getHandshakeStatus(user1Id, user2Id);
  return res.status === 'accepted';
}
