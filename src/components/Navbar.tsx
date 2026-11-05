import React from 'react';
import { Bell, User, Globe, Shield, Coins } from 'lucide-react';
import { UserProfile } from '../domains/d01_auth';

interface NavbarProps {
  user: UserProfile | null;
  onOpenNotifications: () => void;
  onOpenProfile: () => void;
  unreadCount: number;
  currentLang: string;
  onToggleLang: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onOpenNotifications,
  onOpenProfile,
  unreadCount,
  currentLang,
  onToggleLang
}) => {
  return (
    <header className="sticky top-0 z-40 bg-neutral-950/80 backdrop-blur-xl border-b border-neutral-800/80 px-4 py-3 flex items-center justify-between text-white">
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 via-pink-500 to-teal-400 p-[2px] shadow-lg shadow-orange-500/20">
          <div className="w-full h-full bg-neutral-950 rounded-[10px] flex items-center justify-center font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-teal-300 text-lg">
            VQ
          </div>
        </div>
        <div>
          <div className="flex items-center space-x-1.5">
            <span className="font-bold tracking-wider text-sm bg-clip-text text-transparent bg-gradient-to-r from-white via-neutral-200 to-neutral-400">
              VQGEMINI
            </span>
            <span className="text-[10px] bg-teal-500/20 text-teal-300 px-1.5 py-0.5 rounded-full border border-teal-500/30">
              Supabase Live
            </span>
          </div>
          <p className="text-[10px] text-neutral-400 flex items-center space-x-1">
            <Shield className="w-3 h-3 text-orange-400 inline" />
            <span>Connected: avdfessrhbsqwlfmbdau</span>
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {/* VQ Balance Badge */}
        <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-xs font-medium text-amber-300 shadow-inner">
          <Coins className="w-3.5 h-3.5 text-amber-400" />
          <span>{user?.vq_balance ?? 1420} VQ</span>
        </div>

        {/* Language Toggle */}
        <button
          onClick={onToggleLang}
          className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 transition text-neutral-300 hover:text-white text-xs font-semibold flex items-center space-x-1"
          title="Switch Language (EN/FR/AR)"
        >
          <Globe className="w-4 h-4 text-teal-400" />
          <span className="uppercase">{currentLang}</span>
        </button>

        {/* Notifications */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2 rounded-xl bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 transition text-neutral-300 hover:text-white"
          title="Notifications"
        >
          <Bell className="w-4 h-4 text-orange-400" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-orange-500 text-[9px] font-bold text-white flex items-center justify-center shadow">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Profile */}
        <button
          onClick={onOpenProfile}
          className="p-1 rounded-xl bg-gradient-to-tr from-neutral-800 to-neutral-900 border border-neutral-700 hover:border-teal-500/50 transition flex items-center space-x-1.5"
          title="Profile & Test Users"
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
