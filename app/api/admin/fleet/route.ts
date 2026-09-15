import { NextResponse } from 'next/server';
import { getAdminUser, isOwnerUser } from '../auth';
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
