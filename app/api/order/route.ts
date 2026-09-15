import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { syncContactToGoHighLevel } from '@/lib/gohighlevel';
import { logger } from '@/lib/logger';

type OrderItemPayload = {
  sku: string;
  quantity: number;
  price: number;
};

type OrderRequestPayload = {
  items: OrderItemPayload[];
};

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
            } catch {
              // Safely ignore errors if the browser blocks setting cookies here
            }
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const { items } = (await request.json()) as OrderRequestPayload;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([{ user_id: user.id, user_email: user.email ?? null, status: 'pending' }])
      .select()
      .single();

    if (orderError) throw orderError;

    const orderItems = items.map((item: OrderItemPayload) => ({
      order_id: order.id,
      sku: item.sku,
      quantity: item.quantity,
      price_at_purchase: item.price
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) throw itemsError;

    // Decrement stock for each purchased item. This runs via a
    // SECURITY DEFINER RPC (not a direct table update) because
    // products writes are admin-only under RLS; failures here are
    // logged but never block order submission — the order itself
    // already succeeded and stock can be reconciled by an admin.
    await Promise.all(
      items.map((item) =>
        supabase
          .rpc('decrement_product_stock', { p_sku: item.sku, p_qty: item.quantity })
          .then(({ error }) => {
            if (error) {
              logger.error('Stock decrement failed', { sku: item.sku, error: error.message });
            }
          })
      )
    );

    if (user.email) {
      // Non-blocking: CRM sync failures must never break order submission.
      syncContactToGoHighLevel({ email: user.email, tags: ['GCore Order'], source: 'GCore Order' }).catch(() => {});
    }

    return NextResponse.json({ success: true, orderId: order.id });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to submit order";
    logger.error('Order submission failed', { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}