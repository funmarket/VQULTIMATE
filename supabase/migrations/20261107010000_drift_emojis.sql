-- Migration: 20261107010000_drift_emojis.sql
-- Domain: D15 Drift Ephemeral Subsystem - Telegram-Style Emojis & Animated Emojis
-- Persistence Platform: Supabase PostgreSQL + Realtime

CREATE TABLE IF NOT EXISTS public.drift_emojis (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('animated', 'vibes', 'smiles', 'gestures', 'symbols')),
    character TEXT NOT NULL,
    animation_type TEXT DEFAULT 'pulse' CHECK (animation_type IN ('pulse', 'bounce', 'spin', 'shake', 'glow', 'float', 'flame')),
    is_animated BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- View/Synonym for Drift_emoji
CREATE OR REPLACE VIEW public.drift_emoji AS
SELECT * FROM public.drift_emojis;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_drift_emojis_cat_sort ON public.drift_emojis(category, sort_order ASC);
CREATE INDEX IF NOT EXISTS idx_drift_emojis_anim ON public.drift_emojis(is_animated);

-- Seed Animated & Standard Emojis
INSERT INTO public.drift_emojis (id, name, category, character, animation_type, is_animated, sort_order)
VALUES
    -- 1. COOL ANIMATED EMOJIS (Telegram style)
    ('anim_fire', 'Cosmic Flame', 'animated', '🔥', 'flame', true, 1),
    ('anim_heart', 'Pulsing Heart', 'animated', '❤️', 'pulse', true, 2),
    ('anim_sparkles', 'Starlight Spin', 'animated', '✨', 'spin', true, 3),
    ('anim_party', 'Confetti Pop', 'animated', '🎉', 'bounce', true, 4),
    ('anim_rocket', 'Wavelength Launch', 'animated', '🚀', 'float', true, 5),
    ('anim_mindblown', 'Mind Explosion', 'animated', '🤯', 'shake', true, 6),
    ('anim_laugh', 'Rolling Tears', 'animated', '🤣', 'bounce', true, 7),
    ('anim_lightning', 'Electric Frequency', 'animated', '⚡', 'glow', true, 8),
    ('anim_crystal', 'Aura Crystal', 'animated', '🔮', 'glow', true, 9),
    ('anim_alien', 'Pixel Invader', 'animated', '👾', 'bounce', true, 10),
    ('anim_ghost', 'Medina Ghost', 'animated', '👻', 'float', true, 11),
    ('anim_wave', 'Ocean Current', 'animated', '🌊', 'pulse', true, 12),
    ('anim_100', 'Full Energy', 'animated', '💯', 'pulse', true, 13),
    ('anim_sunglasses', 'Chill Master', 'animated', '😎', 'glow', true, 14),
    ('anim_devil', 'Neon Imp', 'animated', '😈', 'shake', true, 15),
    ('anim_eyes', 'Drift Radar Eyes', 'animated', '👀', 'pulse', true, 16),
    ('anim_kiss', 'Breeze Kiss', 'animated', '😘', 'pulse', true, 17),
    ('anim_diamond', 'Diamond Gem', 'animated', '💎', 'spin', true, 18),

    -- 2. VIBES & HEARTS
    ('vibe_heart_red', 'Red Heart', 'vibes', '❤️', 'pulse', false, 20),
    ('vibe_heart_fire', 'Heart on Fire', 'vibes', '❤️‍🔥', 'flame', true, 21),
    ('vibe_heart_sparkle', 'Sparkling Heart', 'vibes', '💖', 'glow', false, 22),
    ('vibe_heart_purple', 'Purple Heart', 'vibes', '💜', 'pulse', false, 23),
    ('vibe_heart_teal', 'Cyan Heart', 'vibes', '🩵', 'pulse', false, 24),
    ('vibe_heart_orange', 'Orange Heart', 'vibes', '🧡', 'pulse', false, 25),
    ('vibe_heart_yellow', 'Yellow Heart', 'vibes', '💛', 'pulse', false, 26),
    ('vibe_heart_green', 'Green Heart', 'vibes', '💚', 'pulse', false, 27),
    ('vibe_heart_blue', 'Blue Heart', 'vibes', '💙', 'pulse', false, 28),
    ('vibe_heart_black', 'Black Heart', 'vibes', '🖤', 'pulse', false, 29),
    ('vibe_heart_white', 'White Heart', 'vibes', '🤍', 'pulse', false, 30),
    ('vibe_heart_double', 'Two Hearts', 'vibes', '💕', 'pulse', false, 31),
    ('vibe_heart_grow', 'Growing Heart', 'vibes', '💗', 'pulse', false, 32),
    ('vibe_heart_revolving', 'Revolving Hearts', 'vibes', '💞', 'spin', false, 33),

    -- 3. SMILES & FACES
    ('smile_grin', 'Grinning Face', 'smiles', '😀', 'pulse', false, 40),
    ('smile_joy', 'Tears of Joy', 'smiles', '😂', 'bounce', false, 41),
    ('smile_cool', 'Smiling with Sunglasses', 'smiles', '😎', 'glow', false, 42),
    ('smile_star_eyes', 'Star-Struck', 'smiles', '🤩', 'spin', false, 43),
    ('smile_love', 'Heart Eyes', 'smiles', '😍', 'pulse', false, 44),
    ('smile_smirk', 'Smirking Face', 'smiles', '😏', 'shake', false, 45),
    ('smile_wink', 'Winking Face', 'smiles', '😉', 'bounce', false, 46),
    ('smile_blush', 'Blushing Smile', 'smiles', '😊', 'pulse', false, 47),
    ('smile_halo', 'Angel Smile', 'smiles', '😇', 'glow', false, 48),
    ('smile_warm', 'Smiling Face with Hearts', 'smiles', '🥰', 'pulse', false, 49),
    ('smile_drool', 'Drooling Face', 'smiles', '🤤', 'pulse', false, 50),
    ('smile_yawn', 'Yawning Face', 'smiles', '🥱', 'pulse', false, 51),
    ('smile_thinking', 'Thinking Face', 'smiles', '🤔', 'bounce', false, 52),
    ('smile_shush', 'Shushing Face', 'smiles', '🤫', 'pulse', false, 53),
    ('smile_party', 'Partying Face', 'smiles', '🥳', 'bounce', false, 54),
    ('smile_relief', 'Relieved Face', 'smiles', '😌', 'pulse', false, 55),

    -- 4. GESTURES
    ('gest_wave', 'Waving Hand', 'gestures', '👋', 'shake', false, 60),
    ('gest_thumbsup', 'Thumbs Up', 'gestures', '👍', 'bounce', false, 61),
    ('gest_peace', 'Victory Peace', 'gestures', '✌️', 'bounce', false, 62),
    ('gest_clap', 'Clapping Hands', 'gestures', '👏', 'bounce', false, 63),
    ('gest_pray', 'Folded Hands', 'gestures', '🙏', 'pulse', false, 64),
    ('gest_handshake', 'Handshake', 'gestures', '🤝', 'pulse', false, 65),
    ('gest_flex', 'Flexed Biceps', 'gestures', '💪', 'pulse', false, 66),
    ('gest_ok', 'OK Hand', 'gestures', '👌', 'bounce', false, 67),
    ('gest_pinch', 'Pinched Fingers', 'gestures', '🤌', 'bounce', false, 68),
    ('gest_fingerheart', 'Finger Heart', 'gestures', '🫰', 'pulse', false, 69),
    ('gest_rock', 'Sign of the Horns', 'gestures', '🤘', 'shake', false, 70),

    -- 5. SYMBOLS & OBJECTS
    ('symb_fire', 'Flame', 'symbols', '🔥', 'flame', false, 80),
    ('symb_sparkles', 'Sparkles', 'symbols', '✨', 'spin', false, 81),
    ('symb_zap', 'High Voltage', 'symbols', '⚡', 'glow', false, 82),
    ('symb_bomb', 'Bomb', 'symbols', '💣', 'shake', false, 83),
    ('symb_hundred', 'Hundred Points', 'symbols', '💯', 'pulse', false, 84),
    ('symb_collision', 'Collision', 'symbols', '💥', 'bounce', false, 85),
    ('symb_crystal', 'Crystal Ball', 'symbols', '🔮', 'glow', false, 86),
    ('symb_nazar', 'Nazar Amulet', 'symbols', '🧿', 'glow', false, 87),
    ('symb_target', 'Bullseye', 'symbols', '🎯', 'spin', false, 88),
    ('symb_note', 'Musical Notes', 'symbols', '🎶', 'float', false, 89),
    ('symb_trophy', 'Trophy', 'symbols', '🏆', 'glow', false, 90),
    ('symb_crown', 'Crown', 'symbols', '👑', 'glow', false, 91)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    character = EXCLUDED.character,
    animation_type = EXCLUDED.animation_type,
    is_animated = EXCLUDED.is_animated,
    sort_order = EXCLUDED.sort_order;

-- Row Level Security
ALTER TABLE public.drift_emojis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "drift_emojis_read_all" ON public.drift_emojis;
CREATE POLICY "drift_emojis_read_all" ON public.drift_emojis FOR SELECT USING (true);

DROP POLICY IF EXISTS "drift_emojis_admin_all" ON public.drift_emojis;
CREATE POLICY "drift_emojis_admin_all" ON public.drift_emojis FOR ALL USING (true) WITH CHECK (true);

-- Realtime
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.drift_emojis;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
