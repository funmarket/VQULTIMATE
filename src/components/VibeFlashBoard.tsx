/**
 * Vibe Flash Board Component
 * Fixed against page flicker: 60000ms timer solely for minute refresh, primitive coordinate deps,
 * strict 2-cards-visible horizontal scroll layout with scroll-snap and scroll chevrons.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Zap, MapPin, ChevronRight, Plus, Sparkles, ChevronLeft, Camera } from 'lucide-react';
import { VibeFlashItem } from '../domains/d13_vibe_flash/types';
import { fetchActiveVibeFlashes, subscribeToVibeFlashes } from '../domains/d13_vibe_flash/api';
import { VibeFlashDetailModal } from './VibeFlashDetailModal';
import { CreateVibeFlashModal } from './CreateVibeFlashModal';
import { useUser } from '../contexts/UserContext';

interface VibeFlashBoardProps {
  userCoords?: { lat: number; lng: number };
  onRequireAuth?: () => void;
  onToast?: (msg: string) => void;
}

export const VibeFlashBoard: React.FC<VibeFlashBoardProps> = ({
  userCoords,
  onRequireAuth,
  onToast
}) => {
  const { user } = useUser();
  const [flashes, setFlashes] = useState<VibeFlashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFlash, setSelectedFlash] = useState<VibeFlashItem | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [, setNowMs] = useState<number>(() => Date.now());

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Primitive coordinates for stable effect dependencies
  const userLat = userCoords?.lat;
  const userLng = userCoords?.lng;

  const loadFlashes = async () => {
    const items = await fetchActiveVibeFlashes(userLat !== undefined && userLng !== undefined ? { lat: userLat, lng: userLng } : undefined);
    setFlashes(items);
    setLoading(false);
  };

  useEffect(() => {
    void loadFlashes();
    const unsubscribe = subscribeToVibeFlashes(() => {
      void loadFlashes();
    });
    return () => unsubscribe();
  }, [userLat, userLng]);

  // 1-minute (60000ms) interval solely for wall-clock time display refresh (NO network fetch or parent re-render strobe)
  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const handleCreateClick = () => {
    if (!user) {
      if (onRequireAuth) onRequireAuth();
      return;
    }
    setIsCreateOpen(true);
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -260, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 260, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-4 overflow-hidden rounded-[28px] border border-fuchsia-500/45 bg-[radial-gradient(ellipse_at_95%_0%,#321337_0%,#1b1023_48%,#120e19_100%)] p-4 text-white shadow-[0_12px_36px_rgba(0,0,0,0.5)] sm:p-5">
      {/* Keep the active count attached to the board title on all screen sizes. */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-fuchsia-500/40 bg-fuchsia-500/20 text-fuchsia-300">
            <Zap className="h-5 w-5 fill-fuchsia-400" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-black leading-tight tracking-tight text-white sm:text-base">⚡ VIBE FLASH BOARD</h3>
            <p className="mt-1 text-[11px] text-neutral-400">Live secrets, after-hours &amp; meetups starting ≤ 60m</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-fuchsia-500/40 bg-fuchsia-500/15 px-2.5 py-1 text-[10px] font-black uppercase text-fuchsia-200">
          {flashes.length} Active
        </span>
      </div>

      {/* Existing Create Flash action and authentication flow remain unchanged. */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleCreateClick}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 px-4 py-3 text-[11px] font-black uppercase text-white shadow-[0_6px_22px_rgba(217,0,233,0.27)] transition hover:brightness-110 active:scale-[0.98] sm:text-xs"
        >
          <Plus className="h-4 w-4" />
          Create Flash
        </button>
        <p className="min-w-0 text-[11px] leading-relaxed text-neutral-400">
          Make something happen.<br />Bring your crew together.
        </p>
        {flashes.length > 2 && (
          <div className="ml-auto hidden shrink-0 items-center gap-1 rounded-xl border border-neutral-800 bg-neutral-900 p-1 sm:flex">
            <button type="button" onClick={scrollLeft} aria-label="Previous flashes" className="rounded-lg bg-neutral-800 p-2 hover:bg-neutral-700">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" onClick={scrollRight} aria-label="Next flashes" className="rounded-lg bg-neutral-800 p-2 hover:bg-neutral-700">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-neutral-950/60 px-4 py-10 text-center text-xs text-neutral-400" role="status">
          Scanning for active vibe flashes...
        </div>
      ) : flashes.length === 0 ? (
        <div className="relative isolate min-h-[215px] overflow-hidden rounded-[22px] border border-fuchsia-500/35 bg-[linear-gradient(115deg,#38133e,#15101c_75%)] sm:min-h-[230px]">
          {/* Decorative photograph only: never represent this image as an active event. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-cover bg-center opacity-75"
            style={{ backgroundImage: "url('https://images.pexels.com/photos/30592863/pexels-photo-30592863.jpeg?auto=compress&cs=tinysrgb&w=1200')" }}
          />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-fuchsia-950/20 via-[#1a1021]/80 to-[#17101d]/98 sm:from-fuchsia-950/15 sm:via-[#1a1021]/65" />
          <div aria-hidden="true" className="absolute -left-10 -bottom-20 h-40 w-56 rounded-full bg-fuchsia-600/30 blur-3xl" />
          <div className="relative z-10 flex min-h-[215px] flex-col items-center justify-center gap-3 px-4 py-6 text-center sm:ml-auto sm:min-h-[230px] sm:w-[65%] sm:items-start sm:px-7 sm:text-left">
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-fuchsia-400/60 bg-fuchsia-500/20 text-fuchsia-200 shadow-[0_0_24px_rgba(232,60,238,0.25)]">
              <Sparkles className="h-6 w-6" />
            </span>
            <h4 className="text-lg font-black leading-tight text-white sm:text-xl">No active vibe flashes nearby</h4>
            <p className="max-w-sm text-xs leading-relaxed text-neutral-200 sm:text-sm">
              Be the first local explorer to drop an after-hours secret or launch a pop-up meetup!
            </p>
            <p className="text-xs font-semibold italic text-fuchsia-200">Your city is waiting for the next vibe.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Exactly two cards visible; keep the existing horizontal swipe carousel. */}
          <div
            ref={scrollContainerRef}
            className="flex snap-x snap-mandatory flex-nowrap gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-fuchsia-500/30"
            style={{ scrollbarWidth: 'thin' }}
          >
            {flashes.map((item) => {
              const isLive = new Date(item.starts_at).getTime() <= Date.now();
              const timeLabel = isLive
                ? '⚡ LIVE NOW'
                : '🚀 Starts in ' + Math.ceil((new Date(item.starts_at).getTime() - Date.now()) / 60000) + 'm';
              const isMeetup = item.kind === 'meetup_flash';
              const image = item.photo_url || item.photos?.[0];
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setSelectedFlash(item)}
                  aria-label={'View Flash: ' + item.title}
                  className="group flex w-[calc(50%-6px)] min-w-[calc(50%-6px)] max-w-[calc(50%-6px)] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-neutral-700/80 bg-[#161219] text-left shadow-md transition hover:border-fuchsia-400/65 focus-visible:outline focus-visible:outline-2 focus-visible:outline-fuchsia-400"
                >
                  <div className="relative h-[104px] w-full overflow-hidden bg-gradient-to-br from-fuchsia-800/75 via-[#2b1640] to-[#17121e] sm:h-[128px]">
                    {image ? (
                      <img src={image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <svg aria-hidden="true" className="absolute inset-0 h-full w-full" viewBox="0 0 320 140" preserveAspectRatio="xMidYMid slice">
                        <defs>
                          <linearGradient id={isMeetup ? 'flash-meetup-sky' : 'flash-party-sky'} x1="0" x2="1" y1="0" y2="1">
                            <stop stopColor={isMeetup ? '#184750' : '#76237f'} />
                            <stop offset="1" stopColor="#130c25" />
                          </linearGradient>
                        </defs>
                        <rect width="320" height="140" fill={isMeetup ? 'url(#flash-meetup-sky)' : 'url(#flash-party-sky)'} />
                        {isMeetup ? (
                          <>
                            <circle cx="260" cy="25" r="45" fill="#ffba68" opacity=".75" />
                            <path d="M0 115L55 75L95 92L155 38L203 68L238 49L320 85V140H0Z" fill="#103640" />
                            <path d="M0 129L74 107L132 120L209 82L260 114L320 93V140H0Z" fill="#20102b" />
                          </>
                        ) : (
                          <>
                            <path d="M25 0L135 140H0Z M230 0L320 120L100 140Z" fill="#fb70ed" opacity=".23" />
                            <circle cx="176" cy="32" r="27" fill="#e98cff" opacity=".22" />
                            <path d="M0 130Q55 85 110 125T220 126T320 120V140H0Z" fill="#130c1b" />
                          </>
                        )}
                      </svg>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10" />
                    <div className="absolute left-2 top-2 right-2 flex flex-wrap items-start gap-1">
                      <span className={isMeetup
                        ? 'max-w-full truncate rounded-md border border-sky-500/50 bg-sky-950/90 px-1.5 py-1 text-[9px] font-black uppercase text-sky-200'
                        : 'max-w-full truncate rounded-md border border-fuchsia-500/50 bg-fuchsia-950/90 px-1.5 py-1 text-[9px] font-black uppercase text-fuchsia-200'
                      }>
                        {isMeetup ? '👥 VENUE MEETUP' : item.vibe_type}
                      </span>
                      {image && (
                        <span className="flex items-center gap-1 rounded-md bg-neutral-950/80 px-1.5 py-1 text-[9px] font-bold text-neutral-200">
                          <Camera className="h-3 w-3" /> Photo
                        </span>
                      )}
                      <span className={isLive
                        ? 'rounded-md border border-emerald-500/40 bg-emerald-950/90 px-1.5 py-1 text-[9px] font-black text-emerald-300'
                        : 'rounded-md bg-neutral-950/85 px-1.5 py-1 text-[9px] font-black text-neutral-200'
                      }>
                        {timeLabel}
                      </span>
                    </div>
                  </div>
                  <div className="flex w-full min-w-0 flex-1 flex-col gap-3 p-3">
                    <h4 className="line-clamp-2 min-h-[1.25em] text-sm font-black leading-tight text-white transition group-hover:text-fuchsia-200 sm:text-base">
                      {item.title}
                    </h4>
                    <div className="mt-auto flex min-w-0 items-center justify-between gap-1 border-t border-neutral-800 pt-2 text-[10px] sm:text-[11px]">
                      <span className="flex min-w-0 items-center gap-1 text-neutral-400">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                        <span className="truncate">{item.venue_name}</span>
                      </span>
                      <span className="shrink-0 font-black text-fuchsia-300">🔥 {item.going_ids.length}/{item.max_capacity}</span>
                      <ChevronRight className="h-3 w-3 shrink-0 text-fuchsia-300" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {flashes.length > 2 && (
            <p className="pr-1 text-right text-[10px] text-neutral-400">Swipe ({flashes.length}) →</p>
          )}
        </div>
      )}

      {/* Modals */}
      {selectedFlash && (
        <VibeFlashDetailModal
          flash={selectedFlash}
          isOpen={Boolean(selectedFlash)}
          onClose={() => setSelectedFlash(null)}
          onRequireAuth={onRequireAuth}
          onToast={onToast}
        />
      )}

      {isCreateOpen && (
        <CreateVibeFlashModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onCreated={() => {
            setIsCreateOpen(false);
            void loadFlashes();
            if (onToast) onToast('⚡ Vibe Flash published successfully!');
          }}
          onRequireAuth={onRequireAuth}
        />
      )}
    </div>
  );
};
