"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { deliveryAgents, demoCustomer, initialOrders, initialProducts } from "@/lib/mock-data";
import type { CartItem, CustomerAccount, DeliveryAgent, Order, OrderStatus, Product, ProductReview, RefundStatus, UserAddress } from "@/lib/types";

type ProductInput = Omit<Product, "id">;
type StoredState = {
  blockedPhones: string[];
  customer: CustomerAccount;
  orders: Order[];
  products: Product[];
};

type StoreContextValue = {
  products: Product[];
  cart: CartItem[];
  orders: Order[];
  customer: CustomerAccount;
  blockedPhones: string[];
  agents: DeliveryAgent[];
  lowStockProducts: Product[];
  pendingOtp: string;
  sendOtp: (phone: string) => string;
  verifyOtp: (otp: string) => boolean;
  markPhoneVerified: (phone: string) => void;
  logoutCustomer: () => void;
  updateCustomerAddress: (address: UserAddress) => void;
  blockPhone: (phone: string) => void;
  unblockPhone: (phone: string) => void;
  addToCart: (product: Product, selectedUnit: string, quantity: number) => void;
  updateQuantity: (productId: string, selectedUnit: string, quantity: number) => void;
  removeFromCart: (productId: string, selectedUnit: string) => void;
  clearCart: () => void;
  addProduct: (product: ProductInput) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (productId: string) => void;
  addOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  assignDeliveryAgent: (orderId: string, agentId: string) => void;
  updateDeliveryEta: (orderId: string, eta: string) => void;
  updateRefundStatus: (orderId: string, refundStatus: RefundStatus, reason?: string) => void;
  addProductReview: (productId: string, review: Omit<ProductReview, "id" | "created_at" | "productId">) => void;
  reorder: (orderId: string) => void;
};

const StoreContext = createContext<StoreContextValue | null>(null);
const STORAGE_KEY = "tapas-grocery-store-state-v2";

