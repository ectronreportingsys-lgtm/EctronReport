import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

function sanitizeKey(rawKey: string | undefined): string {
  if (!rawKey) return '';
  const lines = rawKey.split(/[\r\n]+/).map(l => l.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
  if (lines.length === 0) return '';
  const jwtLine = lines.find(l => l.startsWith('ey')) || lines[0];
  return jwtLine.trim();
}

function sanitizeUrl(rawUrl: string | undefined): string {
  if (!rawUrl) return '';
  const lines = rawUrl.split(/[\r\n]+/).map(l => l.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
  return lines[0]?.trim() || '';
}

function getServiceRoleKey(): string {
  // 1. Direct environment variable check
  const envKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

  const cleanEnvKey = sanitizeKey(envKey);
  if (cleanEnvKey) {
    return cleanEnvKey;
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
              const val = sanitizeKey(match[1]);
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
  return sanitizeKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function getSupabaseUrl(): string {
  const envUrl = sanitizeUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (envUrl) {
    return envUrl;
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
            const val = sanitizeUrl(match[1]);
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
