"use client";

import { useMemo, useState } from "react";
import { CreditCard, IndianRupee, Minus, Plus, RotateCcw, Trash2 } from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";
import { useLanguage } from "@/components/language-provider";
import { useStore } from "@/components/store-provider";
import { calculateDeliveryFee } from "@/lib/delivery";
import { formatCurrency } from "@/lib/format";
import { buildWhatsAppOrderUrl, downloadInvoice } from "@/lib/invoice";
import { applyPromoCode } from "@/lib/promos";
import type { Order, UserAddress } from "@/lib/types";
import { formatCartItemName, getUnitPrice } from "@/lib/units";

type PaymentMethod = "COD" | "UPI" | "Card" | "NetBanking";

const emptyAddress: UserAddress = {
  id: "addr-manual",
  label: "Home",
  receiverName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "West Bengal",
  pincode: "",
  landmark: "",
  distanceKm: 0.3
};

export function CheckoutPanel() {
  const { t } = useLanguage();
  const {
    addOrder,
    cart,
    clearCart,
    customer,
    markPhoneVerified,
    pendingOtp,
    removeFromCart,
    reorder,
    sendOtp,
    updateCustomerAddress,
    updateQuantity,
    verifyOtp
  } = useStore();
  const [phone, setPhone] = useState(customer.phone);
  const [otp, setOtp] = useState("");
  const [selectedAddressId, setSelectedAddressId] = useState(customer.addresses[0]?.id ?? "addr-manual");
  const [address, setAddress] = useState<UserAddress>(customer.addresses[0] ?? emptyAddress);
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("UPI");
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subtotal = useMemo(
    () => cart.reduce((total, item) => total + getUnitPrice(item.product.price, item.selectedUnit, item.product.variantPrices) * item.quantity, 0),
    [cart]
  );
  const promo = appliedPromo ? applyPromoCode(appliedPromo, subtotal) : null;
  const discountedSubtotal = Math.max(0, subtotal - (promo?.discount ?? 0));
  const delivery = calculateDeliveryFee(address.distanceKm, discountedSubtotal);
  const grandTotal = delivery.available ? discountedSubtotal + delivery.fee : discountedSubtotal;
  const isAddressComplete = validateAddress(address);
  const canOrder = customer.isPhoneVerified && !customer.isBlocked && isAddressComplete && delivery.available && cart.length > 0;

  async function createPaymentOrder() {
    const response = await fetch("/api/payment/razorpay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: grandTotal })
    });

    if (!response.ok) {
      throw new Error("Payment gateway is temporarily unavailable.");
    }

    return response.json();
  }

  async function placeOrder() {
    if (customer.isBlocked) {
      toast.error("This mobile number has been blocked by the store.");
      return;
    }

    if (!customer.isPhoneVerified) {
      toast.error("Please verify your phone number with OTP before ordering.");
      return;
    }

    if (!isAddressComplete) {
      toast.error("Please add the full delivery address before ordering.");
      return;
    }

    if (!delivery.available || cart.length === 0) {
      toast.error(delivery.available ? "Please add at least one cart item." : delivery.message);
      return;
    }

    setIsSubmitting(true);

    try {
      updateCustomerAddress(address);

      if (paymentMethod !== "COD") {
        const paymentOrder = await createPaymentOrder();
        toast.success(paymentOrder.gateway === "demo" ? "Demo UPI payment authorized" : "Payment order created");
      }

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: address.receiverName.trim(),
          customerPhone: address.phone.trim(),
          deliveryAddress: address,
          distanceKm: address.distanceKm,
          promoCode: appliedPromo,
          paymentMethod,
          items: cart.map((item) => ({
            productId: item.product.id,
            name: formatCartItemName(item.product.name, item.selectedUnit),
            price: getUnitPrice(item.product.price, item.selectedUnit, item.product.variantPrices),
            quantity: item.quantity
          }))
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Order could not be placed.");
      }

      addOrder(data.order);
      setPlacedOrder(data.order);
      clearCart();
      setAppliedPromo("");
      setPromoCode("");
      toast.success(t("orderPlaced"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function applyPromo() {
    const result = applyPromoCode(promoCode, subtotal);

    if (!result.valid) {
      toast.error(result.message);
      return;
    }

    setAppliedPromo(result.promo.code);
    toast.success(result.message);
  }

  async function handleSendOtp() {
    if (phone.replace(/\D/g, "").length < 10) {
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
        throw new Error(data.error ?? "OTP could not be sent.");
      }

      const code = data.provider === "demo" ? sendOtp(phone) : "";
      setAddress((current) => ({ ...current, phone: phone.replace(/\D/g, "").slice(-10) }));
      toast.success(data.provider === "demo" ? `Demo OTP sent: ${code}` : "OTP sent by Supabase Auth");
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
      setAddress((current) => ({ ...current, phone: phone.replace(/\D/g, "").slice(-10) }));
      toast.success("Phone number verified with Supabase");
    } catch (error) {
      toast.error(customer.isBlocked ? "This mobile number is blocked." : error instanceof Error ? error.message : "Invalid OTP.");
    }
  }

  return (
    <section id="cart" className="scroll-mt-24 bg-white py-14">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8">
        <div>
          <h2 className="text-3xl font-black text-ink">{t("cartTitle")}</h2>
          <div className="mt-6 overflow-hidden rounded-lg border border-black/10">
            {cart.length === 0 ? (
              <p className="p-6 text-ink/65">{t("emptyCart")}</p>
            ) : (
              <div className="divide-y divide-black/10">
                {cart.map((item) => (
                  <div key={`${item.product.id}-${item.selectedUnit}`} className="grid gap-4 p-4 sm:grid-cols-[72px_1fr_auto] sm:items-center">
                    <Image src={item.product.image_url} alt={item.product.name} width={80} height={80} className="aspect-square rounded-md object-cover" />
                    <div>
                      <h3 className="font-bold text-ink">{formatCartItemName(item.product.name, item.selectedUnit)}</h3>
                      <p className="text-sm text-ink/65">{formatCurrency(getUnitPrice(item.product.price, item.selectedUnit, item.product.variantPrices))}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          updateQuantity(item.product.id, item.selectedUnit, item.quantity - 1);
                          if (item.quantity === 1) {
                            toast.success(`${item.product.name} removed from cart`);
                          }
                        }}
                        className="rounded-md border border-black/10 p-2 hover:bg-leaf-50"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="grid h-9 min-w-10 place-items-center rounded-md bg-leaf-50 px-3 text-sm font-bold">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, item.selectedUnit, item.quantity + 1)}
                        className="rounded-md border border-black/10 p-2 hover:bg-leaf-50"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          removeFromCart(item.product.id, item.selectedUnit);
                          toast.success(`${item.product.name} removed from cart`);
                        }}
                        className="inline-flex items-center gap-2 rounded-md border border-black/10 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
                        aria-label={t("remove")}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>{t("remove")}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <section id="phone-login" className="scroll-mt-24 rounded-lg border border-black/10 bg-leaf-50 p-4">
              <h3 className="font-black text-ink">Phone OTP Login</h3>
              <div className="mt-3 space-y-3">
                <input value={phone} onChange={(event) => setPhone(event.target.value)} className="w-full rounded-md border border-black/10 bg-white px-3 py-2" placeholder="10 digit mobile number" />
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <input value={otp} onChange={(event) => setOtp(event.target.value)} className="min-w-0 rounded-md border border-black/10 bg-white px-3 py-2" placeholder="OTP" />
                  <button type="button" onClick={handleVerifyOtp} className="rounded-md bg-ink px-3 py-2 text-sm font-bold text-white hover:bg-leaf-700">
                    Verify
                  </button>
                </div>
                <button type="button" onClick={handleSendOtp} className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-bold hover:bg-leaf-100">
                  Send OTP
                </button>
                <p className={`text-sm font-semibold ${customer.isPhoneVerified ? "text-leaf-700" : "text-ink/60"}`}>
                  {customer.isBlocked ? "Blocked by admin" : customer.isPhoneVerified ? "Phone verified" : pendingOtp ? "OTP sent. Demo code is 123456." : "Phone verification required."}
                </p>
              </div>
            </section>

            <section className="rounded-lg border border-black/10 bg-leaf-50 p-4">
              <h3 className="font-black text-ink">{t("orderHistory")}</h3>
              <div className="mt-3 space-y-2">
                {customer.orderIds.map((orderId) => (
                  <button
                    key={orderId}
                    type="button"
                    onClick={() => {
                      reorder(orderId);
                      toast.success("Previous order added to cart");
                    }}
                    className="inline-flex w-full items-center justify-between rounded-md bg-white p-3 text-sm font-bold hover:bg-leaf-100"
                  >
                    {orderId}
                    <span className="inline-flex items-center gap-1 text-leaf-700">
                      <RotateCcw className="h-4 w-4" />
                      {t("reorder")}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </div>
        </div>

        <aside className="self-start rounded-lg border border-black/10 bg-leaf-50 p-5 shadow-sm">
          <h2 className="text-2xl font-black text-ink">{t("checkout")}</h2>
          <div className="mt-5 space-y-4">
            <div>
              <span className="text-sm font-bold text-ink">Saved or manual address</span>
              <select
                value={selectedAddressId}
                onChange={(event) => {
                  const id = event.target.value;
                  setSelectedAddressId(id);
                  const nextAddress = customer.addresses.find((item) => item.id === id) ?? { ...emptyAddress, id: `addr-${Date.now()}`, phone: customer.phone };
                  setAddress(nextAddress);
                }}
                className="mt-2 w-full rounded-md border border-black/10 bg-white px-3 py-2"
              >
                {customer.addresses.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}: {item.line1}
                  </option>
                ))}
                <option value="manual">Add new address manually</option>
              </select>
            </div>
            <AddressInput label="Receiver name" value={address.receiverName} onChange={(value) => setAddress((current) => ({ ...current, receiverName: value }))} />
            <AddressInput label="Mobile number" value={address.phone} onChange={(value) => setAddress((current) => ({ ...current, phone: value }))} />
            <AddressInput label="House / Flat / Street" value={address.line1} onChange={(value) => setAddress((current) => ({ ...current, line1: value }))} />
            <AddressInput label="Area / Locality" value={address.line2} onChange={(value) => setAddress((current) => ({ ...current, line2: value }))} />
            <div className="grid grid-cols-2 gap-2">
              <AddressInput label="City" value={address.city} onChange={(value) => setAddress((current) => ({ ...current, city: value }))} />
              <AddressInput label="Pincode" value={address.pincode} onChange={(value) => setAddress((current) => ({ ...current, pincode: value }))} />
            </div>
            <AddressInput label="Landmark" value={address.landmark} onChange={(value) => setAddress((current) => ({ ...current, landmark: value }))} />
            <label className="block">
              <span className="text-sm font-bold text-ink">{t("distance")}</span>
              <input type="number" min="0" step="0.1" value={address.distanceKm} onChange={(event) => setAddress((current) => ({ ...current, distanceKm: Number(event.target.value) }))} className="mt-2 w-full rounded-md border border-black/10 bg-white px-3 py-2" />
              <span className="mt-1 block text-xs text-ink/60">{t("distanceHelp")}</span>
            </label>
            <div>
              <span className="text-sm font-bold text-ink">{t("promoCode")}</span>
              <div className="mt-2 flex gap-2">
                <input value={promoCode} onChange={(event) => setPromoCode(event.target.value)} className="min-w-0 flex-1 rounded-md border border-black/10 bg-white px-3 py-2 uppercase" placeholder="TAPAS10" />
                <button type="button" onClick={applyPromo} className="rounded-md bg-ink px-3 py-2 text-sm font-bold text-white hover:bg-leaf-700">
                  {t("apply")}
                </button>
              </div>
            </div>
            <div>
              <span className="text-sm font-bold text-ink">Payment</span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(["UPI", "Card", "NetBanking", "COD"] as PaymentMethod[]).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`rounded-md border px-3 py-2 text-sm font-bold ${paymentMethod === method ? "border-leaf-600 bg-leaf-600 text-white" : "border-black/10 bg-white text-ink"}`}
                  >
                    {method === "COD" ? t("cashOnDelivery") : method}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <dl className="mt-6 space-y-3 border-y border-black/10 py-4">
            <SummaryRow label={t("subtotal")} value={formatCurrency(subtotal)} />
            <SummaryRow label={t("discount")} value={`-${formatCurrency(promo?.discount ?? 0)}`} />
            <SummaryRow label={t("deliveryFee")} value={delivery.available ? formatCurrency(delivery.fee) : "N/A"} />
            <div className="flex justify-between gap-4 text-xl font-black">
              <dt>{t("grandTotal")}</dt>
              <dd className="inline-flex items-center">
                <IndianRupee className="h-5 w-5" />
                {grandTotal}
              </dd>
            </div>
          </dl>

          <p className={`mt-4 text-sm font-semibold ${delivery.available && isAddressComplete ? "text-leaf-700" : "text-red-700"}`}>
            {!isAddressComplete ? "Full delivery address is required." : delivery.message}
          </p>
          <button
            type="button"
            onClick={placeOrder}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 font-bold text-white hover:bg-leaf-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            disabled={!canOrder || isSubmitting}
          >
            <CreditCard className="h-4 w-4" />
            {isSubmitting ? "Processing..." : paymentMethod === "COD" ? t("placeOrder") : t("payOnline")}
          </button>
          {placedOrder ? (
            <div className="mt-4 rounded-lg border border-black/10 bg-white p-4">
              <p className="font-black text-ink">Order confirmed: {placedOrder.order_id}</p>
              <p className="mt-1 text-sm text-ink/65">Invoice {placedOrder.invoice_number} is ready.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={() => downloadInvoice(placedOrder)} className="rounded-md border border-black/10 px-3 py-2 text-sm font-bold hover:bg-leaf-50">
                  Download invoice
                </button>
                <a href={buildWhatsAppOrderUrl(placedOrder)} target="_blank" rel="noreferrer" className="rounded-md bg-leaf-600 px-3 py-2 text-center text-sm font-bold text-white hover:bg-leaf-700">
                  WhatsApp confirmation
                </a>
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

function AddressInput({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-ink">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-md border border-black/10 bg-white px-3 py-2" />
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt>{label}</dt>
      <dd className="font-bold">{value}</dd>
    </div>
  );
}

function validateAddress(address: UserAddress) {
  return Boolean(
    address.receiverName.trim() &&
      address.phone.replace(/\D/g, "").length >= 10 &&
      address.line1.trim() &&
      address.line2.trim() &&
      address.city.trim() &&
      address.state.trim() &&
      /^\d{6}$/.test(address.pincode.trim()) &&
      address.landmark.trim() &&
      Number.isFinite(address.distanceKm)
  );
}
