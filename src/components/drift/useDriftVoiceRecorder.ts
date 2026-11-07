import { useState, useRef } from 'react';
import { uploadDriftMedia, sendRoomMessage, DriftMessage, DriftAlias } from '../../domains/d15_drift';

export function useDriftVoiceRecorder(
  roomId: string,
  currentUserId: string,
  currentAlias: DriftAlias,
  onMessageSent: (msg: DriftMessage) => void,
  showToast: (msg: string) => void
) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [uploading, setUploading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<any>(null);

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
          const sendRes = await sendRoomMessage({
            roomId,
            aliasId: currentAlias.id,
            aliasHandle: currentAlias.handle,
            avatarColor: currentAlias.avatar_color,
            gender: currentAlias.gender,
            senderUserId: currentUserId,
            content: null,
            mediaUrl: res.url,
            mediaType: 'voice',
            voiceDuration: recordingSeconds || 5
          });

          if (sendRes.success && sendRes.message) {
            onMessageSent(sendRes.message);
          }
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      showToast('Microphone permission denied. Enable microphone access in browser settings to record voice notes.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingIntervalRef.current);
    }
  };

  return { isRecording, recordingSeconds, uploading, setUploading, startRecording, stopRecording };
}
