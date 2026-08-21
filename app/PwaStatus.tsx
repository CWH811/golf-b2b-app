'use client';

import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function PwaStatus() {
  const [isOnline, setIsOnline] = useState(() => typeof window !== 'undefined' ? window.navigator.onLine : true);
  const [canInstall, setCanInstall] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [serviceWorkerRegistration, setServiceWorkerRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isStandalone] = useState(() => typeof window !== 'undefined' ? window.matchMedia('(display-mode: standalone)').matches : false);

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(window.navigator.onLine);
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        setServiceWorkerRegistration(registration);

        const checkForUpdate = () => {
          if (registration.waiting) {
            setUpdateAvailable(true);
          }
        };

        checkForUpdate();

        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          if (!installing) {
            return;
          }

          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
            }
          });
        });
      });
    }

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) {
      return;
    }

    installPrompt.prompt();
    await installPrompt.userChoice;
    setCanInstall(false);
  };

  const handleUpdate = async () => {
    if (!serviceWorkerRegistration?.waiting) {
      return;
    }

    serviceWorkerRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  };

  if (isStandalone) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-[60] flex w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 flex-col gap-2">
      {!isOnline ? (
        <div className="rounded-2xl border border-amber-500/30 bg-[#161719]/95 px-4 py-3 text-sm text-amber-200 shadow-[0_12px_35px_rgba(0,0,0,0.35)] backdrop-blur">
          Offline mode active — the app shell and cached views remain available.
        </div>
      ) : null}
      {updateAvailable ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#39FF14]/30 bg-[#161719]/95 px-4 py-3 text-sm text-slate-200 shadow-[0_12px_35px_rgba(0,0,0,0.35)] backdrop-blur">
          <div>
            <div className="font-semibold text-white">GCore update available</div>
            <div className="text-xs text-slate-400">Refresh to apply the latest version.</div>
          </div>
          <button
            type="button"
            onClick={handleUpdate}
            className="rounded-full bg-[#39FF14] px-3 py-2 text-sm font-semibold text-[#101210] transition hover:bg-[#2fda0d]"
          >
            Update
          </button>
        </div>
      ) : null}
      {canInstall ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#39FF14]/30 bg-[#161719]/95 px-4 py-3 text-sm text-slate-200 shadow-[0_12px_35px_rgba(0,0,0,0.35)] backdrop-blur">
          <div>
            <div className="font-semibold text-white">Install GCore</div>
            <div className="text-xs text-slate-400">Add it to your device for faster field access.</div>
          </div>
          <button
            type="button"
            onClick={handleInstall}
            className="rounded-full bg-[#39FF14] px-3 py-2 text-sm font-semibold text-[#101210] transition hover:bg-[#2fda0d]"
          >
            Install
          </button>
        </div>
      ) : null}
    </div>
  );
}
