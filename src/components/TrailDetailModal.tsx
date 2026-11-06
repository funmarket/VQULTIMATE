import React, { useState } from 'react';
import {
  X, Clock, Route, GitFork, Download, Heart, Footprints, Car, Bus, Map,
  ChevronDown, ChevronRight, CheckCircle2, Sparkles, MapPin, Compass
} from 'lucide-react';
import { CommunityTrail, TrailStop, buildTrailRoutePlan, TrailTravelMode, TrailRouteSegment } from '../domains/d07_trails';

interface TrailDetailModalProps {
  trail: CommunityTrail;
  onClose: () => void;
  onCheckInWaypoint?: (waypoint: any, trail: CommunityTrail) => void;
  onToast?: (message: string) => void;
  onAdoptTrail?: (trail: CommunityTrail) => void;
  onToggleSave?: (trailId: string) => Promise<void>;
  isSaved?: boolean;
  onReserveTour?: (tour: CommunityTrail) => void;
}

export const TrailDetailModal: React.FC<TrailDetailModalProps> = ({
  trail,
  onClose,
  onCheckInWaypoint,
  onToast,
  onAdoptTrail, onToggleSave, isSaved = false, onReserveTour
}) => {
  const [completedStops, setCompletedStops] = useState<Set<string>>(new Set());
  const [isCached, setIsCached] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedStopId, setExpandedStopId] = useState<string | null>(null);
  const [routePlan, setRoutePlan] = useState<{mode: TrailTravelMode; legs: TrailRouteSegment[]} | null>(null);
  const showDirections = (mode: TrailTravelMode) => {
    const plan = buildTrailRoutePlan(trail, mode);
    if (plan.error) { onToast?.(plan.error); return; }
    if (plan.segments.length === 1) {
      window.open(plan.segments[0].url, '_blank', 'noopener,noreferrer');
      return;
    }
    setRoutePlan({ mode, legs: plan.segments });
  };
  const navigateToStop = (stop: TrailStop) => {
    const hasCoordinates = typeof stop.lat === 'number' && typeof stop.lng === 'number'
      && Number.isFinite(stop.lat) && Number.isFinite(stop.lng)
      && Math.abs(stop.lat) <= 90 && Math.abs(stop.lng) <= 180;
    const address = stop.address?.trim();
    const destination = hasCoordinates
      ? `${stop.lat},${stop.lng}`
      : address ? [address, trail.city].filter(Boolean).join(', ') : null;
    if (!destination) {
      onToast?.('This stop needs a Google Maps address or map coordinates.');
      return;
    }
    const params = new URLSearchParams({ api: '1', destination });
    window.open('https://www.google.com/maps/dir/?' + params.toString(), '_blank', 'noopener,noreferrer');
  };
  const [activePhoto, setActivePhoto] = useState(0);
  const gallery = trail.gallery || [];
  const visibleImages = gallery.length > 0
    ? [...gallery].sort((a, b) => Number(b.isCover) - Number(a.isCover))
        .map(photo => photo.url).filter(Boolean)
    : [trail.imageUrl || trail.image_url || ''].filter(Boolean);

  const stops: TrailStop[] = trail.stops && trail.stops.length > 0
    ? trail.stops
    : (trail.waypoints && trail.waypoints.length > 0
        ? trail.waypoints.map((wp, idx) => ({
            id: wp.id || `stop-${idx}`,
            name: wp.title || `Stop #${idx + 1}`,
            address: wp.title || 'Itinerary Stop',
            vibeNote: wp.description || wp.hint || 'Cultural checkpoint on trail route.',
            timeOfDay: (idx === 0 ? 'Morning' : idx === 1 ? 'Sunset' : 'Night'),
            durationMinutes: 60,
            vq_reward: wp.vq_reward || 75
          }))
        : []);

  const handleToggleLike = async () => {
    if (!onToggleSave || isSaving) return;
    setIsSaving(true);
    try { await onToggleSave(trail.id); }
    finally { setIsSaving(false); }
  };
  const handleAdopt = () => onAdoptTrail?.(trail);
  const handleCacheOffline = () => {
    onToast?.('Offline Trail downloads are not yet available.');
  };

  const handleToggleStop = (id: string) => {
    setExpandedStopId((prev) => (prev === id ? null : id));
  };

  const handleCheckInStop = (stop: TrailStop) => {
    onToast?.(`Waypoint "${stop.name}" is available for navigation. Verified check-ins and rewards are not enabled yet.`);
  };

  const getTimeBadge = (timeOfDay: string) => {
    switch (timeOfDay) {
      case 'Morning':
        return { label: '🌅 Morning', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
      case 'Afternoon':
        return { label: '☀️ Afternoon', bg: 'bg-orange-500/20 text-orange-300 border-orange-500/30' };
      case 'Sunset':
        return { label: '🌆 Sunset', bg: 'bg-pink-500/20 text-pink-300 border-pink-500/30' };
      case 'Night':
        return { label: '🌙 Night', bg: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
      default:
        return { label: '✨ Flexible', bg: 'bg-teal-500/20 text-teal-300 border-teal-500/30' };
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
      <div className="w-full sm:max-w-lg bg-neutral-950 border border-neutral-800 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl text-white max-h-[92vh] flex flex-col">
        {/* Edge-to-Edge Hero Image matching reference image_86e0ae07.png */}
        <div className="relative h-64 sm:h-72 w-full bg-neutral-900 flex-shrink-0">
          <img
            src={visibleImages[activePhoto] || visibleImages[0] || ''}
            alt={trail.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />

          {/* Close Button Top Right */}
          <button
            onClick={onClose}
            aria-label="Close Trail Detail"
            className="absolute top-4 right-4 p-2 rounded-full bg-neutral-950/70 hover:bg-neutral-900 text-white transition backdrop-blur-md border border-white/10 cursor-pointer z-10"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Badges Overlay */}
          <div className="absolute top-4 left-4 flex items-center space-x-2 z-10">
            <span className="px-3 py-1 rounded-full bg-neutral-950/80 text-emerald-400 font-black text-[10px] uppercase tracking-wider backdrop-blur-md border border-emerald-500/40 flex items-center space-x-1">
              <span>📍 {trail.category || 'FULL DAY CIRCUIT'}</span>
            </span>
          </div>

          <div className="absolute bottom-4 right-4 z-10">
            <span className="px-3 py-1 rounded-full bg-neutral-950/80 text-amber-300 font-bold text-[11px] backdrop-blur-md border border-amber-500/40 flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>{trail.durationHours ? `${trail.durationHours}h` : `${Math.round((trail.duration_mins || 180)/60)}h`} • {stops.length} Stops</span>
            </span>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Title & Author Action Bar */}
          <div className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
              {trail.title}
            </h2>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="font-black text-sm text-white tracking-wide">
                  {trail.authorName || trail.guardian_name || 'MR B'}
                </span>
                <span className="text-neutral-500 text-xs">•</span>
                <span className="text-xs text-neutral-400 font-mono">
                  {trail.authorHandle || trail.guardian_handle || '@curator'}
                </span>
              </div>

              {/* Action Buttons: Adopt, Cache, Like */}
              <div className="flex items-center space-x-2">
                {trail.isTour && onReserveTour && <button type="button" onClick={()=>onReserveTour(trail)}
                  className="px-3 py-1.5 rounded-xl border text-xs font-bold bg-purple-600/30 border-purple-500/50 text-purple-200">
                  Request Tour
                </button>}
                {!trail.isTour && <button
                  type="button"
                  onClick={handleAdopt}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                    'bg-emerald-950/40 text-emerald-400 border-emerald-500/50 hover:bg-emerald-900/50'
                  }`}
                >
                  <GitFork className="w-3.5 h-3.5" />
                  <span>Adopt</span>
                </button>}

                <button
                  type="button"
                  onClick={handleCacheOffline}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                    isCached
                      ? 'bg-neutral-800 text-white border-neutral-600'
                      : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:text-white'
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Cache</span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleLike}
                  className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition flex items-center space-x-1 cursor-pointer ${
                    isSaved
                      ? 'bg-pink-500/20 text-pink-400 border-pink-500/50'
                      : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-pink-400 text-pink-400' : ''}`} />
                  <span>{trail.savesCount ?? 0}</span>
                </button>
              </div>
            </div>
          </div>

          {visibleImages.length > 1 && (
            <section aria-label="Trail photo gallery" className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                Gallery · {visibleImages.length} photos
              </p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {visibleImages.map((url, index) => (
                  <button key={url} type="button" onClick={() => setActivePhoto(index)}
                    aria-label={`View photo ${index + 1}`}
                    aria-pressed={activePhoto === index}
                    className={`w-20 flex-shrink-0 overflow-hidden rounded-xl border-2 ${activePhoto === index ? 'border-emerald-400' : 'border-neutral-800'}`}>
                    <img src={url} alt={`Trail photo ${index + 1}`}
                      className="aspect-video w-full object-cover" />
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Narrative Story Snippet */}
          <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-light">
            {trail.story || trail.description}
          </p>

          {/* CURATED TRAIL ITINERARY Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-neutral-400 font-mono">
                CURATED TRAIL ITINERARY ({stops.length} STOPS)
              </span>
              <span className="text-[10px] text-neutral-500 font-medium">
                Tap stop for pro-tips
              </span>
            </div>

            <div className="space-y-2.5">
              {stops.map((stop, index) => {
                const isChecked = completedStops.has(stop.id);
                const isExpanded = expandedStopId === stop.id;
                const timeBadge = getTimeBadge(stop.timeOfDay);

                return (
                  <div
                    key={stop.id}
                    className={`rounded-2xl border transition duration-200 overflow-hidden ${
                      isExpanded
                        ? 'bg-neutral-900/90 border-emerald-500/40'
                        : 'bg-neutral-900/50 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div
                      onClick={() => handleToggleStop(stop.id)}
                      className="p-3.5 flex items-center justify-between cursor-pointer select-none"
                    >
                      <div className="flex items-center space-x-3 min-w-0 flex-1 pr-2">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${
                          isChecked
                            ? 'bg-emerald-500 text-neutral-950 shadow-md shadow-emerald-500/30'
                            : 'bg-neutral-900 text-emerald-400 border border-emerald-500/40'
                        }`}>
                          {isChecked ? '✓' : index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-xs sm:text-sm text-white truncate">
                            {stop.name}
                          </h4>
                          {stop.address && stop.address !== stop.name && (
                            <p className="text-[10px] text-neutral-400 truncate">{stop.address}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${timeBadge.bg}`}>
                          {timeBadge.label}
                        </span>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-neutral-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-neutral-500" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Pro-Tips & Check-In Area */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 space-y-3 border-t border-neutral-800/80 bg-neutral-950/60 animate-fadeIn">
                        <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 leading-relaxed">
                          <span className="text-emerald-400 font-bold block mb-1">💡 Curator Pro-Tip:</span>
                          {stop.vibeNote || 'Follow the trail markers and savor the authentic cultural atmosphere.'}
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1">
                          <span className="text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20 text-[11px]">
                            +{stop.vq_reward || 75} VQ Check-in
                          </span>

                          <button
                            type="button"
                            onClick={() => handleCheckInStop(stop)}
                            disabled={isChecked}
                            className={`px-4 py-1.5 rounded-xl font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                              isChecked
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                : 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-md shadow-emerald-500/20'
                            }`}
                          >
                            {isChecked ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Checked In</span>
                              </>
                            ) : (
                              <span>Check In Here</span>
                            )}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigateToStop(stop)}
                          className="w-full rounded-xl border border-emerald-500/40 bg-emerald-900/30 px-3 py-2 text-[11px] font-bold text-emerald-300 hover:bg-emerald-900/50"
                        >
                          Navigate to this stop in Google Maps
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Google Maps route modes: compact equal-width buttons, no simulated route. */}
        <div className="space-y-2 border-t border-neutral-800 bg-neutral-950 p-3">
          <div aria-label="Google Maps directions" className="grid grid-cols-4 gap-1.5">
            {([
              { mode: 'walking', label: 'Chill Walk', Icon: Footprints },
              { mode: 'driving', label: 'Cruise To It', Icon: Car },
              { mode: 'transit', label: 'Hop On', Icon: Bus },
              { mode: 'best', label: 'Best', Icon: Map },
            ] as const).map(({mode, label, Icon}) => (
              <button key={mode} type="button" onClick={() => showDirections(mode)}
                title={`Open ${label} directions in Google Maps`}
                className="flex min-w-0 items-center justify-center gap-0.5 rounded-xl bg-[#00e599] px-0.5 py-3 text-[8px] font-extrabold text-neutral-950 transition hover:bg-[#00c985] min-[390px]:text-[10px]">
                <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="whitespace-nowrap">{label}</span>
              </button>
            ))}
          </div>
          {routePlan && (
            <section aria-label="Google Maps route legs" className="space-y-2 rounded-xl border border-emerald-500/30 p-3">
              <p className="text-xs font-bold text-emerald-300">
                Your itinerary needs {routePlan.legs.length} Google Maps legs.
              </p>
              <p className="text-[11px] text-neutral-400">
                Open each leg in order to visit every stop. Maps has mobile waypoint limits;
                transit is routed one stop at a time.
              </p>
              <div className="grid gap-2">
                {routePlan.legs.map((leg, index) => (
                  <a key={leg.url} href={leg.url} target="_blank" rel="noopener noreferrer"
                    className="rounded-lg border border-neutral-700 px-3 py-2 text-xs text-emerald-200 hover:bg-neutral-900">
                    Part {index + 1}: {leg.from} → {leg.to} ({leg.stopCount} stops)
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
