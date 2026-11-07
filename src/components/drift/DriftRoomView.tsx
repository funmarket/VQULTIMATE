import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  DriftRoom,
  DriftAlias,
  DriftMessage,
  DriftPrivateThread,
  updateDriftAlias,
  fetchPrivateThreadById,
  recordRoomPresence,
  createOrGetPrivateThread
} from '../../domains/d15_drift';
import { DriftRoomHeader } from './DriftRoomHeader';
import { DriftMessageItem } from './DriftMessageItem';
import { DriftActiveSoulsDrawer } from './DriftActiveSoulsDrawer';
import { DriftComposer } from './DriftComposer';
import { DriftEmojiPicker } from './DriftEmojiPicker';
import { DriftUserActionModal } from './DriftUserActionModal';
import { DriftIdentityModal } from './DriftIdentityModal';
import { DriftAdminPinModal } from './DriftAdminPinModal';
import { CastBottleModal } from './CastBottleModal';
import { PrivateDriftView } from './PrivateDriftView';

import { useDriftRoomMessages } from './useDriftRoomMessages';
import { useDriftPresence } from './useDriftPresence';
import { useDriftVoiceRecorder } from './useDriftVoiceRecorder';
import { useDriftMediaUpload } from './useDriftMediaUpload';
import { useDriftModeration } from './useDriftModeration';

interface DriftRoomViewProps {
  room: DriftRoom;
  currentUserId: string;
  alias: DriftAlias;
  isPlatformAdmin?: boolean;
  onLeave: () => void;
  onConfirmedVibeEstablished?: () => void;
}

