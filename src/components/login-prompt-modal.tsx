"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Gift, Sparkles, X } from "lucide-react";
import { useStore } from "@/components/store-provider";

const SESSION_KEY = "tapas-login-prompt-shown";

export function LoginPromptModal() {
  const { authLoading, user } = useStore();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (authLoading || user) {
      return;
    }

    const isRecruiterDemo = typeof window !== "undefined" && sessionStorage.getItem("recruiter-demo") === "true";
    const alreadyShown = typeof window !== "undefined" && sessionStorage.getItem(SESSION_KEY) === "true";

    if (isRecruiterDemo || alreadyShown) {
      return;
    }

    const timer = window.setTimeout(() => {
      setIsOpen(true);
      sessionStorage.setItem(SESSION_KEY, "true");
    }, 900);

    return () => window.clearTimeout(timer);
  }, [authLoading, user]);

  function close() {
    setIsOpen(false);
  }

  return (
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 15 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-white shadow-modal"
          >
            <button
              onClick={close}
              className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-slate-500 transition hover:bg-black/10 hover:text-ink active:scale-95"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative flex h-36 items-center justify-center overflow-hidden bg-gradient-to-br from-primary-accent to-leaf-800 p-6 text-white">
              <div className="absolute -left-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-xl" />
              <div className="absolute -right-6 -bottom-6 h-28 w-28 rounded-full bg-white/15 blur-xl" />

              <div className="flex flex-col items-center text-center">
                <motion.div
                  animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.06, 0.94, 1] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                  className="rounded-full bg-white/20 p-2.5 backdrop-blur-sm"
                >
                  <Sparkles className="h-7 w-7 text-amber-300 fill-amber-300" />
                </motion.div>
                <h2 className="mt-2 text-2xl font-bold tracking-normal">Don't miss out!</h2>
              </div>
            </div>

            <div className="p-6 text-center">
              <p className="text-sm font-semibold text-slate-500 leading-relaxed">
                Sign in to unlock welcome offers, track your orders, and save your favorite products and addresses.
              </p>

              <div className="my-5 rounded-2xl bg-slate-50 p-4 border border-slate-100">
                <span className="block text-4xl font-black tracking-tight text-ink">50% OFF</span>
                <span className="mt-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  On your first order above ₹100
                </span>
              </div>

              <Link
                href="/login"
                onClick={close}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-primary-accent px-6 py-3 font-bold text-white shadow-soft transition hover:bg-leaf-800 active:scale-[0.985]"
              >
                <Gift className="h-4 w-4" />
                Login &amp; Claim Offer
              </Link>
              <button
                onClick={close}
                className="mt-3 w-full text-center text-xs font-semibold text-slate-400 hover:text-slate-600"
              >
                Maybe later
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
