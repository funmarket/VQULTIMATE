import React, { useState, useEffect } from 'react';
import { Wine, Waves, Clock, X, Sparkles, Globe } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  DriftBottle,
  DriftRoom,
  castDriftBottle,
  fetchFloatingBottles,
  pickupDriftBottle,
  CANONICAL_WAVELENGTH_ROOMS
} from '../../domains/d15_drift';

interface CastBottleModalProps {
  room: DriftRoom;
  currentUserId: string;
  currentHandle: string;
  aliasId?: string;
  onBottlePickedUp: (threadId: string) => void;
  onClose: () => void;
}

export const CastBottleModal: React.FC<CastBottleModalProps> = ({
  room,
  currentUserId,
  currentHandle,
  aliasId,
  onBottlePickedUp,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'cast' | 'floating'>('cast');
  const [bottleContent, setBottleContent] = useState('');
  const [floatingBottles, setFloatingBottles] = useState<DriftBottle[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Helper for origin room name
  const getOriginRoomName = (roomId: string) => {
    const found = CANONICAL_WAVELENGTH_ROOMS.find((r) => r.id === roomId);
    return found ? found.name : room.name;
  };

  // Helper for 12-hour remaining countdown
  const getTimeRemaining = (expiresAt: string) => {
    const diff = Math.max(0, new Date(expiresAt).getTime() - Date.now());
    const hrs = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hrs === 0 && mins === 0) return 'Expiring soon';
    return `${hrs}h ${mins}m float left`;
  };

  // Global fetch & Realtime subscription across all 12 rooms
  useEffect(() => {
    let isMounted = true;
    fetchFloatingBottles().then((bottles) => {
      if (isMounted) setFloatingBottles(bottles);
    });

    const channel = supabase
      .channel('drift_global_bottles_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'drift_bottles' },
        () => {
          fetchFloatingBottles().then((bottles) => {
            if (isMounted) setFloatingBottles(bottles);
          });
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const handleCast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bottleContent.trim()) return;
    setLoading(true);
    setStatusMessage(null);

    const res = await castDriftBottle({
      roomId: room.id,
      senderAliasId: aliasId,
      senderAliasHandle: currentHandle,
      senderUserId: currentUserId,
      content: bottleContent
    });

    setLoading(false);
    if (res.success && res.bottle) {
      setBottleContent('');
      setStatusMessage('✨ Bottle cast into the global current! Visible across all 12 rooms for 12 hours.');
      setFloatingBottles((prev) => [res.bottle!, ...prev.filter((b) => b.id !== res.bottle!.id)]);
      setTimeout(() => {
        setActiveTab('floating');
        setStatusMessage(null);
      }, 1300);
    } else {
      setStatusMessage(res.error || 'Failed to cast bottle.');
    }
  };

  const handlePickup = async (bottle: DriftBottle) => {
    if (bottle.sender_user_id === currentUserId) {
      setStatusMessage('You cannot pick up your own bottle.');
      return;
    }
    setLoading(true);
    const res = await pickupDriftBottle(bottle.id, currentUserId, currentHandle);
    setLoading(false);

    if (res.success && res.threadId) {
      // Remove immediately from local state
      setFloatingBottles((prev) => prev.filter((b) => b.id !== bottle.id));
      onBottlePickedUp(res.threadId);
    } else {
      setStatusMessage(res.error || 'Bottle pickup failed.');
      // Re-sync floating bottles in case another voyager scooped it
      fetchFloatingBottles().then(setFloatingBottles);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-start justify-center p-3 sm:p-4 pt-3 sm:pt-6 animate-fadeIn overflow-y-auto">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-5 space-y-4 shadow-2xl text-white max-h-[92vh] flex flex-col mt-1 sm:mt-3">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center border border-pink-500/30">
              <Wine className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-base text-white font-serif">Message in a Bottle</h3>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-pink-900/60 text-pink-300 font-bold border border-pink-500/40">
                  12h Float
                </span>
              </div>
              <p className="text-[10px] text-teal-400 flex items-center space-x-1 mt-0.5">
                <Globe className="w-3 h-3 text-cyan-400" />
                <span>Global Currents • Visible Across All 12 Rooms</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-neutral-800 text-neutral-400 hover:text-white cursor-pointer transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch: Cast vs Floating */}
        <div className="grid grid-cols-2 gap-2 bg-neutral-950 p-1 rounded-2xl border border-neutral-800 text-xs font-bold">
          <button
            onClick={() => setActiveTab('cast')}
            className={`py-2 rounded-xl transition cursor-pointer flex items-center justify-center space-x-1.5 ${
              activeTab === 'cast'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Wine className="w-3.5 h-3.5" />
            <span>Cast a Drift</span>
          </button>
          <button
            onClick={() => setActiveTab('floating')}
            className={`py-2 rounded-xl transition cursor-pointer flex items-center justify-center space-x-1.5 ${
              activeTab === 'floating'
                ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-neutral-950 shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Waves className="w-3.5 h-3.5" />
            <span>Floating Bottles ({floatingBottles.length})</span>
          </button>
        </div>

        {statusMessage && (
          <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs leading-relaxed animate-fadeIn">
            {statusMessage}
          </div>
        )}

        {/* CAST TAB */}
        {activeTab === 'cast' ? (
          <form onSubmit={handleCast} className="space-y-4 flex-1">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-400">Anonymous message:</span>
                <span className={`text-[11px] font-mono ${bottleContent.length > 220 ? 'text-rose-400' : 'text-neutral-500'}`}>
                  {bottleContent.length} / 240
                </span>
              </div>
              <textarea
                value={bottleContent}
                onChange={(e) => setBottleContent(e.target.value)}
                maxLength={240}
                rows={4}
                placeholder="Cast an anonymous thought, secret riddle, or serendipitous question into the digital sea..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl p-3.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-pink-500 resize-none leading-relaxed"
              />
            </div>

            <div className="rounded-2xl bg-neutral-950/60 p-3 border border-neutral-800 text-[11px] text-neutral-400 space-y-1.5">
              <p className="flex items-center space-x-1.5 text-pink-300 font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Global Ocean Physics</span>
              </p>
              <p className="leading-relaxed">
                Your bottle is cast from <span className="text-pink-300 font-semibold">{room.name}</span> and drifts across <span className="text-teal-300 font-semibold">all 12 wavelength rooms</span> simultaneously for <span className="text-amber-300 font-bold">12 hours</span>.
              </p>
              <p className="text-[10px] text-neutral-500 leading-relaxed">
                The first voyager who picks it up initiates a 1:1 anonymous conversation with you, and the bottle immediately vanishes from all rooms.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !bottleContent.trim()}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 text-white font-black text-xs shadow-xl shadow-pink-500/20 hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Wine className="w-4 h-4" />
              <span>{loading ? 'Casting Bottle...' : 'Cast Into Global Ocean'}</span>
            </button>
          </form>
        ) : (
          /* FLOATING BOTTLES TAB */
          <div className="flex-1 overflow-y-auto space-y-3 min-h-[200px] max-h-[55vh] pr-1">
            {floatingBottles.length > 0 ? (
              floatingBottles.map((b) => (
                <div
                  key={b.id}
                  className="rounded-2xl bg-neutral-950 border border-neutral-800 p-4 space-y-3 hover:border-pink-500/40 transition"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-pink-400">{b.sender_alias_handle}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                        {getOriginRoomName(b.room_id)}
                      </span>
                    </div>
                    <span className="text-[10px] text-amber-400/90 font-mono flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span>{getTimeRemaining(b.expires_at)}</span>
                    </span>
                  </div>

                  <p className="text-xs text-neutral-200 italic leading-relaxed">
                    &ldquo;{b.content}&rdquo;
                  </p>

                  <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between">
                    <span className="text-[10px] text-teal-400 flex items-center space-x-1">
                      <Waves className="w-3 h-3" />
                      <span>Floating in Global Drift</span>
                    </span>
                    {b.sender_user_id === currentUserId ? (
                      <span className="text-[10px] text-neutral-500 italic px-2 py-1 rounded bg-neutral-900 border border-neutral-800">
                        Your bottle
                      </span>
                    ) : (
                      <button
                        onClick={() => handlePickup(b)}
                        disabled={loading}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-neutral-950 font-bold text-xs hover:opacity-95 transition flex items-center space-x-1 cursor-pointer shadow-md"
                      >
                        <Wine className="w-3 h-3" />
                        <span>Pick Up Drift</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-xs text-neutral-500 space-y-2">
                <Wine className="w-8 h-8 text-pink-400/40 mx-auto" />
                <p>No bottles currently floating in the digital sea.</p>
                <p className="text-[11px] text-neutral-600">Be the first to cast a 12-hour bottle across all 12 rooms!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
