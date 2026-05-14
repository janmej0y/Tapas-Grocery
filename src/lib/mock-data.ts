import type { CustomerAccount, DeliveryAgent, Order, Product, PromoCode } from "@/lib/types";

export const initialProducts: Product[] = [
  {
    id: "p-101",
    name: "Gobindobhog Rice",
    category: "grocery",
    price: 72,
    image_url: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80",
    stock: 45,
    brand: "Tapas Select",
    dietary: ["organic"],
    unitType: "weight",
    unitOptions: ["500 g", "1 kg", "5 kg"],
    variantPrices: { "500 g": 42, "1 kg": 72, "5 kg": 340 },
    reviews: [
      {
        id: "rev-101",
        productId: "p-101",
        customerName: "Mita Roy",
        rating: 5,
        comment: "Fresh rice and good aroma.",
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
      }
    ]
  },
  {
    id: "p-102",
    name: "Mustard Oil",
    category: "grocery",
    price: 155,
    image_url: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=800&q=80",
    stock: 28,
    brand: "Bengal Mill",
    dietary: ["cold-pressed"],
    unitType: "package",
    unitOptions: ["1 bottle", "2 bottles", "5 bottles"],
    variantPrices: { "1 bottle": 155, "2 bottles": 300, "5 bottles": 730 },
    reviews: []
  },
  {
    id: "p-103",
    name: "Masala Tea Pack",
    category: "grocery",
    price: 98,
    image_url: "https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?auto=format&fit=crop&w=800&q=80",
    stock: 36,
    brand: "Morning Cup",
    dietary: ["sugar-free"],
    unitType: "package",
    unitOptions: ["1 pack", "2 packs", "4 packs"],
    variantPrices: { "1 pack": 98, "2 packs": 190, "4 packs": 360 },
    reviews: []
  },
  {
    id: "p-201",
    name: "Bengali Short Stories",
    category: "books",
    price: 180,
    image_url: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80",
    stock: 14,
    brand: "College Street",
    dietary: [],
    unitType: "package",
    unitOptions: ["1 book", "2 books"],
    variantPrices: { "1 book": 180, "2 books": 350 },
    reviews: []
  },
  {
    id: "p-202",
    name: "School Notebook Set",
    category: "books",
    price: 120,
    image_url: "https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&w=800&q=80",
    stock: 52,
    brand: "Scholar",
    dietary: [],
    unitType: "package",
    unitOptions: ["1 set", "2 sets", "5 sets"],
    variantPrices: { "1 set": 120, "2 sets": 235, "5 sets": 560 },
    reviews: []
  },
  {
    id: "p-301",
    name: "Aloe Vera Gel",
    category: "cosmetics",
    price: 140,
    image_url: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80",
    stock: 21,
    brand: "GreenGlow",
    dietary: ["herbal"],
    unitType: "package",
    unitOptions: ["1 tube", "2 tubes"],
    variantPrices: { "1 tube": 140, "2 tubes": 270 },
    reviews: []
  },
  {
    id: "p-302",
    name: "Herbal Face Wash",
    category: "cosmetics",
    price: 165,
    image_url: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80",
    stock: 18,
    brand: "PureCare",
    dietary: ["herbal"],
    unitType: "package",
    unitOptions: ["1 bottle", "2 bottles"],
    variantPrices: { "1 bottle": 165, "2 bottles": 320 },
    reviews: []
  }
];

export const initialOrders: Order[] = [
  {
    order_id: "ORD-2401",
    customer_name: "Mita Roy",
    customer_phone: "9876543210",
    delivery_address: {
      id: "addr-mita",
      label: "Home",
      receiverName: "Mita Roy",
      phone: "9876543210",
      line1: "12 Station Road",
      line2: "Flat 2B",
      city: "Kolkata",
      state: "West Bengal",
      pincode: "700001",
      landmark: "Near market gate",
      distanceKm: 0.8
    },
    items_ordered: "Gobindobhog Rice (1 kg) x 2, Masala Tea Pack (1 pack) x 1",
    total_amount: 245,
    subtotal: 245,
    discount_amount: 0,
    payment_method: "UPI",
    payment_status: "Paid",
    delivery_fee: 0,
    delivery_distance: 0.8,
    status: "Preparing",
    assigned_agent_id: "agent-1",
    delivery_eta: "25 minutes",
    refund_status: "Not requested",
    invoice_number: "INV-2401",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString()
  },
  {
    order_id: "ORD-2402",
    customer_name: "Rahul Das",
    customer_phone: "9123456780",
    delivery_address: {
      id: "addr-rahul",
      label: "Work",
      receiverName: "Rahul Das",
      phone: "9123456780",
      line1: "48 College Street",
      line2: "Shop floor",
      city: "Kolkata",
      state: "West Bengal",
      pincode: "700073",
      landmark: "Book lane",
      distanceKm: 1.4
    },
    items_ordered: "School Notebook Set (1 set) x 1, Aloe Vera Gel (1 tube) x 1",
    total_amount: 280,
    subtotal: 260,
    discount_amount: 0,
    payment_method: "COD",
    payment_status: "Pending",
    delivery_fee: 20,
    delivery_distance: 1.4,
    status: "Pending",
    assigned_agent_id: undefined,
    delivery_eta: "Waiting for owner confirmation",
    refund_status: "Not requested",
    invoice_number: "INV-2402",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString()
  }
];

export const deliveryAgents: DeliveryAgent[] = [
  {
    id: "agent-1",
    name: "Suman Pal",
    phone: "9000011111",
    active: true
  },
  {
    id: "agent-2",
    name: "Arif Khan",
    phone: "9000022222",
    active: true
  }
];

export const promoCodes: PromoCode[] = [
  {
    code: "TAPAS10",
    type: "percentage",
    value: 10,
    minCartTotal: 200,
    description: "10% off orders above ₹200",
    active: true
  },
  {
    code: "LOCAL50",
    type: "flat",
    value: 50,
    minCartTotal: 500,
    description: "₹50 off weekly grocery baskets",
    active: true
  }
];

export const demoCustomer: CustomerAccount = {
  id: "cus-demo",
  name: "Tapas Customer",
  phone: "9876543210",
  isPhoneVerified: false,
  isBlocked: false,
  addresses: [
    {
      id: "addr-home",
      label: "Home",
      receiverName: "Tapas Customer",
      phone: "9876543210",
      line1: "12 Station Road",
      line2: "Flat 2B",
      city: "Kolkata",
      state: "West Bengal",
      pincode: "700001",
      landmark: "Near market gate",
      distanceKm: 0.8
    },
    {
      id: "addr-work",
      label: "Work",
      receiverName: "Tapas Customer",
      phone: "9876543210",
      line1: "48 College Street",
      line2: "Office 3",
      city: "Kolkata",
      state: "West Bengal",
      pincode: "700073",
      landmark: "Book lane",
      distanceKm: 1.4
    }
  ],
  orderIds: ["ORD-2401"]
};
