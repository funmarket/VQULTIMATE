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
  if (cat.includes('spot')) return <Compass className="w-4 h-4 text-purple-400" />;
  return <Compass className="w-4 h-4 text-teal-400" />;
}

export const PlaceDetailModal: React.FC<PlaceDetailModalProps> = ({
  place,
  onClose,
  onCheckIn,
  onViewMap
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('info');

  const rating = place.rating;
  const distanceDisplay =
    place.distance_km !== undefined
      ? `${place.distance_km} km`
      : place.distance_meters !== undefined
      ? `${(place.distance_meters / 1000).toFixed(2)} km`
      : 'Unknown distance';
  const categoryLabel = place.category.toUpperCase();

  const handleCheckInClick = () => {
    onCheckIn(place);
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
            {place.image_url ? (
              <img src={place.image_url} alt={place.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-neutral-500">No venue photo available</div>
            )}
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
                {place.is_legendary && <span className="px-2.5 py-0.5 rounded-md bg-[#13233c] text-[#60a5fa] border border-[#2563eb]/40 font-extrabold text-[11px] tracking-wider uppercase">LEGENDARY SPOT</span>}
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
                {typeof rating === 'number' && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-amber-400">★ {rating.toFixed(1)} out of 5</span>
                    {typeof place.reviews_count === 'number' && <span className="text-neutral-400 text-xs">({place.reviews_count} Google reviews)</span>}
                    {typeof place.open_now === 'boolean' && <span className="text-neutral-400 text-xs">{place.open_now ? 'Open now' : 'Closed'}</span>}
                  </div>
                )}

                {/* Address row: 📍 15 Local Discovery Avenue */}
                <div className="space-y-1">
                  <div className="flex items-start gap-2">
                    <span className="text-pink-400 mt-0.5">📍</span>
                    <span className="text-white font-bold text-sm leading-snug">
                      {place.address}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed pl-6">
                    {distanceDisplay !== 'Unknown distance' ? `Located ${distanceDisplay} from your position.` : ''}
                  </p>
                </div>

                {/* 6. Four Approved Action Buttons matching Reference */}
                <div className="space-y-2.5 pt-2">
                  {/* Button 1: Check-in to Gain +500 PTS */}
                  <button type="button" onClick={handleCheckInClick}
                    className="w-full py-3.5 px-4 rounded-full font-black text-sm text-center transition cursor-pointer bg-emerald-950/40 text-emerald-400 border border-emerald-500/40">
                    Check in
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
                <div className="rounded-2xl bg-neutral-900/70 border border-neutral-800 p-4 text-sm text-neutral-400">
                  Community mayor and badge information is not available for this location.
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
