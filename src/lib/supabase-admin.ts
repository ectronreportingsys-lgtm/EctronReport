import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

function getServiceRoleKey(): string {
  // 1. Direct environment variable check
  const envKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

  if (envKey && envKey.trim()) {
    return envKey.trim();
  }

  // 2. Fallback: Parse from local env files if in Node.js runtime
  if (typeof window === 'undefined') {
    try {
      const candidates = ['.env.local', '.env'];
      for (const file of candidates) {
        const filePath = path.join(process.cwd(), file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          const lines = content.split(/\r?\n/);
          for (const line of lines) {
            const match = line.match(/^\s*(?:SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SERVICE_KEY|SERVICE_ROLE_KEY)\s*=\s*(.*)$/);
            if (match && match[1]) {
              const val = match[1].trim().replace(/^['"]|['"]$/g, '');
              if (val) {
                // Populate process.env so subsequent calls are fast
                process.env.SUPABASE_SERVICE_ROLE_KEY = val;
                return val;
              }
            }
          }
        }
      }
    } catch {
      // Ignore filesystem errors in edge runtimes
    }
  }

  // 3. Fallback to ANON key so client initialization never crashes with "supabaseKey is required"
  return (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
}

function getSupabaseUrl(): string {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.trim()) {
    return process.env.NEXT_PUBLIC_SUPABASE_URL.trim();
  }

  if (typeof window === 'undefined') {
    try {
      const candidates = ['.env.local', '.env'];
      for (const file of candidates) {
        const filePath = path.join(process.cwd(), file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          const match = content.match(/^\s*NEXT_PUBLIC_SUPABASE_URL\s*=\s*(.*)$/m);
          if (match && match[1]) {
            const val = match[1].trim().replace(/^['"]|['"]$/g, '');
            if (val) {
              process.env.NEXT_PUBLIC_SUPABASE_URL = val;
              return val;
            }
          }
        }
      }
    } catch {}
  }

  return '';
}

export const createAdminClient = (): SupabaseClient => {
  const url = getSupabaseUrl();
  const key = getServiceRoleKey();

  if (!url || !key) {
    throw new Error('Supabase configuration is missing (NEXT_PUBLIC_SUPABASE_URL or API key is not defined)');
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};
