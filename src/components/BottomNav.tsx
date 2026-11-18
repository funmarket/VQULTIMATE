import React, { useState, useEffect, useRef } from 'react';
import { Compass, Camera, Flame, Wallet, Home as HomeIcon } from 'lucide-react';

export type TabType = 'home' | 'explore' | 'share' | 'vibe' | 'purse';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab, scrollContainerRef }) => {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = scrollContainerRef?.current?.scrollTop ?? window.scrollY;
      if (currentScrollY > lastScrollY.current + 15) {
        setIsVisible(false); // scrolling down past 15px threshold
      } else if (currentScrollY < lastScrollY.current - 10 || currentScrollY < 10) {
        setIsVisible(true); // scrolling up
      }
      lastScrollY.current = currentScrollY;
    };

    const target = scrollContainerRef?.current ?? window;
    target.addEventListener('scroll', handleScroll, { passive: true });
    return () => target.removeEventListener('scroll', handleScroll);
  }, [scrollContainerRef]);

  useEffect(() => {
    lastScrollY.current = 0;
    setIsVisible(true);
  }, [activeTab]);

  const tabs = [
    { id: 'home' as TabType, label: 'Home', icon: HomeIcon },
    { id: 'explore' as TabType, label: 'Explore', icon: Compass },
    { id: 'share' as TabType, label: 'Share', icon: Camera },
    { id: 'vibe' as TabType, label: 'Vibe', icon: Flame },
    { id: 'purse' as TabType, label: 'Purse', icon: Wallet },
  ];

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto transition-all duration-300 transform ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
      } bg-white/95 dark:bg-neutral-950/95 backdrop-blur-2xl border-t border-[#DBDBDB] dark:border-neutral-800/80 px-2 py-2 box-border shadow-[0_-1px_8px_rgba(0,0,0,0.06)] dark:shadow-2xl`}
    >
      <div className="grid grid-cols-5 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-300 box-border ${
                isActive
                  ? 'bg-[#E7F3FF] text-[#0866FF] border border-[#0866FF]/20 shadow-sm dark:bg-gradient-to-t dark:from-orange-500/20 dark:via-teal-500/10 dark:to-transparent dark:text-orange-400 dark:border-orange-500/30 dark:shadow-lg dark:shadow-orange-500/10'
                  : 'text-[#65676B] hover:text-[#050505] hover:bg-[#F0F2F5] dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-900/50'
              }`}
            >
              <Icon className={`w-5 h-5 mb-1 transition-transform duration-300 ${isActive ? 'scale-110 text-[#0866FF] dark:text-orange-400' : 'text-[#65676B] dark:text-neutral-400'}`} />
              <span className={`text-[10px] font-semibold tracking-wide ${isActive ? 'text-[#0866FF] dark:text-white' : 'text-[#65676B] dark:text-neutral-400'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
