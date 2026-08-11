export type OrderStatus = 'pending' | 'fulfilled' | 'shipped' | 'cancelled';

export const VALID_ORDER_STATUSES: OrderStatus[] = ['pending', 'fulfilled', 'shipped', 'cancelled'];

export type OrderHistoryItem = {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  price_at_purchase: number;
};

export type OrderHistoryRecord = {
  id: string;
  status: OrderStatus;
  created_at: string;
  updated_at?: string;
  item_count: number;
  total: number;
  items: OrderHistoryItem[];
};

export type ReorderPayload = {
  items: { sku: string; quantity: number }[];
};