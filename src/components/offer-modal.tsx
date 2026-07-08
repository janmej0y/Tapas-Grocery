"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, Gift, Heart, Sparkles, X } from "lucide-react";
import toast from "react-hot-toast";

type OfferType = "welcome" | "inactive";

interface OfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: OfferType;
}

export function OfferModal({ isOpen, onClose, type }: OfferModalProps) {
  const [copied, setCopied] = useState(false);

  const code = type === "welcome" ? "WELCOME50" : "MISSYOU20";
  const title = type === "welcome" ? "Welcome Offer! 🎉" : "We Missed You! ❤️";
  const subtitle =
    type === "welcome"
      ? "Enjoy a special discount on your first order with us."
      : "Here is a comeback gift to welcome you back.";
  const discountText = type === "welcome" ? "50% OFF" : "20% OFF";
  const minOrderText = type === "welcome" ? "On orders above ₹100" : "On orders above ₹150";

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success(`Promo code ${code} copied to clipboard!`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/45 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 15 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-white shadow-modal"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-slate-500 transition hover:bg-black/10 hover:text-ink active:scale-95"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Top Banner Graphic */}
            <div
              className={`relative flex h-36 items-center justify-center overflow-hidden bg-gradient-to-br p-6 text-white ${
                type === "welcome"
                  ? "from-leaf-600 to-teal-800"
                  : "from-amber-500 to-rose-600"
              }`}
            >
              {/* Decorative Floating Blobs */}
              <div className="absolute -left-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-xl" />
              <div className="absolute -right-6 -bottom-6 h-28 w-28 rounded-full bg-white/15 blur-xl" />

              <div className="flex flex-col items-center text-center">
                <motion.div
                  animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.06, 0.94, 1] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                  className="rounded-full bg-white/20 p-2.5 backdrop-blur-sm"
                >
                  {type === "welcome" ? (
                    <Sparkles className="h-7 w-7 text-amber-300 fill-amber-300" />
                  ) : (
                    <Heart className="h-7 w-7 text-white fill-white" />
                  )}
                </motion.div>
                <h2 className="mt-2 text-2xl font-bold tracking-normal">{title}</h2>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 text-center">
              <p className="text-sm font-semibold text-slate-500 leading-relaxed">{subtitle}</p>

              {/* Discount Box */}
              <div className="my-5 rounded-2xl bg-slate-50 p-4 border border-slate-100">
                <span className="block text-4xl font-black tracking-tight text-ink">
                  {discountText}
                </span>
                <span className="mt-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {minOrderText}
                </span>
              </div>

              {/* Promo Code Copy Area */}
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Use Promo Code
                </span>
                <div className="flex items-center justify-between rounded-full border border-dashed border-primary-accent/40 bg-leaf-50/50 p-1.5 pl-5">
                  <span className="font-mono text-lg font-bold tracking-wider text-primary-accent">
                    {code}
                  </span>
                  <button
                    onClick={handleCopy}
                    className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold shadow-card transition active:scale-95 ${
                      copied
                        ? "bg-primary-accent text-white"
                        : "bg-white text-ink border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={onClose}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-primary-accent px-6 py-3 font-bold text-white shadow-soft transition hover:bg-leaf-800 active:scale-[0.985]"
              >
                <Gift className="h-4 w-4" />
                Apply & Start Shopping
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
