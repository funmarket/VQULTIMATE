import { supabase } from '../../lib/supabase';
import {
  DriftRoom,
  DriftAlias,
  DriftPresence,
  DriftMessage,
  DriftPrivateThread,
  DriftPrivateMessage,
  DriftBottle,
  DriftRevealRequest,
  DriftModerationAction,
  DriftEmoji,
} from './types';

// Fallback canonical rooms metadata (strict visual & naming specification)
export const CANONICAL_WAVELENGTH_ROOMS: DriftRoom[] = [
  {
    id: 'chill',
    name: 'Chill Vibes',
    description: 'zero plans, maximum good energy. just exist together',
    color: 'bg-teal-400',
    banner_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    pinned_announcement: 'Welcome to Chill Vibes! Keep it respectful, keep it anonymous, and enjoy the energy!'
  },
  {
    id: 'sweat',
    name: 'Sweat Vibes',
    description: 'gym, run, flow, or sport — let’s sweat the same wavelength',
    color: 'bg-red-400',
    banner_url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1200&q=80',
    pinned_announcement: 'Hydrate, push the pulse, and conquer today’s side quest!'
  },
  {
    id: 'lounge',
    name: 'Lounge Vibes',
    description: 'coffee shops, rooftops, vinyl & zero rush, pure cozy mode',
    color: 'bg-amber-400',
    banner_url: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=1200&q=80',
    pinned_announcement: 'Pour some slow drip and unwind under the golden hour skylight.'
  },
  {
    id: 'brain',
    name: 'Brain Vibes',
    description: 'deep talks, wild ideas, 3am theories, brainrot besties welcome',
    color: 'bg-purple-400',
    banner_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
    pinned_announcement: 'What is your craziest district theory? Open floor for wild thinkers.'
  },
  {
    id: 'sunset',
    name: 'Sunset Vibes',
    description: 'golden hour walks, rooftop sits, chasing that orange sky glow',
    color: 'bg-orange-400',
    banner_url: 'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?auto=format&fit=crop&w=1200&q=80',
    pinned_announcement: 'Catch the twilight rays from Carthage cliffs to Sidi Bou Said.'
  },
  {
    id: 'mellow',
    name: 'Mellow Vibes',
    description: 'slow mornings, soft playlists, doing nothing but feeling everything',
    color: 'bg-cyan-400',
    banner_url: 'https://images.unsplash.com/photo-1470246973918-29a93221c455?auto=format&fit=crop&w=1200&q=80',
    pinned_announcement: 'Soft lo-fi beats, warm herbal infusion, and peaceful quiet.'
  },
  {
    id: 'echo',
    name: 'Echo Vibes',
    description: 'instant click, same frequency, we just get each other',
    color: 'bg-emerald-400',
    banner_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80',
    pinned_announcement: 'When frequency matches, distance disappears.'
  },
  {
    id: 'zen',
    name: 'Zen Vibes',
    description: 'breathwork, nature reset, calm your chaos together',
    color: 'bg-green-400',
    banner_url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80',
    pinned_announcement: 'Inhale stillness, exhale distortion. Reset your inner frequency.'
  },
  {
    id: 'groove',
    name: 'Groove Vibes',
    description: 'music, dance, kitchen concerts — let’s move to the same beat',
    color: 'bg-pink-400',
    banner_url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80',
    pinned_announcement: 'Drop your current track ID or synth melody!'
  },
  {
    id: 'pixel',
    name: 'Pixel Vibes',
    description: 'gaming sessions, late night streams, digital world twins',
    color: 'bg-indigo-400',
    banner_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80',
    pinned_announcement: 'Retro consoles, neon rigs, and midnight speedruns.'
  },
  {
    id: 'quest',
    name: 'Quest Vibes',
    description: 'spontaneous adventures, hidden spots, real life side quests',
    color: 'bg-amber-500',
    banner_url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80',
    pinned_announcement: 'Active side quest: Find the hidden courtyard arch behind the souk.'
  },
  {
    id: 'wander',
    name: 'Wander',
    description: 'just wander away, get lost and lose yourself in an unplanned journey with no map',
    color: 'bg-teal-500',
    banner_url: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80',
    pinned_announcement: 'No map required. Follow the breeze and trust the drift.'
  }
];

// Random handle prefixes & suffixes
const ALIAS_PREFIXES = [
  'velvet', 'desert', 'midnight', 'zen', 'neon', 'sunset',
  'carthage', 'solitary', 'mellow', 'pixel', 'oasis', 'twilight',
  'astral', 'medina', 'golden', 'shadow', 'cyber', 'aurora', 'mystic'
];
const ALIAS_SUFFIXES = [
  'nomad', 'echo', 'owl', 'wanderer', 'flaneur', 'drifter',
  'shadow', 'voyager', 'breeze', 'scout', 'djinn', 'rover',
  'ghost', 'seeker', 'sage', 'rider', 'poet', 'dreamer', 'pilot'
];
const AVATAR_COLORS = [
  '#06b6d4', '#14b8a6', '#f59e0b', '#ec4899', '#8b5cf6',
  '#10b981', '#f97316', '#3b82f6', '#eab308', '#a855f7'
];

