import { deleteRoomMessage, logModerationAction, updateRoomAnnouncement, DriftMessage } from '../../domains/d15_drift';

export function useDriftModeration(roomId: string, currentUserId: string, roomName: string, showToast: (msg: string) => void) {
  const pinMessage = async (
    msg: DriftMessage,
    scope: 'room' | 'all' = 'room',
    setPinnedAnnouncement: (text: string | null) => void,
    setPinnedBannerDismissed: (dismissed: boolean) => void
  ) => {
    if (!msg.content) return;
    const res = await updateRoomAnnouncement({
      roomId,
      announcement: msg.content,
      moderatorUserId: currentUserId,
      scope
    });
    if (res.success) {
      setPinnedAnnouncement(msg.content);
      setPinnedBannerDismissed(false);
      showToast(scope === 'all' ? 'Announcement pinned across all 12 rooms!' : `Announcement pinned to ${roomName}.`);
    } else {
      showToast(res.error || 'Failed to pin announcement.');
    }
  };

  const adminSetAnnouncement = async (
    text: string,
    scope: 'room' | 'all',
    setPinnedAnnouncement: (text: string | null) => void,
    setPinnedBannerDismissed: (dismissed: boolean) => void
  ) => {
    const res = await updateRoomAnnouncement({
      roomId,
      announcement: text,
      moderatorUserId: currentUserId,
      scope
    });
    if (res.success) {
      setPinnedAnnouncement(text);
      setPinnedBannerDismissed(false);
      showToast(scope === 'all' ? 'Announcement broadcast across all 12 rooms!' : `Announcement pinned to ${roomName}.`);
    } else {
      showToast(res.error || 'Failed to update announcement.');
    }
  };

  const adminUnpinAnnouncement = async (scope: 'room' | 'all', setPinnedAnnouncement: (text: string | null) => void) => {
    const res = await updateRoomAnnouncement({
      roomId,
      announcement: null,
      moderatorUserId: currentUserId,
      scope
    });
    if (res.success) {
      setPinnedAnnouncement(null);
      showToast(scope === 'all' ? 'Announcement unpinned from all 12 rooms.' : `Announcement unpinned from ${roomName}.`);
    } else {
      showToast(res.error || 'Failed to unpin announcement.');
    }
  };

  const deleteMessage = async (msg: DriftMessage, setMessages: React.Dispatch<React.SetStateAction<DriftMessage[]>>) => {
    setMessages((prev) => prev.filter((m) => m.id !== msg.id));
    await deleteRoomMessage(msg.id);
    await logModerationAction({
      roomId,
      actionType: 'delete_message',
      targetId: msg.id,
      reason: 'Deleted by moderator',
      moderatorUserId: currentUserId
    });
    showToast('Message removed.');
  };

  return { pinMessage, adminSetAnnouncement, adminUnpinAnnouncement, deleteMessage };
}
