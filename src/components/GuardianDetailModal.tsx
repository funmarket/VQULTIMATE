import React, { useState, useEffect } from 'react';
import {
  X, Shield, Award, MapPin, Compass, Radio, Zap, Check, AlertCircle,
  Route, Clock, Sparkles, Navigation, ChevronRight, ExternalLink
} from 'lucide-react';
import { VibeGuardian, CulturalTrail } from '../domains/d07_trails';
import { UserProfile } from '../domains/d01_auth';
import { followUser, unfollowUser, checkIsFollowing } from '../domains/d03_social_graph';
import { sendConnectionPull } from '../domains/d17_matching';

interface GuardianDetailModalProps {
  guardian: VibeGuardian;
  currentUser: UserProfile | null;
  trails: CulturalTrail[];
  onClose: () => void;
  onSelectTrail?: (trail: CulturalTrail) => void;
  onLocateMap?: (guardian: VibeGuardian) => void;
  onRequireAuth?: () => void;
  onToast?: (message: string) => void;
}

export const GuardianDetailModal: React.FC<GuardianDetailModalProps> = ({
  guardian,
  currentUser,
  trails,
  onClose,
  onSelectTrail,
  onLocateMap,
  onRequireAuth,
  onToast
}) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [pullPending, setPullPending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const cleanHandle = guardian.handle.replace(/^@/, '');
  const isSelf = currentUser?.id === guardian.id || (currentUser?.username && currentUser.username === cleanHandle);

  useEffect(() => {
    if (currentUser?.id && guardian.id && !isSelf) {
      checkIsFollowing(currentUser.id, guardian.id).then(setIsFollowing);
    }
  }, [currentUser, guardian.id, isSelf]);

  // Find trails curated by this guardian
  const curatedTrails = trails.filter(
    (t) =>
      t.guardian_name.toLowerCase() === guardian.name.toLowerCase() ||
      (t.guardian_handle && t.guardian_handle.toLowerCase() === guardian.handle.toLowerCase()) ||
      guardian.curated_trail_ids?.includes(t.id)
  );

  const handleEcho = async () => {
    setFeedbackError(null);
    if (!currentUser) {
      setFeedbackError('Guests must authenticate before protected social actions.');
      if (onRequireAuth) onRequireAuth();
      return;
    }
    if (isSelf) {
      setFeedbackError('You cannot ECHO your own guardian identity.');
      return;
    }

    setLoading(true);
    if (isFollowing) {
      const res = await unfollowUser(currentUser.id, guardian.id);
      if (res.success) {
        setIsFollowing(false);
        if (onToast) onToast(`Removed ${guardian.handle} from your Orbit.`);
      } else {
        setFeedbackError(res.error || 'Failed to unfollow.');
      }
    } else {
      const res = await followUser(currentUser.id, guardian.id);
      if (res.success) {
        setIsFollowing(true);
        if (onToast) onToast(`ECHO active! ${guardian.handle} added to your Orbit.`);
      } else {
        setFeedbackError(res.error || 'Failed to ECHO guardian.');
      }
    }
    setLoading(false);
  };

  const handlePull = async () => {
    setFeedbackError(null);
    if (!currentUser) {
      setFeedbackError('Guests must authenticate before protected social actions.');
      if (onRequireAuth) onRequireAuth();
      return;
    }
    if (isSelf) {
      setFeedbackError('You cannot send a connection PULL to yourself.');
      return;
    }

    setLoading(true);
    const res = await sendConnectionPull(currentUser.id, guardian.id);
    if (res.success) {
      setPullPending(true);
      if (onToast) onToast(`Connection PULL sent to ${guardian.name}! An accepted Vibe unlocks D14 1:1 DMs.`);
    } else {
      setFeedbackError(res.error || 'Failed to send PULL.');
    }
    setLoading(false);
  };

  const handleLocate = () => {
    if (onLocateMap) {
      onLocateMap(guardian);
      if (onToast) onToast(`Radar locked onto ${guardian.name}'s patrol sector.`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="w-full max-w-sm sm:max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl text-white relative my-6">
        {/* Floating Close Button */}
        <button
          onClick={onClose}
          aria-label="Close Guardian Modal"
          className="absolute top-4 right-4 z-30 p-2 rounded-full bg-neutral-950/80 backdrop-blur-md border border-white/10 hover:bg-neutral-800 text-white/80 hover:text-white transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Hero Photo & Sentinel Credentials */}
        <div className="relative aspect-[4/3] w-full bg-neutral-950 overflow-hidden">
          <img
            src={guardian.avatar_url}
            alt={guardian.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/40 to-transparent" />

          {/* Status & Tier Badges Overlay */}
          <div className="absolute top-4 left-4 flex flex-col space-y-1.5 z-20">
            <span className="px-3 py-1 rounded-full bg-emerald-500/90 text-neutral-950 font-black text-[10px] uppercase tracking-wider backdrop-blur-md flex items-center space-x-1.5 shadow-lg">
              <span className="w-2 h-2 rounded-full bg-neutral-950 animate-pulse" />
              <span>{guardian.status === 'patrolling' ? 'PATROLLING' : 'ON DUTY'}</span>
            </span>
            <span className="px-3 py-1 rounded-full bg-neutral-900/80 text-amber-300 font-bold text-[10px] uppercase tracking-wider backdrop-blur-md border border-amber-500/30 flex items-center space-x-1">
              <Shield className="w-3 h-3 text-amber-400" />
              <span>{guardian.tier || 'PRO GUARDIAN'}</span>
            </span>
          </div>

          {/* Name & Identity over photo */}
          <div className="absolute bottom-3 left-4 right-4 z-20 space-y-0.5">
            <h3 className="font-black text-xl text-white tracking-tight drop-shadow-md">
              {guardian.name}
            </h3>
            <p className="text-xs text-teal-300 font-mono drop-shadow">{guardian.handle}</p>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* Trust Score & District Row */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-1 text-teal-300 font-bold bg-teal-500/10 px-3 py-1.5 rounded-xl border border-teal-500/30">
              <Award className="w-3.5 h-3.5 text-teal-400" />
              <span>Trust Rating: {guardian.trust_score}%</span>
            </div>
            <div className="flex items-center space-x-1 text-orange-400 font-bold bg-orange-500/10 px-3 py-1.5 rounded-xl border border-orange-500/30">
              <MapPin className="w-3.5 h-3.5" />
              <span className="truncate max-w-[150px]">{guardian.district}</span>
            </div>
          </div>

          {/* Bio Quote */}
          {guardian.bio && (
            <div className="bg-neutral-950/80 border border-neutral-800 rounded-2xl p-3.5 text-xs text-neutral-300 leading-relaxed italic">
              &ldquo;{guardian.bio}&rdquo;
            </div>
          )}

          {/* Guardian Credentials Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {guardian.specialty && (
              <div className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-800/80">
                <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold block">Specialty</span>
                <span className="font-semibold text-white truncate block text-[11px] mt-0.5">{guardian.specialty}</span>
              </div>
            )}
            <div className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-800/80">
              <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold block">Consensus Level</span>
              <span className="font-semibold text-amber-300 truncate block text-[11px] mt-0.5">District Sentinel</span>
            </div>
          </div>

          {/* Curated Trails Section */}
          <div className="space-y-2 pt-1 border-t border-neutral-800">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center space-x-1.5">
                <Route className="w-3.5 h-3.5 text-teal-400" />
                <span>Curated Cultural Trails ({curatedTrails.length})</span>
              </h4>
            </div>

            {curatedTrails.length > 0 ? (
              <div className="space-y-2">
                {curatedTrails.map((trail) => (
                  <div
                    key={trail.id}
                    onClick={() => {
                      if (onSelectTrail) onSelectTrail(trail);
                    }}
                    className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 hover:border-teal-500/50 transition cursor-pointer flex items-center space-x-3 group"
                  >
                    <img
                      src={trail.image_url}
                      alt={trail.title}
                      className="w-12 h-12 rounded-xl object-cover flex-shrink-0 group-hover:scale-105 transition"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-teal-400">{trail.difficulty}</span>
                        <span className="text-xs font-bold text-amber-300">+{trail.vq_reward} VQ</span>
                      </div>
                      <h5 className="font-bold text-xs text-white truncate group-hover:text-teal-300 transition">
                        {trail.title}
                      </h5>
                      <span className="text-[10px] text-neutral-400 flex items-center space-x-1 mt-0.5">
                        <Clock className="w-3 h-3 text-orange-400" />
                        <span>{trail.duration_mins} mins</span>
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-teal-400 group-hover:translate-x-0.5 transition" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-neutral-500 italic p-2 bg-neutral-950 rounded-xl border border-neutral-800 text-center">
                This guardian is actively charting their next historical trail.
              </p>
            )}
          </div>

          {feedbackError && (
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center space-x-1.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{feedbackError}</span>
            </div>
          )}

          {/* Primary Action Buttons */}
          <div className="space-y-2 pt-2">
            <div className="grid grid-cols-2 gap-2">
              {/* ECHO Button: D03 One-Way Follow */}
              <button
                onClick={handleEcho}
                disabled={loading}
                className={`py-3 rounded-2xl font-black text-xs transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                  isFollowing
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/50'
                    : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700'
                }`}
                title="ECHO: One-way follow into your Orbit"
              >
                {isFollowing ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-teal-400" />
                    <span>ECHOED (Orbit)</span>
                  </>
                ) : (
                  <>
                    <Radio className="w-3.5 h-3.5 text-teal-400" />
                    <span>ECHO (Follow)</span>
                  </>
                )}
              </button>

              {/* PULL Button: D17 Mutual Vibe Connection Request */}
              <button
                onClick={handlePull}
                disabled={loading || pullPending}
                className={`py-3 rounded-2xl font-black text-xs shadow-lg transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                  pullPending
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                    : 'bg-gradient-to-r from-orange-500 to-teal-500 text-white hover:opacity-90 shadow-orange-500/20'
                }`}
                title="PULL: Mutual Vibe connection request. When accepted, unlocks D14 1:1 DMs."
              >
                {pullPending ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-amber-400" />
                    <span>PULL Sent</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>PULL (Vibe)</span>
                  </>
                )}
              </button>
            </div>

            {/* Locate on Map Button */}
            {onLocateMap && (
              <button
                onClick={handleLocate}
                className="w-full py-2.5 rounded-2xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-orange-500/40 text-neutral-300 hover:text-white transition cursor-pointer flex items-center justify-center space-x-2 text-xs font-bold"
              >
                <Compass className="w-3.5 h-3.5 text-orange-400" />
                <span>Locate Patrol Sector on Radar</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
