import React, { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { BottomNav, TabType } from './components/BottomNav';
import { HomeTab } from './components/HomeTab';
import { ExploreTab } from './components/ExploreTab';
import { ShareTab } from './components/ShareTab';
import { VibeTab } from './components/VibeTab';
import { PurseTab } from './components/PurseTab';
import { NotificationModal } from './components/NotificationModal';
import { ProfileModal } from './components/ProfileModal';
import { PlaceDetailModal } from './components/PlaceDetailModal';
import { AdminModal } from './components/AdminModal';
import { subscribeAuthProfile, UserProfile } from './domains/d01_auth';
import { VibePlace } from './domains/d03_vibe_orbit';
import { CheckCircle2 } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { useTheme } from './lib/theme';
import { useProfileSettings } from './features/profile/hooks/useProfileSettings';
import { fetchNotifications } from './domains/d08_notifications';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const { locale: lang } = useProfileSettings();
  const { theme, toggleTheme } = useTheme();
  const themeMode = theme === 'light' ? 'cream' : 'midnight';
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<VibePlace | null>(null);
  const [appToast, setAppToast] = useState<string | null>(null);

  useEffect(() => subscribeAuthProfile(setUser), []);
  useEffect(() => {
    let active = true;
    void fetchNotifications().then(items => {
      if (active) setUnreadCount(items.filter(item => !item.read).length);
    });
    return () => { active = false; };
  }, [user?.id]);

  const showToast = (msg: string) => {
    setAppToast(msg);
    setTimeout(() => setAppToast(null), 3000);
  };

  const isRtl = lang === 'ar';

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className={`min-h-screen ${
        themeMode === 'cream' ? 'bg-amber-100 text-neutral-900' : 'bg-neutral-950 text-white'
      } font-sans antialiased selection:bg-orange-500 selection:text-white overflow-x-hidden max-w-md mx-auto w-full box-border pb-32 transition-colors duration-300 relative`}
    >
      {/* Toast Notification Banner */}
      {appToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-teal-500 text-neutral-950 font-bold text-xs shadow-2xl flex items-center space-x-2 animate-fadeIn border border-teal-300">
          <CheckCircle2 className="w-4 h-4" />
          <span>{appToast}</span>
        </div>
      )}

      {/* Top Navbar */}
      <div className="max-w-md mx-auto w-full box-border">
        <Navbar
          user={user}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onOpenProfile={() => setIsProfileOpen(true)}
          unreadCount={unreadCount}
        />
      </div>

      {/* Main Content Container */}
      <main className="max-w-md mx-auto px-4 pt-4 w-full box-border overflow-x-hidden pb-8">
        {activeTab === 'home' && (
          <HomeTab
            user={user}
            onNavigateTab={setActiveTab}
            onSelectPlace={(place) => setSelectedPlace(place)}
          />
        )}
        {activeTab === 'explore' && (
          <ExploreTab
            user={user}
            onSelectPlace={(place) => setSelectedPlace(place)}
            onRequireAuth={() => setIsProfileOpen(true)}
          />
        )}
        {activeTab === 'share' && (
          <ShareTab
            user={user}
            onPostSuccess={() => setActiveTab('vibe')}
          />
        )}
        {activeTab === 'vibe' && <VibeTab user={user} onNavigateShare={() => setActiveTab('share')} />}
        {activeTab === 'purse' && <PurseTab user={user} />}
      </main>

      {/* Bottom Five-Tab Navigation */}
      <BottomNav activeTab={activeTab} onChangeTab={setActiveTab} />

      {/* Modals */}
      {isNotificationsOpen && (
        <NotificationModal onClose={() => setIsNotificationsOpen(false)} />
      )}

      <AnimatePresence>
        {isProfileOpen && (
          <ProfileModal
            key="reference-profile-sidebar"
            user={user}
            onClose={() => setIsProfileOpen(false)}
            onUserSwitch={setUser}
            themeMode={themeMode}
            onToggleTheme={toggleTheme}
            onOpenAdmin={() => setIsAdminOpen(true)}
            onOpenNotifications={() => setIsNotificationsOpen(true)}
            onNavigateHome={() => setActiveTab('home')}
          />
        )}
      </AnimatePresence>

      {isAdminOpen && (
        <AdminModal user={user} onClose={() => setIsAdminOpen(false)} />
      )}

      {selectedPlace && (
        <PlaceDetailModal
          place={selectedPlace}
          onClose={() => setSelectedPlace(null)}
          onCheckIn={(place) => {
            showToast(`Checked in at ${place.title}! Claimed +${place.vq_reward} VQ.`);
            if (user) {
              const updatedUser = { ...user, vq_balance: user.vq_balance + place.vq_reward };
              setUser(updatedUser);
            }
          }}
        />
      )}
    </div>
  );
}
