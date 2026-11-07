import React, { useState, useRef } from 'react';
import {
  Plus,
  Smile,
  Mic,
  Send,
  Image as ImageIcon,
  Camera,
  Wine,
  Sparkles,
  X
} from 'lucide-react';
import { DriftMessage } from '../../domains/d15_drift';

interface DriftComposerProps {
  inputText: string;
  onChangeInputText: (text: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
  replyingTo: DriftMessage | null;
  onCancelReply: () => void;
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  uploading: boolean;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  emojiPickerOpen: boolean;
  onToggleEmojiPicker: () => void;
  onOpenBottleModal: () => void;
  onRevealVibeHandle: () => void;
}

export const DriftComposer: React.FC<DriftComposerProps> = ({
  inputText,
  onChangeInputText,
  onSendMessage,
  replyingTo,
  onCancelReply,
  isRecording,
  onStartRecording,
  onStopRecording,
  uploading,
  onFileUpload,
  emojiPickerOpen,
  onToggleEmojiPicker,
  onOpenBottleModal,
  onRevealVibeHandle
}) => {
  const [toolbarExpanded, setToolbarExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="bg-neutral-900 border-t border-neutral-800 p-2.5 space-y-2">
      {/* Reply banner if active */}
      {replyingTo && (
        <div className="flex items-center justify-between bg-neutral-950 p-2 rounded-xl border border-neutral-800 text-xs">
          <div className="flex items-center space-x-1.5 truncate">
            <span className="font-bold text-teal-400">Replying to {replyingTo.alias_handle}:</span>
            <span className="text-neutral-400 truncate">&ldquo;{replyingTo.content}&rdquo;</span>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1 text-neutral-400 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Hidden File / Camera inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileUpload}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={cameraInputRef}
        onChange={onFileUpload}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* Main Composer input row */}
      <form onSubmit={onSendMessage} className="flex items-center space-x-2">
        {/* Expand `+` button */}
        <button
          type="button"
          onClick={() => setToolbarExpanded(!toolbarExpanded)}
          className={`p-2.5 rounded-full border transition cursor-pointer ${
            toolbarExpanded
              ? 'bg-pink-500 border-pink-400 text-white rotate-45'
              : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:text-white'
          }`}
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Text Input */}
        <input
          type="text"
          value={inputText}
          onChange={(e) => onChangeInputText(e.target.value)}
          placeholder="Message anonymously..."
          className="flex-1 bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-teal-500"
        />

        {/* Emoji button (Telegram Picker) */}
        <button
          type="button"
          onClick={onToggleEmojiPicker}
          className={`p-2 transition cursor-pointer ${
            emojiPickerOpen
              ? 'text-amber-400'
              : 'text-neutral-400 hover:text-amber-300'
          }`}
          title="Telegram & Animated Emojis"
        >
          <Smile className="w-5 h-5" />
        </button>

        {/* Microphone button */}
        <button
          type="button"
          onMouseDown={onStartRecording}
          onMouseUp={onStopRecording}
          onTouchStart={onStartRecording}
          onTouchEnd={onStopRecording}
          className={`p-2.5 rounded-full transition cursor-pointer ${
            isRecording
              ? 'bg-rose-500 text-white animate-pulse'
              : 'bg-neutral-800 text-neutral-400 hover:text-white'
          }`}
          title="Hold to record voice message"
        >
          <Mic className="w-4 h-4" />
        </button>

        {/* Send Arrow Button */}
        <button
          type="submit"
          disabled={!inputText.trim() || uploading}
          className="p-2.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-pink-500/20 hover:opacity-95 transition disabled:opacity-40 cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* EXPANDED TOOLBAR (As shown in artwork) */}
      {toolbarExpanded && (
        <div className="pt-2 border-t border-neutral-800/80 flex flex-wrap items-center gap-2 justify-between text-xs animate-fadeIn pb-1">
          <div className="flex flex-wrap items-center gap-3 text-neutral-400">
            <button
              type="button"
              onClick={onToggleEmojiPicker}
              className="flex items-center space-x-1 hover:text-amber-300 transition cursor-pointer"
            >
              <Smile className="w-4 h-4 text-amber-400" />
              <span className="text-[11px]">Emoji</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center space-x-1 hover:text-teal-400 transition cursor-pointer"
            >
              <ImageIcon className="w-4 h-4" />
              <span className="text-[11px]">Photo</span>
            </button>

            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center space-x-1 hover:text-teal-400 transition cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span className="text-[11px]">Camera</span>
            </button>

            <button
              type="button"
              onClick={onStartRecording}
              className="flex items-center space-x-1 hover:text-teal-400 transition cursor-pointer"
            >
              <Mic className="w-4 h-4" />
              <span className="text-[11px]">Voice</span>
            </button>

            <button
              type="button"
              onClick={onOpenBottleModal}
              className="flex items-center space-x-1 text-pink-400 hover:text-pink-300 font-bold transition cursor-pointer"
            >
              <Wine className="w-4 h-4" />
              <span className="text-[11px]">Cast a Drift</span>
            </button>
          </div>

          {/* Reveal Vibe Handle trigger button */}
          <button
            type="button"
            onClick={onRevealVibeHandle}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-900 to-indigo-900 border border-purple-500/40 text-amber-300 font-bold text-[11px] shadow flex items-center space-x-1.5 cursor-pointer hover:border-amber-400/60 ml-auto"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Reveal Vibe Handle</span>
          </button>
        </div>
      )}
    </div>
  );
};
