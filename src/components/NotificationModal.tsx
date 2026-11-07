import React, { useEffect, useState, useMemo } from 'react';
import { Bell, X, Inbox, MessageSquare } from 'lucide-react';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead, AppNotification } from '../domains/d08_notifications';

interface NotificationModalProps {
  onClose: () => void;
  onOpenChat?: (targetUser: any) => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ onClose, onOpenChat }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'matches' | 'alerts' | 'dms'>('all');

  useEffect(() => {
    fetchNotifications().then(setNotifications);
  }, []);

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const counts = useMemo(() => {
    const total = notifications.length;
    const unread = notifications.filter(n => !n.read).length;
    const matches = notifications.filter(n => n.type === 'match' || n.title.toLowerCase().includes('match')).length;
    const alerts = notifications.filter(n => n.type === 'alert' || n.type === 'system' || n.title.toLowerCase().includes('alert')).length;
    const dms = notifications.filter(n => n.type === 'dm' || n.title.toLowerCase().includes('dm')).length;
    return { total, unread, matches, alerts, dms };
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      if (activeFilter === 'unread') return !n.read;
      if (activeFilter === 'matches') return n.type === 'match' || n.title.toLowerCase().includes('match');
      if (activeFilter === 'alerts') return n.type === 'alert' || n.type === 'system' || n.title.toLowerCase().includes('alert');
      if (activeFilter === 'dms') return n.type === 'dm' || n.title.toLowerCase().includes('dm');
      return true;
    });
  }, [notifications, activeFilter]);

  return (
    <div className="absolute top-14 left-0 right-0 z-50 px-3 animate-fadeIn">
      <div className="w-full max-w-md mx-auto bg-[#141416] border border-neutral-800 rounded-3xl p-5 space-y-4 shadow-2xl text-white backdrop-blur-2xl">
        {/* Header matching reference */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm tracking-wider uppercase text-white">NOTIFICATIONS</h3>
              <p className="text-[9px] text-neutral-400 font-bold tracking-widest uppercase">LIVE VIBE ALERTS & MATCHES</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="relative p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition cursor-pointer"
            aria-label="Close Notifications"
          >
            <X className="w-4 h-4" />
            {counts.unread > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
          </button>
        </div>

        {/* Filter Pills Bar */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3.5 py-1.5 rounded-full font-bold transition flex items-center space-x-1 cursor-pointer whitespace-nowrap ${
              activeFilter === 'all' ? 'bg-white text-neutral-950 font-black shadow' : 'bg-neutral-800/80 border border-neutral-700/60 text-neutral-300 hover:text-white'
            }`}
          >
            <span>All</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeFilter === 'all' ? 'bg-neutral-200 text-neutral-900 font-bold' : 'bg-neutral-700 text-neutral-300'}`}>{counts.total}</span>
          </button>
          <button
            onClick={() => setActiveFilter('unread')}
            className={`px-3.5 py-1.5 rounded-full font-bold transition flex items-center space-x-1 cursor-pointer whitespace-nowrap ${
              activeFilter === 'unread' ? 'bg-white text-neutral-950 font-black shadow' : 'bg-neutral-800/80 border border-neutral-700/60 text-neutral-300 hover:text-white'
            }`}
          >
            <span>Unread</span>
            {counts.unread > 0 && <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />}
          </button>
          <button
            onClick={() => setActiveFilter('matches')}
            className={`px-3.5 py-1.5 rounded-full font-bold transition flex items-center space-x-1 cursor-pointer whitespace-nowrap ${
              activeFilter === 'matches' ? 'bg-white text-neutral-950 font-black shadow' : 'bg-neutral-800/80 border border-neutral-700/60 text-neutral-300 hover:text-white'
            }`}
          >
            <span>Matches</span>
            <span className="text-[10px] px-1.5 rounded-full bg-neutral-700 text-neutral-300">{counts.matches}</span>
          </button>
          <button
            onClick={() => setActiveFilter('alerts')}
            className={`px-3.5 py-1.5 rounded-full font-bold transition flex items-center space-x-1 cursor-pointer whitespace-nowrap ${
              activeFilter === 'alerts' ? 'bg-white text-neutral-950 font-black shadow' : 'bg-neutral-800/80 border border-neutral-700/60 text-neutral-300 hover:text-white'
            }`}
          >
            <span>Alerts</span>
            <span className="text-[10px] px-1.5 rounded-full bg-neutral-700 text-neutral-300">{counts.alerts}</span>
          </button>
          <button
            onClick={() => setActiveFilter('dms')}
            className={`px-3.5 py-1.5 rounded-full font-bold transition flex items-center space-x-1 cursor-pointer whitespace-nowrap ${
              activeFilter === 'dms' ? 'bg-white text-neutral-950 font-black shadow' : 'bg-neutral-800/80 border border-neutral-700/60 text-neutral-300 hover:text-white'
            }`}
          >
            <span>DMs</span>
            <span className="text-[10px] px-1.5 rounded-full bg-neutral-700 text-neutral-300">{counts.dms}</span>
          </button>
        </div>

        {/* Notifications List matching reference */}
        <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((n) => (
              <div
                key={n.id}
                onClick={() => !n.read && handleMarkRead(n.id)}
                className={`rounded-2xl p-4 space-y-2 border transition ${
                  n.read
                    ? 'bg-[#18181b]/50 border-neutral-800/80 text-neutral-300'
                    : 'bg-[#1a1a1e] border-amber-500/40 shadow-xl text-white'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 flex-shrink-0 mt-0.5 shadow">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs text-white truncate flex items-center space-x-1.5">
                        {!n.read && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />}
                        <span>{n.title}</span>
                      </h4>
                      <span className="text-[10px] text-neutral-500 flex-shrink-0 ml-2">
                        {new Date(n.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-300 mt-1 leading-relaxed">{n.message}</p>
                    {n.action_label && (
                      <div className="pt-2.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenChat && n.action_url) {
                              onOpenChat({ id: n.action_url, name: n.title, handle: 'voyager', avatar: '' });
                            }
                          }}
                          className="px-3.5 py-1.5 rounded-xl border border-amber-500/60 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 font-extrabold text-[11px] transition flex items-center space-x-1 cursor-pointer shadow"
                        >
                          <span>{n.action_label}</span>
                          <span>↗</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl bg-[#18181b]/60 border border-neutral-800/80 p-8 text-center space-y-2">
              <Inbox className="w-8 h-8 text-neutral-500 mx-auto" />
              <h4 className="font-bold text-xs text-white">No notifications in this filter</h4>
              <p className="text-[11px] text-neutral-400 max-w-xs mx-auto">
                Notifications from live vibe alerts, district matches, and direct messages will appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
