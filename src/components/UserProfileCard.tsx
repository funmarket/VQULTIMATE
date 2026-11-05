import React, { useState } from 'react';
import { X, Award, Shield, Coins, MapPin, Check } from 'lucide-react';
import { UserProfile } from '../domains/d02_users';

interface UserProfileCardProps {
  profile: UserProfile;
  onClose: () => void;
  onFollow?: (profile: UserProfile) => void;
  onSendPull?: (profile: UserProfile) => void;
}

export const UserProfileCard: React.FC<UserProfileCardProps> = ({
  profile,
  onClose,
  onFollow,
  onSendPull
}) => {
  const [following, setFollowing] = useState(false);
  const [pullSent, setPullSent] = useState(false);

  const handleFollow = () => {
    setFollowing(true);
    if (onFollow) onFollow(profile);
    setTimeout(() => onClose(), 800);
  };

  const handleSendPull = () => {
    setPullSent(true);
    if (onSendPull) onSendPull(profile);
    setTimeout(() => onClose(), 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4 shadow-2xl text-white relative">
        <button
          onClick={onClose}
          aria-label="Close Profile Card"
          className="absolute top-4 right-4 text-xs text-neutral-400 hover:text-white px-2.5 py-1 rounded-xl bg-neutral-800 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center text-center space-y-3 pt-2">
          <div className="relative">
            <img
              src={profile.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'}
              alt={profile.full_name}
              className="w-20 h-20 rounded-full object-cover ring-4 ring-orange-500/50 shadow-xl"
            />
            {profile.role === 'admin' && (
              <span className="absolute -bottom-1 -right-1 bg-orange-500 text-neutral-950 p-1 rounded-full shadow" title="Platform Administrator">
                <Shield className="w-3.5 h-3.5" />
              </span>
            )}
          </div>

          <div>
            <h3 className="font-black text-base text-white tracking-tight">{profile.full_name}</h3>
            <p className="text-xs text-teal-400 font-mono">@{profile.username}</p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[10px] bg-orange-500/20 text-orange-300 border border-orange-500/30 px-2.5 py-1 rounded-full font-bold uppercase">
              {profile.tier || (profile.role === 'admin' ? 'ADMIN SENTINEL' : 'EXPLORER')}
            </span>
            <span className="text-[10px] bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2.5 py-1 rounded-full font-bold flex items-center space-x-1">
              <Coins className="w-3 h-3 text-amber-400" />
              <span>{profile.vq_balance} VQ</span>
            </span>
          </div>

          {profile.bio && (
            <p className="text-xs text-neutral-300 italic bg-neutral-950 p-3 rounded-2xl border border-neutral-800 w-full leading-relaxed">
              &ldquo;{profile.bio}&rdquo;
            </p>
          )}

          <div className="text-[11px] text-neutral-400 flex items-center justify-between w-full px-2 pt-1">
            <span className="flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5 text-orange-400" />
              <span>{profile.district || 'Heritage Node'}</span>
            </span>
            <span className="text-amber-300 font-bold flex items-center space-x-1">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Trust {profile.trust_score || 95}%</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 w-full pt-2">
            <button
              onClick={handleFollow}
              className={`py-2.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center space-x-1 ${
                following
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
              }`}
            >
              {following ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Orbiting</span>
                </>
              ) : (
                <span>Follow Orbit</span>
              )}
            </button>
            <button
              onClick={handleSendPull}
              className={`py-2.5 rounded-xl font-black text-xs shadow-lg transition hover:opacity-90 cursor-pointer flex items-center justify-center space-x-1 ${
                pullSent
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-gradient-to-r from-orange-500 to-teal-500 text-white'
              }`}
            >
              {pullSent ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Pull Sent</span>
                </>
              ) : (
                <span>Send Pull</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
