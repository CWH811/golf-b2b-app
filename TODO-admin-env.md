# Admin env reminder

Set these environment variables before production deployment or when you want strict admin-only access:

```env
ADMIN_USER_ID=your-supabase-user-id
ADMIN_EMAIL=your-admin-email@example.com
```

Notes:
- Without them, the app allows authenticated local/dev admin access so the dashboard can be tested.
- In production, keep these values configured to restrict access to the intended admin account.

## Custom domain: www.gcoregolf.com (hosted on Hostinger)

The app reads its canonical URL from `NEXT_PUBLIC_SITE_URL` (see `lib/site.ts`), defaulting to `https://www.gcoregolf.com`.

1. In Vercel: Project Settings → Domains → add `www.gcoregolf.com` (and `gcoregolf.com` if you want the apex to work too).
2. In Hostinger DNS for `gcoregolf.com`, add the records Vercel shows you, typically:
   - `CNAME` `www` → `cname.vercel-dns.com`
   - `A` `@` → `76.76.21.21` (or the apex value Vercel displays — use whatever Vercel's domain screen shows, it can change)
3. Set `NEXT_PUBLIC_SITE_URL=https://www.gcoregolf.com` in Vercel Project Settings → Environment Variables.
4. Redeploy after DNS propagates (can take a few minutes to a few hours).

## GoHighLevel CRM integration

GCore syncs new signups and completed orders to GoHighLevel as contacts (see `lib/gohighlevel.ts`, wired into `app/login/page.tsx` and `app/api/order/route.ts`).

Set these in Vercel Project Settings → Environment Variables:

```env
GOHIGHLEVEL_API_KEY=your-private-integration-token
GOHIGHLEVEL_LOCATION_ID=your-sub-account-location-id
```

To generate the token: GoHighLevel sub-account → Settings → Private Integrations → create one with the `contacts` read/write scope.

Notes:
- Without these values, CRM sync silently no-ops — it never blocks signup or checkout.
- The API route `/api/crm/sync-contact` can be reused for any future lead-capture forms.
