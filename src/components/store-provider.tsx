"use client";

import { createContext, useContext, useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { isAdminPhone, normalizeLocalPhone } from "@/lib/admin-access";
import { defaultCustomer, deliveryAgents, initialOrders, initialProducts } from "@/lib/mock-data";
import type { AdminActivity, CartItem, CustomerAccount, DeliveryAgent, Order, OrderStatus, Product, ProductReview, RefundStatus, UserAddress } from "@/lib/types";

type ProductInput = Omit<Product, "id">;
type StoredState = {
  blockedPhones: string[];
  cart: CartItem[];
  customer: CustomerAccount;
  activityLog: AdminActivity[];
  orders: Order[];
  products: Product[];
};

type StoreContextValue = {
  products: Product[];
  cart: CartItem[];
  orders: Order[];
  customer: CustomerAccount;
  blockedPhones: string[];
  activityLog: AdminActivity[];
  agents: DeliveryAgent[];
  lowStockProducts: Product[];
  logoutCustomer: () => void;
  updateCustomerAddress: (address: UserAddress) => void;
  toggleFavoriteProduct: (productId: string) => void;
  blockPhone: (phone: string) => void;
  unblockPhone: (phone: string) => void;
  addToCart: (product: Product, selectedUnit: string, quantity: number) => void;
  updateQuantity: (productId: string, selectedUnit: string, quantity: number) => void;
  removeFromCart: (productId: string, selectedUnit: string) => void;
  clearCart: () => void;
  addProduct: (product: ProductInput) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (productId: string) => void;
  importProducts: (products: Product[]) => void;
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
  const [customer, setCustomer] = useState<CustomerAccount>(defaultCustomer);
  const [blockedPhones, setBlockedPhones] = useState<string[]>([]);
  const [activityLog, setActivityLog] = useState<AdminActivity[]>([]);
  const lowStockProducts = useMemo(() => products.filter((product) => product.stock <= (product.minStock ?? 10)), [products]);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored) as StoredState;
      setCart(parsed.cart ?? []);
      setProducts(mergeProductsWithSeedCatalog(parsed.products));
      setOrders(parsed.orders ?? initialOrders);
      setCustomer({
        ...(parsed.customer ?? defaultCustomer),
        favoriteProductIds: (parsed.customer ?? defaultCustomer).favoriteProductIds ?? []
      });
      setBlockedPhones(parsed.blockedPhones ?? []);
      setActivityLog(parsed.activityLog ?? []);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    fetch("/api/products")
      .then((response) => response.json())
      .then((data: { source?: string; products?: Product[] }) => {
        if (data.source === "supabase" && data.products) {
          setProducts(mergeSupabaseProductsWithSeedCatalog(data.products));
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const nextState: StoredState = {
      blockedPhones,
      cart,
      customer,
      activityLog,
      orders,
      products
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  }, [activityLog, blockedPhones, cart, customer, orders, products]);

  const value = useMemo<StoreContextValue>(
    () => ({
      products,
      cart,
      orders,
      customer,
      blockedPhones,
      activityLog,
      agents: deliveryAgents,
      lowStockProducts,
      logoutCustomer: () => {
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
        pushActivity(setActivityLog, "Address saved", `${address.label} address saved for ${address.receiverName}`);
      },
      toggleFavoriteProduct: (productId) => {
        setCustomer((current) => {
          const exists = current.favoriteProductIds.includes(productId);
          return {
            ...current,
            favoriteProductIds: exists
              ? current.favoriteProductIds.filter((id) => id !== productId)
              : [productId, ...current.favoriteProductIds]
          };
        });
      },
      blockPhone: (phone) => {
        const normalizedPhone = normalizePhone(phone);
        if (!normalizedPhone) {
          return;
        }

        if (isAdminPhone(normalizedPhone)) {
          return;
        }

        setBlockedPhones((items) => Array.from(new Set([...items, normalizedPhone])));
        setCustomer((current) =>
          current.phone === normalizedPhone ? { ...current, isBlocked: true } : current
        );
        pushActivity(setActivityLog, "User blocked", `Phone ${normalizedPhone} was blocked`);
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
        pushActivity(setActivityLog, "User unblocked", `Phone ${normalizedPhone} was unblocked`);
        fetch("/api/users/block", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: normalizedPhone, blocked: false })
        }).catch(() => undefined);
      },
      addToCart: (product, selectedUnit, quantity) => {
        const nextQuantity = Math.min(product.stock, Math.max(1, Math.floor(quantity || 1)));
        const key = getCartLineKey(product.id, selectedUnit);

        setCart((items) => {
          const existing = items.find((item) => getCartLineKey(item.product.id, item.selectedUnit) === key);

          if (existing) {
            return items.map((item) =>
              getCartLineKey(item.product.id, item.selectedUnit) === key
                ? { ...item, quantity: Math.min(product.stock, item.quantity + nextQuantity) }
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
                ? { ...item, quantity: Math.min(item.product.stock, nextQuantity) }
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
        pushActivity(setActivityLog, "Product added", product.name);
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
        pushActivity(setActivityLog, "Product updated", product.name);
        fetch("/api/products", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(product)
        }).catch(() => undefined);
      },
      deleteProduct: (productId) => {
        const deletedProduct = products.find((item) => item.id === productId);
        setProducts((items) => items.filter((item) => item.id !== productId));
        pushActivity(setActivityLog, "Product deleted", deletedProduct?.name ?? productId);
        fetch("/api/products", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: productId })
        }).catch(() => undefined);
      },
      importProducts: (nextProducts) => {
        setProducts((items) => {
          const merged = new Map(items.map((item) => [item.id, item]));
          nextProducts.forEach((product) => merged.set(product.id, product));
          return Array.from(merged.values());
        });
        pushActivity(setActivityLog, "Products imported", `${nextProducts.length} products imported from CSV`);
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
        pushActivity(setActivityLog, "Order placed", `${order.order_id} from ${order.customer_name}`);
        window.dispatchEvent(new CustomEvent("tapas:new-order", { detail: order }));
      },
      updateOrderStatus: (orderId, status) => {
        setOrders((items) => items.map((order) => (order.order_id === orderId ? { ...order, status } : order)));
        pushActivity(setActivityLog, "Order status changed", `${orderId} is now ${status}`);
      },
      assignDeliveryAgent: (orderId, agentId) => {
        setOrders((items) =>
          items.map((order) => (order.order_id === orderId ? { ...order, assigned_agent_id: agentId || undefined } : order))
        );
        pushActivity(setActivityLog, "Delivery agent assigned", `${orderId} assigned to ${agentId || "unassigned"}`);
      },
      updateDeliveryEta: (orderId, eta) => {
        setOrders((items) =>
          items.map((order) => (order.order_id === orderId ? { ...order, delivery_eta: eta.trim() || "Waiting for owner confirmation" } : order))
        );
        pushActivity(setActivityLog, "Delivery ETA updated", `${orderId}: ${eta.trim() || "Waiting for owner confirmation"}`);
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
        pushActivity(setActivityLog, "Refund updated", `${orderId}: ${refundStatus}${reason ? ` - ${reason}` : ""}`);
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
        pushActivity(setActivityLog, "Product review added", `Review added for ${productId}`);
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
    [activityLog, blockedPhones, cart, customer, lowStockProducts, orders, products]
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

function mergeProductsWithSeedCatalog(storedProducts: Product[] | undefined) {
  if (!storedProducts?.length) {
    return initialProducts;
  }

  const seedProductsById = new Map(initialProducts.map((product) => [product.id, product]));
  const productsById = new Map(storedProducts.map((product) => {
    const seedProduct = seedProductsById.get(product.id);
    return [
      product.id,
      {
        ...product,
        image_url: shouldUseSeedProductImage(product.image_url) && seedProduct ? seedProduct.image_url : product.image_url
      }
    ];
  }));

  initialProducts.forEach((product) => {
    if (!productsById.has(product.id)) {
      productsById.set(product.id, product);
    }
  });

  return Array.from(productsById.values());
}

function mergeSupabaseProductsWithSeedCatalog(supabaseProducts: Product[]) {
  const productsByName = new Map(initialProducts.map((product) => [normalizeProductName(product.name), product]));

  supabaseProducts.forEach((product) => {
    productsByName.set(normalizeProductName(product.name), product);
  });

  return Array.from(productsByName.values());
}

function normalizeProductName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function shouldUseSeedProductImage(imageUrl: string) {
  const oldVectorExtension = ["s", "v", "g"].join("");
  return imageUrl === `/icon.${oldVectorExtension}` || imageUrl.includes("images.unsplash.com") || imageUrl.startsWith("/product-images/");
}

function normalizePhone(phone: string) {
  return normalizeLocalPhone(phone);
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

function pushActivity(setActivityLog: Dispatch<SetStateAction<AdminActivity[]>>, action: string, details: string) {
  setActivityLog((items) => [
    {
      id: `act-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      action,
      details,
      created_at: new Date().toISOString()
    },
    ...items
  ].slice(0, 80));
}
