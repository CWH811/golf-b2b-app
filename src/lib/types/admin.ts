import type { OrderStatus } from './orders';

export type AdminOrderItem = {
  sku: string;
  quantity: number;
  price_at_purchase: number;
};

export type AdminOrderSummary = {
  id: string;
  user_id: string;
  status: OrderStatus;
  created_at: string;
  updated_at?: string;
  order_items: AdminOrderItem[];
};

export type CatalogStatus = 'active' | 'archived';

export type AdminCatalogRecord = {
  sku: string;
  name: string;
  base_price: number;
  quantity_on_hand?: number;
  status?: CatalogStatus;
};

export type AdminCatalogPatchPayload = {
  name?: string;
  base_price?: number;
  quantity_on_hand?: number;
  status?: CatalogStatus;
};

export type AdminCatalogPayloadItem = {
  sku?: string;
  name?: string;
  base_price?: number;
  price?: number;
  quantity_on_hand?: number;
};
