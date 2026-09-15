import { NextResponse } from 'next/server';
import { getAdminUser, isOwnerUser } from '../../auth';
import { logAdminAction } from '../../auditLog';
import { logger } from '@/lib/logger';

const VALID_CART_STATUSES = ['available', 'in_use', 'maintenance', 'out_of_service'];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user, error: authError } = await getAdminUser();
    if (authError || !user || !isOwnerUser(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = (await request.json()) as {
      status?: string;
      battery_level?: number;
      odometer_miles?: number;
      location?: string;
      assigned_to?: string | null;
      last_service_at?: string | null;
      next_service_at?: string | null;
      notes?: string | null;
    };

    const updates: Record<string, string | number | null> = {};

    if (body.status !== undefined) {
      if (!VALID_CART_STATUSES.includes(body.status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${VALID_CART_STATUSES.join(', ')}` },
          { status: 400 }
        );
      }
      updates.status = body.status;
    }
    if (body.battery_level !== undefined) {
      updates.battery_level = Math.min(100, Math.max(0, Math.floor(Number(body.battery_level))));
    }
    if (body.odometer_miles !== undefined) {
      updates.odometer_miles = Math.max(0, Math.floor(Number(body.odometer_miles)));
    }
    if (body.location !== undefined) updates.location = String(body.location).trim();
    if (body.assigned_to !== undefined) updates.assigned_to = body.assigned_to ? String(body.assigned_to).trim() : null;
    if (body.last_service_at !== undefined) updates.last_service_at = body.last_service_at;
    if (body.next_service_at !== undefined) updates.next_service_at = body.next_service_at;
    if (body.notes !== undefined) updates.notes = body.notes;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('golf_cart_fleet')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    await logAdminAction(supabase, user, 'update_golf_cart', 'golf_cart', id, updates);

    return NextResponse.json({ success: true, cart: data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update golf cart';
    logger.error('Failed to update golf cart', { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
