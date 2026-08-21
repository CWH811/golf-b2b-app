# Admin env reminder

Set these environment variables before production deployment or when you want strict admin-only access:

```env
ADMIN_USER_ID=your-supabase-user-id
ADMIN_EMAIL=your-admin-email@example.com
```

Notes:
- Without them, the app allows authenticated local/dev admin access so the dashboard can be tested.
- In production, keep these values configured to restrict access to the intended admin account.
