"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { AlertTriangle, Ban, BellRing, Download, Edit3, Eye, FileText, History, IndianRupee, LayoutDashboard, MessageCircle, PackagePlus, Save, Trash2, Truck, Undo2, Upload, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useLanguage } from "@/components/language-provider";
import { useStore } from "@/components/store-provider";
import { ADMIN_PHONE } from "@/lib/admin-access";
import { subscribeToOrderNotifications } from "@/lib/client-notifications";
import { formatCurrency } from "@/lib/format";
import { buildWhatsAppOrderUrl, downloadInvoice } from "@/lib/invoice";
import type { Order, Product, ProductCategory } from "@/lib/types";
import { buildWeightVariantPrices, WEIGHT_UNIT_OPTIONS } from "@/lib/units";

const emptyProduct: Omit<Product, "id"> = {
  name: "",
  category: "grocery",
  price: 0,
  image_url: "",
  stock: 0,
  brand: "",
  dietary: [],
  unitType: "package",
  unitOptions: ["1 pack"],
  variantPrices: { "1 pack": 0 },
  reviews: []
};

type AdminSection = "orders" | "products" | "analytics" | "users" | "overview";

const adminSections: Array<{ id: AdminSection; label: string }> = [
  { id: "orders", label: "Orders" },
  { id: "products", label: "Products" },
  { id: "analytics", label: "Analytics" },
  { id: "users", label: "Users" },
  { id: "overview", label: "Overview" }
];

