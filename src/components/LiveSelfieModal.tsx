import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Camera, X } from 'lucide-react';
import type { UserProfile } from '../domains/d01_auth';
import { registerGuardian } from '../domains/d07_guardians';
import type { VibeGuardian } from '../domains/d07_trails';
import { SelfieCameraStep } from './guardian/SelfieCameraStep';
import { GuardianProfileFormStep } from './guardian/GuardianProfileFormStep';

interface LiveSelfieModalProps {
  user: UserProfile | null;
  onClose: () => void;
  onVerified: (timestamp: string) => void;
  onGuardianSaved?: (guardian: VibeGuardian) => void;
  availableTrails?: Array<{id:string;title:string}>;
  initialGuardianType?: 'local' | 'pro';
  onToast: (message: string) => void;
}
type GuardianTrailItem = { id: string; title: string; link?: string; flatPrice?: number };

export const LiveSelfieModal: React.FC<LiveSelfieModalProps> = ({
  user, onClose, onVerified, onGuardianSaved, onToast, availableTrails = [], initialGuardianType
}) => {
  const [step, setStep] = useState<'camera' | 'details'>('camera');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const countdownTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [guardianType, setGuardianType] = useState<'local' | 'pro'>(initialGuardianType ?? (user?.accountType === 'pro' ? 'pro' : 'local'));
  const [name, setName] = useState(user?.full_name || '');
  const [city, setCity] = useState(user?.city || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [pricingType, setPricingType] = useState<'hourly' | 'flat'>('hourly');
  const [hourlyRate, setHourlyRate] = useState(30);
  const [flatRate, setFlatRate] = useState(75);
  const [trails, setTrails] = useState<GuardianTrailItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  };
  const startCamera = async () => {
    stopCamera();
    setCameraError(false);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(true);
      setError('A compatible front camera is not available.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraActive(true);
    } catch (failure) {
      setCameraError(true);
      setError(failure instanceof Error ? failure.message : 'Camera permission was denied.');
    }
  };
  useEffect(() => {
    if (step === 'camera') void startCamera();
    else stopCamera();
    return () => {
      streamRef.current?.getTracks().forEach(track => track.stop());
      if (countdownTimeout.current) clearTimeout(countdownTimeout.current);
    };
  }, [step]);

  const performCapture = () => {
    const video = videoRef.current;
    if (!video || !streamRef.current || video.videoWidth <= 0 || video.videoHeight <= 0) {
      setCameraError(true);
      setError('The front camera is not ready. Retry capture.');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) { setError('Image capture is unavailable.'); return; }
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (!blob) { setError('Camera image capture failed.'); return; }
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedBlob(blob);
      setCapturedPhotoUrl(dataUrl);
      stopCamera();
      setStep('details');
    }, 'image/jpeg', 0.85);
  };
  const snapSelfie = () => {
    if (!cameraActive || countdown !== null) return;
    setError(null);
    const tick = (n: number) => {
      setCountdown(n);
      if (n === 0) {
        setCountdown(null);
        performCapture();
      } else {
        countdownTimeout.current = setTimeout(() => tick(n - 1), 1000);
      }
    };
    tick(3);
  };
  const retake = () => {
    setCapturedPhotoUrl(null);
    setCapturedBlob(null);
    setStep('camera');
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    if (!user) { setError('Sign in to become a Guardian.'); return; }
    if (!capturedBlob || !capturedPhotoUrl) { setError('Capture a fresh in-app selfie first.'); return; }
    if (!name.trim() || name.trim() !== user.full_name.trim()) {
      setError('Guardian identity must match your existing public profile name.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const guardian = await registerGuardian({
        guardianType,city:city.trim(),bio:bio.trim(),
        pricingType:guardianType === 'pro' ? pricingType : undefined,
        rate:guardianType === 'pro' ? (pricingType === 'hourly' ? hourlyRate : flatRate) : undefined,
        linkedTrailIds:trails.map(trail => trail.id),selfie:capturedBlob
      });
      onGuardianSaved?.(guardian);
      onVerified(guardian.selfieCapturedAt);
      onToast('Guardian registration saved. Fresh selfie recorded.');
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Guardian registration failed.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-[#110F15] border border-white/10 rounded-3xl w-full max-w-lg max-h-[90dvh] overflow-y-auto text-left shadow-2xl relative flex flex-col">
          <div className="bg-[#17141E] border-b border-white/10 p-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
                <Camera className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-extrabold text-white">
                {step === 'camera' ? 'Front-Camera Selfie' : 'Guardian Profile Details'}
              </h3>
            </div>
            <button type="button" aria-label="Close Guardian registration" onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          {step === 'camera' ? (
            <SelfieCameraStep videoRef={videoRef} cameraActive={cameraActive}
              cameraError={cameraError} countdown={countdown}
              onSnapSelfie={snapSelfie} onRetryCamera={() => { setError(null); void startCamera(); }} />
          ) : (
            <GuardianProfileFormStep capturedPhotoUrl={capturedPhotoUrl!}
              guardianType={guardianType} setGuardianType={setGuardianType}
              name={name} setName={setName} city={city} setCity={setCity}
              pricingType={pricingType} setPricingType={setPricingType}
              hourlyRate={hourlyRate} setHourlyRate={setHourlyRate}
              flatRate={flatRate} setFlatRate={setFlatRate}
              bio={bio} setBio={setBio} trails={trails}
              onRemoveTrail={(index) => setTrails(previous => previous.filter((_,i) => i !== index))}
              availableTrails={availableTrails}
              onAddTrail={id => {
                const found = availableTrails.find(item => item.id === id);
                if (found) setTrails(previous => previous.length < 5 && !previous.some(t => t.id === id) ? [...previous, found] : previous);
              }}
              onRetakePhoto={retake} onSubmit={save} submitting={saving} error={error}
              proEligible={user?.accountType === 'pro'} />
          )}
          {step === 'camera' && error && <p role="alert" className="text-xs text-red-400 px-5 pb-5">{error}</p>}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
