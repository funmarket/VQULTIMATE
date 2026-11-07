import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  Sparkles,
  Send,
  Camera,
  Mic,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  Play,
  Pause,
  AlertCircle,
  X,
  Smile
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  DriftPrivateThread,
  DriftPrivateMessage,
  fetchPrivateMessages,
  sendPrivateMessage,
  requestVibeReveal,
  fetchRevealRequest,
  uploadDriftMedia
} from '../../domains/d15_drift';
import { DriftEmojiPicker } from './DriftEmojiPicker';

interface PrivateDriftViewProps {
  thread: DriftPrivateThread;
  currentUserId: string;
  currentHandle: string;
  onClose: () => void;
  onConfirmedVibeEstablished?: () => void;
}

export const PrivateDriftView: React.FC<PrivateDriftViewProps> = ({
  thread,
  currentUserId,
  currentHandle,
  onClose,
  onConfirmedVibeEstablished
}) => {
  const [messages, setMessages] = useState<DriftPrivateMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [revealState, setRevealState] = useState<'idle' | 'pending' | 'accepted'>('idle');
  const [revealCelebration, setRevealCelebration] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const isOnlyEmojis = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > 12) return false;
    const emojiRegex = /^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|\u200D|\uFE0F|\s)+$/u;
    return emojiRegex.test(trimmed);
  };

  const getEmojiAnimationClass = (char: string) => {
    if (char.includes('🔥') || char.includes('❤️‍🔥')) return 'animate-flame-flicker inline-block drop-shadow-[0_0_12px_rgba(249,115,22,0.85)]';
    if (char.includes('❤️') || char.includes('💖') || char.includes('💕') || char.includes('💗')) return 'animate-heart-pulse inline-block drop-shadow-[0_0_10px_rgba(244,63,94,0.8)]';
    if (char.includes('✨') || char.includes('⭐') || char.includes('💎')) return 'animate-star-spin inline-block drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]';
    if (char.includes('⚡') || char.includes('🔮') || char.includes('🧿')) return 'animate-neon-glow inline-block drop-shadow-[0_0_12px_rgba(45,212,191,0.9)]';
    if (char.includes('🚀') || char.includes('👻')) return 'animate-emoji-float inline-block';
    if (char.includes('🎉') || char.includes('😂') || char.includes('🤣') || char.includes('👾')) return 'animate-emoji-bounce inline-block';
    if (char.includes('🤯') || char.includes('😈') || char.includes('👋')) return 'animate-emoji-shake inline-block';
    return 'animate-heart-pulse inline-block';
  };

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const partnerHandle = thread.user_1_id === currentUserId ? thread.alias_2_handle : thread.alias_1_handle;
  const partnerUserId = thread.user_1_id === currentUserId ? thread.user_2_id : thread.user_1_id;

  // Calculate 3-hour expiry remaining time
  const [timeLeft, setTimeLeft] = useState('02:59:59');

  useEffect(() => {
    const updateCountdown = () => {
      const expiresAt = new Date(thread.expires_at).getTime();
      const diff = Math.max(0, expiresAt - Date.now());
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [thread.expires_at]);

  // Load messages and reveal status
  useEffect(() => {
    fetchPrivateMessages(thread.id).then(setMessages);
    fetchRevealRequest(thread.id).then((reqs) => {
      const myReq = reqs.find((r) => r.requester_user_id === currentUserId);
      if (myReq) {
        if (myReq.status === 'accepted') setRevealState('accepted');
        else setRevealState('pending');
      }
      const isBothAccepted = reqs.some(r => r.status === 'accepted');
      if (isBothAccepted) {
        setRevealState('accepted');
      }
    });

    // Realtime subscription on this thread
    const channel = supabase
      .channel(`drift_private_${thread.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'drift_private_messages', filter: `thread_id=eq.${thread.id}` },
        (payload) => {
          const newMsg = payload.new as DriftPrivateMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [thread.id, currentUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Audio recording handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());

        setUploading(true);
        const res = await uploadDriftMedia(audioBlob, 'voice');
        setUploading(false);

        if (res.success && res.url) {
          await sendPrivateMessage({
            threadId: thread.id,
            senderUserId: currentUserId,
            senderAliasHandle: currentHandle,
            content: null,
            mediaUrl: res.url,
            mediaType: 'voice',
            voiceDuration: recordingDuration || 5
          });
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      // Microphone permissions not granted or blocked in preview sandbox
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
    }
  };

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setInputText('');

    const res = await sendPrivateMessage({
      threadId: thread.id,
      senderUserId: currentUserId,
      senderAliasHandle: currentHandle,
      content: text
    });

    if (res.success && res.message) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === res.message!.id)) return prev;
        return [...prev, res.message!];
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const res = await uploadDriftMedia(file, 'photo');
    setUploading(false);

    if (res.success && res.url) {
      await sendPrivateMessage({
        threadId: thread.id,
        senderUserId: currentUserId,
        senderAliasHandle: currentHandle,
        content: null,
        mediaUrl: res.url,
        mediaType: 'photo'
      });
    }
  };

  const handleAudioPlay = (msgId: string, url: string) => {
    if (playingAudioId === msgId) {
      audioPlayerRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      if (audioPlayerRef.current) audioPlayerRef.current.pause();
      const audio = new Audio(url);
      audioPlayerRef.current = audio;
      setPlayingAudioId(msgId);
      audio.play();
      audio.onended = () => setPlayingAudioId(null);
    }
  };

  const handleRevealRequest = async () => {
    const res = await requestVibeReveal(thread.id, currentUserId, partnerUserId);
    if (res.success) {
      if (res.mutualAccepted) {
        setRevealState('accepted');
        setRevealCelebration(true);
        if (onConfirmedVibeEstablished) onConfirmedVibeEstablished();
      } else {
        setRevealState('pending');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0f] text-white flex flex-col animate-fadeIn select-none">
      {/* Top Bar */}
      <div className="bg-neutral-900/90 border-b border-neutral-800 p-3 flex items-center justify-between backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-2.5">
            <span className="text-2xl select-none">🎭</span>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-sm text-white">{partnerHandle}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-[10px] text-neutral-400">Private Drift • Anonymous 1:1</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* 3-Hour Expiry badge */}
          <div className="px-2.5 py-1 rounded-full bg-neutral-950 border border-pink-500/40 text-pink-400 font-mono text-[11px] flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>{timeLeft}</span>
          </div>

          {/* Reveal Vibe Handle button */}
          <button
            onClick={handleRevealRequest}
            disabled={revealState === 'accepted'}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 cursor-pointer ${
              revealState === 'accepted'
                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                : revealState === 'pending'
                ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                : 'bg-gradient-to-r from-amber-500 to-yellow-500 text-neutral-950 hover:opacity-90 shadow'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {revealState === 'accepted' ? 'Revealed' : revealState === 'pending' ? 'Pending Reveal' : '✨ Reveal'}
            </span>
          </button>
        </div>
      </div>

      {/* Ephemeral Warning Banner */}
      <div className="bg-neutral-950/80 border-b border-neutral-800/80 px-4 py-2 text-[11px] text-neutral-400 flex items-center justify-between">
        <span>🔒 Temporary conversation. Messages self-destruct after 3 hours.</span>
        <span className="text-pink-400 font-bold">SOC-002 Protected</span>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => {
          const isMine = msg.sender_user_id === currentUserId;
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[78%] rounded-2xl p-3 text-xs space-y-1.5 shadow-lg ${
                  isMine
                    ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-br-none'
                    : 'bg-neutral-900 border border-neutral-800 text-neutral-200 rounded-bl-none'
                }`}
              >
                {!isMine && (
                  <p className="text-[10px] font-bold text-teal-400">{msg.sender_alias_handle}</p>
                )}

                {msg.content && (
                  isOnlyEmojis(msg.content) ? (
                    <div className="py-1">
                      <span className={`text-4xl leading-none select-none ${getEmojiAnimationClass(msg.content)}`}>
                        {msg.content}
                      </span>
                    </div>
                  ) : (
                    <p className="leading-relaxed">{msg.content}</p>
                  )
                )}

                {/* Photo attachment */}
                {msg.media_type === 'photo' && msg.media_url && (
                  <div className="rounded-xl overflow-hidden mt-1 border border-white/10">
                    <img src={msg.media_url} alt="Shared drift photo" className="max-h-60 w-full object-cover" />
                  </div>
                )}

                {/* Voice note playback */}
                {msg.media_type === 'voice' && msg.media_url && (
                  <div className="flex items-center space-x-2 bg-black/30 p-2 rounded-xl">
                    <button
                      onClick={() => handleAudioPlay(msg.id, msg.media_url!)}
                      className="w-8 h-8 rounded-full bg-white text-neutral-950 flex items-center justify-center shadow hover:scale-105 transition cursor-pointer"
                    >
                      {playingAudioId === msg.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </button>
                    <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                      <div className={`h-full bg-teal-400 rounded-full ${playingAudioId === msg.id ? 'animate-pulse w-full' : 'w-1/3'}`} />
                    </div>
                    <span className="text-[10px] font-mono opacity-80">
                      0:{String(msg.voice_duration || 5).padStart(2, '0')}
                    </span>
                  </div>
                )}

                <p className="text-[9px] opacity-60 text-right">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Recording bar if mic active */}
      {isRecording && (
        <div className="bg-rose-500/20 border-t border-rose-500/40 p-3 flex items-center justify-between text-xs text-rose-300">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
            <span>Recording voice note... ({recordingDuration}s)</span>
          </div>
          <button
            onClick={stopRecording}
            className="px-3 py-1 rounded-xl bg-rose-500 text-white font-bold cursor-pointer"
          >
            Send Audio
          </button>
        </div>
      )}

      {/* Composer */}
      <form onSubmit={handleSendText} className="bg-neutral-900 border-t border-neutral-800 p-3 flex items-center space-x-2 relative">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*"
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition cursor-pointer"
          title="Attach Photo"
        >
          <ImageIcon className="w-4 h-4" />
        </button>

        <button
          type="button"
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
          className={`p-2.5 rounded-xl transition cursor-pointer ${
            isRecording
              ? 'bg-rose-500 text-white animate-pulse'
              : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white'
          }`}
          title="Hold to Record Voice"
        >
          <Mic className="w-4 h-4" />
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Message anonymously..."
          className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500"
        />

        {/* Telegram Emoji picker toggle button */}
        <button
          type="button"
          onClick={() => setEmojiPickerOpen((prev) => !prev)}
          className={`p-2.5 rounded-xl transition cursor-pointer ${
            emojiPickerOpen ? 'text-amber-400 bg-neutral-800' : 'text-neutral-400 hover:text-amber-300'
          }`}
          title="Telegram & Animated Emojis"
        >
          <Smile className="w-4 h-4" />
        </button>

        <button
          type="submit"
          disabled={!inputText.trim() || uploading}
          className="p-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 transition disabled:opacity-40 cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* Floating Telegram Drift Emoji Picker */}
      {emojiPickerOpen && (
        <div className="absolute bottom-16 right-3 sm:right-6 z-50 shadow-2xl">
          <DriftEmojiPicker
            onSelectEmoji={(char) => {
              setInputText((prev) => `${prev}${char}`);
              setEmojiPickerOpen(false);
            }}
            onClose={() => setEmojiPickerOpen(false)}
          />
        </div>
      )}

      {/* Mutual Reveal Celebration Modal */}
      {revealCelebration && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-neutral-900 border border-teal-500/50 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-teal-400 p-1 mx-auto shadow-xl">
              <div className="w-full h-full bg-neutral-950 rounded-full flex items-center justify-center text-2xl">
                ✨
              </div>
            </div>

            <h3 className="font-black text-xl text-white font-serif">Mutual Vibe Confirmed!</h3>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Both of you agreed to reveal your real Vibe Handles! You are now official double-matched companions.
            </p>

            <div className="p-3 bg-teal-500/10 border border-teal-500/30 rounded-2xl text-[11px] text-teal-300">
              ⚡ Permanent 1:1 direct messaging is now unlocked under your VIBES squad tab (SOC-002).
            </div>

            <button
              onClick={() => {
                setRevealCelebration(false);
                onClose();
              }}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 text-neutral-950 font-black text-xs shadow-lg hover:opacity-90 transition cursor-pointer"
            >
              Go to Confirmed Vibes
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
