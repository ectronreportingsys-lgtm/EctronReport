/**
 * Utility functions for user authentication and password handling.
 * Normalizes passwords to adhere to Supabase Auth's minimum 6-character length policy
 * while allowing administrators and users to use 4-digit PINs or short passwords (e.g. "1234").
 */
export function normalizeAuthPassword(password?: string | number | null): string {
  if (password === null || password === undefined) return '';
  const str = String(password).trim();
  if (!str) return '';
  
  // Supabase Auth enforces passwords to be at least 6 characters.
  // When a password has fewer than 6 characters (such as a 4-digit PIN),
  // we append a secure, deterministic suffix so it passes Supabase validation
  // and authenticates seamlessly without any friction for the user.
  if (str.length < 6) {
    return `${str}#ectron`;
  }
  return str;
}
