import { createBrowserClient } from '@supabase/ssr';

export const createClient = () => {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').split(/[\r\n]+/)[0]?.trim().replace(/^['"]|['"]$/g, '') || '';
  const rawKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').split(/[\r\n]+/)[0]?.trim().replace(/^['"]|['"]$/g, '') || '';

  return createBrowserClient(
    url,
    rawKey
  );
};

// Singleton instance for backward compatibility in client components
export const supabase = typeof window !== 'undefined' ? createClient() : null as any;
