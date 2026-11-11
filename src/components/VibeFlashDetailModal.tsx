/**
 * Vibe Flash Detail Modal Component
 * Displays flash event details, countdown, RSVP toggles, and <= 33m LiveCheck arrival verification.
 */

import React, { useState, useEffect } from 'react';
import { X, Zap, MapPin, Clock, Users, Sparkles, CheckCircle2, Shield, Camera } from 'lucide-react';
import { VibeFlashItem } from '../domains/d13_vibe_flash/types';
import { toggleFlashInterested, toggleFlashGoing } from '../domains/d13_vibe_flash/api';
import { useUser } from '../contexts/UserContext';
import { checkPlaceProximity, processLiveCheckReceiptVerification } from '../domains/d03_vibe_orbit/presenceVerifier';

interface VibeFlashDetailModalProps {
  flash: VibeFlashItem;
  isOpen: boolean;
  onClose: () => void;
  onRequireAuth?: () => void;
  onToast?: (msg: string) => void;
}

export const VibeFlashDetailModal: React.FC<VibeFlashDetailModalProps> = ({
  flash,
  isOpen,
  onClose,
  onRequireAuth,
  onToast
}) => {
  const { user } = useUser();
  const [interested, setInterested] = useState(false);
  const [going, setGoing] = useState(false);
  const [checkingGps, setCheckingGps] = useState(false);
  const [proximityStatus, setProximityStatus] = useState<{ distance: number; isWithin33m: boolean } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Camera / LiveCheck state for VQ Hunt reward
  const [showCamera, setShowCamera] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [successClaimed, setSuccessClaimed] = useState(false);

  useEffect(() => {
    if (user && flash) {
      setInterested(flash.interested_ids.includes(user.id));
      setGoing(flash.going_ids.includes(user.id));
    }
  }, [user, flash]);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  if (!isOpen) return null;

  const handleToggleInterested = async () => {
    if (!user) {
      if (onRequireAuth) onRequireAuth();
      return;
    }
    const res = await toggleFlashInterested(flash.id, user.id);
    if (res.success) {
      setInterested(res.isInterested);
      if (res.isInterested) setGoing(false);
    }
  };

  const handleToggleGoing = async () => {
    if (!user) {
      if (onRequireAuth) onRequireAuth();
      return;
    }
    const res = await toggleFlashGoing(flash.id, user.id);
    if (res.success) {
      setGoing(res.isGoing);
      if (res.isGoing) setInterested(false);
    }
  };

  const handleCheckProximity = async () => {
    setCheckingGps(true);
    setGpsError(null);
    const res = await checkPlaceProximity(flash.lat, flash.lng);
    setCheckingGps(false);
    if (res.error) {
      setGpsError(res.error);
      return;
    }
    if (res.distanceMeters !== null) {
      setProximityStatus({
        distance: res.distanceMeters,
        isWithin33m: res.isWithin33m
      });
    }
  };

  const startLiveCheckCamera = async () => {
    setGpsError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setGpsError('LiveCheck camera is not supported by your browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraActive(true);
      setShowCamera(true);
    } catch (err: any) {
      setGpsError(err?.message || 'Camera permission was denied.');
    }
  };

  const captureLiveCheckPhoto = async () => {
    const video = videoRef.current;
    if (!video || !streamRef.current || video.videoWidth <= 0) {
      setGpsError('Camera preview is not ready.');
      return;
    }

    setCapturing(true);
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setCapturing(false);
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    // Stop camera
    streamRef.current.getTracks().forEach(t => t.stop());
    setCameraActive(false);
    setShowCamera(false);

    if (!user) {
      setCapturing(false);
      if (onRequireAuth) onRequireAuth();
      return;
    }

    const prox = await checkPlaceProximity(flash.lat, flash.lng);
    if (!prox.isWithin33m || prox.distanceMeters === null) {
      setCapturing(false);
      setGpsError(`You are ${prox.distanceMeters ?? '?'}m away. Must be within 33m to claim VQ hunt reward.`);
      return;
    }

    const res = await processLiveCheckReceiptVerification({
      placeId: flash.place_id || flash.id,
      placeTitle: flash.title,
      userId: user.id,
      userCoords: prox.userCoords || { latitude: flash.lat, longitude: flash.lng },
      placeCoords: { lat: flash.lat, lng: flash.lng },
      receiptImageData: dataUrl
    });

    setCapturing(false);
    if (!res.success) {
      setGpsError(res.error || 'LiveCheck verification failed.');
      return;
    }

    setSuccessClaimed(true);
    if (onToast) onToast(`🎯 +${res.vqEarned} VQ Hunt Reward Claimed via LiveCheck!`);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
    >
      <div className="relative w-full max-w-md bg-[#14101c] border border-fuchsia-500/50 rounded-[28px] overflow-hidden shadow-2xl text-white my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between bg-gradient-to-r from-fuchsia-950/40 via-neutral-900 to-neutral-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/40">
              <Zap className="w-5 h-5 fill-fuchsia-400" />
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-tight">
                {flash.title}
              </h3>
              <p className="text-xs text-neutral-400 truncate max-w-[240px]">
                Hosted by <span className="text-fuchsia-300 font-semibold">@{flash.creator_name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {flash.photo_url && (
            <div className="w-full h-52 rounded-2xl border border-neutral-800 shadow-lg overflow-hidden mb-2">
              <img src={flash.photo_url} alt={flash.title} className="w-full h-full object-cover" />
            </div>
          )}

          {gpsError && (
            <div className="p-3 bg-red-950/60 border border-red-500/40 text-red-200 rounded-xl">
              {gpsError}
            </div>
          )}

          {successClaimed && (
            <div className="p-4 bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 rounded-2xl text-center space-y-1">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <div className="font-black text-sm">LiveCheck Verified & Reward Claimed!</div>
              <p className="text-[11px] text-emerald-300/80">+500 VQ credited to your Purse.</p>
            </div>
          )}

          <div className="rounded-2xl bg-neutral-900/80 border border-neutral-800 p-4 space-y-3">
            <div className="flex items-center justify-between text-neutral-300">
              <span className="flex items-center gap-1.5 font-bold">
                <MapPin className="w-4 h-4 text-orange-400" />
                <span>{flash.venue_name}</span>
              </span>
              <span className="text-neutral-400 font-mono text-[11px]">{flash.address}</span>
            </div>

            {flash.description && (
              <p className="text-neutral-300 leading-relaxed bg-neutral-950/60 p-3 rounded-xl border border-neutral-800">
                {flash.description}
              </p>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-800">
              <div>
                <span className="text-[10px] text-neutral-500 uppercase font-bold">Entry Type</span>
                <div className="font-bold text-white text-xs">{flash.entry_type} {flash.entry_price_tnd ? `(${flash.entry_price_tnd})` : ''}</div>
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 uppercase font-bold">Capacity</span>
                <div className="font-bold text-fuchsia-300 text-xs">{flash.going_ids.length} / {flash.max_capacity} Going</div>
              </div>
            </div>
          </div>

          {/* Mutually Exclusive Interested vs Going */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleToggleInterested}
              className={`py-3 px-4 rounded-xl font-bold transition cursor-pointer flex items-center justify-center gap-1.5 border ${
                interested
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              <span>⭐ Interested ({flash.interested_ids.length})</span>
            </button>
            <button
              type="button"
              onClick={handleToggleGoing}
              className={`py-3 px-4 rounded-xl font-black transition cursor-pointer flex items-center justify-center gap-1.5 border ${
                going
                  ? 'bg-fuchsia-600 border-fuchsia-400 text-white shadow-lg shadow-fuchsia-600/30'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              <span>🔥 Going ({flash.going_ids.length})</span>
            </button>
          </div>

          {/* VQ Hunt & LiveCheck Verification Section */}
          <div className="rounded-2xl bg-gradient-to-br from-amber-950/40 via-neutral-900 to-neutral-900 border border-amber-500/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>VQ Hunt & Arrival (≤33m)</span>
              </span>
              <span className="font-mono text-amber-300 font-bold">+500 VQ Reward</span>
            </div>

            {!proximityStatus ? (
              <button
                type="button"
                onClick={handleCheckProximity}
                disabled={checkingGps}
                className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black uppercase tracking-wider transition cursor-pointer shadow-md disabled:opacity-50"
              >
                {checkingGps ? 'Checking GPS Proximity...' : '📍 Verify GPS Arrival (≤33m)'}
              </button>
            ) : proximityStatus.isWithin33m ? (
              <div className="space-y-2">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold text-center">
                  🟢 Verified Inside 33m Zone ({proximityStatus.distance}m away) — Unlocked!
                </div>
                {!successClaimed && (
                  <button
                    type="button"
                    onClick={startLiveCheckCamera}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider transition cursor-pointer shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    <span>📸 Capture LiveCheck Receipt for +500 VQ</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 font-semibold text-center">
                🔴 Outside 33m Zone ({proximityStatus.distance}m away). Move within 33 meters of {flash.venue_name} to claim hunt reward.
              </div>
            )}
          </div>

          {/* LiveCheck Camera Viewfinder Modal */}
          {showCamera && (
            <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center p-4">
              <div className="relative w-full max-w-md bg-neutral-900 rounded-3xl overflow-hidden border border-emerald-500/50 shadow-2xl space-y-4 p-4 text-center">
                <div className="flex items-center justify-between">
                  <span className="font-black text-emerald-400 text-xs uppercase tracking-wider">LiveCheck Camera Receipt Viewfinder</span>
                  <button
                    onClick={() => {
                      streamRef.current?.getTracks().forEach(t => t.stop());
                      setShowCamera(false);
                    }}
                    className="p-1 text-neutral-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="relative aspect-square w-full bg-black rounded-2xl overflow-hidden border border-neutral-800">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  <div className="absolute bottom-3 left-3 right-3 p-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-[10px] text-emerald-300 font-mono">
                    📍 {flash.title} • Live GPS Verified (≤33m) • {new Date().toLocaleTimeString()}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={captureLiveCheckPhoto}
                  disabled={capturing}
                  className="w-full py-3.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black uppercase tracking-wider text-xs transition cursor-pointer shadow-lg shadow-emerald-500/30 disabled:opacity-50"
                >
                  {capturing ? 'Verifying Receipt...' : '📸 Snap Live Receipt & Claim +500 VQ'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
