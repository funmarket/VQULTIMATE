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
import { getCurrentUserProfile, UserProfile } from './domains/d01_auth';
import { VibePlace } from './domains/d03_vibe_orbit';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [lang, setLang] = useState<'en' | 'fr' | 'ar'>('en');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<VibePlace | null>(null);

  useEffect(() => {
    getCurrentUserProfile().then((profile) => {
      if (profile) setUser(profile);
    });
  }, []);

  const handleToggleLang = () => {
    const nextLang = lang === 'en' ? 'fr' : lang === 'fr' ? 'ar' : 'en';
    setLang(nextLang);
  };

  const isRtl = lang === 'ar';

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="min-h-screen bg-neutral-950 text-white font-sans antialiased selection:bg-orange-500 selection:text-white pb-20"
    >
      {/* Top Navbar */}
      <Navbar
        user={user}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        unreadCount={2}
        currentLang={lang}
        onToggleLang={handleToggleLang}
      />

      {/* Main Content Container */}
      <main className="max-w-md mx-auto px-4 pt-4">
        {activeTab === 'home' && (
          <HomeTab
            user={user}
            onNavigateTab={setActiveTab}
            onSelectPlace={(place) => setSelectedPlace(place)}
          />
        )}
        {activeTab === 'explore' && (
          <ExploreTab onSelectPlace={(place) => setSelectedPlace(place)} />
        )}
        {activeTab === 'share' && (
          <ShareTab
            user={user}
            onPostSuccess={() => setActiveTab('vibe')}
          />
        )}
        {activeTab === 'vibe' && <VibeTab user={user} />}
        {activeTab === 'purse' && <PurseTab user={user} />}
      </main>

      {/* Bottom Five-Tab Navigation */}
      <BottomNav activeTab={activeTab} onChangeTab={setActiveTab} />

      {/* Modals */}
      {isNotificationsOpen && (
        <NotificationModal onClose={() => setIsNotificationsOpen(false)} />
      )}

      {isProfileOpen && (
        <ProfileModal
          user={user}
          onClose={() => setIsProfileOpen(false)}
          onUserSwitch={(newUser) => setUser(newUser)}
        />
      )}

      {selectedPlace && (
        <PlaceDetailModal
          place={selectedPlace}
          onClose={() => setSelectedPlace(null)}
          onCheckIn={(place) => {
            alert(`Successfully checked in at ${place.title}! Claimed +${place.vq_reward} VQ.`);
            if (user) {
              setUser({ ...user, vq_balance: user.vq_balance + place.vq_reward });
            }
          }}
        />
      )}
    </div>
  );
}
