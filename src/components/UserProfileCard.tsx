import React, { useState, useEffect } from 'react';
import { X, Award, Shield, Coins, MapPin, Check, AlertCircle } from 'lucide-react';
import { UserProfile } from '../domains/d02_users';
import { followUser, unfollowUser, checkIsFollowing } from '../domains/d03_social_graph';
import { sendConnectionPull } from '../domains/d17_matching';

interface UserProfileCardProps {
  profile: UserProfile;
  currentUser: UserProfile | null;
  onClose: () => void;
  onRequireAuth?: () => void;
  onToast?: (message: string) => void;
}

export const UserProfileCard: React.FC<UserProfileCardProps> = ({
  profile,
  currentUser,
  onClose,
  onRequireAuth,
  onToast
}) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [pullPending, setPullPending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const isSelf = currentUser?.id === profile.id || (currentUser?.username && currentUser.username === profile.username);

  useEffect(() => {
    if (currentUser?.id && profile.id && !isSelf) {
      checkIsFollowing(currentUser.id, profile.id).then(setIsFollowing);
    }
  }, [currentUser, profile.id, isSelf]);

  const handleEcho = async () => {
    setFeedbackError(null);
    if (!currentUser) {
      setFeedbackError('Guests must authenticate before protected social actions.');
      if (onRequireAuth) onRequireAuth();
      return;
    }
    if (isSelf) {
      setFeedbackError('Users cannot ECHO themselves.');
      return;
    }

    setLoading(true);
    if (isFollowing) {
      const res = await unfollowUser(currentUser.id, profile.id);
      if (res.success) {
        setIsFollowing(false);
        if (onToast) onToast(`Removed @${profile.username} from your Orbit.`);
      } else {
        setFeedbackError(res.error || 'Failed to unfollow.');
      }
    } else {
      const res = await followUser(currentUser.id, profile.id);
      if (res.success) {
        setIsFollowing(true);
        if (onToast) onToast(`ECHO active! @${profile.username} added to your Orbit (one-way follow).`);
      } else {
        setFeedbackError(res.error || 'Failed to ECHO user.');
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
      setFeedbackError('Users cannot PULL themselves.');
      return;
    }

    setLoading(true);
    const res = await sendConnectionPull(currentUser.id, profile.id);
    if (res.success) {
      setPullPending(true);
      if (onToast) onToast(`Connection PULL sent to @${profile.username}! An accepted Vibe unlocks D14 1:1 DMs.`);
    } else {
      setFeedbackError(res.error || 'Failed to send PULL.');
    }
    setLoading(false);
  };

  const avatar = profile.avatar_url;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl text-white relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close Profile Card"
          className="absolute top-4 right-4 z-20 text-xs text-white/80 hover:text-white p-2 rounded-full bg-neutral-950/70 backdrop-blur-md border border-white/10 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Photo-First Hero Section */}
        <div className="relative aspect-[4/4.5] w-full bg-neutral-950 overflow-hidden">
          {avatar ? (
            <img src={avatar} alt={profile.full_name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-neutral-900 text-neutral-500">
              <span className="text-5xl" aria-hidden="true">👤</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/40 to-transparent" />

          {/* Badges Overlay */}
          <div className="absolute top-4 left-4 flex flex-col space-y-1.5 z-10">
            {profile.role === 'admin' ? (
              <span className="px-3 py-1 rounded-full bg-orange-500/90 text-neutral-950 font-black text-[10px] uppercase tracking-wider backdrop-blur-md flex items-center space-x-1 shadow-lg">
                <Shield className="w-3 h-3" />
                <span>SOLE ADMIN</span>
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-neutral-900/80 text-amber-300 font-bold text-[10px] uppercase tracking-wider backdrop-blur-md border border-amber-500/30">
                {profile.role === 'guardian' ? 'GUARDIAN' : 'EXPLORER'}
              </span>
            )}
          </div>

          {/* Identity on photo */}
          <div className="absolute bottom-3 left-4 right-4 z-10 space-y-1">
            <h3 className="font-black text-xl text-white tracking-tight drop-shadow-md">
              {profile.full_name}
            </h3>
            <p className="text-xs text-teal-300 font-mono drop-shadow">@{profile.username}</p>
          </div>
        </div>

        {/* Profile Details */}
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[11px] text-amber-300 font-bold flex items-center space-x-1.5 bg-amber-500/10 px-3 py-1 rounded-xl border border-amber-500/30">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>{profile.vq_balance} VQ</span>
            </span>
            {typeof profile.trust_score === 'number' && (
              <span className="text-[11px] text-teal-300 font-bold flex items-center space-x-1 bg-teal-500/10 px-3 py-1 rounded-xl border border-teal-500/30">
                <Award className="w-3.5 h-3.5 text-teal-400" />
                <span>Trust {profile.trust_score}%</span>
              </span>
            )}
          </div>

          {profile.bio && (
            <p className="text-xs text-neutral-300 italic bg-neutral-950/80 p-3 rounded-2xl border border-neutral-800 leading-relaxed">
              &ldquo;{profile.bio}&rdquo;
            </p>
          )}

          {profile.interests && profile.interests.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {profile.interests.map(tag => (
                <span key={tag} className="px-2 py-1 text-[11px] rounded-xl border border-neutral-700 bg-neutral-800 text-neutral-300">{tag}</span>
              ))}
            </div>
          )}

          <div className="text-[11px] text-neutral-400 flex items-center justify-between px-1">
            <span className="flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5 text-orange-400" />
              <span>{profile.city || profile.district || 'Location not provided'}</span>
            </span>
            <span className="text-neutral-500 text-[10px]">
              ECHO = Follow • PULL = Request Vibe
            </span>
          </div>

          {feedbackError && (
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center space-x-1.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{feedbackError}</span>
            </div>
          )}

          {/* Action Buttons: Left = ECHO (D03), Right = PULL (D17) */}
          {isSelf ? (
            <div className="p-2.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-center text-xs text-neutral-400 font-semibold">
              This is your public explorer profile.
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 pt-1">
              {/* ECHO Button (Left) = D03 one-way follow */}
              <button
                onClick={handleEcho}
                disabled={loading}
                className={`flex-1 font-mono text-xs font-black uppercase tracking-wider py-2.5 px-4 rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 ${
                  isFollowing
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                    : 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10'
                }`}
                title="ECHO: One-way follow into your Orbit. Does not grant DMs."
              >
                {isFollowing ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>ECHOED</span>
                  </>
                ) : (
                  <span>ECHO</span>
                )}
              </button>

              {/* PULL Button (Right) = D17 pending connection request */}
              <button
                onClick={handlePull}
                disabled={loading || pullPending}
                className={`flex-1 font-mono text-xs font-black uppercase tracking-wider py-2.5 px-4 rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 ${
                  pullPending
                    ? 'bg-rose-500/20 text-rose-200 border-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.2)] cursor-default'
                    : 'border-rose-500/40 text-rose-300 hover:bg-rose-500/10'
                }`}
                title="PULL: Mutual Vibe connection request. When accepted, unlocks D14 1:1 DMs."
              >
                {pullPending ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>PULLED</span>
                  </>
                ) : (
                  <span>PULL</span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
