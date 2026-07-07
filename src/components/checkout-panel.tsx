"use client";

import { useEffect, useMemo, useState } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  BellRing,
  Bookmark,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Home,
  Info,
  LocateFixed,
  Lock,
  MapPin,
  Minus,
  Navigation,
  PackageCheck,
  Plus,
  Route,
  ShieldCheck,
  ShoppingCart,
  Trash2,
  Truck,
  WalletCards,
  X
} from "lucide-react";
import toast from "react-hot-toast";
import { FreeDeliveryProgress } from "@/components/checkout/free-delivery-progress";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SavedChip } from "@/components/ui/saved-chip";
import { useLanguage } from "@/components/language-provider";
import { useStore } from "@/components/store-provider";
import { subscribeToOrderNotifications } from "@/lib/client-notifications";
import { cn } from "@/lib/cn";
import { calculateDeliveryFee } from "@/lib/delivery";
import { formatCurrency } from "@/lib/format";
import { buildWhatsAppOrderUrl, downloadInvoice } from "@/lib/invoice";
import { calculateDistanceKm, SHOP_LOCATION } from "@/lib/location";
import { applyPromoCode } from "@/lib/promos";
import type { Order, Product, UserAddress } from "@/lib/types";
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
const SAVED_CHECKOUT_ADDRESS_KEY = "tapas-grocery-checkout-address";

const cardMotion = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, ease: "easeOut" }
} as const;

