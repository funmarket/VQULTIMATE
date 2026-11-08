import React, { useEffect, useState, useRef } from 'react';
import {
  Sparkles, MapPin, Shield, Compass, ChevronRight, ChevronLeft, Flame, Award,
  Users, Zap, Clock, Route, GitFork, CheckCircle2, Send, X
} from 'lucide-react';
import { fetchNearbyPlaces, VibePlace, getDeviceLocation } from '../domains/d03_vibe_orbit';
import { fetchCulturalTrails, fetchVibeGuardians, CulturalTrail, VibeGuardian, TrailWaypoint } from '../domains/d07_trails';
import { fetchActiveFlashEvent, canCreateFlashEvent, FlashEvent } from '../domains/d11_events';
import { requestAccountUpgrade, FlashUpgradePlan } from '../domains/d21_entitlements/api';
import { fetchCommentsForPost, addCommentToPost, VibeComment } from '../domains/d05_vibe';
import { fetchCityPulses, VibePulsesSummary, CityPulse } from '../domains/d04_geo_presence';
import { UserProfile } from '../domains/d01_auth';
import { TrailDetailModal } from './TrailDetailModal';
import { GuardianDetailModal } from './GuardianDetailModal';
import { CreateFlashModal } from './CreateFlashModal';
import { HomeSocialFeed } from './HomeSocialFeed';
import { VibePulsesCarousel } from './VibePulsesCarousel';

