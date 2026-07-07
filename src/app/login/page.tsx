"use client";

import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { ArrowRight, LogOut, Mail, ShieldCheck, Store, UserRoundCheck } from "lucide-react";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [user, setUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Skip redirect if this is a recruiter demo session
    const isRecruiter = typeof window !== "undefined" && sessionStorage.getItem("recruiter-demo") === "true";
    if (user && !isRecruiter) {
      router.push("/");
    }
  }, [user, router]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  async function handleEmailAuth() {
    if (!supabase) {
      toast.error("Supabase is not configured.");
      return;
    }

    if (!email.trim() || password.length < 6) {
      toast.error("Enter a valid email and a password with at least 6 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response =
        mode === "login"
          ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
          : await supabase.auth.signUp({
              email: email.trim(),
              password,
              options: { emailRedirectTo: `${window.location.origin}/login` }
            });

      if (response.error) {
        throw response.error;
      }

      toast.success(mode === "login" ? "Logged in successfully" : "Account created. Check your email if confirmation is required.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    if (!supabase) {
      toast.error("Supabase is not configured.");
      return;
    }

    // Dynamically derive redirect URI so it works on both localhost & Vercel
    const redirectUri = `${window.location.origin}/login`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUri,
      },
    });

    if (error) {
      toast.error(error.message);
    }
  }

  async function handleRecruiterDemoLogin() {
    setIsSubmitting(true);
    toast.success("Recruiter demo login successful!");
    // Store recruiter flag in sessionStorage — no DB or Supabase needed
    sessionStorage.setItem("recruiter-demo", "true");
    // Redirect directly to admin dashboard (view-only)
    router.push("/admin");
    setIsSubmitting(false);
  }

  async function handleLogout() {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
    toast.success("Logged out");
  }

  return (
    <main className="relative min-h-[calc(100vh-73px)] overflow-hidden bg-[#f7f8fa]">
      <div className="absolute inset-0 overflow-hidden">
        <Image src="/images/hatimuri-grocery-hero.png" alt="" fill priority sizes="100vw" className="object-cover object-center brightness-[0.98] contrast-[1.02]" />
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-950/30 via-white/88 to-white/94" />
        <div className="absolute inset-0 soft-grid-bg opacity-35" />

        {/* Dynamic decorative gradients */}
        <motion.div
          animate={{
            x: [0, 30, -10, 0],
            y: [0, -20, 15, 0],
            scale: [1, 1.05, 0.95, 1],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -left-16 -top-16 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, -30, 20, 0],
            y: [0, 30, -10, 0],
            scale: [1, 0.95, 1.05, 1],
          }}
          transition={{
            duration: 16,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute bottom-12 right-12 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl"
        />
      </div>

      <section className="relative mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:min-h-[calc(100vh-73px)] lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-col justify-center"
        >
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-100 bg-white/85 px-3 py-2 text-sm font-black text-leaf-700 shadow-sm backdrop-blur">
            <Store className="h-4 w-4" />
            Tapas Grocery Store
          </span>
          <h1 className="mt-5 text-4xl font-black leading-tight tracking-normal text-[#111827] sm:text-5xl">Login once, order anytime.</h1>
          <p className="mt-4 max-w-xl text-lg leading-8 text-ink/70">
            Use email login or Google sign-in to manage your account, order history, and saved addresses.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <InfoBadge icon={<Mail className="h-5 w-5" />} title="Email login" text="Use your email and password" />
            <InfoBadge icon={<ShieldCheck className="h-5 w-5" />} title="Google auth" text="Fast secure sign-in" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          className="glass-panel rounded-2xl p-5 sm:p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-ink">Account Login</h2>
              <p className="mt-1 text-sm text-ink/60">Sign in with email or Google.</p>
            </div>
            {user ? <span className="rounded-full bg-leaf-50 px-3 py-2 text-xs font-black text-leaf-700">Signed in</span> : null}
          </div>

          {user ? (
            <div className="mt-5 rounded-2xl border border-leaf-100 bg-leaf-50 p-4">
              <p className="font-black text-ink">{user.email ?? "Signed in user"}</p>
              <p className="mt-1 text-sm text-ink/60">You are logged in to Tapas Grocery Store.</p>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-2 rounded-full bg-leaf-50 p-1">
                <button type="button" onClick={() => setMode("login")} className={`rounded-full px-3 py-2 font-bold transition-all duration-155 ${mode === "login" ? "bg-white shadow-sm text-ink" : "text-ink/60 hover:text-ink"}`}>
                  Login
                </button>
                <button type="button" onClick={() => setMode("signup")} className={`rounded-full px-3 py-2 font-bold transition-all duration-155 ${mode === "signup" ? "bg-white shadow-sm text-ink" : "text-ink/60 hover:text-ink"}`}>
                  Sign up
                </button>
              </div>
              <label className="block">
                <span className="text-sm font-bold text-ink">Email</span>
                <input value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm outline-none transition-colors focus:border-[#15803d]" inputMode="email" placeholder="you@example.com" />
              </label>
              <label className="block">
                <span className="text-sm font-bold text-ink">Password</span>
                <input value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm outline-none transition-colors focus:border-[#15803d]" type="password" placeholder="Minimum 6 characters" />
              </label>
              <button type="button" onClick={handleEmailAuth} disabled={isSubmitting} className="w-full rounded-full bg-[#15803d] px-4 py-3 font-bold text-white shadow-sm transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-gray-300">
                {isSubmitting ? "Please wait..." : mode === "login" ? "Login with Email" : "Create Account"}
              </button>
              <button type="button" onClick={handleGoogleLogin} className="w-full rounded-full border border-slate-200 bg-white px-4 py-3 font-bold shadow-sm transition-all hover:bg-leaf-50 active:scale-[0.995]">
                Continue with Google
              </button>
              <div className="relative py-2 text-center text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                or
              </div>
              <button
                type="button"
                onClick={handleRecruiterDemoLogin}
                disabled={isSubmitting}
                className="w-full rounded-full bg-amber-500 hover:bg-amber-600 px-4 py-3 font-bold text-white shadow-md transition-colors duration-150 disabled:cursor-not-allowed disabled:bg-gray-300 active:scale-[0.995]"
              >
                {isSubmitting ? "Please wait..." : "Recruiter Demo Login"}
              </button>
            </div>
          )}

          <div className="mt-6 grid gap-2 border-t border-black/10 pt-5 sm:grid-cols-2">
            <Link href="/account" className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-4 py-3 font-bold text-white transition-all hover:bg-leaf-700 active:scale-[0.995]">
              <UserRoundCheck className="h-4 w-4" />
              Account
            </Link>
            <Link href="/cart" className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 font-bold transition-all hover:bg-leaf-50 active:scale-[0.995]">
              Checkout
              <ArrowRight className="h-4 w-4" />
            </Link>
            {user ? (
              <button type="button" onClick={handleLogout} className="inline-flex items-center justify-center gap-2 rounded-full border border-red-200 bg-white px-4 py-3 font-bold text-red-700 transition-all hover:bg-red-50 active:scale-[0.995] sm:col-span-2">
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            ) : null}
          </div>
        </motion.div>
      </section>
    </main>
  );
}

function InfoBadge({ icon, text, title }: { icon: ReactNode; text: string; title: string }) {
  return (
    <div className="premium-card rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-leaf-50 p-2 text-leaf-700">{icon}</span>
        <div>
          <p className="font-black text-ink">{title}</p>
          <p className="text-sm text-ink/60">{text}</p>
        </div>
      </div>
    </div>
  );
}
