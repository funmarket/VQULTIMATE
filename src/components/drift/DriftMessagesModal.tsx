import React, { useState, useEffect } from 'react';
import { MessageSquare, Clock, X, ChevronRight } from 'lucide-react';
import { DriftPrivateThread, fetchUserPrivateThreads } from '../../domains/d15_drift';

interface DriftMessagesModalProps {
  currentUserId: string;
  currentHandle: string;
  onSelectThread: (thread: DriftPrivateThread) => void;
  onClose: () => void;
}

export const DriftMessagesModal: React.FC<DriftMessagesModalProps> = ({
  currentUserId,
  currentHandle,
  onSelectThread,
  onClose
}) => {
  const [threads, setThreads] = useState<DriftPrivateThread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetchUserPrivateThreads(currentUserId).then((data: DriftPrivateThread[]) => {
      if (isMounted) {
        setThreads(data);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [currentUserId]);

  const getTimeRemaining = (expiresAt: string) => {
    const diff = Math.max(0, new Date(expiresAt).getTime() - Date.now());
    const hrs = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hrs}h ${mins}m left`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-start justify-center p-3 sm:p-4 pt-3 sm:pt-6 animate-fadeIn overflow-y-auto">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-5 space-y-4 shadow-2xl text-white max-h-[92vh] flex flex-col mt-1 sm:mt-3">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-base text-white font-serif">Drift Messages</h3>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-teal-900/60 text-teal-300 font-bold border border-teal-500/40">
                  {threads.length} Active
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">Your anonymous 1:1 wavelength threads</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Drift Messages"
            className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content stream */}
        <div className="overflow-y-auto flex-1 space-y-2.5 pr-1">
          {loading ? (
            <div className="py-16 text-center text-xs text-neutral-400">
              Scanning wavelength threads...
            </div>
          ) : threads.length > 0 ? (
            threads.map((thread) => {
              const partnerHandle = thread.user_1_id === currentUserId ? thread.alias_2_handle : thread.alias_1_handle;
              return (
                <div
                  key={thread.id}
                  onClick={() => onSelectThread(thread)}
                  className="rounded-2xl bg-neutral-950 border border-neutral-800/80 hover:border-teal-500/50 p-4 flex items-center justify-between transition duration-300 cursor-pointer group shadow-md"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/20 to-pink-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 text-base font-bold flex-shrink-0 shadow-inner">
                      🌊
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-sm text-white truncate group-hover:text-teal-300 transition">
                          {partnerHandle}
                        </span>
                        <span className="text-[9px] font-mono text-pink-400 bg-pink-950/60 px-1.5 py-0.5 rounded border border-pink-500/30 flex-shrink-0 flex items-center space-x-1">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{getTimeRemaining(thread.expires_at)}</span>
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 truncate">
                        Active private conversation thread. Tap to open.
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-white group-hover:translate-x-0.5 transition flex-shrink-0 ml-2" />
                </div>
              );
            })
          ) : (
            <div className="py-20 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-400 text-xl mx-auto shadow-inner">
                📭
              </div>
              <h4 className="font-bold text-sm text-white">No active Drift Messages</h4>
              <p className="text-xs text-neutral-400 max-w-xs mx-auto leading-relaxed">
                Cast or pick up a Message in a Bottle, or start a private Drift with active souls in the room.
              </p>
            </div>
          )}
        </div>

        {/* Footer close */}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 font-bold text-xs text-white transition cursor-pointer"
        >
          Close Inbox
        </button>
      </div>
    </div>
  );
};
