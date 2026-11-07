import React, { useState, useEffect } from 'react';
import {
  X, Shield, Award, MapPin, Clock, Calendar, MessageSquare,
  Handshake, Check, AlertCircle, Star, Send, Camera, Sparkles, ChevronRight
} from 'lucide-react';
import type { VibeGuardian, CulturalTrail, CommunityTrail } from '../domains/d07_trails';
import type { UserProfile } from '../domains/d01_auth';
import {
  initiateHandshake,
  acceptHandshake,
  declineHandshake,
  getHandshakeStatus,
  HandshakeStatus
} from '../domains/d22_handshake';
import {
  fetchGuardianReviews,
  submitGuardianReview,
  GuardianReview
} from '../domains/d19_reviews';
import { requestTourReservation } from '../domains/d08_tours';

interface GuardianDetailModalProps {
  guardian: VibeGuardian;
  currentUser: UserProfile | null;
  trails: CulturalTrail[];
  onClose: () => void;
  onSelectTrail?: (trail: CulturalTrail) => void;
  onLocateMap?: (guardian: VibeGuardian) => void;
  onRequireAuth?: () => void;
  onToast?: (message: string) => void;
  onReserveTour?: (tour: CommunityTrail) => void;
  onOpenMessage?: (guardian: VibeGuardian) => void;
}

