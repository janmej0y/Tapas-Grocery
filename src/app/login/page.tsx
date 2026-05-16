"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, LogOut, ShieldCheck, Smartphone, Store, UserRoundCheck } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { useStore } from "@/components/store-provider";
import { useOtpCooldown } from "@/hooks/use-otp-cooldown";
import { isAdminPhone } from "@/lib/admin-access";

export default function LoginPage() {
  const { customer, logoutCustomer, markPhoneVerified, pendingOtp, sendOtp, verifyOtp } = useStore();
  const [phone, setPhone] = useState(customer.phone);
  const [otp, setOtp] = useState("");
  const { isOtpCoolingDown, otpCooldown, startOtpCooldown } = useOtpCooldown();
  const isCurrentPhoneVerified = customer.isPhoneVerified && normalizePhone(phone) === customer.phone;

  async function handleSendOtp() {
    if (isOtpCoolingDown) {
      toast.error(`Please wait ${otpCooldown} seconds before requesting another OTP.`);
      return;
    }

    if (normalizePhone(phone).length < 10) {
      toast.error("Enter a valid 10 digit mobile number.");
      return;
    }

    try {
      const response = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone })
      });
      const data = await response.json();

      if (!response.ok) {
        if (typeof data.retryAfterSeconds === "number") {
          startOtpCooldown(data.retryAfterSeconds);
        }
        throw new Error(data.error ?? "OTP could not be sent.");
      }

      const code = data.provider === "demo" ? sendOtp(phone) : "";
      startOtpCooldown(60);
      toast.success(data.provider === "demo" ? `Demo OTP sent: ${code}` : "OTP sent to your phone");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "OTP could not be sent.");
    }
  }

  async function handleVerifyOtp() {
    try {
      const response = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, token: otp })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Invalid OTP.");
      }

      if (data.provider === "demo" && !verifyOtp(otp)) {
        throw new Error("Invalid demo OTP.");
      }

      markPhoneVerified(phone);
      setOtp("");
      toast.success(isAdminPhone(phone) ? "Owner login verified" : "Phone login verified");
    } catch (error) {
      toast.error(customer.isBlocked ? "This mobile number is blocked." : error instanceof Error ? error.message : "Invalid OTP.");
    }
  }

  function handleLogout() {
    logoutCustomer();
    setOtp("");
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
            Use mobile OTP login for the website and installed app. Your verified login stays active for 30 days on this device.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <InfoBadge icon={<Smartphone className="h-5 w-5" />} title="Phone OTP" text="No password needed" />
            <InfoBadge icon={<ShieldCheck className="h-5 w-5" />} title="Secure checkout" text="Required before ordering" />
          </div>
        </div>

        <div className="rounded-lg border border-black/10 bg-white p-5 shadow-soft sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-ink">Mobile Login</h2>
              <p className="mt-1 text-sm text-ink/60">Verify your phone number with OTP.</p>
            </div>
            {isCurrentPhoneVerified ? (
              <span className="rounded-full bg-leaf-50 px-3 py-2 text-xs font-black text-leaf-700">Verified</span>
            ) : null}
          </div>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-sm font-bold text-ink">Mobile number</span>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="mt-2 w-full rounded-md border border-black/10 bg-white px-3 py-3"
                inputMode="tel"
                placeholder="10 digit mobile number"
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-ink">OTP</span>
              <input
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleVerifyOtp();
                  }
                }}
                className="mt-2 w-full rounded-md border border-black/10 bg-white px-3 py-3"
                inputMode="numeric"
                placeholder="Enter OTP"
              />
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={isOtpCoolingDown}
                className="rounded-md border border-black/10 bg-white px-4 py-3 font-bold hover:bg-leaf-50 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-ink/45"
              >
                {isOtpCoolingDown ? `Resend in ${otpCooldown}s` : "Send OTP"}
              </button>
              <button type="button" onClick={handleVerifyOtp} className="rounded-md bg-leaf-600 px-4 py-3 font-bold text-white hover:bg-leaf-700">
                Verify Login
              </button>
            </div>
            <p className={`text-sm font-semibold ${isCurrentPhoneVerified ? "text-leaf-700" : "text-ink/60"}`}>
              {customer.isBlocked
                ? "This mobile number is blocked by the store."
                : isCurrentPhoneVerified
                  ? "You are logged in. You can place orders and view your account."
                  : pendingOtp
                    ? "OTP sent. Demo code is 123456."
                    : "Login is required before placing an order."}
            </p>
          </div>

          <div className="mt-6 grid gap-2 border-t border-black/10 pt-5 sm:grid-cols-2">
            <Link href="/account" className="inline-flex items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 font-bold text-white hover:bg-leaf-700">
              <UserRoundCheck className="h-4 w-4" />
              Account
            </Link>
            <Link href="/cart" className="inline-flex items-center justify-center gap-2 rounded-md border border-black/10 px-4 py-3 font-bold hover:bg-leaf-50">
              Checkout
              <ArrowRight className="h-4 w-4" />
            </Link>
            {customer.isPhoneVerified ? (
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

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "").slice(-10);
}
