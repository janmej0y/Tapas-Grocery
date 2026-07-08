import { promoCodes, initialProducts } from "@/lib/mock-data";
import { calculateDeliveryFee, FREE_DELIVERY_THRESHOLD, LOCAL_FREE_DELIVERY_RADIUS_KM, LOCAL_FREE_DELIVERY_THRESHOLD, MAX_DELIVERY_DISTANCE_KM, STORE_RADIUS_KM } from "@/lib/delivery";
import { storeCategories } from "@/lib/catalog";
import { formatCurrency } from "@/lib/format";
import type { Product } from "@/lib/types";

const MAX_LISTED_PRODUCTS = 6;

type Rule = {
  test: (message: string) => boolean;
  answer: (message: string) => string;
};

function contains(message: string, ...keywords: string[]) {
  return keywords.some((keyword) => {
    if (keyword.includes(" ")) {
      // Multi-word phrases: plain substring match is fine, low collision risk.
      return message.includes(keyword);
    }
    // Single words: match on a word boundary so short keywords (e.g. "cod")
    // don't accidentally match inside a longer word (e.g. "codes").
    return new RegExp(`\\b${keyword}\\b`).test(message);
  });
}

function findProductMatches(message: string): Product[] {
  const words = message
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);

  if (words.length === 0) {
    return [];
  }

  const scored = initialProducts
    .map((product) => {
      const haystack = `${product.name} ${product.brand} ${product.dietary.join(" ")}`.toLowerCase();
      const score = words.reduce((total, word) => (haystack.includes(word) ? total + 1 : total), 0);
      return { product, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, MAX_LISTED_PRODUCTS).map((entry) => entry.product);
}

function describeProduct(product: Product) {
  const stockText = product.stock > 0 ? `${product.stock} ${product.unitType === "weight" ? "units" : "in stock"}` : "currently out of stock";
  return `${product.name} (${product.brand}) — ${formatCurrency(product.price)} for ${product.unitOptions[0]}, ${stockText}`;
}

function listCategoryNames() {
  return storeCategories
    .filter((category) => category.slug !== "all")
    .map((category) => category.label)
    .join(", ");
}

const rules: Rule[] = [
  {
    test: (m) => contains(m, "hi", "hello", "hey", "namaste", "hola"),
    answer: () =>
      "Hello! I'm the Tapas Grocery Store assistant. Ask me about product prices, stock, delivery charges, promo codes, payment options, or your order status."
  },
  {
    test: (m) => contains(m, "thank", "thanks", "thank you"),
    answer: () => "You're welcome! Let me know if there's anything else you'd like to check before you order."
  },
  {
    test: (m) => contains(m, "bye", "goodbye", "see you"),
    answer: () => "Thanks for shopping with Tapas Grocery Store! Come back anytime you need groceries delivered fast."
  },

  // ---- Delivery ----
  {
    test: (m) => contains(m, "delivery fee", "delivery charge", "shipping fee", "shipping cost", "delivery cost"),
    answer: () =>
      `Delivery within ${STORE_RADIUS_KM * 1000}m costs ₹3. Beyond that, ₹1 is added for every extra 100 meters. ` +
      `Orders above ₹${FREE_DELIVERY_THRESHOLD} get free delivery anywhere within our service area, and orders above ₹${LOCAL_FREE_DELIVERY_THRESHOLD} get free delivery within ${LOCAL_FREE_DELIVERY_RADIUS_KM}km. ` +
      `We deliver up to ${MAX_DELIVERY_DISTANCE_KM}km from the store.`
  },
  {
    test: (m) => contains(m, "free delivery"),
    answer: () =>
      `Free delivery kicks in automatically once your cart total is ₹${FREE_DELIVERY_THRESHOLD} or more, anywhere within ${MAX_DELIVERY_DISTANCE_KM}km. ` +
      `If you're within ${LOCAL_FREE_DELIVERY_RADIUS_KM}km of the store, free delivery starts at just ₹${LOCAL_FREE_DELIVERY_THRESHOLD}.`
  },
  {
    test: (m) => contains(m, "how far", "delivery area", "delivery range", "delivery radius", "deliver to my", "do you deliver"),
    answer: () => `We deliver within ${MAX_DELIVERY_DISTANCE_KM}km of Tapas Grocery Store, Hatimuri. Enter your address at checkout and we'll calculate the exact fee for your location.`
  },
  {
    test: (m) => contains(m, "how long", "delivery time", "eta", "when will i get", "how much time"),
    answer: () => "Delivery time depends on your distance from the store and current order volume. Once you place an order, you'll see an estimated delivery time on your order tracking page, and the store owner may update it as your order is prepared."
  },
  {
    test: (m) => contains(m, "track", "where is my order", "order status"),
    answer: () =>
      "You can track your order from the Account page — open your order and you'll see its current status: Pending, Accepted, Preparing, Out for delivery, Delivered, Cancelled, or Refunded, along with the live delivery ETA."
  },

  // ---- Payment ----
  {
    test: (m) => contains(m, "payment method", "how to pay", "pay online", "upi", "credit card", "debit card", "net banking", "netbanking"),
    answer: () =>
      "Right now only Cash on Delivery (COD) is available — you pay in cash when your order arrives. Online payment (UPI/Card/NetBanking) is temporarily disabled and will open once Razorpay verification is complete."
  },
  {
    test: (m) => contains(m, "cash on delivery", "cod"),
    answer: () => "Yes, Cash on Delivery is our only active payment method right now — simply pay the delivery agent in cash when your order arrives."
  },

  // ---- Promo codes ----
  {
    test: (m) => promoCodes.some((promo) => contains(m, promo.code.toLowerCase())),
    answer: (m) => {
      const promo = promoCodes.find((item) => contains(m, item.code.toLowerCase()));
      if (!promo) {
        return "I couldn't find that promo code.";
      }
      if (!promo.active) {
        return `${promo.code} is not currently active.`;
      }
      return `${promo.code}: ${promo.description}. Minimum cart total is ₹${promo.minCartTotal}. Apply it in the "Promo code" box at checkout.`;
    }
  },
  {
    test: (m) => contains(m, "promo", "coupon", "discount code", "offer code", "voucher"),
    answer: () => {
      const active = promoCodes.filter((promo) => promo.active);
      if (active.length === 0) {
        return "There are no active promo codes right now. Check back soon for new offers!";
      }
      const lines = active
        .map((promo) => `• ${promo.code} — ${promo.description} (min. cart ₹${promo.minCartTotal})`)
        .join("\n");
      return `Here are our current promo codes:\n${lines}\nApply a code in the "Promo code" box at checkout before placing your order.`;
    }
  },
  {
    test: (m) => contains(m, "discount", "offer", "sale", "deal"),
    answer: () =>
      "We regularly run promo codes and product deals — look for the 'Deal' badge on product cards, or ask me to list our current promo codes. Discounts are automatically capped so they never exceed your cart total."
  },

  // ---- Account / login ----
  {
    test: (m) => contains(m, "create account", "create an account", "sign up", "signup", "register", "how to login", "how do i login", "log in", "login"),
    answer: () =>
      "You can create an account with your email and a password (minimum 6 characters), or sign in instantly with Google, from the Login page. You don't need an account to browse — only to save your order history and addresses."
  },
  {
    test: (m) => contains(m, "recruiter", "demo account", "demo mode"),
    answer: () =>
      "The Recruiter Demo Login lets you browse the entire storefront — products, cart, checkout flow — without creating a real account. It's view-only: you can add items to your cart, but placing a real order and saving addresses are disabled in demo mode."
  },
  {
    test: (m) => contains(m, "forgot password", "reset password", "change password"),
    answer: () => "Password resets are handled through your email sign-in provider (Supabase auth) or through Google if you signed in with Google. If you're stuck, try signing in with Google using the same email you used to sign up."
  },

  // ---- Policies / returns / refunds ----
  {
    test: (m) => contains(m, "return", "refund", "cancel my order", "cancel order"),
    answer: () =>
      "You can request a refund for a cancelled, missing, or damaged order. The store owner reviews each request from the admin dashboard and can approve, reject, or mark it as refunded — you'll see the updated refund status on your order page."
  },
  {
    test: (m) => contains(m, "privacy", "my data", "personal information"),
    answer: () =>
      "Your phone number, address, order history, and delivery location are used only for delivering your orders, providing support, and managing your account — nothing more."
  },
  {
    test: (m) => contains(m, "terms", "policy", "policies"),
    answer: () => "You can read our full Delivery, Refund, Privacy, and Terms of Use policies on the Policies page, linked in the site menu."
  },

  // ---- Store info ----
  {
    test: (m) => contains(m, "store hours", "opening hours", "what time", "open now", "closing time"),
    answer: () => "Tapas Grocery Store has been serving Hatimuri locally since 2019. For exact store hours, please check with the store directly — our online storefront is open for browsing and ordering anytime."
  },
  {
    test: (m) => contains(m, "where are you located", "your address", "store location", "where is the store"),
    answer: () => "Tapas Grocery Store is located in Hatimuri, and we deliver to addresses within 20km of the store."
  },
  {
    test: (m) => contains(m, "contact", "phone number", "support number", "customer care"),
    answer: () => "For order-specific help, please open your order from the Account page — it has live status and delivery details. For anything else, please reach out to the store directly."
  },
  {
    test: (m) => contains(m, "category", "categories", "what do you sell", "what products", "what do you have"),
    answer: () => `We stock a wide range of products across these categories: ${listCategoryNames()}. Ask me about a specific product, brand, or category and I'll check what's available.`
  },
  {
    test: (m) => contains(m, "recipe", "cook", "how to make", "what should i cook"),
    answer: () =>
      "I can't build full recipes yet, but I can help you find the ingredients — tell me a dish or ingredient (like 'noodles' or 'rice') and I'll check what's in stock for it."
  },
  {
    test: (m) => contains(m, "blocked", "banned", "my number is blocked"),
    answer: () => "If your mobile number has been blocked, orders can't be placed with it. This is usually done by the store for policy reasons — please contact the store directly to resolve it."
  }
];

export function getAssistantAnswer(rawMessage: string): string {
  const message = rawMessage.trim().toLowerCase();

  if (!message) {
    return "Ask me about groceries, prices, stock, delivery fees, promo codes, payment options, or your order status.";
  }

  for (const rule of rules) {
    if (rule.test(message)) {
      return rule.answer(message);
    }
  }

  // Product/price/stock lookup as a fallback before the generic catch-all,
  // since it needs a real text match rather than a fixed keyword list.
  const isStockQuestion = contains(message, "stock", "available", "have any", "do you have", "is there");
  const isPriceQuestion = contains(message, "price", "cost", "how much");
  const matches = findProductMatches(message);

  if (matches.length > 0) {
    const lines = matches.map(describeProduct).join("\n");

    if (isPriceQuestion) {
      return `Here's what I found:\n${lines}`;
    }

    if (isStockQuestion) {
      const inStock = matches.filter((product) => product.stock > 0);
      if (inStock.length === 0) {
        return `${matches[0].name} is currently out of stock. Check back soon, or browse similar products in the ${matches[0].brand} range.`;
      }
      return `Yes! Here's what's available:\n${lines}`;
    }

    return `Here's what I found in our catalog:\n${lines}`;
  }

  return (
    "I couldn't find an exact match for that. Try asking about a specific product name, a category " +
    `(${listCategoryNames()}), delivery fees, promo codes, payment methods, or your order status — ` +
    "or use the suggestions below to get started."
  );
}

export const assistantSuggestions: string[] = [
  "What is the delivery fee?",
  "Do you have any active promo codes?",
  "What payment methods can I use?",
  "Is rice in stock?",
  "How much does sugar cost?",
  "How do I track my order?",
  "What is your return and refund policy?",
  "What product categories do you have?",
  "How do I create an account?",
  "Do you deliver to my area?"
];
