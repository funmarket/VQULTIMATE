import React from 'react';
import { Camera, RefreshCw, AlertTriangle, Shield } from 'lucide-react';

interface SelfieCameraStepProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cameraActive: boolean;
  cameraError: boolean;
  countdown: number | null;
  onSnapSelfie: () => void;
  onRetryCamera: () => void;
}

export const SelfieCameraStep: React.FC<SelfieCameraStepProps> = ({
  videoRef,
  cameraActive,
  cameraError,
  countdown,
  onSnapSelfie,
  onRetryCamera,
}) => {
  return (
    <div className="p-5 space-y-5 text-center flex flex-col items-center">
      <div className="space-y-1">
        <h3 className="text-base font-extrabold text-[#050505] dark:text-white">Live In-App Selfie Verification</h3>
        <p className="text-xs text-[#65676B] dark:text-zinc-400 max-w-xs">
          Take a fresh front-camera snapshot. Gallery uploads are prohibited under the 7-day freshness policy.
        </p>
      </div>

      {/* Viewfinder Circle */}
      <div className="relative w-[min(16rem,70vw)] h-[min(16rem,70vw)] rounded-full overflow-hidden border-4 border-[#0866FF]/40 dark:border-purple-500/40 shadow-2xl bg-[#F0F2F5] dark:bg-zinc-950 flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover scale-x-[-1] ${cameraActive ? 'block' : 'hidden'}`}
        />

        {!cameraActive && (
          <div className="p-4 text-center space-y-2">
            <AlertTriangle className="w-8 h-8 text-amber-500 dark:text-amber-400 mx-auto" />
            <p className="text-xs text-[#65676B] dark:text-zinc-400">Webcam standby or initializing...</p>
            <button
              type="button"
              onClick={onRetryCamera}
              className="text-[11px] text-[#0866FF] dark:text-purple-400 underline font-mono font-semibold cursor-pointer"
            >
              Retry Camera
            </button>
          </div>
        )}

        {countdown !== null && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
            <span className="text-6xl font-black text-amber-400 animate-ping font-mono">
              {countdown}
            </span>
          </div>
        )}
      </div>

      <div className="bg-[#E7F3FF] dark:bg-purple-950/20 border border-[#0866FF]/20 dark:border-purple-500/20 rounded-2xl p-3 text-left flex items-start gap-2.5 max-w-xs">
        <Shield className="w-4 h-4 text-[#0866FF] dark:text-purple-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-[#262626] dark:text-zinc-400">
          Selfie timestamps expire after <strong className="text-[#050505] dark:text-white">7 days</strong>. Guardians must take an updated in-app photo to maintain active status.
        </p>
      </div>

      <button
        type="button"
        onClick={onSnapSelfie}
        disabled={!cameraActive || countdown !== null}
        className="w-full max-w-xs py-3 rounded-2xl bg-[#0866FF] hover:bg-[#075CE5] dark:bg-gradient-to-r dark:from-purple-600 dark:to-indigo-600 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg hover:opacity-95 cursor-pointer active:scale-95 transition-all"
      >
        <Camera className="w-4 h-4" />
        Snap In-App Selfie
      </button>
    </div>
  );
};
