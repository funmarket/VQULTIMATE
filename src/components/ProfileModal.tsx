import React from 'react';
import { X, User, Shield, Coins, LogOut, Check } from 'lucide-react';
import { UserProfile, REAL_TEST_USERS, signInAsTestUser } from '../domains/d01_auth';

interface ProfileModalProps {
  user: UserProfile | null;
  onClose: () => void;
  onUserSwitch: (user: UserProfile) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ user, onClose, onUserSwitch }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-6 shadow-2xl text-white">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <h3 className="font-bold text-base flex items-center space-x-2">
            <User className="w-5 h-5 text-teal-400" />
            <span>Profile & Supabase Test Users</span>
          </h3>
          <button onClick={onClose} className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current User Info */}
        <div className="flex items-center space-x-4 bg-neutral-950/60 p-4 rounded-2xl border border-neutral-800">
          <img src={user?.avatar_url} alt="Avatar" className="w-14 h-14 rounded-full object-cover border-2 border-orange-500" />
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-base text-white">{user?.full_name}</h4>
            <p className="text-xs text-neutral-400">@{user?.username}</p>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded font-bold uppercase">
                {user?.role}
              </span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-bold">
                {user?.vq_balance} VQ
              </span>
            </div>
          </div>
        </div>

        {/* Supabase Real Test Users Switcher */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            Adopt Real Supabase Test User (S00)
          </h4>
          <div className="space-y-2">
            {REAL_TEST_USERS.map((tu) => {
              const isSelected = user?.id === tu.id;
              return (
                <div
                  key={tu.id}
                  onClick={async () => {
                    const updated = await signInAsTestUser(tu);
                    onUserSwitch(updated);
                    onClose();
                  }}
                  className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition ${
                    isSelected ? 'bg-orange-500/10 border-orange-500/50' : 'bg-neutral-950/40 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <img src={tu.avatar_url} alt={tu.username} className="w-10 h-10 rounded-full object-cover" />
                    <div>
                      <h5 className="font-bold text-xs text-white">{tu.full_name}</h5>
                      <p className="text-[10px] text-neutral-400">@{tu.username} • {tu.role}</p>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-orange-400" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
