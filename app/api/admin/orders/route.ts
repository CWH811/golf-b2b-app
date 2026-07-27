import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, user_id, status, created_at, order_items(id, sku, quantity, price_at_purchase)')
      .order('created_at', { ascending: false });

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
