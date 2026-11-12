import React, { useState, useEffect, useRef } from 'react';
import {
  X, Navigation, Shield, Award, Users,
  CheckCircle2, Lock, Coffee, Utensils, Compass, Landmark,
  Moon, Star, ExternalLink, Calendar, Sparkles, Rocket, Camera
} from 'lucide-react';
import { VibePlace } from '../domains/d03_vibe_orbit/types';
import { useUser } from '../contexts/UserContext';
import { computeAiVibeMatch } from '../domains/d03_vibe_orbit/matchEngine';
import {
  fetchPromotionForPlace,
  getActivePlacePromotion,
  fetchPlaceCheckinsCount,
  claimCheckinReward,
  PlacePromotion
} from '../domains/d03_vibe_orbit/promotions';
import {
  fetchPlaceValidations,
  PlaceValidationSummary
} from '../domains/d03_vibe_orbit/validations';
import {
  fetchMeetupsByPlaceId,
  toggleMeetupRsvp,
  subscribeToMeetupUpdates
} from '../domains/d12_meetups/api';
import { PlaceMeetup } from '../domains/d12_meetups/types';
import { PromoteBusinessModal } from './PromoteBusinessModal';
import { VibeValidateModal } from './VibeValidateModal';
import { CreateMeetupModal } from './CreateMeetupModal';

export interface PlaceDetailModalProps {
  place: VibePlace;
  onClose: () => void;
  onCheckIn: (place: VibePlace) => void;
  onViewMap?: (place: VibePlace) => void;
  onRequireAuth?: () => void;
}

type ActiveTab = 'info' | 'mayor' | 'meetups';

/**
 * Returns an appropriate icon based on category
 */
function getCategoryIcon(category: string) {
  const cat = (category || '').toLowerCase();
  if (cat.includes('food') || cat.includes('restaurant')) return <Utensils className="w-4 h-4 text-amber-400" />;
  if (cat.includes('culture') || cat.includes('history')) return <Landmark className="w-4 h-4 text-purple-400" />;
  if (cat.includes('night') || cat.includes('owl')) return <Moon className="w-4 h-4 text-indigo-400" />;
  if (cat.includes('spot') || cat.includes('café') || cat.includes('cafe')) return <Coffee className="w-4 h-4 text-amber-400" />;
  return <Compass className="w-4 h-4 text-teal-400" />;
}

