export type AdminOrderItem = {
  sku: string;
  quantity: number;
  price_at_purchase: number;
};

export type AdminOrderSummary = {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  updated_at?: string;
  order_items: AdminOrderItem[];
};

export type AdminCatalogRecord = {
  sku: string;
  name: string;
  base_price: number;
  quantity_on_hand?: number;
  status?: string;
};

export type AdminCatalogPayloadItem = {
  sku?: string;
  name?: string;
  base_price?: number;
  price?: number;
  quantity_on_hand?: number;
};