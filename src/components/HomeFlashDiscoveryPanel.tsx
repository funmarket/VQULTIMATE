import React from 'react';
import { CalendarDays, Compass, Flame, MapPin, Sparkles, Users, Clock } from 'lucide-react';
import { FlashEvent } from '../domains/d11_events';
import { VibePlace } from '../domains/d03_vibe_orbit';
import { CityPulse, VibePulsesSummary } from '../domains/d04_geo_presence';

interface HomeFlashDiscoveryPanelProps {
  flashEvent: FlashEvent | null;
  secondsLeft: number;
  places: VibePlace[];
  pulsesSummary: VibePulsesSummary;
  onCreateFlash: () => void;
  onNavigateTab: (tab: 'explore' | 'vibe') => void;
  onSelectPlace: (place: VibePlace) => void;
  onNotify: (message: string) => void;
  onSuggestVibe: () => void;
  onRsvp: () => void;
  rsvpEnabled: boolean;
  suggestionEnabled: boolean;
  rsvpJoined: boolean;
  rsvpLoading: boolean;
}

const shell = 'rounded-[30px] border border-fuchsia-500/55 bg-gradient-to-br from-[#1b1920] via-[#19171e] to-[#17151c] p-4 sm:p-5 shadow-[0_10px_32px_rgba(0,0,0,0.45)] space-y-5 overflow-hidden';
const whiteAction = 'min-w-0 flex-1 rounded-[22px] bg-white px-3 py-3.5 text-xs sm:text-sm font-black text-neutral-950 shadow-xl hover:bg-neutral-200 active:scale-[0.98] transition';
const outlinedAction = 'min-w-0 flex-1 rounded-[22px] border border-neutral-500 bg-[#26232b] px-3 py-3.5 text-xs sm:text-sm font-black text-neutral-200 hover:bg-neutral-700/50 active:scale-[0.98] transition';
const thumbnail = 'relative aspect-square min-w-0 overflow-hidden rounded-2xl border border-fuchsia-500/50 bg-gradient-to-br from-[#302139] to-[#18151e]';

