import { NextResponse } from 'next/server';
import { getAdminUser, isOwnerUser } from '../auth';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const { supabase, user, error: authError } = await getAdminUser();
    if (authError || !user || !isOwnerUser(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: entries, error } = await supabase
      .from('admin_audit_log')
      .select('id, admin_email, action, entity_type, entity_id, details, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      throw error;
    }

    return NextResponse.json({ entries: entries ?? [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load activity log';
    logger.error('Failed to load admin activity log', { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
