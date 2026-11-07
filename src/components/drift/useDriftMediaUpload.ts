import { useState } from 'react';
import { uploadDriftMedia, sendRoomMessage, DriftMessage, DriftAlias } from '../../domains/d15_drift';

export function useDriftMediaUpload(
  roomId: string,
  currentUserId: string,
  currentAlias: DriftAlias,
  onMessageSent: (msg: DriftMessage) => void,
  showToast: (msg: string) => void
) {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const res = await uploadDriftMedia(file, 'photo');
    setUploading(false);

    if (res.success && res.url) {
      const sendRes = await sendRoomMessage({
        roomId,
        aliasId: currentAlias.id,
        aliasHandle: currentAlias.handle,
        avatarColor: currentAlias.avatar_color,
        gender: currentAlias.gender,
        senderUserId: currentUserId,
        content: null,
        mediaUrl: res.url,
        mediaType: 'photo'
      });

      if (sendRes.success && sendRes.message) {
        onMessageSent(sendRes.message);
      }
    } else {
      showToast('Photo upload failed. Try again.');
    }
  };

  return { uploading, handleFileUpload };
}
