import React, { useState, useEffect } from 'react';
import { X, Sparkles, Coins, ArrowUpRight, CheckCircle2, AlertCircle, ShoppingCart } from 'lucide-react';
import { VibePlace } from '../domains/d03_vibe_orbit';
import { UserProfile } from '../domains/d01_auth';
import { fetchVqAccount } from '../domains/d06_purse';
import { createOrFundPromotion, PlacePromotion } from '../domains/d03_vibe_orbit/promotions';

interface PromoteBusinessModalProps {
  place: VibePlace;
  user?: UserProfile | null;
  isOpen?: boolean;
  onClose: () => void;
  onSuccess: (promotion: PlacePromotion) => void;
  onRequireAuth?: () => void;
  onOpenBuyVq?: () => void;
}

const POOL_PRESETS = [500, 1000, 2500, 5000];
const REWARD_PRESETS = [50, 100, 250, 500];

export const PromoteBusinessModal: React.FC<PromoteBusinessModalProps> = ({
  place,
  user = null,
  isOpen = true,
  onClose,
  onSuccess,
  onRequireAuth,
  onOpenBuyVq
}) => {
  const [totalPool, setTotalPool] = useState<number>(1000);
  const [rewardPerCheckin, setRewardPerCheckin] = useState<number>(100);
  const [userBalance, setUserBalance] = useState<number>(user?.vq_balance ?? 1000);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user?.id) {
      fetchVqAccount(user.id).then(acct => {
        if (acct) {
          setUserBalance(Number(acct.available_balance));
        }
      });
    }
  }, [isOpen, user?.id]);

  const hasInsufficientBalance = userBalance < totalPool;
  const estimatedCheckins = Math.floor(totalPool / (rewardPerCheckin || 1));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!user) {
      if (onRequireAuth) onRequireAuth();
      return;
    }

    if (totalPool <= 0 || rewardPerCheckin <= 0) {
      setErrorMsg('Please enter a valid pool amount and check-in reward.');
      return;
    }

    if (rewardPerCheckin > totalPool) {
      setErrorMsg('Check-in reward cannot be larger than the total funded pool.');
      return;
    }

    if (hasInsufficientBalance) {
      setErrorMsg(`Your purse only has ${userBalance} VQ. Please buy more VQ tokens or fund a smaller pool.`);
      return;
    }

    setSubmitting(true);
    const result = await createOrFundPromotion({
      placeId: place.id,
      placeTitle: place.title,
      sponsorUserId: user.id,
      totalVqFunded: totalPool,
      rewardPerCheckin
    });

    setSubmitting(false);
    if (!result.success || !result.promotion) {
      setErrorMsg(result.error || 'Failed to fund business promotion.');
      return;
    }

    onSuccess(result.promotion);
  };

  if (isOpen === false) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Promote ${place.title}`}
      className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn overflow-y-auto"
    >
      <div className="relative w-full max-w-md bg-neutral-900 border border-amber-500/50 rounded-[28px] overflow-hidden shadow-2xl text-white my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between bg-gradient-to-r from-amber-950/40 via-neutral-900 to-neutral-900">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black tracking-wider uppercase text-amber-400">
                Community Sponsorship
              </span>
              <h3 className="text-base font-black text-white leading-tight">
                Promote Spot Check-ins
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close promote modal"
            className="p-1.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          {/* Target Spot Banner */}
          <div className="rounded-2xl bg-neutral-950 border border-neutral-800 p-3.5 space-y-1">
            <span className="text-[10px] uppercase font-bold text-neutral-400">Target Venue</span>
            <div className="text-sm font-black text-white truncate">{place.title}</div>
            <div className="text-xs text-neutral-400 truncate">{place.address}</div>
          </div>

          {/* User Purse Status Bar */}
          <div className="rounded-2xl bg-amber-950/30 border border-amber-500/30 p-3.5 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-neutral-300">Your VQ Purse Balance:</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-black text-amber-300 font-mono">
                {userBalance.toLocaleString()} VQ
              </span>
            </div>
          </div>

          {hasInsufficientBalance && (
            <div className="rounded-2xl bg-rose-950/40 border border-rose-500/40 p-3.5 flex items-center justify-between text-xs text-rose-200">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Need {totalPool - userBalance} more VQ to fund this pool.</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenBuyVq) onOpenBuyVq();
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs transition cursor-pointer whitespace-nowrap ml-2 flex items-center space-x-1"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Buy VQ</span>
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="rounded-2xl bg-rose-950/60 border border-rose-500/50 p-3 text-xs text-rose-300 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Total Pool Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-neutral-300">
              1. Total VQ Pool to Allocate
            </label>
            <div className="grid grid-cols-4 gap-2">
              {POOL_PRESETS.map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTotalPool(preset)}
                  className={`py-2 px-1 rounded-xl text-xs font-black transition border cursor-pointer ${
                    totalPool === preset
                      ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow-md'
                      : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  {preset} VQ
                </button>
              ))}
            </div>
            <input
              type="number"
              min={100}
              step={50}
              value={totalPool}
              onChange={e => setTotalPool(Number(e.target.value) || 0)}
              className="w-full mt-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
              placeholder="Or enter custom VQ amount"
            />
          </div>

          {/* 2. Reward per Check-in Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-neutral-300">
              2. Reward per User Check-in
            </label>
            <div className="grid grid-cols-4 gap-2">
              {REWARD_PRESETS.map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setRewardPerCheckin(preset)}
                  className={`py-2 px-1 rounded-xl text-xs font-black transition border cursor-pointer ${
                    rewardPerCheckin === preset
                      ? 'bg-emerald-500 text-neutral-950 border-emerald-400 shadow-md'
                      : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  +{preset} PTS
                </button>
              ))}
            </div>
            <p className="text-[11px] text-neutral-400 font-medium">
              Funds up to <strong>{estimatedCheckins} distinct visits</strong> from local explorers.
            </p>
          </div>

          {/* Sponsoring Rules Callout */}
          <div className="rounded-2xl bg-neutral-950 p-3.5 border border-neutral-800 space-y-1 text-xs text-neutral-400">
            <div className="font-bold text-neutral-300">Open Sponsorship Protocol:</div>
            <p className="text-[11px] leading-relaxed">
              Any VibeQuest user (Pro, Business, or Normal Explorer) can sponsor any place. Check-in rewards are automatically disbursed to users when they verify physical arrival.
            </p>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={submitting || hasInsufficientBalance}
            className="w-full py-3.5 px-4 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 font-black text-sm text-center shadow-lg transition active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {submitting ? (
              <span>Allocating VQ Pool...</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Fund Pool with {totalPool.toLocaleString()} VQ</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
