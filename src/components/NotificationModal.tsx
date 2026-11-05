import React, { useEffect, useState } from 'react';
import { Bell, X, CheckCircle, Sparkles, Shield } from 'lucide-react';
import { fetchNotifications, AppNotification } from '../domains/d08_notifications';

interface NotificationModalProps {
  onClose: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ onClose }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    fetchNotifications().then(setNotifications);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4 shadow-2xl text-white">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <h3 className="font-bold text-base flex items-center space-x-2">
            <Bell className="w-5 h-5 text-orange-400" />
            <span>District Notifications</span>
          </h3>
          <button onClick={onClose} className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {notifications.map((n) => (
            <div key={n.id} className="rounded-2xl bg-neutral-950/60 border border-neutral-800 p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-orange-400">{n.title}</span>
                <span className="text-[10px] text-neutral-500">{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="text-xs text-neutral-300">{n.message}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