export function CheckoutPanel() {
  const { productName, t } = useLanguage();
  const {
    addOrder,
    addToCart,
    blockedPhones,
    cart,
    clearCart,
    customer,
    products,
    removeFromCart,
    updateCustomerAddress,
    updateQuantity,
    user,
    logoutCustomer
  } = useStore();
  const router = useRouter();
  const [showRecruiterModal, setShowRecruiterModal] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState(customer.addresses[0]?.id ?? "manual");
  const [address, setAddress] = useState<UserAddress>(customer.addresses[0] ?? emptyAddress);
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("COD");
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEnablingNotifications, setIsEnablingNotifications] = useState(false);
  const [isAddressPickerOpen, setIsAddressPickerOpen] = useState(false);
  const [addressSaveState, setAddressSaveState] = useState<"idle" | "saved">("idle");

  const subtotal = useMemo(
    () => cart.reduce((total, item) => total + getUnitPrice(item.product.price, item.selectedUnit, item.product.variantPrices) * item.quantity, 0),
    [cart]
  );
  const promo = appliedPromo ? applyPromoCode(appliedPromo, subtotal) : null;
  const discountedSubtotal = Math.max(0, subtotal - (promo?.discount ?? 0));
  const delivery = calculateDeliveryFee(address.distanceKm, discountedSubtotal);
  const grandTotal = delivery.available ? discountedSubtotal + delivery.fee : discountedSubtotal;
  const packagingCharge = 0;
  const savings = promo?.discount ?? 0;
  const isAddressComplete = validateAddress(address);
  const normalizedPhone = normalizePhone(address.phone);
  const isBlockedPhone = Boolean(normalizedPhone && blockedPhones.includes(normalizedPhone));
  const canOrder = !isBlockedPhone && isAddressComplete && delivery.available && cart.length > 0;
  const addressSummary = formatAddress(address);
  const primaryActionLabel = isSubmitting ? "Processing..." : paymentMethod === "COD" ? t("placeOrder") : t("payOnline");
  const recommendedProducts = useMemo(() => {
    const cartProductIds = new Set(cart.map((item) => item.product.id));
    return products.filter((product) => product.stock > 0 && !cartProductIds.has(product.id)).slice(0, 8);
  }, [cart, products]);

  useEffect(() => {
    const savedAddress = readSavedCheckoutAddress();

    if (savedAddress) {
      setAddress(savedAddress);
      setSelectedAddressId(savedAddress.id);
      return;
    }

    const firstSavedAddress = customer.addresses[0];
    if (firstSavedAddress) {
      setAddress(firstSavedAddress);
      setSelectedAddressId(firstSavedAddress.id);
    }
  }, [customer.addresses]);

  useEffect(() => {
    window.localStorage.setItem(SAVED_CHECKOUT_ADDRESS_KEY, JSON.stringify(address));
    setAddressSaveState("idle");
  }, [address]);

  async function placeOrder() {
    if (user?.email === "recruiter@example.com") {
      setShowRecruiterModal(true);
      return;
    }

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

  async function enableCustomerNotifications(order: Order) {
    setIsEnablingNotifications(true);

    try {
      await subscribeToOrderNotifications(order.customer_phone, "customer");
      toast.success("Order updates enabled on this device");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Notification setup failed.");
    } finally {
      setIsEnablingNotifications(false);
    }
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

  function saveAddressForNextOrder() {
    const addressToSave = {
      ...address,
      id: address.id === "addr-manual" || address.id === "manual" ? `addr-${Date.now()}` : address.id
    };

    setAddress(addressToSave);
    setSelectedAddressId(addressToSave.id);
    updateCustomerAddress(addressToSave);
    window.localStorage.setItem(SAVED_CHECKOUT_ADDRESS_KEY, JSON.stringify(addressToSave));
    setAddressSaveState("saved");
    toast.success("Address saved for next time");
  }

  return (
    <section id="cart" className="scroll-mt-24 bg-[#F7F8FA] pb-32 pt-8 md:pb-12 md:pt-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div {...cardMotion} className="mb-8">
          <h1 className="text-3xl font-black tracking-normal text-ink sm:text-4xl">My Cart</h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">Review your items and proceed to checkout.</p>
          <CheckoutProgress cartReady={cart.length > 0} addressReady={isAddressComplete} paymentReady={canOrder} />
        </motion.div>

        <div className="grid gap-6 md:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.95fr)] lg:gap-8">
          <div className="min-w-0 space-y-6 md:col-start-2 md:row-start-1">
            <section aria-labelledby="cart-items-heading">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 id="cart-items-heading" className="text-lg font-black text-ink">
                    Items in your cart ({cart.length})
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">Fresh picks packed for your doorstep.</p>
                </div>
                {cart.length > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      clearCart();
                      toast.success("Cart cleared");
                    }}
                    className="rounded-full px-3 text-sm text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove all
                  </Button>
                ) : null}
              </div>

              {cart.length === 0 ? (
                <motion.div {...cardMotion} className="space-y-6">
                  <div className="rounded-2xl border border-[#ECECEC] bg-white p-8 text-center shadow-sm flex flex-col items-center">
                    <div className="relative h-48 w-48 mb-4">
                      <Image
                        src="/images/empty-cart.png"
                        alt="Empty Cart"
                        fill
                        className="object-contain"
                      />
                    </div>
                    <h3 className="text-xl font-black text-ink">{t("emptyCart")}</h3>
                    <p className="mt-2 max-w-sm text-sm font-semibold text-slate-500">
                      Your cart is empty. Add groceries from the store to start your order.
                    </p>
                    <Link
                      href="/#categories"
                      className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#15803d] px-5 py-3 text-sm font-black text-white shadow-soft transition hover:bg-emerald-800 active:scale-[0.98]"
                    >
                      Continue shopping
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-ink">Popular items to add</h3>
                    <p className="mt-1 text-sm font-semibold text-slate-500">Customers frequently buy these fresh essentials.</p>
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {products.slice(0, 4).map((product) => {
                        const unit = product.unitOptions[0] ?? "1";
                        const price = getUnitPrice(product.price, unit, product.variantPrices);
                        return (
                          <div key={product.id} className="premium-card rounded-2xl p-3 flex flex-col justify-between hover:border-emerald-200 hover:shadow-soft transition-all duration-150">
                            <div className="relative h-24 w-full bg-slate-50 rounded-xl overflow-hidden mb-2">
                              <Image src={product.image_url} alt={product.name} fill className="object-contain p-2" />
                            </div>
                            <h4 className="text-xs font-black text-ink line-clamp-2 min-h-8">{productName(product.name)}</h4>
                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-xs font-black text-[#15803d]">{formatCurrency(price)}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  addToCart(product, unit, 1);
                                  toast.success(`${productName(product.name)} added`);
                                }}
                                className="h-7 w-7 rounded-full bg-emerald-50 text-[#15803d] flex items-center justify-center hover:bg-emerald-100 font-bold text-xs"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item, index) => {
                    const unitPrice = getUnitPrice(item.product.price, item.selectedUnit, item.product.variantPrices);
                    const lineTotal = unitPrice * item.quantity;
                    const hasDeal = hasDealBadge(item.product);

                    return (
                      <motion.article
                        key={`${item.product.id}-${item.selectedUnit}`}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.24, delay: index * 0.035, ease: "easeOut" }}
                        whileHover={{ y: -2 }}
                        className="grid gap-4 rounded-2xl border border-[#ECECEC] bg-white p-4 shadow-sm sm:grid-cols-[96px_minmax(0,1fr)_auto] sm:items-center"
                      >
                        <div className="relative h-24 w-24 overflow-hidden rounded-2xl bg-slate-50">
                          <Image src={item.product.image_url} alt={item.product.name} fill sizes="96px" className="object-contain p-2" />
                        </div>

                        <div className="min-w-0">
                          <h3 className="truncate text-base font-black text-ink">{formatCartItemName(productName(item.product.name), item.selectedUnit)}</h3>
                          <p className="mt-1 text-sm font-semibold text-slate-500">{item.selectedUnit}</p>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <Badge variant="fresh">Fresh</Badge>
                            {hasDeal ? <Badge variant="deal">Deal</Badge> : null}
                            <button
                              type="button"
                              onClick={() => toast("Save for later is not available yet.")}
                              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold text-slate-500 hover:bg-slate-100"
                            >
                              <Bookmark className="h-3.5 w-3.5" />
                              Save for later
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                          <div className="inline-flex h-10 items-center overflow-hidden rounded-full border border-slate-200 bg-white">
                            <motion.button
                              whileTap={{ scale: 0.92 }}
                              type="button"
                              onClick={() => {
                                updateQuantity(item.product.id, item.selectedUnit, item.quantity - 1);
                                if (item.quantity === 1) {
                                  toast.success(`${productName(item.product.name)} removed from cart`);
                                }
                              }}
                              className="grid h-10 w-10 place-items-center text-ink hover:bg-slate-100"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-4 w-4" />
                            </motion.button>
                            <span className="grid h-10 min-w-10 place-items-center px-2 text-sm font-black text-ink">{item.quantity}</span>
                            <motion.button
                              whileTap={{ scale: 0.92 }}
                              type="button"
                              onClick={() => updateQuantity(item.product.id, item.selectedUnit, item.quantity + 1)}
                              className="grid h-10 w-10 place-items-center text-ink hover:bg-slate-100"
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-4 w-4" />
                            </motion.button>
                          </div>

                          <p className="min-w-16 text-right text-lg font-black text-ink">{formatCurrency(lineTotal)}</p>

                          <motion.button
                            whileTap={{ scale: 0.94 }}
                            type="button"
                            onClick={() => {
                              removeFromCart(item.product.id, item.selectedUnit);
                              toast.success(`${productName(item.product.name)} removed from cart`);
                            }}
                            className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 text-slate-600 hover:border-red-100 hover:bg-red-50 hover:text-red-700"
                            aria-label={t("remove")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </motion.button>
                        </div>
                      </motion.article>
                    );
                  })}
                </div>
              )}
            </section>

            <FreeDeliveryProgress cartTotal={discountedSubtotal} distanceKm={address.distanceKm} />

            <section aria-labelledby="recommended-heading">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 id="recommended-heading" className="text-lg font-black text-ink">
                    Frequently bought together
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">Quick add-ons for the same delivery run.</p>
                </div>
                <Link href="/#categories" className="rounded-full px-3 py-2 text-sm font-bold text-[#15803d] hover:bg-emerald-50">
                  See more
                </Link>
              </div>
              <div className="-mx-4 overflow-x-auto px-4 pb-2">
                <div className="flex gap-3">
                  {recommendedProducts.length > 0 ? (
                    recommendedProducts.map((product) => {
                      const unit = getDefaultUnit(product);
                      const price = getUnitPrice(product.price, unit, product.variantPrices);

                      return (
                        <motion.article
                          key={product.id}
                          whileHover={{ y: -3 }}
                          className="w-[178px] shrink-0 rounded-2xl border border-[#ECECEC] bg-white p-3 shadow-sm sm:basis-[calc((100%-36px)/4)]"
                        >
                          <div className="relative h-20 overflow-hidden rounded-xl bg-slate-50">
                            <Image src={product.image_url} alt={product.name} fill sizes="180px" className="object-contain p-2" />
                          </div>
                          <h3 className="mt-3 line-clamp-2 min-h-10 text-sm font-black leading-5 text-ink">{productName(product.name)}</h3>
                          <p className="mt-1 text-xs font-semibold text-slate-500">{unit}</p>
                          <div className="mt-3 flex items-center justify-between gap-2">
                            <span className="text-sm font-black text-[#15803d]">{formatCurrency(price)}</span>
                            <motion.button
                              whileTap={{ scale: 0.92 }}
                              type="button"
                              onClick={() => {
                                addToCart(product, unit, 1);
                                toast.success(`${productName(product.name)} added to cart`);
                              }}
                              className="grid h-9 w-9 place-items-center rounded-full border border-emerald-100 bg-emerald-50 text-[#15803d] hover:bg-emerald-100"
                              aria-label={`Add ${productName(product.name)} to cart`}
                            >
                              <Plus className="h-4 w-4" />
                            </motion.button>
                          </div>
                        </motion.article>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl border border-[#ECECEC] bg-white p-5 text-sm font-semibold text-slate-500 shadow-sm">
                      Recommendations will appear after more products are available.
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-5 self-start md:contents">
            <motion.section {...cardMotion} className="rounded-2xl border border-[#ECECEC] bg-white p-4 shadow-sm sm:p-5 md:sticky md:top-24 md:col-start-1 md:row-start-1 md:self-start">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-ink">Delivery Details</h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">Address, map and receiver info.</p>
                </div>
                <div className="grid h-11 w-11 place-items-center rounded-full bg-emerald-50 text-[#15803d]">
                  <Truck className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-[#ECECEC] bg-[#F7F8FA] p-3">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#15803d] text-white shadow-sm">
                    <Home className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-black text-ink">{address.label}</p>
                      {(address.id !== "addr-manual" && address.id !== "manual") ? (
                        <SavedChip label="Saved Address" />
                      ) : null}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-slate-500">{addressSummary}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddressPickerOpen((current) => !current)}
                    className="rounded-full px-3 py-1.5 text-xs font-black text-[#15803d] hover:bg-emerald-50"
                  >
                    Change
                  </button>
                </div>
                {isAddressPickerOpen ? (
                  <Select
                    id="address-select"
                    value={selectedAddressId}
                    onChange={(event) => {
                      const id = event.target.value;
                      setSelectedAddressId(id);
                      const nextAddress = customer.addresses.find((item) => item.id === id) ?? { ...emptyAddress, id: `addr-${Date.now()}`, phone: customer.phone };
                      setAddress(nextAddress);
                    }}
                    className="mt-3 rounded-xl border-[#ECECEC] bg-white"
                  >
                    {customer.addresses.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}: {item.line1}
                      </option>
                    ))}
                    <option value="manual">Add new address manually</option>
                  </Select>
                ) : null}
              </div>

              <p className="mt-3 rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-bold leading-5 text-[#15803d]">
                Saved addresses are remembered on this device and reused automatically next time.
              </p>

              <div className="relative mt-4 overflow-hidden rounded-2xl border border-[#ECECEC] bg-slate-100">
                <iframe
                  title="Delivery location map"
                  src={googleMapUrl(address.latitude, address.longitude)}
                  className="h-[240px] md:h-[320px] w-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
                <div className="pointer-events-none absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white/95 px-3 py-2 text-xs font-black text-[#15803d] shadow-sm backdrop-blur">
                  <Route className="h-4 w-4" />
                  {Number.isFinite(address.distanceKm) ? `${address.distanceKm.toFixed(2)} km` : "Add distance"}
                </div>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  type="button"
                  onClick={detectLocation}
                  className="absolute right-3 top-3 inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-2 text-xs font-black text-ink shadow-sm backdrop-blur hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-slate-400"
                  disabled={isLocating}
                >
                  <LocateFixed className="h-4 w-4 text-[#15803d]" />
                  {isLocating ? "Detecting" : "Use current"}
                </motion.button>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-500">
                <span>Store: {SHOP_LOCATION.latitude}, {SHOP_LOCATION.longitude}</span>
                <a href={googleMapsExternalUrl(address.latitude, address.longitude)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-[#15803d] hover:underline">
                  Open map
                  <Navigation className="h-3.5 w-3.5" />
                </a>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <AddressInput label="Latitude" value={address.latitude?.toString() ?? ""} onChange={(value) => updateManualLocation("latitude", value)} inputMode="decimal" placeholder="23.4576" />
                <AddressInput label="Longitude" value={address.longitude?.toString() ?? ""} onChange={(value) => updateManualLocation("longitude", value)} inputMode="decimal" placeholder="86.1513" />
                <AddressInput
                  label={t("distance")}
                  value={address.distanceKm.toString()}
                  onChange={(value) => setAddress((current) => ({ ...current, distanceKm: Number(value) }))}
                  inputMode="decimal"
                  placeholder="0.3"
                />
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={fillCurrentMapAddress}
                  disabled={isLocating}
                  className="rounded-full border-[#ECECEC] bg-white hover:bg-emerald-50"
                >
                  <MapPin className="h-4 w-4 text-[#15803d]" />
                  Fill from map
                </Button>
                <Button
                  type="button"
                  onClick={saveAddressForNextOrder}
                  className="rounded-full bg-[#15803d] hover:bg-emerald-800"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {addressSaveState === "saved" ? "Saved" : "Save address"}
                </Button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <AddressInput label="Receiver name" value={address.receiverName} onChange={(value) => setAddress((current) => ({ ...current, receiverName: value }))} placeholder="Full name" />
                <AddressInput label="Mobile number" value={address.phone} onChange={(value) => setAddress((current) => ({ ...current, phone: value }))} inputMode="tel" placeholder="10 digit mobile" />
                <AddressInput label="House / Flat / Street" value={address.line1} onChange={(value) => setAddress((current) => ({ ...current, line1: value }))} className="sm:col-span-2" placeholder="House, flat, street" />
                <AddressInput label="Area / Locality" value={address.line2} onChange={(value) => setAddress((current) => ({ ...current, line2: value }))} placeholder="Area" />
                <AddressInput label="City" value={address.city} onChange={(value) => setAddress((current) => ({ ...current, city: value }))} placeholder="City" />
                <AddressInput label="Pincode" value={address.pincode} onChange={(value) => setAddress((current) => ({ ...current, pincode: value }))} inputMode="numeric" placeholder="6 digits" />
              </div>

              <label className="mt-3 block">
                <span className="text-sm font-black text-ink">Delivery instructions / landmark</span>
                <textarea
                  value={address.landmark}
                  onChange={(event) => setAddress((current) => ({ ...current, landmark: event.target.value }))}
                  className="mt-2 min-h-24 w-full resize-y rounded-2xl border border-[#ECECEC] bg-white px-3 py-3 text-sm font-semibold text-ink shadow-sm outline-none transition-colors focus:border-[#15803d]"
                  placeholder="E.g. Leave at the door, call before delivery..."
                />
              </label>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <ServiceChip icon={<PackageCheck className="h-4 w-4" />} label="Doorstep Delivery" />
                <ServiceChip icon={<ShieldCheck className="h-4 w-4" />} label="Contactless Delivery" />
                <ServiceChip icon={<Navigation className="h-4 w-4" />} label="Live Order Tracking" />
              </div>
            </motion.section>

            <motion.section {...cardMotion} transition={{ duration: 0.28, delay: 0.08, ease: "easeOut" }} className="rounded-2xl border border-[#ECECEC] bg-white p-4 shadow-sm sm:p-5 md:col-start-2 md:row-start-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-ink">Bill Details</h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">{cart.length} items in this order.</p>
                </div>
                <button type="button" className="rounded-full px-3 py-1.5 text-xs font-black text-[#15803d] hover:bg-emerald-50">
                  View details
                </button>
              </div>

              <div className="mt-5">
                <span className="text-sm font-black text-ink">{t("promoCode")}</span>
                <div className="mt-2 flex gap-2">
                  <Input value={promoCode} onChange={(event) => setPromoCode(event.target.value)} className="min-w-0 flex-1 rounded-full border-[#ECECEC] uppercase shadow-sm" placeholder="TAPAS10" />
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    type="button"
                    onClick={applyPromo}
                    className="rounded-full bg-ink px-4 py-2 text-sm font-black text-white hover:bg-[#15803d]"
                  >
                    {t("apply")}
                  </motion.button>
                </div>
              </div>

              <div className="mt-5">
                <span className="text-sm font-black text-ink">Payment</span>
                <p className="mt-2 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-bold leading-5 text-amber-800">{t("codOnlyNotice")}</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {(["UPI", "Card", "NetBanking", "COD"] as PaymentMethod[]).map((method) => (
                    <motion.button
                      key={method}
                      whileTap={{ scale: 0.96 }}
                      type="button"
                      onClick={() => {
                        if (method !== "COD") {
                          toast.error(t("onlinePaymentDisabled"));
                          return;
                        }
                        setPaymentMethod(method);
                      }}
                      className={cn(
                        "rounded-full border px-3 py-2 text-sm font-black",
                        paymentMethod === method
                          ? "border-[#15803d] bg-[#15803d] text-white"
                          : method === "COD"
                            ? "border-[#ECECEC] bg-white text-ink hover:bg-emerald-50"
                            : "border-[#ECECEC] bg-slate-100 text-slate-400"
                      )}
                    >
                      {method === "COD" ? t("cashOnDelivery") : method}
                    </motion.button>
                  ))}
                </div>
              </div>

              <dl className="mt-5 space-y-3 text-sm font-semibold text-slate-600">
                <SummaryRow label="Cart Value" value={formatCurrency(subtotal)} />
                <SummaryRow label="Delivery Charge" value={delivery.available ? formatCurrency(delivery.fee) : "N/A"} />
                <SummaryRow label="Packaging Charge" value={formatCurrency(packagingCharge)} />
                <SummaryRow label={t("discount")} value={`-${formatCurrency(savings)}`} valueClassName="text-[#15803d]" />
              </dl>

              <div className="my-5 h-px border-t border-dashed border-slate-200" />

              <div className="rounded-2xl bg-emerald-50 px-3 py-3 text-sm font-black text-[#15803d]">
                {savings > 0 ? `You saved ${formatCurrency(savings)} on this order` : "Apply a promo code to unlock savings on this order."}
              </div>

              <div className="mt-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase text-slate-400">To pay</p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">{delivery.available && isAddressComplete ? delivery.message : "Complete address details to continue."}</p>
                </div>
                <p className="text-3xl font-black tracking-normal text-[#15803d]">{formatCurrency(grandTotal)}</p>
              </div>

              <p className={cn("mt-4 text-sm font-bold", delivery.available && isAddressComplete ? "text-[#15803d]" : "text-red-700")}>
                {!isAddressComplete ? "Full delivery address and valid mobile number are required." : delivery.message}
              </p>

              <motion.button
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={placeOrder}
                className="mt-5 hidden w-full items-center justify-center gap-2 rounded-full bg-[#15803d] px-4 py-3.5 text-base font-black text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 md:inline-flex"
                disabled={!canOrder || isSubmitting}
              >
                <CreditCard className="h-5 w-5" />
                {primaryActionLabel}
                <ChevronRight className="h-5 w-5" />
              </motion.button>

              {placedOrder ? (
                <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <p className="font-black text-ink">Order confirmed: {placedOrder.order_id}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-600">Invoice {placedOrder.invoice_number} is ready.</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <Button type="button" variant="secondary" onClick={() => downloadInvoice(placedOrder)} className="rounded-full border-emerald-100 bg-white hover:bg-emerald-50">
                      Download invoice
                    </Button>
                    <a href={buildWhatsAppOrderUrl(placedOrder)} target="_blank" rel="noreferrer" className="rounded-full bg-[#15803d] px-3 py-2 text-center text-sm font-black text-white hover:bg-emerald-800">
                      WhatsApp confirmation
                    </a>
                    <Link href={`/orders/${placedOrder.order_id}`} className="rounded-full bg-ink px-3 py-2 text-center text-sm font-black text-white hover:bg-[#15803d] sm:col-span-2">
                      Track order
                    </Link>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => enableCustomerNotifications(placedOrder)}
                      disabled={isEnablingNotifications}
                      className="rounded-full border-emerald-100 bg-white text-[#15803d] hover:bg-emerald-50 sm:col-span-2"
                    >
                      <BellRing className="h-4 w-4" />
                      {isEnablingNotifications ? "Enabling..." : "Enable order updates"}
                    </Button>
                  </div>
                </div>
              ) : null}
            </motion.section>
          </aside>
        </div>
      </div>

      {!placedOrder ? (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[#ECECEC] bg-white/95 px-4 py-3 shadow-[0_-18px_40px_rgba(15,23,42,0.10)] backdrop-blur md:hidden">
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase text-slate-400">To pay</p>
              <p className="truncate text-xl font-black text-[#15803d]">{formatCurrency(grandTotal)}</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={placeOrder}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#15803d] px-4 py-3 text-sm font-black text-white shadow-sm disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
              disabled={!canOrder || isSubmitting}
            >
              {primaryActionLabel}
              <ChevronRight className="h-4 w-4" />
            </motion.button>
          </div>
        </div>
      ) : null}

      <AnimatePresence>
        {showRecruiterModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRecruiterModal(false)}
              className="absolute inset-0 bg-black/45 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 15 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-white p-6 shadow-soft text-center"
            >
              <button
                onClick={() => setShowRecruiterModal(false)}
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-slate-500 hover:bg-black/10 transition active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-500">
                <Lock className="h-7 w-7 animate-bounce" />
              </div>

              <h2 className="mt-4 text-xl font-black text-ink">Demo Account Access</h2>
              <p className="mt-2 text-sm font-semibold text-slate-500 leading-relaxed">
                You have the permission to view. You can't order. You have to login with a customer account to order.
              </p>

              <div className="mt-6 flex flex-col gap-2">
                <button
                  onClick={async () => {
                    const supabase = createSupabaseBrowserClient();
                    await supabase?.auth.signOut();
                    logoutCustomer();
                    setShowRecruiterModal(false);
                    router.push("/login");
                  }}
                  className="w-full rounded-full bg-[#15803d] px-4 py-3 font-bold text-white shadow-sm hover:bg-emerald-800 active:scale-[0.98]"
                >
                  Login with Customer Account
                </button>
                <button
                  onClick={() => setShowRecruiterModal(false)}
                  className="w-full rounded-full border border-slate-200 bg-white px-4 py-3 font-bold text-ink hover:bg-slate-50 active:scale-[0.98]"
                >
                  Continue Viewing
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}

function CheckoutProgress({ addressReady, cartReady, paymentReady }: { addressReady: boolean; cartReady: boolean; paymentReady: boolean }) {
  const steps = [
    { title: "Cart", text: "Review items", ready: cartReady, icon: ShoppingCart },
    { title: "Address", text: "Delivery details", ready: addressReady, icon: MapPin },
    { title: "Payment", text: "Complete order", ready: paymentReady, icon: WalletCards }
  ];

  return (
    <div className="mt-6 flex items-center gap-3 overflow-x-auto pb-1">
      {steps.map((step, index) => {
        const Icon = step.icon;
        return (
          <div key={step.title} className="contents">
            <div className="flex min-w-max items-center gap-3">
              <span
                className={cn(
                  "grid h-10 w-10 place-items-center rounded-full border text-sm font-black shadow-sm",
                  step.ready ? "border-[#15803d] bg-[#15803d] text-white" : "border-slate-200 bg-white text-slate-500"
                )}
              >
                {step.ready ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </span>
              <span>
                <span className={cn("block text-sm font-black", step.ready ? "text-[#15803d]" : "text-ink")}>{step.title}</span>
                <span className="block text-xs font-semibold text-slate-500">{step.text}</span>
              </span>
            </div>
            {index < steps.length - 1 ? <span className={cn("h-px min-w-14 flex-1", steps[index + 1].ready ? "bg-[#15803d]" : "bg-slate-200")} /> : null}
          </div>
        );
      })}
    </div>
  );
}

function AddressInput({
  className,
  inputMode,
  label,
  onChange,
  placeholder,
  value
}: {
  className?: string;
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="text-sm font-black text-ink">{label}</span>
      <Input
        inputMode={inputMode}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 rounded-2xl border-[#ECECEC] bg-white px-3 py-3 text-sm font-semibold shadow-sm focus:border-[#15803d]"
      />
    </label>
  );
}



function ServiceChip({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="inline-flex items-center justify-center gap-2 rounded-full border border-[#ECECEC] bg-white px-3 py-2 text-xs font-black text-ink shadow-sm">
      <span className="text-[#15803d]">{icon}</span>
      <span className="truncate">{label}</span>
    </div>
  );
}

function SummaryRow({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="inline-flex items-center gap-1.5">
        {label}
        {label === "Packaging Charge" ? <Info className="h-3.5 w-3.5 text-slate-400" /> : null}
      </dt>
      <dd className={cn("font-black text-ink", valueClassName)}>{value}</dd>
    </div>
  );
}

function formatAddress(address: UserAddress) {
  const parts = [address.line1, address.line2, address.city, address.pincode, address.state].map((part) => part.trim()).filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "Add house, area, city and pincode";
}

function hasDealBadge(product: Product) {
  return product.dietary.some((tag) => /deal|offer|discount/i.test(tag));
}

function getDefaultUnit(product: Product) {
  return product.unitOptions[0] ?? "1";
}

function readSavedCheckoutAddress() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const savedAddress = window.localStorage.getItem(SAVED_CHECKOUT_ADDRESS_KEY);
    if (!savedAddress) {
      return null;
    }

    const parsedAddress = JSON.parse(savedAddress) as Partial<UserAddress>;
    if (!parsedAddress || typeof parsedAddress !== "object") {
      return null;
    }

    return {
      ...emptyAddress,
      ...parsedAddress,
      id: parsedAddress.id || "addr-saved",
      label: parsedAddress.label === "Work" || parsedAddress.label === "Other" ? parsedAddress.label : "Home",
      distanceKm: Number.isFinite(parsedAddress.distanceKm) ? Number(parsedAddress.distanceKm) : emptyAddress.distanceKm
    } satisfies UserAddress;
  } catch {
    return null;
  }
}

function googleMapUrl(latitude?: number, longitude?: number) {
  const shop = `${SHOP_LOCATION.latitude},${SHOP_LOCATION.longitude}`;

  if (typeof latitude === "number" && typeof longitude === "number") {
    const destination = `${latitude},${longitude}`;
    return `https://maps.google.com/maps?saddr=${encodeURIComponent(shop)}&daddr=${encodeURIComponent(destination)}&hl=en&z=15&output=embed`;
  }

  return `https://www.google.com/maps?q=${encodeURIComponent(shop)}&z=16&output=embed`;
}

function googleMapsExternalUrl(latitude?: number, longitude?: number) {
  const shop = `${SHOP_LOCATION.latitude},${SHOP_LOCATION.longitude}`;

  if (typeof latitude === "number" && typeof longitude === "number") {
    const destination = `${latitude},${longitude}`;
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(shop)}&destination=${encodeURIComponent(destination)}`;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop)}`;
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
