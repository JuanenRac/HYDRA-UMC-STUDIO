// =============================================================================
// HYDRA-UMC STUDIO - Main Router and Layout Component: App.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import { useState, useEffect } from 'react';
import { HydraProvider } from './HydraProvider';
import Dashboard from './Dashboard';
import { GamepadController } from './components/GamepadController';
import { AuthGate } from './components/AuthGate';
import SplashSvg from './assets/HYDRA_UMC_SPLASHSCREEN.svg';

/**
 * Executes the  app logic. 
 * This function handles the necessary computations and state updates.
 */
function App() {
  // The splash is skipped when the page is embedded (`hideUI=true`, as the 3D viewport WebView of the Android app loads it): there is no reason to
  // show desktop-kiosk branding there. The URL flag is read once at mount, before the first paint, to pick the initial showSplash value.
  //
  // `skipSplash=true` is a second, independent flag for the same "skip the
  // 10s splash" need but WITHOUT hideUI's other effect of hiding the
  // header/sidebar/tab navigation - HYDRA-UMC-OS's own HDMI kiosk
  // (provisioning/kiosk/splash.html) already shows this project's real,
  // animated HYDRA_UMC_SPLASHSCREEN.svg once itself before handing off to
  // this page, so showing it again here (a second time, and only a static
  // <img> render of it, never animated) was a real, reported duplicate.
  // hideUI still implies it, matching the pre-existing Android behaviour.
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const hideUI = params?.get('hideUI') === 'true';
  const skipSplash = hideUI || params?.get('skipSplash') === 'true';
  const [showSplash, setShowSplash] = useState(!skipSplash);

  useEffect(() => {
    const handleInteraction = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
          console.warn('Could not request fullscreen', err);
        });
      }
    };
    document.addEventListener('click', handleInteraction, { once: true });
    return () => {
      document.removeEventListener('click', handleInteraction);
    };
  }, []);


  useEffect(() => {
    if (skipSplash) return;
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 10000);
    return () => clearTimeout(timer);
  }, [skipSplash]);

  if (showSplash) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-[#07090C] overflow-hidden">
        <img src={SplashSvg} alt="Splash Screen" className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <HydraProvider>
      <AuthGate>
        <GamepadController />
        <Dashboard />
      </AuthGate>
    </HydraProvider>
  );
}

export default App;