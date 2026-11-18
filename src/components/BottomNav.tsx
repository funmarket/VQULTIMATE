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
  const anchorScrollY = useRef(0);

  useEffect(() => {
    const readScrollY = () => Math.max(0, scrollContainerRef?.current?.scrollTop ?? window.scrollY);
    anchorScrollY.current = readScrollY();

    const handleScroll = () => {
      const currentScrollY = readScrollY();
      if (currentScrollY < 10) {
        anchorScrollY.current = currentScrollY;
        setIsVisible(true);
        return;
      }
      const movement = currentScrollY - anchorScrollY.current;
      if (Math.abs(movement) > 20) {
        anchorScrollY.current = currentScrollY;
        setIsVisible(movement <= 0);
      }
    };

    const target = scrollContainerRef?.current ?? window;
    target.addEventListener('scroll', handleScroll, { passive: true });
    return () => target.removeEventListener('scroll', handleScroll);
  }, [scrollContainerRef]);

  useEffect(() => {
    anchorScrollY.current = Math.max(0, scrollContainerRef?.current?.scrollTop ?? window.scrollY);
    setIsVisible(true);
  }, [activeTab, scrollContainerRef]);

  const tabs: {
    id: TabType;
    label: string;
    icon: typeof HomeIcon;
    activeClass: string;
  }[] = [
    {
      id: 'home',
      label: 'Home',
      icon: HomeIcon,
      activeClass:
        'bg-white text-[#005254] outline-[1.5px] outline-[#005254] -outline-offset-[1.5px] shadow-none dark:bg-[#005254] dark:text-white dark:outline-none dark:shadow-[0_0_0_2px_rgba(0,206,209,0.30),0_4px_6px_rgba(0,0,0,0.10)]',
    },
    {
      id: 'explore',
      label: 'Explore',
      icon: Compass,
      activeClass:
        'bg-white text-[#006600] outline-[1.5px] outline-[#006600] -outline-offset-[1.5px] shadow-none dark:bg-[#006600] dark:text-white dark:outline-none dark:shadow-[0_0_0_2px_rgba(0,255,0,0.30),0_4px_6px_rgba(0,0,0,0.10)]',
    },
    {
      id: 'share',
      label: 'Share',
      icon: Camera,
      activeClass:
        'bg-white text-[#990026] outline-[1.5px] outline-[#990026] -outline-offset-[1.5px] shadow-none dark:bg-[#990026] dark:text-white dark:outline-none dark:shadow-[0_0_0_4px_rgba(255,0,64,0.25),0_4px_6px_rgba(0,0,0,0.10)]',
    },
    {
      id: 'vibe',
      label: 'Vibe',
      icon: Flame,
      activeClass:
        'bg-white text-[#9d00ff] outline-[1.5px] outline-[#9d00ff] -outline-offset-[1.5px] shadow-none dark:bg-[#9d00ff] dark:text-white dark:outline-none dark:shadow-[0_0_0_2px_rgba(157,0,255,0.30),0_4px_6px_rgba(0,0,0,0.10)]',
    },
    {
      id: 'purse',
      label: 'Purse',
      icon: Wallet,
      activeClass:
        'bg-white text-[#554616] outline-[1.5px] outline-[#554616] -outline-offset-[1.5px] shadow-none dark:bg-[#554616] dark:text-white dark:outline-none dark:shadow-[0_0_0_2px_rgba(212,175,55,0.30),0_4px_6px_rgba(0,0,0,0.10)]',
    },
  ];

  return (
    <nav
      data-scroll-hidden={!isVisible}
      className={`fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto transition-all duration-[250ms] ease-out transform focus-within:translate-y-0 focus-within:opacity-100 focus-within:pointer-events-auto ${
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
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all duration-[250ms] box-border cursor-pointer ${
                isActive
                  ? tab.activeClass
                  : 'text-[#65676B] hover:text-[#050505] hover:bg-[#F0F2F5] dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-900/50'
              }`}
            >
              <Icon className={`w-5 h-5 mb-1 transition-transform duration-[250ms] ${isActive ? 'scale-110 text-current' : 'text-[#65676B] dark:text-neutral-400'}`} />
              <span className={`text-[10px] font-extrabold tracking-wide uppercase ${isActive ? 'text-current' : 'text-[#65676B] dark:text-neutral-400'}`}>
                {tab.label}
              </span>
              {isActive && tab.id !== 'share' && (
                <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-current" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