export const DriftRoomView: React.FC<DriftRoomViewProps> = ({
  room,
  currentUserId,
  alias,
  isPlatformAdmin = false,
  onLeave,
  onConfirmedVibeEstablished
}) => {
  const [currentAlias, setCurrentAlias] = useState<DriftAlias>(alias);
  const [identityModalOpen, setIdentityModalOpen] = useState(false);
  const [soulsDrawerOpen, setSoulsDrawerOpen] = useState(false);
  const [soulsSearchQuery, setSoulsSearchQuery] = useState('');
  const [pinnedAnnouncement, setPinnedAnnouncement] = useState<string | null>(
    room.pinned_announcement || 'Welcome to ' + room.name + '! Keep it respectful, keep it anonymous, and enjoy the energy!'
  );
  const [pinnedBannerDismissed, setPinnedBannerDismissed] = useState(false);

  // Composer state
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<DriftMessage | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  // Modals state
  const [selectedActionSoul, setSelectedActionSoul] = useState<{ handle: string; userId?: string; color?: string } | null>(null);
  const [selectedActionMessage, setSelectedActionMessage] = useState<DriftMessage | null>(null);
  const [bottleModalOpen, setBottleModalOpen] = useState(false);
  const [activePrivateThread, setActivePrivateThread] = useState<DriftPrivateThread | null>(null);
  const [adminPinModalOpen, setAdminPinModalOpen] = useState(false);
  const [adminPinInitialText, setAdminPinInitialText] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Telegram-style Emoji Picker State
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [emojiPickerTarget, setEmojiPickerTarget] = useState<'composer' | { messageId: string }>('composer');

  // Suspense 3-Hour Countdown
  const [roomTimeLeft, setRoomTimeLeft] = useState('02:47:19');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Custom extracted hooks
  const { messages, setMessages, sendMessage, toggleReaction } = useDriftRoomMessages(room.id, currentAlias, currentUserId);
  const { activeSouls, setActiveSouls } = useDriftPresence(room.id, currentUserId, currentAlias);
  
  const handleMessageSent = (msg: DriftMessage) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  };

  const { isRecording, recordingSeconds, uploading: voiceUploading, startRecording, stopRecording } = useDriftVoiceRecorder(
    room.id,
    currentUserId,
    currentAlias,
    handleMessageSent,
    showToast
  );

  const { uploading: photoUploading, handleFileUpload } = useDriftMediaUpload(
    room.id,
    currentUserId,
    currentAlias,
    handleMessageSent,
    showToast
  );

  const uploading = voiceUploading || photoUploading;

  const { pinMessage, adminSetAnnouncement, adminUnpinAnnouncement, deleteMessage } = useDriftModeration(
    room.id,
    currentUserId,
    room.name,
    showToast
  );

  // 3-Hour session countdown & Announcement Realtime Sync
  useEffect(() => {
    const expiresTimestamp = new Date(currentAlias.expires_at || Date.now() + 3 * 3600 * 1000).getTime();
    const countdownInterval = setInterval(() => {
      const diff = Math.max(0, expiresTimestamp - Date.now());
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setRoomTimeLeft(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    }, 1000);

    return () => {
      clearInterval(countdownInterval);
    };
  }, [currentAlias]);

  useEffect(() => {
    supabase
      .from('drift_rooms')
      .select('pinned_announcement')
      .eq('id', room.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.pinned_announcement !== undefined && data.pinned_announcement !== null) {
          setPinnedAnnouncement(data.pinned_announcement);
        }
      });

    const announcementChannel = supabase
      .channel(`drift_announcements_sync_${room.id}`)
      .on('broadcast', { event: 'pinned_announcement_updated' }, ({ payload }) => {
        if (payload?.roomId === 'all' || payload?.roomId === room.id) {
          setPinnedAnnouncement(payload.announcement || null);
          setPinnedBannerDismissed(false);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(announcementChannel);
    };
  }, [room.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const content = inputText.trim();
    setInputText('');
    await sendMessage(content, replyingTo);
    setReplyingTo(null);
  };

  // Update Drift Identity (Handle, Color, Gender M/F)
  const handleUpdateIdentity = async (newHandle: string, newColor: string, newGender: 'M' | 'F') => {
    const res = await updateDriftAlias({
      roomId: room.id,
      userId: currentUserId,
      handle: newHandle,
      avatarColor: newColor,
      gender: newGender
    });
    const updated = res.alias || {
      id: currentAlias.id,
      room_id: room.id,
      user_id: currentUserId,
      handle: newHandle,
      avatar_color: newColor,
      gender: newGender,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 3 * 3600 * 1000).toISOString()
    };
    setCurrentAlias((prev) => ({
      ...prev,
      handle: updated.handle,
      avatar_color: updated.avatar_color,
      gender: updated.gender
    }));
    await recordRoomPresence(room.id, currentUserId, currentAlias.id, updated.handle, updated.avatar_color, updated.gender);
    setActiveSouls((prev) =>
      prev.map((s) =>
        s.user_id === currentUserId
          ? { ...s, alias_handle: updated.handle, avatar_color: updated.avatar_color, gender: updated.gender }
          : s
      )
    );
    setIdentityModalOpen(false);
    showToast(`Identity set: ${updated.handle} (${updated.gender === 'F' ? '♀ Female' : '♂ Male'})`);
  };

  const handleEmojiSelect = (emojiChar: string) => {
    if (emojiPickerTarget === 'composer') {
      setInputText((prev) => `${prev}${emojiChar}`);
      setEmojiPickerOpen(false);
    } else if (typeof emojiPickerTarget === 'object' && emojiPickerTarget.messageId) {
      toggleReaction(emojiPickerTarget.messageId, emojiChar);
      setEmojiPickerOpen(false);
    }
  };

  // Play voice
  const handlePlayVoice = (msgId: string, url: string) => {
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

  // Start 1:1 Private Drift
  const handleStartPrivateDrift = async (targetHandle: string, targetUserId?: string) => {
    if (!targetUserId || targetUserId === currentUserId) {
      showToast('Cannot start a private Drift with yourself.');
      return;
    }

    const res = await createOrGetPrivateThread({
      roomId: room.id,
      user1Id: currentUserId,
      alias1Handle: currentAlias.handle,
      user2Id: targetUserId,
      alias2Handle: targetHandle
    });

    if (res.success && res.thread) {
      setActivePrivateThread(res.thread);
      setSelectedActionSoul(null);
      setSelectedActionMessage(null);
    } else {
      showToast(res.error || 'Failed to initialize private Drift thread.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0f] text-white flex flex-col font-sans overflow-hidden select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-teal-500 text-neutral-950 font-bold text-xs shadow-2xl flex items-center space-x-2 animate-fadeIn border border-teal-300">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* MODULAR ROOM HEADER */}
      <DriftRoomHeader
        room={room}
        activeSoulsCount={activeSouls.length}
        roomTimeLeft={roomTimeLeft}
        soulsDrawerOpen={soulsDrawerOpen}
        pinnedAnnouncement={pinnedAnnouncement}
        pinnedBannerDismissed={pinnedBannerDismissed}
        currentGender={currentAlias.gender}
        isPlatformAdmin={isPlatformAdmin}
        onLeave={onLeave}
        onToggleSoulsDrawer={() => setSoulsDrawerOpen(!soulsDrawerOpen)}
        onOpenBottleModal={() => setBottleModalOpen(true)}
        onOpenIdentityModal={() => setIdentityModalOpen(true)}
        onOpenAdminPinModal={() => {
          setAdminPinInitialText(pinnedAnnouncement || '');
          setAdminPinModalOpen(true);
        }}
        onDismissPinnedBanner={() => setPinnedBannerDismissed(true)}
        showToast={showToast}
      />

      {/* MAIN CHAT CONTAINER (Messages Stream + Active Souls Drawer) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length > 0 ? (
            messages.map((msg) => (
              <DriftMessageItem
                key={msg.id}
                msg={msg}
                currentUserId={currentUserId}
                playingAudioId={playingAudioId}
                onSelectSoulAction={(soul, message) => {
                  setSelectedActionSoul(soul);
                  setSelectedActionMessage(message);
                }}
                onPlayVoice={handlePlayVoice}
                onToggleReaction={toggleReaction}
                onOpenEmojiReactionPicker={(msgId) => {
                  setEmojiPickerTarget({ messageId: msgId });
                  setEmojiPickerOpen(true);
                }}
                onReply={(m) => setReplyingTo(m)}
              />
            ))
          ) : (
            <div className="py-20 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300 text-xl mx-auto shadow-lg">
                🌊
              </div>
              <h4 className="font-black text-sm text-white">Quiet Current in {room.name}</h4>
              <p className="text-xs text-neutral-400 max-w-xs mx-auto leading-relaxed">
                Be the first soul to drop an anonymous message or voice thought into this wavelength!
              </p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* MODULAR ACTIVE SOULS DRAWER */}
        {soulsDrawerOpen && (
          <DriftActiveSoulsDrawer
            activeSouls={activeSouls}
            currentUserId={currentUserId}
            soulsSearchQuery={soulsSearchQuery}
            onChangeSearchQuery={setSoulsSearchQuery}
            onClose={() => setSoulsDrawerOpen(false)}
            onSelectSoul={(soul) => setSelectedActionSoul(soul)}
            onStartPrivateDrift={handleStartPrivateDrift}
            showToast={showToast}
          />
        )}
      </div>

      {/* MODULAR COMPOSER BAR & EXPANDED TOOLBAR */}
      <DriftComposer
        inputText={inputText}
        onChangeInputText={setInputText}
        onSendMessage={handleSendMessage}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        isRecording={isRecording}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
        uploading={uploading}
        onFileUpload={handleFileUpload}
        emojiPickerOpen={emojiPickerOpen && emojiPickerTarget === 'composer'}
        onToggleEmojiPicker={() => {
          setEmojiPickerTarget('composer');
          setEmojiPickerOpen((prev) => !prev);
        }}
        onOpenBottleModal={() => setBottleModalOpen(true)}
        onRevealVibeHandle={() => {
          const firstOther = activeSouls.find((s) => s.user_id !== currentUserId);
          if (firstOther) {
            handleStartPrivateDrift(firstOther.alias_handle, firstOther.user_id);
          } else {
            showToast('Open a Private Drift with a soul to exchange handles.');
          }
        }}
      />

      {/* TELEGRAM DRIFT EMOJI PICKER POPUP */}
      {emojiPickerOpen && (
        <div className="absolute bottom-20 right-3 sm:right-6 z-50 shadow-2xl">
          <DriftEmojiPicker
            onSelectEmoji={handleEmojiSelect}
            onClose={() => setEmojiPickerOpen(false)}
          />
        </div>
      )}

      {/* USER ACTION MODAL (Tap on any soul) */}
      {selectedActionSoul && (
        <DriftUserActionModal
          targetHandle={selectedActionSoul.handle}
          targetUserId={selectedActionSoul.userId}
          targetColor={selectedActionSoul.color}
          selectedMessage={selectedActionMessage}
          isModerator={isPlatformAdmin}
          onSendPrivateDrift={handleStartPrivateDrift}
          onCastBottleToUser={() => setBottleModalOpen(true)}
          onPinMessage={(msg, scope) => pinMessage(msg, scope, setPinnedAnnouncement, setPinnedBannerDismissed)}
          onDeleteMessage={(msg) => deleteMessage(msg, setMessages)}
          onReport={(h) => showToast(`Report logged for ${h}. Moderators notified.`)}
          onClose={() => {
            setSelectedActionSoul(null);
            setSelectedActionMessage(null);
          }}
        />
      )}

      {/* CAST / PICK UP DRIFT BOTTLE MODAL */}
      {bottleModalOpen && (
        <CastBottleModal
          room={room}
          currentUserId={currentUserId}
          currentHandle={currentAlias.handle}
          aliasId={currentAlias.id}
          onBottlePickedUp={(threadId) => {
            setBottleModalOpen(false);
            fetchPrivateThreadById(threadId).then((thread) => {
              if (thread) setActivePrivateThread(thread);
            });
          }}
          onClose={() => setBottleModalOpen(false)}
        />
      )}

      {/* 1:1 PRIVATE DRIFT VIEW */}
      {activePrivateThread && (
        <PrivateDriftView
          thread={activePrivateThread}
          currentUserId={currentUserId}
          currentHandle={currentAlias.handle}
          onClose={() => setActivePrivateThread(null)}
          onConfirmedVibeEstablished={() => {
            if (onConfirmedVibeEstablished) onConfirmedVibeEstablished();
            showToast('✨ Double-match Confirmed! Unlocked in VIBES squad.');
          }}
        />
      )}

      {/* IDENTITY EDIT MODAL (Choose Handle & Gender M/F) */}
      {identityModalOpen && (
        <DriftIdentityModal
          room={room}
          initialHandle={currentAlias.handle}
          initialColor={currentAlias.avatar_color}
          initialGender={currentAlias.gender || 'M'}
          onConfirm={handleUpdateIdentity}
          onClose={() => setIdentityModalOpen(false)}
        />
      )}

      {/* APP ADMIN PIN & BROADCAST MODAL (Specific Room or All 12 Rooms) */}
      {adminPinModalOpen && (
        <DriftAdminPinModal
          room={room}
          currentPinnedAnnouncement={pinnedAnnouncement}
          initialMessageText={adminPinInitialText}
          isPlatformAdmin={isPlatformAdmin}
          onConfirmPin={(text, scope) => adminSetAnnouncement(text, scope, setPinnedAnnouncement, setPinnedBannerDismissed)}
          onConfirmUnpin={(scope) => adminUnpinAnnouncement(scope, setPinnedAnnouncement)}
          onClose={() => setAdminPinModalOpen(false)}
        />
      )}
    </div>
  );
};
