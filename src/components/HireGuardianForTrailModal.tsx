import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Shield, Star, Award, DollarSign, Camera, MessageSquare, ArrowRight, Compass } from 'lucide-react';
import type { VibeGuardian, CommunityTrail } from '../domains/d07_trails';
import { isGuardianFresh } from '../domains/d07_trails';

interface HireGuardianForTrailModalProps {
  trail: CommunityTrail | null;
  guardians: VibeGuardian[];
  isOpen: boolean;
  onClose: () => void;
  onSelectGuardian: (guardian: VibeGuardian, trailTitle: string) => void;
}

export const HireGuardianForTrailModal: React.FC<HireGuardianForTrailModalProps> = ({
  trail,
  guardians,
  isOpen,
  onClose,
  onSelectGuardian
}) => {
  if (!isOpen || !trail) return null;

  const trailTitle = (trail as any).name || (trail as any).title || 'Vibe Trail';
  const allGuardians = guardians;
  
  // Only active Pro Guardians with verified selfies who opted-in appear as hireable guides
  const availablePros = allGuardians.filter(g => 
    g.type === 'pro' && isGuardianFresh(g)
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-[#110F15] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden text-left shadow-2xl relative flex flex-col"
        >
          {/* Header */}
          <div className="bg-[#17141E] border-b border-white/10 p-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
                <Shield className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-white">
                  Hire a Pro Guardian
                </h4>
                <p className="text-[10px] text-zinc-400 font-mono truncate max-w-[220px]">
                  For "{trailTitle}"
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-3">
            {/* Context Notice */}
            <div className="bg-purple-950/20 border border-purple-500/20 rounded-xl p-3 text-xs text-zinc-300 flex items-start gap-2">
              <Compass className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <p className="text-[11.5px] leading-relaxed">
                Choose a verified Pro Guide below to accompany you on <strong>{trailTitle}</strong>. You can message them with this trail attached, check their availability, or book a session.
              </p>
            </div>

            {/* List of Pro Guardians */}
            <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
              {availablePros.length === 0 && (
                <p className="text-xs text-zinc-400 p-4 rounded-xl border border-white/10">
                  No registered Pro Guardians with fresh selfies are available yet.
                </p>
              )}
              {availablePros.map((pro) => (
                <div
                  key={pro.id}
                  onClick={() => onSelectGuardian(pro, trailTitle)}
                  className="bg-[#181520] hover:bg-[#201c2b] border border-white/5 hover:border-purple-500/30 rounded-2xl p-3.5 flex items-center justify-between gap-3 transition-all cursor-pointer group shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-purple-500/40 bg-zinc-900">
                      <img src={pro.avatarUrl} alt={pro.name} className="w-full h-full object-cover" />
                      <div className="absolute bottom-0 inset-x-0 bg-black/80 py-0.2 text-center text-[7.5px] font-mono font-bold text-emerald-400">
                        LIVE
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-sm text-white group-hover:text-purple-300 transition-colors truncate">
                          {pro.name}
                        </span>
                        <span className="bg-amber-500/15 text-amber-300 text-[8.5px] font-mono font-bold px-1.5 py-0.2 rounded border border-amber-500/20">
                          {pro.pricingType === 'hourly'
                            ? (`$${pro.hourlyRate}/hr`)
                            : (`$${pro.flatRate} flat`)}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400 font-mono truncate">
                        {pro.city}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="bg-purple-600 group-hover:bg-purple-500 text-white font-mono font-black text-[10.5px] uppercase tracking-wider px-3 py-1.5 rounded-xl flex items-center gap-1 transition-all shadow-sm">
                      <span>Select</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
