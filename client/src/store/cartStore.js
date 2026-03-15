import { create } from "zustand";

export const useCartStore = create((set, get) => ({
  items: [],

  addItem: (product) => {
    const items = get().items;
    const existingItem = items.find((item) => item.productId === product.id);

    if (existingItem) {
      set({
        items: items.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        ),
      });
    } else {
      set({
        items: [
          ...items,
          {
            productId: product.id,
            name: product.name,
            barcode: product.barcode,
            price: product.price,
            taxRate: product.taxRate || 0,
            quantity: 1,
          },
        ],
      });
    }
  },

  removeItem: (productId) => {
    set({
      items: get().items.filter((item) => item.productId !== productId),
    });
  },

  updateQty: (productId, qty) => {
    if (qty <= 0) {
      get().removeItem(productId);
      return;
    }

    set({
      items: get().items.map((item) =>
        item.productId === productId ? { ...item, quantity: qty } : item,
      ),
    });
  },

  clearCart: () => {
    set({ items: [] });
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