export function StoreProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [customer, setCustomer] = useState<CustomerAccount>(demoCustomer);
  const [blockedPhones, setBlockedPhones] = useState<string[]>([]);
  const [pendingOtp, setPendingOtp] = useState("");
  const [pendingPhone, setPendingPhone] = useState("");
  const lowStockProducts = useMemo(() => products.filter((product) => product.stock <= 10), [products]);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored) as StoredState;
      setProducts(parsed.products ?? initialProducts);
      setOrders(parsed.orders ?? initialOrders);
      setCustomer(parsed.customer ?? demoCustomer);
      setBlockedPhones(parsed.blockedPhones ?? []);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    fetch("/api/products")
      .then((response) => response.json())
      .then((data: { source?: string; products?: Product[] }) => {
        if (data.source === "supabase" && data.products) {
          setProducts(data.products);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const nextState: StoredState = {
      blockedPhones,
      customer,
      orders,
      products
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  }, [blockedPhones, customer, orders, products]);

  const value = useMemo<StoreContextValue>(
    () => ({
      products,
      cart,
      orders,
      customer,
      blockedPhones,
      agents: deliveryAgents,
      lowStockProducts,
      pendingOtp,
      sendOtp: (phone) => {
        const normalizedPhone = normalizePhone(phone);
        const otp = "123456";
        setPendingPhone(normalizedPhone);
        setPendingOtp(otp);
        setCustomer((current) => ({
          ...current,
          phone: normalizedPhone,
          isPhoneVerified: false,
          isBlocked: blockedPhones.includes(normalizedPhone)
        }));
        return otp;
      },
      verifyOtp: (otp) => {
        const isValid = otp === pendingOtp && pendingPhone.length >= 10 && !blockedPhones.includes(pendingPhone);

        if (isValid) {
          setCustomer((current) => ({
            ...current,
            phone: pendingPhone,
            isPhoneVerified: true,
            isBlocked: false,
            addresses: current.addresses.map((address) => ({ ...address, phone: pendingPhone }))
          }));
          setPendingOtp("");
        }

        return isValid;
      },
      markPhoneVerified: (phone) => {
        const normalizedPhone = normalizePhone(phone);
        setCustomer((current) => ({
          ...current,
          phone: normalizedPhone,
          isPhoneVerified: true,
          isBlocked: blockedPhones.includes(normalizedPhone),
          addresses: current.addresses.map((address) => ({ ...address, phone: normalizedPhone }))
        }));
        setPendingOtp("");
      },
      logoutCustomer: () => {
        setCustomer((current) => ({ ...current, isPhoneVerified: false }));
        setCart([]);
      },
      updateCustomerAddress: (address) => {
        setCustomer((current) => {
          const exists = current.addresses.some((item) => item.id === address.id);
          return {
            ...current,
            name: address.receiverName,
            phone: address.phone,
            addresses: exists
              ? current.addresses.map((item) => (item.id === address.id ? address : item))
              : [address, ...current.addresses]
          };
        });
      },
      blockPhone: (phone) => {
        const normalizedPhone = normalizePhone(phone);
        if (!normalizedPhone) {
          return;
        }

        setBlockedPhones((items) => Array.from(new Set([...items, normalizedPhone])));
        setCustomer((current) =>
          current.phone === normalizedPhone ? { ...current, isBlocked: true, isPhoneVerified: false } : current
        );
        fetch("/api/users/block", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: normalizedPhone, blocked: true })
        }).catch(() => undefined);
      },
      unblockPhone: (phone) => {
        const normalizedPhone = normalizePhone(phone);
        setBlockedPhones((items) => items.filter((item) => item !== normalizedPhone));
        setCustomer((current) => (current.phone === normalizedPhone ? { ...current, isBlocked: false } : current));
        fetch("/api/users/block", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: normalizedPhone, blocked: false })
        }).catch(() => undefined);
      },
      addToCart: (product, selectedUnit, quantity) => {
        const nextQuantity = Math.max(1, Math.floor(quantity || 1));
        const key = getCartLineKey(product.id, selectedUnit);

        setCart((items) => {
          const existing = items.find((item) => getCartLineKey(item.product.id, item.selectedUnit) === key);

          if (existing) {
            return items.map((item) =>
              getCartLineKey(item.product.id, item.selectedUnit) === key
                ? { ...item, quantity: item.quantity + nextQuantity }
                : item
            );
          }

          return [...items, { product, selectedUnit, quantity: nextQuantity }];
        });
      },
      updateQuantity: (productId, selectedUnit, quantity) => {
        const key = getCartLineKey(productId, selectedUnit);
        const nextQuantity = Math.floor(quantity);

        setCart((items) =>
          items
            .map((item) =>
              getCartLineKey(item.product.id, item.selectedUnit) === key
                ? { ...item, quantity: nextQuantity }
                : item
            )
            .filter((item) => item.quantity > 0)
        );
      },
      removeFromCart: (productId, selectedUnit) =>
        setCart((items) => {
          const key = getCartLineKey(productId, selectedUnit);
          return items.filter((item) => getCartLineKey(item.product.id, item.selectedUnit) !== key);
        }),
      clearCart: () => setCart([]),
      addProduct: (product) => {
        const localProduct = { ...product, id: `p-${Date.now()}` };
        setProducts((items) => [localProduct, ...items]);
        fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(product)
        })
          .then((response) => response.json())
          .then((data: { source?: string; product?: Product }) => {
            if (data.source === "supabase" && data.product) {
              setProducts((items) => items.map((item) => (item.id === localProduct.id ? data.product! : item)));
            }
          })
          .catch(() => undefined);
      },
      updateProduct: (product) => {
        setProducts((items) => items.map((item) => (item.id === product.id ? product : item)));
        fetch("/api/products", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(product)
        }).catch(() => undefined);
      },
      deleteProduct: (productId) => {
        setProducts((items) => items.filter((item) => item.id !== productId));
        fetch("/api/products", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: productId })
        }).catch(() => undefined);
      },
      addOrder: (order) => {
        setOrders((items) => [order, ...items]);
        setProducts((items) =>
          items.map((product) => {
            const orderedQuantity = getOrderedQuantity(order.items_ordered, product.name);
            return orderedQuantity > 0 ? { ...product, stock: Math.max(0, product.stock - orderedQuantity) } : product;
          })
        );
        setCustomer((current) => ({
          ...current,
          orderIds: Array.from(new Set([order.order_id, ...current.orderIds]))
        }));
        window.dispatchEvent(new CustomEvent("tapas:new-order", { detail: order }));
      },
      updateOrderStatus: (orderId, status) => {
        setOrders((items) => items.map((order) => (order.order_id === orderId ? { ...order, status } : order)));
      },
      assignDeliveryAgent: (orderId, agentId) => {
        setOrders((items) =>
          items.map((order) => (order.order_id === orderId ? { ...order, assigned_agent_id: agentId || undefined } : order))
        );
      },
      updateDeliveryEta: (orderId, eta) => {
        setOrders((items) =>
          items.map((order) => (order.order_id === orderId ? { ...order, delivery_eta: eta.trim() || "Waiting for owner confirmation" } : order))
        );
      },
      updateRefundStatus: (orderId, refundStatus, reason) => {
        setOrders((items) =>
          items.map((order) =>
            order.order_id === orderId
              ? {
                  ...order,
                  cancellation_reason: reason ?? order.cancellation_reason,
                  refund_status: refundStatus,
                  status: refundStatus === "Refunded" ? "Refunded" : refundStatus === "Requested" ? "Cancelled" : order.status
                }
              : order
          )
        );
      },
      addProductReview: (productId, review) => {
        setProducts((items) =>
          items.map((product) =>
            product.id === productId
              ? {
                  ...product,
                  reviews: [
                    {
                      ...review,
                      id: `rev-${Date.now()}`,
                      productId,
                      created_at: new Date().toISOString()
                    },
                    ...product.reviews
                  ]
                }
              : product
          )
        );
      },
      reorder: (orderId) => {
        const order = orders.find((item) => item.order_id === orderId);

        if (!order) {
          return;
        }

        const nextItems = order.items_ordered
          .split(",")
          .map((item) => item.trim().match(/^(.*) \((.*)\) x (\d+)$/))
          .filter(Boolean)
          .flatMap((match) => {
            const product = products.find((item) => item.name === match?.[1]);
            const selectedUnit = match?.[2] ?? product?.unitOptions[0] ?? "1";
            const quantity = Number(match?.[3] ?? 1);
            return product ? [{ product, selectedUnit, quantity }] : [];
          });

        nextItems.forEach(({ product, quantity, selectedUnit }) => {
          setCart((items) => {
            const existing = items.find((item) => item.product.id === product.id && item.selectedUnit === selectedUnit);
            return existing
              ? items.map((item) =>
                  item.product.id === product.id && item.selectedUnit === selectedUnit
                    ? { ...item, quantity: item.quantity + quantity }
                    : item
                )
              : [...items, { product, selectedUnit, quantity }];
          });
        });
      }
    }),
    [blockedPhones, cart, customer, lowStockProducts, orders, pendingOtp, pendingPhone, products]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);

  if (!context) {
    throw new Error("useStore must be used within a StoreProvider.");
  }

  return context;
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "").slice(-10);
}

function getCartLineKey(productId: string, selectedUnit: string) {
  return `${productId}::${selectedUnit.trim().toLowerCase()}`;
}

function getOrderedQuantity(itemsOrdered: string, productName: string) {
  return itemsOrdered.split(",").reduce((total, item) => {
    const match = item.trim().match(/^(.*) \((.*)\) x (\d+)$/);
    return match?.[1] === productName ? total + Number(match[3]) : total;
  }, 0);
}
