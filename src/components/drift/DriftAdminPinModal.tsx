import React, { useState } from 'react';
import { Pin, Globe, MapPin, X, ShieldAlert, Check, Trash2 } from 'lucide-react';
import { DriftRoom } from '../../domains/d15_drift';

interface DriftAdminPinModalProps {
  room: DriftRoom;
  currentPinnedAnnouncement?: string | null;
  initialMessageText?: string;
  isPlatformAdmin: boolean;
  onConfirmPin: (text: string, scope: 'room' | 'all') => Promise<void>;
  onConfirmUnpin: (scope: 'room' | 'all') => Promise<void>;
  onClose: () => void;
}

export const DriftAdminPinModal: React.FC<DriftAdminPinModalProps> = ({
  room,
  currentPinnedAnnouncement,
  initialMessageText = '',
  isPlatformAdmin,
  onConfirmPin,
  onConfirmUnpin,
  onClose
}) => {
  const [announcementText, setAnnouncementText] = useState(
    initialMessageText || currentPinnedAnnouncement || ''
  );
  const [scope, setScope] = useState<'room' | 'all'>('room');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isPlatformAdmin) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
        <div className="w-full max-w-sm bg-white dark:bg-neutral-900 border border-[#DBDBDB] dark:border-neutral-800 rounded-3xl p-5 space-y-4 text-[#050505] dark:text-white text-center shadow-2xl">
          <ShieldAlert className="w-10 h-10 text-rose-500 dark:text-rose-400 mx-auto" />
          <h4 className="font-bold text-base text-rose-600 dark:text-rose-300">Unauthorized</h4>
          <p className="text-xs text-[#65676B] dark:text-neutral-400">
            Pinning and broadcast announcements are restricted to authorized App Admins.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-[#EFEFEF] dark:bg-neutral-800 hover:bg-[#E4E6EB] dark:hover:bg-neutral-700 text-[#050505] dark:text-white font-bold text-xs cursor-pointer transition"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const handlePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementText.trim()) {
      setErrorMsg('Announcement text cannot be empty.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      await onConfirmPin(announcementText.trim(), scope);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to pin announcement.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnpin = async (unpinScope: 'room' | 'all') => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await onConfirmUnpin(unpinScope);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to unpin announcement.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/85 backdrop-blur-md flex items-start justify-center p-3 sm:p-4 pt-4 sm:pt-8 animate-fadeIn overflow-y-auto">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 border border-[#DBDBDB] dark:border-neutral-800 rounded-3xl p-5 space-y-4 shadow-2xl text-[#050505] dark:text-white max-h-[92vh] flex flex-col mt-1 sm:mt-2">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E4E6EB] dark:border-neutral-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-500/30">
              <Pin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-base text-[#050505] dark:text-white font-serif">Admin Announcement Pin</h3>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-bold border border-amber-300 dark:border-amber-500/40">
                  App Admin
                </span>
              </div>
              <p className="text-[10px] text-[#65676B] dark:text-neutral-400">
                Authoritative room or global banner announcement
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-[#EFEFEF] dark:bg-neutral-800 text-[#65676B] dark:text-neutral-400 hover:text-[#050505] dark:hover:text-white cursor-pointer transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs animate-fadeIn">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handlePin} className="space-y-4">
          {/* Scope Selector: Specific Room vs All 12 Rooms */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#262626] dark:text-neutral-300">Announcement Scope</label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setScope('room')}
                className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col space-y-1 ${
                  scope === 'room'
                    ? 'bg-amber-50 dark:bg-amber-500/20 border-amber-500 dark:border-amber-400 text-[#050505] dark:text-white ring-1 ring-amber-400 shadow-lg shadow-amber-500/20'
                    : 'bg-[#F0F2F5] dark:bg-neutral-950 border-[#DBDBDB] dark:border-neutral-800 text-[#65676B] dark:text-neutral-400 hover:text-[#050505] dark:hover:text-white hover:border-[#65676B]/40 dark:hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>This Room Only</span>
                </div>
                <p className="text-[10px] text-[#65676B] dark:text-neutral-400 truncate">
                  Pin in {room.name}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setScope('all')}
                className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col space-y-1 ${
                  scope === 'all'
                    ? 'bg-[#E7F3FF] dark:bg-purple-500/20 border-[#0866FF] dark:border-purple-400 text-[#050505] dark:text-white ring-1 ring-[#0866FF] dark:ring-purple-400 shadow-lg shadow-[#0866FF]/15 dark:shadow-purple-500/20'
                    : 'bg-[#F0F2F5] dark:bg-neutral-950 border-[#DBDBDB] dark:border-neutral-800 text-[#65676B] dark:text-neutral-400 hover:text-[#050505] dark:hover:text-white hover:border-[#65676B]/40 dark:hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center space-x-1.5 text-xs font-bold text-[#0866FF] dark:text-purple-300">
                  <Globe className="w-3.5 h-3.5" />
                  <span>All 12 Rooms</span>
                </div>
                <p className="text-[10px] text-[#65676B] dark:text-neutral-400">
                  Broadcast across Drift
                </p>
              </button>
            </div>
          </div>

          {/* Announcement Text Input */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label className="text-[11px] font-bold text-[#262626] dark:text-neutral-300">Announcement Banner Text</label>
              <span className={`text-[10px] font-mono ${announcementText.length > 180 ? 'text-rose-600 dark:text-rose-400' : 'text-[#65676B] dark:text-neutral-500'}`}>
                {announcementText.length} / 200
              </span>
            </div>
            <textarea
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              maxLength={200}
              rows={3}
              placeholder="e.g. Welcome to Chill Vibes! Respect anonymity and keep the good energy flowing."
              className="w-full bg-[#F0F2F5] dark:bg-neutral-950 border border-[#DBDBDB] dark:border-neutral-800 rounded-2xl p-3.5 text-xs text-[#050505] dark:text-white placeholder-[#65676B] dark:placeholder-neutral-500 focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 resize-none leading-relaxed"
            />
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <button
              type="submit"
              disabled={loading || !announcementText.trim()}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-neutral-950 font-black text-xs shadow-lg shadow-amber-500/20 hover:opacity-95 transition disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Pin className="w-4 h-4" />
              <span>
                {loading
                  ? 'Saving Announcement...'
                  : scope === 'all'
                  ? 'Pin Across All 12 Rooms (Global)'
                  : `Pin to ${room.name} Only`}
              </span>
            </button>

            {/* Unpin Controls */}
            {currentPinnedAnnouncement && (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E4E6EB] dark:border-neutral-800">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleUnpin('room')}
                  className="py-2.5 px-3 rounded-xl bg-[#EFEFEF] dark:bg-neutral-950 hover:bg-[#E4E6EB] dark:hover:bg-neutral-800 border border-[#DBDBDB] dark:border-neutral-800 text-[#050505] dark:text-neutral-300 dark:hover:text-white font-bold text-[11px] flex items-center justify-center space-x-1.5 cursor-pointer transition"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                  <span>Unpin {room.name}</span>
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleUnpin('all')}
                  className="py-2.5 px-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 font-bold text-[11px] flex items-center justify-center space-x-1.5 cursor-pointer transition"
                >
                  <Globe className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  <span>Unpin All 12</span>
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
