import React from 'react';
import { Bell, User, Smile } from 'lucide-react';
import { UserProfile } from '../domains/d01_auth';

interface NavbarProps {
  user: UserProfile | null;
  onOpenNotifications: () => void;
  onOpenProfile: () => void;
  unreadCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onOpenNotifications,
  onOpenProfile,
  unreadCount
}) => {
  return (
    <header className="sticky top-0 z-40 bg-neutral-950/90 backdrop-blur-xl border-b border-neutral-800/80 px-4 py-3 flex items-center justify-between text-white box-border w-full max-w-md mx-auto">
      {/* Left: Cybernetic Smiley brand flag and VIBEQUEST: Gather & Discover title */}
      <div className="flex items-center space-x-2.5 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 via-pink-500 to-teal-400 p-[2px] shadow-lg shadow-orange-500/25 flex-shrink-0">
          <div className="w-full h-full bg-neutral-950 rounded-[10px] flex items-center justify-center text-teal-300">
            <Smile className="w-5 h-5 text-teal-400 animate-pulse" />
          </div>
        </div>
        <div className="min-w-0">
          <h1 className="text-xs sm:text-sm font-black tracking-tight uppercase truncate bg-clip-text text-transparent bg-gradient-to-r from-white via-neutral-200 to-orange-300">
            VIBEQUEST
          </h1>
          <p className="text-[10px] text-neutral-400 tracking-wider truncate font-semibold">
            Gather & Discover
          </p>
        </div>
      </div>

      {/* Right: Notification Bell icon + User Profile Avatar / Icon */}
      <div className="flex items-center space-x-2.5 flex-shrink-0">
        {/* Notifications */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 transition text-neutral-300 hover:text-white"
          title="Notifications"
        >
          <Bell className="w-4 h-4 text-orange-400" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-orange-500 text-[9px] font-bold text-white flex items-center justify-center shadow">
              {unreadCount}
            </span>
          )}
        </button>

        {/* User Profile Avatar / Icon */}
        <button
          onClick={onOpenProfile}
          className="p-1 rounded-xl bg-gradient-to-tr from-neutral-800 to-neutral-900 border border-neutral-700 hover:border-teal-500/50 transition flex items-center space-x-1.5 shadow-lg"
          title="Profile Console & Settings"
        >
          <img
            src={user?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
            alt="Avatar"
            className="w-7 h-7 rounded-lg object-cover"
          />
        </button>
      </div>
    </header>
  );
};
