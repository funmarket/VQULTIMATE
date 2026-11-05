import React from 'react';
import { X, MapPin, Sparkles, Coins, Navigation } from 'lucide-react';
import { VibePlace } from '../domains/d03_vibe_orbit';

interface PlaceDetailModalProps {
  place: VibePlace;
  onClose: () => void;
  onCheckIn: (place: VibePlace) => void;
}

export const PlaceDetailModal: React.FC<PlaceDetailModalProps> = ({ place, onClose, onCheckIn }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl text-white space-y-4">
        {/* Header Image */}
        <div className="relative h-64 w-full">
          <img src={place.image_url} alt={place.title} className="w-full h-full object-cover" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-neutral-950/80 text-white hover:bg-neutral-900 transition"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
            <span className="px-3 py-1 rounded-full bg-teal-500/90 text-neutral-950 font-bold text-xs uppercase tracking-wider backdrop-blur-md">
              {place.category}
            </span>
            <span className="px-3 py-1 rounded-full bg-amber-500/90 text-neutral-950 font-bold text-xs backdrop-blur-md flex items-center space-x-1">
              <Coins className="w-3.5 h-3.5" />
              <span>+{place.vq_reward} VQ</span>
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <h2 className="text-xl font-black text-white">{place.title}</h2>
            <p className="text-xs text-neutral-400 flex items-center space-x-1 mt-1">
              <MapPin className="w-3.5 h-3.5 text-orange-400" />
              <span>{place.address}</span>
            </p>
          </div>

          <p className="text-sm text-neutral-300 leading-relaxed">{place.description}</p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="rounded-2xl bg-neutral-950/60 border border-neutral-800 p-3">
              <span className="text-[10px] text-neutral-400">Pulse Intensity</span>
              <p className="text-base font-bold text-orange-400 mt-0.5">{place.pulse_intensity}/10 Active</p>
            </div>
            <div className="rounded-2xl bg-neutral-950/60 border border-neutral-800 p-3">
              <span className="text-[10px] text-neutral-400">Curated By</span>
              <p className="text-base font-bold text-teal-400 mt-0.5">@{place.created_by}</p>
            </div>
          </div>

          <button
            onClick={() => {
              onCheckIn(place);
              onClose();
            }}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-teal-500 text-white font-bold text-sm shadow-xl shadow-orange-500/25 flex items-center justify-center space-x-2 transition hover:opacity-90"
          >
            <Sparkles className="w-4 h-4" />
            <span>Check-In & Claim +{place.vq_reward} VQ</span>
          </button>
        </div>
      </div>
    </div>
  );
};
