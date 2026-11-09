import React, { useState } from 'react';
import { Footprints, MapPin, Bookmark, Navigation, Sparkles } from 'lucide-react';
import { UserProfile } from '../domains/d01_auth';
import { CreateActivityModal } from './CreateActivityModal';

interface ActivityItem {
  id: string;
  title: string;
  category: string;
  badge: string;
  location: string;
  author: string;
  tagline: string;
  isLive: boolean;
  image: string;
}

const INITIAL_ACTIVITIES: ActivityItem[] = [
  {
    id: 'act-1',
    title: 'Sunset Coastal Walk',
    category: 'OUTDOORS',
    badge: 'LIVE',
    location: 'Sidi Bou Said',
    author: 'VibeQuest Explorers',
    tagline: 'Casual walk • LIVE',
    isLive: true,
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'act-2',
    title: 'Pottery Workshop',
    category: 'CREATIVE',
    badge: 'UPCOMING',
    location: 'Carthage',
    author: 'Artisans Hub',
    tagline: 'Hands-on • Now, 4:00 PM',
    isLive: false,
    image: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'act-3',
    title: 'Neon District Night Photo Walk',
    category: 'PHOTOGRAPHY',
    badge: 'LIVE',
    location: 'Medina Quarter',
    author: 'NightLens',
    tagline: 'Urban exploration • LIVE',
    isLive: true,
    image: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'act-4',
    title: 'Cybernetic Ceramic Sculpting',
    category: 'CRAFT',
    badge: 'UPCOMING',
    location: 'Maker Space 9',
    author: 'Form & Code',
    tagline: 'Saturday, 2:00 PM',
    isLive: false,
    image: 'https://images.unsplash.com/photo-1493106819501-66d381c46541?auto=format&fit=crop&w=600&q=80'
  }
];

interface HomeActivitiesSectionProps {
  user: UserProfile | null;
  onNavigateTab: (tab: any) => void;
  onToast: (msg: string) => void;
}

