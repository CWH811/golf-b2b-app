import { NextResponse } from 'next/server';
import { getAdminUser, isOwnerUser } from '../auth';
import { logAdminAction } from '../auditLog';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const { supabase, user, error: authError } = await getAdminUser();
    if (authError || !user || !isOwnerUser(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: fleet, error } = await supabase
      .from('golf_cart_fleet')
      .select('id, cart_number, model, status, battery_level, odometer_miles, location, assigned_to, last_service_at, next_service_at, notes')
      .order('cart_number', { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({ fleet: fleet ?? [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load golf cart fleet';
    logger.error('Failed to load golf cart fleet', { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user, error: authError } = await getAdminUser();
    if (authError || !user || !isOwnerUser(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as {
      cart_number?: string;
      model?: string;
      location?: string;
      notes?: string | null;
    };

    const cartNumber = body.cart_number?.trim();
    const model = body.model?.trim();

    if (!cartNumber || !model) {
      return NextResponse.json({ error: 'cart_number and model are required' }, { status: 400 });
    }

    const insertPayload: Record<string, string> = { cart_number: cartNumber, model };
    if (body.location?.trim()) {
      insertPayload.location = body.location.trim();
    }
    if (body.notes?.trim()) {
      insertPayload.notes = body.notes.trim();
    }

    const { data, error } = await supabase
      .from('golf_cart_fleet')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: `Cart number "${cartNumber}" already exists` }, { status: 409 });
      }
      throw error;
    }

    await logAdminAction(supabase, user, 'create_golf_cart', 'golf_cart', data.id, insertPayload);

    return NextResponse.json({ success: true, cart: data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create golf cart';
    logger.error('Failed to create golf cart', { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
