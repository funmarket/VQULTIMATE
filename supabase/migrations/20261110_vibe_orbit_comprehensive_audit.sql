-- ============================================================================
-- Migration: 20261110_vibe_orbit_comprehensive_audit.sql
-- Project: avdfessrhbsqwlfmbdau
-- Description: Authoritative Supabase Schema, Storage Bucket, RLS Policies,
--              and Atomic PostgreSQL RPCs for Vibe Orbit, Promotions,
--              33m + LiveCheck Validations, Mayor & Badges, Meetups, and Vibe Flash.
-- ============================================================================

-- 1. Business Promotions Table
CREATE TABLE IF NOT EXISTS public.place_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id TEXT NOT NULL,
  place_title TEXT NOT NULL,
  sponsor_user_id TEXT NOT NULL,
  total_vq_funded INTEGER NOT NULL CHECK (total_vq_funded > 0),
  remaining_vq_pool INTEGER NOT NULL CHECK (remaining_vq_pool >= 0),
  reward_per_checkin INTEGER NOT NULL DEFAULT 500 CHECK (reward_per_checkin > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'depleted', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_place_promotions_place_id ON public.place_promotions(place_id);
CREATE INDEX IF NOT EXISTS idx_place_promotions_status ON public.place_promotions(status);

-- 2. Place Check-ins Ledger (Strict <= 33m GPS + LiveCheck Receipt Verification)
CREATE TABLE IF NOT EXISTS public.place_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id TEXT NOT NULL,
  place_title TEXT NOT NULL,
  place_category TEXT NOT NULL DEFAULT 'Spots',
  user_id TEXT NOT NULL,
  user_name TEXT,
  user_avatar TEXT,
  latitude DOUBLE PRECISION NOT NULL DEFAULT 36.8065,
  longitude DOUBLE PRECISION NOT NULL DEFAULT 10.1815,
  distance_meters INTEGER NOT NULL DEFAULT 0 CHECK (distance_meters <= 33),
  receipt_photo_url TEXT,
  vq_earned INTEGER NOT NULL DEFAULT 0 CHECK (vq_earned >= 0),
  promotion_id UUID REFERENCES public.place_promotions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_place_checkins_place_id ON public.place_checkins(place_id);
CREATE INDEX IF NOT EXISTS idx_place_checkins_user_id ON public.place_checkins(user_id);

-- 3. Waze-Style Vibe Validations Table
CREATE TABLE IF NOT EXISTS public.place_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  response TEXT NOT NULL DEFAULT 'yes' CHECK (response IN ('yes', 'no', 'abstain')),
  confidence_delta INTEGER NOT NULL DEFAULT 15,
  resulting_confidence INTEGER NOT NULL DEFAULT 85 CHECK (resulting_confidence >= 10 AND resulting_confidence <= 100),
  confidence_score INTEGER NOT NULL DEFAULT 85 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  vibe_tags TEXT[] NOT NULL DEFAULT '{}',
  change_tags TEXT[] NOT NULL DEFAULT '{}',
  comment TEXT,
  distance_meters INTEGER NOT NULL DEFAULT 0 CHECK (distance_meters <= 33),
  receipt_photo_url TEXT,
  vq_awarded INTEGER NOT NULL DEFAULT 0 CHECK (vq_awarded >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_place_validations_place_id ON public.place_validations(place_id);
CREATE INDEX IF NOT EXISTS idx_place_validations_user_id ON public.place_validations(user_id);

-- 4. Venue Meetups (Pop-up Gatherings)
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
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '2 hours'),
  is_live_checkin BOOLEAN NOT NULL DEFAULT false,
  photo_url TEXT,
  max_capacity INTEGER NOT NULL DEFAULT 10 CHECK (max_capacity >= 2 AND max_capacity <= 100),
  attendee_ids TEXT[] NOT NULL DEFAULT '{}',
  lat DOUBLE PRECISION NOT NULL DEFAULT 36.8065,
  lng DOUBLE PRECISION NOT NULL DEFAULT 10.1815,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_place_meetups_place_id ON public.place_meetups(place_id);
CREATE INDEX IF NOT EXISTS idx_place_meetups_host ON public.place_meetups(host_user_id);
CREATE INDEX IF NOT EXISTS idx_place_meetups_starts_at ON public.place_meetups(starts_at);

-- 5. Vibe Flash Events Table
CREATE TABLE IF NOT EXISTS public.vibe_flash_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  vibe_type TEXT NOT NULL DEFAULT 'Secret Pop-up',
  place_id TEXT,
  venue_name TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  lat DOUBLE PRECISION NOT NULL DEFAULT 36.8065,
  lng DOUBLE PRECISION NOT NULL DEFAULT 10.1815,
  creator_id TEXT NOT NULL,
  creator_name TEXT NOT NULL,
  creator_avatar TEXT,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  entry_type TEXT NOT NULL DEFAULT 'Free',
  entry_price_tnd TEXT,
  entry_rules TEXT,
  parking_transport_notes TEXT,
  photo_url TEXT,
  photos TEXT[] NOT NULL DEFAULT '{}',
  vq_hunt_pool INTEGER NOT NULL DEFAULT 0 CHECK (vq_hunt_pool >= 0),
  vq_reward_per_hunter INTEGER NOT NULL DEFAULT 500 CHECK (vq_reward_per_hunter > 0),
  max_capacity INTEGER NOT NULL DEFAULT 20 CHECK (max_capacity >= 2 AND max_capacity <= 200),
  interested_ids TEXT[] NOT NULL DEFAULT '{}',
  going_ids TEXT[] NOT NULL DEFAULT '{}',
  verified_arrived_ids TEXT[] NOT NULL DEFAULT '{}',
  claimed_reward_ids TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vibe_flash_expires_at ON public.vibe_flash_events(expires_at);
CREATE INDEX IF NOT EXISTS idx_vibe_flash_starts_at ON public.vibe_flash_events(starts_at);

-- 6. User Search & Category Affinity Signals Table
CREATE TABLE IF NOT EXISTS public.user_search_signals (
  user_id TEXT PRIMARY KEY,
  recent_queries TEXT[] NOT NULL DEFAULT '{}',
  category_clicks JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Storage Bucket: vibe-media (Receipts, Vibe Flash Photos, Meetup Photos)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vibe-media',
  'vibe-media',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================
ALTER TABLE public.place_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.place_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.place_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.place_meetups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vibe_flash_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_search_signals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read place_promotions') THEN
    CREATE POLICY "Public read place_promotions" ON public.place_promotions FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public insert place_promotions') THEN
    CREATE POLICY "Public insert place_promotions" ON public.place_promotions FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public update place_promotions') THEN
    CREATE POLICY "Public update place_promotions" ON public.place_promotions FOR UPDATE USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read place_checkins') THEN
    CREATE POLICY "Public read place_checkins" ON public.place_checkins FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public insert place_checkins') THEN
    CREATE POLICY "Public insert place_checkins" ON public.place_checkins FOR INSERT WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read place_validations') THEN
    CREATE POLICY "Public read place_validations" ON public.place_validations FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public insert place_validations') THEN
    CREATE POLICY "Public insert place_validations" ON public.place_validations FOR INSERT WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read place_meetups') THEN
    CREATE POLICY "Public read place_meetups" ON public.place_meetups FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public insert place_meetups') THEN
    CREATE POLICY "Public insert place_meetups" ON public.place_meetups FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public update place_meetups') THEN
    CREATE POLICY "Public update place_meetups" ON public.place_meetups FOR UPDATE USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read vibe_flash_events') THEN
    CREATE POLICY "Public read vibe_flash_events" ON public.vibe_flash_events FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public insert vibe_flash_events') THEN
    CREATE POLICY "Public insert vibe_flash_events" ON public.vibe_flash_events FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public update vibe_flash_events') THEN
    CREATE POLICY "Public update vibe_flash_events" ON public.vibe_flash_events FOR UPDATE USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read user_search_signals') THEN
    CREATE POLICY "Public read user_search_signals" ON public.user_search_signals FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public upsert user_search_signals') THEN
    CREATE POLICY "Public upsert user_search_signals" ON public.user_search_signals FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public update user_search_signals') THEN
    CREATE POLICY "Public update user_search_signals" ON public.user_search_signals FOR UPDATE USING (true);
  END IF;
END $$;

-- ============================================================================
-- Helper Function: Server-side Haversine Distance in Meters
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_haversine_meters(
  lat1 DOUBLE PRECISION,
  lon1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION,
  lon2 DOUBLE PRECISION
) RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  r CONSTANT DOUBLE PRECISION := 6371000.0;
  phi1 DOUBLE PRECISION := radians(lat1);
  phi2 DOUBLE PRECISION := radians(lat2);
  dphi DOUBLE PRECISION := radians(lat2 - lat1);
  dlambda DOUBLE PRECISION := radians(lon2 - lon1);
  a DOUBLE PRECISION;
  c DOUBLE PRECISION;
BEGIN
  a := sin(dphi / 2.0) ^ 2 + cos(phi1) * cos(phi2) * (sin(dlambda / 2.0) ^ 2);
  c := 2.0 * atan2(sqrt(a), sqrt(1.0 - a));
  RETURN round(r * c)::INTEGER;
END;
$$;

-- ============================================================================
-- RPC 1: rpc_fund_place_promotion
-- Atomically verifies & deducts sponsor VQ balance from vq_accounts,
-- logs audit row in vq_transactions, and creates/tops up place_promotions.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.rpc_fund_place_promotion(
  p_place_id TEXT,
  p_place_title TEXT,
  p_sponsor_user_id TEXT,
  p_vq_amount INTEGER,
  p_reward_per_checkin INTEGER DEFAULT 500
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_bal INTEGER;
  v_promo public.place_promotions;
BEGIN
  IF p_vq_amount <= 0 OR p_reward_per_checkin <= 0 OR p_reward_per_checkin > p_vq_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid promotion pool or reward amount.');
  END IF;

  SELECT available_balance INTO v_current_bal
  FROM public.vq_accounts
  WHERE user_id = p_sponsor_user_id
  FOR UPDATE;

  IF COALESCE(v_current_bal, 0) < p_vq_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient VQ balance in Purse.');
  END IF;

  UPDATE public.vq_accounts
  SET available_balance = available_balance - p_vq_amount,
      total_spent = COALESCE(total_spent, 0) + p_vq_amount
  WHERE user_id = p_sponsor_user_id;

  INSERT INTO public.vq_transactions (user_id, amount, type, description)
  VALUES (
    p_sponsor_user_id,
    -p_vq_amount,
    'spend',
    format('Sponsored promotion pool for %s (+%s VQ/check-in)', p_place_title, p_reward_per_checkin)
  );

  SELECT * INTO v_promo
  FROM public.place_promotions
  WHERE place_id = p_place_id AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    UPDATE public.place_promotions
    SET total_vq_funded = total_vq_funded + p_vq_amount,
        remaining_vq_pool = remaining_vq_pool + p_vq_amount,
        reward_per_checkin = p_reward_per_checkin,
        status = 'active',
        updated_at = NOW()
    WHERE id = v_promo.id
    RETURNING * INTO v_promo;
  ELSE
    INSERT INTO public.place_promotions (
      place_id, place_title, sponsor_user_id,
      total_vq_funded, remaining_vq_pool, reward_per_checkin, status
    ) VALUES (
      p_place_id, p_place_title, p_sponsor_user_id,
      p_vq_amount, p_vq_amount, p_reward_per_checkin, 'active'
    )
    RETURNING * INTO v_promo;
  END IF;

  RETURN jsonb_build_object('success', true, 'promotion', to_jsonb(v_promo));
END;
$$;

-- ============================================================================
-- RPC 2: rpc_submit_checkin_and_validation
-- Enforces <= 33m server-side Haversine geofence, 12-hour anti-farm cooldown,
-- +500 VQ reward ONLY when live receipt_photo_url is provided, and cumulative
-- resulting_confidence updates.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.rpc_submit_checkin_and_validation(
  p_place_id TEXT,
  p_place_title TEXT,
  p_place_category TEXT,
  p_place_lat DOUBLE PRECISION,
  p_place_lng DOUBLE PRECISION,
  p_user_id TEXT,
  p_user_name TEXT,
  p_user_avatar TEXT,
  p_user_lat DOUBLE PRECISION,
  p_user_lng DOUBLE PRECISION,
  p_response TEXT DEFAULT 'yes',
  p_vibe_tags TEXT[] DEFAULT '{}',
  p_change_tags TEXT[] DEFAULT '{}',
  p_comment TEXT DEFAULT NULL,
  p_receipt_photo_url TEXT DEFAULT NULL,
  p_baseline_confidence INTEGER DEFAULT 80
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_dist INTEGER;
  v_recent_receipt_count INTEGER;
  v_vq_earned INTEGER := 0;
  v_promo public.place_promotions;
  v_confidence_delta INTEGER := 0;
  v_latest_conf INTEGER;
  v_new_conf INTEGER;
  v_checkin_id UUID;
  v_val_id UUID;
  v_total_checkins INTEGER;
  v_total_validations INTEGER;
BEGIN
  v_dist := public.fn_haversine_meters(p_user_lat, p_user_lng, p_place_lat, p_place_lng);

  IF v_dist > 33 THEN
    RETURN jsonb_build_object(
      'success', false,
      'distance_meters', v_dist,
      'error', format('You are %sm away. Strict 33-meter presence is required.', v_dist)
    );
  END IF;

  IF p_response = 'yes' THEN
    v_confidence_delta := 15;
  ELSIF p_response = 'no' THEN
    v_confidence_delta := -25;
  ELSE
    v_confidence_delta := 0;
  END IF;

  SELECT resulting_confidence INTO v_latest_conf
  FROM public.place_validations
  WHERE place_id = p_place_id
  ORDER BY created_at DESC
  LIMIT 1;

  v_new_conf := LEAST(100, GREATEST(10, COALESCE(v_latest_conf, p_baseline_confidence) + v_confidence_delta));

  IF p_receipt_photo_url IS NOT NULL AND length(trim(p_receipt_photo_url)) > 0 THEN
    SELECT COUNT(*) INTO v_recent_receipt_count
    FROM public.place_checkins
    WHERE place_id = p_place_id
      AND user_id = p_user_id
      AND vq_earned > 0
      AND created_at > (NOW() - INTERVAL '12 hours');

    IF v_recent_receipt_count > 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'distance_meters', v_dist,
        'error', 'Receipt reward is on a 12-hour cooldown for this venue.'
      );
    END IF;

    v_vq_earned := 500;

    SELECT * INTO v_promo
    FROM public.place_promotions
    WHERE place_id = p_place_id
      AND status = 'active'
      AND remaining_vq_pool >= reward_per_checkin
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF FOUND THEN
      v_vq_earned := v_promo.reward_per_checkin;
      UPDATE public.place_promotions
      SET remaining_vq_pool = remaining_vq_pool - v_vq_earned,
          status = CASE WHEN (remaining_vq_pool - v_vq_earned) < reward_per_checkin THEN 'depleted' ELSE 'active' END,
          updated_at = NOW()
      WHERE id = v_promo.id;
    END IF;

    INSERT INTO public.vq_accounts (user_id, available_balance, total_earned, total_spent)
    VALUES (p_user_id, v_vq_earned, v_vq_earned, 0)
    ON CONFLICT (user_id) DO UPDATE
    SET available_balance = public.vq_accounts.available_balance + v_vq_earned,
        total_earned = COALESCE(public.vq_accounts.total_earned, 0) + v_vq_earned;

    INSERT INTO public.vq_transactions (user_id, amount, type, description)
    VALUES (
      p_user_id,
      v_vq_earned,
      'earned',
      format('33m LiveCheck Receipt Verified at %s (+%s VQ)', p_place_title, v_vq_earned)
    );
  END IF;

  INSERT INTO public.place_checkins (
    place_id, place_title, place_category,
    user_id, user_name, user_avatar,
    latitude, longitude, distance_meters,
    receipt_photo_url, vq_earned, promotion_id
  ) VALUES (
    p_place_id, p_place_title, COALESCE(p_place_category, 'Spots'),
    p_user_id, p_user_name, p_user_avatar,
    p_user_lat, p_user_lng, v_dist,
    p_receipt_photo_url, v_vq_earned, v_promo.id
  )
  RETURNING id INTO v_checkin_id;

  IF p_response IN ('yes', 'no') THEN
    INSERT INTO public.place_validations (
      place_id, user_id, response,
      confidence_delta, resulting_confidence, confidence_score,
      vibe_tags, change_tags, comment,
      distance_meters, receipt_photo_url, vq_awarded
    ) VALUES (
      p_place_id, p_user_id, p_response,
      v_confidence_delta, v_new_conf, v_new_conf,
      COALESCE(p_vibe_tags, '{}'), COALESCE(p_change_tags, '{}'), p_comment,
      v_dist, p_receipt_photo_url, v_vq_earned
    )
    RETURNING id INTO v_val_id;
  END IF;

  SELECT COUNT(*) INTO v_total_checkins FROM public.place_checkins WHERE place_id = p_place_id;
  SELECT COUNT(*) INTO v_total_validations FROM public.place_validations WHERE place_id = p_place_id;

  RETURN jsonb_build_object(
    'success', true,
    'distance_meters', v_dist,
    'vq_earned', v_vq_earned,
    'new_confidence', v_new_conf,
    'confidence_delta', v_confidence_delta,
    'checkins_count', v_total_checkins,
    'confirmations_count', v_total_validations,
    'checkin_id', v_checkin_id,
    'validation_id', v_val_id
  );
END;
$$;

-- ============================================================================
-- RPC 3: rpc_get_venue_mayor_and_badges
-- Computes Venue Mayor (from <= 33m check-ins) and the 5 canonical VibeQuest badges.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.rpc_get_venue_mayor_and_badges(
  p_place_id TEXT,
  p_user_id TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_mayor RECORD;
  v_leaderboard JSONB;
  v_food_count INTEGER := 0;
  v_gourmet_count INTEGER := 0;
  v_night_count INTEGER := 0;
  v_culture_count INTEGER := 0;
  v_unique_places INTEGER := 0;
BEGIN
  SELECT
    user_id,
    COALESCE(MAX(user_name), 'Explorer') AS name,
    MAX(user_avatar) AS avatar,
    COUNT(*)::INTEGER AS checkins_count
  INTO v_mayor
  FROM public.place_checkins
  WHERE place_id = p_place_id AND distance_meters <= 33
  GROUP BY user_id
  ORDER BY COUNT(*) DESC, MAX(created_at) DESC
  LIMIT 1;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  INTO v_leaderboard
  FROM (
    SELECT
      user_id AS "userId",
      COALESCE(MAX(user_name), 'Explorer') AS name,
      MAX(user_avatar) AS avatar,
      COUNT(*)::INTEGER AS "checkinsCount"
    FROM public.place_checkins
    WHERE place_id = p_place_id AND distance_meters <= 33
    GROUP BY user_id
    ORDER BY COUNT(*) DESC, MAX(created_at) DESC
    LIMIT 10
  ) t;

  IF p_user_id IS NOT NULL THEN
    SELECT
      COUNT(*) FILTER (WHERE lower(place_category) IN ('food', 'cafe', 'café', 'bakery', 'cozy'))::INTEGER,
      COUNT(*) FILTER (WHERE lower(place_category) IN ('food', 'restaurant', 'chilled'))::INTEGER,
      COUNT(*) FILTER (WHERE lower(place_category) IN ('night owl', 'night', 'bar', 'hype'))::INTEGER,
      COUNT(*) FILTER (WHERE lower(place_category) IN ('culture', 'art', 'museum', 'quiet'))::INTEGER,
      COUNT(DISTINCT place_id)::INTEGER
    INTO v_food_count, v_gourmet_count, v_night_count, v_culture_count, v_unique_places
    FROM public.place_checkins
    WHERE user_id = p_user_id AND distance_meters <= 33;
  END IF;

  RETURN jsonb_build_object(
    'mayorUserId', v_mayor.user_id,
    'mayorName', v_mayor.name,
    'mayorAvatar', v_mayor.avatar,
    'mayorCheckinsCount', COALESCE(v_mayor.checkins_count, 0),
    'leaderboard', v_leaderboard,
    'badges', jsonb_build_object(
      'caffeine_fiend', v_food_count,
      'gourmet_scout', v_gourmet_count,
      'night_mayor', v_night_count,
      'culture_vulture', v_culture_count,
      'vibe_vanguard', v_unique_places
    )
  );
END;
$$;

-- ============================================================================
-- RPC 4: rpc_toggle_meetup_rsvp
-- Enforces max_capacity and toggles user attendance in place_meetups.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.rpc_toggle_meetup_rsvp(
  p_meetup_id UUID,
  p_user_id TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_meetup public.place_meetups;
  v_is_attending BOOLEAN;
  v_new_attendees TEXT[];
BEGIN
  SELECT * INTO v_meetup
  FROM public.place_meetups
  WHERE id = p_meetup_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Meetup not found.');
  END IF;

  v_is_attending := p_user_id = ANY(v_meetup.attendee_ids);

  IF v_is_attending THEN
    IF v_meetup.host_user_id = p_user_id THEN
      RETURN jsonb_build_object(
        'success', true,
        'isAttending', true,
        'attendeesCount', COALESCE(array_length(v_meetup.attendee_ids, 1), 1)
      );
    END IF;
    v_new_attendees := array_remove(v_meetup.attendee_ids, p_user_id);
    v_is_attending := false;
  ELSE
    IF COALESCE(array_length(v_meetup.attendee_ids, 1), 0) >= v_meetup.max_capacity THEN
      RETURN jsonb_build_object('success', false, 'error', 'Meetup has reached maximum capacity.');
    END IF;
    v_new_attendees := array_append(v_meetup.attendee_ids, p_user_id);
    v_is_attending := true;
  END IF;

  UPDATE public.place_meetups
  SET attendee_ids = v_new_attendees
  WHERE id = p_meetup_id;

  RETURN jsonb_build_object(
    'success', true,
    'isAttending', v_is_attending,
    'attendeesCount', COALESCE(array_length(v_new_attendees, 1), 0)
  );
END;
$$;

-- ============================================================================
-- RPC 5: rpc_toggle_vibe_flash_rsvp
-- Enforces mutually exclusive interested vs going arrays and max_capacity.
-- Returns 'interested' (not 'desired') when p_mode = 'interested' is toggled on.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.rpc_toggle_vibe_flash_rsvp(
  p_flash_id UUID,
  p_user_id TEXT,
  p_mode TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_flash public.vibe_flash_events;
  v_interested TEXT[];
  v_going TEXT[];
  v_status TEXT := 'none';
BEGIN
  SELECT * INTO v_flash
  FROM public.vibe_flash_events
  WHERE id = p_flash_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vibe Flash event not found.');
  END IF;

  v_interested := COALESCE(v_flash.interested_ids, '{}');
  v_going := COALESCE(v_flash.going_ids, '{}');

  IF p_mode = 'interested' THEN
    IF p_user_id = ANY(v_interested) THEN
      v_interested := array_remove(v_interested, p_user_id);
      v_status := 'none';
    ELSE
      v_interested := array_append(v_interested, p_user_id);
      v_going := array_remove(v_going, p_user_id);
      v_status := 'interested';
    END IF;
  ELSIF p_mode = 'going' THEN
    IF p_user_id = ANY(v_going) THEN
      v_going := array_remove(v_going, p_user_id);
      v_status := 'none';
    ELSE
      IF COALESCE(array_length(v_going, 1), 0) >= v_flash.max_capacity THEN
        RETURN jsonb_build_object('success', false, 'error', 'Event capacity reached.');
      END IF;
      v_going := array_append(v_going, p_user_id);
      v_interested := array_remove(v_interested, p_user_id);
      v_status := 'going';
    END IF;
  END IF;

  UPDATE public.vibe_flash_events
  SET interested_ids = v_interested,
      going_ids = v_going
  WHERE id = p_flash_id;

  RETURN jsonb_build_object(
    'success', true,
    'status', v_status,
    'interested_ids', v_interested,
    'going_ids', v_going
  );
END;
$$;

-- ============================================================================
-- RPC 6: rpc_get_unified_vibe_flash_board & rpc_claim_vibe_flash_hunt
-- Queries active vibe_flash_events + place_meetups starting <= 60m.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.rpc_get_unified_vibe_flash_board()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_flashes JSONB;
  v_meetups JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(row_to_json(f)), '[]'::jsonb)
  INTO v_flashes
  FROM (
    SELECT *
    FROM public.vibe_flash_events
    WHERE expires_at > NOW()
    ORDER BY starts_at ASC
  ) f;

  SELECT COALESCE(jsonb_agg(row_to_json(m)), '[]'::jsonb)
  INTO v_meetups
  FROM (
    SELECT *
    FROM public.place_meetups
    WHERE status = 'active'
      AND COALESCE(starts_at, scheduled_at) <= (NOW() + INTERVAL '60 minutes')
      AND COALESCE(expires_at, COALESCE(starts_at, scheduled_at) + INTERVAL '2 hours') > NOW()
    ORDER BY COALESCE(starts_at, scheduled_at) ASC
  ) m;

  RETURN jsonb_build_object(
    'flashes', v_flashes,
    'meetups', v_meetups
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_claim_vibe_flash_hunt(
  p_flash_id UUID,
  p_user_id TEXT,
  p_user_lat DOUBLE PRECISION,
  p_user_lng DOUBLE PRECISION,
  p_receipt_photo_url TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_flash public.vibe_flash_events;
  v_dist INTEGER;
  v_reward INTEGER;
BEGIN
  SELECT * INTO v_flash
  FROM public.vibe_flash_events
  WHERE id = p_flash_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vibe Flash not found.');
  END IF;

  v_dist := public.fn_haversine_meters(p_user_lat, p_user_lng, v_flash.lat, v_flash.lng);
  IF v_dist > 33 THEN
    RETURN jsonb_build_object(
      'success', false,
      'distance_meters', v_dist,
      'error', format('You are %sm away. Must be within 33m to claim VQ Hunt.', v_dist)
    );
  END IF;

  IF p_user_id = ANY(v_flash.claimed_reward_ids) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You have already claimed the reward for this Flash.');
  END IF;

  v_reward := COALESCE(v_flash.vq_reward_per_hunter, 500);

  UPDATE public.vibe_flash_events
  SET verified_arrived_ids = array_append(array_remove(verified_arrived_ids, p_user_id), p_user_id),
      claimed_reward_ids = array_append(claimed_reward_ids, p_user_id),
      vq_hunt_pool = GREATEST(0, vq_hunt_pool - v_reward)
  WHERE id = p_flash_id;

  INSERT INTO public.vq_accounts (user_id, available_balance, total_earned, total_spent)
  VALUES (p_user_id, v_reward, v_reward, 0)
  ON CONFLICT (user_id) DO UPDATE
  SET available_balance = public.vq_accounts.available_balance + v_reward,
      total_earned = COALESCE(public.vq_accounts.total_earned, 0) + v_reward;

  INSERT INTO public.vq_transactions (user_id, amount, type, description)
  VALUES (
    p_user_id,
    v_reward,
    'earned',
    format('Vibe Flash 33m Hunt Claimed: %s (+%s VQ)', v_flash.title, v_reward)
  );

  RETURN jsonb_build_object(
    'success', true,
    'distance_meters', v_dist,
    'vq_earned', v_reward
  );
END;
$$;
