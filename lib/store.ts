import { create } from 'zustand';

export interface CartItem {
  sku: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (sku: string) => void;
  clearCart: () => void;
  getTotal: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  
  addItem: (newItem) => set((state) => {
    const existingItem = state.items.find((item) => item.sku === newItem.sku);
    if (existingItem) {
      return {
        items: state.items.map((item) => 
          item.sku === newItem.sku 
            ? { ...item, quantity: item.quantity + newItem.quantity } 
            : item
        )
      };
    }
    return { items: [...state.items, newItem] };
  }),

  removeItem: (sku) => set((state) => ({
    items: state.items.filter((item) => item.sku !== sku)
  })),

  clearCart: () => set({ items: [] }),

  getTotal: () => {
    return get().items.reduce((total, item) => total + (item.price * item.quantity), 0);
  }
}));