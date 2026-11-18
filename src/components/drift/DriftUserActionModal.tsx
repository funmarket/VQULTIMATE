import React from 'react';
import {
  MessageSquare,
  Wine,
  User,
  Flag,
  Ban,
  Pin,
  Trash2,
  X,
  ShieldAlert
} from 'lucide-react';
import { DriftMessage } from '../../domains/d15_drift';

interface DriftUserActionModalProps {
  targetHandle: string;
  targetUserId?: string;
  targetColor?: string;
  selectedMessage?: DriftMessage | null;
  isModerator?: boolean;
  onSendPrivateDrift: (handle: string, userId?: string) => void;
  onCastBottleToUser: (handle: string) => void;
  onPinMessage?: (message: DriftMessage, scope: 'room' | 'all') => void;
  onDeleteMessage?: (message: DriftMessage) => void;
  onReport: (handle: string) => void;
  onClose: () => void;
}

export const DriftUserActionModal: React.FC<DriftUserActionModalProps> = ({
  targetHandle,
  targetUserId,
  targetColor = '#14b8a6',
  selectedMessage,
  isModerator = false,
  onSendPrivateDrift,
  onCastBottleToUser,
  onPinMessage,
  onDeleteMessage,
  onReport,
  onClose
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
      <div className="w-full sm:max-w-sm bg-white dark:bg-neutral-900 border border-[#DBDBDB] dark:border-neutral-800 rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-2xl text-[#050505] dark:text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E4E6EB] dark:border-neutral-800 pb-3">
          <div className="flex items-center space-x-3">
            <div className="text-2xl flex-shrink-0 select-none">
              🎭
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#050505] dark:text-white">{targetHandle}</h4>
              <p className="text-[10px] text-teal-700 dark:text-teal-400">Anonymous Voyager • 3h Session</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-[#EFEFEF] hover:bg-[#E4E6EB] dark:bg-neutral-800 dark:hover:bg-neutral-700 text-[#65676B] dark:text-neutral-400 hover:text-[#050505] dark:hover:text-white cursor-pointer transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selected message preview snippet if present */}
        {selectedMessage && selectedMessage.content && (
          <div className="bg-[#F0F2F5] dark:bg-neutral-950/80 p-3 rounded-2xl border border-[#E4E6EB] dark:border-neutral-800/80 text-xs text-[#262626] dark:text-neutral-300 italic">
            &ldquo;{selectedMessage.content}&rdquo;
          </div>
        )}

        {/* Action List */}
        <div className="space-y-1.5">
          <button
            onClick={() => {
              onSendPrivateDrift(targetHandle, targetUserId);
              onClose();
            }}
            className="w-full p-3 rounded-2xl bg-[#FAFAFA] dark:bg-neutral-950 hover:bg-[#F0F2F5] dark:hover:bg-neutral-800 border border-[#E4E6EB] dark:border-neutral-800 flex items-center space-x-3 transition cursor-pointer text-left group"
          >
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-105 transition">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <h5 className="font-bold text-xs text-[#050505] dark:text-white">Send Private Drift</h5>
              <p className="text-[10px] text-[#65676B] dark:text-neutral-400">Open 1:1 anonymous temporary conversation</p>
            </div>
          </button>

          <button
            onClick={() => {
              onCastBottleToUser(targetHandle);
              onClose();
            }}
            className="w-full p-3 rounded-2xl bg-[#FAFAFA] dark:bg-neutral-950 hover:bg-[#F0F2F5] dark:hover:bg-neutral-800 border border-[#E4E6EB] dark:border-neutral-800 flex items-center space-x-3 transition cursor-pointer text-left group"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition">
              <Wine className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <h5 className="font-bold text-xs text-[#050505] dark:text-white">Cast a Drift Bottle</h5>
              <p className="text-[10px] text-[#65676B] dark:text-neutral-400">Float an anonymous message in this wavelength</p>
            </div>
          </button>

          <button
            onClick={() => {
              onReport(targetHandle);
              onClose();
            }}
            className="w-full p-3 rounded-2xl bg-[#FAFAFA] dark:bg-neutral-950 hover:bg-[#F0F2F5] dark:hover:bg-neutral-800 border border-[#E4E6EB] dark:border-neutral-800 flex items-center space-x-3 transition cursor-pointer text-left group"
          >
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:scale-105 transition">
              <Flag className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <h5 className="font-bold text-xs text-[#050505] dark:text-white">Report / Block</h5>
              <p className="text-[10px] text-[#65676B] dark:text-neutral-400">Report inappropriate content or mute soul</p>
            </div>
          </button>

          {/* Admin / Moderator actions */}
          {isModerator && selectedMessage && (
            <div className="pt-2 border-t border-[#E4E6EB] dark:border-neutral-800 space-y-1.5">
              <p className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 tracking-wider px-1">
                Moderator Controls
              </p>
              {onPinMessage && (
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => {
                      onPinMessage(selectedMessage, 'room');
                      onClose();
                    }}
                    className="p-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] font-bold flex items-center justify-center space-x-1.5 transition cursor-pointer"
                    title="Pin only in this room"
                  >
                    <Pin className="w-3 h-3" />
                    <span>Pin to Room</span>
                  </button>
                  <button
                    onClick={() => {
                      onPinMessage(selectedMessage, 'all');
                      onClose();
                    }}
                    className="p-2 rounded-xl bg-purple-50 dark:bg-purple-500/15 border border-purple-200 dark:border-purple-500/40 hover:bg-purple-100 dark:hover:bg-purple-500/25 text-purple-800 dark:text-purple-300 text-[11px] font-bold flex items-center justify-center space-x-1.5 transition cursor-pointer"
                    title="Pin across all 12 rooms"
                  >
                    <Pin className="w-3 h-3 text-pink-600 dark:text-pink-400" />
                    <span>Pin to All 12</span>
                  </button>
                </div>
              )}
              {onDeleteMessage && (
                <button
                  onClick={() => {
                    onDeleteMessage(selectedMessage);
                    onClose();
                  }}
                  className="w-full p-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-bold flex items-center space-x-2 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Message</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
