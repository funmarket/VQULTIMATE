import React, { useEffect, useRef, useState } from 'react';
import { Navbar } from './components/Navbar';
import { BottomNav, TabType } from './components/BottomNav';
import { HomeTab } from './components/HomeTab';
import { ExploreTab } from './components/ExploreTab';
import { ShareTab } from './components/ShareTab';
import { VibeTab } from './components/VibeTab';
import { PurseTab } from './components/PurseTab';
import { NotificationModal } from './components/NotificationModal';
import { ProfileModal } from './components/ProfileModal';
import { PulseDmModal } from './components/PulseDmModal';
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
  const mainScrollRef = useRef<HTMLElement>(null);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const { locale: lang } = useProfileSettings();
  const { theme, toggleTheme } = useTheme();
  const themeMode = theme === 'light' ? 'cream' : 'midnight';
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
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

  useEffect(() => {
    // The reference shell scrolls each tab inside the viewport, not the document.
    if (mainScrollRef.current) mainScrollRef.current.scrollTop = 0;
  }, [activeTab]);

  const isRtl = lang === 'ar';

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className={`h-[100dvh] flex flex-col ${
        themeMode === 'cream' ? 'bg-amber-100 text-neutral-900' : 'bg-neutral-950 text-white'
      } font-sans antialiased selection:bg-orange-500 selection:text-white overflow-hidden max-w-md mx-auto w-full box-border transition-colors duration-300 relative`}
    >
      {/* Toast Notification Banner */}
      {appToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-teal-500 text-neutral-950 font-bold text-xs shadow-2xl flex items-center space-x-2 animate-fadeIn border border-teal-300">
          <CheckCircle2 className="w-4 h-4" />
          <span>{appToast}</span>
        </div>
      )}

      {/* Top Navbar */}
      <div className="max-w-md mx-auto w-full box-border shrink-0">
        <Navbar
          user={user}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onOpenProfile={() => setIsProfileOpen(true)}
          unreadCount={unreadCount}
        />
      </div>

      {/* Main Content Container */}
      <main ref={mainScrollRef} className="max-w-md mx-auto px-4 pt-4 w-full box-border flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain pb-24">
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
      <BottomNav activeTab={activeTab} onChangeTab={setActiveTab} scrollContainerRef={mainScrollRef} />

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
            onOpenMessages={() => setIsMessagesOpen(true)}
            onNavigateHome={() => setActiveTab('home')}
          />
        )}
      </AnimatePresence>

      {isMessagesOpen && (
        <PulseDmModal user={user} onClose={() => setIsMessagesOpen(false)} />
      )}

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
