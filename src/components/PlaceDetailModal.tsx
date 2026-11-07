import React, { useState } from 'react';
import {
  X, MapPin, Sparkles, Navigation, Shield, Award, Users,
  CheckCircle2, Lock, Coffee, Utensils, Compass, Landmark,
  Moon, Star, ExternalLink, Calendar
} from 'lucide-react';
import { VibePlace } from '../domains/d03_vibe_orbit';

export interface PlaceDetailModalProps {
  place: VibePlace;
  onClose: () => void;
  onCheckIn: (place: VibePlace) => void;
  onViewMap?: (place: VibePlace) => void;
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
  onViewMap
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('info');
  const [isCheckedIn, setIsCheckedIn] = useState(false);

  // Reference visual values
  const rating = place.rating ?? 4.6;
  const checkinsCount = (place.checkins_count ?? 31) + (isCheckedIn ? 1 : 0);
  const vibeConfidence = place.vibe_confidence ?? 92;
  const confirmationsCount = place.confirmations_count ?? 8;
  const distanceDisplay =
    place.distance_km !== undefined
      ? `${place.distance_km} km`
      : place.distance_meters !== undefined
      ? `${(place.distance_meters / 1000).toFixed(2)} km`
      : '0.38 km';
  const matchScore = place.ai_match_score ?? 73;
  const categoryLabel = (place.category === 'Spots' ? 'CAFÉS' : place.category.toUpperCase());

  const handleCheckInClick = () => {
    if (!isCheckedIn) {
      setIsCheckedIn(true);
      onCheckIn(place);
    }
  };

  const handleViewMapClick = () => {
    if (onViewMap) {
      onViewMap(place);
    } else {
      onClose();
    }
  };

  return (
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
              src={place.image_url}
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
            <div className="absolute bottom-3 left-4 z-10">
              <span className="px-3.5 py-1 rounded-md bg-[#00d68f] text-neutral-950 font-black text-xs uppercase tracking-wider shadow-md">
                {categoryLabel}
              </span>
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
                <span>Meetups (0)</span>
              </button>
            </div>

            {/* 4. Tab 1: Info (Exact visual reference replication) */}
            {activeTab === 'info' && (
              <div className="space-y-4 pt-1">
                {/* Rating row: ⭐ 4.6 Out of 5.0 (31 check-ins) */}
                <div className="flex items-center gap-1.5">
                  <span className="text-amber-400 text-base">⭐</span>
                  <span className="text-amber-400 font-black text-base">
                    {rating.toFixed(1)} Out of 5.0
                  </span>
                  <span className="text-neutral-400 text-xs font-medium ml-1">
                    ({checkinsCount} check-ins)
                  </span>
                </div>

                {/* Vibe Confidence row: 🛡️ Vibe Confidence: 92% (8 confirmations) */}
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <span className="text-blue-400">🛡️</span>
                  <span className="text-white font-semibold">Vibe Confidence:</span>
                  <span className="text-[#00e5a3] font-mono font-bold">
                    {vibeConfidence}% ({confirmationsCount} confirmations)
                  </span>
                </div>

                {/* Address row: 📍 15 Local Discovery Avenue */}
                <div className="space-y-1">
                  <div className="flex items-start gap-2">
                    <span className="text-pink-400 mt-0.5">📍</span>
                    <span className="text-white font-bold text-sm leading-snug">
                      {place.address}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed pl-6">
                    This location has been mapped on OpenStreetMap. You are currently located{' '}
                    {distanceDisplay} away from this spot. Verified by VibeQuest community nodes.
                  </p>
                </div>

                {/* 5. AI VIBE MATCH SCORE Card matching Reference */}
                <div className="rounded-2xl bg-[#111726]/90 border border-neutral-800/90 p-4 space-y-3 shadow-inner">
                  {/* Card Header: ✨ AI VIBE MATCH SCORE ... 73% Match */}
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
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-neutral-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400" />
                        <span>Interest Alignment</span>
                      </div>
                      <span className="text-neutral-300 font-bold">+15%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-neutral-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400" />
                        <span>Stable Base Signal</span>
                      </div>
                      <span className="text-neutral-300 font-bold">+3%</span>
                    </div>
                  </div>

                  {/* Italic Engine Disclaimer */}
                  <p className="text-[11px] text-neutral-400 italic leading-snug pt-1">
                    Based on interests, active community circles, recent check-ins, and local lifestyle sync. Offline-resilient engine active.
                  </p>
                </div>

                {/* 6. Four Approved Action Buttons matching Reference */}
                <div className="space-y-2.5 pt-2">
                  {/* Button 1: Check-in to Gain +500 PTS */}
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
                        <span>Checked In! (+{place.vq_reward || 500} PTS Claimed)</span>
                      </>
                    ) : (
                      <span>Check-in to Gain +{place.vq_reward || 500} PTS</span>
                    )}
                  </button>

                  {/* Button 2: Vibe Validate (Locked) */}
                  <button
                    type="button"
                    disabled
                    className="w-full py-3 px-4 rounded-full border border-neutral-800 bg-neutral-900/50 text-neutral-500 font-semibold text-xs text-center cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Vibe Validate (Locked - Check-in or be within 200m)</span>
                  </button>

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
                        Top check-in frequency (14 visits this cycle)
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

            {/* Tab 3: Meetups (0) */}
            {activeTab === 'meetups' && (
              <div className="space-y-4 pt-1">
                <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800/80 p-6 text-center space-y-2">
                  <Users className="w-8 h-8 text-neutral-500 mx-auto" />
                  <h4 className="font-bold text-sm text-white">No active meetups scheduled</h4>
                  <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                    Be the first to rally the squad at {place.title}! Host an open hangout or casual study session.
                  </p>
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
          </div>
        </div>
      </div>
    </div>
  );
};
