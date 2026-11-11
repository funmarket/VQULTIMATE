/**
 * Create Vibe Flash Modal Component
 * Allows creators to launch secret after-hours flash events with duration, entry rules, VQ Hunt pools, and 1 event photo.
 */

import React, { useState } from 'react';
import { X, Zap, Sparkles, MapPin, Clock, DollarSign, Shield, Send, Camera } from 'lucide-react';
import { VibeFlashCategory } from '../domains/d13_vibe_flash/types';
import { createVibeFlash } from '../domains/d13_vibe_flash/api';
import { useUser } from '../contexts/UserContext';

interface CreateVibeFlashModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  onRequireAuth?: () => void;
}

const CATEGORIES: VibeFlashCategory[] = [
  'Secret Pop-up',
  'After-Hours',
  'Rooftop / Underground',
  'Live Music / DJ',
  'Flash Meetup',
  'House / Private Vibe'
];

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 900;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string || '');
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export const CreateVibeFlashModal: React.FC<CreateVibeFlashModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  onRequireAuth
}) => {
  const { user } = useUser();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [vibeType, setVibeType] = useState<VibeFlashCategory>('Secret Pop-up');
  const [venueName, setVenueName] = useState('Secret Underground Loft');
  const [address, setAddress] = useState('10 Local Discovery Avenue');
  const [durationMinutes, setDurationMinutes] = useState<number>(120);
  const [entryType, setEntryType] = useState<'Free' | 'Paid' | 'Guestlist / Password'>('Free');
  const [entryPriceTnd, setEntryPriceTnd] = useState('');
  const [entryRules, setEntryRules] = useState('');
  const [parkingNotes, setParkingNotes] = useState('');
  const [vqHuntPool, setVqHuntPool] = useState<number>(0);
  const [maxCapacity, setMaxCapacity] = useState<number>(20);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setPhotoUrl(compressed);
    } catch {
      setErrorMsg('Failed to process uploaded photo.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      if (onRequireAuth) onRequireAuth();
      return;
    }
    if (!title.trim()) {
      setErrorMsg('Please enter a Vibe Flash title.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const res = await createVibeFlash({
      title: title.trim(),
      description: description.trim(),
      vibeType,
      venueName: venueName.trim(),
      address: address.trim(),
      lat: 36.8065,
      lng: 10.1815,
      creatorId: user.id,
      creatorName: user.username || user.full_name || 'Explorer',
      creatorAvatar: user.avatar_url,
      startsAt: new Date().toISOString(),
      durationMinutes,
      entryType,
      entryPriceTnd: entryPriceTnd.trim() || undefined,
      entryRules: entryRules.trim() || undefined,
      parkingTransportNotes: parkingNotes.trim() || undefined,
      photo_url: photoUrl || undefined,
      photos: photoUrl ? [photoUrl] : [],
      vqHuntPool,
      maxCapacity
    });

    setSubmitting(false);
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to create Vibe Flash.');
      return;
    }

    onCreated();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
    >
      <div className="relative w-full max-w-lg bg-[#14101c] border border-fuchsia-500/50 rounded-[28px] overflow-hidden shadow-2xl text-white my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between bg-gradient-to-r from-fuchsia-950/40 via-neutral-900 to-neutral-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/40">
              <Zap className="w-5 h-5 fill-fuchsia-400" />
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-wide">
                Launch ⚡ Vibe Flash
              </h3>
              <p className="text-xs text-neutral-400">
                Drop secret after-hours events or pop-up gatherings
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {errorMsg && (
            <div className="p-3 bg-red-950/60 border border-red-500/40 text-red-200 rounded-xl">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="font-bold text-neutral-300 uppercase tracking-wider">Vibe Category</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setVibeType(cat)}
                  className={`py-2 px-3 rounded-xl border text-left font-bold transition cursor-pointer ${
                    vibeType === cat
                      ? 'border-fuchsia-500 bg-fuchsia-950/50 text-fuchsia-300 shadow-sm'
                      : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-neutral-300 uppercase tracking-wider">Flash Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Rooftop Sunset Synthwave Jam"
              required
              className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-fuchsia-500 text-xs font-semibold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-neutral-300 uppercase tracking-wider">Venue / Location Name</label>
              <input
                type="text"
                value={venueName}
                onChange={e => setVenueName(e.target.value)}
                placeholder="e.g. Secret Rooftop Loft"
                className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-fuchsia-500 text-xs font-semibold"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-neutral-300 uppercase tracking-wider">Address / Area</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="e.g. Medina District"
                className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-fuchsia-500 text-xs font-semibold"
              />
            </div>
          </div>

          {/* Event Photo Input */}
          <div className="space-y-1.5">
            <label className="font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-fuchsia-400" />
              <span>Event Photo (Optional — 1 Photo)</span>
            </label>
            {photoUrl ? (
              <div className="relative w-full h-36 rounded-2xl overflow-hidden border border-fuchsia-500/40">
                <img src={photoUrl} alt="Event preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotoUrl(null)}
                  className="absolute top-2 right-2 px-2.5 py-1 rounded-xl bg-black/80 text-white font-bold text-[10px] hover:bg-red-600 transition cursor-pointer"
                >
                  ✕ Remove Photo
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-neutral-800 hover:border-fuchsia-500/50 rounded-2xl bg-neutral-950/60 cursor-pointer transition">
                <Camera className="w-6 h-6 text-neutral-400 mb-1" />
                <span className="text-[11px] text-neutral-400 font-semibold">Click to upload event photo</span>
                <span className="text-[9px] text-neutral-500">Compressed automatically (JPEG)</span>
                <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              </label>
            )}
          </div>

          <div className="space-y-1">
            <label className="font-bold text-neutral-300 uppercase tracking-wider">Description & Secret Access</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Provide vibe details, directions, or secret password notes..."
              rows={3}
              className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-fuchsia-500 text-xs font-semibold resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-neutral-300 uppercase tracking-wider">Duration</label>
              <select
                value={durationMinutes}
                onChange={e => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-fuchsia-500 text-xs font-semibold cursor-pointer"
              >
                <option value={60}>60 Minutes</option>
                <option value={120}>2 Hours (Default)</option>
                <option value={180}>3 Hours</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-bold text-neutral-300 uppercase tracking-wider">Max Capacity</label>
              <input
                type="number"
                value={maxCapacity}
                onChange={e => setMaxCapacity(Math.max(5, Number(e.target.value)))}
                min={5}
                max={100}
                className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-fuchsia-500 text-xs font-semibold"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider bg-fuchsia-600 hover:bg-fuchsia-500 text-white transition cursor-pointer shadow-lg shadow-fuchsia-600/30 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
          >
            <Send className="w-4 h-4" />
            <span>{submitting ? 'Publishing Flash...' : '🚀 Publish Vibe Flash Now'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
