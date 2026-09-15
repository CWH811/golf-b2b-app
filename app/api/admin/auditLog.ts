import type { SupabaseClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

export type AuditEntityType = 'product' | 'order' | 'golf_cart';

export type AdminAuditLogEntry = {
  id: string;
  admin_user_id: string | null;
  admin_email: string | null;
  action: string;
  entity_type: AuditEntityType;
  entity_id: string;
  details: Record<string, unknown> | null;
  created_at: string;
};

// Best-effort write: audit logging must never block or fail the
// admin action it's recording. Errors are logged, not thrown.
export async function logAdminAction(
  supabase: SupabaseClient,
  adminUser: User,
  action: string,
  entityType: AuditEntityType,
  entityId: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    const { error } = await supabase.from('admin_audit_log').insert({
      admin_user_id: adminUser.id,
      admin_email: adminUser.email ?? null,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details: details ?? null,
    });

    if (error) {
      logger.error('Failed to write admin audit log entry', { action, entityType, entityId, error: error.message });
    }
  } catch (error) {
    logger.error('Failed to write admin audit log entry', {
      action,
      entityType,
      entityId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