export function generateRandomHandle(): { handle: string; color: string } {
  const p = ALIAS_PREFIXES[Math.floor(Math.random() * ALIAS_PREFIXES.length)];
  const s = ALIAS_SUFFIXES[Math.floor(Math.random() * ALIAS_SUFFIXES.length)];
  const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
  return { handle: `@${p}_${s}`, color };
}

// 1. Fetch Drift Rooms
export async function fetchDriftRooms(): Promise<DriftRoom[]> {
  try {
    const { data, error } = await supabase
      .from('drift_rooms')
      .select('*')
      .order('id', { ascending: true });

    if (!error && data && data.length > 0) {
      return data as DriftRoom[];
    }
  } catch (err) {
    console.warn('fetchDriftRooms warning, falling back to canonical:', err);
  }
  return CANONICAL_WAVELENGTH_ROOMS;
}

// 2. Room Presence & Active Souls
export async function fetchRoomPresenceSouls(roomId: string): Promise<DriftPresence[]> {
  try {
    const ninetySecAgo = new Date(Date.now() - 90 * 1000).toISOString();
    const { data, error } = await supabase
      .from('drift_room_presence')
      .select('*')
      .eq('room_id', roomId)
      .gt('last_heartbeat', ninetySecAgo)
      .order('last_heartbeat', { ascending: false });

    if (!error && data) {
      return data as DriftPresence[];
    }
  } catch (err) {
    console.warn('fetchRoomPresenceSouls warning:', err);
  }
  return [];
}

export async function recordRoomPresence(
  roomId: string,
  userId: string,
  aliasId: string | undefined,
  aliasHandle: string,
  avatarColor: string = '#14b8a6',
  gender?: 'M' | 'F' | null
): Promise<void> {
  if (!roomId || !userId) return;
  try {
    const upsertData: any = {
      room_id: roomId,
      user_id: userId,
      alias_id: aliasId,
      alias_handle: aliasHandle,
      avatar_color: avatarColor,
      last_heartbeat: new Date().toISOString()
    };
    if (gender) upsertData.gender = gender;
    await supabase
      .from('drift_room_presence')
      .upsert(upsertData, { onConflict: 'room_id,user_id' });
  } catch (err) {
    console.warn('recordRoomPresence error:', err);
  }
}

export async function leaveRoomPresence(roomId: string, userId: string): Promise<void> {
  if (!roomId || !userId) return;
  try {
    await supabase
      .from('drift_room_presence')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', userId);
  } catch (err) {
    console.warn('leaveRoomPresence error:', err);
  }
}

// 3. Aliases (Temporary 3-hour Identity with Gender selection)
export async function getOrCreateDriftAlias(
  roomId: string,
  userId: string,
  customHandle?: string,
  avatarColor?: string,
  gender?: 'M' | 'F' | null
): Promise<DriftAlias> {
  const now = new Date().toISOString();
  try {
    // Check if active alias already exists for this room & user
    const { data: existing, error } = await supabase
      .from('drift_aliases')
      .select('*')
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .gt('expires_at', now)
      .maybeSingle();

    if (!error && existing) {
      return existing as DriftAlias;
    }

    // Otherwise create a new alias
    const chosenHandle = customHandle?.trim().startsWith('@')
      ? customHandle.trim()
      : customHandle ? `@${customHandle.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')}` : generateRandomHandle().handle;
    const chosenColor = avatarColor || generateRandomHandle().color;
    const expiresAt = new Date(Date.now() + 3 * 3600 * 1000).toISOString();

    const upsertData: any = {
      room_id: roomId,
      user_id: userId,
      handle: chosenHandle,
      avatar_color: chosenColor,
      avatar_mask: 'neon_mask',
      created_at: now,
      expires_at: expiresAt
    };
    if (gender) upsertData.gender = gender;

    const { data: created, error: insertErr } = await supabase
      .from('drift_aliases')
      .upsert(upsertData, { onConflict: 'room_id,user_id' })
      .select()
      .single();

    if (!insertErr && created) {
      return created as DriftAlias;
    }
  } catch (err) {
    console.warn('getOrCreateDriftAlias exception:', err);
  }

  // Graceful in-session alias fallback if DB is unmigrated
  const gen = generateRandomHandle();
  return {
    id: `local_alias_${Date.now()}`,
    room_id: roomId,
    user_id: userId,
    handle: customHandle || gen.handle,
    avatar_color: avatarColor || gen.color,
    avatar_mask: 'neon_mask',
    gender: gender || 'M',
    created_at: now,
    expires_at: new Date(Date.now() + 3 * 3600 * 1000).toISOString()
  };
}

