import { create } from "zustand";

const CART_STORAGE_KEY = "pos_cart_items";

const resolveImageUrl = (record) => {
  const candidates = [
    record?.imageUrl,
    record?.imageURL,
    record?.image,
    record?.thumbnail,
    record?.thumbnailUrl,
    record?.photo,
    record?.photoUrl,
    record?.image?.url,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
};

const normalizeCartItem = (item) => ({
  ...item,
  imageUrl: resolveImageUrl(item),
});

// Load cart from localStorage
const loadCart = () => {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    return parsed.map(normalizeCartItem);
  } catch {
    return [];
  }
};

// Save cart to localStorage
const saveCart = (items) => {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {}
};

export const useCartStore = create((set, get) => ({
  items: loadCart(),

  addItem: (product) => {
    const items = get().items;
    const existingItem = items.find((item) => item.productId === product.id);
    const productImageUrl = resolveImageUrl(product);
    let newItems;
    if (existingItem) {
      newItems = items.map((item) =>
        item.productId === product.id
          ? {
              ...item,
              quantity: item.quantity + 1,
              imageUrl: item.imageUrl || productImageUrl,
            }
          : item,
      );
    } else {
      newItems = [
        ...items,
        {
          productId: product.id,
          name: product.productName || product.name,
          barcode: product.barcode,
          imageUrl: productImageUrl,
          price: product.price,
          taxRate: product.taxRate || 0,
          quantity: 1,
        },
      ];
    }
    set({ items: newItems });
    saveCart(newItems);
  },

  removeItem: (productId) => {
    const newItems = get().items.filter((item) => item.productId !== productId);
    set({ items: newItems });
    saveCart(newItems);
  },

  updateQty: (productId, qty) => {
    if (qty <= 0) {
      get().removeItem(productId);
      return;
    }
    const newItems = get().items.map((item) =>
      item.productId === productId ? { ...item, quantity: qty } : item,
    );
    set({ items: newItems });
    saveCart(newItems);
  },

  clearCart: () => {
    set({ items: [] });
    saveCart([]);
  },

  subtotal: () => {
    return get().items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
  },

  taxTotal: () => {
    return get().items.reduce(
      (sum, item) => sum + (item.price * item.quantity * item.taxRate) / 100,
      0,
    );
  },

  grandTotal: (discount = 0) => {
    const subtotal = get().subtotal();
    const taxTotal = get().taxTotal();
    return subtotal + taxTotal - discount;
  },

  itemCount: () => {
    return get().items.reduce((count, item) => count + item.quantity, 0);
  },
}));

// Optional: Listen for storage events to sync cart across tabs
window.addEventListener("storage", (e) => {
  if (e.key === CART_STORAGE_KEY) {
    useCartStore.setState({ items: loadCart() });
  }
});