export default function AdminPage() {
  const { data: session, status } = useSession();
  const { t } = useLanguage();
  const {
    addProduct,
    activityLog,
    agents,
    assignDeliveryAgent,
    blockPhone,
    blockedPhones,
    deleteProduct,
    lowStockProducts,
    orders,
    products,
    unblockPhone,
    updateDeliveryEta,
    updateOrderStatus,
    updateProduct,
    updateRefundStatus,
    importProducts
  } = useStore();
  const [form, setForm] = useState<Omit<Product, "id">>(emptyProduct);
  const [dietaryText, setDietaryText] = useState("");
  const [unitOptionsText, setUnitOptionsText] = useState("1 pack");
  const [variantPricesText, setVariantPricesText] = useState("1 pack:0");
  const [blockPhoneInput, setBlockPhoneInput] = useState("");
  const [cancelReason, setCancelReason] = useState("Customer requested cancellation");
  const [etaText, setEtaText] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState("borj18237@gmail.com");
  const [adminPassword, setAdminPassword] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isEnablingPush, setIsEnablingPush] = useState(false);
  const [isSeedingProducts, setIsSeedingProducts] = useState(false);
  const [activeAdminSection, setActiveAdminSection] = useState<AdminSection>("orders");

  const isAdmin = session?.user?.role === "admin";
  const [isRecruiterDemo, setIsRecruiterDemo] = useState(false);

  // Detect recruiter demo session from sessionStorage (set by login page)
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsRecruiterDemo(sessionStorage.getItem("recruiter-demo") === "true");
    }
  }, []);

  const canView = isAdmin || isRecruiterDemo;
  const revenue = useMemo(() => orders.reduce((total, order) => total + order.total_amount, 0), [orders]);
  const dailyRevenue = useMemo(() => buildDailyRevenue(orders), [orders]);
  const topSelling = useMemo(() => buildTopSelling(orders), [orders]);
  const peakHours = useMemo(() => buildPeakHours(orders), [orders]);

  useEffect(() => {
    function onNewOrder(event: Event) {
      const order = (event as CustomEvent<Order>).detail;
      toast.success(`New order ${order.order_id} received`);
      playNotificationSound();
    }

    window.addEventListener("tapas:new-order", onNewOrder);
    return () => window.removeEventListener("tapas:new-order", onNewOrder);
  }, []);

  async function enablePushNotifications() {
    if (isEnablingPush) {
      return;
    }

    if (!isAdmin) {
      toast.error("Login as admin before enabling notifications.");
      return;
    }

    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      toast.error("Push notifications are not supported in this browser.");
      return;
    }

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    if (!publicKey) {
      toast.error("VAPID public key is missing.");
      return;
    }

    setIsEnablingPush(true);

    try {
      await subscribeToOrderNotifications(ADMIN_PHONE, "admin");
      toast.success("Admin order notifications enabled");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Notification setup failed.");
    } finally {
      setIsEnablingPush(false);
    }
  }

  function notifyCustomerOrderUpdate(order: Order, type: "status" | "eta" | "refund", options: { status?: Order["status"]; eta?: string; refundStatus?: Order["refund_status"]; reason?: string }) {
    fetch("/api/push/order-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        order,
        ...options
      })
    })
      .then(async (response) => {
        const data = (await response.json()) as { error?: string; result?: { sent?: number; reason?: string } };

        if (!response.ok) {
          throw new Error(data.error ?? "Customer notification failed.");
        }

        if (data.result?.sent === 0) {
          toast("Order updated, but customer notifications are not enabled on that phone.");
        }
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Customer notification failed."));
  }

  function submitProduct() {
    const unitOptions = form.unitType === "weight"
      ? WEIGHT_UNIT_OPTIONS
      : unitOptionsText
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
    const variantPrices = form.unitType === "weight" ? buildWeightVariantPrices(form.price) : parseVariantPrices(variantPricesText);
    const productForm = {
      ...form,
      dietary: dietaryText
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      unitOptions,
      variantPrices,
      reviews: form.reviews
    };

    if (!productForm.name.trim() || !productForm.image_url.trim() || !productForm.brand.trim() || productForm.price <= 0 || productForm.unitOptions.length === 0) {
      toast.error("Name, image, brand, price, and unit options are required.");
      return;
    }

    if (editingProductId) {
      updateProduct({ ...productForm, id: editingProductId });
      setEditingProductId(null);
      toast.success("Product updated");
    } else {
      addProduct(productForm);
      toast.success("Product added");
    }

    setForm(emptyProduct);
    setDietaryText("");
    setUnitOptionsText("1 pack");
    setVariantPricesText("1 pack:0");
  }

  async function seedSupabaseProducts() {
    if (isSeedingProducts) {
      return;
    }

    setIsSeedingProducts(true);

    try {
      const response = await fetch("/api/products/seed", { method: "POST" });
      const data = (await response.json()) as { inserted?: number; total?: number; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Product seeding failed.");
      }

      toast.success(data.inserted ? `${data.inserted} products added to Supabase` : "Supabase already has the seed products");

      const productsResponse = await fetch("/api/products");
      const productsData = (await productsResponse.json()) as { source?: string; products?: Product[] };

      if (productsData.products) {
        importProducts(productsData.products);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Product seeding failed.");
    } finally {
      setIsSeedingProducts(false);
    }
  }

  function editProduct(product: Product) {
    setEditingProductId(product.id);
    setForm({
      name: product.name,
      category: product.category,
      price: product.price,
      image_url: product.image_url,
      description: product.description,
      stock: product.stock,
      minStock: product.minStock,
      brand: product.brand,
      dietary: product.dietary,
      unitType: product.unitType,
      unitOptions: product.unitOptions,
      variantPrices: product.variantPrices,
      reviews: product.reviews
    });
    setDietaryText(product.dietary.join(", "));
    setUnitOptionsText(product.unitOptions.join(", "));
    setVariantPricesText(Object.entries(product.variantPrices).map(([unit, price]) => `${unit}:${price}`).join(", "));
  }

  function exportProductsCsv() {
    const rows = [
      ["id", "name", "category", "price", "image_url", "stock", "brand", "unitType", "unitOptions", "variantPrices", "dietary"],
      ...products.map((product) => [
        product.id,
        product.name,
        product.category,
        String(product.price),
        product.image_url,
        String(product.stock),
        product.brand,
        product.unitType,
        product.unitOptions.join("|"),
        JSON.stringify(product.variantPrices),
        product.dietary.join("|")
      ])
    ];
    const csv = rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `tapas-products-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Product CSV exported");
  }

  function importProductsCsv(file: File | undefined) {
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const csv = String(reader.result ?? "");
        const [, ...lines] = csv.split(/\r?\n/).filter(Boolean);
        const importedProducts = lines.map(parseProductCsvLine);
        importProducts(importedProducts);
        toast.success(`${importedProducts.length} products imported`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "CSV import failed");
      }
    };
    reader.readAsText(file);
  }

  async function uploadProductImage(file: File | undefined) {
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/products/upload-image", {
        method: "POST",
        body: formData
      });
      const data = (await response.json()) as { imageUrl?: string; error?: string };

      if (!response.ok || !data.imageUrl) {
        throw new Error(data.error ?? "Supabase upload failed");
      }

      setForm((current) => ({ ...current, image_url: data.imageUrl! }));
      toast.success("Image uploaded to Supabase Storage");
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        setForm((current) => ({ ...current, image_url: String(reader.result ?? "") }));
        toast.success("Local image preview attached");
      };
      reader.readAsDataURL(file);
    }
  }

  if (status === "loading" && !isRecruiterDemo) {
    return <main className="mx-auto max-w-7xl px-4 py-10">Loading secure session...</main>;
  }

  if (!canView) {
    async function handleCredentialSignIn() {
      setIsSigningIn(true);
      const result = await signIn("credentials", {
        email: adminEmail,
        password: adminPassword,
        redirect: false
      });
      setIsSigningIn(false);

      if (result?.error) {
        toast.error("Admin login failed. Use borj18237@gmail.com and the correct password.");
        return;
      }

      toast.success("Admin login successful");
    }

    return (
      <main className="mx-auto grid min-h-[calc(100vh-73px)] max-w-md place-items-center px-4 py-12">
        <section className="w-full rounded-lg border border-black/10 bg-white p-6 shadow-soft">
          <h1 className="text-3xl font-black text-ink">{t("adminLogin")}</h1>
          <p className="mt-2 text-sm text-ink/65">Only borj18237@gmail.com can unlock the dashboard.</p>
          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={() => signIn("google", { callbackUrl: "/admin" })}
              className="w-full rounded-md bg-primary-accent px-4 py-3 font-bold text-white hover:bg-primary-accent/90"
            >
              Continue with Google
            </button>
            <div className="relative py-2 text-center text-xs font-black uppercase tracking-[0.16em] text-ink/45">
              Email password
            </div>
            <label className="block">
              <span className="text-sm font-bold text-ink">Admin email</span>
              <input
                value={adminEmail}
                onChange={(event) => setAdminEmail(event.target.value)}
                className="mt-2 w-full rounded-md border border-black/10 bg-white px-3 py-2"
                inputMode="email"
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-ink">Admin password</span>
              <input
                value={adminPassword}
                onChange={(event) => setAdminPassword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleCredentialSignIn();
                  }
                }}
                className="mt-2 w-full rounded-md border border-black/10 bg-white px-3 py-2"
                type="password"
              />
            </label>
            <button
              type="button"
              onClick={handleCredentialSignIn}
              disabled={isSigningIn}
              className="w-full rounded-md bg-ink px-4 py-3 font-bold text-white hover:bg-leaf-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isSigningIn ? "Signing in..." : "Login with Email"}
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      {isRecruiterDemo && (
        <div className="mx-auto mb-4 max-w-7xl rounded-lg border border-amber-200 bg-amber-50 px-5 py-3 flex items-center gap-3">
          <span className="text-lg">👁️</span>
          <div>
            <p className="font-black text-amber-800">Recruiter Demo — View Only</p>
            <p className="text-sm text-amber-700">You can browse everything but cannot add, edit, or delete any data.</p>
          </div>
          <button
            type="button"
            onClick={() => { sessionStorage.removeItem("recruiter-demo"); window.location.href = "/login"; }}
            className="ml-auto rounded-md border border-amber-300 bg-white px-3 py-1.5 text-sm font-bold text-amber-800 hover:bg-amber-100"
          >
            Exit Demo
          </button>
        </div>
      )}
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 rounded-lg border border-emerald-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-black uppercase text-primary-accent">Owner operations</p>
          <h1 className="text-4xl font-black text-ink">{t("dashboard")}</h1>
          <p className="mt-2 text-ink/65">Secure owner controls for products, inventory, analytics, and incoming orders.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            signOut({ callbackUrl: "/" });
          }}
          className="rounded-md border border-black/10 bg-white px-4 py-2 font-bold hover:bg-primary-accent/10"
        >
          {t("logout")}
        </button>
      </div>

      <nav className="sticky top-[73px] z-30 mx-auto mt-4 flex max-w-7xl gap-2 overflow-x-auto rounded-lg border border-slate-200 bg-white p-2 shadow-sm [scrollbar-width:none]">
        {adminSections.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => setActiveAdminSection(section.id)}
            className={`min-h-11 shrink-0 rounded-md px-4 text-sm font-black transition ${
              activeAdminSection === section.id ? "bg-primary-accent/90 text-white" : "bg-slate-50 text-ink hover:bg-leaf-50"
            }`}
          >
            {section.label}
          </button>
        ))}
      </nav>

      <section className={`mx-auto mt-6 max-w-7xl rounded-lg border border-emerald-100 bg-white p-5 shadow-sm ${activeAdminSection === "overview" ? "" : "hidden"}`}>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-black text-ink">Order notifications</h2>
            <p className="mt-1 text-sm text-ink/65">Enable Web Push to receive new-order alerts even when the PWA is closed.</p>
          </div>
          <button
            type="button"
            onClick={enablePushNotifications}
            disabled={isEnablingPush}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-leaf-600 px-4 py-3 font-bold text-white hover:bg-leaf-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            <BellRing className="h-4 w-4" />
            {isEnablingPush ? "Enabling..." : "Enable notifications"}
          </button>
        </div>
      </section>

      <section aria-label={t("overview")} className={`mx-auto mt-8 max-w-7xl gap-4 sm:grid-cols-3 ${activeAdminSection === "overview" ? "grid" : "hidden"}`}>
        <Metric title={t("products")} value={products.length.toString()} icon={<PackagePlus className="h-5 w-5" />} />
        <Metric title={t("orders")} value={orders.length.toString()} icon={<LayoutDashboard className="h-5 w-5" />} />
        <Metric title={t("revenue")} value={formatCurrency(revenue)} icon={<IndianRupee className="h-5 w-5" />} />
      </section>

      <section className={`mx-auto mt-6 max-w-7xl rounded-lg border border-emerald-100 bg-white p-5 shadow-sm ${activeAdminSection === "products" ? "" : "hidden"}`}>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-black text-ink">Seed full catalog</h2>
            <p className="mt-1 text-sm text-ink/65">Add missing built-in grocery products to Supabase without deleting your manually uploaded products.</p>
          </div>
          <button
            type="button"
            onClick={seedSupabaseProducts}
            disabled={isSeedingProducts}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 font-bold text-white hover:bg-leaf-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            <Upload className="h-4 w-4" />
            {isSeedingProducts ? "Adding..." : "Add missing products"}
          </button>
        </div>
      </section>

      <section className={`mx-auto mt-8 max-w-7xl rounded-lg border border-red-100 bg-white p-5 shadow-sm ${activeAdminSection === "products" ? "" : "hidden"}`}>
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-red-50 p-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-2xl font-black text-ink">Low-stock alerts</h2>
            <p className="text-sm text-ink/65">Products at 10 units or below need restocking.</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {lowStockProducts.length === 0 ? (
            <span className="rounded-full bg-leaf-50 px-3 py-2 text-sm font-bold text-primary-accent">All inventory looks healthy</span>
          ) : (
            lowStockProducts.map((product) => (
              <span key={product.id} className="rounded-full bg-red-100 px-3 py-2 text-sm font-bold text-red-800">
                {product.name}: {product.stock} left
              </span>
            ))
          )}
        </div>
      </section>

      <section className={`mx-auto mt-8 max-w-7xl gap-4 lg:grid-cols-[0.75fr_1.25fr] ${activeAdminSection === "products" ? "grid" : "hidden"}`}>
        <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="rounded-md bg-leaf-50 p-2 text-primary-accent">
              <Upload className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-2xl font-black text-ink">Bulk product tools</h2>
              <p className="text-sm text-ink/65">Import/export products for fast catalog updates.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={exportProductsCsv} className="inline-flex items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 font-bold text-white hover:bg-leaf-700">
              <Download className="h-4 w-4" />
              Export CSV
            </button>
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-black/10 bg-white px-4 py-3 font-bold hover:bg-leaf-50">
              <Upload className="h-4 w-4" />
              Import CSV
              <input type="file" accept=".csv,text/csv" onChange={(event) => importProductsCsv(event.target.files?.[0])} className="sr-only" />
            </label>
          </div>
          <p className="mt-3 text-xs text-ink/55">Image uploads should use Supabase Storage in production. CSV currently accepts image_url values for fast catalog entry.</p>
        </div>

        <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="rounded-md bg-leaf-50 p-2 text-primary-accent">
              <History className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-2xl font-black text-ink">Admin activity log</h2>
              <p className="text-sm text-ink/65">Tracks important product, order, user, refund, and ETA changes.</p>
            </div>
          </div>
          <div className="mt-4 max-h-72 overflow-auto rounded-lg border border-black/10">
            {activityLog.length ? activityLog.slice(0, 20).map((item) => (
              <div key={item.id} className="border-b border-black/10 p-3 text-sm last:border-b-0">
                <p className="font-black text-ink">{item.action}</p>
                <p className="text-ink/70">{item.details}</p>
                <p className="mt-1 text-xs text-ink/45">{new Date(item.created_at).toLocaleString("en-IN")}</p>
              </div>
            )) : <p className="p-4 text-sm text-ink/60">No admin activity yet.</p>}
          </div>
        </div>
      </section>

      <section className={`mx-auto mt-8 max-w-7xl rounded-lg border border-slate-200 bg-white p-5 shadow-sm ${activeAdminSection === "users" ? "" : "hidden"}`}>
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-2xl font-black text-ink">User blocking</h2>
            <p className="mt-1 text-sm text-ink/65">Block a customer by mobile number. Blocked users cannot place orders.</p>
          </div>
          <div className="flex gap-2">
            <input value={blockPhoneInput} onChange={(event) => setBlockPhoneInput(event.target.value)} className="min-w-0 rounded-md border border-black/10 px-3 py-2" placeholder="10 digit mobile" />
            <button
              type="button"
              onClick={() => {
                blockPhone(blockPhoneInput);
                toast.success("Phone blocked");
                setBlockPhoneInput("");
              }}
              className="inline-flex items-center gap-2 rounded-md bg-red-700 px-4 py-2 font-bold text-white hover:bg-red-800"
            >
              <Ban className="h-4 w-4" />
              Block
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {blockedPhones.length === 0 ? (
            <span className="rounded-full bg-leaf-50 px-3 py-2 text-sm font-bold text-primary-accent">No blocked users</span>
          ) : blockedPhones.map((phone) => {
            const isBlocked = blockedPhones.includes(phone);
            return (
              <span key={phone} className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold ${isBlocked ? "bg-red-100 text-red-800" : "bg-leaf-50 text-primary-accent"}`}>
                {phone} {isBlocked ? "Blocked" : "Active"}
                {isBlocked ? (
                  <button type="button" onClick={() => unblockPhone(phone)} className="rounded-full bg-white p-1" aria-label="Unblock phone">
                    <Undo2 className="h-3 w-3" />
                  </button>
                ) : null}
              </span>
            );
          })}
        </div>
      </section>

      <section className={`mx-auto mt-8 max-w-7xl gap-4 lg:grid-cols-3 ${activeAdminSection === "analytics" ? "grid" : "hidden"}`}>
        <ChartPanel title="Daily revenue">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dailyRevenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="#2f9e44" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel title="Top-selling items">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topSelling}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="quantity" fill="#f59f00" />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel title="Peak order times">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={peakHours}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="orders" fill="#17211b" />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
      </section>

      <section className={`mx-auto mt-10 max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr] ${activeAdminSection === "products" ? "grid" : "hidden"}`}>
        <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-black text-ink">{editingProductId ? t("updateProduct") : t("addProduct")}</h2>
          <div className="mt-5 space-y-4">
            <AdminInput label={t("name")} value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
            <label className="block">
              <span className="text-sm font-bold">{t("category")}</span>
              <select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as ProductCategory }))} className="mt-2 w-full rounded-md border border-black/10 px-3 py-2">
                <option value="grocery">Grocery Items</option>
              </select>
            </label>
            <AdminInput label={t("brand")} value={form.brand} onChange={(value) => setForm((current) => ({ ...current, brand: value }))} />
            <label className="block">
              <span className="text-sm font-bold">Description</span>
              <textarea value={form.description ?? ""} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="mt-2 min-h-24 w-full rounded-md border border-black/10 px-3 py-2" />
            </label>
            <label className="block">
              <span className="text-sm font-bold">Product packaging</span>
              <select
                value={form.unitType}
                onChange={(event) => {
                  const unitType = event.target.value as Product["unitType"];
                  setForm((current) => ({ ...current, unitType }));
                  if (unitType === "weight") {
                    setUnitOptionsText(WEIGHT_UNIT_OPTIONS.join(", "));
                    setVariantPricesText("Auto-calculated from 25 Gram price");
                  } else {
                    setUnitOptionsText("1 pack");
                    setVariantPricesText("1 pack:0");
                  }
                }}
                className="mt-2 w-full rounded-md border border-black/10 px-3 py-2"
              >
                <option value="weight">Loose product (Gram / Kg)</option>
                <option value="package">Packaged product</option>
              </select>
            </label>
            <AdminInput
              label={form.unitType === "weight" ? "Price for 25 Gram" : t("price")}
              type="number"
              value={String(form.price)}
              onChange={(value) => setForm((current) => ({ ...current, price: Number(value) }))}
            />
            <AdminInput label={t("imageUrl")} value={form.image_url} onChange={(value) => setForm((current) => ({ ...current, image_url: value }))} />
            <label className="block">
              <span className="text-sm font-bold">Upload product photo</span>
              <input type="file" accept="image/*" onChange={(event) => uploadProductImage(event.target.files?.[0])} className="mt-2 w-full rounded-md border border-black/10 px-3 py-2" />
            </label>
            <AdminInput label={t("stock")} type="number" value={String(form.stock)} onChange={(value) => setForm((current) => ({ ...current, stock: Number(value) }))} />
            <AdminInput label="Low-stock threshold" type="number" value={String(form.minStock ?? 10)} onChange={(value) => setForm((current) => ({ ...current, minStock: Number(value) }))} />
            {form.unitType === "weight" ? (
              <div className="rounded-lg border border-leaf-100 bg-leaf-50 p-3 text-sm font-semibold text-ink/70">
                Loose products use fixed options from 25 Gram to 5 Kg. Prices are auto-calculated from the 25 Gram price.
              </div>
            ) : (
              <>
                <AdminInput label="Pack options" value={unitOptionsText} onChange={setUnitOptionsText} />
                <AdminInput label="Pack prices" value={variantPricesText} onChange={setVariantPricesText} />
              </>
            )}
            <AdminInput label="Dietary tags" value={dietaryText} onChange={setDietaryText} />
          </div>
          <button type="button" onClick={submitProduct} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-leaf-600 px-4 py-3 font-bold text-white hover:bg-leaf-700">
            <Save className="h-4 w-4" />
            {editingProductId ? t("updateProduct") : t("addProduct")}
          </button>
        </div>

        <div className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm">
          <div className="border-b border-black/10 p-5">
            <h2 className="text-2xl font-black text-ink">{t("productManagement")}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="sticky top-0 bg-white text-ink shadow-[inset_0_-1px_0_#f4f4f5]">
                <tr>
                  <th className="px-4 py-3">{t("name")}</th>
                  <th className="px-4 py-3">{t("category")}</th>
                  <th className="px-4 py-3">{t("brand")}</th>
                  <th className="px-4 py-3">{t("price")}</th>
                  <th className="px-4 py-3">Units</th>
                  <th className="px-4 py-3">{t("stock")}</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {products.map((product) => (
                  <tr key={product.id} className="odd:bg-white even:bg-zinc-50/70">
                    <td className="px-4 py-3 font-bold">{product.name}</td>
                    <td className="px-4 py-3">{t(product.category)}</td>
                    <td className="px-4 py-3">{product.brand}</td>
                    <td className="px-4 py-3">{formatCurrency(product.price)}</td>
                    <td className="px-4 py-3">{product.unitOptions.join(", ")}</td>
                    <td className="px-4 py-3">{product.stock}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => editProduct(product)} className="rounded-md border border-black/10 p-2 hover:bg-leaf-50" aria-label={t("edit")} disabled={!isAdmin}>
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => deleteProduct(product.id)} className="rounded-md border border-black/10 p-2 text-red-700 hover:bg-red-50" aria-label={t("delete")} disabled={!isAdmin}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className={`mx-auto mt-10 max-w-7xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm ${activeAdminSection === "orders" ? "" : "hidden"}`}>
        <div className="border-b border-black/10 p-5">
          <h2 className="text-2xl font-black text-ink">{t("orderManagement")}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="sticky top-0 bg-white text-ink shadow-[inset_0_-1px_0_#f4f4f5]">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">{t("customerName")}</th>
                <th className="px-4 py-3">{t("itemsOrdered")}</th>
                <th className="px-4 py-3">{t("discount")}</th>
                <th className="px-4 py-3">{t("totalAmount")}</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">ETA</th>
                <th className="px-4 py-3">{t("deliveryDistance")}</th>
                <th className="px-4 py-3">{t("status")}</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {orders.map((order) => (
                <tr key={order.order_id} className="odd:bg-white even:bg-zinc-50/70">
                  <td className="px-4 py-3 font-bold">{order.order_id}</td>
                  <td className="px-4 py-3">{order.customer_name}</td>
                  <td className="px-4 py-3">{order.items_ordered}</td>
                  <td className="px-4 py-3">{formatCurrency(order.discount_amount)}</td>
                  <td className="px-4 py-3">{formatCurrency(order.total_amount)}</td>
                  <td className="px-4 py-3">{order.payment_method} · {order.payment_status}</td>
                  <td className="px-4 py-3 font-semibold text-primary-accent">{order.delivery_eta}</td>
                  <td className="px-4 py-3">{order.delivery_distance} km</td>
                  <td className="px-4 py-3">
                    <select
                      value={order.status}
                      onChange={(event) => {
                        const statusValue = event.target.value as Order["status"];
                        updateOrderStatus(order.order_id, statusValue);
                        notifyCustomerOrderUpdate({ ...order, status: statusValue }, "status", { status: statusValue });
                      }}
                      className="rounded-md border border-black/10 px-2 py-2 text-sm font-bold"
                    >
                      {["Pending", "Accepted", "Preparing", "Out for delivery", "Delivered", "Cancelled", "Refunded"].map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOrder(order);
                        setEtaText(order.delivery_eta);
                      }}
                      className="inline-flex items-center gap-2 rounded-md border border-black/10 px-3 py-2 font-bold hover:bg-leaf-50"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selectedOrder ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <section className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-lg bg-white p-6 shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-ink">Order {selectedOrder.order_id}</h2>
                <p className="mt-1 text-sm text-ink/65">{new Date(selectedOrder.created_at).toLocaleString("en-IN")}</p>
              </div>
              <button type="button" onClick={() => setSelectedOrder(null)} className="rounded-md border border-black/10 px-3 py-2 font-bold">
                Close
              </button>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <DetailBlock title="Customer">
                <p>{selectedOrder.customer_name}</p>
                <p>{selectedOrder.customer_phone}</p>
              </DetailBlock>
              <DetailBlock title="Payment">
                <p>{selectedOrder.payment_method} · {selectedOrder.payment_status}</p>
                <p>Total: {formatCurrency(selectedOrder.total_amount)}</p>
                <p>Delivery: {formatCurrency(selectedOrder.delivery_fee)}</p>
                <p>Refund: {selectedOrder.refund_status}</p>
              </DetailBlock>
              <DetailBlock title="Customer Delivery Time">
                <p>Current: {selectedOrder.delivery_eta}</p>
                <div className="mt-3 grid gap-2">
                  <input
                    value={etaText}
                    onChange={(event) => setEtaText(event.target.value)}
                    className="w-full rounded-md border border-black/10 bg-white px-3 py-2"
                    placeholder="Example: 30 minutes or Today by 7 PM"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      updateDeliveryEta(selectedOrder.order_id, etaText);
                      const nextOrder = { ...selectedOrder, delivery_eta: etaText.trim() || "Waiting for owner confirmation" };
                      setSelectedOrder(nextOrder);
                      notifyCustomerOrderUpdate(nextOrder, "eta", { eta: nextOrder.delivery_eta });
                      toast.success("Delivery time shared with customer");
                    }}
                    className="rounded-md bg-leaf-600 px-3 py-2 font-bold text-white hover:bg-leaf-700"
                  >
                    Save delivery time
                  </button>
                </div>
              </DetailBlock>
              <DetailBlock title="Delivery Address">
                <p>{selectedOrder.delivery_address.line1}</p>
                <p>{selectedOrder.delivery_address.line2}</p>
                <p>{selectedOrder.delivery_address.city}, {selectedOrder.delivery_address.state} - {selectedOrder.delivery_address.pincode}</p>
                <p>Landmark: {selectedOrder.delivery_address.landmark}</p>
              </DetailBlock>
              <DetailBlock title="Location">
                <p>Distance from shop: {selectedOrder.delivery_distance} km</p>
                <p>Receiver: {selectedOrder.delivery_address.receiverName}</p>
                <p>Phone: {selectedOrder.delivery_address.phone}</p>
                <a
                  href={orderMapUrl(selectedOrder)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex font-bold text-primary-accent hover:underline"
                >
                  Open delivery location
                </a>
              </DetailBlock>
              <DetailBlock title="Delivery Agent">
                <select
                  value={selectedOrder.assigned_agent_id ?? ""}
                  onChange={(event) => {
                    assignDeliveryAgent(selectedOrder.order_id, event.target.value);
                    setSelectedOrder((current) => (current ? { ...current, assigned_agent_id: event.target.value || undefined } : current));
                  }}
                  className="w-full rounded-md border border-black/10 bg-white px-3 py-2"
                >
                  <option value="">Unassigned</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} ({agent.phone})
                    </option>
                  ))}
                </select>
                <p className="mt-2 inline-flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Assign before marking out for delivery.
                </p>
              </DetailBlock>
            </div>
            <DetailBlock title="Items">
              <p>{selectedOrder.items_ordered}</p>
            </DetailBlock>
            <div className="mt-4 overflow-hidden rounded-lg border border-emerald-200 bg-white shadow-sm">
              <div className="border-b border-emerald-100 bg-leaf-700 p-4 text-white">
                <p className="text-xs font-black uppercase text-white/75">Customer invoice</p>
                <div className="mt-1 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                  <div>
                    <h3 className="text-2xl font-black">{selectedOrder.invoice_number}</h3>
                    <p className="text-sm font-semibold text-white/80">Order {selectedOrder.order_id}</p>
                  </div>
                  <p className="text-3xl font-black">{formatCurrency(selectedOrder.total_amount)}</p>
                </div>
              </div>
              <div className="grid gap-3 p-4 md:grid-cols-3">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-black uppercase text-ink/45">Subtotal</p>
                  <p className="mt-1 font-black text-ink">{formatCurrency(selectedOrder.subtotal)}</p>
                </div>
                <div className="rounded-lg bg-amber-50 p-3">
                  <p className="text-xs font-black uppercase text-amber-700">Discount</p>
                  <p className="mt-1 font-black text-ink">{formatCurrency(selectedOrder.discount_amount)}</p>
                </div>
                <div className="rounded-lg bg-leaf-50 p-3">
                  <p className="text-xs font-black uppercase text-primary-accent">Delivery</p>
                  <p className="mt-1 font-black text-ink">{formatCurrency(selectedOrder.delivery_fee)}</p>
                </div>
              </div>
              <div className="grid gap-2 border-t border-emerald-100 bg-leaf-50 p-4 md:grid-cols-2">
                <button type="button" onClick={() => downloadInvoice(selectedOrder)} className="inline-flex items-center justify-center gap-2 rounded-md bg-ink px-3 py-3 font-bold text-white hover:bg-leaf-700">
                  <FileText className="h-4 w-4" />
                  Open professional invoice
                </button>
                <a href={buildWhatsAppOrderUrl(selectedOrder)} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-md bg-leaf-600 px-3 py-3 font-bold text-white hover:bg-leaf-700">
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp customer
                </a>
              </div>
              <div className="border-t border-emerald-100 p-4">
                <p className="text-sm font-black text-ink">Cancellation and refund actions</p>
                <input value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} className="mt-3 w-full rounded-md border border-black/10 bg-white px-3 py-2" placeholder="Cancellation/refund reason" />
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => {
                      updateOrderStatus(selectedOrder.order_id, "Cancelled");
                      updateRefundStatus(selectedOrder.order_id, "Requested", cancelReason);
                      const nextOrder = { ...selectedOrder, status: "Cancelled" as const, refund_status: "Requested" as const, cancellation_reason: cancelReason };
                      setSelectedOrder(nextOrder);
                      notifyCustomerOrderUpdate(nextOrder, "status", { status: "Cancelled" });
                      notifyCustomerOrderUpdate(nextOrder, "refund", { refundStatus: "Requested", reason: cancelReason });
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-red-700 px-3 py-2 font-bold text-white hover:bg-red-800"
                  >
                    <XCircle className="h-4 w-4" />
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateRefundStatus(selectedOrder.order_id, "Approved", cancelReason);
                      const nextOrder = { ...selectedOrder, refund_status: "Approved" as const, cancellation_reason: cancelReason };
                      setSelectedOrder(nextOrder);
                      notifyCustomerOrderUpdate(nextOrder, "refund", { refundStatus: "Approved", reason: cancelReason });
                    }}
                    className="rounded-md border border-black/10 bg-white px-3 py-2 font-bold hover:bg-primary-accent/10"
                  >
                    Approve refund
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateRefundStatus(selectedOrder.order_id, "Refunded", cancelReason);
                      const nextOrder = { ...selectedOrder, status: "Refunded" as const, refund_status: "Refunded" as const, cancellation_reason: cancelReason };
                      setSelectedOrder(nextOrder);
                      notifyCustomerOrderUpdate(nextOrder, "refund", { refundStatus: "Refunded", reason: cancelReason });
                    }}
                    className="rounded-md bg-ink px-3 py-2 font-bold text-white hover:bg-leaf-700"
                  >
                    Mark refunded
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function Metric({ icon, title, value }: { icon: ReactNode; title: string; value: string }) {
  return (
    <div className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-ink/65">{title}</p>
        <span className="rounded-md bg-leaf-50 p-2 text-primary-accent">{icon}</span>
      </div>
      <p className="mt-4 text-3xl font-black text-ink">{value}</p>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full w-2/3 rounded-full bg-leaf-600" />
      </div>
    </div>
  );
}

