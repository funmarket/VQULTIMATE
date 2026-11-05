import React, { useState } from 'react';
import { ProfileForm } from './ProfileForm';
import {
  X, User, Shield, Coins, LogOut, Check, Globe, Lock, Mail, Key, Sparkles,
  ArrowRight, Edit3, Award, MessageSquare, Bell, Smartphone, HelpCircle,
  LayoutDashboard, Settings, Sun, Moon, CheckCircle2, ChevronRight
} from 'lucide-react';
import { UserProfile, signInWithEmail, signInWithGoogle, signOutUser } from '../domains/d01_auth';

interface ProfileModalProps {
  user: UserProfile | null;
  onClose: () => void;
  onUserSwitch: (user: UserProfile | null) => void;
  currentLang: string;
  onChangeLang: (lang: string) => void;
  themeMode: 'midnight' | 'cream';
  onToggleTheme: () => void;
  onOpenAdmin: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  user,
  onClose,
  onUserSwitch,
  currentLang,
  onChangeLang,
  themeMode,
  onToggleTheme,
  onOpenAdmin
}) => {
  const [authMode, setAuthMode] = useState<'menu' | 'email_login' | 'signup' | 'edit_profile' | 'device_ai' | 'oracle_help'>('menu');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const languages = [
    { code: 'en', label: 'English (EN)' },
    { code: 'fr', label: 'Français (FR)' },
    { code: 'ar', label: 'العربية (AR)' },
    { code: 'ja', label: '日本語 (JA)' },
    { code: 'es', label: 'Español (ES)' },
    { code: 'pt', label: 'Português (PT)' },
    { code: 'zh', label: '中文 (ZH)' },
  ];

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const loggedIn = await signInWithEmail(identifier, password);
      onUserSwitch(loggedIn);
      setAuthMode('menu');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOutUser();
    onUserSwitch(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
      <div className={`w-full max-w-md ${
        themeMode === 'cream' ? 'bg-amber-50 text-neutral-900 border-amber-200' : 'bg-neutral-900 text-white border-neutral-800'
      } border rounded-t-3xl sm:rounded-3xl p-6 space-y-5 shadow-2xl max-h-[88vh] overflow-y-auto box-border`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-current/10 pb-3">
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5 text-teal-500" />
            <h3 className="font-bold text-base tracking-wide">
              {authMode === 'device_ai' ? 'Local Device AI Settings' : authMode === 'oracle_help' ? 'Oracle Help & Support' : authMode === 'edit_profile' ? 'Edit Profile' : authMode === 'signup' ? 'Create Profile' : 'VQUltimate Profile & Settings'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-current/10 hover:bg-current/20 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {authMode === 'device_ai' && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-neutral-950/60 border border-neutral-800 p-4 space-y-3 text-white">
              <div className="flex items-center space-x-2 text-teal-400">
                <Smartphone className="w-5 h-5" />
                <h4 className="font-bold text-sm">Neural Edge Engine Active</h4>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Local on-device embeddings and MapLibre tile caching are operational. Your district orbit computations run locally with zero latency.
              </p>
              <div className="space-y-2 pt-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-900 border border-neutral-800">
                  <span>Offline Waypoint Sync</span>
                  <span className="text-emerald-400 font-bold">Enabled</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-900 border border-neutral-800">
                  <span>Edge Privacy Shroud</span>
                  <span className="text-teal-400 font-bold">Active</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setAuthMode('menu')}
              className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs transition cursor-pointer"
            >
              Back to Profile Menu
            </button>
          </div>
        )}

        {authMode === 'oracle_help' && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-neutral-950/60 border border-neutral-800 p-4 space-y-3 text-white">
              <div className="flex items-center space-x-2 text-amber-400">
                <HelpCircle className="w-5 h-5" />
                <h4 className="font-bold text-sm">Sentinel Support Network</h4>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Connected to Supabase project <span className="font-mono text-teal-300">avdfessrhbsqwlfmbdau</span>. Guardian consensus rules are governed by Sole Administrator <span className="text-amber-300 font-mono">funmarketmn@hotmail.com</span>.
              </p>
              <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-400 space-y-1">
                <p className="text-white font-semibold">Need assistance?</p>
                <p>Reach out to the Guardian council via direct Vibe chat or drop an incident ticket at sentinel@vqgemini.com.</p>
              </div>
            </div>
            <button
              onClick={() => setAuthMode('menu')}
              className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs transition cursor-pointer"
            >
              Back to Profile Menu
            </button>
          </div>
        )}

        {(authMode === 'edit_profile' || authMode === 'signup') && (
          <ProfileForm
            profile={authMode === 'edit_profile' ? user : null}
            onSaved={(saved) => { onUserSwitch(saved); setAuthMode('menu'); }}
            onCancel={() => setAuthMode('menu')}
          />
        )}

        {authMode === 'menu' && !user && (
          /* Visitor / Unauthenticated State */
          <div className="space-y-6 py-4 text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-orange-500 via-pink-500 to-teal-400 p-[2px] mx-auto shadow-xl">
              <div className="w-full h-full bg-neutral-950 rounded-[22px] flex items-center justify-center text-teal-300">
                <Sparkles className="w-8 h-8 text-teal-400 animate-pulse" />
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-black text-xl tracking-tight">Welcome to VQUltimate</h4>
              <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                Explore real-world cultural vibes, hidden trails, and connect with verified district guardians using Supabase Auth.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <button
                onClick={() => setAuthMode('email_login')}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 hover:opacity-90 text-white font-black text-sm shadow-xl shadow-orange-500/25 flex items-center justify-center space-x-2 transition cursor-pointer"
              >
                <Mail className="w-4 h-4" />
                <span>Sign In with Supabase Auth</span>
              </button>


              <button type="button" onClick={() => setAuthMode('signup')}
                className="w-full py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-sm font-semibold">
                Create Profile
              </button>
              <button type="button" disabled={loading} onClick={async () => {
                setLoading(true); setError(null);
                try { await signInWithGoogle(); }
                catch (err) { setError(err instanceof Error ? err.message : 'Google sign-in failed.'); }
                finally { setLoading(false); }
              }} className="w-full py-3 rounded-2xl bg-neutral-950 border border-neutral-700 text-sm font-semibold disabled:opacity-60">
                Sign In with Google
              </button>
              {error && <p role="alert" className="text-red-400 text-xs">{error}</p>}
            </div>
          </div>
        )}

        {authMode === 'menu' && user && (
          /* Authenticated State */
          <div className="space-y-5">
            {/* Rich User Profile Card */}
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 border border-neutral-800 p-4 shadow-xl text-white">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="relative z-10 flex items-center space-x-4">
                <img
                  src={user.avatar_url}
                  alt="Avatar"
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-orange-500/60 shadow-lg"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-base text-white truncate">{user.full_name}</h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 font-bold uppercase">
                      {user.role}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 truncate mt-0.5">@{user.username}</p>
                  <div className="flex items-center space-x-3 mt-2">
                    <span className="flex items-center space-x-1 text-xs font-bold text-amber-300">
                      <Coins className="w-3.5 h-3.5 text-amber-400" />
                      <span>{user.vq_balance} VQ</span>
                    </span>
                    <span className="text-[10px] text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20 font-semibold">
                      Elite Voyager
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Edit Profile Action */}
            <button
              onClick={() => setAuthMode('edit_profile')}
              className="w-full py-2.5 rounded-xl bg-neutral-950/60 hover:bg-neutral-950 border border-neutral-800 text-neutral-300 hover:text-white font-bold text-xs flex items-center justify-center space-x-2 transition cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-orange-400" />
              <span>Edit Profile & Bio</span>
            </button>

            {/* Explorer Stamp Key Wallet Card */}
            <div className="rounded-2xl bg-neutral-950/60 border border-neutral-800 p-4 space-y-2 text-white">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-teal-400 flex items-center space-x-1.5">
                  <Award className="w-4 h-4 text-teal-400" />
                  <span>Explorer Stamp Key</span>
                </span>
                <span className="text-[10px] text-neutral-400">Level 4 Certified</span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Cryptographic passport validating discovered cultural trails and verified check-ins across districts.
              </p>
            </div>

            {/* Display Theme Toggle */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-950/60 border border-neutral-800 text-white">
              <span className="text-xs font-bold flex items-center space-x-2">
                {themeMode === 'midnight' ? <Moon className="w-4 h-4 text-teal-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
                <span>Display Theme</span>
              </span>
              <button
                onClick={onToggleTheme}
                className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-700 text-xs font-bold text-orange-400 hover:bg-neutral-800 transition cursor-pointer"
              >
                {themeMode === 'midnight' ? 'Midnight Neon' : 'Warm Cream'}
              </button>
            </div>

            {/* Quick Action Shortcuts */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Quick Shortcuts</h4>
              
              <div className="grid grid-cols-2 gap-2 text-white">
                <button
                  onClick={() => { onClose(); }}
                  className="p-3 rounded-2xl bg-neutral-950/60 border border-neutral-800 hover:border-teal-500/40 transition flex items-center space-x-2.5 text-xs font-semibold cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4 text-teal-400" />
                  <span>Messages</span>
                </button>
                <button
                  onClick={() => { onClose(); }}
                  className="p-3 rounded-2xl bg-neutral-950/60 border border-neutral-800 hover:border-orange-500/40 transition flex items-center space-x-2.5 text-xs font-semibold cursor-pointer"
                >
                  <Bell className="w-4 h-4 text-orange-400" />
                  <span>Notifications</span>
                </button>
              </div>
            </div>

            {/* Language Selector */}
            <div className="space-y-2 text-white">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Language & Region</h4>
              <div className="relative">
                <Globe className="absolute left-3.5 top-3 w-4 h-4 text-teal-400" />
                <select
                  value={currentLang}
                  onChange={(e) => onChangeLang(e.target.value)}
                  className="w-full rounded-2xl bg-neutral-950 border border-neutral-800 pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500 appearance-none cursor-pointer"
                >
                  {languages.map((l) => (
                    <option key={l.code} value={l.code} className="bg-neutral-900 text-white">
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Platform Admin & Support Links */}
            <div className="space-y-2 pt-2 border-t border-neutral-800 text-white">
              {user.role === 'admin' && (
                <button
                  onClick={() => { onOpenAdmin(); onClose(); }}
                  className="w-full p-3 rounded-2xl bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/20 transition flex items-center justify-between text-xs font-bold text-orange-400 cursor-pointer"
                >
                  <span className="flex items-center space-x-2">
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Platform Admin Dashboard</span>
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={() => setAuthMode('device_ai')}
                className="w-full p-3 rounded-2xl bg-neutral-950/60 border border-neutral-800 hover:border-neutral-700 transition flex items-center justify-between text-xs font-semibold text-neutral-300 cursor-pointer"
              >
                <span className="flex items-center space-x-2">
                  <Smartphone className="w-4 h-4 text-teal-400" />
                  <span>Local Device AI Settings</span>
                </span>
                <ChevronRight className="w-4 h-4 text-neutral-500" />
              </button>

              <button
                onClick={() => setAuthMode('oracle_help')}
                className="w-full p-3 rounded-2xl bg-neutral-950/60 border border-neutral-800 hover:border-neutral-700 transition flex items-center justify-between text-xs font-semibold text-neutral-300 cursor-pointer"
              >
                <span className="flex items-center space-x-2">
                  <HelpCircle className="w-4 h-4 text-amber-400" />
                  <span>Oracle Help & Support</span>
                </span>
                <ChevronRight className="w-4 h-4 text-neutral-500" />
              </button>
            </div>

            {/* Terminate Session (Sign Out) */}
            <div className="pt-2">
              <button
                onClick={handleLogout}
                className="w-full py-3.5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-xs flex items-center justify-center space-x-2 transition border border-red-500/30 shadow-lg cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Terminate Session (Sign Out)</span>
              </button>
            </div>
          </div>
        )}

        {authMode === 'email_login' && (
          /* Email Auth View */
          <form onSubmit={handleEmailLogin} className="space-y-4 text-white">
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-300">Email or @username</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-500" />
                <input
                  type="text"
                  required
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Email or @username"
                  className="w-full rounded-2xl bg-neutral-950 border border-neutral-800 pl-10 pr-4 py-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-300">Password</label>
              <div className="relative">
                <Key className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-2xl bg-neutral-950 border border-neutral-800 pl-10 pr-4 py-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 p-3 rounded-xl border border-red-500/20">{error}</p>
            )}

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setAuthMode('menu')}
                className="flex-1 py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs transition cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-2 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs shadow-lg shadow-orange-500/25 flex items-center justify-center space-x-1.5 transition cursor-pointer"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
