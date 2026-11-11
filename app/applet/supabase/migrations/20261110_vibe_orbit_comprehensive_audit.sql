-- Migration: 20261110_vibe_orbit_comprehensive_audit.sql
-- Description: Comprehensive Supabase schema, RLS, Storage, and atomic RPC functions for VQULTIMATE (Audited for Bug Fixes 1-6).

-- 1. Place Promotions Table
CREATE TABLE IF NOT EXISTS public.place_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id TEXT NOT NULL,
  place_title TEXT NOT NULL,
  sponsor_user_id UUID NOT NULL,
  total_vq_funded INTEGER NOT NULL CHECK (total_vq_funded > 0),
  remaining_vq_pool INTEGER NOT NULL CHECK (remaining_vq_pool >= 0),
  reward_per_checkin INTEGER NOT NULL DEFAULT 500,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'depleted', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_place_promotions_place_id ON public.place_promotions(place_id);
CREATE INDEX IF NOT EXISTS idx_place_promotions_status ON public.place_promotions(status);

-- 2. Place Check-ins Table
CREATE TABLE IF NOT EXISTS public.place_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id TEXT NOT NULL,
  place_title TEXT,
  place_category TEXT,
  user_id UUID NOT NULL,
  user_name TEXT,
  user_handle TEXT,
  user_avatar TEXT,
  distance_meters NUMERIC NOT NULL CHECK (distance_meters <= 33),
  has_livecheck_receipt BOOLEAN DEFAULT false,
  receipt_photo_url TEXT,
  mayor_points INTEGER NOT NULL DEFAULT 1,
  vq_rewarded INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_place_checkins_place_id ON public.place_checkins(place_id);
CREATE INDEX IF NOT EXISTS idx_place_checkins_user_id ON public.place_checkins(user_id);

-- 3. Place Validations Table
CREATE TABLE IF NOT EXISTS public.place_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  verdict TEXT NOT NULL CHECK (verdict IN ('yes', 'no')),
  confidence_delta INTEGER NOT NULL,
  resulting_confidence INTEGER NOT NULL CHECK (resulting_confidence BETWEEN 10 AND 100),
  vibe_tags TEXT[] DEFAULT '{}',
  comment TEXT,
  distance_meters NUMERIC NOT NULL CHECK (distance_meters <= 33),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_place_validations_place_id ON public.place_validations(place_id);
CREATE INDEX IF NOT EXISTS idx_place_validations_user_id ON public.place_validations(user_id);

-- 4. Place Meetups Table
CREATE TABLE IF NOT EXISTS public.place_meetups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id TEXT NOT NULL,
  place_title TEXT NOT NULL,
  place_address TEXT,
  place_category TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  host_user_id UUID NOT NULL,
  host_name TEXT NOT NULL,
  host_avatar TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  photo_url TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  max_capacity INTEGER NOT NULL DEFAULT 10,
  attendee_ids UUID[] NOT NULL DEFAULT '{}',
  verified_arrived_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_place_meetups_place_id ON public.place_meetups(place_id);
CREATE INDEX IF NOT EXISTS idx_place_meetups_host ON public.place_meetups(host_user_id);

-- 5. Vibe Flash Events Table
CREATE TABLE IF NOT EXISTS public.vibe_flash_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  vibe_type TEXT NOT NULL,
  place_id TEXT,
  venue_name TEXT NOT NULL,
  address TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  creator_id UUID NOT NULL,
  creator_name TEXT NOT NULL,
  creator_avatar TEXT,
  photo_url TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  entry_type TEXT NOT NULL DEFAULT 'Free',
  entry_price_tnd TEXT,
  entry_rules TEXT,
  parking_transport_notes TEXT,
  vq_hunt_pool INTEGER NOT NULL DEFAULT 0,
  vq_reward_per_hunter INTEGER NOT NULL DEFAULT 500,
  max_capacity INTEGER NOT NULL DEFAULT 20,
  interested_ids UUID[] NOT NULL DEFAULT '{}',
  going_ids UUID[] NOT NULL DEFAULT '{}',
  verified_arrived_ids UUID[] NOT NULL DEFAULT '{}',
  claimed_reward_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vibe_flash_expires ON public.vibe_flash_events(expires_at);

