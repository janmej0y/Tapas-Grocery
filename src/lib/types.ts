export type ProductCategory = "grocery" | "books" | "cosmetics";

export type Product = {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  image_url: string;
  stock: number;
  brand: string;
  dietary: string[];
  unitType: "weight" | "package";
  unitOptions: string[];
  variantPrices: Record<string, number>;
  reviews: ProductReview[];
};

export type CartItem = {
  product: Product;
  selectedUnit: string;
  quantity: number;
};

export type OrderStatus = "Pending" | "Accepted" | "Preparing" | "Out for delivery" | "Delivered" | "Cancelled" | "Refunded";
export type RefundStatus = "Not requested" | "Requested" | "Approved" | "Rejected" | "Refunded";

export type Order = {
  order_id: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: UserAddress;
  items_ordered: string;
  total_amount: number;
  subtotal: number;
  discount_amount: number;
  payment_method: "COD" | "UPI" | "Card" | "NetBanking";
  payment_status: "Pending" | "Paid" | "Failed";
  delivery_fee: number;
  delivery_distance: number;
  status: OrderStatus;
  assigned_agent_id?: string;
  delivery_eta: string;
  refund_status: RefundStatus;
  cancellation_reason?: string;
  invoice_number: string;
  created_at: string;
};

export type DeliveryAgent = {
  id: string;
  name: string;
  phone: string;
  active: boolean;
};

export type ProductReview = {
  id: string;
  productId: string;
  customerName: string;
  rating: number;
  comment: string;
  created_at: string;
};

export type PromoCode = {
  code: string;
  type: "percentage" | "flat";
  value: number;
  minCartTotal: number;
  description: string;
  active: boolean;
};

export type UserAddress = {
  id: string;
  label: "Home" | "Work" | "Other";
  receiverName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  landmark: string;
  distanceKm: number;
};

export type CustomerAccount = {
  id: string;
  name: string;
  phone: string;
  isPhoneVerified: boolean;
  isBlocked: boolean;
  addresses: UserAddress[];
  orderIds: string[];
};

export type DeliveryResult =
  | {
      available: true;
      fee: number;
      message: string;
    }
  | {
      available: false;
      fee: 0;
      message: string;
    };
