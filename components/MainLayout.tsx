import React, { ReactNode } from 'react';
import ParticleBackground from './ParticleBackground';
import RamadanDecor from './RamadanDecor';
import PWAInstallPrompt from './PWAInstallPrompt';
import { StudyRoom } from './StudyRoom';
import { IS_RAMADAN } from '../src/config/theme';
import XpNotification from './XpNotification';
import AchievementCelebration from './AchievementCelebration';
import BottomNav from './BottomNav';
import OfflineIndicator from './OfflineIndicator';

interface MainLayoutProps {
  children: ReactNode;
  toast?: { msg: string; error?: boolean } | null;
  language: string;
  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  sidebar: ReactNode;
  header: ReactNode;
  totalXp?: number;
}

/**
 * MainLayout Component
 * 
 * Houses the global UI structure and high-performance backgrounds.
 * - ParticleBackground is injected as the absolute first child.
 * - Main content wrapper and main area use bg-transparent and z-10 to allow visibility through to the particle field.
 * - Global utilities like XpNotification and BottomNav are centralized here.
 */
const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  toast,
  language,
  isSidebarOpen,
  setSidebarOpen,
  sidebar,
  header,
  totalXp = 0
}) => {
  return (
    <div className="flex h-screen text-gray-900 dark:text-gray-100 relative overflow-hidden transition-colors duration-300">
      {/* 1. High-Performance GPU Particles - Absolute First Child */}
      <ParticleBackground />

      {/* 2. Global UI Overlays */}
      {toast && (
        <div style={{ position: 'fixed', top: '80px', left: '50%', transform: 'translateX(-50%)', background: toast.error ? '#dc2626' : '#059669', color: 'white', padding: '12px 24px', borderRadius: '12px', zIndex: 100000, fontWeight: 'black', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', whiteSpace: 'nowrap' }}>
          {toast.msg}
        </div>
      )}
      {IS_RAMADAN && <RamadanDecor />}
      <PWAInstallPrompt />
      <StudyRoom />

      {/* 3. Main content wrapper (z-10 for layering) */}
      <div className="relative z-10 flex w-full h-screen overflow-hidden flex-row">
        {sidebar}
        
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-transparent">
          {header}
          
          <main className="flex-1 overflow-y-auto pb-16 md:pb-0 bg-transparent">
            {children}
          </main>
        </div>

        {/* Mobile sidebar overlay */}
        {isSidebarOpen && (
          <div 
            onClick={() => setSidebarOpen(false)} 
            className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm"
          />
        )}
      </div>

      {/* 4. Global Floating Utilities */}
      <XpNotification />
      <AchievementCelebration />
      <BottomNav />
      <OfflineIndicator />
    </div>
  );
};

export default MainLayout;
