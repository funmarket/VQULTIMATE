import React from 'react';
import { Compass, Camera, Flame, Wallet, Home as HomeIcon } from 'lucide-react';

export type TabType = 'home' | 'explore' | 'share' | 'vibe' | 'purse';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab }) => {
  const tabs = [
    { id: 'home' as TabType, label: 'Home', icon: HomeIcon },
    { id: 'explore' as TabType, label: 'Explore', icon: Compass },
    { id: 'share' as TabType, label: 'Share', icon: Camera },
    { id: 'vibe' as TabType, label: 'Vibe', icon: Flame },
    { id: 'purse' as TabType, label: 'Purse', icon: Wallet },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-neutral-950/90 backdrop-blur-2xl border-t border-neutral-800/80 px-2 py-2 max-w-md mx-auto">
      <div className="grid grid-cols-5 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-300 ${
                isActive
                  ? 'bg-gradient-to-t from-orange-500/20 via-teal-500/10 to-transparent text-orange-400 border border-orange-500/30 shadow-lg shadow-orange-500/10'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50'
              }`}
            >
              <Icon className={`w-5 h-5 mb-1 transition-transform duration-300 ${isActive ? 'scale-110 text-orange-400' : 'text-neutral-400'}`} />
              <span className={`text-[10px] font-semibold tracking-wide ${isActive ? 'text-white' : 'text-neutral-400'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
