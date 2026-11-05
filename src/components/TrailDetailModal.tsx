import React, { useState } from 'react';
import {
  X, MapPin, Clock, Route, Award, Navigation, GitFork, Bookmark,
  Share2, CheckCircle2, ChevronRight, Sparkles, Shield, Compass
} from 'lucide-react';
import { CulturalTrail, TrailWaypoint } from '../domains/d07_trails';

interface TrailDetailModalProps {
  trail: CulturalTrail;
  onClose: () => void;
  onStartNavigation?: (trail: CulturalTrail) => void;
  onCheckInWaypoint?: (waypoint: TrailWaypoint, trail: CulturalTrail) => void;
  onToast?: (message: string) => void;
}

export const TrailDetailModal: React.FC<TrailDetailModalProps> = ({
  trail,
  onClose,
  onStartNavigation,
  onCheckInWaypoint,
  onToast
}) => {
  const [completedStops, setCompletedStops] = useState<Set<string>>(new Set());
  const [isSaved, setIsSaved] = useState(false);
  const [isRemixed, setIsRemixed] = useState(false);
  const [remixCount, setRemixCount] = useState(trail.remix_count || 12);

  const waypoints = trail.waypoints || [];

  const handleCheckIn = (wp: TrailWaypoint) => {
    setCompletedStops((prev) => {
      const next = new Set(prev);
      next.add(wp.id);
      return next;
    });
    if (onCheckInWaypoint) {
      onCheckInWaypoint(wp, trail);
    } else if (onToast) {
      onToast(`Checked in at "${wp.title}"! Claimed +${wp.vq_reward} VQ.`);
    }
  };

  const handleToggleSave = () => {
    setIsSaved(!isSaved);
    if (onToast) {
      onToast(!isSaved ? 'Trail saved to your Pocket!' : 'Trail removed from Pocket.');
    }
  };

  const handleRemix = () => {
    if (!isRemixed) {
      setIsRemixed(true);
      setRemixCount(remixCount + 1);
      if (onToast) {
        onToast(`Trail remixed! Created derivative branch attributed to ${trail.guardian_name}.`);
      }
    } else if (onToast) {
      onToast('You have already adopted this trail derivative.');
    }
  };

  const handleShare = () => {
    if (onToast) {
      onToast(`Trail link for "${trail.title}" copied to clipboard!`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
      <div className="w-full sm:max-w-lg bg-neutral-900 border border-neutral-800 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl text-white max-h-[90vh] flex flex-col">
        {/* Hero Image Header */}
        <div className="relative h-60 w-full bg-neutral-950 flex-shrink-0">
          <img
            src={trail.image_url}
            alt={trail.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/40 to-transparent" />

          {/* Close Button */}
          <button
            onClick={onClose}
            aria-label="Close Trail Modal"
            className="absolute top-4 right-4 p-2 rounded-full bg-neutral-950/70 text-white hover:bg-neutral-900 transition backdrop-blur-md border border-white/10 cursor-pointer z-10"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Badges on Top */}
          <div className="absolute top-4 left-4 flex items-center space-x-2 z-10">
            <span className="px-3 py-1 rounded-full bg-neutral-950/80 text-amber-300 font-black text-[10px] uppercase tracking-wider backdrop-blur-md border border-amber-500/30">
              {trail.category || 'Cultural Heritage'}
            </span>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border ${
              trail.difficulty === 'Easy' ? 'bg-emerald-500/30 text-emerald-300 border-emerald-500/40' :
              trail.difficulty === 'Moderate' ? 'bg-orange-500/30 text-orange-300 border-orange-500/40' :
              'bg-purple-500/30 text-purple-300 border-purple-500/40'
            }`}>
              {trail.difficulty}
            </span>
          </div>

          {/* Title & Stats Overlay */}
          <div className="absolute bottom-4 left-4 right-4 z-10 space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow-md">
              {trail.title}
            </h2>
            <div className="flex items-center space-x-3 text-xs text-neutral-300">
              <span className="flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-teal-400" />
                <span>{trail.duration_mins} mins</span>
              </span>
              <span>•</span>
              <span className="flex items-center space-x-1">
                <Route className="w-3.5 h-3.5 text-orange-400" />
                <span>{trail.distance_km || 2.4} km</span>
              </span>
              <span>•</span>
              <span className="text-amber-300 font-black bg-amber-500/20 px-2 py-0.5 rounded-lg border border-amber-500/30">
                +{trail.vq_reward} VQ
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Curator Attributed Card */}
          <div className="rounded-2xl bg-neutral-950/80 border border-neutral-800 p-3.5 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img
                src={trail.guardian_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                alt={trail.guardian_name}
                className="w-11 h-11 rounded-full object-cover border-2 border-orange-500/50"
              />
              <div>
                <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">Curated by District Guardian</span>
                <h4 className="font-bold text-sm text-white">{trail.guardian_name}</h4>
                <p className="text-[11px] text-teal-400">{trail.guardian_handle || '@guardian'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-1 text-xs text-neutral-400 bg-neutral-900 px-2.5 py-1 rounded-xl border border-neutral-800">
              <GitFork className="w-3.5 h-3.5 text-teal-400" />
              <span>{remixCount} Remixes</span>
            </div>
          </div>

          {/* Overview & Story Description */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Trail Narrative & Story</h4>
            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed bg-neutral-950/40 p-3 rounded-2xl border border-neutral-800/60">
              {trail.description}
            </p>
          </div>

          {/* Sequential Ordered Waypoints / Stops */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center space-x-1.5">
                <Compass className="w-4 h-4 text-teal-400" />
                <span>Sequential Waypoints ({waypoints.length} Stops)</span>
              </h4>
              <span className="text-[10px] text-emerald-400 font-semibold">
                {completedStops.size} of {waypoints.length} Completed
              </span>
            </div>

            <div className="space-y-2.5">
              {waypoints.map((wp, index) => {
                const isChecked = completedStops.has(wp.id);
                return (
                  <div
                    key={wp.id}
                    className={`rounded-2xl border p-3.5 space-y-2 transition ${
                      isChecked
                        ? 'bg-emerald-950/20 border-emerald-500/40'
                        : 'bg-neutral-950/60 border-neutral-800 hover:border-teal-500/40'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-2.5">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5 ${
                          isChecked
                            ? 'bg-emerald-500 text-neutral-950'
                            : 'bg-neutral-800 text-teal-300 border border-teal-500/30'
                        }`}>
                          {isChecked ? '✓' : index + 1}
                        </span>
                        <div>
                          <h5 className="font-bold text-xs text-white">{wp.title}</h5>
                          <p className="text-[11px] text-neutral-400 mt-0.5 leading-normal">{wp.description}</p>
                          {wp.hint && (
                            <p className="text-[10px] text-amber-300/90 italic mt-1">
                              💡 Hint: {wp.hint}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 flex-shrink-0 ml-2">
                        +{wp.vq_reward} VQ
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-neutral-800/60 text-[10px] text-neutral-500">
                      <span>
                        Coordinates:{' '}
                        {wp.lat !== undefined && wp.lng !== undefined
                          ? `${wp.lat.toFixed(4)}, ${wp.lng.toFixed(4)}`
                          : 'Guided Waypoint'}
                      </span>
                      <button
                        onClick={() => handleCheckIn(wp)}
                        disabled={isChecked}
                        className={`px-3 py-1 rounded-xl font-bold transition flex items-center space-x-1 cursor-pointer ${
                          isChecked
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-neutral-800 hover:bg-teal-500/20 text-neutral-300 hover:text-teal-300 border border-neutral-700'
                        }`}
                      >
                        {isChecked ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Stop Verified</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3 text-orange-400" />
                            <span>Check-In Stop</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className="p-4 bg-neutral-950 border-t border-neutral-800 space-y-3 flex-shrink-0">
          <div className="grid grid-cols-3 gap-2">
            {/* Save / Pocket Button */}
            <button
              onClick={handleToggleSave}
              className={`py-2.5 rounded-2xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer border ${
                isSaved
                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/50'
                  : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-800'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-teal-400 text-teal-400' : ''}`} />
              <span>{isSaved ? 'In Pocket' : 'Save'}</span>
            </button>

            {/* Remix / Adopt Derivative Button */}
            <button
              onClick={handleRemix}
              className={`py-2.5 rounded-2xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer border ${
                isRemixed
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/50'
                  : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-800'
              }`}
            >
              <GitFork className="w-3.5 h-3.5 text-purple-400" />
              <span>{isRemixed ? 'Adopted' : 'Remix'}</span>
            </button>

            {/* Share Button */}
            <button
              onClick={handleShare}
              className="py-2.5 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
          </div>

          {/* Primary Action: Start Navigation */}
          <button
            onClick={() => {
              if (onStartNavigation) {
                onStartNavigation(trail);
              }
              onClose();
            }}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-teal-500 text-neutral-950 font-black text-sm shadow-xl shadow-orange-500/25 flex items-center justify-center space-x-2 hover:opacity-95 transition cursor-pointer"
          >
            <Navigation className="w-4 h-4 fill-neutral-950" />
            <span>Start Trail Navigation (+{trail.vq_reward} VQ)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
