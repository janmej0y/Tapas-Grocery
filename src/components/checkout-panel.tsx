"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CreditCard, IndianRupee, LocateFixed, MapPin, Minus, Plus, RotateCcw, Trash2 } from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";
import { useLanguage } from "@/components/language-provider";
import { useStore } from "@/components/store-provider";
import { calculateDeliveryFee } from "@/lib/delivery";
import { formatCurrency } from "@/lib/format";
import { buildWhatsAppOrderUrl, downloadInvoice } from "@/lib/invoice";
import { calculateDistanceKm, SHOP_LOCATION } from "@/lib/location";
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

type ReverseAddress = Pick<UserAddress, "line1" | "line2" | "city" | "state" | "pincode" | "landmark">;

export function CheckoutPanel() {
  const { productName, t } = useLanguage();
  const {
    addOrder,
    blockedPhones,
    cart,
    clearCart,
    customer,
    removeFromCart,
    reorder,
    updateCustomerAddress,
    updateQuantity,
  } = useStore();
  const [selectedAddressId, setSelectedAddressId] = useState(customer.addresses[0]?.id ?? "manual");
  const [address, setAddress] = useState<UserAddress>(customer.addresses[0] ?? emptyAddress);
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("COD");
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [isLocating, setIsLocating] = useState(false);
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
  const normalizedPhone = normalizePhone(address.phone);
  const isBlockedPhone = Boolean(normalizedPhone && blockedPhones.includes(normalizedPhone));
  const canOrder = !isBlockedPhone && isAddressComplete && delivery.available && cart.length > 0;

  async function placeOrder() {
    if (isBlockedPhone) {
      toast.error("This mobile number has been blocked by the store.");
      return;
    }

    if (!isValidMobile(address.phone)) {
      toast.error("Please enter a valid 10 digit mobile number before ordering.");
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

    if (paymentMethod !== "COD") {
      toast.error(t("onlinePaymentDisabled"));
      return;
    }

    const unavailableItem = cart.find((item) => item.quantity > item.product.stock || item.product.stock <= 0);
    if (unavailableItem) {
      toast.error(`${unavailableItem.product.name} is out of stock or below requested quantity.`);
      return;
    }

    setIsSubmitting(true);

    try {
      updateCustomerAddress(address);

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
            selectedUnit: item.selectedUnit,
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

  async function fillAddressFromCoordinates(latitude: number, longitude: number) {
    try {
      const response = await fetch(`/api/location/reverse?lat=${latitude}&lon=${longitude}`);
      const data = (await response.json()) as Partial<ReverseAddress> & { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Address lookup failed.");
      }

      setAddress((current) => ({
        ...current,
        line1: data.line1 || current.line1,
        line2: data.line2 || current.line2,
        city: data.city || current.city,
        state: data.state || current.state || "West Bengal",
        pincode: data.pincode || current.pincode,
        landmark: data.landmark || current.landmark
      }));
      toast.success("Address filled from map location. You can edit it before ordering.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Address lookup failed. Please edit manually.");
    }
  }

  function detectLocation() {
    if (!navigator.geolocation) {
      toast.error("Location detection is not supported on this device.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const nextLocation = {
          latitude: Number(position.coords.latitude.toFixed(7)),
          longitude: Number(position.coords.longitude.toFixed(7))
        };
        setAddress((current) => ({
          ...current,
          ...nextLocation,
          distanceKm: calculateDistanceKm(nextLocation),
          landmark: current.landmark || "Detected from current location"
        }));
        await fillAddressFromCoordinates(nextLocation.latitude, nextLocation.longitude);
        setIsLocating(false);
        toast.success("Location detected");
      },
      () => {
        setIsLocating(false);
        toast.error("Could not detect location. Please allow location access or enter it manually.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function updateManualLocation(key: "latitude" | "longitude", value: string) {
    const nextValue = Number(value);

    setAddress((current) => {
      const nextAddress = {
        ...current,
        [key]: Number.isFinite(nextValue) ? nextValue : undefined
      };

      if (typeof nextAddress.latitude === "number" && typeof nextAddress.longitude === "number") {
        nextAddress.distanceKm = calculateDistanceKm({
          latitude: nextAddress.latitude,
          longitude: nextAddress.longitude
        });
      }

      return nextAddress;
    });
  }

  async function fillCurrentMapAddress() {
    if (typeof address.latitude !== "number" || typeof address.longitude !== "number") {
      toast.error("Choose current location or enter latitude and longitude first.");
      return;
    }

    setIsLocating(true);
    await fillAddressFromCoordinates(address.latitude, address.longitude);
    setIsLocating(false);
  }

  return (
    <section id="cart" className="scroll-mt-24 bg-white py-8 sm:py-10">
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
                    <Image src={item.product.image_url} alt={item.product.name} width={80} height={80} className="aspect-square rounded-md bg-white object-contain p-1" />
                    <div>
                      <h3 className="font-bold text-ink">{formatCartItemName(productName(item.product.name), item.selectedUnit)}</h3>
                      <p className="text-sm text-ink/65">{formatCurrency(getUnitPrice(item.product.price, item.selectedUnit, item.product.variantPrices))}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          updateQuantity(item.product.id, item.selectedUnit, item.quantity - 1);
                          if (item.quantity === 1) {
                            toast.success(`${productName(item.product.name)} removed from cart`);
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
                          toast.success(`${productName(item.product.name)} removed from cart`);
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
            <AddressInput label="Mobile number" value={address.phone} onChange={(value) => setAddress((current) => ({ ...current, phone: value }))} inputMode="tel" />
            <AddressInput label="House / Flat / Street" value={address.line1} onChange={(value) => setAddress((current) => ({ ...current, line1: value }))} />
            <AddressInput label="Area / Locality" value={address.line2} onChange={(value) => setAddress((current) => ({ ...current, line2: value }))} />
            <div className="grid grid-cols-2 gap-2">
              <AddressInput label="City" value={address.city} onChange={(value) => setAddress((current) => ({ ...current, city: value }))} />
              <AddressInput label="Pincode" value={address.pincode} onChange={(value) => setAddress((current) => ({ ...current, pincode: value }))} />
            </div>
            <AddressInput label="Landmark" value={address.landmark} onChange={(value) => setAddress((current) => ({ ...current, landmark: value }))} />
            <div className="rounded-lg border border-black/10 bg-white p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="inline-flex items-center gap-2 text-sm font-black text-ink">
                    <MapPin className="h-4 w-4 text-leaf-700" />
                    Delivery location
                  </p>
                  <p className="mt-1 text-xs text-ink/60">Detect location to auto-fill the address, then edit anything if needed.</p>
                </div>
                <button
                  type="button"
                  onClick={detectLocation}
                  className="inline-flex items-center gap-2 rounded-md bg-leaf-600 px-3 py-2 text-sm font-bold text-white hover:bg-leaf-700 disabled:bg-gray-300"
                  disabled={isLocating}
                >
                  <LocateFixed className="h-4 w-4" />
                  {isLocating ? "Detecting" : "Use current"}
                </button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-xs font-bold text-ink/70">Latitude</span>
                  <input
                    type="number"
                    value={address.latitude ?? ""}
                    onChange={(event) => updateManualLocation("latitude", event.target.value)}
                    className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
                    placeholder="22.5726"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-ink/70">Longitude</span>
                  <input
                    type="number"
                    value={address.longitude ?? ""}
                    onChange={(event) => updateManualLocation("longitude", event.target.value)}
                    className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
                    placeholder="88.3639"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={fillCurrentMapAddress}
                disabled={isLocating}
                className="mt-3 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-bold hover:bg-leaf-50 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-ink/45"
              >
                Fill address from selected map location
              </button>
              <div className="mt-3 overflow-hidden rounded-lg border border-black/10">
                <iframe
                  title="Delivery location map"
                  src={googleMapUrl(address.latitude, address.longitude)}
                  className="h-56 w-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-ink/65">
                <span>Shop: {SHOP_LOCATION.latitude}, {SHOP_LOCATION.longitude}</span>
                <a href={googleMapsExternalUrl(address.latitude, address.longitude)} target="_blank" rel="noreferrer" className="text-leaf-700 hover:underline">
                  Open in Google Maps
                </a>
              </div>
            </div>
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
              <p className="mt-1 rounded-md bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{t("codOnlyNotice")}</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(["UPI", "Card", "NetBanking", "COD"] as PaymentMethod[]).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => {
                      if (method !== "COD") {
                        toast.error(t("onlinePaymentDisabled"));
                        return;
                      }
                      setPaymentMethod(method);
                    }}
                    className={`rounded-md border px-3 py-2 text-sm font-bold ${
                      paymentMethod === method
                        ? "border-leaf-600 bg-leaf-600 text-white"
                        : method === "COD"
                          ? "border-black/10 bg-white text-ink"
                          : "border-black/10 bg-gray-100 text-ink/45"
                    }`}
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
            {!isAddressComplete ? "Full delivery address and valid mobile number are required." : delivery.message}
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
                <Link href={`/orders/${placedOrder.order_id}`} className="rounded-md bg-ink px-3 py-2 text-center text-sm font-bold text-white hover:bg-leaf-700 sm:col-span-2">
                  Track order
                </Link>
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

function AddressInput({ inputMode, label, onChange, value }: { inputMode?: "text" | "tel"; label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-ink">{label}</span>
      <input inputMode={inputMode} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-md border border-black/10 bg-white px-3 py-2" />
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

function googleMapUrl(latitude?: number, longitude?: number) {
  const query = typeof latitude === "number" && typeof longitude === "number" ? `${latitude},${longitude}` : `${SHOP_LOCATION.latitude},${SHOP_LOCATION.longitude}`;
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`;
}

function googleMapsExternalUrl(latitude?: number, longitude?: number) {
  const query = typeof latitude === "number" && typeof longitude === "number" ? `${latitude},${longitude}` : `${SHOP_LOCATION.latitude},${SHOP_LOCATION.longitude}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function validateAddress(address: UserAddress) {
  return Boolean(
    address.receiverName.trim() &&
      isValidMobile(address.phone) &&
      address.line1.trim() &&
      address.line2.trim() &&
      address.city.trim() &&
      address.state.trim() &&
      /^\d{6}$/.test(address.pincode.trim()) &&
      address.landmark.trim() &&
      Number.isFinite(address.distanceKm)
  );
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "").slice(-10);
}

function isValidMobile(phone: string) {
  return /^[6-9]\d{9}$/.test(normalizePhone(phone));
}
