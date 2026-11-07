import { useState, useEffect } from 'react';
import { DriftPresence, fetchRoomPresenceSouls, recordRoomPresence, leaveRoomPresence, DriftAlias } from '../../domains/d15_drift';

export function useDriftPresence(roomId: string, currentUserId: string, currentAlias: DriftAlias) {
  const [activeSouls, setActiveSouls] = useState<DriftPresence[]>([]);

  useEffect(() => {
    fetchRoomPresenceSouls(roomId).then((souls) => {
      const hasSelf = souls.some((s) => s.user_id === currentUserId);
      if (!hasSelf) {
        setActiveSouls([
          {
            id: 'self',
            room_id: roomId,
            user_id: currentUserId,
            alias_id: currentAlias.id,
            alias_handle: currentAlias.handle,
            avatar_color: currentAlias.avatar_color,
            gender: currentAlias.gender,
            last_heartbeat: new Date().toISOString(),
            joined_at: new Date().toISOString()
          },
          ...souls
        ]);
      } else {
        setActiveSouls(souls);
      }
    });

    recordRoomPresence(roomId, currentUserId, currentAlias.id, currentAlias.handle, currentAlias.avatar_color, currentAlias.gender);

    const heartbeatInterval = setInterval(() => {
      recordRoomPresence(roomId, currentUserId, currentAlias.id, currentAlias.handle, currentAlias.avatar_color, currentAlias.gender);
      fetchRoomPresenceSouls(roomId).then(setActiveSouls);
    }, 45000);

    return () => {
      clearInterval(heartbeatInterval);
      leaveRoomPresence(roomId, currentUserId);
    };
  }, [roomId, currentUserId, currentAlias]);

  return { activeSouls, setActiveSouls };
}
