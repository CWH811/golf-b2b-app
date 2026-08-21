import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';

export function getOwnerIdentifiers() {
  const ownerUserId = process.env.ADMIN_USER_ID?.trim();
  const ownerEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return { ownerUserId, ownerEmail };
}

export function isOwnerUser(user: User | null) {
  if (!user) {
    return false;
  }

  const { ownerUserId, ownerEmail } = getOwnerIdentifiers();

  if (ownerUserId && user.id === ownerUserId) {
    return true;
  }

  if (ownerEmail && user.email?.toLowerCase() === ownerEmail) {
    return true;
  }

  const hasExplicitAdminConfig = Boolean(ownerUserId || ownerEmail);
  if (!hasExplicitAdminConfig && process.env.NODE_ENV !== 'production') {
    return true;
  }

  return false;
}

export async function createAdminSupabaseClient() {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Ignore write failures during prerender or server context issues.
        }
      },
    },
  });
}

export async function getAdminUser() {
  const supabase = await createAdminSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return { supabase, user, error };
}