export async function updateDriftAlias(payload: {
  roomId: string;
  userId: string;
  handle: string;
  avatarColor?: string;
  gender?: 'M' | 'F' | null;
}): Promise<{ success: boolean; alias?: DriftAlias; error?: string }> {
  try {
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 3 * 3600 * 1000).toISOString();
    const cleanHandle = payload.handle.trim().startsWith('@')
      ? payload.handle.trim()
      : `@${payload.handle.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;

    const upsertData: any = {
      room_id: payload.roomId,
      user_id: payload.userId,
      handle: cleanHandle,
      avatar_color: payload.avatarColor || '#14b8a6',
      avatar_mask: 'neon_mask',
      created_at: now,
      expires_at: expiresAt
    };
    if (payload.gender) upsertData.gender = payload.gender;

    const { data, error } = await supabase
      .from('drift_aliases')
      .upsert(upsertData, { onConflict: 'room_id,user_id' })
      .select()
      .maybeSingle();

    if (error) {
      console.warn('updateDriftAlias warning:', error);
    }

    return {
      success: true,
      alias: data ? (data as DriftAlias) : {
        id: `alias_${Date.now()}`,
        room_id: payload.roomId,
        user_id: payload.userId,
        handle: cleanHandle,
        avatar_color: payload.avatarColor || '#14b8a6',
        avatar_mask: 'neon_mask',
        gender: payload.gender || 'M',
        created_at: now,
        expires_at: expiresAt
      }
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update alias' };
  }
}

// 4. Room Messages (Public Group Chat with 3-Hour Expiry)
export async function fetchRoomMessages(roomId: string): Promise<DriftMessage[]> {
  try {
    const now = new Date().toISOString();
    const { data: msgs, error } = await supabase
      .from('drift_messages')
      .select('*')
      .eq('room_id', roomId)
      .gt('expires_at', now)
      .order('created_at', { ascending: true });

    if (error || !msgs) {
      return [];
    }

    // Fetch reactions for these messages
    const msgIds = msgs.map(m => m.id);
    let reactionsMap: Record<string, Record<string, number>> = {};
    if (msgIds.length > 0) {
      const { data: reactions } = await supabase
        .from('drift_message_reactions')
        .select('*')
        .in('message_id', msgIds);

      if (reactions) {
        reactions.forEach((r: any) => {
          if (!reactionsMap[r.message_id]) reactionsMap[r.message_id] = {};
          reactionsMap[r.message_id][r.emoji] = (reactionsMap[r.message_id][r.emoji] || 0) + 1;
        });
      }
    }

    return msgs.map((m: any) => ({
      ...m,
      reactions: reactionsMap[m.id] || {}
    })) as DriftMessage[];
  } catch (err) {
    console.warn('fetchRoomMessages error:', err);
    return [];
  }
}

export async function sendRoomMessage(payload: {
  roomId: string;
  aliasId?: string;
  aliasHandle: string;
  avatarColor?: string;
  senderUserId: string;
  gender?: 'M' | 'F' | null;
  content: string | null;
  mediaUrl?: string | null;
  mediaType?: 'photo' | 'voice' | null;
  voiceDuration?: number | null;
  replyToId?: string | null;
  replyToHandle?: string | null;
  replyToSnippet?: string | null;
}): Promise<{ success: boolean; message?: DriftMessage; error?: string }> {
  try {
    const expiresAt = new Date(Date.now() + 3 * 3600 * 1000).toISOString();
    const insertObj: any = {
      room_id: payload.roomId,
      alias_id: payload.aliasId,
      alias_handle: payload.aliasHandle,
      avatar_color: payload.avatarColor || '#14b8a6',
      sender_user_id: payload.senderUserId,
      content: payload.content,
      media_url: payload.mediaUrl,
      media_type: payload.mediaType,
      voice_duration: payload.voiceDuration,
      reply_to_id: payload.replyToId,
      reply_to_handle: payload.replyToHandle,
      reply_to_snippet: payload.replyToSnippet,
      is_pinned: false,
      created_at: new Date().toISOString(),
      expires_at: expiresAt
    };
    if (payload.gender) insertObj.gender = payload.gender;

    const { data, error } = await supabase
      .from('drift_messages')
      .insert([insertObj])
      .select()
      .single();

    if (error) {
      console.warn('sendRoomMessage error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, message: { ...data, reactions: {} } as DriftMessage };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to send message' };
  }
}

// 5. Message Reactions
export async function toggleMessageReaction(
  messageId: string,
  aliasHandle: string,
  emoji: string
): Promise<boolean> {
  try {
    const { data: existing, error } = await supabase
      .from('drift_message_reactions')
      .select('id')
      .eq('message_id', messageId)
      .eq('alias_handle', aliasHandle)
      .eq('emoji', emoji)
      .maybeSingle();

    if (error && (error as any).code === 'PGRST205') {
      console.warn('drift_message_reactions table pending Supabase migration. Optimistic toggle active.');
      return true;
    }

    if (existing) {
      await supabase.from('drift_message_reactions').delete().eq('id', existing.id);
      return false; // removed
    } else {
      await supabase.from('drift_message_reactions').insert([
        {
          message_id: messageId,
          alias_handle: aliasHandle,
          emoji,
          created_at: new Date().toISOString()
        }
      ]);
      return true; // added
    }
  } catch (err) {
    console.warn('toggleMessageReaction error:', err);
    return true;
  }
}

export async function deleteRoomMessage(messageId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('drift_messages').delete().eq('id', messageId);
    if (error) {
      console.warn('deleteRoomMessage error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('deleteRoomMessage exception:', err);
    return false;
  }
}

// 6. Message in a Bottle ("Cast a Drift" & "Pick Up Drift")
export async function castDriftBottle(payload: {
  roomId: string;
  senderAliasId?: string;
  senderAliasHandle: string;
  senderUserId: string;
  content: string;
}): Promise<{ success: boolean; bottle?: DriftBottle; error?: string }> {
  if (!payload.content || payload.content.length > 240) {
    return { success: false, error: 'Bottle message must be between 1 and 240 characters.' };
  }

  try {
    // 12-Hour float for global floating bottles
    const expiresAt = new Date(Date.now() + 12 * 3600 * 1000).toISOString();
    const newBottleData = {
      room_id: payload.roomId,
      sender_alias_id: payload.senderAliasId,
      sender_alias_handle: payload.senderAliasHandle,
      sender_user_id: payload.senderUserId,
      content: payload.content.trim(),
      picked_up: false,
      created_at: new Date().toISOString(),
      expires_at: expiresAt
    };

    const { data, error } = await supabase
      .from('drift_bottles')
      .insert([newBottleData])
      .select()
      .single();

    if (error) {
      console.warn('castDriftBottle Supabase error:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true, bottle: data as DriftBottle };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to cast bottle' };
  }
}

// Global Floating Bottles across all 12 rooms (12-hour expiration)
export async function fetchFloatingBottles(_roomId?: string): Promise<DriftBottle[]> {
  try {
    const now = new Date().toISOString();
    // 1. Authoritative cleanup: delete all expired bottles older than 12 hours
    await supabase
      .from('drift_bottles')
      .delete()
      .lt('expires_at', now);

    // 2. Fetch all active floating bottles across ALL 12 rooms
    const { data, error } = await supabase
      .from('drift_bottles')
      .select('*')
      .eq('picked_up', false)
      .gt('expires_at', now)
      .order('created_at', { ascending: false });

    if (!error && data) {
      return data as DriftBottle[];
    }
  } catch (err) {
    console.warn('fetchFloatingBottles error:', err);
  }
  return [];
}

export async function pickupDriftBottle(
  bottleId: string,
  pickerUserId: string,
  pickerHandle: string
): Promise<{ success: boolean; threadId?: string; error?: string }> {
  try {
    // 1. Fetch bottle
    const { data: bottle, error: bErr } = await supabase
      .from('drift_bottles')
      .select('*')
      .eq('id', bottleId)
      .maybeSingle();

    if (bErr || !bottle) return { success: false, error: 'Bottle was not found or has already expired.' };
    if (bottle.picked_up) return { success: false, error: 'This bottle was already scooped up by another voyager.' };
    if (bottle.sender_user_id === pickerUserId) return { success: false, error: 'You cannot pick up your own bottle.' };

    // 2. Atomic concurrency-safe claim: prevent multiple users from claiming the same bottle
    const { data: updatedRows, error: updateErr } = await supabase
      .from('drift_bottles')
      .update({
        picked_up: true,
        picked_up_by_user_id: pickerUserId,
        picked_up_by_handle: pickerHandle,
        picked_up_at: new Date().toISOString()
      })
      .eq('id', bottleId)
      .eq('picked_up', false)
      .select();

    if (updateErr || !updatedRows || updatedRows.length === 0) {
      return { success: false, error: 'Another voyager scooped up this bottle first in the current!' };
    }

    // 3. Create private anonymous conversation between bottle caster & picker
    const threadRes = await createOrGetPrivateThread({
      roomId: bottle.room_id,
      user1Id: bottle.sender_user_id,
      alias1Handle: bottle.sender_alias_handle,
      user2Id: pickerUserId,
      alias2Handle: pickerHandle
    });

    if (threadRes.success && threadRes.thread) {
      // Send the initial bottle message into the thread
      await sendPrivateMessage({
        threadId: threadRes.thread.id,
        senderUserId: bottle.sender_user_id,
        senderAliasHandle: bottle.sender_alias_handle,
        content: `🌊 [Bottle Picked Up]: "${bottle.content}"`
      });
    }

    // 4. Immediately delete the picked up bottle from drift_bottles so it disappears from all rooms
    await supabase
      .from('drift_bottles')
      .delete()
      .eq('id', bottleId);

    return {
      success: true,
      threadId: threadRes.thread?.id
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to pickup bottle' };
  }
}

// 6b. App Admin Pinning & Unpinning (Specific Room OR Across All 12 Rooms)
export async function updateRoomAnnouncement(payload: {
  roomId?: string;
  announcement: string | null;
  moderatorUserId: string;
  scope: 'room' | 'all';
}): Promise<{ success: boolean; error?: string }> {
  try {
    const isGlobal = payload.scope === 'all' || !payload.roomId || payload.roomId === 'all';

    // 1. Update database records in drift_rooms
    if (isGlobal) {
      await supabase
        .from('drift_rooms')
        .update({ pinned_announcement: payload.announcement });
    } else if (payload.roomId) {
      await supabase
        .from('drift_rooms')
        .update({ pinned_announcement: payload.announcement })
        .eq('id', payload.roomId);
    }

    // 2. Log moderation audit record
    await logModerationAction({
      roomId: isGlobal ? 'all' : (payload.roomId || 'all'),
      actionType: payload.announcement ? 'pin' : 'unpin',
      targetId: payload.announcement || 'cleared',
      reason: isGlobal ? 'Global announcement across all 12 rooms' : `Room announcement for ${payload.roomId}`,
      moderatorUserId: payload.moderatorUserId
    });

    // 3. Broadcast update over Realtime channel for instant multi-user synchronization
    try {
      const channel = supabase.channel('drift_announcements');
      channel.send({
        type: 'broadcast',
        event: 'pinned_announcement_updated',
        payload: {
          roomId: isGlobal ? 'all' : payload.roomId,
          announcement: payload.announcement,
          scope: payload.scope
        }
      });
    } catch (bcErr) {
      console.warn('Realtime announcement broadcast warning:', bcErr);
    }

    return { success: true };
  } catch (err: any) {
    console.warn('updateRoomAnnouncement error:', err);
    return { success: false, error: err?.message || 'Failed to update announcement' };
  }
}

// 7. Private Drift Conversations (1:1 Anonymous Chat with 3-Hour Expiry)
export async function createOrGetPrivateThread(payload: {
  roomId?: string;
  user1Id: string;
  alias1Handle: string;
  user2Id: string;
  alias2Handle: string;
}): Promise<{ success: boolean; thread?: DriftPrivateThread; error?: string }> {
  if (payload.user1Id === payload.user2Id) {
    return { success: false, error: 'Cannot start a private Drift with yourself.' };
  }

  try {
    const now = new Date().toISOString();
    // Check existing active thread between these two users
    const { data: existing, error } = await supabase
      .from('drift_private_threads')
      .select('*')
      .or(`and(user_1_id.eq.${payload.user1Id},user_2_id.eq.${payload.user2Id}),and(user_1_id.eq.${payload.user2Id},user_2_id.eq.${payload.user1Id})`)
      .gt('expires_at', now)
      .maybeSingle();

    if (!error && existing) {
      return { success: true, thread: existing as DriftPrivateThread };
    }

    // Insert new thread with 3-hour expiry
    const expiresAt = new Date(Date.now() + 3 * 3600 * 1000).toISOString();
    const { data: created, error: insertErr } = await supabase
      .from('drift_private_threads')
      .insert([
        {
          room_id: payload.roomId,
          alias_1_handle: payload.alias1Handle,
          user_1_id: payload.user1Id,
          alias_2_handle: payload.alias2Handle,
          user_2_id: payload.user2Id,
          status: 'active',
          created_at: now,
          expires_at: expiresAt
        }
      ])
      .select()
      .single();

    if (insertErr) {
      return { success: false, error: insertErr.message };
    }

    return { success: true, thread: created as DriftPrivateThread };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to start private Drift' };
  }
}

export async function fetchPrivateThreadById(threadId: string): Promise<DriftPrivateThread | null> {
  try {
    const { data, error } = await supabase
      .from('drift_private_threads')
      .select('*')
      .eq('id', threadId)
      .maybeSingle();

    if (error) {
      console.warn('fetchPrivateThreadById error:', error);
      return null;
    }
    return data as DriftPrivateThread;
  } catch (err) {
    console.warn('fetchPrivateThreadById exception:', err);
    return null;
  }
}

export async function fetchUserPrivateThreads(userId: string): Promise<DriftPrivateThread[]> {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('drift_private_threads')
      .select('*')
      .or(`user_1_id.eq.${userId},user_2_id.eq.${userId}`)
      .gt('expires_at', now)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('fetchUserPrivateThreads error:', error);
      return [];
    }
    return (data || []) as DriftPrivateThread[];
  } catch (err) {
    console.warn('fetchUserPrivateThreads exception:', err);
    return [];
  }
}

export async function fetchPrivateMessages(threadId: string): Promise<DriftPrivateMessage[]> {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('drift_private_messages')
      .select('*')
      .eq('thread_id', threadId)
      .gt('expires_at', now)
      .order('created_at', { ascending: true });

    if (!error && data) {
      return data as DriftPrivateMessage[];
    }
  } catch (err) {
    console.warn('fetchPrivateMessages error:', err);
  }
  return [];
}

export async function sendPrivateMessage(payload: {
  threadId: string;
  senderUserId: string;
  senderAliasHandle: string;
  content: string | null;
  mediaUrl?: string | null;
  mediaType?: 'photo' | 'voice' | null;
  voiceDuration?: number | null;
}): Promise<{ success: boolean; message?: DriftPrivateMessage; error?: string }> {
  try {
    const expiresAt = new Date(Date.now() + 3 * 3600 * 1000).toISOString();
    const { data, error } = await supabase
      .from('drift_private_messages')
      .insert([
        {
          thread_id: payload.threadId,
          sender_user_id: payload.senderUserId,
          sender_alias_handle: payload.senderAliasHandle,
          content: payload.content,
          media_url: payload.mediaUrl,
          media_type: payload.mediaType,
          voice_duration: payload.voiceDuration,
          created_at: new Date().toISOString(),
          expires_at: expiresAt
        }
      ])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, message: data as DriftPrivateMessage };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to send message' };
  }
}

// 8. Mutual Reveal Vibe Handle Handshake -> D17 Confirmed Vibe & D14 Permanent DMs
export async function fetchRevealRequest(threadId: string): Promise<DriftRevealRequest[]> {
  try {
    const { data, error } = await supabase
      .from('drift_reveal_requests')
      .select('*')
      .eq('thread_id', threadId);

    if (!error && data) return data as DriftRevealRequest[];
  } catch (err) {
    console.warn('fetchRevealRequest error:', err);
  }
  return [];
}

export async function requestVibeReveal(
  threadId: string,
  requesterUserId: string,
  targetUserId: string
): Promise<{ success: boolean; mutualAccepted?: boolean; error?: string }> {
  try {
    // 1. Check if other user already requested reveal
    const { data: counterReq } = await supabase
      .from('drift_reveal_requests')
      .select('*')
      .eq('thread_id', threadId)
      .eq('requester_user_id', targetUserId)
      .eq('status', 'pending')
      .maybeSingle();

    if (counterReq) {
      // Mutual reveal established!
      // Update counterReq to accepted
      await supabase
        .from('drift_reveal_requests')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', counterReq.id);

      // Insert our own accepted record
      await supabase
        .from('drift_reveal_requests')
        .upsert({
          thread_id: threadId,
          requester_user_id: requesterUserId,
          target_user_id: targetUserId,
          status: 'accepted',
          updated_at: new Date().toISOString()
        }, { onConflict: 'thread_id,requester_user_id' });

      // Establish D17 Confirmed Vibe
      await supabase
        .from('confirmed_vibes')
        .insert([
          {
            user_1_id: requesterUserId,
            user_2_id: targetUserId,
            vibe_score: 98,
            unlocked_at: new Date().toISOString()
          }
        ]);

      return { success: true, mutualAccepted: true };
    }

    // Otherwise record our single-sided pending request
    const { error: insErr } = await supabase
      .from('drift_reveal_requests')
      .upsert(
        {
          thread_id: threadId,
          requester_user_id: requesterUserId,
          target_user_id: targetUserId,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        { onConflict: 'thread_id,requester_user_id' }
      );

    if (insErr) return { success: false, error: insErr.message };

    return { success: true, mutualAccepted: false };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to request reveal' };
  }
}

// 9. Media & Voice Upload to dedicated `drift_media` bucket
export async function uploadDriftMedia(
  file: Blob | File,
  type: 'photo' | 'voice'
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const ext = type === 'voice' ? 'webm' : 'jpg';
    const fileName = `${type}_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
    const filePath = `drift_uploads/${fileName}`;

    const { error } = await supabase.storage
      .from('drift_media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      return { success: false, error: 'Media upload failed: ' + error.message };
    }

    const { data: publicUrlData } = supabase.storage
      .from('drift_media')
      .getPublicUrl(filePath);

    return { success: true, url: publicUrlData.publicUrl };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Media upload encountered an unexpected error.' };
  }
}

