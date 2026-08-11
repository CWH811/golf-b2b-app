import { NextResponse } from 'next/server';
import { getAdminUser, isOwnerUser } from '../auth';
import { VALID_ORDER_STATUSES } from '@/src/lib/types/orders';

type OrderItemSummary = {
  sku: string;
  quantity: number;
  price_at_purchase: number;
};

type OrderSummary = {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  order_items: OrderItemSummary[];
};

export async function GET(request: Request) {
  try {
    const { supabase, user, error: authError } = await getAdminUser();
    if (authError || !user || !isOwnerUser(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');

    let query = supabase
      .from('orders')
      .select('id, user_id, status, created_at, order_items(id, sku, quantity, price_at_purchase)');

    if (statusParam) {
      if (!VALID_ORDER_STATUSES.includes(statusParam as (typeof VALID_ORDER_STATUSES)[number])) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${VALID_ORDER_STATUSES.join(', ')}` },
          { status: 400 }
        );
      }
      query = query.eq('status', statusParam);
    }

    const { data: orders, error: ordersError } = await query.order('created_at', { ascending: false });

    if (ordersError) {
      throw ordersError;
    }

    const normalizedOrders = (orders ?? []).map((order) => ({
      id: order.id,
      user_id: order.user_id,
      status: order.status,
      created_at: order.created_at,
      order_items: (order.order_items ?? []).map((item: OrderItemSummary) => ({
        sku: item.sku,
        quantity: item.quantity,
        price_at_purchase: item.price_at_purchase,
      })),
    })) as OrderSummary[];

    return NextResponse.json({ orders: normalizedOrders });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load orders';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
