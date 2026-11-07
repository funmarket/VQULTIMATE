import React from 'react';
import { Play, Pause, Smile } from 'lucide-react';
import { DriftMessage } from '../../domains/d15_drift';

interface DriftMessageItemProps {
  msg: DriftMessage;
  currentUserId: string;
  playingAudioId: string | null;
  onSelectSoulAction: (soul: { handle: string; userId?: string; color?: string }, message: DriftMessage) => void;
  onPlayVoice: (msgId: string, url: string) => void;
  onToggleReaction: (msgId: string, emoji: string) => void;
  onOpenEmojiReactionPicker: (msgId: string) => void;
  onReply: (msg: DriftMessage) => void;
}

export const DriftMessageItem: React.FC<DriftMessageItemProps> = ({
  msg,
  currentUserId,
  playingAudioId,
  onSelectSoulAction,
  onPlayVoice,
  onToggleReaction,
  onOpenEmojiReactionPicker,
  onReply
}) => {
  const avatarColor = msg.avatar_color || '#14b8a6';

  // Helper: Detect if message is 1-3 emojis only (Telegram large sticker/animated style)
  const isOnlyEmojis = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > 12) return false;
    const emojiRegex = /^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|\u200D|\uFE0F|\s)+$/u;
    return emojiRegex.test(trimmed);
  };

  const getEmojiAnimationClass = (char: string) => {
    if (char.includes('🔥') || char.includes('❤️‍🔥')) return 'animate-flame-flicker inline-block drop-shadow-[0_0_12px_rgba(249,115,22,0.85)]';
    if (char.includes('❤️') || char.includes('💖') || char.includes('💕') || char.includes('💗')) return 'animate-heart-pulse inline-block drop-shadow-[0_0_10px_rgba(244,63,94,0.8)]';
    if (char.includes('✨') || char.includes('⭐') || char.includes('💎')) return 'animate-star-spin inline-block drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]';
    if (char.includes('⚡') || char.includes('🔮') || char.includes('🧿')) return 'animate-neon-glow inline-block drop-shadow-[0_0_12px_rgba(45,212,191,0.9)]';
    if (char.includes('🚀') || char.includes('👻')) return 'animate-emoji-float inline-block';
    if (char.includes('🎉') || char.includes('😂') || char.includes('🤣') || char.includes('👾')) return 'animate-emoji-bounce inline-block';
    if (char.includes('🤯') || char.includes('😈') || char.includes('👋')) return 'animate-emoji-shake inline-block';
    return 'animate-heart-pulse inline-block';
  };

  return (
    <div className="flex space-x-3 items-start group">
      {/* Mask Icon (Circle removed per design mandate) */}
      <div
        onClick={() => {
          onSelectSoulAction({
            handle: msg.alias_handle,
            userId: msg.sender_user_id,
            color: avatarColor
          }, msg);
        }}
        className="text-2xl flex-shrink-0 cursor-pointer hover:scale-110 transition flex items-center justify-center pt-0.5 select-none"
        title={`Action for ${msg.alias_handle}`}
      >
        🎭
      </div>

      {/* Message Bubble & Meta */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center space-x-2">
          <span
            onClick={() => {
              onSelectSoulAction({
                handle: msg.alias_handle,
                userId: msg.sender_user_id,
                color: avatarColor
              }, msg);
            }}
            className="font-bold text-xs cursor-pointer hover:underline"
            style={{ color: avatarColor }}
          >
            {msg.alias_handle}
          </span>

          {msg.gender && (
            <span
              className={`text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider flex items-center space-x-0.5 ${
                msg.gender === 'F'
                  ? 'text-pink-300 bg-pink-950/80 border border-pink-500/40 shadow-sm shadow-pink-500/20'
                  : 'text-cyan-300 bg-cyan-950/80 border border-cyan-500/40 shadow-sm shadow-cyan-500/20'
              }`}
              title={msg.gender === 'F' ? 'Female (F)' : 'Male (M)'}
            >
              <span>{msg.gender === 'F' ? '♀ F' : '♂ M'}</span>
            </span>
          )}

          <span className="text-[10px] text-neutral-500">
            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Bubble Content */}
        <div className="rounded-2xl bg-neutral-900/80 border border-neutral-800/80 p-3 space-y-2 backdrop-blur-md max-w-lg shadow-xl">
          {/* Reply preview */}
          {msg.reply_to_snippet && (
            <div className="border-l-2 border-teal-400 pl-2.5 py-0.5 text-[10px] text-neutral-400 bg-neutral-950/60 rounded">
              <span className="font-bold text-teal-300">{msg.reply_to_handle}: </span>
              <span className="italic">{msg.reply_to_snippet}</span>
            </div>
          )}

          {/* Text / Telegram Animated Emojis */}
          {msg.content && (
            isOnlyEmojis(msg.content) ? (
              <div className="py-1">
                <span className={`text-4xl leading-none select-none ${getEmojiAnimationClass(msg.content)}`}>
                  {msg.content}
                </span>
              </div>
            ) : (
              <p className="text-xs text-neutral-100 leading-relaxed break-words">
                {msg.content}
              </p>
            )
          )}

          {/* Photo */}
          {msg.media_type === 'photo' && msg.media_url && (
            <div className="relative rounded-xl overflow-hidden border border-white/10 max-h-72">
              <img
                src={msg.media_url}
                alt="Drift snapshot"
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/70 text-[9px] font-bold text-teal-300 border border-teal-400/40">
                HD
              </span>
            </div>
          )}

          {/* Voice Note */}
          {msg.media_type === 'voice' && msg.media_url && (
            <div className="flex items-center space-x-3 bg-black/40 p-2.5 rounded-xl border border-neutral-800">
              <button
                onClick={() => onPlayVoice(msg.id, msg.media_url!)}
                className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white flex items-center justify-center shadow hover:scale-105 transition cursor-pointer"
              >
                {playingAudioId === msg.id ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4 ml-0.5" />
                )}
              </button>
              <div className="flex-1 flex items-center space-x-1 h-5">
                {[4, 8, 14, 18, 10, 6, 12, 16, 8, 4, 10, 14, 8, 12, 6, 10, 14, 8].map((h, i) => (
                  <div
                    key={i}
                    className={`w-1 rounded-full ${
                      playingAudioId === msg.id ? 'bg-teal-400 animate-pulse' : 'bg-neutral-600'
                    }`}
                    style={{ height: `${h}px` }}
                  />
                ))}
              </div>
              <span className="text-[10px] font-mono text-neutral-400">
                0:{String(msg.voice_duration || 24).padStart(2, '0')}
              </span>
            </div>
          )}

          {/* Emoji Reactions row underneath */}
          <div className="flex items-center space-x-1.5 pt-1 flex-wrap gap-y-1">
            {(() => {
              const reactionKeys = new Set<string>();
              if (msg.reactions) {
                Object.entries(msg.reactions).forEach(([emo, count]) => {
                  if (count > 0) reactionKeys.add(emo);
                });
              }
              if (msg.my_reactions) {
                msg.my_reactions.forEach((emo) => reactionKeys.add(emo));
              }

              return Array.from(reactionKeys).map((emo) => {
                const count = msg.reactions?.[emo] || (msg.my_reactions?.includes(emo) ? 1 : 0);
                const isReacted = msg.my_reactions?.includes(emo);

                return (
                  <button
                    key={emo}
                    onClick={() => onToggleReaction(msg.id, emo)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition flex items-center space-x-1 cursor-pointer hover:scale-105 ${
                      isReacted
                        ? 'bg-pink-500/20 border-pink-500/50 text-pink-300'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                    }`}
                  >
                    <span className={getEmojiAnimationClass(emo)}>{emo}</span>
                    <span>{count}</span>
                  </button>
                );
              });
            })()}

            {/* Telegram Emoji picker trigger for this message */}
            <button
              onClick={() => onOpenEmojiReactionPicker(msg.id)}
              className="px-2 py-0.5 rounded-full text-[10px] text-neutral-400 hover:text-amber-300 hover:bg-neutral-800 border border-neutral-800/60 hover:border-neutral-700 transition cursor-pointer flex items-center space-x-1"
              title="Choose Telegram Emoji reaction"
            >
              <Smile className="w-3 h-3 text-amber-400" />
              <span>+</span>
            </button>

            <button
              onClick={() => onReply(msg)}
              className="text-[10px] text-neutral-500 hover:text-teal-400 hover:underline px-1 cursor-pointer"
            >
              Reply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
