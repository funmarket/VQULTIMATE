import React, { useEffect, useState } from 'react';
import { Sparkles, MapPin, Shield, Compass, ChevronRight, Flame, Award, Users, Zap } from 'lucide-react';
import { fetchGuardians, Guardian } from '../domains/d02_users';
import { fetchVibePlaces, VibePlace } from '../domains/d03_vibe_orbit';
import { fetchCulturalTrails, CulturalTrail } from '../domains/d07_trails';
import { fetchFlashEvent, fetchActivities, FlashEvent, ActivityFeedItem } from '../domains/d10_activities';
import { UserProfile } from '../domains/d01_auth';

interface HomeTabProps {
  user: UserProfile | null;
  onNavigateTab: (tab: any) => void;
  onSelectPlace: (place: VibePlace) => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({ user, onNavigateTab, onSelectPlace }) => {
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [places, setPlaces] = useState<VibePlace[]>([]);
  const [trails, setTrails] = useState<CulturalTrail[]>([]);
  const [flashEvent, setFlashEvent] = useState<FlashEvent | null>(null);
  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);

  useEffect(() => {
    fetchGuardians().then(setGuardians);
    fetchVibePlaces().then(setPlaces);
    fetchCulturalTrails().then(setTrails);
    fetchFlashEvent().then(setFlashEvent);
    fetchActivities().then(setActivities);
  }, []);

  return (
    <div className="space-y-6 pb-24 text-white">
      {/* Flash Event Banner */}
      {flashEvent && (
        <div className="rounded-2xl bg-gradient-to-r from-orange-500/20 via-amber-500/20 to-teal-500/20 border border-orange-500/40 p-4 flex items-center justify-between shadow-xl animate-pulse">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-orange-500/30 text-orange-300">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-black text-xs sm:text-sm text-white">{flashEvent.title}</h4>
              <p className="text-[11px] text-neutral-300">{flashEvent.location} • Ends in {flashEvent.duration_mins}m</p>
            </div>
          </div>
          <span className="text-xs font-black text-amber-300 bg-amber-500/20 px-3 py-1.5 rounded-xl border border-amber-500/40 whitespace-nowrap">
            +{flashEvent.vq_reward} VQ
          </span>
        </div>
      )}

      {/* Hero Welcome Card */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-neutral-900 via-neutral-900/90 to-neutral-950 border border-neutral-800 p-6 shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse" />
              <span className="text-xs uppercase tracking-widest text-teal-300 font-bold">Active District Orbit</span>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 font-medium">
              {user?.role ? user.role.toUpperCase() : 'EXPLORER'}
            </span>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-neutral-200 to-orange-200">
              Welcome back, {user?.full_name || 'Explorer'}
            </h1>
            <p className="text-sm text-neutral-400 mt-1">
              Your Vibe Orbit pulse is synchronized with Supabase PostgreSQL. Explore local legends and capture authentic moments.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => onNavigateTab('explore')}
              className="flex items-center justify-center space-x-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-sm shadow-lg shadow-orange-500/25 transition"
            >
              <Compass className="w-4 h-4" />
              <span>Open Vibe Orbit</span>
            </button>
            <button
              onClick={() => onNavigateTab('share')}
              className="flex items-center justify-center space-x-2 py-3 px-4 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-sm border border-neutral-700 transition"
            >
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span>BeReal Capture</span>
            </button>
          </div>
        </div>
      </div>

      {/* Featured Vibe Orbit Pulse Places */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center space-x-2">
            <Flame className="w-5 h-5 text-orange-400" />
            <span>High-Intensity Vibe Pulses</span>
          </h2>
          <button
            onClick={() => onNavigateTab('explore')}
            className="text-xs text-teal-400 hover:underline flex items-center space-x-1"
          >
            <span>View Map</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

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
      </div>

      {/* District Guardians */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center space-x-2">
            <Shield className="w-5 h-5 text-teal-400" />
            <span>Active Guardians</span>
          </h2>
          <span className="text-xs text-neutral-400">{guardians.length} On Duty</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {guardians.map((g) => (
            <div key={g.id} className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4 flex items-center space-x-3">
              <img src={g.avatar} alt={g.name} className="w-12 h-12 rounded-full object-cover border border-teal-500/30" />
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-sm text-white truncate">{g.name}</h4>
                <p className="text-xs text-neutral-400 truncate">{g.district}</p>
                <div className="flex items-center space-x-1 mt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-emerald-300 font-medium">Trust {g.trustScore}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cultural Trails Preview */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center space-x-2">
            <Award className="w-5 h-5 text-amber-400" />
            <span>Curated Cultural Trails</span>
          </h2>
        </div>

        <div className="space-y-3">
          {trails.map((t) => (
            <div key={t.id} className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4 flex flex-col sm:flex-row gap-4 items-center">
              <img src={t.image_url} alt={t.title} className="w-full sm:w-32 h-24 rounded-xl object-cover" />
              <div className="flex-1 space-y-1 w-full">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
                    {t.difficulty} • {t.duration_mins} mins
                  </span>
                  <span className="text-xs font-bold text-amber-300">Reward: +{t.vq_reward} VQ</span>
                </div>
                <h3 className="font-bold text-white text-base">{t.title}</h3>
                <p className="text-xs text-neutral-400 line-clamp-2">{t.description}</p>
                <div className="flex items-center justify-between pt-2 text-xs text-neutral-400">
                  <span>Curated by {t.guardian_name}</span>
                  <span className="text-teal-400 font-semibold">{t.waypoints_count} Waypoints</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Activity Stream */}
      <div className="space-y-3 pt-2">
        <h2 className="text-lg font-bold flex items-center space-x-2">
          <Users className="w-5 h-5 text-teal-400" />
          <span>Live District Activity Feed</span>
        </h2>
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
      </div>
    </div>
  );
};