export const HomeActivitiesSection: React.FC<HomeActivitiesSectionProps> = ({ user, onNavigateTab, onToast }) => {
  const [activities, setActivities] = useState<ActivityItem[]>(INITIAL_ACTIVITIES);
  const [filter, setFilter] = useState<'live' | 'upcoming'>('live');
  const [showAll, setShowAll] = useState(false);
  const [saves, setSaves] = useState<Set<string>>(new Set());
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const filtered = activities.filter(act => filter === 'live' ? act.isLive : !act.isLive);
  const visible = showAll ? filtered : filtered.slice(0, 3);

  const handleSave = (id: string) => {
    setSaves(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        onToast('Activity removed from saved list.');
      } else {
        next.add(id);
        onToast('Activity saved successfully!');
      }
      return next;
    });
  };

  const handleCreatedActivity = (newAct: ActivityItem) => {
    setActivities(prev => [newAct, ...prev]);
    if (newAct.isLive) {
      setFilter('live');
    } else {
      setFilter('upcoming');
    }
  };

  return (
    <div className="space-y-4 pt-2">
      {/* Header */}
      <div className="flex items-center space-x-2.5">
        <div className="p-2 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/40 shadow">
          <Footprints className="w-5 h-5 text-teal-400" />
        </div>
        <div>
          <h2 className="text-base font-black tracking-wider uppercase text-white">ACTIVITIES</h2>
          <p className="text-[11px] text-neutral-400">Things to do, now or later</p>
        </div>
      </div>

      {/* Control Bar: Live Activities | Upcoming Activities | + Create Activity */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => { setFilter('live'); setShowAll(false); }}
            className={`px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${
              filter === 'live'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/60 shadow-md'
                : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span>Live Activities</span>
          </button>

          <button
            type="button"
            onClick={() => { setFilter('upcoming'); setShowAll(false); }}
            className={`px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${
              filter === 'upcoming'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/60 shadow-md'
                : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            <Footprints className="w-3.5 h-3.5" />
            <span>Upcoming Activities</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!user) {
              onToast('Please sign in to create an activity.');
              return;
            }
            setIsCreateOpen(true);
          }}
          className="px-4 py-2 rounded-full bg-gradient-to-r from-teal-500 to-cyan-600 text-neutral-950 font-black text-xs hover:opacity-95 transition cursor-pointer shadow-lg flex-shrink-0"
        >
          + Create Activity
        </button>
      </div>

      {/* Cards List */}
      <div className="space-y-3.5">
        {visible.length > 0 ? (
          visible.map(act => {
            const isSaved = saves.has(act.id);
            return (
              <div key={act.id} className="rounded-3xl border border-fuchsia-500/40 bg-gradient-to-br from-[#1b1721] via-[#141219] to-[#0e0c12] p-4 shadow-xl space-y-3.5">
                <div className="flex items-start space-x-3.5">
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-neutral-950 flex-shrink-0 border border-neutral-800 shadow">
                    <img src={act.image} alt={act.title} className="w-full h-full object-cover" />
                    {act.isLive && (
                      <div className="absolute bottom-2 left-2 bg-teal-950/90 text-teal-300 font-black text-[9px] px-2 py-0.5 rounded-full border border-teal-500/50 flex items-center space-x-1 shadow">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                        <span>LIVE</span>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center space-x-2 flex-wrap gap-1">
                      <span className="text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-md bg-teal-950 text-teal-300 border border-teal-500/40">
                        ACTIVITY
                      </span>
                      <span className="text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-md bg-neutral-900 text-neutral-300 border border-neutral-800">
                        {act.category}
                      </span>
                    </div>
                    <h3 className="text-base font-black text-white truncate tracking-tight">{act.title}</h3>
                    <p className="text-xs text-neutral-300 flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />
                      <span className="truncate">{act.location} • By: {act.author}</span>
                    </p>
                    <p className="text-xs text-neutral-400">
                      👥 <span className={act.isLive ? 'text-teal-400 font-bold' : 'text-amber-400 font-bold'}>{act.tagline}</span>
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-800/80 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSave(act.id)}
                    className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs transition cursor-pointer border flex items-center justify-center space-x-1.5 shadow ${
                      isSaved
                        ? 'bg-purple-900/60 text-purple-200 border-purple-500'
                        : 'bg-neutral-900 text-neutral-300 border-neutral-700 hover:bg-neutral-800'
                    }`}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-purple-300' : ''}`} />
                    <span>{isSaved ? 'Saved' : 'Save'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onToast(`Opening directions to ${act.location}...`);
                      onNavigateTab('explore');
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs bg-neutral-900 hover:bg-neutral-800 text-cyan-300 border border-neutral-700 transition cursor-pointer flex items-center justify-center space-x-1.5 shadow"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Directions</span>
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800 p-6 text-center space-y-2">
            <Footprints className="w-7 h-7 text-teal-400 mx-auto" />
            <h4 className="font-bold text-xs text-white">No {filter} activities right now</h4>
            <p className="text-[11px] text-neutral-400">Explore district waypoints or create a new gathering.</p>
          </div>
        )}

        {filtered.length > 3 && (
          <div className="text-center pt-1 pb-2">
            <button
              type="button"
              onClick={() => setShowAll(v => !v)}
              className="px-5 py-2.5 rounded-2xl bg-neutral-900 border border-neutral-700 text-xs font-bold text-teal-400 hover:bg-neutral-800 transition cursor-pointer shadow-lg"
            >
              {showAll ? 'Show Less' : `View All (${filtered.length})`}
            </button>
          </div>
        )}
      </div>

      {isCreateOpen && (
        <CreateActivityModal
          user={user}
          onClose={() => setIsCreateOpen(false)}
          onCreated={handleCreatedActivity}
          onToast={onToast}
        />
      )}
    </div>
  );
};
