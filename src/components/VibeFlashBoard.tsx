/**
 * Vibe Flash Board Component
 * Fixed against page flicker: 60000ms timer solely for minute refresh, primitive coordinate deps,
 * strict 2-cards-visible horizontal scroll layout with scroll-snap and scroll chevrons.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Zap, MapPin, ChevronRight, Compass, Plus, Sparkles, ChevronLeft, Camera } from 'lucide-react';
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
    <div className="rounded-[28px] border border-fuchsia-500/40 bg-gradient-to-br from-[#1a1224] via-[#14101c] to-[#120f18] p-4 sm:p-5 shadow-2xl text-white space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-fuchsia-500/20 border border-fuchsia-500/40 flex items-center justify-center text-fuchsia-400 shadow-inner">
            <Zap className="w-5 h-5 fill-fuchsia-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black tracking-tight text-white">
                ⚡ VIBE FLASH BOARD
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40 text-[10px] font-black uppercase tracking-wider">
                {flashes.length} Active
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Live secrets, after-hours, & meetups starting ≤ 60m
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {flashes.length > 2 && (
            <div className="hidden sm:flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-xl p-1">
              <button
                type="button"
                onClick={scrollLeft}
                className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white flex items-center justify-center transition cursor-pointer"
                title="Scroll Left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={scrollRight}
                className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white flex items-center justify-center transition cursor-pointer"
                title="Scroll Right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleCreateClick}
            className="px-3.5 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-black text-xs uppercase tracking-wider transition shadow-lg shadow-fuchsia-600/30 flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create Flash</span>
          </button>
        </div>
      </div>

      {/* Flashes Carousel: Strict 2-cards-visible horizontal scroll */}
      {loading ? (
        <div className="py-8 text-center text-xs text-neutral-400">Scanning for active vibe flashes...</div>
      ) : flashes.length === 0 ? (
        <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800 p-6 text-center space-y-2">
          <Compass className="w-8 h-8 text-fuchsia-400/60 mx-auto animate-spin-slow" />
          <h4 className="font-bold text-sm text-white">No active vibe flashes nearby</h4>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            Be the first local explorer to drop an after-hours secret or launch a pop-up meetup!
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <div
            ref={scrollContainerRef}
            className="flex flex-nowrap gap-3 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-thin scrollbar-thumb-fuchsia-500/30 scrollbar-track-transparent"
            style={{ scrollbarWidth: 'thin' }}
          >
            {flashes.map((item) => {
              const isLive = new Date(item.starts_at).getTime() <= Date.now();
              const timeLabel = isLive
                ? '⚡ LIVE NOW'
                : `🚀 Starts in ${Math.ceil((new Date(item.starts_at).getTime() - Date.now()) / 60000)}m`;

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedFlash(item)}
                  className="w-[calc(50%-6px)] min-w-[calc(50%-6px)] max-w-[calc(50%-6px)] shrink-0 snap-start rounded-2xl border border-neutral-800/90 bg-neutral-950/90 hover:border-fuchsia-500/50 p-3.5 transition cursor-pointer flex flex-col justify-between space-y-3 group shadow-md"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border truncate max-w-[120px] ${
                        item.kind === 'meetup_flash'
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                          : 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40'
                      }`}>
                        {item.kind === 'meetup_flash' ? '👥 Meetup' : item.vibe_type}
                      </span>
                      <div className="flex items-center gap-1">
                        {item.photo_url && (
                          <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 text-[9px] font-bold flex items-center gap-0.5">
                            <Camera className="w-2.5 h-2.5" />
                            <span>Photo</span>
                          </span>
                        )}
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${
                          isLive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-neutral-900 text-neutral-300'
                        }`}>
                          {timeLabel}
                        </span>
                      </div>
                    </div>
                    <h4 className="text-xs font-black text-white group-hover:text-fuchsia-300 transition line-clamp-1">
                      {item.title}
                    </h4>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-2 border-t border-neutral-900">
                    <div className="flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 text-orange-400 shrink-0" />
                      <span className="truncate">{item.venue_name}</span>
                    </div>
                    <div className="flex items-center gap-1 text-fuchsia-400 font-bold shrink-0">
                      <span>🔥 {item.going_ids.length}/{item.max_capacity}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {flashes.length > 2 && (
            <div className="text-right text-[10px] text-neutral-400 pr-1">
              Swipe ({flashes.length}) →
            </div>
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
