import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, Bookmark, MapPin, Compass, Sparkles, Map as MapIcon,
  Navigation, CheckCircle2, Coffee
} from 'lucide-react';
import { CityPulse, VibePulsesSummary } from '../domains/d04_geo_presence';
import { VibePlace } from '../domains/d03_vibe_orbit';

interface VibePulsesCarouselProps {
  summary: VibePulsesSummary;
  onViewMap: (city?: CityPulse) => void;
  onSelectPlace?: (place: VibePlace) => void;
  onToast?: (message: string) => void;
}

/**
 * Custom SVG Glowing Pulse Wave Icon matching reference screenshot
 */
const PulseWaveIcon: React.FC<{ className?: string; size?: number }> = ({
  className = 'text-pink-400',
  size = 20
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block shrink-0 ${className}`}
  >
    <path
      d="M3 12H7L9.5 5L14.5 19L17 12H21"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const VibePulsesCarousel: React.FC<VibePulsesCarouselProps> = ({
  summary,
  onViewMap,
  onSelectPlace,
  onToast
}) => {
  const { cities, totalCities, totalLiveVibes } = summary;

  // Active card index. Default to nearest city index 0 or Tunis if present.
  const [activeIndex, setActiveIndex] = useState<number>(() => {
    if (!cities || cities.length === 0) return 0;
    const tunisIdx = cities.findIndex((c) => c.city.toLowerCase() === 'tunis');
    return tunisIdx !== -1 ? tunisIdx : 0;
  });

  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [isInteracting, setIsInteracting] = useState(false);
  const touchStartXRef = useRef<number | null>(null);
  const touchCurrentXRef = useRef<number | null>(null);
  const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const resumeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check reduced-motion preference
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const handleNext = useCallback(() => {
    if (cities.length <= 1) return;
    setActiveIndex((prev) => (prev + 1) % cities.length);
  }, [cities.length]);

  const handlePrev = useCallback(() => {
    if (cities.length <= 1) return;
    setActiveIndex((prev) => (prev - 1 + cities.length) % cities.length);
  }, [cities.length]);

  // Pause automatic advancement temporarily during user interaction
  const pauseAutoScroll = useCallback(() => {
    setIsInteracting(true);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      setIsInteracting(false);
    }, 4000);
  }, []);

  // Automatic scrolling loop (advances every 4.2 seconds unless paused or reduced motion)
  useEffect(() => {
    if (prefersReducedMotion || isInteracting || cities.length <= 1) {
      if (autoAdvanceTimerRef.current) clearInterval(autoAdvanceTimerRef.current);
      return;
    }

    autoAdvanceTimerRef.current = setInterval(() => {
      handleNext();
    }, 4200);

    return () => {
      if (autoAdvanceTimerRef.current) clearInterval(autoAdvanceTimerRef.current);
    };
  }, [cities.length, handleNext, isInteracting, prefersReducedMotion]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) clearInterval(autoAdvanceTimerRef.current);
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, []);

  // Toggle bookmark
  const toggleBookmark = (e: React.MouseEvent, cityId: string, cityName: string) => {
    e.stopPropagation();
    pauseAutoScroll();
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(cityId)) {
        next.delete(cityId);
        onToast?.(`Removed ${cityName} from saved spots.`);
      } else {
        next.add(cityId);
        onToast?.(`Saved ${cityName} to your Vibe Pulses!`);
      }
      return next;
    });
  };

  // Card click handler: If tapping active card with placeData, open canonical Place Details modal!
  const handleCardClick = (city: CityPulse, index: number) => {
    pauseAutoScroll();
    if (index === activeIndex) {
      if (city.placeData && onSelectPlace) {
        onSelectPlace(city.placeData);
      } else {
        onViewMap(city);
      }
    } else {
      setActiveIndex(index);
    }
  };

  // Touch gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    pauseAutoScroll();
    touchStartXRef.current = e.touches[0].clientX;
    touchCurrentXRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchCurrentXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartXRef.current !== null && touchCurrentXRef.current !== null) {
      const deltaX = touchStartXRef.current - touchCurrentXRef.current;
      const minSwipeDistance = 45;
      if (deltaX > minSwipeDistance) {
        handleNext();
      } else if (deltaX < -minSwipeDistance) {
        handlePrev();
      }
    }
    touchStartXRef.current = null;
    touchCurrentXRef.current = null;
  };

  if (!cities || cities.length === 0) {
    return (
      <div className="rounded-3xl bg-neutral-900/60 border border-neutral-800/80 p-6 text-center space-y-2">
        <Compass className="w-8 h-8 text-purple-400/60 mx-auto" />
        <h3 className="font-bold text-sm text-white">No active pulses in this sector</h3>
        <p className="text-xs text-neutral-400 max-w-xs mx-auto">
          Scan the horizon in Vibe Orbit to detect newly verified city pulses.
        </p>
      </div>
    );
  }

  // Active city
  const activeCity = cities[activeIndex] || cities[0];

  return (
    <section
      aria-label="Vibe Pulses"
      className="relative space-y-4 pt-1 pb-2 overflow-hidden select-none font-sans"
      onMouseEnter={pauseAutoScroll}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Ambient background glow matching reference aura */}
      <div
        className="pointer-events-none absolute -top-10 -right-10 w-72 h-44 rounded-full bg-gradient-to-br from-purple-600/20 via-pink-500/10 to-transparent blur-3xl"
        aria-hidden="true"
      />

      {/* 1. Header Bar matching Reference Screenshot */}
      <div className="flex items-start justify-between relative z-10 px-0.5">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <span className="text-pink-400 drop-shadow-[0_0_12px_rgba(244,114,182,0.8)]">
              <PulseWaveIcon size={26} />
            </span>
            <span>Vibe Pulses</span>
          </h2>
          <p className="text-xs text-purple-200/70 font-medium tracking-wide mt-0.5">
            Your city's social pulse
          </p>
        </div>
      </div>

      {/* 2. Horizontally Arranged Carousel with Active Card Emphasis */}
      <div className="relative w-full overflow-hidden py-3">
        <div className="flex items-center justify-center gap-2 sm:gap-3 px-2">
          {cities.map((city, index) => {
            const isActive = index === activeIndex;
            const isPrev = index === (activeIndex - 1 + cities.length) % cities.length;
            const isNext = index === (activeIndex + 1) % cities.length;
            const isBookmarked = bookmarkedIds.has(city.id);

            // Hide cards beyond immediate neighbors on mobile viewport to prevent clutter
            const isVisible = isActive || isPrev || isNext;
            if (!isVisible && cities.length > 3) {
              return null;
            }

            return (
              <div
                key={city.id}
                onClick={() => handleCardClick(city, index)}
                className={`relative shrink-0 rounded-[28px] overflow-hidden transition-all duration-500 ease-out cursor-pointer ${
                  isActive
                    ? 'w-[200px] sm:w-[220px] h-[310px] sm:h-[330px] z-20 scale-100 shadow-[0_0_35px_rgba(168,85,247,0.45)] ring-2 ring-purple-400/80 border border-purple-300/40'
                    : 'w-[140px] sm:w-[155px] h-[270px] sm:h-[285px] z-10 scale-95 opacity-70 hover:opacity-90 border border-white/10'
                }`}
              >
                {/* City Photographic Background */}
                <img
                  src={city.imageUrl}
                  alt={city.city}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />

                {/* Smooth Dark Gradient Overlay for typography contrast */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#090611] via-[#090611]/55 to-transparent" />

                {/* Top Row: Weekend / Legendary Badge & Bookmark Button */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
                  {city.isWeekendHighlight ? (
                    <span className="px-2.5 py-1 rounded-full bg-amber-500/25 border border-amber-400/50 backdrop-blur-md text-amber-200 text-[10px] font-bold flex items-center gap-1 shadow-sm">
                      <span>{city.type === 'place' ? '⭐' : '📅'}</span>
                      <span>{city.weekendBadgeText || (city.type === 'place' ? 'Legendary Spot' : 'This Weekend')}</span>
                    </span>
                  ) : (
                    <span />
                  )}

                  <button
                    type="button"
                    onClick={(e) => toggleBookmark(e, city.id, city.city)}
                    aria-label={`Bookmark ${city.city}`}
                    className={`w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md border transition cursor-pointer ${
                      isBookmarked
                        ? 'bg-purple-600/80 border-purple-300 text-white shadow-md'
                        : 'bg-black/40 border-white/15 text-white/80 hover:text-white hover:bg-black/60'
                    }`}
                  >
                    <Bookmark
                      className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-white' : ''}`}
                    />
                  </button>
                </div>

                {/* Bottom Content Area */}
                <div className="absolute bottom-3 left-3 right-3 space-y-2 z-10">
                  {/* City / Place Name */}
                  <h3
                    className={`font-black text-white tracking-tight leading-tight truncate ${
                      isActive ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg'
                    }`}
                  >
                    {city.city}
                  </h3>

                  {/* Pulse count with waveform */}
                  <div className="flex items-center gap-1.5 text-xs text-white/90 font-medium">
                    <span className="text-pink-400 drop-shadow-[0_0_8px_rgba(244,114,182,0.8)]">
                      <PulseWaveIcon size={isActive ? 16 : 14} />
                    </span>
                    <span className={isActive ? 'text-white font-bold' : 'text-zinc-200 text-[11px]'}>
                      {city.activePulses} {city.metricLabel}
                    </span>
                  </div>

                  {/* View Map / Spot Details Action Button */}
                  {isActive ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (city.placeData && onSelectPlace) {
                          onSelectPlace(city.placeData);
                        } else {
                          onViewMap(city);
                        }
                      }}
                      className="w-full py-2.5 px-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-400 hover:from-purple-400 hover:to-pink-300 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-purple-600/30 active:scale-95 transition cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5 text-white" />
                      <span>{city.placeData ? 'View Spot Details' : 'View Map'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (city.placeData && onSelectPlace) {
                          onSelectPlace(city.placeData);
                        } else {
                          onViewMap(city);
                        }
                      }}
                      className="w-full py-1.5 px-2 rounded-full bg-black/50 border border-white/10 hover:border-white/30 text-zinc-300 text-[10px] font-semibold flex items-center justify-center gap-1 transition cursor-pointer"
                    >
                      <span>View Map</span>
                      <ChevronRight className="w-3 h-3 text-zinc-400" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Carousel Navigation Controls (< [dots] >) matching Reference */}
      <div className="flex items-center justify-center gap-4 pt-1">
        <button
          type="button"
          onClick={() => {
            pauseAutoScroll();
            handlePrev();
          }}
          aria-label="Previous city pulse"
          className="w-9 h-9 rounded-full bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition cursor-pointer active:scale-90"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Indicators */}
        <div className="flex items-center gap-1.5" role="tablist" aria-label="City carousel indicators">
          {cities.map((city, idx) => {
            const isSelected = idx === activeIndex;
            return (
              <button
                key={city.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-label={`Go to ${city.city}`}
                onClick={() => {
                  pauseAutoScroll();
                  setActiveIndex(idx);
                }}
                className={`transition-all duration-300 cursor-pointer ${
                  isSelected
                    ? 'w-7 h-1.5 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full'
                    : 'w-1.5 h-1.5 bg-zinc-600 hover:bg-zinc-400 rounded-full'
                }`}
              />
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => {
            pauseAutoScroll();
            handleNext();
          }}
          aria-label="Next city pulse"
          className="w-9 h-9 rounded-full bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition cursor-pointer active:scale-90"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 4. Aggregate Summary Banner Bar matching Reference Screenshot */}
      <div className="rounded-2xl bg-[#140e22]/90 border border-purple-500/20 p-3 sm:p-3.5 flex items-center justify-between shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-800 flex items-center justify-center text-white shadow-md shadow-purple-600/30 shrink-0">
            <PulseWaveIcon size={20} className="text-pink-300" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-white leading-tight">Vibe Pulses</h4>
            <p className="text-[11px] text-purple-200/70 font-medium">
              {totalCities} nearby {totalCities === 1 ? 'place' : 'places'} • {totalLiveVibes} total live vibes
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (activeCity?.placeData && onSelectPlace) {
              onSelectPlace(activeCity.placeData);
            } else {
              onViewMap(activeCity);
            }
          }}
          className="px-3.5 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 border border-white/10 text-xs text-white font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
        >
          <MapIcon className="w-3.5 h-3.5 text-purple-300" />
          <span>View Map</span>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
        </button>
      </div>
    </section>
  );
};