interface HomeTabProps {
  user: UserProfile | null;
  onNavigateTab: (tab: any) => void;
  onSelectPlace: (place: VibePlace) => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({ user, onNavigateTab, onSelectPlace }) => {
  const [guardians, setGuardians] = useState<VibeGuardian[]>([]);
  const [places, setPlaces] = useState<VibePlace[]>([]);
  const [trails, setTrails] = useState<CulturalTrail[]>([]);
  const [pulsesSummary, setPulsesSummary] = useState<VibePulsesSummary>({
    cities: [],
    totalCities: 0,
    totalLiveVibes: 0,
    source: 'calculated_baseline'
  });
  const [flashEvent, setFlashEvent] = useState<FlashEvent | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [selectedTrail, setSelectedTrail] = useState<CulturalTrail | null>(null);
  const [selectedGuardian, setSelectedGuardian] = useState<VibeGuardian | null>(null);
  const [isCreateFlashOpen, setIsCreateFlashOpen] = useState(false);
  const [isFlashUpgradeOpen, setIsFlashUpgradeOpen] = useState(false);
  const [flashAccessNotice, setFlashAccessNotice] = useState(false);
  const [upgradeSubmitting, setUpgradeSubmitting] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState('');
  const [canCreateFlash, setCanCreateFlash] = useState(false);
  const [homeToast, setHomeToast] = useState<string | null>(null);

  // Social feed comments modal state
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [comments, setComments] = useState<VibeComment[]>([]);
  const [newComment, setNewComment] = useState('');

  const trailsScrollRef = useRef<HTMLDivElement>(null);
  const guardiansScrollRef = useRef<HTMLDivElement>(null);

  const loadFlash = async () => {
    try {
      const ev = await fetchActiveFlashEvent();
      setFlashEvent(ev);
      setSecondsLeft(ev?.seconds_left ?? 0);
    } catch (error) {
      console.warn('Flash Events could not be loaded:', error);
      setFlashEvent(null);
      setSecondsLeft(0);
    }
  };

  useEffect(() => {
    fetchVibeGuardians().then(setGuardians);
    fetchCulturalTrails().then(setTrails);
    loadFlash();
    const flashPoll = setInterval(loadFlash, 30000);

    getDeviceLocation().then((locState) => {
      fetchNearbyPlaces(locState.coords).then(setPlaces);
      fetchCityPulses(locState.coords).then(setPulsesSummary);
    });

    return () => clearInterval(flashPoll);
  }, []);

  useEffect(() => {
    let active = true;
    setCanCreateFlash(false);
    canCreateFlashEvent().then(allowed => {
      if (active) setCanCreateFlash(allowed);
    }).catch(() => {
      if (active) setCanCreateFlash(false);
    });
    return () => { active = false; };
  }, [user?.id]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const showToast = (msg: string) => {
    setHomeToast(msg);
    setTimeout(() => setHomeToast(null), 3000);
  };

  const handleViewCityMap = (city?: CityPulse) => {
    if (city) {
      showToast(`Exploring map for ${city.city}...`);
    }
    onNavigateTab('explore');
  };

  const handleScrollTrails = (direction: 'left' | 'right') => {
    if (trailsScrollRef.current) {
      const scrollAmount = 300;
      trailsScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleScrollGuardians = (direction: 'left' | 'right') => {
    if (guardiansScrollRef.current) {
      const scrollAmount = 300;
      guardiansScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleWaypointCheckIn = (wp: TrailWaypoint, tr: CulturalTrail) => {
    showToast(`Checked in at "${wp.title}" on ${tr.title}! Claimed +${wp.vq_reward} VQ.`);
  };

  const handleOpenComments = async (postId: string) => {
    setActivePostId(postId);
    const comms = await fetchCommentsForPost(postId);
    setComments(comms);
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePostId || !newComment.trim() || !user) {
      showToast('Please sign in to comment.');
      return;
    }
    const added = await addCommentToPost(activePostId, newComment, {
      username: user.username,
      avatar_url: user.avatar_url
    });
    if (added) {
      setComments([...comments, added]);
      setNewComment('');
    }
  };

  const hasActiveFlash = Boolean(flashEvent && secondsLeft > 0);
  const featuredPlace = places.find(place => Boolean(place.image_url));
  const photoPlace = hasActiveFlash
    ? places.find(place => place.id === flashEvent?.place_id && Boolean(place.image_url))
    : featuredPlace;
  const accountType = (user?.accountType || user?.tier || 'vibe').toLowerCase();
  const isProOrBusiness = accountType === 'pro' || accountType === 'business';

  const submitFlashUpgrade = async (plan: FlashUpgradePlan) => {
    setUpgradeSubmitting(true);
    setUpgradeMessage('');
    try {
      const result = await requestAccountUpgrade(plan);
      if (result.success) {
        setUpgradeMessage('Request submitted for review. Your account has not been upgraded or charged.');
      } else {
        setUpgradeMessage(result.error || 'Your request could not be submitted.');
      }
    } catch {
      setUpgradeMessage('Your request could not be submitted.');
    } finally {
      setUpgradeSubmitting(false);
    }
  };

  const handleCreateFlashEntry = () => {
    if (canCreateFlash) {
      setIsCreateFlashOpen(true);
    } else if (isProOrBusiness) {
      setFlashAccessNotice(true);
    } else {
      setIsFlashUpgradeOpen(true);
    }
  };
  const minutesLeft = Math.floor(secondsLeft / 60);

  return (
    <div className="space-y-6 pb-24 text-white max-w-md mx-auto box-border overflow-x-hidden relative">
      {/* Toast Notification */}
      {homeToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-teal-500 text-neutral-950 font-bold text-xs shadow-2xl flex items-center space-x-2 animate-fadeIn border border-teal-300">
          <CheckCircle2 className="w-4 h-4" />
          <span>{homeToast}</span>
        </div>
      )}

      {/* Flash Events slot retains its layout even when no event is active. */}
      <div className="rounded-3xl bg-neutral-900 border border-purple-500/30 p-5 shadow-2xl space-y-4 animate-fadeIn relative overflow-hidden">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCreateFlashEntry}
            className="px-4 py-2.5 rounded-full border border-neutral-700 hover:border-neutral-500 bg-neutral-950 text-white font-bold text-xs tracking-wider transition cursor-pointer flex items-center space-x-1 shadow-md"
          >
            <span>+ CREATE EVENT</span>
          </button>

          {hasActiveFlash ? (
            <button
              type="button"
              onClick={() => {
                if (flashEvent?.place_id) {
                  const found = places.find(p => p.id === flashEvent.place_id);
                  if (found) onSelectPlace(found);
                  else onNavigateTab('explore');
                } else {
                  onNavigateTab('explore');
                }
              }}
              className="px-5 py-2.5 rounded-full bg-white hover:bg-neutral-200 text-neutral-950 font-black text-xs uppercase tracking-wider transition cursor-pointer flex items-center space-x-1.5 shadow-lg shadow-white/10 active:scale-95"
            >
              <span>HUNT NOW! 🏃</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigateTab('explore')}
              className="px-5 py-2.5 rounded-full bg-white hover:bg-neutral-200 text-neutral-950 font-black text-xs uppercase tracking-wider transition cursor-pointer flex items-center space-x-1.5 shadow-lg shadow-white/10 active:scale-95"
            >
              <span>Explore Vibes</span>
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2 text-sm">
          <span className="text-orange-400">🎭</span>
          <span className="font-bold text-white tracking-tight">Flash Alert</span>
          <span className="text-neutral-500 font-light">|</span>
          <span className="font-bold text-pink-500 tracking-tight">
            {hasActiveFlash ? 'Happening Now' : 'Discover More'}
          </span>
        </div>

        <div className="relative h-32 rounded-2xl overflow-hidden bg-gradient-to-br from-purple-950 via-neutral-900 to-orange-950 border border-neutral-800">
          {photoPlace && (
            <>
              <img src={photoPlace.image_url} alt={photoPlace.title} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/90 via-neutral-950/20 to-transparent" />
              <button type="button" onClick={() => onSelectPlace(photoPlace)}
                className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2 text-left text-xs text-white">
                <span className="truncate font-bold">{photoPlace.title}</span>
                <span className="shrink-0 text-[10px] font-bold text-amber-300 uppercase">{hasActiveFlash ? 'Event location' : 'Suggested place'}</span>
              </button>
            </>
          )}
          {!photoPlace && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 text-neutral-300/70">
              <Sparkles className="h-5 w-5 text-purple-400" />
              <span className="text-xs font-semibold tracking-wide">Explore local vibes</span>
            </div>
          )}
        </div>

        {hasActiveFlash ? (
          <>
            <div className="space-y-1.5">
              <h3 className="font-bold text-base text-white tracking-tight">
                {flashEvent?.title}
              </h3>
              <p className="text-xs text-neutral-300 leading-relaxed">
                {flashEvent?.description}
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-neutral-800 text-xs">
              <div>
                <span className="text-pink-500 font-bold">Live Flash Event</span>
              </div>
              <div className="flex items-center space-x-1 text-neutral-400 font-medium">
                <Clock className="w-3.5 h-3.5 text-pink-500 animate-pulse" />
                <span className="text-white font-bold">{minutesLeft}m left</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-1.5 min-h-[54px]" role="status" aria-live="polite">
              <h3 className="font-bold text-base text-white tracking-tight">
                No Flash Events are active right now.
              </h3>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Check back for the next Flash Event.
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-neutral-800 text-xs">
              <span className="text-neutral-400 font-bold">No live event rewards</span>
              <span className="text-neutral-400 font-medium text-right">Suggestions coming soon</span>
            </div>
          </>
        )}
      </div>

      {/* Vibe Pulses — Exact Visual Reference & Genuine City Aggregation */}
      <VibePulsesCarousel
        summary={pulsesSummary}
        onViewMap={handleViewCityMap}
        onSelectPlace={onSelectPlace}
        onToast={showToast}
      />

      {/* Curated Cultural Trails & Vibe Tours */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold flex items-center space-x-2">
              <Award className="w-5 h-5 text-amber-400" />
              <span>Cultural Vibes Trails & Tours</span>
            </h2>
            <p className="text-[11px] text-neutral-400">Curated multi-stop circuits & pro guided expeditions</p>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="text-xs text-neutral-400 font-semibold">{trails.length} Total</span>
            <div className="flex items-center space-x-1 pl-2">
              <button
                onClick={() => handleScrollTrails('left')}
                className="p-1 rounded-lg bg-neutral-900 border border-neutral-800 text-teal-400 hover:bg-neutral-800 cursor-pointer"
                aria-label="Scroll trails left"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleScrollTrails('right')}
                className="p-1 rounded-lg bg-neutral-900 border border-neutral-800 text-teal-400 hover:bg-neutral-800 cursor-pointer"
                aria-label="Scroll trails right"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {trails.length > 0 ? (
          <div
            ref={trailsScrollRef}
            className="flex items-center space-x-3.5 overflow-x-auto pb-3 scrollbar-none px-1"
          >
            {trails.map((t) => (
              <div
                key={t.id}
                onClick={() => setSelectedTrail(t)}
                className="w-72 sm:w-80 flex-shrink-0 rounded-3xl overflow-hidden bg-neutral-900 border border-neutral-800 hover:border-amber-500/60 transition duration-300 cursor-pointer group flex flex-col shadow-xl"
              >
                <div className="relative h-40 w-full overflow-hidden bg-neutral-950">
                  <img
                    src={t.imageUrl || t.image_url || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80'}
                    alt={t.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/30 to-transparent" />

                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border backdrop-blur-md ${
                      t.isTour
                        ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                        : 'bg-neutral-950/80 text-emerald-300 border-emerald-500/30'
                    }`}>
                      {t.isTour ? '⬡ VIBE TOUR' : (t.category || '🧭 VIBE TRAIL')}
                    </span>
                    <span className="text-xs font-black text-amber-300 bg-amber-500/20 px-2.5 py-1 rounded-xl border border-amber-500/40 backdrop-blur-md">
                      +{t.vq_reward} VQ
                    </span>
                  </div>

                  <div className="absolute bottom-2.5 left-3 right-3 flex items-center space-x-2 text-[11px] text-neutral-300">
                    <span className="flex items-center space-x-1 bg-neutral-950/70 px-2 py-0.5 rounded-lg backdrop-blur-md">
                      <Clock className="w-3 h-3 text-teal-400" />
                      <span>{t.durationHours ? `${t.durationHours}h` : `${t.duration_mins}m`}</span>
                    </span>
                    <span className="flex items-center space-x-1 bg-neutral-950/70 px-2 py-0.5 rounded-lg backdrop-blur-md">
                      <Route className="w-3 h-3 text-orange-400" />
                      <span>{t.distance_km || 2.4}km</span>
                    </span>
                    <span className="flex items-center space-x-1 bg-neutral-950/70 px-2 py-0.5 rounded-lg backdrop-blur-md text-teal-300 font-semibold ml-auto">
                      <span>{t.stopsCount || t.waypoints_count || 3} Stops</span>
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <h3 className="font-bold text-white text-base group-hover:text-amber-300 transition line-clamp-1">
                      {t.title}
                    </h3>
                    <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                      {t.story || t.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <img
                        src={t.authorAvatarUrl || t.guardian_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                        alt={t.authorName || t.guardian_name}
                        className="w-6 h-6 rounded-full object-cover border border-orange-500/40"
                      />
                      <span className="text-[11px] text-neutral-300 font-medium truncate max-w-[120px]">
                        {t.authorName || t.guardian_name}
                      </span>
                    </div>
                    <span className="text-[11px] text-teal-400 font-bold flex items-center space-x-0.5 group-hover:translate-x-0.5 transition">
                      <span>Explore</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800/80 p-5 text-center space-y-2">
            <Award className="w-8 h-8 text-amber-400/60 mx-auto" />
            <h4 className="font-bold text-xs text-white">No cultural trails published yet</h4>
            <p className="text-[11px] text-neutral-400 max-w-xs mx-auto">
              Certified pathfinders and guardians are mapping the next historical trail.
            </p>
          </div>
        )}
      </div>

      {/* Active Guardians & Local Legends */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold flex items-center space-x-2">
              <Shield className="w-5 h-5 text-teal-400" />
              <span>Active Guardians & Local Legends</span>
            </h2>
            <p className="text-[11px] text-neutral-400">Verified human guides & friendly neighborhood sentinels</p>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="text-xs text-neutral-400 font-semibold">{guardians.length} On Duty</span>
            <div className="flex items-center space-x-1 pl-2">
              <button
                onClick={() => handleScrollGuardians('left')}
                className="p-1 rounded-lg bg-neutral-900 border border-neutral-800 text-teal-400 hover:bg-neutral-800 cursor-pointer"
                aria-label="Scroll guardians left"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleScrollGuardians('right')}
                className="p-1 rounded-lg bg-neutral-900 border border-neutral-800 text-teal-400 hover:bg-neutral-800 cursor-pointer"
                aria-label="Scroll guardians right"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {guardians.length > 0 ? (
          <div
            ref={guardiansScrollRef}
            className="flex items-center space-x-3.5 overflow-x-auto pb-3 scrollbar-none px-1"
          >
            {guardians.map((g) => {
              const isPro = g.type === 'pro';
              return (
                <div
                  key={g.id}
                  onClick={() => setSelectedGuardian(g)}
                  className="w-72 sm:w-80 flex-shrink-0 rounded-3xl bg-neutral-900 border border-neutral-800 hover:border-teal-500/60 p-4 flex flex-col justify-between space-y-3 transition cursor-pointer group shadow-xl"
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative flex-shrink-0">
                      <img
                        src={g.avatarUrl || g.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                        alt={g.name}
                        className="w-12 h-12 rounded-full object-cover border border-teal-500/40 group-hover:scale-105 transition duration-300"
                      />
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-neutral-900 animate-pulse" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-1.5">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.2 rounded border ${
                          isPro
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                            : 'bg-teal-500/10 text-teal-300 border-teal-500/30'
                        }`}>
                          {g.tier || (isPro ? 'PRO GUIDE' : 'LOCAL LEGEND')}
                        </span>
                        {g.hourlyRate ? (
                          <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 px-1.5 py-0.2 rounded">
                            ${g.hourlyRate}/h
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-teal-300 bg-teal-500/10 px-1.5 py-0.2 rounded">
                            Free
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-sm text-white truncate group-hover:text-amber-300 transition mt-0.5">
                        {g.name}
                      </h4>
                      <p className="text-xs text-neutral-400 truncate">{g.city || g.district}</p>
                    </div>
                  </div>

                  <p className="text-xs text-neutral-300 line-clamp-2 leading-relaxed font-light">
                    {g.bio || 'District guardian and cultural pathfinder.'}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-neutral-800 text-xs">
                    <span className="text-[11px] text-emerald-300 font-bold">
                      Trust {g.trustScore || g.trust_score || 95}%
                    </span>
                    <span className="text-[11px] text-teal-400 font-bold flex items-center space-x-0.5 group-hover:translate-x-0.5 transition">
                      <span>Inspect</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800/80 p-5 text-center space-y-2">
            <Shield className="w-8 h-8 text-teal-400/60 mx-auto" />
            <h4 className="font-bold text-xs text-white">No guardians registered on duty</h4>
            <p className="text-[11px] text-neutral-400 max-w-xs mx-auto">
              District guardian rotation active. New guardians sync when signed into Supabase.
            </p>
          </div>
        )}
      </div>

      {/* ========================================================
          SOCIAL FEED: MY NETWORK | LOCAL VIBES | FOR YOU
          Placed right after Active Guardians
         ======================================================== */}
      <HomeSocialFeed user={user} onOpenComments={handleOpenComments} onToast={showToast} />

      {/* Comments Modal for Social Feed */}
      {activePostId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="w-full sm:max-w-lg bg-neutral-900 border border-neutral-800 rounded-t-3xl sm:rounded-3xl p-6 space-y-4 max-h-[80vh] flex flex-col shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="font-bold text-base">District Comments</h3>
              <button
                onClick={() => setActivePostId(null)}
                className="text-xs text-neutral-400 hover:text-white px-2.5 py-1 rounded-xl bg-neutral-800 cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 min-h-[160px]">
              {comments.length > 0 ? (
                comments.map((comm) => (
                  <div key={comm.id} className="flex space-x-3 items-start bg-neutral-950/60 p-3 rounded-2xl border border-neutral-800">
                    <img src={comm.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'} alt={comm.username} className="w-8 h-8 rounded-full object-cover" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white">@{comm.username}</span>
                        <span className="text-[10px] text-neutral-500">
                          {new Date(comm.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-300 mt-1">{comm.content}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-neutral-500 italic">
                  No comments yet. Start the conversation!
                </div>
              )}
            </div>

            <form onSubmit={handleSendComment} className="flex items-center space-x-2 pt-2 border-t border-neutral-800">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-teal-500"
              />
              <button
                type="submit"
                className="p-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-teal-500 text-white hover:opacity-90 transition cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Trail Detail Modal */}
      {selectedTrail && (
        <TrailDetailModal
          trail={selectedTrail}
          onClose={() => setSelectedTrail(null)}
          onStartNavigation={() => {
            setSelectedTrail(null);
            onNavigateTab('explore');
          }}
          onCheckInWaypoint={handleWaypointCheckIn}
          onToast={showToast}
        />
      )}

      {/* Guardian Detail Modal */}
      {selectedGuardian && (
        <GuardianDetailModal
          guardian={selectedGuardian}
          currentUser={user}
          trails={trails}
          onClose={() => setSelectedGuardian(null)}
          onSelectTrail={(t) => {
            setSelectedGuardian(null);
            setSelectedTrail(t);
          }}
          onLocateMap={() => {
            setSelectedGuardian(null);
            onNavigateTab('explore');
          }}
          onToast={showToast}
        />
      )}

      {/* Upgrade entry: plan selection is informational until billing/entitlements exist. */}
      {isFlashUpgradeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setIsFlashUpgradeOpen(false); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="flash-upgrade-title"
            className="w-full max-w-sm rounded-3xl border border-purple-500/40 bg-neutral-900 p-6 shadow-2xl space-y-4">
            <div className="flex justify-between gap-3 items-start">
              <div>
                <h2 id="flash-upgrade-title" className="text-xl font-black text-white">Upgrade to Pro or Business</h2>
                <p className="mt-2 text-xs text-neutral-300">Flash Event creation is intended for Pro, Business and App Admin accounts.</p>
              </div>
              <button type="button" aria-label="Close upgrade window" onClick={() => setIsFlashUpgradeOpen(false)} className="p-2 text-neutral-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" disabled={upgradeSubmitting} onClick={() => void submitFlashUpgrade('pro')}
                className="rounded-2xl border border-purple-500/40 bg-purple-500/10 p-4 text-left disabled:opacity-50">
                <span className="font-bold text-white text-sm">Pro account</span>
                <p className="mt-1 text-xs text-neutral-300">For creators organizing their own events.</p>
                <span className="mt-3 block text-[11px] font-bold text-purple-200">Request Pro upgrade</span>
              </button>
              <button type="button" disabled={upgradeSubmitting} onClick={() => void submitFlashUpgrade('business')}
                className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-left disabled:opacity-50">
                <span className="font-bold text-white text-sm">Business account</span>
                <p className="mt-1 text-xs text-neutral-300">For venues and businesses promoting events.</p>
                <span className="mt-3 block text-[11px] font-bold text-amber-200">Request Business upgrade</span>
              </button>
            </div>
            <p className="text-xs text-amber-200">These are upgrade requests, not subscriptions. No payment or account change is made.</p>
            {upgradeMessage && <p role="status" className="text-xs text-white">{upgradeMessage}</p>}
            <button type="button" onClick={() => setIsFlashUpgradeOpen(false)}
              className="w-full rounded-xl bg-white py-3 text-xs font-black text-neutral-950">Got it</button>
          </div>
        </div>
      )}

      {flashAccessNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm" role="presentation">
          <div role="alertdialog" aria-modal="true" aria-labelledby="flash-access-title"
            className="w-full max-w-sm rounded-3xl border border-purple-500/40 bg-neutral-900 p-6 shadow-2xl space-y-4">
            <h2 id="flash-access-title" className="text-lg font-black text-white">Flash Events access</h2>
            <p className="text-sm text-neutral-300">Flash Event publishing is not yet enabled for this account. Your Pro or Business account must be verified by the server before creating events.</p>
            <button type="button" onClick={() => setFlashAccessNotice(false)}
              className="w-full rounded-xl bg-white py-3 text-xs font-black text-neutral-950">Close</button>
          </div>
        </div>
      )}

      {/* Create Flash Event Modal */}
      {isCreateFlashOpen && (
        <CreateFlashModal
          user={user}
          canCreate={canCreateFlash}
          onClose={() => setIsCreateFlashOpen(false)}
          onCreated={loadFlash}
          onToast={showToast}
        />
      )}
    </div>
  );
};
