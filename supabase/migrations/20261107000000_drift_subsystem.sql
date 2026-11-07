-- Migration: 20261107000000_drift_subsystem.sql
-- Domain: D15 Drift Ephemeral Subsystem, D14 Private Ephemeral Messaging, D17 Matching Integration
-- Persistence Platform: Supabase PostgreSQL + Realtime
-- Project: avdfessrhbsqwlfmbdau

-- 1. Drift Rooms (12 Canonical Wavelengths)
CREATE TABLE IF NOT EXISTS public.drift_rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    color TEXT NOT NULL,
    banner_url TEXT,
    pinned_announcement TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed 12 Canonical Wavelength Rooms
INSERT INTO public.drift_rooms (id, name, description, color, banner_url, pinned_announcement)
VALUES
    ('chill', 'Chill Vibes', 'zero plans, maximum good energy. just exist together', 'bg-teal-400', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80', 'Welcome to Chill Vibes! Keep it respectful, keep it anonymous, and enjoy the energy!'),
    ('sweat', 'Sweat Vibes', 'gym, run, flow, or sport — let’s sweat the same wavelength', 'bg-red-400', 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1200&q=80', 'Hydrate, push the pulse, and conquer today’s side quest!'),
    ('lounge', 'Lounge Vibes', 'coffee shops, rooftops, vinyl & zero rush, pure cozy mode', 'bg-amber-400', 'https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=1200&q=80', 'Pour some slow drip and unwind under the golden hour skylight.'),
    ('brain', 'Brain Vibes', 'deep talks, wild ideas, 3am theories, brainrot besties welcome', 'bg-purple-400', 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80', 'What is your craziest district theory? Open floor for wild thinkers.'),
    ('sunset', 'Sunset Vibes', 'golden hour walks, rooftop sits, chasing that orange sky glow', 'bg-orange-400', 'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?auto=format&fit=crop&w=1200&q=80', 'Catch the twilight rays from Carthage cliffs to Sidi Bou Said.'),
    ('mellow', 'Mellow Vibes', 'slow mornings, soft playlists, doing nothing but feeling everything', 'bg-cyan-400', 'https://images.unsplash.com/photo-1470246973918-29a93221c455?auto=format&fit=crop&w=1200&q=80', 'Soft lo-fi beats, warm herbal infusion, and peaceful quiet.'),
    ('echo', 'Echo Vibes', 'instant click, same frequency, we just get each other', 'bg-emerald-400', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80', 'When frequency matches, distance disappears.'),
    ('zen', 'Zen Vibes', 'breathwork, nature reset, calm your chaos together', 'bg-green-400', 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80', 'Inhale stillness, exhale distortion. Reset your inner frequency.'),
    ('groove', 'Groove Vibes', 'music, dance, kitchen concerts — let’s move to the same beat', 'bg-pink-400', 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80', 'Drop your current track ID or synth melody!'),
    ('pixel', 'Pixel Vibes', 'gaming sessions, late night streams, digital world twins', 'bg-indigo-400', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80', 'Retro consoles, neon rigs, and midnight speedruns.'),
    ('quest', 'Quest Vibes', 'spontaneous adventures, hidden spots, real life side quests', 'bg-amber-500', 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80', 'Active side quest: Find the hidden courtyard arch behind the souk.'),
    ('wander', 'Wander', 'just wander away, get lost and lose yourself in an unplanned journey with no map', 'bg-teal-500', 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80', 'No map required. Follow the breeze and trust the drift.')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    color = EXCLUDED.color,
    banner_url = EXCLUDED.banner_url,
    pinned_announcement = EXCLUDED.pinned_announcement;

-- 2. Drift Temporary Aliases
CREATE TABLE IF NOT EXISTS public.drift_aliases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id TEXT NOT NULL REFERENCES public.drift_rooms(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    handle TEXT NOT NULL,
    avatar_color TEXT NOT NULL DEFAULT '#14b8a6',
    avatar_mask TEXT NOT NULL DEFAULT 'neon_mask',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '3 hours'),
    CONSTRAINT uq_drift_room_user_alias UNIQUE(room_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_drift_aliases_room_handle ON public.drift_aliases(room_id, handle);
CREATE INDEX IF NOT EXISTS idx_drift_aliases_expires ON public.drift_aliases(expires_at);

-- 3. Drift Room Presence (Heartbeat & Real Souls Count)
CREATE TABLE IF NOT EXISTS public.drift_room_presence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id TEXT NOT NULL REFERENCES public.drift_rooms(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    alias_id UUID REFERENCES public.drift_aliases(id) ON DELETE CASCADE,
    alias_handle TEXT NOT NULL,
    avatar_color TEXT DEFAULT '#14b8a6',
    last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_drift_room_user_presence UNIQUE(room_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_drift_presence_room_hb ON public.drift_room_presence(room_id, last_heartbeat);

-- 4. Drift Messages (Strict Ephemeral 3-Hour Expiration)
CREATE TABLE IF NOT EXISTS public.drift_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id TEXT NOT NULL REFERENCES public.drift_rooms(id) ON DELETE CASCADE,
    alias_id UUID REFERENCES public.drift_aliases(id) ON DELETE SET NULL,
    alias_handle TEXT NOT NULL,
    avatar_color TEXT DEFAULT '#14b8a6',
    sender_user_id TEXT NOT NULL,
    content TEXT,
    media_url TEXT,
    media_type TEXT CHECK (media_type IN ('photo', 'voice', NULL)),
    voice_duration INTEGER,
    reply_to_id UUID REFERENCES public.drift_messages(id) ON DELETE SET NULL,
    reply_to_handle TEXT,
    reply_to_snippet TEXT,
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '3 hours')
);
CREATE INDEX IF NOT EXISTS idx_drift_messages_room_created ON public.drift_messages(room_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_drift_messages_expires ON public.drift_messages(expires_at);

-- 5. Drift Message Reactions
CREATE TABLE IF NOT EXISTS public.drift_message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.drift_messages(id) ON DELETE CASCADE,
    alias_handle TEXT NOT NULL,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_drift_reaction UNIQUE(message_id, alias_handle, emoji)
);
CREATE INDEX IF NOT EXISTS idx_drift_reactions_msg ON public.drift_message_reactions(message_id);

-- 6. Drift Private Threads (1:1 Anonymous Conversations)
CREATE TABLE IF NOT EXISTS public.drift_private_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id TEXT REFERENCES public.drift_rooms(id) ON DELETE SET NULL,
    alias_1_id UUID REFERENCES public.drift_aliases(id) ON DELETE SET NULL,
    alias_1_handle TEXT NOT NULL,
    user_1_id TEXT NOT NULL,
    alias_2_id UUID REFERENCES public.drift_aliases(id) ON DELETE SET NULL,
    alias_2_handle TEXT NOT NULL,
    user_2_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'blocked')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '3 hours'),
    CONSTRAINT uq_drift_private_thread_users UNIQUE(room_id, user_1_id, user_2_id)
);
CREATE INDEX IF NOT EXISTS idx_drift_priv_threads_users ON public.drift_private_threads(user_1_id, user_2_id);
CREATE INDEX IF NOT EXISTS idx_drift_priv_threads_expires ON public.drift_private_threads(expires_at);

-- 7. Drift Private Messages
CREATE TABLE IF NOT EXISTS public.drift_private_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES public.drift_private_threads(id) ON DELETE CASCADE,
    sender_user_id TEXT NOT NULL,
    sender_alias_handle TEXT NOT NULL,
    content TEXT,
    media_url TEXT,
    media_type TEXT CHECK (media_type IN ('photo', 'voice', NULL)),
    voice_duration INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '3 hours')
);
CREATE INDEX IF NOT EXISTS idx_drift_priv_msgs_thread ON public.drift_private_messages(thread_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_drift_priv_msgs_expires ON public.drift_private_messages(expires_at);

-- 8. Drift Bottles ("Message in a Bottle" / Cast a Drift)
CREATE TABLE IF NOT EXISTS public.drift_bottles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id TEXT NOT NULL REFERENCES public.drift_rooms(id) ON DELETE CASCADE,
    sender_alias_id UUID REFERENCES public.drift_aliases(id) ON DELETE SET NULL,
    sender_alias_handle TEXT NOT NULL,
    sender_user_id TEXT NOT NULL,
    content VARCHAR(240) NOT NULL,
    picked_up BOOLEAN DEFAULT FALSE,
    picked_up_by_user_id TEXT,
    picked_up_by_handle TEXT,
    picked_up_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '3 hours')
);
CREATE INDEX IF NOT EXISTS idx_drift_bottles_room_unpicked ON public.drift_bottles(room_id, picked_up, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_drift_bottles_expires ON public.drift_bottles(expires_at);

-- 9. Drift Bilateral Reveal Requests ("Reveal Vibe Handle")
CREATE TABLE IF NOT EXISTS public.drift_reveal_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES public.drift_private_threads(id) ON DELETE CASCADE,
    requester_user_id TEXT NOT NULL,
    target_user_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_drift_reveal_thread_req UNIQUE(thread_id, requester_user_id)
);
CREATE INDEX IF NOT EXISTS idx_drift_reveal_thread ON public.drift_reveal_requests(thread_id);

-- 10. Drift Room Moderators & Actions
CREATE TABLE IF NOT EXISTS public.drift_room_moderators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id TEXT NOT NULL REFERENCES public.drift_rooms(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'moderator',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_drift_room_mod UNIQUE(room_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.drift_moderation_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id TEXT NOT NULL REFERENCES public.drift_rooms(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('pin', 'unpin', 'delete_message', 'mute', 'ban', 'report')),
    target_id TEXT NOT NULL,
    reason TEXT,
    moderator_user_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. RPC: Cleanup expired drift records (authoritative server-side expiration)
CREATE OR REPLACE FUNCTION public.cleanup_expired_drift()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.drift_messages WHERE expires_at <= NOW();
    DELETE FROM public.drift_private_messages WHERE expires_at <= NOW();
    DELETE FROM public.drift_bottles WHERE expires_at <= NOW();
    DELETE FROM public.drift_room_presence WHERE last_heartbeat < (NOW() - INTERVAL '90 seconds');
    DELETE FROM public.drift_aliases WHERE expires_at <= NOW();
END;
$$;

-- 12. Storage Bucket for Drift Media (Photos & Voice Notes)
INSERT INTO storage.buckets (id, name, public)
VALUES ('drift_media', 'drift_media', true)
ON CONFLICT (id) DO NOTHING;

-- 13. Enable Row Level Security (RLS) and permissive Drift policies
ALTER TABLE public.drift_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drift_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drift_room_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drift_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drift_message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drift_private_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drift_private_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drift_bottles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drift_reveal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drift_room_moderators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drift_moderation_actions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- drift_rooms policies
    DROP POLICY IF EXISTS "drift_rooms_read_all" ON public.drift_rooms;
    CREATE POLICY "drift_rooms_read_all" ON public.drift_rooms FOR SELECT USING (true);
    DROP POLICY IF EXISTS "drift_rooms_write_all" ON public.drift_rooms;
    CREATE POLICY "drift_rooms_write_all" ON public.drift_rooms FOR ALL USING (true) WITH CHECK (true);

    -- drift_aliases policies
    DROP POLICY IF EXISTS "drift_aliases_all" ON public.drift_aliases;
    CREATE POLICY "drift_aliases_all" ON public.drift_aliases FOR ALL USING (true) WITH CHECK (true);

    -- drift_room_presence policies
    DROP POLICY IF EXISTS "drift_presence_all" ON public.drift_room_presence;
    CREATE POLICY "drift_presence_all" ON public.drift_room_presence FOR ALL USING (true) WITH CHECK (true);

    -- drift_messages policies
    DROP POLICY IF EXISTS "drift_messages_all" ON public.drift_messages;
    CREATE POLICY "drift_messages_all" ON public.drift_messages FOR ALL USING (true) WITH CHECK (true);

    -- drift_message_reactions policies
    DROP POLICY IF EXISTS "drift_reactions_all" ON public.drift_message_reactions;
    CREATE POLICY "drift_reactions_all" ON public.drift_message_reactions FOR ALL USING (true) WITH CHECK (true);

    -- drift_private_threads policies
    DROP POLICY IF EXISTS "drift_private_threads_all" ON public.drift_private_threads;
    CREATE POLICY "drift_private_threads_all" ON public.drift_private_threads FOR ALL USING (true) WITH CHECK (true);

    -- drift_private_messages policies
    DROP POLICY IF EXISTS "drift_private_messages_all" ON public.drift_private_messages;
    CREATE POLICY "drift_private_messages_all" ON public.drift_private_messages FOR ALL USING (true) WITH CHECK (true);

    -- drift_bottles policies
    DROP POLICY IF EXISTS "drift_bottles_all" ON public.drift_bottles;
    CREATE POLICY "drift_bottles_all" ON public.drift_bottles FOR ALL USING (true) WITH CHECK (true);

    -- drift_reveal_requests policies
    DROP POLICY IF EXISTS "drift_reveal_all" ON public.drift_reveal_requests;
    CREATE POLICY "drift_reveal_all" ON public.drift_reveal_requests FOR ALL USING (true) WITH CHECK (true);

    -- drift_room_moderators & actions policies
    DROP POLICY IF EXISTS "drift_moderators_all" ON public.drift_room_moderators;
    CREATE POLICY "drift_moderators_all" ON public.drift_room_moderators FOR ALL USING (true) WITH CHECK (true);
    DROP POLICY IF EXISTS "drift_moderation_actions_all" ON public.drift_moderation_actions;
    CREATE POLICY "drift_moderation_actions_all" ON public.drift_moderation_actions FOR ALL USING (true) WITH CHECK (true);
END $$;

-- 14. Realtime publication
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.drift_messages;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.drift_message_reactions;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.drift_room_presence;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.drift_private_messages;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.drift_bottles;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.drift_reveal_requests;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
