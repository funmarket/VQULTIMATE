import React from 'react';
import { motion } from 'motion/react';
import { X, Coins, MessageSquare, Bell, Settings, HelpCircle, Languages, LogOut, Sparkles, User, ShieldCheck, Cpu, Sun, Moon } from 'lucide-react';
import { ProfileLogin } from './ProfileLogin';
import { ProfileForm } from './ProfileForm';
import { UserProfile, signOutUser, signInWithGoogle } from '../domains/d01_auth';
import { useProfileSettings } from '../features/profile/hooks/useProfileSettings';
import { useLocalDeviceAiSettings } from '../features/profile/hooks/useLocalDeviceAiSettings';
import { AppLocale } from '../features/profile/types/profileTypes';
import { fetchNotifications } from '../domains/d08_notifications';
const cn = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

interface ProfileModalProps {
  user: UserProfile | null;
  onClose: () => void;
  onUserSwitch: (user: UserProfile | null) => void;
  themeMode: 'midnight' | 'cream';
  onToggleTheme: () => void;
  onOpenAdmin: () => void;
  onOpenNotifications: () => void;
  onOpenMessages: () => void;
  onNavigateHome: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  user, onClose, onUserSwitch, themeMode, onToggleTheme,
  onOpenAdmin, onOpenNotifications, onOpenMessages, onNavigateHome
}) => {
  const profile = user ? {
    photoUrl: user.avatar_url, displayName: user.full_name, handle: user.username,
    points: user.vq_balance, streaks: user.streaks ?? 0,
    accountType: user.accountType || 'vibe',
  } : null;
  const isPlatformAdmin = user?.role === 'admin';
  const theme = themeMode === 'cream' ? 'light' : 'dark';
  const toggleTheme = onToggleTheme;
  const [authPanel, setAuthPanel] = React.useState<'login' | 'register' | 'edit' | null>(null);
  const [verificationNotice, setVerificationNotice] = React.useState<{ email: string; avatarUploadNote?: string } | null>(null);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = React.useState(0);
  const [logoutError, setLogoutError] = React.useState<string | null>(null);
  const [oauthLoading, setOauthLoading] = React.useState(false);
  const [oauthError, setOauthError] = React.useState<string | null>(null);
  const { locale, changeLocale, t } = useProfileSettings();
  const [isLocaleDropdownOpen, setIsLocaleDropdownOpen] = React.useState(false);
  const { settings, aiStatus, isTesting, testResult, updateSettings, testEndpointConnection } = useLocalDeviceAiSettings();
  React.useEffect(() => {
    let active = true;
    void fetchNotifications().then(items => {
      if (active) setUnreadNotificationsCount(items.filter(n => !n.read).length);
    });
    return () => { active = false; };
  }, [user?.id]);

  const triggerHaptic = (type: 'light' | 'medium' | 'heavy') => {
    try {
      if (typeof window !== "undefined") {
        const haptic = (window as any).Telegram?.WebApp?.HapticFeedback;
        if (haptic) {
          if (type === 'light') haptic.impactOccurred('light');
          else if (type === 'medium') haptic.impactOccurred('medium');
          else haptic.impactOccurred('heavy');
        }
      }
    } catch (e) {
      console.warn('Haptic not available', e);
    }
  };

  return (
    <div className="absolute inset-0 z-50 overflow-hidden select-none flex justify-end font-sans">
      {/* Black Translucent Soft Backdrop - Plain overlay with no blur */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => {
          triggerHaptic('light');
          onClose();
        }}
        className="absolute inset-0 bg-black/60 transition-opacity cursor-pointer"
      />

      {/* Slide Out Panel Container */}
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        /* Enable smooth drag gesture support exactly like native applications */
        drag="x"
        dragConstraints={{ left: 0, right: 350 }}
        dragElastic={{ left: 0.05, right: 0.6 }}
        dragMomentum={false}
        onDragEnd={(e, info) => {
          if (info.offset.x > 80 || info.velocity.x > 300) {
            triggerHaptic('light');
            onClose();
          }
        }}
        className="h-full w-[80%] max-w-[340px] bg-zinc-950 border-l border-zinc-900 flex flex-col justify-between py-6 px-5 relative shadow-[0_0_55px_rgba(0,0,0,0.9)] overflow-y-auto z-20 pointer-events-auto text-left"
      >
        {/* Top Banner and Close */}
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping" />
              {/* Small label details EXACTLY 13px */}
              <span className="text-[13px] font-mono tracking-wider text-zinc-500 uppercase font-semibold">{t('profile.voyagerConsole')}</span>
            </div>
            <button 
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }}
              className="w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {verificationNotice && (
            <div role="status" className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3 text-xs text-emerald-200">
              <p className="font-bold">Check your email</p>
              <p>Account created. Open the verification link sent to {verificationNotice.email}, then return here to sign in.</p>
              {verificationNotice.avatarUploadNote && <p className="mt-2 text-amber-200">{verificationNotice.avatarUploadNote}</p>}
              <button type="button" className="mt-2 underline" onClick={() => setVerificationNotice(null)}>Dismiss</button>
            </div>
          )}
          {!user ? (
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4 space-y-3">
              <p className="text-base font-semibold text-white">Explore as a visitor</p>
              <p className="text-xs text-zinc-400">Browse public places, trails and community posts. Sign in to take part.</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setAuthPanel('login')} className="flex-1 rounded-xl bg-vibe-primary text-white px-3 py-2 text-sm font-bold">Sign in</button>
                <button type="button" onClick={() => setAuthPanel('register')} className="flex-1 rounded-xl border border-zinc-700 text-white px-3 py-2 text-sm font-bold">Create profile</button>
              </div>
              <button type="button" disabled={oauthLoading}
                onClick={async () => {
                  setOauthError(null); setOauthLoading(true);
                  try { await signInWithGoogle(); }
                  catch (error) { setOauthError(error instanceof Error ? error.message : 'Google sign-in failed.'); }
                  finally { setOauthLoading(false); }
                }}
                className="w-full rounded-xl border border-zinc-700 text-white px-3 py-2 text-sm font-bold mt-3 disabled:opacity-60">
                {oauthLoading ? 'Connecting…' : 'Sign in with Google'}
              </button>
              {oauthError && <p role="alert" className="text-red-400 text-xs mt-2">{oauthError}</p>}
            </div>
          ) : (
            <>
          {/* User Profile Info Card (X/Twitter style) */}
          <div className="bg-zinc-900/40 border border-zinc-900 rounded-2xl p-4 space-y-3.5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full border-2 border-emerald-500 p-0.5 bg-black flex items-center justify-center overflow-hidden">
                <div className="w-full h-full rounded-full bg-zinc-950 flex items-center justify-center text-zinc-500 relative overflow-hidden">
                  {profile?.photoUrl && profile.photoUrl.trim() !== '' ? (
                    <img
                      src={profile.photoUrl}
                      alt={profile.displayName || profile.handle || 'Profile photo'}
                      className="absolute inset-0 z-10 w-full h-full rounded-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(event) => {
                        event.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : null}
                  <svg className="w-7 h-7 text-zinc-400 mt-1" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              </div>

              <div className="min-w-0 flex-1">
                {/* Body / main username text EXACTLY 16px */}
                <h3 className="font-semibold text-[16px] text-white tracking-tight uppercase truncate">
                  {profile?.displayName || profile?.handle || 'Profile'}
                </h3>
                {/* Small labels text EXACTLY 13px */}
                <p className="text-[13px] text-zinc-500 font-bold font-mono">
                  @{profile?.handle || 'username'}
                </p>
              </div>

              {/* Account Type Level Indicator */}
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg px-2.5 py-1 text-center shrink-0">
                <span className="block text-[8px] text-zinc-400 uppercase font-bold">{t('profile.level')}</span>
                <span className="text-[14px] font-bold text-[#f97316] font-mono leading-none">
                  {profile?.streaks ?? 0}🔥
                </span>
              </div>
            </div>

            {/* Stats: Points & Tier */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-900/60">
              <div>
                <span className="block text-[11px] text-zinc-500 uppercase font-bold tracking-wide">VQ Points</span>
                <span className="font-mono font-bold text-[#ef4444] text-[16px]">
                  {(profile?.points ?? 0).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="block text-[11px] text-zinc-500 uppercase font-bold tracking-wide">{t('profile.travelerClass')}</span>
                <span className="font-bold text-[#f59e0b] text-[13px] uppercase tracking-wider flex items-center gap-0.5 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  {profile?.accountType || 'vibe'}
                </span>
              </div>
            </div>
          </div>

            </>
          )}

          {user && <>
          {/* Edit Profile is accessible directly from the profile sidebar. */}
          <button type="button" onClick={() => setAuthPanel('edit')}
            className="w-full rounded-xl border border-vibe-primary/30 bg-vibe-primary/10 p-3 text-left text-sm font-semibold text-white">
            Edit Profile
          </button>
          </>}
          {/* Theme Selector (Light / Dark Mode in Profile Dropdown) */}
          <div className="space-y-1.5 px-0.5">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-semibold uppercase tracking-wider text-zinc-400">
                Display Theme
              </label>
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                {theme === 'light' ? 'Light Mode' : 'Dark Mode'}
              </span>
            </div>
            
            <div 
              onClick={() => {
                triggerHaptic('medium');
                toggleTheme();
              }}
              className="bg-black/90 border border-zinc-800 hover:border-zinc-700 p-3 rounded-2xl flex items-center justify-between cursor-pointer transition-all duration-300 active:scale-[0.98] group"
              title="Toggle Light / Dark Mode"
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm",
                  theme === 'light' 
                    ? "bg-amber-400/20 text-amber-400 border border-amber-400/30 scale-105" 
                    : "bg-purple-900/30 text-purple-300 border border-purple-500/20"
                )}>
                  {theme === 'light' ? (
                    <Sun className="w-4.5 h-4.5 text-amber-400 animate-spin-slow" />
                  ) : (
                    <Moon className="w-4.5 h-4.5 text-purple-300" />
                  )}
                </div>
                <div>
                  <span className="text-[13.5px] font-bold text-white block leading-tight">
                    {theme === 'light' ? 'Warm Cream Mode' : 'Midnight Neon Mode'}
                  </span>
                  <span className="text-[11px] text-zinc-400 font-medium">
                    {theme === 'light' ? 'Crisp daytime high-contrast' : 'Cyberpunk dark ambiance'}
                  </span>
                </div>
              </div>
              
              {/* Dual Pill Switch */}
              <div className="flex items-center p-1 bg-zinc-900 border border-white/5 rounded-full">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 text-xs",
                  theme === 'light' ? "bg-amber-400 text-black shadow-sm font-bold" : "text-zinc-500"
                )}>
                  <Sun className="w-3.5 h-3.5" />
                </div>
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 text-xs",
                  theme === 'dark' ? "bg-purple-600 text-white shadow-sm font-bold" : "text-zinc-500"
                )}>
                  <Moon className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>

          {/* List Menu Action Shortcuts */}
          <div className="space-y-1.5 pt-1 animate-in slide-in-from-right-3 duration-350">
            
            {/* Messages / DMs */}
            <button 
              onClick={() => {
                triggerHaptic('light');
                onOpenMessages();
                onClose();
              }}
              className="w-full hover:bg-zinc-900 rounded-xl p-3 flex items-center justify-between transition-colors text-left cursor-pointer border border-transparent hover:border-white/5"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <MessageSquare className="w-4 h-4" />
                </div>
                {/* Secondary text EXACTLY 14px */}
                <span className="text-[14px] font-medium uppercase tracking-wider text-zinc-300">{t('profile.messages')}</span>
              </div>
              <span className="bg-[#ec4899] text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                DMs
              </span>
            </button>

            {/* Notifications */}
            <button 
              onClick={() => {
                triggerHaptic('light');
                onOpenNotifications();
                onClose();
              }}
              className="w-full hover:bg-zinc-900 rounded-xl p-3 flex items-center justify-between transition-colors text-left cursor-pointer border border-transparent hover:border-white/5"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Bell className="w-4 h-4" />
                </div>
                {/* Secondary text EXACTLY 14px */}
                <span className="text-[14px] font-medium uppercase tracking-wider text-zinc-300">{t('profile.notifications')}</span>
              </div>
              {unreadNotificationsCount > 0 ? (
                <span className="bg-red-600 text-white text-[11px] font-black px-2 py-0.5 rounded-full font-mono animate-pulse">
                  {unreadNotificationsCount} NEW
                </span>
              ) : (
                <span className="bg-zinc-850 text-zinc-500 text-[11px] font-mono px-2 py-0.5 rounded-full">
                  0
                </span>
              )}
            </button>

            {/* Optional Device AI Settings */}
            <div className="border border-zinc-900/80 bg-zinc-950 p-4 rounded-xl mt-2 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-orange-500 animate-pulse" />
                  <span className="text-[12px] font-bold uppercase tracking-wider text-zinc-300">{t('profile.localDeviceAi.title')}</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={settings.enabled} 
                    onChange={() => {
                      triggerHaptic('medium');
                      updateSettings({ enabled: !settings.enabled });
                    }}
                    className="sr-only peer" 
                  />
                  <div className="w-8 h-4 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-zinc-400 after:border-zinc-350 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-orange-500 peer-checked:after:bg-white"></div>
                </label>
              </div>
              <p className="text-[10px] text-zinc-500 leading-normal font-sans">
                {t('profile.localDeviceAi.description')}
              </p>
              
              {settings.enabled && (
                <div className="space-y-2 animate-in fade-in duration-200">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="http://localhost:11434"
                      value={settings.endpoint}
                      onChange={(e) => updateSettings({ endpoint: e.target.value })}
                      className="flex-1 text-xs px-2.5 py-1.5 bg-black border border-zinc-800 rounded-lg text-zinc-300 outline-none focus:border-orange-500 font-mono"
                    />
                    <button
                      onClick={testEndpointConnection}
                      disabled={isTesting}
                      className={cn(
                        "text-[10px] font-mono uppercase px-2.5 rounded-lg border font-semibold transition-colors shrink-0 cursor-pointer",
                        isTesting 
                          ? "bg-zinc-900 border-zinc-800 text-zinc-500 cursor-not-allowed" 
                          : "bg-orange-500/10 border-orange-500/30 hover:border-orange-500 text-orange-400"
                      )}
                    >
                      {isTesting ? 'Testing...' : 'Test'}
                    </button>
                  </div>
                  
                  {testResult && (
                    <span className={cn(
                      "text-[9px] font-mono block",
                      testResult.success ? "text-emerald-400" : "text-red-400"
                    )}>
                      {testResult.message}
                    </span>
                  )}

                  <div className="flex justify-between items-center pt-1.5 border-t border-zinc-900/40">
                    <span className="text-[9px] text-zinc-500 font-mono uppercase">
                      {t('profile.detected')}: {aiStatus.statusText}
                    </span>
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      aiStatus.isAvailable ? "bg-emerald-500" : "bg-red-500 animate-pulse"
                    )} />
                  </div>
                </div>
              )}
            </div>

            {/* Language Switch Dropdown */}
            <div className="space-y-1 w-full">
              <button 
                onClick={() => {
                  triggerHaptic('light');
                  setIsLocaleDropdownOpen(!isLocaleDropdownOpen);
                }}
                className={cn(
                  "w-full hover:bg-zinc-900 rounded-xl p-3 flex items-center justify-between transition-colors text-left cursor-pointer",
                  isLocaleDropdownOpen ? "bg-zinc-900/60 border border-white/10" : ""
                )}
              >
                <div className="flex items-center gap-3">
                  <Languages className="w-4 h-4 text-zinc-400" />
                  {/* Secondary text EXACTLY 14px */}
                  <span className="text-[14px] font-medium uppercase tracking-wider text-zinc-300">
                    {t('profile.locale')} ({locale.toUpperCase()})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-purple-400 font-mono uppercase">
                    {locale === 'en' ? 'ENGLISH' : 
                     locale === 'ja' ? '日本語' : 
                     locale === 'fr' ? 'FRANÇAIS' : 
                     locale === 'ar' ? 'العربية' : 
                     locale === 'es' ? 'ESPAÑOL' : 
                     locale === 'pt' ? 'PORTUGUÊS' : 
                     locale === 'zh' ? '中文' : 'ENGLISH'}
                  </span>
                  <span className="text-zinc-600 text-xs transition-transform duration-200" style={{ transform: isLocaleDropdownOpen ? 'rotate(180deg)' : 'none' }}>
                    ▼
                  </span>
                </div>
              </button>

              {isLocaleDropdownOpen && (
                <div className="bg-black/80 border border-white/5 rounded-xl p-1.5 space-y-1.5 mt-1 animate-fadeIn grid grid-cols-1 gap-1">
                  {[
                    { code: 'en' as AppLocale, label: 'English', native: 'English', flag: '🇺🇸' },
                    { code: 'ja' as AppLocale, label: 'Japanese', native: '日本語', flag: '🇯🇵' },
                    { code: 'fr' as AppLocale, label: 'French', native: 'Français', flag: '🇫🇷' },
                    { code: 'ar' as AppLocale, label: 'Arabic', native: 'العربية', flag: '🇸🇦' },
                    { code: 'es' as AppLocale, label: 'Spanish', native: 'Español', flag: '🇪🇸' },
                    { code: 'pt' as AppLocale, label: 'Portuguese', native: 'Português', flag: '🇵🇹' },
                    { code: 'zh' as AppLocale, label: 'Chinese', native: '中文', flag: '🇨🇳' }
                  ].map((lang) => {
                    const isSelected = locale === lang.code;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => {
                          triggerHaptic('medium');
                          changeLocale(lang.code);
                          setIsLocaleDropdownOpen(false);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-all cursor-pointer font-sans",
                          isSelected 
                            ? "bg-purple-500/15 border border-purple-500/30 text-purple-300 font-bold" 
                            : "hover:bg-zinc-900/60 text-zinc-400 hover:text-white"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base leading-none">{lang.flag}</span>
                          <span>{t(`languages.${lang.code}`)}</span>
                          <span className="text-[10px] text-zinc-500 font-mono">({lang.native})</span>
                        </div>
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-purple-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {user && isPlatformAdmin && <>
          {/* Platform Admin Console Dashboard (Highlighted) */}
            <button 
              onClick={() => {
                triggerHaptic('light');
                onOpenAdmin();
                onClose();
              }}
              className="w-full hover:bg-zinc-900 rounded-xl p-3 flex items-center justify-between transition-colors text-left cursor-pointer border border-vibe-primary/30 bg-vibe-primary/5 shadow-md"
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 text-vibe-primary" />
                <span className="text-[14px] font-semibold uppercase tracking-wider text-white">{t('profile.adminDashboard')}</span>
              </div>
              <span className="bg-vibe-primary text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                System
              </span>
            </button>

            </>}
          {/* Settings */}
            <button 
              disabled title="No verified app-settings action is implemented in the reference"
              className="w-full hover:bg-zinc-900 rounded-xl p-3 flex items-center transition-colors text-left gap-3 cursor-pointer"
            >
              <Settings className="w-4 h-4 text-zinc-500" />
              {/* Secondary text EXACTLY 14px */}
              <span className="text-[14px] font-medium uppercase tracking-wider text-zinc-300">{t('profile.deviceSettings')}</span>
            </button>

            {/* Help & Support */}
            <button 
              disabled title="No verified help destination is configured"
              className="w-full hover:bg-zinc-900 rounded-xl p-3 flex items-center transition-colors text-left gap-3 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-zinc-500" />
              {/* Secondary text EXACTLY 14px */}
              <span className="text-[14px] font-medium uppercase tracking-wider text-[#3b82f6]">{t('profile.oracleHelp')}</span>
            </button>

          </div>
        </div>

        {/* Signed-in users return to the Home feed after logout. */}
        <div className="space-y-4">
          {user && <button 
            onClick={() => {
              triggerHaptic('heavy');
              void signOutUser().then(() => {
                onUserSwitch(null);
                onNavigateHome();
                onClose();
              }).catch(error => setLogoutError(error instanceof Error ? error.message : 'Sign-out failed'));
            }}
            className="btn-3d-danger text-[16px] font-medium w-full flex items-center justify-center gap-2 h-11"
          >
            <LogOut className="w-3.5 h-3.5" /> {t('profile.terminateSession')}
          </button>}
          {logoutError && <p role="alert" className="text-red-400 text-xs">{logoutError}</p>}
          {/* Small text / labels EXACTLY 13px */}
          <div className="text-[13px] text-zinc-600 font-bold tracking-wider uppercase text-center">
            {t('profile.securedNodeSync')} v1.0.4
          </div>
        </div>
      </motion.div>
      {authPanel && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 p-4 overflow-y-auto">
          {authPanel === 'login' ? (
            <ProfileLogin
              onCancel={() => setAuthPanel(null)}
              onSuccess={profile => { onUserSwitch(profile); setAuthPanel(null); onClose(); }}
              onSwitchToRegister={() => setAuthPanel('register')}
            />
          ) : (
            <div className="w-full max-w-lg max-h-full overflow-y-auto">
              <ProfileForm
                profile={authPanel === 'edit' ? user : null}
                onCancel={() => setAuthPanel(null)}
                onSaved={updated => { onUserSwitch(updated); setAuthPanel(null); onClose(); }}
                onVerificationRequired={(email, avatarUploadNote) => {
                  setVerificationNotice({ email, avatarUploadNote }); setAuthPanel(null);
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
