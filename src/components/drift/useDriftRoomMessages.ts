import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { DriftMessage, fetchRoomMessages, sendRoomMessage, toggleMessageReaction, DriftAlias } from '../../domains/d15_drift';

export function useDriftRoomMessages(roomId: string, currentAlias: DriftAlias, currentUserId: string) {
  const [messages, setMessages] = useState<DriftMessage[]>([]);

  useEffect(() => {
    fetchRoomMessages(roomId).then(setMessages);

    const channel = supabase
      .channel(`drift_room_${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'drift_messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const newMsg = payload.new as DriftMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, { ...newMsg, reactions: {} }];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'drift_messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const sendMessage = async (content: string, replyingTo?: DriftMessage | null) => {
    const res = await sendRoomMessage({
      roomId,
      aliasId: currentAlias.id,
      aliasHandle: currentAlias.handle,
      avatarColor: currentAlias.avatar_color,
      gender: currentAlias.gender,
      senderUserId: currentUserId,
      content,
      replyToId: replyingTo?.id,
      replyToHandle: replyingTo?.alias_handle,
      replyToSnippet: replyingTo?.content?.substring(0, 48)
    });

    if (res.success && res.message) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === res.message!.id)) return prev;
        return [...prev, res.message!];
      });
    }
    return res;
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    const isNowReacted = await toggleMessageReaction(messageId, currentAlias.handle, emoji);
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const currentCount = m.reactions?.[emoji] || 0;
        const newCount = isNowReacted ? currentCount + 1 : Math.max(0, currentCount - 1);
        const myReactions = m.my_reactions || [];
        const updatedMy = isNowReacted
          ? [...myReactions, emoji]
          : myReactions.filter((e) => e !== emoji);

        return {
          ...m,
          reactions: {
            ...m.reactions,
            [emoji]: newCount
          },
          my_reactions: updatedMy
        };
      })
    );
  };

  return { messages, setMessages, sendMessage, toggleReaction };
}