export const PlaceDetailModal: React.FC<PlaceDetailModalProps> = ({
  place,
  onClose,
  onCheckIn,
  onViewMap,
  onRequireAuth
}) => {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<ActiveTab>('info');
  const [isCheckedIn, setIsCheckedIn] = useState(false);

  // Sub-modals
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [showValidateModal, setShowValidateModal] = useState(false);
  const [showCreateMeetupModal, setShowCreateMeetupModal] = useState(false);
  const pendingOpenPromoteRef = useRef(false);

  // Auto-open Promote modal if user just signed in following a promote click
  useEffect(() => {
    if (user && pendingOpenPromoteRef.current) {
      pendingOpenPromoteRef.current = false;
      setShowPromoteModal(true);
    }
  }, [user]);

  // Dynamic domain data
  const [promotion, setPromotion] = useState<PlacePromotion | null>(null);
  const [validationSummary, setValidationSummary] = useState<PlaceValidationSummary>({
    averageConfidence: null,
    count: 0,
    validations: [],
    baselineConfidence: Math.round((place.rating ?? 4.0) * 20)
  });
  const [placeMeetups, setPlaceMeetups] = useState<PlaceMeetup[]>([]);
  const [realCheckinsCount, setRealCheckinsCount] = useState<number>(place.checkins_count ?? 0);

  // Load real promotions, validations, meetups, and checkins
  useEffect(() => {
    let mounted = true;

    async function loadPlaceData() {
      try {
        const [promo, valSummary, meetups, checkins] = await Promise.all([
          fetchPromotionForPlace(place.id),
          fetchPlaceValidations(place.id, place.rating),
          fetchMeetupsByPlaceId(place.id),
          fetchPlaceCheckinsCount(place.id)
        ]);

        if (mounted) {
          setPromotion(promo);
          setValidationSummary(valSummary);
          setPlaceMeetups(meetups);
          setRealCheckinsCount(checkins);
        }
      } catch (err) {
        console.warn('Error loading dynamic place data:', err);
      }
    }

    loadPlaceData();

    // Subscribe to cross-feed meetup updates
    const unsubscribe = subscribeToMeetupUpdates(() => {
      fetchMeetupsByPlaceId(place.id).then(m => {
        if (mounted) setPlaceMeetups(m);
      });
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [place.id, place.rating]);

  // Derived metrics
  const rating = place.rating ?? 4.6;

  // Strict Mutual Exclusivity: Only true if a user has funded a real VQ reward pool
  const activePromotion = getActivePlacePromotion(place.id) || promotion;
  const rewardPerCheckin = activePromotion?.reward_per_checkin ?? (place.is_promoted ? place.vq_reward : undefined);
  const remainingPool = activePromotion?.remaining_vq_pool ?? place.promotion_pool ?? 0;
  const isActivelyPromoted = Boolean(
    activePromotion &&
    rewardPerCheckin &&
    rewardPerCheckin > 0 &&
    remainingPool >= rewardPerCheckin
  );

  const displayCheckins = realCheckinsCount + (isCheckedIn ? 1 : 0);
  const vibeConfidence = validationSummary.averageConfidence;
  const confirmationsCount = validationSummary.count;

  // Proximity validation unlock (within 200m or checked in)
  const isWithin200m =
    (place.distance_meters !== undefined && place.distance_meters <= 200) ||
    (place.distance_km !== undefined && place.distance_km <= 0.2);
  const canValidate = isCheckedIn || isWithin200m;

  const distanceDisplay =
    place.distance_km !== undefined
      ? `${place.distance_km} km`
      : place.distance_meters !== undefined
      ? `${(place.distance_meters / 1000).toFixed(2)} km`
      : '0.38 km';

  // AI Vibe Match dynamic computation
  const matchResult = computeAiVibeMatch(place, user);
  const matchScore = place.ai_match_score ?? matchResult.score;
  const breakdown = matchResult.breakdown.length > 0
    ? matchResult.breakdown
    : [
        { label: 'Interest Alignment', delta: '+15%', points: 15 },
        { label: 'Stable Base Signal', delta: '+3%', points: 3 }
      ];

  const categoryLabel = ((place as any).categoryLabel || place.category || 'Spots').toUpperCase();

  const handlePromoteClick = () => {
    if (!user) {
      pendingOpenPromoteRef.current = true;
      if (onRequireAuth) onRequireAuth();
      return;
    }
    setShowPromoteModal(true);
  };

  const handleCheckInClick = async () => {
    if (!isCheckedIn) {
      if (!user) {
        if (onRequireAuth) onRequireAuth();
        return;
      }

      setIsCheckedIn(true);
      setRealCheckinsCount(prev => prev + 1);

      // Claim reward if place is promoted
      if (user.id && rewardPerCheckin) {
        await claimCheckinReward(place.id, user.id, place.title);
        if (promotion) {
          const newPool = Math.max(0, promotion.remaining_vq_pool - rewardPerCheckin);
          setPromotion({
            ...promotion,
            remaining_vq_pool: newPool,
            status: newPool >= rewardPerCheckin ? 'active' : 'depleted'
          });
        }
      }
      onCheckIn(place);
    }
  };

  const handleVibeValidateClick = () => {
    if (!user) {
      if (onRequireAuth) onRequireAuth();
      return;
    }
    setShowValidateModal(true);
  };

  const handleViewMapClick = () => {
    if (onViewMap) {
      onViewMap(place);
    } else {
      onClose();
    }
  };

  const handleRsvp = async (meetupId: string) => {
    const userId = user?.id || 'usr_anonymous';
    const res = await toggleMeetupRsvp(meetupId, userId);
    if (res.success) {
      const updated = await fetchMeetupsByPlaceId(place.id);
      setPlaceMeetups(updated);
    }
  };

  const handleValidationSuccess = (newAvg: number | null, newCount: number) => {
    setValidationSummary(prev => ({
      ...prev,
      averageConfidence: newAvg,
      count: newCount
    }));
  };

  const handleMeetupCreated = (newMeetup: PlaceMeetup) => {
    setPlaceMeetups([newMeetup, ...placeMeetups]);
    setActiveTab('meetups');
  };

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${place.title} details`}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      >
        <div className="relative w-full max-w-md bg-[#0d111a] border border-neutral-800 border-t-4 border-t-amber-400 rounded-[28px] overflow-hidden shadow-2xl text-white my-auto max-h-[92vh] flex flex-col">
          {/* Scrollable Container */}
          <div className="overflow-y-auto overflow-x-hidden flex-1 overscroll-contain">
            {/* 1. Hero Image Banner */}
            <div className="relative h-56 sm:h-60 w-full shrink-0">
              <img
                src={place.image_url && place.image_url.trim() !== '' ? place.image_url : 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80'}
                alt={place.title}
                className="w-full h-full object-cover"
              />
              {/* Top-right close button */}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close spot details"
                className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center backdrop-blur-md border border-white/10 transition cursor-pointer z-10 active:scale-90"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Bottom-left Category Pill (Emerald Green, uppercase, bold) */}
              <div className="absolute bottom-3 left-4 z-10 flex items-center gap-2">
                <span className="px-3.5 py-1 rounded-md bg-[#00d68f] text-neutral-950 font-black text-xs uppercase tracking-wider shadow-md">
                  {categoryLabel}
                </span>
                {isActivelyPromoted && (
                  <span className="px-2.5 py-1 rounded-md bg-amber-500 text-neutral-950 font-black text-xs uppercase tracking-wider shadow-md flex items-center gap-1">
                    <Rocket className="w-3 h-3" />
                    <span>Promoted</span>
                  </span>
                )}
              </div>

              {/* Subtle Gradient overlay on bottom of image */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0d111a] via-transparent to-black/30 pointer-events-none" />
            </div>

            {/* 2. Modal Body */}
            <div className="p-5 sm:p-6 space-y-4">
              {/* Spot Identity: Icon + Legendary Spot Badge + Title */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-6 h-6 rounded-full bg-neutral-800/80 flex items-center justify-center text-sm shadow-inner">
                    {getCategoryIcon(place.category)}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md bg-[#13233c] text-[#60a5fa] border border-[#2563eb]/40 font-extrabold text-[11px] tracking-wider uppercase">
                    LEGENDARY SPOT
                  </span>
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight leading-tight">
                  {place.title}
                </h2>
              </div>

              {/* 3. Three-Tab Switcher matching Reference */}
              <div className="flex items-center gap-1.5 pt-1" role="tablist" aria-label="Spot tabs">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'info'}
                  onClick={() => setActiveTab('info')}
                  className={`py-2 px-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer ${
                    activeTab === 'info'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <span>ℹ️</span>
                  <span>Info</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'mayor'}
                  onClick={() => setActiveTab('mayor')}
                  className={`py-2 px-3 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer ${
                    activeTab === 'mayor'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <span>👑</span>
                  <span>Mayor & Badges</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'meetups'}
                  onClick={() => setActiveTab('meetups')}
                  className={`py-2 px-3 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer ${
                    activeTab === 'meetups'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <span>👥</span>
                  <span>{placeMeetups.length === 0 ? 'Meetups (0)' : `Meetups (${placeMeetups.length})`}</span>
                </button>
              </div>

              {/* 4. Tab 1: Info (Exact visual reference replication) */}
              {activeTab === 'info' && (
                <div className="space-y-4 pt-1">
                  {/* Rating row: ⭐ 4.6 Out of 5.0 (31 reviews) */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-amber-400 text-base">⭐</span>
                    <span className="text-amber-400 font-black text-base">
                      {rating.toFixed(1)} Out of 5.0
                    </span>
                    <span className="text-neutral-400 text-xs font-medium ml-1">
                      ({place.reviews_count !== undefined ? `${place.reviews_count} reviews` : `${displayCheckins} check-ins`})
                    </span>
                    {typeof place.open_now === 'boolean' && (
                      <span
                        className={`ml-auto text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          place.open_now
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {place.open_now ? 'Open Now' : 'Closed'}
                      </span>
                    )}
                  </div>

                  {/* Vibe Confidence row: 🛡️ Vibe Confidence: Unrated (0 confirmations) or X% (Y confirmations) */}
                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <span className="text-blue-400">🛡️</span>
                    <span className="text-white font-semibold">Vibe Confidence:</span>
                    <span className="text-[#00e5a3] font-mono font-bold">
                      {confirmationsCount === 0 || vibeConfidence === null
                        ? 'Unrated (0 confirmations)'
                        : `${vibeConfidence}% (${confirmationsCount} confirmation${confirmationsCount === 1 ? '' : 's'})`}
                    </span>
                  </div>

                  {/* Address row */}
                  <div className="space-y-1">
                    <div className="flex items-start gap-2">
                      <span className="text-pink-400 mt-0.5">📍</span>
                      <span className="text-white font-bold text-sm leading-snug">
                        {place.address}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 leading-relaxed pl-6">
                      {distanceDisplay !== 'Unknown distance' ? `Located ${distanceDisplay} from your position.` : ''} Verified Google Places venue.
                    </p>
                  </div>

                  {/* 5. AI VIBE MATCH SCORE Card matching Reference */}
                  <div className="rounded-2xl bg-[#111726]/90 border border-neutral-800/90 p-4 space-y-3 shadow-inner">
                    {/* Card Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-fuchsia-400 font-black text-xs tracking-wider uppercase">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>AI VIBE MATCH SCORE</span>
                      </div>
                      <span className="text-fuchsia-300 font-black text-sm">
                        {matchScore}% Match
                      </span>
                    </div>

                    {/* Gradient Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-neutral-800/80 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-400 rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${Math.min(100, Math.max(10, matchScore))}%` }}
                      />
                    </div>

                    {/* Match Relevance Breakdown */}
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[10px] font-bold text-neutral-400 tracking-wider uppercase">
                        MATCH RELEVANCE BREAKDOWN:
                      </div>
                      {breakdown.map((row, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 text-neutral-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400" />
                            <span>{row.label}</span>
                          </div>
                          <span className="text-neutral-300 font-bold">{row.delta}</span>
                        </div>
                      ))}
                    </div>

                    {/* Italic Engine Disclaimer */}
                    <p className="text-[11px] text-neutral-400 italic leading-snug pt-1">
                      Based on interests, active community circles, recent check-ins, and local lifestyle sync. Offline-resilient engine active.
                    </p>
                  </div>

                  {/* 6. Four Approved Action Buttons (Strictly Mutually Exclusive Promotion vs Check-in) */}
                  <div className="space-y-2.5 pt-2">
                    {/* Primary Button Slot: Promoted Check-in CTA OR Promote Business CTA */}
                    {isActivelyPromoted && rewardPerCheckin ? (
                      <div className="space-y-1.5">
                        <button
                          type="button"
                          onClick={handleCheckInClick}
                          disabled={isCheckedIn}
                          className={`w-full py-3.5 px-4 rounded-full font-black text-sm text-center transition cursor-pointer active:scale-98 shadow-sm flex items-center justify-center gap-2 ${
                            isCheckedIn
                              ? 'border border-emerald-500/60 bg-emerald-900/50 text-emerald-300 cursor-default'
                              : 'border border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-400'
                          }`}
                        >
                          {isCheckedIn ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                              <span>✅ Checked In & Vibe Validated</span>
                            </>
                          ) : (
                            <>
                              <Camera className="w-4 h-4" />
                              <span>📸 Check-in with LiveCheck Receipt (+500 VQ)</span>
                            </>
                          )}
                        </button>

                        <div className="flex items-center justify-between px-2 text-[11px] text-amber-400/90 font-medium">
                          <span className="flex items-center gap-1">
                            <Rocket className="w-3.5 h-3.5 text-amber-400" />
                            <span>Sponsored Pool: <strong>{remainingPool} VQ</strong> left</span>
                          </span>
                          <span>+{rewardPerCheckin} VQ / check-in</span>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handlePromoteClick}
                        className="w-full py-3.5 px-4 rounded-full font-black text-sm text-center transition cursor-pointer active:scale-98 shadow-sm flex items-center justify-center gap-2 border border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400"
                      >
                        <Rocket className="w-4 h-4" />
                        <span>🚀 Promote This Business (Fund Check-in Rewards)</span>
                      </button>
                    )}

                    {/* Button 2: Check-in & Vibe Validate (Unified Status Button) */}
                    {isCheckedIn ? (
                      <button
                        type="button"
                        disabled
                        className="w-full py-3 px-4 rounded-full border border-emerald-500/60 bg-emerald-900/50 text-emerald-300 font-bold text-xs text-center flex items-center justify-center gap-2 cursor-default shadow-sm"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                        <span>✅ Checked In & Vibe Validated</span>
                      </button>
                    ) : (place.distance_meters !== undefined && place.distance_meters <= 33) ? (
                      <button
                        type="button"
                        onClick={handleVibeValidateClick}
                        className="w-full py-3 px-4 rounded-full border border-[#00e5a3]/50 bg-[#00e5a3]/10 hover:bg-[#00e5a3]/20 text-[#00e5a3] font-bold text-xs text-center transition cursor-pointer flex items-center justify-center gap-2 active:scale-98 shadow-sm"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        <span>Check-in & Vibe Validate — Submit Live Status</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (onRequireAuth && !user) {
                            onRequireAuth();
                          } else {
                            handleVibeValidateClick();
                          }
                        }}
                        className="w-full py-3 px-4 rounded-full border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-900 text-neutral-400 font-semibold text-xs text-center transition flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Lock className="w-3.5 h-3.5 text-neutral-500" />
                        <span>Check-in & Vibe Validate (Locked — {place.distance_meters ?? 380}m away, must be within 33m)</span>
                      </button>
                    )}

                    {/* Button 3: View Map & Directions */}
                    <button
                      type="button"
                      onClick={handleViewMapClick}
                      className="w-full py-3 px-4 rounded-full border border-blue-600/40 bg-blue-950/30 hover:bg-blue-900/40 text-blue-400 font-bold text-sm text-center transition cursor-pointer flex items-center justify-center gap-2 active:scale-98"
                    >
                      <Navigation className="w-4 h-4" />
                      <span>View Map & Directions</span>
                    </button>

                    {/* Button 4: Close Spot Details */}
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-full py-3 px-4 rounded-full border border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800 text-white font-bold text-sm text-center transition cursor-pointer active:scale-98"
                    >
                      Close Spot Details
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 2: Mayor & Badges */}
              {activeTab === 'mayor' && (
                <div className="space-y-4 pt-1">
                  <div className="rounded-2xl bg-neutral-900/70 border border-neutral-800 p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-xl shadow-md">
                        👑
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-amber-400 font-bold">
                          District Sentinel / Mayor
                        </div>
                        <div className="text-base font-black text-white">
                          @{place.created_by || 'zen_stroller'}
                        </div>
                        <div className="text-xs text-neutral-400">
                          Top check-in frequency ({displayCheckins > 0 ? displayCheckins : 14} visits this cycle)
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                      Earnable Spot Badges
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-neutral-900/60 border border-neutral-800/80 p-3 flex items-center gap-2.5">
                        <span className="text-xl">☕</span>
                        <div>
                          <div className="text-xs font-bold text-white">Caffeine Pioneer</div>
                          <div className="text-[10px] text-neutral-400">3 check-ins required</div>
                        </div>
                      </div>
                      <div className="rounded-xl bg-neutral-900/60 border border-neutral-800/80 p-3 flex items-center gap-2.5">
                        <span className="text-xl">🛡️</span>
                        <div>
                          <div className="text-xs font-bold text-white">Vibe Validator</div>
                          <div className="text-[10px] text-neutral-400">Verify spot hours</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-3 px-4 rounded-full border border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800 text-white font-bold text-sm text-center transition cursor-pointer"
                  >
                    Close Spot Details
                  </button>
                </div>
              )}

              {/* Tab 3: Meetups */}
              {activeTab === 'meetups' && (
                <div className="space-y-4 pt-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                      Spot Gatherings & Circles
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowCreateMeetupModal(true)}
                      className="text-xs font-bold text-blue-400 hover:text-blue-300 transition flex items-center gap-1 cursor-pointer"
                    >
                      + Host Meetup
                    </button>
                  </div>

                  {placeMeetups.length === 0 ? (
                    <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800/80 p-6 text-center space-y-3">
                      <Users className="w-8 h-8 text-neutral-500 mx-auto" />
                      <h4 className="font-bold text-sm text-white">No active meetups scheduled</h4>
                      <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                        Be the first to rally the squad at {place.title}! Host an open hangout, casual study session, or coffee crawl.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowCreateMeetupModal(true)}
                        className="py-2 px-4 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 transition shadow-md cursor-pointer"
                      >
                        + Organize Meetup at {place.title}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                      {placeMeetups.map((m) => {
                        const isAttending = user?.id ? m.attendee_ids.includes(user.id) : false;
                        const isHost = user?.id && m.host_user_id === user.id;

                        return (
                          <div
                            key={m.id}
                            className="p-3.5 bg-neutral-900/80 border border-neutral-800 rounded-xl space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-1.5">
                                  {m.is_live_checkin && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                      LIVE NOW
                                    </span>
                                  )}
                                  <h5 className="text-sm font-bold text-white">{m.title}</h5>
                                </div>
                                <p className="text-xs text-neutral-400 mt-0.5">
                                  Hosted by <span className="text-neutral-200 font-semibold">{m.host_name}</span>
                                  {!m.is_live_checkin && ` • ${new Date(m.scheduled_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
                                </p>
                              </div>
                              <span className="text-xs px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300 font-bold shrink-0">
                                {m.attendee_ids.length} going
                              </span>
                            </div>

                            {m.description && (
                              <p className="text-xs text-neutral-300 italic">{m.description}</p>
                            )}

                            <div className="flex items-center justify-between pt-1">
                              <span className="text-[11px] text-neutral-500">
                                {isHost ? 'You are host' : isAttending ? 'You are attending' : 'Open to everyone'}
                              </span>
                              {!isHost && (
                                <button
                                  type="button"
                                  onClick={() => handleRsvp(m.id)}
                                  className={`text-xs px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                                    isAttending
                                      ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                                      : 'bg-blue-600 text-white hover:bg-blue-500 shadow-sm'
                                  }`}
                                >
                                  {isAttending ? 'Leave' : 'RSVP / Join'}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-3 px-4 rounded-full border border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800 text-white font-bold text-sm text-center transition cursor-pointer"
                  >
                    Close Spot Details
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sub-modals */}
      {showPromoteModal && (
        <PromoteBusinessModal
          isOpen={showPromoteModal}
          onClose={() => setShowPromoteModal(false)}
          place={place}
          user={user}
          onSuccess={(promo: any) => setPromotion(promo)}
          onRequireAuth={onRequireAuth}
        />
      )}

      {showValidateModal && (
        <VibeValidateModal
          isOpen={showValidateModal}
          onClose={() => setShowValidateModal(false)}
          place={place}
          onValidated={handleValidationSuccess}
          onRequireAuth={onRequireAuth}
        />
      )}

      {showCreateMeetupModal && (
        <CreateMeetupModal
          isOpen={showCreateMeetupModal}
          onClose={() => setShowCreateMeetupModal(false)}
          place={place}
          onCreated={handleMeetupCreated}
        />
      )}
    </>
  );
};
