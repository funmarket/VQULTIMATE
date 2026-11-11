import React, { useState, useEffect } from 'react';
import {
  X, CheckCircle2, AlertTriangle, XCircle, Shield,
  Flame, MapPin, Sparkles, Send, Check
} from 'lucide-react';
import { VibePlace } from '../domains/d03_vibe_orbit/types';
import {
  submitProximityValidation,
  fetchPlaceValidations,
  getUserValidationStreak,
  calculateValidationRewards,
  ValidationResponse
} from '../domains/d03_vibe_orbit/validations';
import { useUser } from '../contexts/UserContext';

interface VibeValidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  place: VibePlace;
  onValidated?: (newAverage: number | null, newCount: number) => void;
  onRequireAuth?: () => void;
}

const YES_LIVE_TAGS = [
  '🔥 High Energy',
  '😌 Chill & Cozy',
  '🪑 Seats Available',
  '🎶 Great Music',
  '💻 Fast Wi-Fi'
];

const NO_CHANGE_TAGS = [
  '🚫 Temporarily Closed',
  '⏳ Packed / Long Queue',
  '🔇 Vibe / Music Changed',
  '📍 Wrong Pin / Address',
  '💸 Price Changed'
];

export const VibeValidateModal: React.FC<VibeValidateModalProps> = ({
  isOpen,
  onClose,
  place,
  onValidated,
  onRequireAuth
}) => {
  const { user } = useUser();
  const [selectedResponse, setSelectedResponse] = useState<ValidationResponse | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<{
    message: string;
    subtext: string;
    type: 'yes' | 'no' | 'abstain';
    points: number;
    newConfidence: number | null;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Proximity & Streak calculations
  const streak = getUserValidationStreak(user?.id);
  const { multiplier, yesReward, noReward } = calculateValidationRewards(streak);

  const isWithin200m =
    (place.distance_meters !== undefined && place.distance_meters <= 200) ||
    (place.distance_km !== undefined && place.distance_km <= 0.2);

  const distanceDisplay =
    place.distance_km !== undefined
      ? `${place.distance_km} km`
      : place.distance_meters !== undefined
      ? `${(place.distance_meters / 1000).toFixed(2)} km`
      : '0.20 km';

  const baselineConfidence = Math.round((place.rating ?? 4.0) * 20);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedResponse(null);
      setSelectedTags([]);
      setComment('');
      setSuccessResult(null);
      setErrorMessage(null);
    }
  }, [isOpen, place.id]);

  if (!isOpen) return null;

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSelectResponse = async (resp: ValidationResponse) => {
    if (!user && resp !== 'abstain') {
      if (onRequireAuth) onRequireAuth();
      return;
    }

    setSelectedResponse(resp);
    setSelectedTags([]);
    setErrorMessage(null);

    // If 'abstain', execute immediately and close after 1.2 seconds
    if (resp === 'abstain') {
      setSuccessResult({
        type: 'abstain',
        message: 'Dismissed',
        subtext: 'Thanks for keeping Vibe Validate accurate.',
        points: 0,
        newConfidence: null
      });

      try {
        await submitProximityValidation({
          placeId: place.id,
          placeTitle: place.title,
          placeRating: place.rating,
          userId: user?.id || 'usr_anonymous',
          response: 'abstain',
          userStreak: streak
        });
      } catch {}

      setTimeout(() => {
        onClose();
      }, 1200);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResponse || selectedResponse === 'abstain' || submitting) return;

    if (!user) {
      if (onRequireAuth) onRequireAuth();
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await submitProximityValidation({
        placeId: place.id,
        placeTitle: place.title,
        placeRating: place.rating,
        userId: user.id,
        response: selectedResponse,
        userStreak: streak,
        vibeTags: selectedResponse === 'yes' ? selectedTags : [],
        changeTags: selectedResponse === 'no' ? selectedTags : [],
        comment: comment.trim() || undefined
      });

      if (!result.success) {
        setErrorMessage(result.error || 'Failed to submit verification.');
        setSubmitting(false);
        return;
      }

      const pointsAwarded = result.rewardPoints;
      setSuccessResult({
        type: selectedResponse,
        message: selectedResponse === 'yes' ? 'Presence Verified!' : 'Situation Report Recorded',
        subtext:
          selectedResponse === 'yes'
            ? `Confidence +15% applied • +${pointsAwarded} PTS credited to your VQ Purse.`
            : `Confidence -25% applied • +${pointsAwarded} PTS credited to your VQ Purse.`,
        points: pointsAwarded,
        newConfidence: result.newConfidence
      });

      if (onValidated) {
        onValidated(result.newConfidence, result.newConfirmationsCount);
      }

      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Verification submission error.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div className="relative w-full max-w-lg bg-[#0d111a] border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden border-t-4 border-t-emerald-400">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/30">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-wide">
                Vibe Validate Spot
              </h3>
              <p className="text-xs text-neutral-400 truncate max-w-[280px]">
                Real-world crowd verification for <span className="text-neutral-200 font-semibold">{place.title}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close vibe validate modal"
            className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Presence Status Badges */}
        <div className="px-5 py-3 bg-neutral-900/60 border-b border-neutral-800/80 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 font-semibold text-neutral-300">
              <MapPin className="w-3.5 h-3.5 text-orange-400" />
              <span>{distanceDisplay} away</span>
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                isWithin200m
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
              }`}
            >
              {isWithin200m ? '📍 Within 200m Verified' : '📍 Proximity Sensor Active'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
            <Flame className="w-3.5 h-3.5" />
            <span>Streak {streak}x ({multiplier.toFixed(1)}x Multiplier)</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-5">
          {errorMessage && (
            <div className="p-3 text-xs bg-red-950/60 border border-red-500/40 text-red-200 rounded-2xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success / Auto-dismiss Card */}
          {successResult ? (
            <div className="p-6 text-center space-y-3 bg-neutral-900/80 rounded-2xl border border-neutral-800 animate-fadeIn">
              <div
                className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center border ${
                  successResult.type === 'yes'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : successResult.type === 'no'
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                }`}
              >
                {successResult.type === 'yes' ? (
                  <CheckCircle2 className="w-8 h-8" />
                ) : successResult.type === 'no' ? (
                  <AlertTriangle className="w-8 h-8" />
                ) : (
                  <XCircle className="w-8 h-8" />
                )}
              </div>
              <h4 className="text-lg font-black text-white">{successResult.message}</h4>
              <p className="text-xs text-neutral-300 max-w-sm mx-auto leading-relaxed">
                {successResult.subtext}
              </p>
              {successResult.points > 0 && (
                <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black border border-amber-500/30">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>+{successResult.points} PTS Awarded</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Core Prompt Box: ARE YOU HERE RIGHT NOW? */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-neutral-300">
                    ARE YOU HERE RIGHT NOW?
                  </h4>
                  <span className="text-[11px] text-neutral-500">
                    Baseline from rating: {baselineConfidence}%
                  </span>
                </div>

                {/* 3 Response Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Option 1: YES */}
                  <button
                    type="button"
                    onClick={() => handleSelectResponse('yes')}
                    className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between space-y-2 group active:scale-95 ${
                      selectedResponse === 'yes'
                        ? 'border-emerald-500 bg-emerald-950/50 shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-500'
                        : 'border-emerald-500/30 bg-emerald-950/20 hover:border-emerald-500/60 hover:bg-emerald-950/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <CheckCircle2
                        className={`w-5 h-5 ${
                          selectedResponse === 'yes' ? 'text-emerald-400' : 'text-emerald-500/70'
                        }`}
                      />
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        +15%
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-black text-white">Yes</div>
                      <div className="text-[11px] text-emerald-300/80 font-medium">Matches reality</div>
                    </div>
                    <div className="text-[10px] text-neutral-400 pt-1 border-t border-emerald-500/20">
                      Earn <strong className="text-emerald-300">+{yesReward} PTS</strong>
                    </div>
                  </button>

                  {/* Option 2: NO */}
                  <button
                    type="button"
                    onClick={() => handleSelectResponse('no')}
                    className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between space-y-2 group active:scale-95 ${
                      selectedResponse === 'no'
                        ? 'border-amber-500 bg-amber-950/50 shadow-lg shadow-amber-500/20 ring-1 ring-amber-500'
                        : 'border-amber-500/30 bg-amber-950/20 hover:border-amber-500/60 hover:bg-amber-950/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <AlertTriangle
                        className={`w-5 h-5 ${
                          selectedResponse === 'no' ? 'text-amber-400' : 'text-amber-500/70'
                        }`}
                      />
                      <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                        -25%
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-black text-white">No</div>
                      <div className="text-[11px] text-amber-300/80 font-medium">Something changed</div>
                    </div>
                    <div className="text-[10px] text-neutral-400 pt-1 border-t border-amber-500/20">
                      Earn <strong className="text-amber-300">+{noReward} PTS</strong>
                    </div>
                  </button>

                  {/* Option 3: NOT HERE / ABSTAIN */}
                  <button
                    type="button"
                    onClick={() => handleSelectResponse('abstain')}
                    className="p-3.5 rounded-2xl border border-neutral-800 bg-neutral-900/40 hover:border-neutral-700 hover:bg-neutral-900/70 text-left transition cursor-pointer flex flex-col justify-between space-y-2 group active:scale-95"
                  >
                    <div className="flex items-center justify-between">
                      <XCircle className="w-5 h-5 text-neutral-400" />
                      <span className="text-[10px] font-bold text-neutral-500 bg-neutral-800 px-2 py-0.5 rounded-md">
                        Abstain
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-black text-white">Not here</div>
                      <div className="text-[11px] text-neutral-400 font-medium">Abstain from voting</div>
                    </div>
                    <div className="text-[10px] text-neutral-500 pt-1 border-t border-neutral-800">
                      0 PTS • Auto-dismiss
                    </div>
                  </button>
                </div>
              </div>

              {/* Detail Enrichment (Shown when Yes or No is selected) */}
              {selectedResponse === 'yes' && (
                <form onSubmit={handleSubmit} className="p-4 bg-neutral-900/60 rounded-2xl border border-neutral-800 space-y-3.5 animate-fadeIn">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      <span>Live Situation Pills (1-Tap Selection)</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {YES_LIVE_TAGS.map((tag) => {
                        const isSelected = selectedTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleTag(tag)}
                            className={`text-xs px-2.5 py-1 rounded-xl border font-semibold transition cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-sm'
                                : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:text-white'
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-neutral-400">
                      Live Field Note (Optional)
                    </label>
                    <input
                      type="text"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="e.g. Plenty of open tables, great music playlist..."
                      maxLength={120}
                      className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submitting ? 'Applying...' : `Confirm Yes (+15% Confidence • +${yesReward} PTS)`}</span>
                  </button>
                </form>
              )}

              {selectedResponse === 'no' && (
                <form onSubmit={handleSubmit} className="p-4 bg-neutral-900/60 rounded-2xl border border-neutral-800 space-y-3.5 animate-fadeIn">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>What Changed? (Select all that apply)</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {NO_CHANGE_TAGS.map((tag) => {
                        const isSelected = selectedTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleTag(tag)}
                            className={`text-xs px-2.5 py-1 rounded-xl border font-semibold transition cursor-pointer ${
                              isSelected
                                ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm'
                                : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:text-white'
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-neutral-400">
                      What is the situation? (Optional)
                    </label>
                    <input
                      type="text"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="e.g. Venue closed for private event today..."
                      maxLength={120}
                      className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider bg-amber-500 hover:bg-amber-400 text-neutral-950 transition cursor-pointer shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submitting ? 'Submitting Report...' : `Submit Change Report (-25% Confidence • +${noReward} PTS)`}</span>
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