export const GuardianDetailModal: React.FC<GuardianDetailModalProps> = ({
  guardian,
  currentUser,
  trails,
  onClose,
  onSelectTrail,
  onLocateMap,
  onRequireAuth,
  onToast,
  onReserveTour,
  onOpenMessage
}) => {
  const [handshakeStatus, setHandshakeStatus] = useState<HandshakeStatus>('none');
  const [activeHandshakeId, setActiveHandshakeId] = useState<string | null>(null);
  const [handshakeLoading, setHandshakeLoading] = useState(false);

  const [reviews, setReviews] = useState<GuardianReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // In-modal quick reservation state
  const [bookingTour, setBookingTour] = useState<CommunityTrail | null>(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('10:00');
  const [bookingParty, setBookingParty] = useState(2);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const cleanHandle = guardian.handle.replace(/^@/, '');
  const isSelf = currentUser?.id === guardian.id || (currentUser?.username && currentUser.username === cleanHandle);

  // 1. Calculate Selfie Freshness (7-day window)
  const selfieAgeMs = Date.now() - new Date(guardian.selfieCapturedAt || Date.now()).getTime();
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const isSelfieFresh = Number.isFinite(selfieAgeMs) && selfieAgeMs >= 0 && selfieAgeMs <= SEVEN_DAYS_MS;
  const daysLeft = Math.max(0, Math.ceil((SEVEN_DAYS_MS - selfieAgeMs) / (24 * 60 * 60 * 1000)));

  // 2. Load Handshake status
  useEffect(() => {
    let active = true;
    if (currentUser?.id && guardian.id) {
      void getHandshakeStatus(currentUser.id, guardian.id).then(res => {
        if (active) {
          setHandshakeStatus(res.status);
          if (res.handshake?.id) setActiveHandshakeId(res.handshake.id);
        }
      });
    }
    return () => { active = false; };
  }, [currentUser?.id, guardian.id]);

  // 3. Load Handshake-gated reviews
  useEffect(() => {
    let active = true;
    setReviewsLoading(true);
    void fetchGuardianReviews(guardian.id).then(items => {
      if (active) {
        setReviews(items);
        setReviewsLoading(false);
      }
    });
    return () => { active = false; };
  }, [guardian.id]);

  // Handshake action
  const handleHandshakeAction = async () => {
    if (!currentUser) {
      onToast?.('Sign in to initiate a Handshake with this Guardian.');
      onRequireAuth?.();
      return;
    }
    if (isSelf) {
      onToast?.('You cannot Handshake with your own profile.');
      return;
    }
    if (handshakeStatus === 'accepted') {
      onToast?.('You already have a verified Handshake with this Guardian.');
      return;
    }
    if (handshakeStatus === 'pending_sent') {
      onToast?.('Handshake request already sent. Awaiting Guardian confirmation.');
      return;
    }

    setHandshakeLoading(true);
    try {
      const res = await initiateHandshake(currentUser.id, guardian.id);
      if (res.success && res.handshake) {
        setHandshakeStatus('pending_sent');
        setActiveHandshakeId(res.handshake.id);
        onToast?.(`🤝 Handshake request sent to ${guardian.name}! Awaiting confirmation.`);
      } else {
        onToast?.(res.error || 'Could not initiate Handshake.');
      }
    } catch {
      onToast?.('Handshake request failed.');
    } finally {
      setHandshakeLoading(false);
    }
  };

  const handleAcceptHandshake = async () => {
    if (!activeHandshakeId) return;
    setHandshakeLoading(true);
    try {
      const res = await acceptHandshake(activeHandshakeId, guardian.id);
      if (res.success) {
        setHandshakeStatus('accepted');
        onToast?.('🤝 Handshake accepted and verified!');
      }
    } finally {
      setHandshakeLoading(false);
    }
  };

  const handleDeclineHandshake = async () => {
    if (!activeHandshakeId) return;
    setHandshakeLoading(true);
    try {
      const res = await declineHandshake(activeHandshakeId, guardian.id);
      if (res.success) {
        setHandshakeStatus('declined');
        onToast?.('Handshake request declined.');
      }
    } finally {
      setHandshakeLoading(false);
    }
  };

  // Submit Review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onRequireAuth?.();
      return;
    }
    setReviewError(null);
    setSubmittingReview(true);
    try {
      const res = await submitGuardianReview({
        guardianId: guardian.id,
        reviewerId: currentUser.id,
        reviewerName: currentUser.full_name || currentUser.username || 'Explorer',
        reviewerAvatar: currentUser.avatar_url,
        rating: reviewRating,
        comment: reviewComment
      });

      if (res.success && res.review) {
        setReviews(prev => [res.review!, ...prev]);
        setReviewComment('');
        onToast?.('⭐ Verified review posted successfully!');
      } else {
        setReviewError(res.error || 'Could not submit review.');
      }
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Review submission failed.');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Tours resolution
  const guardianTours = trails.filter(
    t => (t.isTour || (t.guardian_name || '').toLowerCase() === guardian.name.toLowerCase() ||
         (t.guardian_handle && t.guardian_handle.toLowerCase() === guardian.handle.toLowerCase()) ||
         guardian.curated_trail_ids?.includes(t.id) ||
         t.id === guardian.offeredTrailId)
  );

  // If no explicitly filtered tours exist, construct canonical display representation
  const displayTours: CommunityTrail[] = guardianTours.length > 0 ? guardianTours : [
    {
      id: guardian.offeredTrailId || `tour_${guardian.id}_default`,
      title: guardian.offeredTrailTitle || 'Epic Carthage Fortress & Byrsa Hill Heritage Expedition',
      story: guardian.bio || 'Private in-depth historical expedition exploring ancient Punic ruins, Roman baths, and legendary fortress ramparts.',
      description: guardian.bio || 'Private in-depth historical expedition exploring ancient Punic ruins, Roman baths, and legendary fortress ramparts.',
      city: guardian.city || 'Tunis / Carthage',
      category: 'Heritage Tour',
      vibeTags: ['History', 'Culture'],
      imageUrl: guardian.avatarUrl || guardian.avatar_url || 'https://images.unsplash.com/photo-1548013146-72479768bada?q=80&w=600&auto=format&fit=crop',
      durationHours: 3.0,
      stopsCount: 4,
      flowSequence: ['Morning', 'Afternoon'],
      authorName: guardian.name,
      authorHandle: guardian.handle,
      authorAvatarUrl: guardian.avatarUrl || guardian.avatar_url || '',
      isTour: true,
      pricePerPerson: guardian.hourlyRate || 50,
      currency: guardian.currency || 'USD',
      createdAt: new Date().toISOString(),
      stops: [
        {
          id: 'stop_start',
          name: 'Byrsa Hill Acropolium Gates',
          address: 'Byrsa Hill Acropolium Gates, Carthage',
          vibeNote: 'Initial meeting point and fortress summit view.',
          timeOfDay: 'Morning',
          durationMinutes: 60
        }
      ]
    }
  ];

  const handleBookSlot = (tour: CommunityTrail) => {
    if (onReserveTour) {
      onReserveTour(tour);
      return;
    }
    setBookingTour(tour);
    setBookingSuccess(false);
  };

  const handleConfirmReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onRequireAuth?.();
      return;
    }
    if (!bookingTour) return;
    setBookingSubmitting(true);
    try {
      await requestTourReservation({
        tourId: bookingTour.id,
        date: bookingDate,
        time: bookingTime,
        partySize: bookingParty,
        note: 'Requested directly from Guardian Profile'
      });
      setBookingSuccess(true);
      onToast?.('Tour reservation requested! Guide will respond to confirm.');
      setTimeout(() => {
        setBookingTour(null);
        setBookingSuccess(false);
      }, 2000);
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : 'Reservation request failed.');
    } finally {
      setBookingSubmitting(false);
    }
  };

  const handleMessage = () => {
    if (!currentUser) {
      onRequireAuth?.();
      return;
    }
    if (onOpenMessage) {
      onOpenMessage(guardian);
    } else {
      onToast?.(`Opening direct conversation with ${guardian.name}...`);
    }
  };

  const isPro = guardian.type === 'pro';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn select-none font-sans">
      <div className="w-full sm:max-w-lg bg-[#0d0b12] border border-zinc-800/90 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl text-white max-h-[92vh] flex flex-col">
        {/* Header Bar matching Screenshot 3 */}
        <div className="px-6 pt-5 pb-3 flex items-center justify-between border-b border-zinc-900 bg-[#0d0b12] shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-[12px] font-extrabold uppercase tracking-wider text-purple-400 font-mono">
              GUARDIAN PROFILE
            </span>
            <span className="px-2.5 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-300 font-black text-[9px] uppercase tracking-wider flex items-center gap-1 shadow-sm">
              <Shield className="w-2.5 h-2.5 text-amber-400" />
              <span>{isPro ? 'PRO GUIDE' : 'LOCAL LEGEND'}</span>
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Guardian Modal"
            className="w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer transition border border-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Container */}
        <div className="overflow-y-auto flex-1 divide-y divide-zinc-900">
          {/* Identity Block matching Screenshot 3 */}
          <div className="p-6">
            <div className="flex items-start gap-4">
              {/* Square Selfie Box with APP SELFIE tag */}
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 shrink-0 shadow-lg">
                <img
                  src={guardian.avatarUrl || guardian.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'}
                  alt={guardian.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-zinc-950/90 border border-emerald-500/40 text-emerald-400 text-[9px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 shadow-md">
                  <Camera className="w-3 h-3 text-emerald-400" />
                  <span>APP SELFIE</span>
                </div>
              </div>

              {/* Identity details */}
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
                    {guardian.name}
                  </h2>
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 text-xs shrink-0" title="Verified Identity">
                    <Shield className="w-3.5 h-3.5 fill-blue-500 text-blue-500" />
                  </span>
                </div>

                <p className="text-xs text-zinc-400 font-mono tracking-wide">
                  {guardian.handle}
                </p>

                <p className="text-xs text-zinc-400 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  <span className="truncate">{guardian.city || guardian.district || 'Tunis / Carthage, Tunisia'}</span>
                  <span className="text-zinc-600">•</span>
                  <span className="shrink-0">{guardian.age ? `${guardian.age} yrs old` : '32 yrs old'}</span>
                </p>

                {/* Rate and Handshake Action Row */}
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1">
                    <span>💰</span>
                    <span>Rate: {guardian.type === 'local' ? 'Free' : `$${guardian.hourlyRate || 50} / hr`}</span>
                  </span>

                  {/* Mutual Acceptance Handshake Button */}
                  {handshakeStatus === 'pending_received' ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={handleAcceptHandshake}
                        disabled={handshakeLoading}
                        className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase transition cursor-pointer"
                      >
                        Accept
                      </button>
                      <button
                        onClick={handleDeclineHandshake}
                        disabled={handshakeLoading}
                        className="px-2 py-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs font-bold uppercase transition cursor-pointer"
                      >
                        Decline
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleHandshakeAction}
                      disabled={handshakeLoading || handshakeStatus === 'accepted'}
                      className={`px-3 py-1 rounded-xl border text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition active:scale-95 cursor-pointer ${
                        handshakeStatus === 'accepted'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 cursor-default'
                          : handshakeStatus === 'pending_sent'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse cursor-default'
                            : 'bg-black hover:bg-zinc-900 text-amber-300 border-amber-500/40 hover:border-amber-400'
                      }`}
                    >
                      <Handshake className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        {handshakeStatus === 'accepted'
                          ? 'HANDSHAKEN'
                          : handshakeStatus === 'pending_sent'
                            ? 'PENDING'
                            : 'HANDSHAKE'}
                      </span>
                    </button>
                  )}
                </div>

                {/* Freshness Status Pill */}
                <div className="pt-1">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                    isSelfieFresh
                      ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                      : 'bg-red-950/30 border-red-500/30 text-red-300'
                  }`}>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isSelfieFresh ? `In-App Selfie Fresh • ${daysLeft} days left` : 'In-App Selfie Expired'}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* About Section matching Screenshot 3 */}
          <div className="p-6 space-y-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400">
              ABOUT THE GUARDIAN
            </span>
            <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800/80 p-4 text-xs text-zinc-300 leading-relaxed font-light">
              {guardian.bio || 'Strategic explorer and heritage guide. Leading authentic expeditions across historic Carthage and the Mediterranean coast.'}
            </div>
          </div>

          {/* Pre-made Bookable Tours Section matching Screenshot 3 & 2 */}
          <div className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-300">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-300">
                  PRE-MADE BOOKABLE TOURS
                </span>
              </div>
              <span className="text-xs text-emerald-400 font-medium">
                Direct Reservation
              </span>
            </div>

            {/* Tour Cards */}
            <div className="space-y-3">
              {displayTours.map((tour) => (
                <div
                  key={tour.id}
                  className="rounded-2xl bg-zinc-900/50 border border-zinc-800/80 p-4 space-y-3 transition hover:border-zinc-700"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm sm:text-base font-bold text-white leading-snug">
                      {tour.title}
                    </h3>
                    <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold shrink-0">
                      ${tour.pricePerPerson || 50} / hour
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {tour.story || tour.description || 'Private in-depth historical expedition exploring ancient Punic ruins, Roman baths, and legendary fortress ramparts.'}
                  </p>

                  <div className="flex items-center gap-4 text-xs pt-1 flex-wrap">
                    <div className="flex items-center gap-1.5 text-purple-300 font-medium">
                      <Clock className="w-3.5 h-3.5 text-purple-400" />
                      <span>{tour.durationHours || 3.0} hours</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-300 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="truncate max-w-[200px]">{tour.stops?.[0]?.address || tour.city || 'Byrsa Hill Acropolium Gates, Carthage'}</span>
                    </div>
                  </div>

                  {/* Direct Book Button */}
                  <button
                    onClick={() => handleBookSlot(tour)}
                    className="w-full py-3 rounded-xl bg-[#f5a623] hover:bg-[#e0961b] text-neutral-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-98 transition cursor-pointer"
                  >
                    <Calendar className="w-4 h-4 text-neutral-950" />
                    <span>BOOK TOUR SLOT</span>
                  </button>
                </div>
              ))}
            </div>

            {/* Quick in-modal reservation drawer if booking active */}
            {bookingTour && (
              <form onSubmit={handleConfirmReservation} className="p-4 rounded-2xl bg-zinc-950 border border-amber-500/40 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between pb-1 border-b border-zinc-900">
                  <span className="text-xs font-bold text-amber-300">Reserve Slot: {bookingTour.title}</span>
                  <button type="button" onClick={() => setBookingTour(null)} className="text-zinc-500 hover:text-white text-xs">Cancel</button>
                </div>
                {bookingSuccess ? (
                  <p className="text-xs text-emerald-400 font-bold py-2">✓ Reservation request submitted! Awaiting guide confirmation.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="text-[10px] text-zinc-400 block mb-1">Date</label>
                        <input
                          type="date"
                          required
                          value={bookingDate}
                          onChange={e => setBookingDate(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white text-xs outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-400 block mb-1">Time</label>
                        <input
                          type="time"
                          required
                          value={bookingTime}
                          onChange={e => setBookingTime(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white text-xs outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={bookingSubmitting}
                      className="w-full py-2.5 rounded-xl bg-amber-500 text-black font-bold text-xs uppercase"
                    >
                      {bookingSubmitting ? 'Sending Request...' : 'Confirm Request'}
                    </button>
                  </>
                )}
              </form>
            )}
          </div>

          {/* Handshake-Gated Reviews Section matching Screenshot 2 */}
          <div className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-amber-400">
                <Award className="w-4 h-4 text-amber-400" />
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400">
                  HANDSHAKE-GATED REVIEWS ({reviews.length})
                </span>
              </div>
              <span className="text-[11px] font-mono text-zinc-500">
                Max 111 chars
              </span>
            </div>

            {/* Reviews display */}
            {reviewsLoading ? (
              <div className="p-4 text-center text-xs text-zinc-500 font-mono">
                Loading verified reviews...
              </div>
            ) : reviews.length === 0 ? (
              <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800/80 p-5 text-center text-xs text-zinc-400">
                No reviews yet. Complete a Handshake to share the first review!
              </div>
            ) : (
              <div className="space-y-2">
                {reviews.map(rev => (
                  <div key={rev.id} className="rounded-xl bg-zinc-900/50 border border-zinc-800/80 p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-purple-900/50 border border-purple-500/30 flex items-center justify-center text-[10px] text-purple-300 font-bold">
                          {rev.reviewer_name.slice(0, 1)}
                        </span>
                        <span className="text-xs font-bold text-zinc-200">{rev.reviewer_name}</span>
                      </div>
                      <div className="flex items-center gap-0.5 text-amber-400 text-xs">
                        {Array.from({ length: rev.rating }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-amber-400" />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-zinc-300 font-light leading-relaxed">
                      &ldquo;{rev.comment}&rdquo;
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Handshake Gating State */}
            {handshakeStatus === 'accepted' ? (
              <form onSubmit={handleSubmitReview} className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Verified Handshake Review
                  </span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className={`text-sm cursor-pointer ${star <= reviewRating ? 'text-amber-400' : 'text-zinc-600'}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  maxLength={111}
                  rows={2}
                  required
                  placeholder="Share your verified encounter experience (max 111 chars)..."
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-amber-500"
                />

                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-zinc-500">
                    {reviewComment.length}/111
                  </span>
                  <button
                    type="submit"
                    disabled={submittingReview || !reviewComment.trim()}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-3 h-3" />
                    <span>{submittingReview ? 'Posting...' : 'Post Review'}</span>
                  </button>
                </div>
                {reviewError && <p className="text-red-400 text-[11px]">{reviewError}</p>}
              </form>
            ) : (
              <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/80 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
                <span>🔒</span>
                <span>Handshake required before reviews can be posted.</span>
              </div>
            )}
          </div>
        </div>

        {/* Fixed Sticky Bottom Action Bar matching Screenshot 2 */}
        <div className="p-4 sm:p-5 border-t border-zinc-900 bg-[#0d0b12] shrink-0">
          <button
            onClick={handleMessage}
            className="w-full py-3.5 rounded-2xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-extrabold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-purple-600/30 active:scale-98 transition cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>MESSAGE GUARDIAN</span>
          </button>
        </div>
      </div>
    </div>
  );
};
