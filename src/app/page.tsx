import LoginForm from './LoginForm';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { ThemeToggleSwitch } from '@/components/layout/ThemeProvider';
import { LanguageToggleSwitch } from '@/components/layout/LanguageProvider';
import T from '@/components/layout/T';

export default async function LoginPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (data?.user) {
    redirect('/home');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative transition-colors duration-300">
      <div className="absolute top-6 right-6 z-20 flex items-center gap-3">
        <LanguageToggleSwitch />
        <ThemeToggleSwitch />
      </div>
      <div className="hidden dark:block absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#00a99d]/15 via-background to-background pointer-events-none"></div>
      
      <div className="relative z-10 w-full max-w-md p-8 glass rounded-2xl border border-[#E2E8F0] dark:border-zinc-800 shadow-lg dark:shadow-2xl">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <img 
              src="/logo.png" 
              alt="ECTRON" 
              className="h-12 w-auto max-w-[200px] object-contain" 
            />
          </div>
          <p className="text-[#475569] dark:text-zinc-400 mt-2">
            <T text="Sign in to your account" />
          </p>
        </div>
        
        <LoginForm />
      </div>
    </div>
  );
}