-- 6. User Search Signals Table
CREATE TABLE IF NOT EXISTS public.user_search_signals (
  user_id UUID PRIMARY KEY,
  search_queries TEXT[] DEFAULT '{}',
  category_clicks JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.place_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.place_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.place_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.place_meetups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vibe_flash_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_search_signals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$BEGIN
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

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read for vibe_flash_events') THEN
    CREATE POLICY "Allow public read for vibe_flash_events" ON public.vibe_flash_events FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated insert for vibe_flash_events') THEN
    CREATE POLICY "Allow authenticated insert for vibe_flash_events" ON public.vibe_flash_events FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow update for vibe_flash_events') THEN
    CREATE POLICY "Allow update for vibe_flash_events" ON public.vibe_flash_events FOR UPDATE USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all for user_search_signals') THEN
    CREATE POLICY "Allow all for user_search_signals" ON public.user_search_signals FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Storage Bucket: vibe-media
INSERT INTO storage.buckets (id, name, public) 
VALUES ('vibe-media', 'vibe-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access vibe-media') THEN
    CREATE POLICY "Public Access vibe-media" ON storage.objects FOR SELECT USING (bucket_id = 'vibe-media');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated Upload vibe-media') THEN
    CREATE POLICY "Authenticated Upload vibe-media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'vibe-media');
  END IF;
END $$;

-- RPC 1: rpc_fund_place_promotion (Uses available_balance and logs vq_transactions)
CREATE OR REPLACE FUNCTION public.rpc_fund_place_promotion(
  p_place_id TEXT,
  p_place_title TEXT,
  p_user_id UUID,
  p_vq_amount INTEGER,
  p_reward_per_checkin INTEGER DEFAULT 500
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_bal INTEGER;
  v_promo_id UUID;
BEGIN
  SELECT available_balance INTO v_current_bal FROM public.vq_accounts WHERE user_id = p_user_id;
  IF v_current_bal IS NOT NULL AND v_current_bal < p_vq_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient VQ balance');
  END IF;

  IF v_current_bal IS NOT NULL THEN
    UPDATE public.vq_accounts SET available_balance = available_balance - p_vq_amount, updated_at = NOW() WHERE user_id = p_user_id;
  END IF;

  -- Insert ledger transaction
  INSERT INTO public.vq_transactions (idempotency_key, from_user_id, to_user_id, amount, type, status, description)
  VALUES (gen_random_uuid()::text, p_user_id, '00000000-0000-0000-0000-000000000000'::uuid, p_vq_amount, 'spend', 'completed', 'Funded promotion for ' || p_place_title);

  INSERT INTO public.place_promotions (place_id, place_title, sponsor_user_id, total_vq_funded, remaining_vq_pool, reward_per_checkin, status)
  VALUES (p_place_id, p_place_title, p_user_id, p_vq_amount, p_vq_amount, p_reward_per_checkin, 'active')
  RETURNING id INTO v_promo_id;

  RETURN jsonb_build_object('success', true, 'promotion_id', v_promo_id);
END;
$$;

-- RPC 2: rpc_submit_checkin_and_validation (Enforces 12h cooldown, cumulative confidence, available_balance, and vq_transactions)
CREATE OR REPLACE FUNCTION public.rpc_submit_checkin_and_validation(
  p_place_id TEXT,
  p_place_title TEXT,
  p_place_category TEXT,
  p_user_id UUID,
  p_user_name TEXT,
  p_user_handle TEXT,
  p_user_avatar TEXT,
  p_distance_meters NUMERIC,
  p_verdict TEXT,
  p_initial_rating NUMERIC,
  p_has_livecheck_receipt BOOLEAN,
  p_receipt_photo_url TEXT,
  p_vibe_tags TEXT[] DEFAULT '{}',
  p_comment TEXT DEFAULT ''
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_last_checkin TIMESTAMPTZ;
  v_latest_conf INTEGER;
  v_confidence_delta INTEGER;
  v_computed_confidence INTEGER;
  v_vq_reward INTEGER := 0;
  v_mayor_pts INTEGER := 1;
  v_promo RECORD;
BEGIN
  IF p_distance_meters > 33 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Must be within 33 meters to check-in or validate.');
  END IF;

  -- 12-Hour Cooldown Check
  SELECT created_at INTO v_last_checkin 
  FROM public.place_checkins 
  WHERE user_id = p_user_id AND place_id = p_place_id AND created_at > NOW() - INTERVAL '12 hours' 
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already checked in here within the last 12 hours.');
  END IF;

  -- Cumulative Confidence Math
  SELECT resulting_confidence INTO v_latest_conf 
  FROM public.place_validations 
  WHERE place_id = p_place_id 
  ORDER BY created_at DESC 
  LIMIT 1;

  IF p_verdict = 'yes' THEN
    v_confidence_delta := 15;
  ELSE
    v_confidence_delta := -25;
  END IF;

  IF v_latest_conf IS NOT NULL THEN
    v_computed_confidence := v_latest_conf + v_confidence_delta;
  else
    v_computed_confidence := ROUND(COALESCE(p_initial_rating, 4.2) * 20) + v_confidence_delta;
  END IF;

  v_computed_confidence := GREATEST(10, LEAST(100, v_computed_confidence));

  -- Insert Validation
  INSERT INTO public.place_validations (place_id, user_id, verdict, confidence_delta, resulting_confidence, vibe_tags, comment, distance_meters)
  VALUES (p_place_id, p_user_id, p_verdict, v_confidence_delta, v_computed_confidence, p_vibe_tags, p_comment, p_distance_meters);

  -- LiveCheck reward check
  IF p_has_livecheck_receipt AND p_receipt_photo_url IS NOT NULL AND p_distance_meters <= 33 THEN
    v_vq_reward := 500;
    v_mayor_pts := 2;

    SELECT * INTO v_promo FROM public.place_promotions WHERE place_id = p_place_id AND status = 'active' AND remaining_vq_pool >= 500 LIMIT 1;
    IF FOUND THEN
      UPDATE public.place_promotions 
      SET remaining_vq_pool = remaining_vq_pool - 500,
          status = CASE WHEN remaining_vq_pool - 500 <= 0 THEN 'depleted' ELSE 'active' END,
          updated_at = NOW()
      WHERE id = v_promo.id;
    END IF;

    -- Credit user vq_accounts available_balance
    UPDATE public.vq_accounts SET available_balance = available_balance + 500, updated_at = NOW() WHERE user_id = p_user_id;

    -- Log vq_transactions
    INSERT INTO public.vq_transactions (idempotency_key, from_user_id, to_user_id, amount, type, status, description)
    VALUES (gen_random_uuid()::text, '00000000-0000-0000-0000-000000000000'::uuid, p_user_id, 500, 'earned', 'completed', 'LiveCheck reward at ' || p_place_title);
  END IF;

  -- Insert Check-in
  INSERT INTO public.place_checkins (place_id, place_title, place_category, user_id, user_name, user_handle, user_avatar, distance_meters, has_livecheck_receipt, receipt_photo_url, mayor_points, vq_rewarded)
  VALUES (p_place_id, p_place_title, p_place_category, p_user_id, p_user_name, p_user_handle, p_user_avatar, p_distance_meters, p_has_livecheck_receipt, p_receipt_photo_url, v_mayor_pts, v_vq_reward);

  RETURN jsonb_build_object(
    'success', true,
    'resulting_confidence', v_computed_confidence,
    'vq_rewarded', v_vq_reward,
    'mayor_points', v_mayor_pts
  );
END;
$$;

-- RPC 3: rpc_get_venue_mayor_and_badges (Calculates category badges and explorer rank)
CREATE OR REPLACE FUNCTION public.rpc_get_venue_mayor_and_badges(
  p_place_id TEXT,
  p_user_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_mayor RECORD;
  v_total_checkins INTEGER := 0;
  v_unique_places INTEGER := 0;
  v_food_checkins INTEGER := 0;
  v_night_checkins INTEGER := 0;
  v_culture_checkins INTEGER := 0;
  v_explorer_rank TEXT := 'Newcomer';
  v_badges JSONB;
BEGIN
  -- Find mayor
  SELECT user_id, user_name, user_avatar, SUM(mayor_points) as total_points
  INTO v_mayor
  FROM public.place_checkins
  WHERE place_id = p_place_id
  GROUP BY user_id, user_name, user_avatar
  ORDER BY total_points DESC
  LIMIT 1;

  -- Calculate user stats across check-ins
  SELECT 
    COUNT(*),
    COUNT(DISTINCT place_id),
    COUNT(*) FILTER (WHERE LOWER(COALESCE(place_category, '')) IN ('food', 'cafe', 'cafés', 'restaurant', 'caffeine', 'spots')),
    COUNT(*) FILTER (WHERE LOWER(COALESCE(place_category, '')) IN ('night owl', 'night_owl', 'bar', 'lounge', 'club')),
    COUNT(*) FILTER (WHERE LOWER(COALESCE(place_category, '')) IN ('culture', 'art', 'landmark', 'museum'))
  INTO v_total_checkins, v_unique_places, v_food_checkins, v_night_checkins, v_culture_checkins
  FROM public.place_checkins 
  WHERE user_id = p_user_id;

  v_explorer_rank := CASE 
    WHEN v_total_checkins >= 20 THEN 'Vibe Legend'
    WHEN v_total_checkins >= 8 THEN 'Pathfinder'
    WHEN v_total_checkins >= 3 THEN 'Explorer'
    WHEN v_total_checkins >= 1 THEN 'Wanderer'
    ELSE 'Newcomer'
  END;

  v_badges := jsonb_build_object(
    'caffeine_fiend', jsonb_build_object(
      'unlocked', v_food_checkins >= 3,
      'progress', LEAST(3, v_food_checkins),
      'target', 3
    ),
    'gourmet_scout', jsonb_build_object(
      'unlocked', v_food_checkins >= 2,
      'progress', LEAST(2, v_food_checkins),
      'target', 2
    ),
    'night_mayor', jsonb_build_object(
      'unlocked', v_night_checkins >= 2,
      'progress', LEAST(2, v_night_checkins),
      'target', 2
    ),
    'culture_vulture', jsonb_build_object(
      'unlocked', v_culture_checkins >= 2,
      'progress', LEAST(2, v_culture_checkins),
      'target', 2
    ),
    'vibe_vanguard', jsonb_build_object(
      'unlocked', v_unique_places >= 5,
      'progress', LEAST(5, v_unique_places),
      'target', 5
    )
  );

  RETURN jsonb_build_object(
    'mayor', CASE WHEN v_mayor.user_id IS NOT NULL THEN jsonb_build_object(
      'user_id', v_mayor.user_id,
      'name', v_mayor.user_name,
      'avatar', v_mayor.user_avatar,
      'points', v_mayor.total_points
    ) ELSE NULL END,
    'user_checkins_count', v_total_checkins,
    'explorer_rank', v_explorer_rank,
    'badges', v_badges
  );
END;
$$;

-- RPC 4: rpc_toggle_meetup_rsvp & rpc_toggle_vibe_flash_rsvp (Fixes COALESCE(array_length(...), 0))
CREATE OR REPLACE FUNCTION public.rpc_toggle_meetup_rsvp(
  p_meetup_id UUID,
  p_user_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_meetup RECORD;
  v_attendees UUID[];
  v_is_attending BOOLEAN;
  v_len INTEGER;
BEGIN
  SELECT * INTO v_meetup FROM public.place_meetups WHERE id = p_meetup_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Meetup not found');
  END IF;

  v_attendees := v_meetup.attendee_ids;
  IF p_user_id = ANY(v_attendees) THEN
    v_attendees := array_remove(v_attendees, p_user_id);
    v_is_attending := false;
  ELSE
    v_len := COALESCE(array_length(v_attendees, 1), 0);
    IF v_len >= v_meetup.max_capacity THEN
      RETURN jsonb_build_object('success', false, 'error', 'Meetup is at full capacity');
    END IF;
    v_attendees := array_append(v_attendees, p_user_id);
    v_is_attending := true;
  END IF;

  UPDATE public.place_meetups SET attendee_ids = v_attendees WHERE id = p_meetup_id;

  RETURN jsonb_build_object('success', true, 'is_attending', v_is_attending, 'attendee_count', COALESCE(array_length(v_attendees, 1), 0));
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_toggle_vibe_flash_rsvp(
  p_flash_id UUID,
  p_user_id UUID,
  p_mode TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_flash RECORD;
  v_interested UUID[];
  v_going UUID[];
  v_status_result TEXT;
  v_going_len INTEGER;
BEGIN
  SELECT * INTO v_flash FROM public.vibe_flash_events WHERE id = p_flash_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vibe flash event not found');
  END IF;

  v_interested := v_flash.interested_ids;
  v_going := v_flash.going_ids;

  IF p_mode = 'going' THEN
    IF p_user_id = ANY(v_going) THEN
      v_going := array_remove(v_going, p_user_id);
      v_status_result := 'none';
    ELSE
      v_going_len := COALESCE(array_length(v_going, 1), 0);
      IF v_going_len >= v_flash.max_capacity THEN
        RETURN jsonb_build_object('success', false, 'error', 'Vibe flash event is at full capacity');
      END IF;
      v_going := array_append(v_going, p_user_id);
      v_interested := array_remove(v_interested, p_user_id);
      v_status_result := 'going';
    END IF;
  ELSIF p_mode = 'interested' THEN
    IF p_user_id = ANY(v_interested) THEN
      v_interested := array_remove(v_interested, p_user_id);
      v_status_result := 'none';
    ELSE
      v_interested := array_append(v_interested, p_user_id);
      v_going := array_remove(v_going, p_user_id);
      v_status_result := 'desired';
    END IF;
  END IF;

  UPDATE public.vibe_flash_events 
  SET interested_ids = v_interested, going_ids = v_going 
  WHERE id = p_flash_id;

  RETURN jsonb_build_object(
    'success', true, 
    'status', v_status_result, 
    'going_count', COALESCE(array_length(v_going, 1), 0), 
    'interested_count', COALESCE(array_length(v_interested, 1), 0)
  );
END;
$$;

-- RPC 5: rpc_get_unified_vibe_flash_board
CREATE OR REPLACE FUNCTION public.rpc_get_unified_vibe_flash_board()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_flashes JSONB;
  v_meetups JSONB;
BEGIN
  SELECT json_agg(to_jsonb(f)) INTO v_flashes
  FROM (
    SELECT * FROM public.vibe_flash_events 
    WHERE expires_at > NOW() 
    ORDER BY starts_at ASC
  ) f;

  SELECT json_agg(to_jsonb(m)) INTO v_meetups
  FROM (
    SELECT * FROM public.place_meetups 
    WHERE starts_at <= NOW() + INTERVAL '60 minutes' 
      AND expires_at > NOW() 
    ORDER BY starts_at ASC
  ) m;

  RETURN jsonb_build_object(
    'vibe_flashes', COALESCE(v_flashes, '[]'::jsonb),
    'upcoming_meetups', COALESCE(v_meetups, '[]'::jsonb)
  );
END;
$$;

-- RPC 6: rpc_claim_vibe_flash_hunt (33m verification, vq_hunt_pool deduction, vq_accounts credit, and vq_transactions log)
CREATE OR REPLACE FUNCTION public.rpc_claim_vibe_flash_hunt(
  p_flash_id UUID,
  p_user_id UUID,
  p_distance_meters NUMERIC,
  p_livecheck_photo_url TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_flash RECORD;
  v_reward INTEGER;
  v_claimed UUID[];
  v_arrived UUID[];
BEGIN
  IF p_distance_meters > 33 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Must be within 33 meters to claim Vibe Flash hunt reward.');
  END IF;

  SELECT * INTO v_flash FROM public.vibe_flash_events WHERE id = p_flash_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vibe Flash event not found.');
  END IF;

  v_arrived := v_flash.verified_arrived_ids;
  IF NOT (p_user_id = ANY(v_arrived)) THEN
    v_arrived := array_append(v_arrived, p_user_id);
  END IF;

  v_reward := v_flash.vq_reward_per_hunter;
  v_claimed := v_flash.claimed_reward_ids;

  IF p_livecheck_photo_url IS NOT NULL AND v_flash.vq_hunt_pool >= v_reward AND NOT (p_user_id = ANY(v_claimed)) THEN
    v_claimed := array_append(v_claimed, p_user_id);

    UPDATE public.vibe_flash_events
    SET vq_hunt_pool = vq_hunt_pool - v_reward,
        verified_arrived_ids = v_arrived,
        claimed_reward_ids = v_claimed
    WHERE id = p_flash_id;

    -- Credit user vq_accounts available_balance
    UPDATE public.vq_accounts 
    SET available_balance = available_balance + v_reward, updated_at = NOW() 
    WHERE user_id = p_user_id;

    -- Log transaction
    INSERT INTO public.vq_transactions (idempotency_key, from_user_id, to_user_id, amount, type, status, description)
    VALUES (gen_random_uuid()::text, '00000000-0000-0000-0000-000000000000'::uuid, p_user_id, v_reward, 'earned', 'completed', 'Vibe Flash Hunt reward for ' || v_flash.title);

    RETURN jsonb_build_object('success', true, 'vq_awarded', v_reward);
  ELSE
    UPDATE public.vibe_flash_events
    SET verified_arrived_ids = v_arrived
    WHERE id = p_flash_id;

    RETURN jsonb_build_object('success', true, 'vq_awarded', 0, 'message', 'Arrived verified, but reward already claimed or pool depleted.');
  END IF;
END;
$$;
