import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MessageSquare, Settings, ShieldCheck, Send, ArrowLeft } from 'lucide-react';
import { UserProfile } from '../domains/d01_auth';
import { fetchAllUserDirectMessages, sendDirectMessage, DirectMessage } from '../domains/d14_messaging';

interface PulseDmModalProps {
  user: UserProfile | null;
  onClose: () => void;
}

export const PulseDmModal: React.FC<PulseDmModalProps> = ({ user, onClose }) => {
  const [activeTab, setActiveTab] = useState<'feed' | 'privacy'>('feed');
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipient, setSelectedRecipient] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [sending, setSending] = useState(false);

  const userId = user?.id || 'guest';

  const loadMessages = async () => {
    setLoading(true);
    try {
      const items = await fetchAllUserDirectMessages(userId);
      setMessages(items);
    } catch (e) {
      console.warn('Failed to load DMs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMessages();
  }, [userId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || !selectedRecipient) return;
    setSending(true);
    try {
      await sendDirectMessage(userId, selectedRecipient, replyContent.trim());
      setReplyContent('');
      await loadMessages();
    } catch (err) {
      console.warn('Failed to send DM:', err);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '01:07 PM';
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/80 backdrop-blur-sm select-none font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-[440px] bg-white dark:bg-zinc-950 border border-[#DBDBDB] dark:border-zinc-800 rounded-[28px] shadow-2xl dark:shadow-[0_0_60px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden max-h-[85vh] text-[#050505] dark:text-white"
      >
        {/* Header matching exact reference */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#E4E6EB] dark:border-zinc-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E7F3FF] dark:bg-purple-600/20 border border-[#0866FF]/20 dark:border-purple-500/30 flex items-center justify-center text-[#0866FF] dark:text-purple-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-[18px] font-extrabold text-[#050505] dark:text-white tracking-wide italic font-mono uppercase">
                PULSE DMS
              </h2>
              <p className="text-[12px] text-[#65676B] dark:text-zinc-400 font-medium">
                Cozy Direct Messages
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#EFEFEF] dark:bg-zinc-900 hover:bg-[#E4E6EB] dark:hover:bg-zinc-800 flex items-center justify-center text-[#65676B] dark:text-zinc-400 hover:text-[#050505] dark:hover:text-white transition-colors cursor-pointer border border-[#DBDBDB] dark:border-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switchers matching reference image */}
        <div className="px-6 py-3.5 border-b border-[#E4E6EB] dark:border-zinc-900 bg-[#FAFAFA] dark:bg-zinc-950/80">
          <div className="grid grid-cols-2 gap-2 p-1 bg-[#EFEFEF] dark:bg-zinc-900/90 rounded-2xl border border-[#DBDBDB] dark:border-white/5">
            <button
              onClick={() => { setActiveTab('feed'); setSelectedRecipient(null); }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'feed'
                  ? 'bg-[#0866FF] dark:bg-gradient-to-r dark:from-purple-600 dark:to-indigo-600 text-white shadow-sm dark:shadow-lg'
                  : 'text-[#65676B] dark:text-zinc-400 hover:text-[#050505] dark:hover:text-white'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Direct Feed
            </button>
            <button
              onClick={() => setActiveTab('privacy')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'privacy'
                  ? 'bg-[#0866FF] dark:bg-gradient-to-r dark:from-purple-600 dark:to-indigo-600 text-white shadow-sm dark:shadow-lg'
                  : 'text-[#65676B] dark:text-zinc-400 hover:text-[#050505] dark:hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" />
              Privacy Rules
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {activeTab === 'privacy' ? (
            <div className="space-y-4 py-2 text-[#262626] dark:text-zinc-300">
              <div className="bg-[#F0F2F5] dark:bg-zinc-900/50 border border-[#DBDBDB] dark:border-zinc-800/80 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-[#0866FF] dark:text-purple-400 font-bold text-sm">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Secure Pulse Encryption</span>
                </div>
                <p className="text-xs text-[#65676B] dark:text-zinc-400 leading-relaxed">
                  All direct messages in VQULTIMATE are securely routed through D14 decentralized node endpoints with end-to-end auditability.
                </p>
              </div>
              <div className="bg-[#F0F2F5] dark:bg-zinc-900/50 border border-[#DBDBDB] dark:border-zinc-800/80 rounded-2xl p-4 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#050505] dark:text-zinc-400">Allowed Sender Policy</span>
                <p className="text-xs text-[#65676B] dark:text-zinc-400 leading-relaxed">
                  Only verified travelers, guardians, and matched orbit connections can initiate direct chat threads.
                </p>
              </div>
            </div>
          ) : selectedRecipient ? (
            <div className="flex flex-col h-full space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#E4E6EB] dark:border-zinc-900">
                <button
                  onClick={() => setSelectedRecipient(null)}
                  className="flex items-center gap-1.5 text-xs text-[#0866FF] dark:text-purple-400 hover:text-[#075CE5] dark:hover:text-purple-300 font-bold cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Feed</span>
                </button>
                <span className="text-xs font-mono text-[#65676B] dark:text-zinc-400">@{selectedRecipient}</span>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto max-h-[220px] pr-1">
                {messages
                  .filter(m => m.sender_id === selectedRecipient || m.recipient_id === selectedRecipient)
                  .map(m => {
                    const isMe = m.sender_id === userId;
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                            isMe
                              ? 'bg-[#0866FF] dark:bg-purple-600 text-white rounded-br-sm'
                              : 'bg-[#EFEFEF] dark:bg-zinc-900 border border-[#DBDBDB] dark:border-zinc-800 text-[#050505] dark:text-zinc-200 rounded-bl-sm'
                          }`}
                        >
                          {m.content}
                        </div>
                        <span className="text-[9px] text-[#65676B] dark:text-zinc-500 font-mono mt-1 px-1">
                          {formatTime(m.created_at)}
                        </span>
                      </div>
                    );
                  })}
              </div>

              <form onSubmit={handleSend} className="flex gap-2 pt-2 border-t border-[#E4E6EB] dark:border-zinc-900">
                <input
                  type="text"
                  placeholder="Type a secure message..."
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  className="flex-1 bg-[#F0F2F5] dark:bg-zinc-900 border border-[#DBDBDB] dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-[#050505] dark:text-white placeholder-[#65676B] dark:placeholder-zinc-500 outline-none focus:border-[#0866FF] dark:focus:border-purple-500"
                />
                <button
                  type="submit"
                  disabled={sending || !replyContent.trim()}
                  className="bg-[#0866FF] hover:bg-[#075CE5] dark:bg-purple-600 dark:hover:bg-purple-500 disabled:opacity-50 text-white px-4 rounded-xl text-xs font-bold flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          ) : loading ? (
            <div className="py-12 text-center text-xs font-mono text-[#65676B] dark:text-zinc-500 animate-pulse">
              Loading secure DMs...
            </div>
          ) : messages.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <MessageSquare className="w-8 h-8 text-[#65676B] dark:text-zinc-600 mx-auto" />
              <p className="text-sm font-bold text-[#050505] dark:text-zinc-300">No Direct Messages</p>
              <p className="text-xs text-[#65676B] dark:text-zinc-500">Conversations from matched guardians and voyagers will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {messages.map((msg) => {
                const partner = msg.sender_id === userId ? msg.recipient_id : msg.sender_id;
                const displayName = partner.startsWith('shibuya') ? '@SHIBUYA_VOYAGER' : `@${partner.toUpperCase()}`;
                const initials = partner.slice(0, 2).toUpperCase();

                return (
                  <div
                    key={msg.id}
                    onClick={() => setSelectedRecipient(partner)}
                    className="bg-[#F0F2F5] dark:bg-zinc-900/60 hover:bg-[#E4E6EB] dark:hover:bg-zinc-900 border border-[#DBDBDB] dark:border-zinc-900 hover:border-[#0866FF]/40 dark:hover:border-purple-500/30 rounded-2xl p-3.5 flex items-start gap-3.5 transition-all cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#E7F3FF] dark:bg-purple-950 border border-[#0866FF]/20 dark:border-purple-500/30 flex items-center justify-center text-[#0866FF] dark:text-purple-300 font-mono font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                      {initials}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[13px] font-bold text-[#050505] dark:text-white font-mono tracking-wide truncate">
                          {displayName}
                        </span>
                        <span className="text-[10px] font-mono text-[#65676B] dark:text-zinc-500 shrink-0">
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-[#65676B] dark:text-zinc-400 truncate leading-relaxed">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 border-t border-[#E4E6EB] dark:border-zinc-900 bg-[#FAFAFA] dark:bg-zinc-950 text-center">
          <span className="text-[10px] font-mono text-[#65676B] dark:text-zinc-600 uppercase tracking-wider">
            VQULTIMATE Secure Encrypted Node • D14 Messaging
          </span>
        </div>
      </motion.div>
    </div>
  );
};
