import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const createClient = async () => {
  const cookieStore = await cookies();

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').split(/[\r\n]+/)[0]?.trim().replace(/^['"]|['"]$/g, '') || '';
  const rawKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').split(/[\r\n]+/)[0]?.trim().replace(/^['"]|['"]$/g, '') || '';

  return createServerClient(
    url,
    rawKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // The `remove` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
};
