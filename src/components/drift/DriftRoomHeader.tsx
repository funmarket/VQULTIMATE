import React, { useState } from 'react';
import { ChevronLeft, Users, MoreVertical, Wine, Clock, Pin, X, MessageSquare } from 'lucide-react';
import { DriftRoom } from '../../domains/d15_drift';

interface DriftRoomHeaderProps {
  room: DriftRoom;
  activeSoulsCount: number;
  roomTimeLeft: string;
  soulsDrawerOpen: boolean;
  pinnedAnnouncement: string | null;
  pinnedBannerDismissed: boolean;
  currentGender?: 'M' | 'F' | null;
  isPlatformAdmin?: boolean;
  onLeave: () => void;
  onToggleSoulsDrawer: () => void;
  onOpenBottleModal: () => void;
  onOpenMessages: () => void;
  onOpenIdentityModal: () => void;
  onOpenAdminPinModal?: () => void;
  onDismissPinnedBanner: () => void;
  showToast: (msg: string) => void;
}

export const DriftRoomHeader: React.FC<DriftRoomHeaderProps> = ({
  room,
  activeSoulsCount,
  roomTimeLeft,
  soulsDrawerOpen,
  pinnedAnnouncement,
  pinnedBannerDismissed,
  currentGender,
  isPlatformAdmin = false,
  onLeave,
  onToggleSoulsDrawer,
  onOpenBottleModal,
  onOpenMessages,
  onOpenIdentityModal,
  onOpenAdminPinModal,
  onDismissPinnedBanner,
  showToast
}) => {
  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);

  return (
    <>
      {/* TOP BAR with Sunset/Wavelength ambiance banner */}
      <div className="relative z-40 bg-neutral-950 border-b border-neutral-800/80">
        <div
          className="absolute inset-0 opacity-25 bg-cover bg-center pointer-events-none"
          style={{ backgroundImage: `url('${room.banner_url || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80'}')` }}
        />
        <div className="relative z-30 p-3 flex items-center justify-between backdrop-blur-sm">
          {/* Left: Back & Room Title */}
          <div className="flex items-center space-x-2.5">
            <button
              onClick={onLeave}
              className="p-2 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700/60 text-neutral-300 hover:text-white transition cursor-pointer"
              title="Return to Drift Wavelengths"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="w-9 h-9 rounded-full bg-teal-500/20 border border-teal-400/50 flex items-center justify-center text-teal-300 shadow">
              🌊
            </div>

            <div>
              <h3 className="font-black text-sm tracking-tight text-white font-serif flex items-center space-x-1.5">
                <span>{room.name}</span>
              </h3>
              <p className="text-[11px] text-teal-300 flex items-center space-x-1 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Active Souls: {activeSoulsCount || 1}</span>
              </p>
            </div>
          </div>

          {/* Right: Suspense Timer & Participants Drawer toggle & Menu */}
          <div className="flex items-center space-x-2">
            {/* Suspense Countdown Timer */}
            <div className="px-3 py-1.5 rounded-2xl bg-neutral-950/90 border border-pink-500/60 text-pink-400 font-mono text-xs font-bold shadow-lg shadow-pink-500/10 flex flex-col items-center">
              <span className="flex items-center space-x-1 text-pink-300">
                <Clock className="w-3.5 h-3.5 text-pink-400" />
                <span>{roomTimeLeft}</span>
              </span>
              <span className="text-[8px] uppercase tracking-wider text-pink-400/80 font-sans font-bold">
                Drift Session
              </span>
            </div>

            {/* Participants Icon */}
            <button
              onClick={onToggleSoulsDrawer}
              className={`p-2 rounded-xl border transition cursor-pointer ${
                soulsDrawerOpen
                  ? 'bg-teal-500/20 border-teal-400 text-teal-300'
                  : 'bg-neutral-900/80 border-neutral-700/60 text-neutral-300 hover:text-white'
              }`}
              title="View Active Souls"
            >
              <Users className="w-4 h-4" />
            </button>

            {/* 3-Dot Menu */}
            <div className="relative z-50">
              <button
                onClick={() => setOptionsMenuOpen(!optionsMenuOpen)}
                className={`p-2 rounded-xl border transition cursor-pointer ${
                  optionsMenuOpen
                    ? 'bg-neutral-800 border-neutral-600 text-white'
                    : 'bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700/60 text-neutral-300 hover:text-white'
                }`}
                title="Room Options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {optionsMenuOpen && (
                <>
                  {/* Invisible Fullscreen Backdrop to catch clicks outside */}
                  <div
                    className="fixed inset-0 z-40 bg-black/10"
                    onClick={() => setOptionsMenuOpen(false)}
                  />

                  {/* High-elevation Dropdown Menu */}
                  <div className="absolute right-0 top-full mt-2 w-56 bg-neutral-900/98 border border-neutral-700/90 rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.95)] p-2 z-50 text-xs space-y-1 animate-fadeIn backdrop-blur-2xl">
                    <button
                      onClick={() => {
                        setOptionsMenuOpen(false);
                        onOpenIdentityModal();
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-neutral-800 text-teal-300 font-bold flex items-center space-x-2.5 cursor-pointer transition border border-teal-500/25 bg-teal-950/40"
                    >
                      <span className="text-base select-none">🎭</span>
                      <div className="flex-1 min-w-0 flex items-center justify-between">
                        <span className="truncate">Handle & Gender</span>
                        {currentGender && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-black ${currentGender === 'F' ? 'bg-pink-900/80 text-pink-300 border border-pink-500/40' : 'bg-cyan-900/80 text-cyan-300 border border-cyan-500/40'}`}>
                            {currentGender === 'F' ? '♀ F' : '♂ M'}
                          </span>
                        )}
                      </div>
                    </button>

                    {/* App Admin Pin / Broadcast option */}
                    {isPlatformAdmin && (
                      <button
                        onClick={() => {
                          setOptionsMenuOpen(false);
                          if (onOpenAdminPinModal) onOpenAdminPinModal();
                        }}
                        className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-neutral-800 text-amber-300 font-bold flex items-center space-x-2.5 cursor-pointer transition border border-amber-500/25 bg-amber-950/30"
                      >
                        <Pin className="w-3.5 h-3.5 text-amber-400" />
                        <div className="flex-1 min-w-0 flex items-center justify-between">
                          <span className="truncate">Admin Pin / Broadcast</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-900/80 text-amber-300 font-bold border border-amber-500/40">
                            Admin
                          </span>
                        </div>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setOptionsMenuOpen(false);
                        onOpenBottleModal();
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-neutral-800 text-pink-400 font-bold flex items-center space-x-2 cursor-pointer transition"
                    >
                      <Wine className="w-3.5 h-3.5" />
                      <span>Cast / Pick Bottle</span>
                    </button>
                    <button
                      onClick={() => {
                        setOptionsMenuOpen(false);
                        onOpenMessages();
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-neutral-800 text-teal-300 font-bold flex items-center space-x-2 cursor-pointer transition border border-teal-500/20 bg-teal-950/30"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-teal-400" />
                      <span>Messages</span>
                    </button>
                    <button
                      onClick={() => {
                        setOptionsMenuOpen(false);
                        onToggleSoulsDrawer();
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-neutral-800 text-teal-400 font-bold flex items-center space-x-2 cursor-pointer transition"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Active Souls ({activeSoulsCount})</span>
                    </button>
                    <button
                      onClick={() => {
                        setOptionsMenuOpen(false);
                        showToast('Room notifications muted.');
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-neutral-800 text-neutral-300 flex items-center space-x-2 cursor-pointer transition"
                    >
                      <span>Mute Room</span>
                    </button>
                    <button
                      onClick={() => {
                        setOptionsMenuOpen(false);
                        onLeave();
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-rose-500/20 text-rose-400 font-bold flex items-center space-x-2 cursor-pointer transition"
                    >
                      <span>Leave Room</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Glow Divider Bar */}
        <div className="h-0.5 bg-gradient-to-r from-pink-500 via-amber-400 to-teal-400 opacity-80" />
      </div>

      {/* PINNED ANNOUNCEMENT BANNER */}
      {pinnedAnnouncement && !pinnedBannerDismissed && (
        <div className="relative z-20 bg-purple-950/60 border-b border-purple-500/30 px-3.5 py-2 flex items-center justify-between text-xs text-purple-200 backdrop-blur-md">
          <div
            onClick={isPlatformAdmin ? onOpenAdminPinModal : undefined}
            className={`flex items-center space-x-2 min-w-0 pr-2 ${isPlatformAdmin ? 'cursor-pointer hover:text-white' : ''}`}
            title={isPlatformAdmin ? 'App Admin: Click to edit or unpin announcement' : undefined}
          >
            <Pin className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />
            <p className="truncate text-[11px] leading-tight">
              <span className="font-bold text-pink-300">Pinned: </span>
              {pinnedAnnouncement}
            </p>
          </div>
          <div className="flex items-center space-x-1 flex-shrink-0">
            {isPlatformAdmin && onOpenAdminPinModal && (
              <button
                onClick={onOpenAdminPinModal}
                className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-bold hover:bg-amber-500/30 cursor-pointer mr-1"
                title="Admin Pin Settings"
              >
                Admin
              </button>
            )}
            <button
              onClick={onDismissPinnedBanner}
              className="p-1 text-purple-400 hover:text-white cursor-pointer"
              title="Dismiss banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
