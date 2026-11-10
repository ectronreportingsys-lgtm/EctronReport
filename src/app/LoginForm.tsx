'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/components/layout/LanguageProvider';
import { normalizeAuthPassword } from '@/lib/authUtils';

export default function LoginForm() {
  const { t } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    const email = username.includes('@') ? username : `${username}@ectron.local`;

    const supabase = createClient();
    
    const normalizedPassword = normalizeAuthPassword(password);
    let { error } = await supabase.auth.signInWithPassword({
      email,
      password: normalizedPassword,
    });

    // Fallback attempt in case user was registered with raw password
    if (error && normalizedPassword !== password) {
      const fallbackAttempt = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (!fallbackAttempt.error) {
        error = null;
      }
    }

    if (error) {
      setError(error.message === 'Invalid login credentials' ? t('Invalid username or password', 'اسم المستخدم أو كلمة المرور غير صحيحة') : error.message);
      setIsLoading(false);
    } else {
      router.refresh();
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-6">
      {error && (
        <div className="p-3 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg">
          {error}
        </div>
      )}
      
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          {t('Username')}
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/40 dark:focus:ring-blue-500/50 focus:border-[#14B8A6] dark:focus:border-blue-500/50 transition-colors"
          placeholder="1234"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          {t('Password')}
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/40 dark:focus:ring-blue-500/50 focus:border-[#14B8A6] dark:focus:border-blue-500/50 transition-colors"
          placeholder="••••••••"
          required
        />
      </div>
      
      <button
        type="submit"
        disabled={isLoading}
        className="w-full btn-primary-gradient dark:bg-none dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            {t('Logging in...', 'جاري تسجيل الدخول...')}
          </>
        ) : (
          t('Sign In')
        )}
      </button>
    </form>
  );
}
