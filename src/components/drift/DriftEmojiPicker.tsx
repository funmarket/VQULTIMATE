import React, { useState, useEffect, useMemo } from 'react';
import { Search, Zap, Smile, Heart, Hand, Sparkles, X } from 'lucide-react';
import { DriftEmoji, fetchDriftEmojis } from '../../domains/d15_drift';

interface DriftEmojiPickerProps {
  onSelectEmoji: (emojiChar: string) => void;
  onClose: () => void;
}

export const DriftEmojiPicker: React.FC<DriftEmojiPickerProps> = ({
  onSelectEmoji,
  onClose
}) => {
  const [emojis, setEmojis] = useState<DriftEmoji[]>([]);
  const [activeCategory, setActiveCategory] = useState<'animated' | 'vibes' | 'smiles' | 'gestures' | 'symbols'>('animated');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredEmoji, setHoveredEmoji] = useState<DriftEmoji | null>(null);

  useEffect(() => {
    fetchDriftEmojis().then(setEmojis);
  }, []);

  const categories = [
    { id: 'animated', label: 'Animated', icon: Zap, color: 'text-amber-400' },
    { id: 'smiles', label: 'Smiles', icon: Smile, color: 'text-yellow-400' },
    { id: 'vibes', label: 'Vibes', icon: Heart, color: 'text-rose-400' },
    { id: 'gestures', label: 'Gestures', icon: Hand, color: 'text-teal-400' },
    { id: 'symbols', label: 'Symbols', icon: Sparkles, color: 'text-purple-400' },
  ] as const;

  const filteredEmojis = useMemo(() => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return emojis.filter(e => e.name.toLowerCase().includes(q) || e.character.includes(q));
    }
    return emojis.filter(e => e.category === activeCategory);
  }, [emojis, activeCategory, searchQuery]);

  const getAnimationClass = (animType?: string) => {
    switch (animType) {
      case 'flame':
        return 'animate-flame-flicker inline-block drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]';
      case 'pulse':
        return 'animate-heart-pulse inline-block drop-shadow-[0_0_6px_rgba(244,63,94,0.7)]';
      case 'spin':
        return 'animate-star-spin inline-block drop-shadow-[0_0_6px_rgba(250,204,21,0.7)]';
      case 'bounce':
        return 'animate-emoji-bounce inline-block';
      case 'shake':
        return 'animate-emoji-shake inline-block';
      case 'glow':
        return 'animate-neon-glow inline-block drop-shadow-[0_0_8px_rgba(45,212,191,0.8)]';
      case 'float':
        return 'animate-emoji-float inline-block';
      default:
        return 'animate-heart-pulse inline-block';
    }
  };

  return (
    <div className="w-80 bg-neutral-900/95 border border-neutral-800 rounded-3xl shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden text-white animate-fadeIn select-none z-50">
      {/* Telegram-style top Search & Close */}
      <div className="p-3 border-b border-neutral-800/80 flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Telegram emojis..."
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-teal-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-neutral-500 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Telegram Category Tabs */}
      {!searchQuery && (
        <div className="flex items-center justify-around px-2 py-1.5 border-b border-neutral-800/80 bg-neutral-950/50">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`p-2 rounded-xl transition flex flex-col items-center cursor-pointer ${
                  isActive
                    ? 'bg-neutral-800 text-white shadow-inner scale-105'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
                title={cat.label}
              >
                <Icon className={`w-4 h-4 ${isActive ? cat.color : ''}`} />
                {cat.id === 'animated' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Grid of Emojis */}
      <div className="p-3 overflow-y-auto max-h-56 grid grid-cols-6 gap-2">
        {filteredEmojis.map((emoji) => (
          <button
            key={emoji.id}
            onClick={() => onSelectEmoji(emoji.character)}
            onMouseEnter={() => setHoveredEmoji(emoji)}
            onMouseLeave={() => setHoveredEmoji(null)}
            className="w-10 h-10 rounded-2xl hover:bg-neutral-800/80 flex items-center justify-center text-xl transition transform hover:scale-125 cursor-pointer relative group"
          >
            <span
              className={emoji.is_animated ? getAnimationClass(emoji.animation_type) : ''}
            >
              {emoji.character}
            </span>

            {emoji.is_animated && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400 opacity-60 group-hover:opacity-100" />
            )}
          </button>
        ))}
      </div>

      {/* Bottom Preview Bar (Telegram-style preview of hovered emoji) */}
      <div className="px-3 h-10 min-h-[40px] border-t border-neutral-800/80 bg-neutral-950/80 flex items-center justify-between text-xs">
        {hoveredEmoji ? (
          <div className="flex items-center space-x-2 truncate">
            <span
              className={`text-lg flex-shrink-0 ${hoveredEmoji.is_animated ? getAnimationClass(hoveredEmoji.animation_type) : ''}`}
            >
              {hoveredEmoji.character}
            </span>
            <span className="text-[11px] font-bold text-neutral-300 truncate max-w-[170px]">
              {hoveredEmoji.name}
            </span>
          </div>
        ) : (
          <span className="text-[10px] text-neutral-500 tracking-wide uppercase font-semibold truncate">
            {activeCategory === 'animated' ? '⚡ Tap animated emoji to send' : 'Telegram Emoji Vault'}
          </span>
        )}

        <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold flex-shrink-0">
          Drift_emoji
        </span>
      </div>
    </div>
  );
};
