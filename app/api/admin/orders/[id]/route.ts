import { NextResponse } from 'next/server';
import { getAdminUser, isOwnerUser } from '../../auth';
import { logAdminAction } from '../../auditLog';
import { syncContactToGoHighLevel } from '@/lib/gohighlevel';
import { logger } from '@/lib/logger';

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
    const body = (await request.json()) as { status?: string };
    const { status } = body;

    if (!status || typeof status !== 'string') {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    const validStatuses = ['pending', 'fulfilled', 'shipped', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    await logAdminAction(supabase, user, 'update_order_status', 'order', id, { status });

    // Non-blocking: push the new status to GoHighLevel as a contact
    // tag so sales/support can see order progress without a
    // dedicated GHL pipeline integration. Never blocks the response —
    // CRM availability must not affect order management.
    if (data?.user_email) {
      syncContactToGoHighLevel({
        email: data.user_email,
        tags: ['GCore Order', `GCore Order: ${status}`],
        source: 'GCore Order Status Update',
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, order: data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update order';
    logger.error('Failed to update order status', { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}