import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { isOwnerUser } from '@/app/api/admin/auth';

// Next.js types declare `process.env.NODE_ENV` as readonly; cast to a mutable
// record so these tests can still simulate environment changes.
const mutableEnv = process.env as unknown as Record<string, string | undefined>;

describe('admin auth guard', () => {
  const originalNodeEnv = mutableEnv.NODE_ENV;
  const originalAdminUserId = mutableEnv.ADMIN_USER_ID;
  const originalAdminEmail = mutableEnv.ADMIN_EMAIL;

  beforeEach(() => {
    delete mutableEnv.ADMIN_USER_ID;
    delete mutableEnv.ADMIN_EMAIL;
  });

  it('allows authenticated users in non-production environments when no explicit admin config is set', () => {
    mutableEnv.NODE_ENV = 'development';
    const user = { id: 'user-123', email: 'demo@gcore.local' } as any;

    expect(isOwnerUser(user)).toBe(true);
  });

  it('still rejects missing users', () => {
    mutableEnv.NODE_ENV = 'development';
    expect(isOwnerUser(null)).toBe(false);
  });

  afterAll(() => {
    if (originalNodeEnv === undefined) delete mutableEnv.NODE_ENV; else mutableEnv.NODE_ENV = originalNodeEnv;
    if (originalAdminUserId === undefined) delete mutableEnv.ADMIN_USER_ID; else mutableEnv.ADMIN_USER_ID = originalAdminUserId;
    if (originalAdminEmail === undefined) delete mutableEnv.ADMIN_EMAIL; else mutableEnv.ADMIN_EMAIL = originalAdminEmail;
  });
});
