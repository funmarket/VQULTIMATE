import React, { useEffect, useState, useRef } from 'react';
import {
  Sparkles, MapPin, Shield, Compass, ChevronRight, ChevronLeft, Flame, Award,
  Users, Zap, Clock, Route, GitFork, CheckCircle2
} from 'lucide-react';
import { fetchVibePlaces, VibePlace } from '../domains/d03_vibe_orbit';
import { fetchCulturalTrails, fetchVibeGuardians, CulturalTrail, VibeGuardian, TrailWaypoint } from '../domains/d07_trails';
import { fetchActiveFlashEvent, FlashEvent } from '../domains/d11_events';
import { fetchActivities, ActivityFeedItem } from '../domains/d10_activities';
import { UserProfile } from '../domains/d01_auth';
import { TrailDetailModal } from './TrailDetailModal';
import { GuardianDetailModal } from './GuardianDetailModal';
import { CreateFlashModal } from './CreateFlashModal';

interface HomeTabProps {
  user: UserProfile | null;
  onNavigateTab: (tab: any) => void;
  onSelectPlace: (place: VibePlace) => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({ user, onNavigateTab, onSelectPlace }) => {
  const [guardians, setGuardians] = useState<VibeGuardian[]>([]);
  const [places, setPlaces] = useState<VibePlace[]>([]);
  const [trails, setTrails] = useState<CulturalTrail[]>([]);
  const [flashEvent, setFlashEvent] = useState<FlashEvent | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [selectedTrail, setSelectedTrail] = useState<CulturalTrail | null>(null);
  const [selectedGuardian, setSelectedGuardian] = useState<VibeGuardian | null>(null);
  const [isCreateFlashOpen, setIsCreateFlashOpen] = useState(false);
  const [homeToast, setHomeToast] = useState<string | null>(null);

  const trailsScrollRef = useRef<HTMLDivElement>(null);
  const guardiansScrollRef = useRef<HTMLDivElement>(null);

  const loadFlash = async () => {
    const ev = await fetchActiveFlashEvent();
    setFlashEvent(ev);
    if (ev) setSecondsLeft(ev.seconds_left);
  };

  useEffect(() => {
    fetchVibeGuardians().then(setGuardians);
    fetchVibePlaces().then(setPlaces);
    fetchCulturalTrails().then(setTrails);
    loadFlash();
    const flashPoll = setInterval(loadFlash, 30000);

    fetchActivities().then(setActivities);
    return () => clearInterval(flashPoll);
  }, []);

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

      {/* Flash Alert | Happening Now Card (Matching exact user screenshot design) */}
      {flashEvent && secondsLeft > 0 && (
        <div className="rounded-3xl bg-neutral-900 border border-purple-500/30 p-5 shadow-2xl space-y-4 animate-fadeIn relative overflow-hidden">
          {/* Top Actions Row: + CREATE FLASH (outlined) & HUNT NOW! 🏃 (solid white) */}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setIsCreateFlashOpen(true)}
              className="px-4 py-2.5 rounded-full border border-neutral-700 hover:border-neutral-500 bg-neutral-950 text-white font-bold text-xs tracking-wider transition cursor-pointer flex items-center space-x-1 shadow-md"
            >
              <span>+ CREATE FLASH</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (flashEvent.place_id) {
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
          </div>

          {/* Title Header */}
          <div className="flex items-center space-x-2 text-sm">
            <span className="text-orange-400">🎭</span>
            <span className="font-bold text-white tracking-tight">Flash Alert</span>
            <span className="text-neutral-500 font-light">|</span>
            <span className="font-bold text-pink-500 tracking-tight">Happening Now</span>
          </div>

          {/* Title & Description */}
          <div className="space-y-1.5">
            <h3 className="font-bold text-base text-white tracking-tight">
              {flashEvent.title}
            </h3>
            <p className="text-xs text-neutral-300 leading-relaxed">
              {flashEvent.description}
            </p>
          </div>

          {/* Footer Stats: Reward 500 VIBE Points & Countdown */}
          <div className="flex items-center justify-between pt-2 border-t border-neutral-800 text-xs">
            <div>
              <span className="text-pink-500 font-bold">Reward: 500</span>
              <span className="text-white font-bold ml-1">VIBE Points</span>
            </div>
            <div className="flex items-center space-x-1 text-neutral-400 font-medium">
              <Clock className="w-3.5 h-3.5 text-pink-500 animate-pulse" />
              <span className="text-white font-bold">{minutesLeft}m left</span>
            </div>
          </div>
        </div>
      )}


      {/* Featured Vibe Orbit Pulse Places */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center space-x-2">
            <Flame className="w-5 h-5 text-orange-400" />
            <span>High-Intensity Vibe Pulses</span>
          </h2>
          <button
            onClick={() => onNavigateTab('explore')}
            className="text-xs text-teal-400 hover:underline flex items-center space-x-1 cursor-pointer"
          >
            <span>View Map</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {places.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {places.slice(0, 4).map((place) => (
              <div
                key={place.id}
                onClick={() => onSelectPlace(place)}
                className="group relative rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 hover:border-teal-500/50 transition cursor-pointer p-3 flex space-x-3"
              >
                <img
                  src={place.image_url}
                  alt={place.title}
                  className="w-20 h-20 rounded-xl object-cover flex-shrink-0 group-hover:scale-105 transition duration-300"
                />
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">{place.category}</span>
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold">+{place.vq_reward} VQ</span>
                    </div>
                    <h3 className="font-bold text-sm text-white truncate mt-0.5">{place.title}</h3>
                    <p className="text-xs text-neutral-400 truncate">{place.address}</p>
                  </div>
                  <div className="flex items-center space-x-1 text-[11px] text-neutral-400">
                    <Sparkles className="w-3 h-3 text-orange-400" />
                    <span>Pulse Level: {place.pulse_intensity}/10</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800/80 p-5 text-center space-y-2">
            <Compass className="w-8 h-8 text-teal-400/60 mx-auto" />
            <h4 className="font-bold text-xs text-white">No active pulses in this sector</h4>
            <p className="text-[11px] text-neutral-400 max-w-xs mx-auto">
              Scan the horizon in Vibe Orbit to detect newly verified district waypoints.
            </p>
          </div>
        )}
      </div>

      {/* Curated Cultural Trails & Vibe Tours (Horizontally Scrollable & Clickable) */}
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
                {/* Hero Image Section */}
                <div className="relative h-40 w-full overflow-hidden bg-neutral-950">
                  <img
                    src={t.imageUrl || t.image_url || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80'}
                    alt={t.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/30 to-transparent" />

                  {/* Top Badges */}
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

                  {/* Bottom Stats Overlay */}
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

                {/* Card Content Body */}
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

      {/* Active Guardians & Local Legends (Horizontally Scrollable) */}
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

      {/* Live Activity Stream */}
      <div className="space-y-3 pt-2">
        <h2 className="text-lg font-bold flex items-center space-x-2">
          <Users className="w-5 h-5 text-teal-400" />
          <span>Live District Activity Feed</span>
        </h2>
        {activities.length > 0 ? (
          <div className="space-y-2">
            {activities.map((act) => (
              <div key={act.id} className="rounded-2xl bg-neutral-900 border border-neutral-800 p-3.5 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2.5">
                  <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                  <div>
                    <span className="font-bold text-white">{act.user_name}</span>{' '}
                    <span className="text-neutral-400">{act.action}</span>{' '}
                    <span className="text-teal-300 font-semibold">{act.target}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-amber-300 font-bold">+{act.vq_earned} VQ</span>
                  <span className="text-[10px] text-neutral-500">{act.time_ago}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800/80 p-5 text-center space-y-2">
            <Users className="w-8 h-8 text-teal-400/60 mx-auto" />
            <h4 className="font-bold text-xs text-white">District pulse is currently calm</h4>
            <p className="text-[11px] text-neutral-400 max-w-xs mx-auto">
              Check in at waypoints or broadcast your vibe to light up the live network feed.
            </p>
          </div>
        )}
      </div>

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

      {/* Create Flash Event Modal */}
      {isCreateFlashOpen && (
        <CreateFlashModal
          user={user}
          onClose={() => setIsCreateFlashOpen(false)}
          onCreated={loadFlash}
          onToast={showToast}
        />
      )}
    </div>
  );
};
