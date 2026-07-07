"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, Store } from "lucide-react";
import { useStore } from "@/components/store-provider";

export function ShopperAuthGuard({ children }: { children: React.ReactNode }) {
  const { user, authLoading } = useStore();
  const router = useRouter();
  const pathname = usePathname();

  const isLoginPage = pathname === "/login";
  const isAdminPage = pathname?.startsWith("/admin");
  const isApiRoute = pathname?.startsWith("/api");

  // Bypass authentication checks for login page, admin dashboards, and API endpoints
  const isBypassPage = isLoginPage || isAdminPage || isApiRoute;

  useEffect(() => {
    if (!authLoading && !user && !isBypassPage) {
      router.replace("/login");
    }
  }, [user, authLoading, isBypassPage, router]);

  // While loading auth status, show a premium loading screen (only on guarded pages)
  if (authLoading && !isBypassPage) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f7f8fa]">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-[#15803d] shadow-sm">
            <Store className="h-8 w-8 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-ink">Tapas Grocery Store</h3>
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#15803d]" />
              Authenticating session...
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If not logged in and it's a guarded page, don't flash dashboard content
  if (!user && !isBypassPage) {
    return null;
  }

  return <>{children}</>;
}
