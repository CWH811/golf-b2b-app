import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { OrderHistoryRecord, OrderStatus } from '@/src/lib/types/orders';
import { VALID_ORDER_STATUSES } from '@/src/lib/types/orders';

type RawOrderItem = {
  id: string;
  sku: string;
  quantity: number;
  price_at_purchase: number;
  products?: { name: string | null } | { name: string | null }[] | null;
};

type RawOrder = {
  id: string;
  status: string;
  created_at: string;
  updated_at: string | null;
  order_items?: RawOrderItem[] | null;
};

export async function GET() {
  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
            } catch {
              // Ignore write failures during prerender or server context issues.
            }
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, status, created_at, updated_at, order_items(id, sku, quantity, price_at_purchase, products(name))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (ordersError) {
      throw ordersError;
    }

    const normalizedOrders: OrderHistoryRecord[] = (orders ?? []).map((order: RawOrder) => {
      const items = (order.order_items ?? []).map((item) => ({
        id: item.id,
        sku: item.sku,
        name: Array.isArray(item.products)
          ? item.products[0]?.name ?? item.sku
          : item.products?.name ?? item.sku,
        quantity: item.quantity,
        price_at_purchase: item.price_at_purchase,
      }));

      const item_count = items.reduce((sum, item) => sum + item.quantity, 0);
      const total = items.reduce((sum, item) => sum + item.quantity * item.price_at_purchase, 0);

      return {
        id: order.id,
      status: (VALID_ORDER_STATUSES.includes(order.status as OrderStatus) ? (order.status as OrderStatus) : ('pending' as OrderStatus)),
        created_at: order.created_at,
        updated_at: order.updated_at ?? undefined,
        item_count,
        total,
        items,
      } as OrderHistoryRecord;
    });

    return NextResponse.json({ orders: normalizedOrders });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load order history';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}