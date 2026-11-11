/**
 * Create Meetup Modal Component
 * Allows creating pop-up venue gatherings with live/scheduled options, description, and 1 optional photo.
 */

import React, { useState } from 'react';
import { X, Users, Calendar, MapPin, Radio, CheckCircle2, Camera } from 'lucide-react';
import { VibePlace } from '../domains/d03_vibe_orbit/types';
import { createPlaceMeetup } from '../domains/d12_meetups/api';
import { PlaceMeetup } from '../domains/d12_meetups/types';
import { useUser } from '../contexts/UserContext';

interface CreateMeetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  place: VibePlace;
  onCreated?: (meetup: PlaceMeetup) => void;
}

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

export const CreateMeetupModal: React.FC<CreateMeetupModalProps> = ({
  isOpen,
  onClose,
  place,
  onCreated
}) => {
  const { user } = useUser();
  const [isLiveCheckin, setIsLiveCheckin] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 2);
    d.setMinutes(0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdMeetup, setCreatedMeetup] = useState<PlaceMeetup | null>(null);

  if (!isOpen) return null;

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setPhotoUrl(compressed);
    } catch {
      setError('Failed to process meetup photo.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a meetup title or topic.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const hostUserId = user?.id || 'usr_anonymous';
    const hostName = user?.username || user?.full_name || 'Vibe Explorer';
    const hostAvatar = user?.avatar_url;

    try {
      const scheduledAt = isLiveCheckin
        ? new Date().toISOString()
        : new Date(scheduledDate).toISOString();

      const res = await createPlaceMeetup({
        placeId: place.id,
        placeTitle: place.title,
        placeAddress: place.address || '',
        placeCategory: (place as any).categoryLabel || place.category || 'Spots',
        hostUserId,
        hostName,
        hostAvatar,
        title: title.trim(),
        description: description.trim() || undefined,
        scheduledAt,
        isLiveCheckin,
        photo_url: photoUrl || undefined
      });

      if (res.success && res.meetup) {
        setCreatedMeetup(res.meetup);
        if (onCreated) {
          onCreated(res.meetup);
        }
        setTimeout(() => {
          setCreatedMeetup(null);
          onClose();
        }, 1400);
      } else {
        setError(res.error || 'Failed to create meetup');
      }
    } catch (err: any) {
      setError(err?.message || 'Error publishing meetup');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-lg bg-[#0d111a] border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden border-t-2 border-t-blue-500">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Organize Spot Meetup
              </h3>
              <p className="text-xs text-neutral-400 truncate max-w-[280px]">
                {place.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close create meetup modal"
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {createdMeetup ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/40">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-white">Meetup Published!</h4>
            <p className="text-sm text-neutral-300">
              Your meetup is now active in this spot's Meetup tab, your profile, and the community feeds.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
            {error && (
              <div className="p-3 text-xs bg-red-950/50 border border-red-500/40 text-red-200 rounded-xl">
                {error}
              </div>
            )}

            {/* Mode selection: Live Now vs Scheduled */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-900/80 rounded-xl border border-neutral-800">
              <button
                type="button"
                onClick={() => setIsLiveCheckin(false)}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition ${
                  !isLiveCheckin
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Scheduled Meetup</span>
              </button>
              <button
                type="button"
                onClick={() => setIsLiveCheckin(true)}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition ${
                  isLiveCheckin
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>Live Now (I'm Here)</span>
              </button>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                Meetup Title / Topic *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Afternoon Latte & Tech Chat, Casual Drinks..."
                maxLength={60}
                required
                className="w-full px-3.5 py-2.5 text-sm bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Date/Time if not live */}
            {!isLiveCheckin && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            )}

            {/* Meetup Photo Upload */}
            <div className="space-y-1.5">
              <label className="font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-blue-400" />
                <span>Meetup Photo (Optional — 1 Photo)</span>
              </label>
              {photoUrl ? (
                <div className="relative w-full h-32 rounded-xl overflow-hidden border border-blue-500/40">
                  <img src={photoUrl} alt="Meetup preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotoUrl(null)}
                    className="absolute top-2 right-2 px-2.5 py-1 rounded-xl bg-black/80 text-white font-bold text-[10px] hover:bg-red-600 transition cursor-pointer"
                  >
                    ✕ Remove Photo
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-neutral-800 hover:border-blue-500/50 rounded-xl bg-neutral-950/60 cursor-pointer transition">
                  <Camera className="w-5 h-5 text-neutral-400 mb-1" />
                  <span className="text-[11px] text-neutral-400 font-semibold">Upload meetup photo</span>
                  <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                </label>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                Details / Where to find us
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Look for the yellow notebook by the outdoor patio. Everyone welcome!"
                rows={2}
                className="w-full px-3.5 py-2.5 text-sm bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            {/* Location context reminder */}
            <div className="p-3 bg-neutral-900/60 border border-neutral-800/80 rounded-xl flex items-center gap-2 text-xs text-neutral-400">
              <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="truncate">{place.address || place.title}</span>
            </div>

            {/* Submit */}
            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl text-sm font-semibold bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-[2] py-3 px-4 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-500 transition shadow-lg shadow-blue-600/20 disabled:opacity-50"
              >
                {submitting ? 'Creating Meetup...' : isLiveCheckin ? 'Start Live Meetup' : 'Publish Meetup'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
