// =============================================================================
// HYDRA-UMC STUDIO - src/Dashboard.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// The shell of the application: the top bar, the side menu, the screen, the status bar and the windows over them.

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
import { setLanguage } from './i18n';
import { cn } from './components/robotDetail/shared';
import { CommandIssueBanner } from './components/CommandIssueBanner';
import { StopAllReportBanner, StopAllShortcut } from './components/StopAll';
import { StopGuard } from './components/StopGuard';
import { setSelectedRobotId, useSelectedRobotId } from './lib/selectedRobot';
import { HelpModal } from './components/HelpModal';
import { TourHost } from './tour/TourHost';
import { startTour } from './tour/tourStore';
import { tourForView } from './tour/tours';
import { About } from './components/About';
import { Config } from './components/Config';
import { Assistant } from './assistant/Assistant';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ClassicSidebar } from './nav/ClassicSidebar';
import { GroupedSidebar } from './nav/GroupedSidebar';
import { ScreenChooser } from './nav/ScreenChooser';
import { entryOf } from './nav/navModel';
import { useStudioPrefs } from './lib/studioPrefs';
import { ScreenHost } from './nav/ScreenHost';
import { AppHeader } from './shell/AppHeader';
import { AppFooter } from './shell/AppFooter';
import { useSettingsStore } from './storeContexts';

/** Suspense fallback for the lazy-loaded panels below. */
function PanelLoadingFallback() {
  const { t } = useTranslation();
  return (
    <div className="flex-1 flex items-center justify-center text-slate-600 text-sm">
      <RefreshCw size={18} className="animate-spin mr-2" /> {t('common.loading')}
    </div>
  );
}

export default function Dashboard() {
  const { i18n } = useTranslation();
  const { settings } = useSettingsStore();
  const [activeTab, setActiveTab] = useState<string>('overview');
  // Shared with the gamepad, which moves the robot selected here.
  const selectedRobotId = useSelectedRobotId();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [helpStart, setHelpStart] = useState<{ tab?: string; topic?: string }>({});
  const openHelp = (tab?: string, topic?: string) => { setHelpStart({ tab, topic }); setIsHelpOpen(true); };
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { classicMenu } = useStudioPrefs();
  // the configuration is a window in the classic menu and a screen in the grouped one
  const openSettings = () => { if (classicMenu) setIsSettingsOpen(true); else setActiveTab('settings'); };
  const goToView = (view: string) => { if (view === 'settings') openSettings(); else setActiveTab(view); };
  // the classic menu switched on from the configuration screen: the same configuration goes on in its window
  if (classicMenu && activeTab === 'settings') {
    setActiveTab('overview');
    setIsSettingsOpen(true);
  }
  const current = classicMenu ? undefined : entryOf(activeTab);

  const hideUI = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('hideUI') === 'true';
  }, []);

  // Genuine "synchronize with an external system" effect: reads the URL's
  // own query string, localStorage and the i18n library, and mutates
  // document.body.dataset directly - real external systems the lint
  // rule's own text carves out, not the "derive local state" case it's
  // meant to catch. Reading window.location/mutating the DOM during
  // render instead would be the actual anti-pattern here.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const robotIdParam = params.get('robotId');
    if (robotIdParam) {
      const id = parseInt(robotIdParam);
      console.log(`[Industrial] Identified Remote Target: Robot A${id}`);
      setSelectedRobotId(id); // eslint-disable-line -- real external (URL) sync, not derived state
      setActiveTab('robot');
    }

    document.body.dataset.theme = settings.theme;
    if (settings.language && i18n.language !== settings.language) {
      void setLanguage(settings.language);
    }
  }, [settings.theme, settings.language, i18n]);

  // Real "adjust state during render" (React's own recommended
  // replacement for a derive-only effect): forcing the robot tab open
  // when `?hideUI=true` is a pure consequence of `hideUI` itself (already
  // memoized above), not a real external-system sync, so it's safe to
  // do this conditionally during render rather than in its own effect.
  if (hideUI && activeTab !== 'robot') {
    setActiveTab('robot');
  }

  return (
    <div className="w-full h-screen bg-slate-950 bg-electric-grid text-slate-200 flex flex-col font-sans overflow-hidden mx-auto touch-none relative">
      <CommandIssueBanner />
      <StopAllShortcut />
      <StopGuard />
      <StopAllReportBanner compact={hideUI} />

      {isAboutOpen && <About onClose={() => setIsAboutOpen(false)} />}

      {isHelpOpen && <HelpModal onClose={() => setIsHelpOpen(false)} initialTab={helpStart.tab} initialTopic={helpStart.topic} onGo={goToView} onStartTour={startTour} screenTour={tourForView(activeTab)?.id} />}

      {!hideUI && <TourHost view={activeTab} setView={setActiveTab} />}

      {!hideUI && <Assistant view={activeTab} go={goToView} openHelp={openHelp} openSettings={openSettings} />}

      {isSettingsOpen && <Config onClose={() => setIsSettingsOpen(false)} />}

      {!hideUI && <AppHeader title={current && { group: `nav.group_${current.group}`, screen: current.label }} onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} onSettings={openSettings} onHelp={() => openHelp()} onAbout={() => setIsAboutOpen(true)} />}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Nav */}
        {!hideUI && (classicMenu
          ? <ClassicSidebar open={isSidebarOpen} view={activeTab} setView={setActiveTab} selectedRobotId={selectedRobotId} />
          : <GroupedSidebar open={isSidebarOpen} view={activeTab} go={goToView} />)}

        {/* Main Content Area */}
        <main data-tour="stage" className={cn(
            "flex-1 flex flex-col overflow-hidden backdrop-blur-sm relative transition-all duration-300",
            hideUI ? "bg-black pt-0 px-0 pb-0" : "bg-slate-950/80 pt-0 px-0 pb-0"
        )}>
          {/* key={activeTab}: an ErrorBoundary's own state (hasError) only
              clears on remount, not on a props change - without this key,
              switching away from a panel that crashed to any OTHER panel
              would keep showing the stale fallback forever instead of
              actually trying to render the newly-selected one. */}
          {!hideUI && !classicMenu && <ScreenChooser view={activeTab} setView={setActiveTab} selectedRobotId={selectedRobotId} />}
          <ErrorBoundary key={activeTab}>
          <React.Suspense fallback={<PanelLoadingFallback />}>
            <div className={cn("w-full flex-1 min-h-0 overflow-hidden flex flex-col", !hideUI && "pt-8 px-8 pb-4")}>
              <ScreenHost view={activeTab} selectedRobotId={selectedRobotId} hideUI={hideUI} onNavigateToRobot={(id) => { setSelectedRobotId(id); setActiveTab('robot'); }} />
            </div>
          </React.Suspense>
          </ErrorBoundary>
        </main>
      </div>

      {!hideUI && <AppFooter selectedRobotId={selectedRobotId} />}
    </div>
  );
}
