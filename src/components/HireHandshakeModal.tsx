import React, { useState } from 'react';
import { X, Handshake, Shield, Sparkles, CheckCircle2 } from 'lucide-react';
import { VibeGuardian, CommunityTrail, hireGuardian } from '../domains/d07_trails';
import { UserProfile } from '../domains/d01_auth';

interface HireHandshakeModalProps {
  guardian: VibeGuardian;
  trail?: CommunityTrail | null;
  currentUser: UserProfile | null;
  onClose: () => void;
  onSuccess: (guardianId: string, newHiresCount: number) => void;
  onToast: (msg: string) => void;
}

export const HireHandshakeModal: React.FC<HireHandshakeModalProps> = ({
  guardian,
  trail,
  currentUser,
  onClose,
  onSuccess,
  onToast
}) => {
  const [loading, setLoading] = useState(false);

  const handleConfirmHandshake = async () => {
    setLoading(true);
    const result = await hireGuardian(guardian.id, currentUser?.id);
    setLoading(false);

    if (result.success) {
      onToast(`🤝 D22 Vibe Handshake established with ${guardian.name}! +${result.vqEarned} VQ awarded.`);
      onSuccess(guardian.id, (guardian.hiresCount ?? 0) + 1);
      onClose();
    } else {
      onToast('Handshake issuance is not available yet. No Handshake or reward was created.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
      <div className="w-full sm:max-w-md bg-neutral-900 border border-neutral-800 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl text-white flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/80">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
              <Handshake className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">D22 Vibe Handshake Protocol</h3>
              <p className="text-[10px] text-neutral-400">Verified Human Encounter</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-center">
          {trail && <p className="text-xs text-neutral-300">Selected Trail: <strong>{trail.title}</strong></p>}
          {/* Guardian Highlight */}
          <div className="flex items-center space-x-4 p-4 rounded-2xl bg-neutral-950 border border-neutral-800 text-left">
            <div className="relative">
              <img
                src={(guardian.avatarUrl && guardian.avatarUrl.trim()) || (guardian.avatar_url && guardian.avatar_url.trim()) || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'}
                alt={guardian.name}
                className="w-14 h-14 rounded-2xl object-cover border border-amber-500/40"
              />
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-neutral-950 animate-pulse" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-1.5">
                <h4 className="font-bold text-white text-base truncate">{guardian.name}</h4>
                <Shield className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
              </div>
              <p className="text-xs text-neutral-400 truncate">{guardian.city || guardian.district}</p>
              <div className="flex items-center space-x-2 mt-1 text-[11px]">
                <span className="font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                  {guardian.hourlyRate ? `$${guardian.hourlyRate} / hr` : 'Free Hangout'}
                </span>
                <span className="text-neutral-400">{guardian.hiresCount != null ? `· ${guardian.hiresCount} hires` : ''}</span>
              </div>
            </div>
          </div>

          {/* Handshake Proof Explanation */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-left space-y-2">
            <div className="flex items-center space-x-2 text-amber-300 font-bold text-xs">
              <Sparkles className="w-4 h-4" />
              <span>Handshake Proof System (D07/D22)</span>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Tapping Confirm establishes an official cryptographic handshake proof between you and <span className="text-white font-semibold">{guardian.name}</span>. Both accounts will be awarded <span className="font-bold text-amber-300">+75 VQ</span> reward points upon mutual confirmation.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <button
              onClick={handleConfirmHandshake}
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition flex items-center justify-center space-x-2 cursor-pointer active:scale-98"
            >
              <Handshake className="w-4 h-4" />
              <span>{loading ? 'Establishing Handshake...' : 'Establish Handshake & Hire'}</span>
            </button>
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl text-neutral-400 hover:text-white font-medium text-xs cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
