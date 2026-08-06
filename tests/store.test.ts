import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from '@/lib/store';

describe('CartStore', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] });
  });

  describe('addItem', () => {
    it('adds a new item to an empty cart', () => {
      useCartStore.getState().addItem({
        sku: 'SKU-001',
        name: 'Golf Balls (Pack of 12)',
        price: 29.99,
        quantity: 1,
      });

      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0]).toEqual({
        sku: 'SKU-001',
        name: 'Golf Balls (Pack of 12)',
        price: 29.99,
        quantity: 1,
      });
    });

    it('increments quantity when adding an existing SKU', () => {
      const store = useCartStore.getState();
      store.addItem({ sku: 'SKU-001', name: 'Golf Balls', price: 10.0, quantity: 1 });
      store.addItem({ sku: 'SKU-001', name: 'Golf Balls', price: 10.0, quantity: 1 });

      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].quantity).toBe(2);
    });

    it('preserves the original price when incrementing quantity', () => {
      const store = useCartStore.getState();
      store.addItem({ sku: 'SKU-001', name: 'Golf Balls', price: 15.0, quantity: 1 });
      store.addItem({ sku: 'SKU-001', name: 'Golf Balls', price: 15.0, quantity: 1 });

      const items = useCartStore.getState().items;
      expect(items[0].price).toBe(15.0);
    });

    it('adds multiple distinct SKUs as separate items', () => {
      const store = useCartStore.getState();
      store.addItem({ sku: 'SKU-001', name: 'Golf Balls', price: 10.0, quantity: 1 });
      store.addItem({ sku: 'SKU-002', name: 'Golf Tees', price: 5.0, quantity: 1 });

      const items = useCartStore.getState().items;
      expect(items).toHaveLength(2);
    });
  });

  describe('removeItem', () => {
    it('removes an item by SKU', () => {
      const store = useCartStore.getState();
      store.addItem({ sku: 'SKU-001', name: 'Golf Balls', price: 10.0, quantity: 1 });
      store.addItem({ sku: 'SKU-002', name: 'Golf Tees', price: 5.0, quantity: 1 });

      store.removeItem('SKU-001');

      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].sku).toBe('SKU-002');
    });

    it('does nothing when removing a non-existent SKU', () => {
      const store = useCartStore.getState();
      store.addItem({ sku: 'SKU-001', name: 'Golf Balls', price: 10.0, quantity: 1 });

      store.removeItem('NONEXISTENT');

      expect(useCartStore.getState().items).toHaveLength(1);
    });
  });

  describe('clearCart', () => {
    it('empties the cart', () => {
      const store = useCartStore.getState();
      store.addItem({ sku: 'SKU-001', name: 'Golf Balls', price: 10.0, quantity: 1 });

      store.clearCart();

      expect(useCartStore.getState().items).toHaveLength(0);
    });
  });

  describe('getTotal', () => {
    it('returns 0 for an empty cart', () => {
      expect(useCartStore.getState().getTotal()).toBe(0);
    });

    it('sums the price of a single item', () => {
      useCartStore.getState().addItem({
        sku: 'SKU-001',
        name: 'Golf Balls',
        price: 29.99,
        quantity: 1,
      });

      expect(useCartStore.getState().getTotal()).toBe(29.99);
    });

    it('multiplies price by quantity for items with quantity > 1', () => {
      useCartStore.getState().addItem({
        sku: 'SKU-001',
        name: 'Golf Balls',
        price: 10.0,
        quantity: 3,
      });

      expect(useCartStore.getState().getTotal()).toBe(30.0);
    });

    it('sums totals across multiple items', () => {
      const store = useCartStore.getState();
      store.addItem({ sku: 'SKU-001', name: 'Golf Balls', price: 25.0, quantity: 2 });
      store.addItem({ sku: 'SKU-002', name: 'Golf Tees', price: 5.0, quantity: 1 });

      expect(useCartStore.getState().getTotal()).toBe(55.0);
    });
  });
});