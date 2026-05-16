"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  Home,
  Languages,
  LayoutGrid,
  LockKeyhole,
  LogOut,
  Menu,
  MoreHorizontal,
  ShieldCheck,
  Search,
  ShoppingCart,
  Store,
  UserRound,
  UserRoundCheck,
  X
} from "lucide-react";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useLanguage } from "@/components/language-provider";
import { useStore } from "@/components/store-provider";
import { formatCurrency } from "@/lib/format";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getUnitPrice } from "@/lib/units";

const menuItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/#categories", icon: LayoutGrid, label: "Products" },
  { href: "/#product-tools", icon: Search, label: "Search & Filters" },
  { href: "/#assistant", icon: Bot, label: "Assistant" },
  { href: "/login", icon: UserRoundCheck, label: "Login" },
  { href: "/account", icon: UserRound, label: "Account & Orders" },
  { href: "/cart", icon: ShoppingCart, label: "Cart & Checkout" },
  { href: "/policies", icon: ShieldCheck, label: "Policies" },
  { href: "/more", icon: MoreHorizontal, label: "More" },
  { href: "/admin", icon: LockKeyhole, label: "Admin" }
];

export function Navbar() {
  const { t, toggleLanguage } = useLanguage();
  const { cart, logoutCustomer } = useStore();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const supabase = createSupabaseBrowserClient();
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cart.reduce(
    (total, item) => total + getUnitPrice(item.product.price, item.selectedUnit, item.product.variantPrices) * item.quantity,
    0
  );
  const isCartPage = pathname === "/cart";

  useEffect(() => {
    if (!supabase) {
      return;
    }

    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  async function handleLogout() {
    await supabase?.auth.signOut();
    logoutCustomer();
    setIsMenuOpen(false);
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-black/10 bg-white/95 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMenuOpen(true)}
              className="rounded-md border border-black/10 p-2 text-ink hover:bg-leaf-50"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <Link href="/" className="flex min-w-0 items-center gap-2 font-bold text-ink">
              <Store className="h-6 w-6 shrink-0 text-leaf-600" aria-hidden="true" />
              <span className="truncate text-base sm:text-xl">{t("storeName")}</span>
            </Link>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <a href="/#categories" className="hidden rounded-md px-3 py-2 text-sm font-semibold text-ink hover:bg-leaf-50 md:inline-flex">
              {t("categories")}
            </a>
            <Link href="/cart" className="relative rounded-md p-2 text-ink hover:bg-leaf-50" aria-label={t("cart")} title={t("cart")}>
              <ShoppingCart className="h-5 w-5" aria-hidden="true" />
              {cartCount > 0 ? (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-marigold px-1 text-xs font-bold text-ink">
                  {cartCount}
                </span>
              ) : null}
            </Link>
            <button
              type="button"
              onClick={toggleLanguage}
              className="inline-flex items-center gap-2 rounded-md border border-black/10 px-3 py-2 text-sm font-semibold hover:bg-leaf-50"
            >
              <Languages className="h-4 w-4" aria-hidden="true" />
              {t("language")}
            </button>
            <Link href="/admin" className="hidden items-center gap-2 rounded-md bg-ink px-3 py-2 text-sm font-semibold text-white hover:bg-leaf-700 sm:inline-flex">
              <LockKeyhole className="h-4 w-4" aria-hidden="true" />
              {t("adminLogin")}
            </Link>
            <Link href="/login" className="hidden items-center gap-2 rounded-md border border-black/10 px-3 py-2 text-sm font-semibold hover:bg-leaf-50 md:inline-flex">
              <UserRoundCheck className="h-4 w-4" aria-hidden="true" />
              {user ? "Account" : "Login"}
            </Link>
          </div>
        </nav>
      </header>

      {isMenuOpen ? (
        <div className="fixed inset-0 z-[70] bg-black/40" role="presentation" onClick={() => setIsMenuOpen(false)}>
          <aside
            className="h-full w-full max-w-sm overflow-y-auto bg-white shadow-soft"
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-black/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Store className="h-6 w-6 shrink-0 text-leaf-600" />
                  <div className="min-w-0">
                    <p className="truncate font-black text-ink">{t("storeName")}</p>
                    <p className="text-sm text-ink/60">
                      {cartCount} cart items · {formatCurrency(cartTotal)}
                    </p>
                  </div>
                </div>
                <button type="button" onClick={() => setIsMenuOpen(false)} className="rounded-md border border-black/10 p-2 hover:bg-leaf-50" aria-label="Close menu">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-ink/45">Menu</p>
              <div className="mt-3 rounded-lg bg-leaf-50 p-3">
                <p className="text-sm font-black text-ink">{user ? "Logged in" : "Not logged in"}</p>
                <p className="mt-1 truncate text-sm text-ink/60">{user?.email ?? "Use email or Google login for your account."}</p>
              </div>
              <div className="mt-3 grid gap-2">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center justify-between rounded-lg border border-black/10 bg-white p-3 font-bold text-ink hover:bg-leaf-50"
                    >
                      <span className="inline-flex items-center gap-3">
                        <Icon className="h-5 w-5 text-leaf-700" />
                        {item.label}
                      </span>
                      {item.href === "/cart" && cartCount > 0 ? (
                        <span className="rounded-full bg-marigold px-2 py-1 text-xs text-ink">{cartCount}</span>
                      ) : null}
                    </Link>
                  );
                })}
                {user ? (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center justify-between rounded-lg border border-red-200 bg-white p-3 font-bold text-red-700 hover:bg-red-50"
                  >
                    <span className="inline-flex items-center gap-3">
                      <LogOut className="h-5 w-5" />
                      Logout
                    </span>
                  </button>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      ) : null}

      {cartCount > 0 && !isCartPage ? (
        <Link
          href="/cart"
          className="fixed bottom-4 left-4 right-4 z-40 inline-flex items-center justify-between rounded-2xl bg-[#16a56c] px-5 py-4 font-black text-white shadow-soft hover:bg-leaf-700 sm:left-auto sm:right-6 sm:w-80"
        >
          <span className="inline-flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            {cartCount} items added
          </span>
          <span>View Cart</span>
        </Link>
      ) : null}
    </>
  );
}
