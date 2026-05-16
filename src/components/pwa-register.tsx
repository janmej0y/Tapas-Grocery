"use client";

import { Download, RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const INSTALL_DISMISSED_KEY = "tapas-pwa-install-dismissed";

export function PwaRegister() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);

  useEffect(() => {
    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      const dismissedAt = Number(window.localStorage.getItem(INSTALL_DISMISSED_KEY) ?? 0);
      const dismissedRecently = dismissedAt && Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000;

      setInstallPrompt(event as BeforeInstallPromptEvent);

      if (!dismissedRecently && !isStandaloneApp()) {
        setShowInstallPrompt(true);
      }
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", () => {
      setShowInstallPrompt(false);
      setInstallPrompt(null);
    });

    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    let refreshing = false;

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) {
        return;
      }

      refreshing = true;
      window.location.reload();
    });

    navigator.serviceWorker.register("/sw.js").then((registration) => {
      if (registration.waiting) {
        setWaitingWorker(registration.waiting);
        setShowUpdatePrompt(true);
      }

      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;

        if (!worker) {
          return;
        }

        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            setWaitingWorker(worker);
            setShowUpdatePrompt(true);
          }
        });
      });
    }).catch(() => undefined);
  }, []);

  async function installApp() {
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setShowInstallPrompt(false);
    setInstallPrompt(null);

    if (choice.outcome === "dismissed") {
      window.localStorage.setItem(INSTALL_DISMISSED_KEY, String(Date.now()));
    }
  }

  function continueInBrowser() {
    window.localStorage.setItem(INSTALL_DISMISSED_KEY, String(Date.now()));
    setShowInstallPrompt(false);
  }

  function updateApp() {
    waitingWorker?.postMessage({ type: "SKIP_WAITING" });
  }

  return (
    <>
      {showUpdatePrompt ? (
        <div className="fixed bottom-4 left-4 right-4 z-[80] rounded-lg border border-black/10 bg-white p-4 shadow-soft sm:left-auto sm:w-96">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-black text-ink">Update available</p>
              <p className="mt-1 text-sm text-ink/65">A fresh version of Tapas Grocery Store is ready.</p>
            </div>
            <button type="button" onClick={() => setShowUpdatePrompt(false)} className="rounded-md p-1 hover:bg-leaf-50" aria-label="Dismiss update">
              <X className="h-4 w-4" />
            </button>
          </div>
          <button type="button" onClick={updateApp} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-leaf-600 px-4 py-3 font-bold text-white hover:bg-leaf-700">
            <RefreshCw className="h-4 w-4" />
            Update app
          </button>
        </div>
      ) : null}

      {showInstallPrompt && installPrompt ? (
        <div className="fixed bottom-4 left-4 right-4 z-[75] rounded-lg border border-black/10 bg-white p-4 shadow-soft sm:left-auto sm:w-96">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-black text-ink">Install Tapas Store</p>
              <p className="mt-1 text-sm text-ink/65">Add the store to your phone for faster ordering, or continue in the browser.</p>
            </div>
            <button type="button" onClick={continueInBrowser} className="rounded-md p-1 hover:bg-leaf-50" aria-label="Continue in browser">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={continueInBrowser} className="rounded-md border border-black/10 px-3 py-2 text-sm font-bold hover:bg-leaf-50">
              Browser
            </button>
            <button type="button" onClick={installApp} className="inline-flex items-center justify-center gap-2 rounded-md bg-leaf-600 px-3 py-2 text-sm font-bold text-white hover:bg-leaf-700">
              <Download className="h-4 w-4" />
              Install
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function isStandaloneApp() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}
