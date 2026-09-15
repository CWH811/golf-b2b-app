import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';

type RawSourceOrder = {
  id: string;
  order_items?: { sku: string; quantity: number }[] | null;
};

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let id: string | undefined;
  try {
    ({ id } = await params);

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

    // Fetch the source order and hard-scope to the authenticated buyer
    const { data: sourceOrder, error: sourceError } = await supabase
      .from('orders')
      .select('id, order_items(sku, quantity)')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (sourceError) {
      throw sourceError;
    }

    if (!sourceOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const sourceItems = ((sourceOrder as RawSourceOrder).order_items ?? []).filter(
      (item) => item.sku && item.quantity > 0
    );

    if (sourceItems.length === 0) {
      return NextResponse.json({ error: 'Source order has no items to reorder' }, { status: 400 });
    }

    // Create the new order
    const { data: newOrder, error: orderError } = await supabase
      .from('orders')
      .insert([{ user_id: user.id, user_email: user.email ?? null, status: 'pending' }])
      .select('id')
      .single();

    if (orderError) {
      throw orderError;
    }

    // Copy source items into the new order
    const newOrderItems = sourceItems.map((item) => ({
      order_id: newOrder.id,
      sku: item.sku,
      quantity: item.quantity,
      price_at_purchase: 0, // Re-captured at checkout; snapshot is handled by the order submission flow
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(newOrderItems);

    if (itemsError) {
      throw itemsError;
    }

    // Decrement stock for the reordered items too, same as a fresh
    // order submission — best-effort, never blocks the response.
    await Promise.all(
      sourceItems.map((item) =>
        supabase
          .rpc('decrement_product_stock', { p_sku: item.sku, p_qty: item.quantity })
          .then(({ error }) => {
            if (error) {
              logger.error('Stock decrement failed during reorder', { sku: item.sku, error: error.message });
            }
          })
      )
    );

    return NextResponse.json({ success: true, orderId: newOrder.id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to reorder';
    logger.error('Reorder failed', { orderId: id, error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}