import { useState, useEffect } from 'react';
import { HydraProvider } from './store';
import Dashboard from './Dashboard';
import SplashSvg from './assets/HYDRA_UMC_SPLASHSCREEN.svg';

function App() {
  const [showSplash, setShowSplash] = useState(true);

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
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 10000);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-[#07090C] overflow-hidden">
        <img src={SplashSvg} alt="Splash Screen" className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <HydraProvider>
      <Dashboard />
    </HydraProvider>
  );
}

export default App;