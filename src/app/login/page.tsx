"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, LogOut, Mail, ShieldCheck, Store, UserRoundCheck } from "lucide-react";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import toast from "react-hot-toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const supabase = createSupabaseBrowserClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [user, setUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/login`
      }
    });

    if (error) {
      toast.error(error.message);
    }
  }

  async function handleLogout() {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
    toast.success("Logged out");
  }

  return (
    <main className="min-h-[calc(100vh-73px)] bg-leaf-50">
      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div className="flex flex-col justify-center">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-black text-leaf-700 shadow-sm">
            <Store className="h-4 w-4" />
            Tapas Grocery Store
          </span>
          <h1 className="mt-5 text-4xl font-black leading-tight text-ink sm:text-5xl">Login once, order anytime.</h1>
          <p className="mt-4 max-w-xl text-lg leading-8 text-ink/70">
            Use email login or Google sign-in to manage your account, order history, and saved addresses.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <InfoBadge icon={<Mail className="h-5 w-5" />} title="Email login" text="Use your email and password" />
            <InfoBadge icon={<ShieldCheck className="h-5 w-5" />} title="Google auth" text="Fast secure sign-in" />
          </div>
        </div>

        <div className="rounded-lg border border-black/10 bg-white p-5 shadow-soft sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-ink">Account Login</h2>
              <p className="mt-1 text-sm text-ink/60">Sign in with email or Google.</p>
            </div>
            {user ? <span className="rounded-full bg-leaf-50 px-3 py-2 text-xs font-black text-leaf-700">Signed in</span> : null}
          </div>

          {user ? (
            <div className="mt-5 rounded-lg border border-leaf-100 bg-leaf-50 p-4">
              <p className="font-black text-ink">{user.email ?? "Signed in user"}</p>
              <p className="mt-1 text-sm text-ink/60">You are logged in to Tapas Grocery Store.</p>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-2 rounded-lg bg-leaf-50 p-1">
                <button type="button" onClick={() => setMode("login")} className={`rounded-md px-3 py-2 font-bold ${mode === "login" ? "bg-white shadow-sm" : "text-ink/60"}`}>
                  Login
                </button>
                <button type="button" onClick={() => setMode("signup")} className={`rounded-md px-3 py-2 font-bold ${mode === "signup" ? "bg-white shadow-sm" : "text-ink/60"}`}>
                  Sign up
                </button>
              </div>
              <label className="block">
                <span className="text-sm font-bold text-ink">Email</span>
                <input value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-md border border-black/10 bg-white px-3 py-3" inputMode="email" placeholder="you@example.com" />
              </label>
              <label className="block">
                <span className="text-sm font-bold text-ink">Password</span>
                <input value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-md border border-black/10 bg-white px-3 py-3" type="password" placeholder="Minimum 6 characters" />
              </label>
              <button type="button" onClick={handleEmailAuth} disabled={isSubmitting} className="w-full rounded-md bg-leaf-600 px-4 py-3 font-bold text-white hover:bg-leaf-700 disabled:cursor-not-allowed disabled:bg-gray-300">
                {isSubmitting ? "Please wait..." : mode === "login" ? "Login with Email" : "Create Account"}
              </button>
              <button type="button" onClick={handleGoogleLogin} className="w-full rounded-md border border-black/10 bg-white px-4 py-3 font-bold hover:bg-leaf-50">
                Continue with Google
              </button>
            </div>
          )}

          <div className="mt-6 grid gap-2 border-t border-black/10 pt-5 sm:grid-cols-2">
            <Link href="/account" className="inline-flex items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 font-bold text-white hover:bg-leaf-700">
              <UserRoundCheck className="h-4 w-4" />
              Account
            </Link>
            <Link href="/cart" className="inline-flex items-center justify-center gap-2 rounded-md border border-black/10 px-4 py-3 font-bold hover:bg-leaf-50">
              Checkout
              <ArrowRight className="h-4 w-4" />
            </Link>
            {user ? (
              <button type="button" onClick={handleLogout} className="inline-flex items-center justify-center gap-2 rounded-md border border-red-200 px-4 py-3 font-bold text-red-700 hover:bg-red-50 sm:col-span-2">
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}

function InfoBadge({ icon, text, title }: { icon: ReactNode; text: string; title: string }) {
  return (
    <div className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="rounded-md bg-leaf-50 p-2 text-leaf-700">{icon}</span>
        <div>
          <p className="font-black text-ink">{title}</p>
          <p className="text-sm text-ink/60">{text}</p>
        </div>
      </div>
    </div>
  );
}
