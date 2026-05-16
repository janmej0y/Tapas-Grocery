"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Download, ExternalLink, Globe2, PackageCheck, RefreshCw, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

const APK_PATH = "/downloads/tapas-grocery.apk";

export default function MorePage() {
  const [isStandalone, setIsStandalone] = useState(false);
  const [apkAvailable, setApkAvailable] = useState(false);
  const [isCheckingApk, setIsCheckingApk] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setIsStandalone(isStandaloneApp());

    fetch(APK_PATH, { method: "HEAD" })
      .then((response) => setApkAvailable(response.ok))
      .catch(() => setApkAvailable(false))
      .finally(() => setIsCheckingApk(false));
  }, []);

  async function checkForUpdate() {
    if (!("serviceWorker" in navigator)) {
      toast.error("App update is not supported in this browser.");
      return;
    }

    setIsUpdating(true);

    try {
      const registration = await navigator.serviceWorker.getRegistration();

      if (!registration) {
        toast.error("Install or open the app once before checking updates.");
        return;
      }

      await registration.update();

      if (registration.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
        toast.success("Updating app...");
        return;
      }

      toast.success("You are already using the latest version.");
    } catch {
      toast.error("Could not check for updates right now.");
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-73px)] bg-leaf-50">
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-leaf-700">More</p>
          <h1 className="mt-2 text-4xl font-black text-ink">App, browser, and APK</h1>
          <p className="mt-4 text-lg leading-8 text-ink/70">
            Install Tapas Grocery Store as a PWA, check for app updates, continue in the browser, or download the Android APK when it is published.
          </p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <ActionCard
            icon={<Smartphone className="h-6 w-6" />}
            title="Install app"
            text={isStandalone ? "You are already using the installed app experience." : "Use your browser install option to add Tapas Store to your phone home screen."}
          >
            <button
              type="button"
              onClick={() => toast.success("Open your browser menu and choose Install app or Add to Home screen.")}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-leaf-600 px-4 py-3 font-bold text-white hover:bg-leaf-700"
            >
              Install guide
              <ArrowRight className="h-4 w-4" />
            </button>
          </ActionCard>

          <ActionCard
            icon={<RefreshCw className="h-6 w-6" />}
            title="Update app"
            text="Check for the latest service worker and refresh the installed app when a new version is available."
          >
            <button
              type="button"
              onClick={checkForUpdate}
              disabled={isUpdating}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 font-bold text-white hover:bg-leaf-700 disabled:bg-gray-300"
            >
              <RefreshCw className="h-4 w-4" />
              {isUpdating ? "Checking..." : "Check update"}
            </button>
          </ActionCard>

          <ActionCard
            icon={<Download className="h-6 w-6" />}
            title="Download APK"
            text={apkAvailable ? "Download the Android APK package directly." : "APK file is not uploaded yet. Add it to public/downloads/tapas-grocery.apk when ready."}
          >
            {apkAvailable ? (
              <a href={APK_PATH} download className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-leaf-600 px-4 py-3 font-bold text-white hover:bg-leaf-700">
                <Download className="h-4 w-4" />
                Download APK
              </a>
            ) : (
              <button type="button" disabled className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-gray-300 px-4 py-3 font-bold text-gray-700">
                <PackageCheck className="h-4 w-4" />
                {isCheckingApk ? "Checking APK..." : "APK coming soon"}
              </button>
            )}
          </ActionCard>
        </div>

        <section className="mt-6 rounded-lg border border-black/10 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="rounded-md bg-leaf-50 p-2 text-leaf-700">
              <Globe2 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-black text-ink">Explore in browser</h2>
              <p className="mt-1 text-sm leading-6 text-ink/65">
                The website always works in normal browser mode too. Customers can shop, login, checkout, track orders, and use the account page without installing anything.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/" className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 font-bold text-white hover:bg-leaf-700">
                  Open store
                  <ExternalLink className="h-4 w-4" />
                </Link>
                <Link href="/login" className="rounded-md border border-black/10 px-4 py-2 font-bold hover:bg-leaf-50">
                  Login
                </Link>
                <Link href="/cart" className="rounded-md border border-black/10 px-4 py-2 font-bold hover:bg-leaf-50">
                  Cart
                </Link>
              </div>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

function ActionCard({ children, icon, text, title }: { children: ReactNode; icon: ReactNode; text: string; title: string }) {
  return (
    <section className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
      <span className="grid h-12 w-12 place-items-center rounded-md bg-leaf-50 text-leaf-700">{icon}</span>
      <h2 className="mt-4 text-xl font-black text-ink">{title}</h2>
      <p className="mt-2 min-h-20 text-sm leading-6 text-ink/65">{text}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function isStandaloneApp() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}
