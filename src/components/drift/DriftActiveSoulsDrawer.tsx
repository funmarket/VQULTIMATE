import React, { useMemo } from 'react';
import { X, Search, MessageSquare } from 'lucide-react';
import { DriftPresence } from '../../domains/d15_drift';

interface DriftActiveSoulsDrawerProps {
  activeSouls: DriftPresence[];
  currentUserId: string;
  soulsSearchQuery: string;
  onChangeSearchQuery: (query: string) => void;
  onClose: () => void;
  onSelectSoul: (soul: { handle: string; userId?: string; color?: string }) => void;
  onStartPrivateDrift: (handle: string, userId?: string) => void;
  showToast: (msg: string) => void;
}

export const DriftActiveSoulsDrawer: React.FC<DriftActiveSoulsDrawerProps> = ({
  activeSouls,
  currentUserId,
  soulsSearchQuery,
  onChangeSearchQuery,
  onClose,
  onSelectSoul,
  onStartPrivateDrift,
  showToast
}) => {
  const filteredSouls = useMemo(() => {
    return activeSouls.filter((s) =>
      s.alias_handle.toLowerCase().includes(soulsSearchQuery.toLowerCase())
    );
  }, [activeSouls, soulsSearchQuery]);

  return (
    <div className="w-72 bg-white/95 dark:bg-neutral-900/95 border-l border-[#DBDBDB] dark:border-neutral-800 flex flex-col backdrop-blur-md animate-fadeIn z-20">
      {/* Drawer Header */}
      <div className="p-3.5 bg-[#FAFAFA] dark:bg-transparent border-b border-[#E4E6EB] dark:border-neutral-800 flex items-center justify-between">
        <h4 className="font-bold text-xs text-[#050505] dark:text-white">
          Active Souls ({activeSouls.length})
        </h4>
        <button
          onClick={onClose}
          className="p-1 rounded-lg bg-[#EFEFEF] dark:bg-neutral-800 text-[#65676B] dark:text-neutral-400 hover:text-[#050505] dark:hover:text-white cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Search in room */}
      <div className="p-2 border-b border-[#E4E6EB] dark:border-neutral-800/80">
        <div className="relative">
          <Search className="w-3 h-3 absolute left-2.5 top-2.5 text-[#65676B] dark:text-neutral-500" />
          <input
            type="text"
            value={soulsSearchQuery}
            onChange={(e) => onChangeSearchQuery(e.target.value)}
            placeholder="Search in room..."
            className="w-full bg-[#F0F2F5] dark:bg-neutral-950 border border-[#DBDBDB] dark:border-neutral-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#050505] dark:text-white placeholder-[#65676B] dark:placeholder-neutral-500 focus:outline-none focus:border-[#0866FF] dark:focus:border-teal-500"
          />
        </div>
      </div>

      {/* Souls List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredSouls.map((soul) => (
          <div
            key={soul.id}
            onClick={() => {
              onSelectSoul({
                handle: soul.alias_handle,
                userId: soul.user_id,
                color: soul.avatar_color
              });
            }}
            className="p-2 rounded-xl bg-[#FAFAFA] dark:bg-neutral-950/60 hover:bg-[#F0F2F5] dark:hover:bg-neutral-800/80 border border-[#E4E6EB] dark:border-neutral-800/60 flex items-center justify-between cursor-pointer transition group"
          >
            <div className="flex items-center space-x-2 min-w-0">
              <span className="text-xl flex-shrink-0 select-none">🎭</span>
              <span className="font-bold text-xs text-[#050505] dark:text-neutral-200 truncate group-hover:text-[#0866FF] dark:group-hover:text-teal-300">
                {soul.alias_handle}
              </span>
              {soul.gender && (
                <span
                  className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase flex-shrink-0 flex items-center space-x-0.5 ${
                    soul.gender === 'F'
                      ? 'text-pink-700 dark:text-pink-300 bg-pink-50 dark:bg-pink-950/80 border border-pink-200 dark:border-pink-500/40'
                      : 'text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/80 border border-cyan-200 dark:border-cyan-500/40'
                  }`}
                  title={soul.gender === 'F' ? 'Female' : 'Male'}
                >
                  {soul.gender === 'F' ? '♀ F' : '♂ M'}
                </span>
              )}
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse flex-shrink-0" />
          </div>
        ))}
      </div>

      {/* Bottom Action in Drawer */}
      <div className="p-3 bg-[#FAFAFA] dark:bg-transparent border-t border-[#E4E6EB] dark:border-neutral-800">
        <button
          onClick={() => {
            const firstOther = activeSouls.find((s) => s.user_id !== currentUserId);
            if (firstOther) {
              onStartPrivateDrift(firstOther.alias_handle, firstOther.user_id);
            } else {
              showToast('Wait for another soul to tune in.');
            }
          }}
          className="w-full py-2.5 rounded-xl bg-[#0866FF] hover:bg-[#075CE5] dark:bg-gradient-to-r dark:from-purple-600 dark:via-pink-600 dark:to-rose-600 text-white font-bold text-xs shadow-lg shadow-[#0866FF]/20 dark:shadow-purple-500/20 hover:opacity-95 transition flex items-center justify-center space-x-2 cursor-pointer"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Send Private Drift</span>
        </button>
      </div>
    </div>
  );
};
