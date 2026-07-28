import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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
      .insert([{ user_id: user.id, status: 'pending' }])
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

    return NextResponse.json({ success: true, orderId: order.id });

  } catch (error: unknown) {
    console.error("Order submission failed:", error);
    const message = error instanceof Error ? error.message : "Failed to submit order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}