// 10. Moderation actions (Pin / Delete / Report)
export async function logModerationAction(payload: {
  roomId: string;
  actionType: 'pin' | 'unpin' | 'delete_message' | 'mute' | 'ban' | 'report';
  targetId: string;
  reason?: string;
  moderatorUserId: string;
}): Promise<void> {
  try {
    await supabase.from('drift_moderation_actions').insert([
      {
        room_id: payload.roomId,
        action_type: payload.actionType,
        target_id: payload.targetId,
        reason: payload.reason,
        moderator_user_id: payload.moderatorUserId,
        created_at: new Date().toISOString()
      }
    ]);
  } catch (err) {
    console.warn('logModerationAction error:', err);
  }
}

// 11. Drift Emojis (Telegram-style animated & standard emojis)
export const CANONICAL_DRIFT_EMOJIS: DriftEmoji[] = [
  // Animated
  { id: 'anim_fire', name: 'Cosmic Flame', category: 'animated', character: '🔥', animation_type: 'flame', is_animated: true, sort_order: 1 },
  { id: 'anim_heart', name: 'Pulsing Heart', category: 'animated', character: '❤️', animation_type: 'pulse', is_animated: true, sort_order: 2 },
  { id: 'anim_sparkles', name: 'Starlight Spin', category: 'animated', character: '✨', animation_type: 'spin', is_animated: true, sort_order: 3 },
  { id: 'anim_party', name: 'Confetti Pop', category: 'animated', character: '🎉', animation_type: 'bounce', is_animated: true, sort_order: 4 },
  { id: 'anim_rocket', name: 'Wavelength Launch', category: 'animated', character: '🚀', animation_type: 'float', is_animated: true, sort_order: 5 },
  { id: 'anim_mindblown', name: 'Mind Explosion', category: 'animated', character: '🤯', animation_type: 'shake', is_animated: true, sort_order: 6 },
  { id: 'anim_laugh', 'name': 'Rolling Tears', category: 'animated', character: '🤣', animation_type: 'bounce', is_animated: true, sort_order: 7 },
  { id: 'anim_lightning', name: 'Electric Frequency', category: 'animated', character: '⚡', animation_type: 'glow', is_animated: true, sort_order: 8 },
  { id: 'anim_crystal', name: 'Aura Crystal', category: 'animated', character: '🔮', animation_type: 'glow', is_animated: true, sort_order: 9 },
  { id: 'anim_alien', name: 'Pixel Invader', category: 'animated', character: '👾', animation_type: 'bounce', is_animated: true, sort_order: 10 },
  { id: 'anim_ghost', name: 'Medina Ghost', category: 'animated', character: '👻', animation_type: 'float', is_animated: true, sort_order: 11 },
  { id: 'anim_wave', name: 'Ocean Current', category: 'animated', character: '🌊', animation_type: 'pulse', is_animated: true, sort_order: 12 },
  { id: 'anim_100', name: 'Full Energy', category: 'animated', character: '💯', animation_type: 'pulse', is_animated: true, sort_order: 13 },
  { id: 'anim_sunglasses', name: 'Chill Master', category: 'animated', character: '😎', animation_type: 'glow', is_animated: true, sort_order: 14 },
  { id: 'anim_devil', name: 'Neon Imp', category: 'animated', character: '😈', animation_type: 'shake', is_animated: true, sort_order: 15 },
  { id: 'anim_eyes', name: 'Drift Radar Eyes', category: 'animated', character: '👀', animation_type: 'pulse', is_animated: true, sort_order: 16 },
  { id: 'anim_kiss', name: 'Breeze Kiss', category: 'animated', character: '😘', animation_type: 'pulse', is_animated: true, sort_order: 17 },
  { id: 'anim_diamond', name: 'Diamond Gem', category: 'animated', character: '💎', animation_type: 'spin', is_animated: true, sort_order: 18 },

  // Vibes & Hearts
  { id: 'vibe_heart_red', name: 'Red Heart', category: 'vibes', character: '❤️', animation_type: 'pulse', is_animated: false, sort_order: 20 },
  { id: 'vibe_heart_fire', name: 'Heart on Fire', category: 'vibes', character: '❤️‍🔥', animation_type: 'flame', is_animated: true, sort_order: 21 },
  { id: 'vibe_heart_sparkle', name: 'Sparkling Heart', category: 'vibes', character: '💖', animation_type: 'glow', is_animated: false, sort_order: 22 },
  { id: 'vibe_heart_purple', name: 'Purple Heart', category: 'vibes', character: '💜', animation_type: 'pulse', is_animated: false, sort_order: 23 },
  { id: 'vibe_heart_teal', name: 'Cyan Heart', category: 'vibes', character: '🩵', animation_type: 'pulse', is_animated: false, sort_order: 24 },
  { id: 'vibe_heart_orange', name: 'Orange Heart', category: 'vibes', character: '🧡', animation_type: 'pulse', is_animated: false, sort_order: 25 },
  { id: 'vibe_heart_yellow', name: 'Yellow Heart', category: 'vibes', character: '💛', animation_type: 'pulse', is_animated: false, sort_order: 26 },
  { id: 'vibe_heart_green', name: 'Green Heart', category: 'vibes', character: '💚', animation_type: 'pulse', is_animated: false, sort_order: 27 },
  { id: 'vibe_heart_blue', name: 'Blue Heart', category: 'vibes', character: '💙', animation_type: 'pulse', is_animated: false, sort_order: 28 },
  { id: 'vibe_heart_double', name: 'Two Hearts', category: 'vibes', character: '💕', animation_type: 'pulse', is_animated: false, sort_order: 29 },

  // Smiles
  { id: 'smile_grin', name: 'Grinning Face', category: 'smiles', character: '😀', animation_type: 'pulse', is_animated: false, sort_order: 40 },
  { id: 'smile_joy', name: 'Tears of Joy', category: 'smiles', character: '😂', animation_type: 'bounce', is_animated: false, sort_order: 41 },
  { id: 'smile_cool', name: 'Sunglasses', category: 'smiles', character: '😎', animation_type: 'glow', is_animated: false, sort_order: 42 },
  { id: 'smile_star_eyes', name: 'Star-Struck', category: 'smiles', character: '🤩', animation_type: 'spin', is_animated: false, sort_order: 43 },
  { id: 'smile_love', name: 'Heart Eyes', category: 'smiles', character: '😍', animation_type: 'pulse', is_animated: false, sort_order: 44 },
  { id: 'smile_smirk', name: 'Smirking Face', category: 'smiles', character: '😏', animation_type: 'shake', is_animated: false, sort_order: 45 },
  { id: 'smile_wink', name: 'Winking Face', category: 'smiles', character: '😉', animation_type: 'bounce', is_animated: false, sort_order: 46 },
  { id: 'smile_blush', name: 'Blushing Smile', category: 'smiles', character: '😊', animation_type: 'pulse', is_animated: false, sort_order: 47 },
  { id: 'smile_halo', name: 'Angel Smile', category: 'smiles', character: '😇', animation_type: 'glow', is_animated: false, sort_order: 48 },
  { id: 'smile_warm', name: 'Smiling with Hearts', category: 'smiles', character: '🥰', animation_type: 'pulse', is_animated: false, sort_order: 49 },
  { id: 'smile_party', name: 'Partying Face', category: 'smiles', character: '🥳', animation_type: 'bounce', is_animated: false, sort_order: 50 },
  { id: 'smile_thinking', name: 'Thinking Face', category: 'smiles', character: '🤔', animation_type: 'bounce', is_animated: false, sort_order: 51 },

  // Gestures
  { id: 'gest_wave', name: 'Waving Hand', category: 'gestures', character: '👋', animation_type: 'shake', is_animated: false, sort_order: 60 },
  { id: 'gest_thumbsup', name: 'Thumbs Up', category: 'gestures', character: '👍', animation_type: 'bounce', is_animated: false, sort_order: 61 },
  { id: 'gest_peace', name: 'Victory Peace', category: 'gestures', character: '✌️', animation_type: 'bounce', is_animated: false, sort_order: 62 },
  { id: 'gest_clap', name: 'Clapping Hands', category: 'gestures', character: '👏', animation_type: 'bounce', is_animated: false, sort_order: 63 },
  { id: 'gest_pray', name: 'Folded Hands', category: 'gestures', character: '🙏', animation_type: 'pulse', is_animated: false, sort_order: 64 },
  { id: 'gest_handshake', name: 'Handshake', category: 'gestures', character: '🤝', animation_type: 'pulse', is_animated: false, sort_order: 65 },
  { id: 'gest_flex', name: 'Flexed Biceps', category: 'gestures', character: '💪', animation_type: 'pulse', is_animated: false, sort_order: 66 },
  { id: 'gest_fingerheart', name: 'Finger Heart', category: 'gestures', character: '🫰', animation_type: 'pulse', is_animated: false, sort_order: 67 },
  { id: 'gest_rock', name: 'Sign of the Horns', category: 'gestures', character: '🤘', animation_type: 'shake', is_animated: false, sort_order: 68 },

  // Symbols
  { id: 'symb_fire', name: 'Flame', category: 'symbols', character: '🔥', animation_type: 'flame', is_animated: false, sort_order: 80 },
  { id: 'symb_sparkles', name: 'Sparkles', category: 'symbols', character: '✨', animation_type: 'spin', is_animated: false, sort_order: 81 },
  { id: 'symb_zap', name: 'High Voltage', category: 'symbols', character: '⚡', animation_type: 'glow', is_animated: false, sort_order: 82 },
  { id: 'symb_hundred', name: 'Hundred Points', category: 'symbols', character: '💯', animation_type: 'pulse', is_animated: false, sort_order: 83 },
  { id: 'symb_crystal', name: 'Crystal Ball', category: 'symbols', character: '🔮', animation_type: 'glow', is_animated: false, sort_order: 84 },
  { id: 'symb_nazar', name: 'Nazar Amulet', category: 'symbols', character: '🧿', animation_type: 'glow', is_animated: false, sort_order: 85 },
  { id: 'symb_target', name: 'Bullseye', category: 'symbols', character: '🎯', animation_type: 'spin', is_animated: false, sort_order: 86 },
  { id: 'symb_note', name: 'Musical Notes', category: 'symbols', character: '🎶', animation_type: 'float', is_animated: false, sort_order: 87 }
];

export async function fetchDriftEmojis(): Promise<DriftEmoji[]> {
  try {
    const { data, error } = await supabase
      .from('drift_emojis')
      .select('*')
      .order('sort_order', { ascending: true });

    if (!error && data && data.length > 0) {
      return data as DriftEmoji[];
    }
  } catch (err) {
    console.warn('fetchDriftEmojis warning, falling back to canonical:', err);
  }
  return CANONICAL_DRIFT_EMOJIS;
}
