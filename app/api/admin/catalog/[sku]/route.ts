import { NextResponse } from 'next/server';
import { getAdminUser, isOwnerUser } from '../../auth';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sku: string }> }
) {
  try {
    const { supabase, user, error: authError } = await getAdminUser();
    if (authError || !user || !isOwnerUser(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sku } = await params;
    const body = (await request.json()) as {
      name?: string;
      base_price?: number;
      quantity_on_hand?: number;
    };

    const updates: Record<string, string | number> = {};
    if (body.name !== undefined) updates.name = String(body.name).trim();
    if (body.base_price !== undefined) updates.base_price = Number(body.base_price);
    if (body.quantity_on_hand !== undefined) updates.quantity_on_hand = Math.max(0, Math.floor(Number(body.quantity_on_hand)));

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('sku', sku)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, product: data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update product';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ sku: string }> }
) {
  try {
    const { supabase, user, error: authError } = await getAdminUser();
    if (authError || !user || !isOwnerUser(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sku } = await params;

    // Soft-delete: set status to "archived" instead of hard delete
    const { data, error } = await supabase
      .from('products')
      .update({ status: 'archived' })
      .eq('sku', sku)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, product: data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to archive product';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}