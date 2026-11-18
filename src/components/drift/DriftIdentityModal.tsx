import React, { useState } from 'react';
import { Sparkles, RefreshCw, Shield, Check, X } from 'lucide-react';
import { generateRandomHandle, DriftRoom } from '../../domains/d15_drift';

interface DriftIdentityModalProps {
  room: DriftRoom;
  initialHandle?: string;
  initialColor?: string;
  initialGender?: 'M' | 'F';
  onConfirm: (handle: string, color: string, gender: 'M' | 'F') => void;
  onClose: () => void;
}

export const DriftIdentityModal: React.FC<DriftIdentityModalProps> = ({
  room,
  initialHandle,
  initialColor,
  initialGender = 'M',
  onConfirm,
  onClose
}) => {
  const [generated, setGenerated] = useState(() => {
    if (initialHandle) {
      return { handle: initialHandle, color: initialColor || '#14b8a6' };
    }
    return generateRandomHandle();
  });
  const [customHandle, setCustomHandle] = useState(initialHandle || '');
  const [selectedColor, setSelectedColor] = useState(initialColor || generated.color);
  const [gender, setGender] = useState<'M' | 'F'>(initialGender);

  const colors = [
    '#06b6d4', '#14b8a6', '#f59e0b', '#ec4899', '#8b5cf6',
    '#10b981', '#f97316', '#3b82f6', '#eab308', '#a855f7'
  ];

  const handleReroll = () => {
    const next = generateRandomHandle();
    setGenerated(next);
    setSelectedColor(next.color);
    setCustomHandle('');
  };

  const currentHandle = customHandle.trim()
    ? (customHandle.trim().startsWith('@') ? customHandle.trim() : `@${customHandle.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')}`)
    : generated.handle;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(currentHandle, selectedColor, gender);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 border border-[#DBDBDB] dark:border-neutral-800 rounded-3xl p-6 space-y-5 shadow-2xl text-[#050505] dark:text-white relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-[#EFEFEF] dark:bg-neutral-800/80 hover:bg-[#E4E6EB] dark:hover:bg-neutral-700 text-[#65676B] dark:text-neutral-400 hover:text-[#050505] dark:hover:text-white transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2 text-[#0866FF] dark:text-teal-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Temporary Drift Identity</span>
          </div>
          <h3 className="font-black text-xl text-[#050505] dark:text-white font-serif">
            {room.name} Identity
          </h3>
          <p className="text-xs text-[#65676B] dark:text-neutral-400 leading-relaxed">
            Choose your anonymous temporary handle and gender identity.
          </p>
        </div>

        {/* Alias Identity Card Preview (Circle border removed) */}
        <div className="rounded-2xl bg-[#F0F2F5] dark:bg-neutral-950 border border-[#E4E6EB] dark:border-neutral-800 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3.5 min-w-0">
            {/* Mask Icon only without circle border */}
            <span className="text-3xl flex-shrink-0 select-none">🎭</span>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <p className="text-[10px] text-[#65676B] dark:text-neutral-400 uppercase tracking-widest font-bold">Your Drift Alias</p>
                <span
                  className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                    gender === 'F'
                      ? 'text-pink-700 dark:text-pink-300 bg-pink-50 dark:bg-pink-950/80 border border-pink-200 dark:border-pink-500/40'
                      : 'text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/80 border border-cyan-200 dark:border-cyan-500/40'
                  }`}
                >
                  {gender === 'F' ? '♀ Female (F)' : '♂ Male (M)'}
                </span>
              </div>
              <h4 className="font-bold text-base text-[#050505] dark:text-white tracking-wide truncate" style={{ color: selectedColor }}>
                {currentHandle}
              </h4>
            </div>
          </div>

          <button
            type="button"
            onClick={handleReroll}
            className="p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-[#DBDBDB] dark:border-neutral-800 text-[#0866FF] dark:text-teal-400 hover:text-[#075CE5] dark:hover:text-white hover:border-[#0866FF]/50 dark:hover:border-teal-500/50 transition cursor-pointer flex-shrink-0 ml-2"
            title="Generate random handle"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Form Controls */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Custom Handle Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#262626] dark:text-neutral-300">Choose Handle</label>
            <input
              type="text"
              value={customHandle}
              onChange={(e) => setCustomHandle(e.target.value)}
              placeholder="e.g. @velvet_nomad"
              maxLength={24}
              className="w-full bg-[#F0F2F5] dark:bg-neutral-950 border border-[#DBDBDB] dark:border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-[#050505] dark:text-white placeholder-[#65676B] dark:placeholder-neutral-500 focus:outline-none focus:border-[#0866FF] dark:focus:border-teal-500"
            />
          </div>

          {/* Gender Selector: M or F */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#262626] dark:text-neutral-300">Choose Gender</label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setGender('M')}
                className={`py-2.5 px-3 rounded-2xl border font-bold text-xs flex items-center justify-center space-x-2 transition cursor-pointer ${
                  gender === 'M'
                    ? 'bg-cyan-50 dark:bg-cyan-500/20 border-cyan-500 dark:border-cyan-400 text-cyan-700 dark:text-cyan-300 shadow-sm dark:shadow-md dark:shadow-cyan-500/20 ring-1 ring-cyan-500 dark:ring-cyan-400'
                    : 'bg-[#FAFAFA] dark:bg-neutral-950 border-[#E4E6EB] dark:border-neutral-800 text-[#65676B] dark:text-neutral-400 hover:text-[#050505] dark:hover:text-white hover:border-[#DBDBDB] dark:hover:border-neutral-700'
                }`}
              >
                <span className="text-sm">♂</span>
                <span>Male</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-900/60 font-mono text-cyan-800 dark:text-cyan-300 font-bold">M</span>
              </button>

              <button
                type="button"
                onClick={() => setGender('F')}
                className={`py-2.5 px-3 rounded-2xl border font-bold text-xs flex items-center justify-center space-x-2 transition cursor-pointer ${
                  gender === 'F'
                    ? 'bg-pink-50 dark:bg-pink-500/20 border-pink-500 dark:border-pink-400 text-pink-700 dark:text-pink-300 shadow-sm dark:shadow-md dark:shadow-pink-500/20 ring-1 ring-pink-500 dark:ring-pink-400'
                    : 'bg-[#FAFAFA] dark:bg-neutral-950 border-[#E4E6EB] dark:border-neutral-800 text-[#65676B] dark:text-neutral-400 hover:text-[#050505] dark:hover:text-white hover:border-[#DBDBDB] dark:hover:border-neutral-700'
                }`}
              >
                <span className="text-sm">♀</span>
                <span>Female</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-pink-100 dark:bg-pink-900/60 font-mono text-pink-800 dark:text-pink-300 font-bold">F</span>
              </button>
            </div>
          </div>

          {/* Color Picker */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#262626] dark:text-neutral-300">Aura Accent Color</label>
            <div className="flex items-center space-x-2 overflow-x-auto py-1">
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedColor(c)}
                  className={`w-7 h-7 rounded-full flex-shrink-0 transition-all ${
                    selectedColor === c ? 'scale-125 ring-2 ring-[#0866FF] dark:ring-white ring-offset-2 ring-offset-white dark:ring-offset-neutral-900' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Privacy Note */}
          <div className="rounded-xl bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/20 p-3 flex items-start space-x-2.5">
            <Shield className="w-4 h-4 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-teal-800 dark:text-teal-200/90 leading-relaxed">
              Anonymous Drift Mode active. Real identities stay encrypted until both participants reciprocate a mutual Vibe reveal.
            </p>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-teal-500 via-cyan-500 to-emerald-500 text-neutral-950 font-black text-sm shadow-xl shadow-teal-500/20 hover:opacity-95 transition flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Apply Drift Identity</span>
          </button>
        </form>
      </div>
    </div>
  );
};
