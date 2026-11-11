-- Migration: 20261110_vibe_orbit_promotions_validations_meetups.sql
-- Description: Schema for business promotions, community validations, check-ins, and spot meetups.

-- 1. Business Promotions table
CREATE TABLE IF NOT EXISTS public.place_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id TEXT NOT NULL,
  place_title TEXT NOT NULL,
  sponsor_user_id TEXT NOT NULL,
  total_vq_funded INTEGER NOT NULL CHECK (total_vq_funded > 0),
  remaining_vq_pool INTEGER NOT NULL CHECK (remaining_vq_pool >= 0),
  reward_per_checkin INTEGER NOT NULL CHECK (reward_per_checkin > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'depleted', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_place_promotions_place_id ON public.place_promotions(place_id);
CREATE INDEX IF NOT EXISTS idx_place_promotions_status ON public.place_promotions(status);

-- 2. Place Check-ins ledger
CREATE TABLE IF NOT EXISTS public.place_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id TEXT NOT NULL,
  place_title TEXT NOT NULL,
  user_id TEXT NOT NULL,
  vq_earned INTEGER NOT NULL DEFAULT 0,
  promotion_id UUID REFERENCES public.place_promotions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_place_checkins_place_id ON public.place_checkins(place_id);
CREATE INDEX IF NOT EXISTS idx_place_checkins_user_id ON public.place_checkins(user_id);

-- 3. Waze-Style Vibe Validations
CREATE TABLE IF NOT EXISTS public.place_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  confidence_score INTEGER NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  vibe_tags TEXT[] NOT NULL DEFAULT '{}',
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_place_validations_place_id ON public.place_validations(place_id);
CREATE INDEX IF NOT EXISTS idx_place_validations_user_id ON public.place_validations(user_id);

-- 4. Spot Meetups
CREATE TABLE IF NOT EXISTS public.place_meetups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id TEXT NOT NULL,
  place_title TEXT NOT NULL,
  place_address TEXT NOT NULL DEFAULT '',
  place_category TEXT NOT NULL DEFAULT 'Spots',
  host_user_id TEXT NOT NULL,
  host_name TEXT NOT NULL,
  host_avatar TEXT,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  is_live_checkin BOOLEAN NOT NULL DEFAULT false,
  attendee_ids TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_place_meetups_place_id ON public.place_meetups(place_id);
CREATE INDEX IF NOT EXISTS idx_place_meetups_host ON public.place_meetups(host_user_id);
CREATE INDEX IF NOT EXISTS idx_place_meetups_scheduled ON public.place_meetups(scheduled_at);

-- Enable RLS
ALTER TABLE public.place_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.place_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.place_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.place_meetups ENABLE ROW LEVEL SECURITY;

-- Idempotent RLS policies (public read, authenticated insert)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read for place_promotions') THEN
    CREATE POLICY "Allow public read for place_promotions" ON public.place_promotions FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated insert for place_promotions') THEN
    CREATE POLICY "Allow authenticated insert for place_promotions" ON public.place_promotions FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow update for place_promotions') THEN
    CREATE POLICY "Allow update for place_promotions" ON public.place_promotions FOR UPDATE USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read for place_checkins') THEN
    CREATE POLICY "Allow public read for place_checkins" ON public.place_checkins FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated insert for place_checkins') THEN
    CREATE POLICY "Allow authenticated insert for place_checkins" ON public.place_checkins FOR INSERT WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read for place_validations') THEN
    CREATE POLICY "Allow public read for place_validations" ON public.place_validations FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated insert for place_validations') THEN
    CREATE POLICY "Allow authenticated insert for place_validations" ON public.place_validations FOR INSERT WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read for place_meetups') THEN
    CREATE POLICY "Allow public read for place_meetups" ON public.place_meetups FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated insert for place_meetups') THEN
    CREATE POLICY "Allow authenticated insert for place_meetups" ON public.place_meetups FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow update for place_meetups') THEN
    CREATE POLICY "Allow update for place_meetups" ON public.place_meetups FOR UPDATE USING (true);
  END IF;
END $$;
