import React, { useState } from 'react';
import { Calendar, Sparkles, MapPin, CheckCircle2, Bookmark, Navigation } from 'lucide-react';
import { UserProfile } from '../domains/d01_auth';

interface EventItem {
  id: string;
  title: string;
  category: string;
  badge: string;
  venue: string;
  host: string;
  location: string;
  timeStatus: string;
  isLive: boolean;
  image: string;
}

const INITIAL_EVENTS: EventItem[] = [
  {
    id: 'ev-1',
    title: 'Rooftop Jazz Night',
    category: 'MUSIC',
    badge: 'LIVE',
    venue: 'The Atlas Rooftop',
    host: 'Atlas Events',
    location: 'Downtown Tunis',
    timeStatus: 'LIVE NOW',
    isLive: true,
    image: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'ev-2',
    title: 'Open Mic at Café Nova',
    category: 'ART & CULTURE',
    badge: 'UPCOMING',
    venue: 'Café Nova',
    host: 'Nova Collective',
    location: 'La Marsa',
    timeStatus: 'Tomorrow, 8:00 PM',
    isLive: false,
    image: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'ev-3',
    title: 'District Synthwave Rooftop Jam',
    category: 'ELECTRONIC',
    badge: 'LIVE',
    venue: 'Neon Citadel',
    host: 'CyberPulse',
    location: 'District 4',
    timeStatus: 'LIVE NOW',
    isLive: true,
    image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'ev-4',
    title: 'Acoustic Sunset Sessions',
    category: 'ACOUSTIC',
    badge: 'UPCOMING',
    venue: 'Marina Bay Deck',
    host: 'Coastal Sounds',
    location: 'Gammarth',
    timeStatus: 'Saturday, 6:30 PM',
    isLive: false,
    image: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=600&q=80'
  }
];

interface HomeEventsSectionProps {
  user: UserProfile | null;
  onNavigateTab: (tab: any) => void;
  onToast: (msg: string) => void;
}

export const HomeEventsSection: React.FC<HomeEventsSectionProps> = ({ user, onNavigateTab, onToast }) => {
  const [filter, setFilter] = useState<'live' | 'upcoming'>('live');
  const [showAll, setShowAll] = useState(false);
  const [rsvps, setRsvps] = useState<Set<string>>(new Set());
  const [saves, setSaves] = useState<Set<string>>(new Set());

  const filtered = INITIAL_EVENTS.filter(ev => filter === 'live' ? ev.isLive : !ev.isLive);
  const visible = showAll ? filtered : filtered.slice(0, 3);

  const handleRsvp = (id: string) => {
    setRsvps(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        onToast('RSVP cancelled.');
      } else {
        next.add(id);
        onToast('RSVP confirmed! Spot saved.');
      }
      return next;
    });
  };

  const handleSave = (id: string) => {
    setSaves(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        onToast('Event removed from saved list.');
      } else {
        next.add(id);
        onToast('Event saved successfully!');
      }
      return next;
    });
  };

  return (
    <div className="space-y-4 pt-2">
      {/* Header */}
      <div className="flex items-center space-x-2.5">
        <div className="p-2 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/40 shadow">
          <Calendar className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h2 className="text-base font-black tracking-wider uppercase text-white">EVENTS</h2>
          <p className="text-[11px] text-neutral-400">Live happenings & what's next</p>
        </div>
      </div>

      {/* Control Bar: Live Events | Upcoming Events | + Create Event */}
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
            <span>Live Events</span>
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
            <Calendar className="w-3.5 h-3.5" />
            <span>Upcoming Events</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!user) {
              onToast('Please sign in to create an event.');
              return;
            }
            onToast('Event creator initiated. Feature governed by D11 entitlement protocol.');
          }}
          className="px-4 py-2 rounded-full bg-gradient-to-r from-teal-500 to-cyan-600 text-neutral-950 font-black text-xs hover:opacity-95 transition cursor-pointer shadow-lg flex-shrink-0"
        >
          + Create Event
        </button>
      </div>

      {/* Cards List */}
      <div className="space-y-3.5">
        {visible.length > 0 ? (
          visible.map(ev => {
            const isRsvped = rsvps.has(ev.id);
            const isSaved = saves.has(ev.id);
            return (
              <div key={ev.id} className="rounded-3xl border border-fuchsia-500/40 bg-gradient-to-br from-[#1b1721] via-[#141219] to-[#0e0c12] p-4 shadow-xl space-y-3.5">
                <div className="flex items-start space-x-3.5">
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-neutral-950 flex-shrink-0 border border-neutral-800 shadow">
                    <img src={ev.image} alt={ev.title} className="w-full h-full object-cover" />
                    {ev.isLive && (
                      <div className="absolute bottom-2 left-2 bg-rose-950/90 text-rose-300 font-black text-[9px] px-2 py-0.5 rounded-full border border-rose-500/50 flex items-center space-x-1 shadow">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                        <span>LIVE</span>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center space-x-2 flex-wrap gap-1">
                      <span className="text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-md bg-purple-950 text-purple-300 border border-purple-500/40">
                        EVENT
                      </span>
                      <span className="text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-md bg-neutral-900 text-neutral-300 border border-neutral-800">
                        {ev.category}
                      </span>
                    </div>
                    <h3 className="text-base font-black text-white truncate tracking-tight">{ev.title}</h3>
                    <p className="text-xs text-neutral-300 truncate">
                      🏢 {ev.venue} • Host: {ev.host}
                    </p>
                    <p className="text-xs text-neutral-400 flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />
                      <span className="truncate">{ev.location} • <span className={ev.isLive ? 'text-teal-400 font-bold' : 'text-amber-400 font-bold'}>{ev.timeStatus}</span></span>
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-800/80 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRsvp(ev.id)}
                    className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs transition cursor-pointer shadow flex items-center justify-center space-x-1.5 ${
                      isRsvped
                        ? 'bg-teal-500 text-neutral-950 border border-teal-300'
                        : 'bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/50'
                    }`}
                  >
                    {isRsvped ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
                    <span>{isRsvped ? 'RSVP Confirmed' : 'RSVP'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSave(ev.id)}
                    className={`py-2.5 px-4 rounded-xl font-bold text-xs transition cursor-pointer border flex items-center space-x-1.5 ${
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
                      onToast(`Opening directions to ${ev.venue}...`);
                      onNavigateTab('explore');
                    }}
                    className="py-2.5 px-4 rounded-xl font-bold text-xs bg-neutral-900 hover:bg-neutral-800 text-cyan-300 border border-neutral-700 transition cursor-pointer flex items-center space-x-1.5 shadow"
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
            <Calendar className="w-7 h-7 text-purple-400 mx-auto" />
            <h4 className="font-bold text-xs text-white">No {filter} events right now</h4>
            <p className="text-[11px] text-neutral-400">Check back soon or spawn a new flash event.</p>
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
    </div>
  );
};
