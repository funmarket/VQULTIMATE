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
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-neutral-950/90 backdrop-blur-xl border-b border-[#DBDBDB] dark:border-neutral-800/80 px-4 py-3 flex items-center justify-between text-[#050505] dark:text-white box-border w-full max-w-md mx-auto shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-none">
      {/* Left: Cybernetic Smiley brand flag and VIBEQUEST: Gather & Discover title */}
      <div className="flex items-center space-x-2.5 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 via-pink-500 to-teal-400 p-[2px] shadow-sm dark:shadow-lg dark:shadow-orange-500/25 flex-shrink-0">
          <div className="w-full h-full bg-white dark:bg-neutral-950 rounded-[10px] flex items-center justify-center text-[#0866FF] dark:text-teal-300">
            <Smile className="w-5 h-5 text-[#0866FF] dark:text-teal-400 animate-pulse" />
          </div>
        </div>
        <div className="min-w-0">
          <h1 className="text-xs sm:text-sm font-black tracking-tight uppercase truncate text-[#050505] dark:bg-clip-text dark:text-transparent dark:bg-gradient-to-r dark:from-white dark:via-neutral-200 dark:to-orange-300">
            VIBEQUEST
          </h1>
          <p className="text-[10px] text-[#65676B] dark:text-neutral-400 tracking-wider truncate font-semibold">
            Gather & Discover
          </p>
        </div>
      </div>

      {/* Right: Notification Bell icon + User Profile Avatar / Icon */}
      <div className="flex items-center space-x-2.5 flex-shrink-0">
        {/* Notifications */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2.5 rounded-xl bg-[#EFEFEF] hover:bg-[#E4E6EB] border border-[#DBDBDB] text-[#050505] dark:bg-neutral-900 dark:border-neutral-800 dark:hover:bg-neutral-800 transition dark:text-neutral-300 dark:hover:text-white"
          title="Notifications"
        >
          <Bell className="w-4 h-4 text-[#0866FF] dark:text-orange-400" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#0866FF] dark:bg-orange-500 text-[9px] font-bold text-white flex items-center justify-center shadow">
              {unreadCount}
            </span>
          )}
        </button>

        {/* User Profile Avatar / Icon */}
        <button
          onClick={onOpenProfile}
          className="p-1 rounded-xl bg-[#EFEFEF] hover:bg-[#E4E6EB] border border-[#DBDBDB] dark:bg-gradient-to-tr dark:from-neutral-800 dark:to-neutral-900 dark:border-neutral-700 dark:hover:border-teal-500/50 transition flex items-center space-x-1.5 shadow-sm dark:shadow-lg"
          title="Profile Console & Settings"
        >
          {user?.avatar_url && user.avatar_url.trim() !== '' ? (
            <img src={user.avatar_url} alt="Your profile photo" className="w-7 h-7 rounded-lg object-cover"
              onError={event => { event.currentTarget.style.display = 'none'; }} />
          ) : (
            <span aria-hidden="true" className="w-7 h-7 rounded-lg flex items-center justify-center text-[#050505] dark:text-neutral-300">
              <User className="w-4 h-4" />
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
