import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CheckoutPanel } from "@/components/checkout-panel";

export default function CheckoutPage() {
  return (
    <main className="min-h-screen bg-[#fafafa]">
      <div className="sticky top-0 z-40 border-b border-zinc-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/#categories" className="rounded-md border border-zinc-100 p-2 hover:bg-leaf-50" aria-label="Back to products">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-black text-ink">Checkout</h1>
            <p className="text-sm text-ink/60">Account, address, and order confirmation</p>
          </div>
        </div>
      </div>
      <CheckoutPanel />
    </main>
  );
}
