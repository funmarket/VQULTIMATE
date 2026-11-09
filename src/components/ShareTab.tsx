import React, { useEffect, useRef, useState } from 'react';
import { Camera, Zap, Clock3, Video, X, RefreshCw, Share2, SwitchCamera, Circle, Square, AlertCircle, ArrowLeft } from 'lucide-react';
import type { UserProfile } from '../domains/d01_auth';
import { createVibePost, VibePostItem } from '../domains/d05_vibe';
import { uploadDriftMedia } from '../domains/d15_drift';

type Mode = 'shot' | 'check' | 'flash' | 'snap' | 'dual';
type Stage = 'camera' | 'selfie' | 'review' | 'details';
type Mood = 'heart' | 'spark' | 'moments';

interface ShareTabProps {
  user: UserProfile | null;
  onPostSuccess: () => void;
  initialMode?: 'dual';
  cameraOnly?: boolean;
  onClose?: () => void;
}

const categories: { id: Mood; emoji: string; label: string; description: string }[] = [
  { id: 'heart', emoji: '💖', label: 'PURE HEART', description: 'Love and appreciation' },
  { id: 'spark', emoji: '🤗', label: 'FRIENDLY SPARK', description: 'Kindness and connection' },
  { id: 'moments', emoji: '🧘', label: 'SHARED MOMENTS', description: 'Help and shared experiences' },
];
const names: Record<Mode, string> = { shot: 'Live Vibe Shot', check: 'VibeCheck', flash: 'VibeFlash', snap: 'Vibe Snap', dual: 'Vibe Share' };