function ChartPanel({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-black text-ink">{title}</h2>
        <span className="rounded-full bg-leaf-50 px-2 py-1 text-xs font-black text-primary-accent">Live</span>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function AdminInput({ label, onChange, type = "text", value }: { label: string; onChange: (value: string) => void; type?: string; value: string }) {
  return (
    <label className="block">
      <span className="text-sm font-bold">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-md border border-black/10 px-3 py-2" />
    </label>
  );
}

function DetailBlock({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div className="rounded-lg border border-emerald-100 bg-leaf-50 p-4 text-sm">
      <h3 className="mb-2 font-black text-ink">{title}</h3>
      <div className="space-y-1 text-ink/75">{children}</div>
    </div>
  );
}

function parseVariantPrices(value: string) {
  return value.split(",").reduce<Record<string, number>>((prices, item) => {
    const [unit, price] = item.split(":").map((part) => part.trim());

    if (unit && price) {
      prices[unit] = Number(price);
    }

    return prices;
  }, {});
}

function escapeCsvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function parseProductCsvLine(line: string): Product {
  const cells = parseCsvLine(line);
  const [id, name, category, price, image_url, stock, brand, unitType, unitOptions, variantPrices, dietary] = cells;

  if (!id || !name || !category || !price || !image_url || !brand) {
    throw new Error("CSV row is missing required product fields.");
  }

  return {
    id,
    name,
    category: category as ProductCategory,
    price: Number(price),
    image_url,
    stock: Number(stock),
    brand,
    dietary: dietary ? dietary.split("|").filter(Boolean) : [],
    unitType: unitType === "weight" ? "weight" : "package",
    unitOptions: unitOptions ? unitOptions.split("|").filter(Boolean) : ["1 pack"],
    variantPrices: variantPrices ? JSON.parse(variantPrices) as Record<string, number> : { "1 pack": Number(price) },
    reviews: []
  };
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current);
  return cells;
}

function orderMapUrl(order: Order) {
  const { latitude, longitude } = order.delivery_address;
  const query = typeof latitude === "number" && typeof longitude === "number"
    ? `${latitude},${longitude}`
    : `${order.delivery_address.line1}, ${order.delivery_address.line2}, ${order.delivery_address.city}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function buildDailyRevenue(orders: Order[]) {
  const groups = new Map<string, number>();
  orders.forEach((order) => {
    const day = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(new Date(order.created_at));
    groups.set(day, (groups.get(day) ?? 0) + order.total_amount);
  });
  return Array.from(groups, ([day, revenue]) => ({ day, revenue }));
}

function buildTopSelling(orders: Order[]) {
  const groups = new Map<string, number>();
  orders.forEach((order) => {
    order.items_ordered.split(",").forEach((item) => {
      const match = item.trim().match(/^(.*) x (\d+)$/);
      if (match) {
        groups.set(match[1], (groups.get(match[1]) ?? 0) + Number(match[2]));
      }
    });
  });
  return Array.from(groups, ([name, quantity]) => ({ name: name.split(" ")[0], quantity })).slice(0, 5);
}

function buildPeakHours(orders: Order[]) {
  const groups = new Map<string, number>();
  orders.forEach((order) => {
    const hour = new Intl.DateTimeFormat("en-IN", { hour: "2-digit", hour12: false }).format(new Date(order.created_at));
    groups.set(hour, (groups.get(hour) ?? 0) + 1);
  });
  return Array.from(groups, ([hour, orders]) => ({ hour, orders }));
}

function playNotificationSound() {
  const browserWindow = window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };
  const AudioContextConstructor = browserWindow.AudioContext || browserWindow.webkitAudioContext;

  if (!AudioContextConstructor) {
    return;
  }

  const audio = new AudioContextConstructor();
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.frequency.value = 880;
  gain.gain.value = 0.04;
  oscillator.start();
  oscillator.stop(audio.currentTime + 0.16);
}
