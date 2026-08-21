import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { isOwnerUser } from '@/app/api/admin/auth';

describe('admin auth guard', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalAdminUserId = process.env.ADMIN_USER_ID;
  const originalAdminEmail = process.env.ADMIN_EMAIL;

  beforeEach(() => {
    delete process.env.ADMIN_USER_ID;
    delete process.env.ADMIN_EMAIL;
  });

  it('allows authenticated users in non-production environments when no explicit admin config is set', () => {
    process.env.NODE_ENV = 'development';
    const user = { id: 'user-123', email: 'demo@gcore.local' } as any;

    expect(isOwnerUser(user)).toBe(true);
  });

  it('still rejects missing users', () => {
    process.env.NODE_ENV = 'development';
    expect(isOwnerUser(null)).toBe(false);
  });

  afterAll(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = originalNodeEnv;
    if (originalAdminUserId === undefined) delete process.env.ADMIN_USER_ID; else process.env.ADMIN_USER_ID = originalAdminUserId;
    if (originalAdminEmail === undefined) delete process.env.ADMIN_EMAIL; else process.env.ADMIN_EMAIL = originalAdminEmail;
  });
});