/** Share capture shell. Does not impersonate a D18 challenge or claim D12 publication. */
export const ShareTab: React.FC<ShareTabProps> = ({ user, onPostSuccess, initialMode, cameraOnly = false, onClose }) => {
  const [publishing, setPublishing] = useState(false);

  const handleShareInApp = async () => {
    if (!capture || !mode) return;
    setPublishing(true);
    setError(null);
    try {
      const extension = mode === 'snap' ? (capture.type.includes('mp4') ? 'mp4' : 'webm') : 'jpg';
      const file = new File([capture], 'vibequest-' + mode + '-' + Date.now() + '.' + extension, { type: capture.type });
      
      const uploadRes = await uploadDriftMedia(file, mode === 'snap' ? 'voice' : 'photo');
      if (!uploadRes.success || !uploadRes.url) {
        throw new Error(uploadRes.error || 'Media upload to storage failed. Cannot publish post without permanent media.');
      }
      const mediaUrl = uploadRes.url;

      const moodText = categories.find(item => item.id === category)?.label;
      const finalCaption = [caption.trim(), moodText].filter(Boolean).join(' · ') || 'Captured moment via VibeShare.';

      const newPost: VibePostItem = {
        id: 'post_' + Date.now(),
        user_id: user?.id || 'anon_explorer',
        username: user?.username || 'explorer',
        avatar_url: user?.avatar_url || '',
        caption: finalCaption,
        image_url: mediaUrl,
        selfie_url: user?.avatar_url || undefined,
        created_at: new Date().toISOString(),
        reactions_count: 0,
        comments_count: 0
      };

      const success = await createVibePost(newPost);
      if (!success) {
        throw new Error('Backend confirmation failed for vibe post publication.');
      }

      setPublishing(false);
      onPostSuccess();
    } catch (cause: any) {
      setPublishing(false);
      setError(cause?.message || 'Failed to publish to Gossip in-app feed.');
    }
  };
  const [mode, setMode] = useState<Mode | null>(initialMode ?? null);
  const [stage, setStage] = useState<Stage>('camera');
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [dualEnabled, setDualEnabled] = useState(initialMode === 'dual');
  const dualCapture = mode === 'flash' || ((mode === 'dual' || mode === 'shot' || mode === 'check') && dualEnabled);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [capture, setCapture] = useState<Blob | null>(null);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState<Mood | null>(null);
  const liveVideo = useRef<HTMLVideoElement>(null);
  const liveStream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);
  const dualScene = useRef<Blob | null>(null);
  const currentUrl = useRef<string | null>(null);
  const recordingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const session = useRef(0);

  const clearTimers = () => {
    if (recordingTimeout.current) clearTimeout(recordingTimeout.current);
    if (recordingInterval.current) clearInterval(recordingInterval.current);
    recordingTimeout.current = null;
    recordingInterval.current = null;
  };
  const stopStream = () => {
    liveStream.current?.getTracks().forEach(track => track.stop());
    liveStream.current = null;
    if (liveVideo.current) liveVideo.current.srcObject = null;
    setReady(false);
  };
  const discardCapture = () => {
    if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
    currentUrl.current = null;
    setPreview(null);
    setCapture(null);
  };
  const cancelRecording = () => {
    clearTimers();
    const active = recorder.current;
    recorder.current = null;
    if (active && active.state !== 'inactive') active.stop();
    setRecording(false);
  };
  const resetCamera = () => {
    session.current += 1;
    cancelRecording();
    stopStream();
    discardCapture();
    dualScene.current = null;
    setError(null);
    setStage('camera');
    setCaption('');
  };
  const closeCamera = () => {
    resetCamera();
    setMode(null);
    onClose?.();
  };
  const openCamera = (next: Mode) => {
    resetCamera();
    setFacing('environment');
    setDualEnabled(next === 'flash' || next === 'dual');
    setSeconds(0);
    setMode(next);
  };

  useEffect(() => {
    if (!mode || stage === 'review' || stage === 'details') return;
    let cancelled = false;
    const ticket = session.current;
    setReady(false);
    setError(null);
    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('This browser cannot open a camera. Use a supported browser over HTTPS.');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: dualCapture ? { exact: facing } : { ideal: facing } },
          audio: false,
        });
        if (cancelled || ticket !== session.current) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        liveStream.current = stream;
        const video = liveVideo.current;
        const track = stream.getVideoTracks()[0];
        if (!video || !track || track.readyState !== 'live') {
          throw new Error('The camera did not provide a live video track.');
        }
        const actualFacing = track.getSettings().facingMode;
        if (dualCapture && actualFacing && actualFacing !== facing) {
          throw new Error('The requested ' + (facing === 'user' ? 'front' : 'back') + ' camera is not active.');
        }
        video.srcObject = stream;
        await video.play();
        if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth || !video.videoHeight) {
          await new Promise<void>((resolve, reject) => {
            const cleanup = () => {
              video.removeEventListener('loadeddata', checkFrame);
              video.removeEventListener('error', failed);
              clearTimeout(timeout);
            };
            const checkFrame = () => {
              if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth && video.videoHeight) {
                cleanup();
                resolve();
              }
            };
            const failed = () => { cleanup(); reject(new Error('Camera preview failed to load.')); };
            const timeout = setTimeout(() => { cleanup(); reject(new Error('Camera preview did not become ready.')); }, 8000);
            video.addEventListener('loadeddata', checkFrame);
            video.addEventListener('error', failed);
            checkFrame();
          });
        }
        if (cancelled || ticket !== session.current) {
          stream.getTracks().forEach(activeTrack => activeTrack.stop());
          return;
        }
        if (track.readyState !== 'live') throw new Error('Camera disconnected before capture.');
        setReady(true);
      } catch (cause) {
        if (cancelled || ticket !== session.current) return;
        liveStream.current?.getTracks().forEach(track => track.stop());
        liveStream.current = null;
        if (liveVideo.current) liveVideo.current.srcObject = null;
        setReady(false);
        setError(cause instanceof Error ? 'Camera unavailable: ' + cause.message : 'Camera permission denied or no camera available.');
      }
    }
    void start();
    return () => {
      cancelled = true;
      liveStream.current?.getTracks().forEach(track => track.stop());
      liveStream.current = null;
    };
  }, [mode, stage, facing, dualCapture]);

  useEffect(() => () => {
    session.current += 1;
    clearTimers();
    const active = recorder.current;
    if (active && active.state !== 'inactive') active.stop();
    liveStream.current?.getTracks().forEach(track => track.stop());
    if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
  }, []);

  const showCapture = (file: Blob) => {
    if (!file.size) {
      setError('Capture produced an empty file. Please try again.');
      return;
    }
    discardCapture();
    const url = URL.createObjectURL(file);
    currentUrl.current = url;
    setPreview(url);
    setCapture(file);
    setStage('review');
    stopStream();
  };

  const takePhoto = async () => {
    const video = liveVideo.current;
    const track = liveStream.current?.getVideoTracks()[0];
    const actualFacing = track?.getSettings().facingMode;
    if (!ready || !video?.videoWidth || !video.videoHeight ||
        video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
        !track || track.readyState !== 'live' ||
        (dualCapture && actualFacing && actualFacing !== facing)) {
      setError('Wait for the correct live camera image before taking a photo.');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) { setError('Photo capture is unavailable.'); return; }
    if (facing === 'user') { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const ticket = session.current;
    const file = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    if (ticket !== session.current) return;
    if (!file?.size) { setError('Camera could not capture the photo.'); return; }
    if (dualCapture && stage === 'camera') {
      dualScene.current = file;
      setReady(false);
      setFacing('user');
      setStage('selfie');
      return;
    }
    if (dualCapture && stage === 'selfie') {
      if (!dualScene.current) { setError('Scene photo missing; please retake.'); return; }
      try {
        const [scene, selfie] = await Promise.all([createImageBitmap(dualScene.current), createImageBitmap(file)]);
        if (ticket !== session.current) { scene.close(); selfie.close(); return; }
        const combined = document.createElement('canvas');
        combined.width = scene.width;
        combined.height = scene.height;
        const ctx2 = combined.getContext('2d');
        if (!ctx2) throw new Error('Cannot combine photos.');
        ctx2.drawImage(scene, 0, 0, combined.width, combined.height);
        const width = Math.round(combined.width * 0.27);
        const height = Math.round(width * 4 / 3);
        const x = Math.round(combined.width * 0.04), y = Math.round(combined.height * 0.04);
        ctx2.fillStyle = '#f97316';
        ctx2.fillRect(x - 4, y - 4, width + 8, height + 8);
        ctx2.drawImage(selfie, x, y, width, height);
        scene.close();
        selfie.close();
        const composite = await new Promise<Blob | null>(resolve => combined.toBlob(resolve, 'image/jpeg', 0.9));
        if (ticket !== session.current) return;
        if (!composite?.size) throw new Error('Cannot encode dual-camera image.');
        showCapture(composite);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Dual-camera capture failed.');
      }
      return;
    }
    showCapture(file);
  };

  const stopRecording = () => {
    clearTimers();
    if (recorder.current?.state === 'recording') recorder.current.stop();
    setRecording(false);
  };
  const startRecording = () => {
    const stream = liveStream.current;
    if (!ready || !stream?.getVideoTracks().some(track => track.readyState === 'live')) {
      setError('Wait for the camera to be ready before recording.');
      return;
    }
    if (typeof MediaRecorder === 'undefined') {
      setError('This browser does not support video recording.');
      return;
    }
    const format = ['video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find(item => MediaRecorder.isTypeSupported(item));
    if (!format) { setError('No supported video recording format found.'); return; }
    try {
      const active = new MediaRecorder(stream, { mimeType: format });
      const ticket = session.current;
      recordedChunks.current = [];
      active.ondataavailable = event => { if (event.data.size) recordedChunks.current.push(event.data); };
      active.onerror = () => {
        setError('Video recording failed.');
        clearTimers();
        setRecording(false);
      };
      active.onstop = () => {
        if (ticket !== session.current) return;
        clearTimers();
        setRecording(false);
        showCapture(new Blob(recordedChunks.current, { type: active.mimeType || format }));
      };
      recorder.current = active;
      active.start(250);
      setSeconds(0);
      setRecording(true);
      const started = Date.now();
      recordingInterval.current = setInterval(() => setSeconds(Math.min(10, Math.floor((Date.now() - started) / 1000))), 200);
      recordingTimeout.current = setTimeout(stopRecording, 10000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to start recording.');
    }
  };

  const retake = () => {
    session.current += 1;
    discardCapture();
    dualScene.current = null;
    setFacing('environment');
    setError(null);
    setSeconds(0);
    setStage('camera');
  };
  const shareOrSave = async () => {
    if (!capture || !mode) return;
    const extension = mode === 'snap' ? (capture.type.includes('mp4') ? 'mp4' : 'webm') : 'jpg';
    const file = new File([capture], 'vibequest-' + mode + '-' + Date.now() + '.' + extension, { type: capture.type });
    const moodText = categories.find(item => item.id === category)?.label;
    const message = [caption.trim(), moodText].filter(Boolean).join(' · ');
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'VibeQuest', text: message });
        return;
      } catch (cause) {
        if ((cause as Error)?.name === 'AbortError') return;
      }
    }
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="pb-24 text-white" data-testid="share-good-vibes">
      {!cameraOnly && <section className="rounded-[24px] border border-neutral-700/70 bg-[#101011] px-3 py-5 sm:px-5 shadow-[0_18px_65px_rgba(0,0,0,.45)]">
        <header className="text-center">
          <h1 className="relative inline-block whitespace-nowrap text-[clamp(1.3rem,6.5vw,2.2rem)] font-black italic leading-tight tracking-[-.055em]">
            <span className="text-white">Share Good </span>
            <span className="relative text-orange-400">Vibes<span aria-hidden="true" className="absolute -bottom-1 left-1 right-0 h-[4px] -rotate-3 rounded-full bg-orange-400" /></span>
          </h1>
          <p className="mx-auto mt-3 max-w-[34rem] text-[13px] leading-relaxed text-neutral-300">
            Share the moment. Feel the city together. Right now.
            <span className="block">Warm, authentic human presence recorded in physical proximity.</span>
          </p>
        </header>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <button type="button" onClick={() => openCamera('shot')} className="min-h-[128px] min-w-0 rounded-[18px] border border-neutral-700 bg-gradient-to-b from-[#19191a] to-[#131314] p-2 text-left hover:border-pink-500/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-400">
            <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-2xl bg-pink-500/20 text-pink-400"><Camera size={19} /></span>
            <span className="block text-[clamp(.66rem,2.85vw,.9rem)] font-extrabold leading-tight">Live Vibe Shot</span>
            <span className="mt-2 block text-[10px] leading-snug text-neutral-300">Camera only — no uploads</span>
          </button>
          <button type="button" onClick={() => openCamera('check')} className="min-h-[128px] min-w-0 rounded-[18px] border border-neutral-700 bg-gradient-to-b from-[#19191a] to-[#131314] p-2 text-left hover:border-violet-500/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400">
            <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-2xl bg-purple-500/20 text-purple-400"><Zap size={19} /></span>
            <span className="block text-[clamp(.66rem,2.85vw,.9rem)] font-extrabold leading-tight">VibeCheck</span>
            <span className="mt-2 block text-[10px] leading-snug text-neutral-300">3-min live response</span>
          </button>
          <button type="button" onClick={() => openCamera('flash')} className="min-h-[128px] min-w-0 rounded-[18px] border border-neutral-700 bg-gradient-to-b from-[#19191a] to-[#131314] p-2 text-left hover:border-amber-500/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400">
            <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400"><Clock3 size={19} /></span>
            <span className="block text-[clamp(.66rem,2.85vw,.9rem)] font-extrabold leading-tight">VibeFlash</span>
            <span className="mt-2 block text-[10px] leading-snug text-orange-400">60-second window</span>
          </button>
        </div>
        <button type="button" onClick={() => openCamera('snap')} className="mt-5 flex w-full items-center justify-center gap-2 rounded-full border-2 border-lime-400 bg-lime-400/[.045] px-3 py-3 text-lime-300 hover:bg-lime-400/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
          <Video className="h-6 w-6 shrink-0" />
          <span className="text-center"><strong className="block text-lg font-black leading-none tracking-tight">VIBE SNAP</strong><span className="mt-1 block text-sm text-white">a 10-second video moment</span></span>
        </button>
        <div className="mt-5 border-t border-neutral-700 pt-4">
          <div className="grid grid-cols-3 gap-2">
            {categories.map(item => (
              <button key={item.id} type="button" aria-pressed={category === item.id} onClick={() => setCategory(previous => previous === item.id ? null : item.id)} title={item.description}
                className={category === item.id
                  ? 'min-w-0 rounded-2xl border border-lime-400 bg-lime-400/10 px-1 py-3 text-[10px] font-extrabold leading-tight text-lime-200 sm:text-xs'
                  : 'min-w-0 rounded-2xl border border-neutral-700 bg-neutral-800/70 px-1 py-3 text-[10px] font-extrabold leading-tight text-neutral-200 hover:border-neutral-500 sm:text-xs'}>
                <span className="block text-xl" aria-hidden="true">{item.emoji}</span>{item.label}
              </button>
            ))}
          </div>
          {category && <p className="mt-3 text-center text-xs text-lime-200" role="status">{categories.find(item => item.id === category)?.description} selected for your next captured moment.</p>}
        </div>
      </section>}

      {mode && (
        <div data-testid={mode === 'dual' ? 'vibe-dual-camera' : 'share-camera-dialog'} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95 p-3" role="dialog" aria-modal="true" aria-label={names[mode]}>
          <div className="flex max-h-[96dvh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-3xl border border-neutral-700 bg-neutral-950 p-4 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2"><Camera className="text-orange-400" size={20} /><h2 className="text-lg font-black">{names[mode]}</h2></div>
              <button type="button" onClick={closeCamera} className="rounded-xl bg-neutral-800 p-2" aria-label="Close camera"><X size={21} /></button>
            </div>
            {(mode === 'check' || mode === 'flash') && <p className="rounded-xl border border-amber-800 bg-amber-950/40 p-3 text-xs text-amber-200">Live camera capture only. Timed challenge invitations and submissions are not connected yet; no challenge is sent or claimed.</p>}
            {dualCapture && <p className="text-xs text-neutral-300">{stage === 'selfie' ? 'Step 2 of 2: capture your front-camera selfie.' : stage === 'camera' ? 'Step 1 of 2: capture the scene with the back camera.' : stage === 'review' ? 'Review the real scene and selfie composite.' : 'Add optional details before sharing.'}</p>}
            {(mode === 'shot' || mode === 'check' || mode === 'dual') && stage === 'camera' && (
              <fieldset className="flex gap-2 rounded-xl border border-neutral-700 p-2" aria-label="Capture type">
                <legend className="px-1 text-xs text-neutral-300">Capture type</legend>
                <button type="button" aria-pressed={!dualEnabled} onClick={() => setDualEnabled(false)} className={!dualEnabled ? 'flex-1 rounded-lg bg-lime-400 px-3 py-2 text-xs font-bold text-neutral-950' : 'flex-1 rounded-lg bg-neutral-800 px-3 py-2 text-xs text-white'}>Single camera</button>
                <button type="button" aria-pressed={dualEnabled} onClick={() => { setFacing('environment'); setDualEnabled(true); }} className={dualEnabled ? 'flex-1 rounded-lg bg-lime-400 px-3 py-2 text-xs font-bold text-neutral-950' : 'flex-1 rounded-lg bg-neutral-800 px-3 py-2 text-xs text-white'}>Dual: scene + selfie</button>
              </fieldset>
            )}
            {mode === 'flash' && <p className="text-xs text-amber-300">Dual capture required: rear-camera scene and front-camera selfie. This preview does not submit a VibeFlash response.</p>}
            {mode === 'snap' && <p className="text-xs text-neutral-300">Record up to 10 seconds using a single camera (front/rear switch before recording). Dual video recording is not enabled in this trial. Nothing is uploaded automatically.</p>}
            <div className="relative flex min-h-[260px] flex-1 items-center justify-center overflow-hidden rounded-2xl border border-neutral-700 bg-black aspect-[4/5] max-h-[58dvh]">
              {(stage === 'camera' || stage === 'selfie')
                ? <video ref={liveVideo} muted playsInline autoPlay className={facing === 'user' ? 'h-full w-full scale-x-[-1] object-cover' : 'h-full w-full object-cover'} aria-label="Live camera preview" />
                : preview && (mode === 'snap'
                  ? <video src={preview} controls playsInline className="h-full w-full object-contain" aria-label="Recorded Vibe Snap preview" />
                  : <img src={preview} alt="Captured photo preview" className="h-full w-full object-contain" />)}
              {(stage === 'camera' || stage === 'selfie') && !ready && !error && <span className="absolute inset-0 flex items-center justify-center bg-black/65 text-sm text-neutral-300">Opening camera…</span>}
              {mode === 'snap' && recording && <span className="absolute left-3 top-3 rounded-full bg-red-600 px-3 py-1 text-xs font-bold">● REC {seconds}/10s</span>}
            </div>
            {error && <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-800 bg-red-950/70 p-3 text-sm text-red-200"><AlertCircle className="shrink-0" size={18} />{error}</p>}
            {(stage === 'camera' || stage === 'selfie') ? (
              <div className="flex gap-2">
                <button type="button" onClick={() => { setReady(false); setFacing(previous => previous === 'environment' ? 'user' : 'environment'); }} disabled={recording || !ready || dualCapture} className="rounded-xl bg-neutral-800 px-4 py-3" aria-label="Switch camera"><SwitchCamera size={21} /></button>
                {mode === 'snap'
                  ? (recording
                    ? <button type="button" onClick={stopRecording} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 font-bold"><Square size={18} /> Stop recording</button>
                    : <button type="button" onClick={startRecording} disabled={!ready} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-lime-400 px-4 py-3 font-black text-neutral-950 disabled:opacity-40"><Circle size={18} /> Record 10 seconds</button>)
                  : <button type="button" onClick={takePhoto} disabled={!ready} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 font-black disabled:opacity-40"><Camera size={20} /> {dualCapture ? (stage === 'selfie' ? 'Capture selfie' : 'Capture scene') : 'Capture photo'}</button>}
              </div>
            ) : stage === 'review' ? (
              <div className="space-y-3" data-testid="share-capture-review">
                <p className="text-sm font-bold text-lime-300">Capture ready for review</p>
                <p className="text-xs text-neutral-400">This preview is from your live camera. Nothing has been uploaded or published.</p>
                <div className="flex gap-2">
                  <button type="button" onClick={retake} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-neutral-800 p-3 font-bold"><RefreshCw size={17} /> Retake</button>
                  <button type="button" onClick={() => setStage('details')} className="flex flex-1 items-center justify-center rounded-xl bg-lime-400 p-3 font-black text-neutral-950">Use this capture</button>
                </div>
              </div>
            ) : (
              <div className="space-y-3" data-testid="share-capture-details">
                <h3 className="text-sm font-bold text-white">Broadcast details</h3>
                <label className="block text-xs font-semibold text-neutral-300" htmlFor="share-capture-caption">Caption (optional)</label>
                <textarea id="share-capture-caption" value={caption} maxLength={280} onChange={event => setCaption(event.target.value)} placeholder="What made this moment special?" className="w-full resize-none rounded-xl border border-neutral-700 bg-neutral-900 p-3 text-sm text-white" rows={2} />
                <p className="text-right text-xs text-neutral-400">{caption.length} / 280</p>
                <p className="text-xs text-neutral-400">Share Outside opens your device's share sheet, or downloads the captured file. In-app publication, private messaging and challenge submissions are not connected yet; nothing will be posted to Gossip.</p>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => void handleShareInApp()}
                    disabled={publishing}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-teal-500 p-3.5 font-black text-white shadow-lg hover:opacity-95 disabled:opacity-40 cursor-pointer"
                  >
                    <Share2 size={18} />
                    <span>{publishing ? 'Publishing to Gossip...' : 'Share in App (Publish to Gossip)'}</span>
                  </button>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setStage('review')} disabled={publishing} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-neutral-800 p-3 font-bold"><ArrowLeft size={17} /> Review</button>
                    <button type="button" onClick={() => void shareOrSave()} disabled={publishing} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-neutral-800 p-3 font-bold text-neutral-300"><Share2 size={17} /> Save / Outside</button>
                  </div>
                </div>
              </div>
            )}
            <button type="button" onClick={closeCamera} className="flex items-center justify-center gap-1 self-center px-4 py-2 text-xs text-neutral-400"><ArrowLeft size={14} /> Back to Share</button>
          </div>
        </div>
      )}
    </div>
  );
};