function Photo({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  return <img src={src} alt={alt} loading="lazy" className={`absolute inset-0 h-full w-full object-cover ${className}`} />;
}

export const HomeFlashDiscoveryPanel: React.FC<HomeFlashDiscoveryPanelProps> = ({
  flashEvent, secondsLeft, places, pulsesSummary, onCreateFlash, onNavigateTab, onSelectPlace, onNotify,
  onSuggestVibe, onRsvp, rsvpEnabled, suggestionEnabled, rsvpJoined, rsvpLoading
}) => {
  const hasActiveFlash = Boolean(flashEvent && secondsLeft > 0);
  const picturePlaces = places.filter(place => Boolean(place.image_url));
  const realCities = pulsesSummary.cities.filter(city => Boolean(city.imageUrl));
  const suggestions = [
    ...picturePlaces.map(place => ({ id: 'place:' + place.id, kind: 'place' as const, title: place.title, image: place.image_url, place })),
    ...realCities.map(city => ({ id: 'city:' + city.id, kind: 'city' as const, title: city.city, image: city.imageUrl, city }))
  ];
  const hero = suggestions[0];
  const more = suggestions.filter(item => item.id !== hero?.id).slice(0, 4);
  const eventPlace = hasActiveFlash ? places.find(place => place.id === flashEvent?.place_id) : undefined;
  const eventPhoto = eventPlace?.image_url || '';
  const timeLeft = Math.max(0, Math.ceil(secondsLeft / 60));

  const openSuggestion = (item: typeof suggestions[number]) => {
    if (item.kind === 'place') onSelectPlace(item.place);
    else if (item.city.placeData) onSelectPlace(item.city.placeData);
    else onNavigateTab('explore');
  };

  const hunt = () => {
    if (eventPlace) onSelectPlace(eventPlace);
    else onNotify('This Flash Event has no available place destination yet.');
  };

  const frameHeading = (title: string, detail: string) => (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-pink-500/70 bg-pink-500/10 text-amber-400">
          <Sparkles className="h-5 w-5" />
        </span>
        <h2 className="text-xl sm:text-2xl font-black leading-tight tracking-tight text-white">{title}</h2>
      </div>
      <span className="shrink-0 rounded-full border border-pink-500/50 bg-pink-500/10 px-3 py-1.5 text-[9px] sm:text-[10px] font-black tracking-wide text-pink-400">{detail}</span>
    </div>
  );

  if (hasActiveFlash && flashEvent) {
    return (
      <section className={shell} aria-label="Flash Event Alert">
        {frameHeading('Flash Event Alert!', 'LIMITED DROP')}
        <div className="flex gap-2.5">
          <button type="button" onClick={hunt} className={whiteAction}>HUNT NOW! ↗</button>
          <button type="button" onClick={onCreateFlash} className={outlinedAction}>+ CREATE FLASH</button>
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-black text-white">{flashEvent.title}</h3>
          <p className="text-sm leading-relaxed text-neutral-300">{flashEvent.description || 'Event details are not available yet.'}</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button type="button" onClick={hunt} className="rounded-2xl border border-neutral-700 bg-[#27232c] px-1 py-3 text-center">
            <span className="block text-sm font-black text-amber-400">HUNT</span>
            <span className="mt-2 block border-t border-neutral-600 pt-2 text-[9px] font-bold text-neutral-200">JOIN THE QUEST</span>
          </button>
          <button type="button" onClick={onRsvp} disabled={!rsvpEnabled || rsvpLoading}
            aria-label={!rsvpEnabled ? 'RSVP unavailable' : rsvpJoined ? 'Cancel RSVP' : 'Save your spot'}
            className="rounded-2xl border border-neutral-700 bg-[#27232c] px-1 py-3 text-center disabled:cursor-not-allowed disabled:opacity-75">
            <span className="block text-sm font-black text-cyan-400">RSVP</span>
            <span className="mt-2 block border-t border-neutral-600 pt-2 text-[9px] font-bold text-neutral-200">
              {!rsvpEnabled ? 'Not available yet' : rsvpLoading ? 'PLEASE WAIT' : rsvpJoined ? 'CANCEL RSVP' : 'SAVE YOUR SPOT'}
            </span>
          </button>
          <div className="rounded-2xl border border-neutral-700 bg-[#27232c] px-1 py-3 text-center" aria-label="Rewards not configured">
            <span className="block text-sm font-black text-pink-400">REWARDS</span>
            <span className="mt-2 block border-t border-neutral-600 pt-2 text-[9px] font-bold text-neutral-400">Not configured</span>
          </div>
        </div>
        <div className="relative h-52 overflow-hidden rounded-2xl border border-fuchsia-500/70 bg-gradient-to-br from-violet-950 via-neutral-900 to-pink-950">
          {eventPhoto ? <Photo src={eventPhoto} alt={eventPlace?.title || flashEvent.title} /> : (
            <div className="absolute inset-0 flex items-center justify-center gap-2 text-xs font-bold text-neutral-300"><Sparkles className="h-5 w-5 text-fuchsia-400" /> Event photo unavailable</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/45 pointer-events-none" />
          <div className="absolute left-3 top-3 right-3">
            <span className="inline-block rounded-full bg-fuchsia-900/90 px-3 py-1 text-[10px] font-bold text-white">FLASH EVENT</span>
            <div className="mt-2 text-lg font-black text-white">{flashEvent.title}</div>
          </div>
          <div className="absolute bottom-3 right-3 rounded-xl border border-amber-500 bg-neutral-950/90 px-3 py-2 text-xs font-black text-amber-300">
            <Clock className="mr-1 inline h-3.5 w-3.5" /> {timeLeft} MIN LEFT
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-black text-white">MORE FLASH EVENTS</h3>
          <span className="text-xs font-bold text-neutral-500">SEE ALL — SOON</span>
        </div>
        <div className="grid grid-cols-4 gap-2" aria-label="More Flash Events are not available yet">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className={thumbnail} aria-hidden="true">
              <div className="flex h-full items-center justify-center"><Sparkles className="h-4 w-4 text-neutral-600" /></div>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-neutral-400">Discover the drop. Catch the moment.</p>
        <p className="text-center text-[10px] font-black tracking-widest text-pink-400">VIBEQUEST · FLASH EVENTS</p>
      </section>
    );
  }

  return (
    <section className={shell} aria-label="Vibe Suggestions">
      {frameHeading('Vibe Suggestions', 'FOR YOU')}
      <div className="flex gap-2.5">
        <button type="button" onClick={() => onNavigateTab('explore')} className={whiteAction}>EXPLORE NOW! ↗</button>
        <button type="button" onClick={onSuggestVibe} disabled={!suggestionEnabled} aria-label={!suggestionEnabled ? 'Suggestion submissions are not available yet' : 'Suggest Vibe'} className={outlinedAction + ' disabled:opacity-60 disabled:cursor-not-allowed'}>+ SUGGEST VIBE</button>
      </div>
      <div className="space-y-1.5">
        <h3 className="text-lg font-black text-white">Curated for You</h3>
        <p className="text-xs sm:text-sm leading-relaxed text-neutral-300">
          Places, events, and moments matching your vibe, location, and what's trending right now.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <button type="button" onClick={() => onNavigateTab('explore')} className="min-w-0 rounded-2xl border border-neutral-700 bg-[#29252d] p-2 text-center">
          <span className="block text-sm font-black text-amber-400"><MapPin className="mx-auto mb-1 h-4 w-4" /> PLACES</span>
          <span className="mt-2 block border-t border-neutral-600 pt-2 text-[9px] font-bold text-neutral-200">SPOTS NEAR YOU</span>
        </button>
        <div className="min-w-0 rounded-2xl border border-neutral-700 bg-[#29252d] p-2 text-center" aria-label="Events discovery not available yet">
          <span className="block text-sm font-black text-cyan-400"><CalendarDays className="mx-auto mb-1 h-4 w-4" /> EVENTS</span>
          <span className="mt-2 block border-t border-neutral-600 pt-2 text-[9px] font-bold text-neutral-400">HAPPENING SOON</span>
        </div>
        <button type="button" onClick={() => onNavigateTab('vibe')} className="min-w-0 rounded-2xl border border-neutral-700 bg-[#29252d] p-2 text-center">
          <span className="block text-sm font-black text-pink-400"><Flame className="mx-auto mb-1 h-4 w-4" /> VIBES</span>
          <span className="mt-2 block border-t border-neutral-600 pt-2 text-[9px] font-bold text-neutral-200">TRENDING NOW</span>
        </button>
      </div>

      <div className="relative h-56 overflow-hidden rounded-2xl border border-fuchsia-500/80 bg-gradient-to-br from-fuchsia-950 via-neutral-900 to-blue-950 shadow-[0_0_16px_rgba(217,70,239,0.12)]">
        {hero ? (
          <>
            <Photo src={hero.image} alt={hero.title} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/50 pointer-events-none" />
            <button type="button" onClick={() => openSuggestion(hero)} className="absolute inset-0 flex flex-col items-start p-4 text-left text-white">
              <span className="rounded-full bg-fuchsia-900/90 px-3 py-1 text-[10px] font-bold">SUGGESTED VIBE</span>
              <span className="mt-2 text-xl font-black">{hero.title}</span>
              {hero.kind === 'place' && <span className="mt-1 text-xs text-neutral-200"><MapPin className="mr-1 inline h-3.5 w-3.5 text-amber-400" /> {hero.place.address}</span>}
              <span className="mt-auto rounded-xl border border-cyan-400/60 bg-neutral-950/75 px-3 py-2 text-[10px] font-bold text-cyan-300">VIEW DETAILS</span>
            </button>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-neutral-300">
            <Sparkles className="h-7 w-7 text-fuchsia-400" />
            <span className="text-sm font-bold">No suggestions available yet</span>
            <button type="button" onClick={() => onNavigateTab('explore')} className="text-xs font-bold text-cyan-300">Explore places</button>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-black text-white">MORE SUGGESTIONS</h3>
        <button type="button" onClick={() => onNavigateTab('explore')} className="text-xs font-black text-cyan-400">SEE ALL ›</button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }, (_, i) => {
          const item = more[i];
          return item ? (
            <button type="button" key={item.id} className={thumbnail} onClick={() => openSuggestion(item)} aria-label={`View ${item.title}`}>
              <Photo src={item.image} alt={item.title} />
            </button>
          ) : (
            <div key={'empty-' + i} className={thumbnail} aria-label="Suggestion photo unavailable">
              <div className="flex h-full items-center justify-center"><Sparkles className="h-4 w-4 text-neutral-600" /></div>
            </div>
          );
        })}
      </div>
      <p className="text-center text-xs text-neutral-300">Explore. Join. Discover new vibes around you.</p>
      <p className="text-center text-[10px] font-black tracking-widest text-pink-400">VIBEQUEST · SUGGESTIONS</p>
    </section>
  );
};
