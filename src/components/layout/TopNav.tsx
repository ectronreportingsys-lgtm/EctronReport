'use client';

import { Search, Bell, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import { ThemeToggleSwitch } from './ThemeProvider';
import { LanguageToggleSwitch, useLanguage } from './LanguageProvider';

interface TopNavProps {
  profile?: any;
  roleName?: string;
}

export default function TopNav({ profile, roleName }: TopNavProps) {
  const fullName = profile?.full_name || 'User';
  const displayInitial = fullName.charAt(0).toUpperCase();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLanguage();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  // Extract section from pathname
  const parts = pathname.split('/');
  const section = parts[1] || '';
  
  let sectionTitle = '';
  if (section === 'water') sectionTitle = t('Water Siconia', 'مياه سكونيا');
  else if (section === 'electricity') sectionTitle = t('Electricity M212', 'كهرباء M212');
  else if (section === 'electricity-ecs1100') sectionTitle = t('Electricity ECS1100', 'كهرباء ECS1100');
  else if (section === 'petty-cash') sectionTitle = t('Petty Cash Management', 'إدارة النثريات والمصاريف');
  else if (section === 'visits' || section === 'visitor') sectionTitle = t('Visitor Management', 'إدارة الزوار');
  else if (section === 'library') sectionTitle = t('Document Control System (EDCS)', 'نظام مراقبة وإدارة الوثائق (المكتبة)');
  else if (section === 'admin') sectionTitle = t('Admin Panel', 'لوحة الإدارة');
  else if (section === 'home') sectionTitle = t('Home', 'الرئيسية');

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-30 glass print:hidden transition-colors duration-300">
      <div className="flex items-center flex-1 max-w-3xl gap-6">
        {sectionTitle && (
          <h2 className="text-lg font-extrabold text-[#173B63] dark:text-[#00a99d] whitespace-nowrap">
            {sectionTitle}
          </h2>
        )}
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B] dark:text-zinc-400" />
          <input 
            type="text" 
            placeholder={t('Search by Date, Week, Month, Stage...', 'البحث حسب التاريخ، الأسبوع، الشهر، المرحلة...')}
            className="w-full bg-[#F8FAFC] dark:bg-zinc-900/50 border border-[#E2E8F0] dark:border-zinc-700/50 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/40 dark:focus:ring-[#00a99d]/50 text-[#173B63] dark:text-zinc-200 placeholder:text-[#64748B] dark:placeholder:text-zinc-500 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Theme Mode Switch (Dark / Light) */}
        <ThemeToggleSwitch />

        {/* Language Switch (EN / AR) - Placed behind/beside the Mode Switch */}
        <LanguageToggleSwitch />

        <button className="relative p-2 rounded-full hover:bg-[#F0FDFA] dark:hover:bg-zinc-800/50 text-[#475569] dark:text-zinc-400 hover:text-[#0F766E] dark:hover:text-zinc-100 transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#14B8A6] dark:bg-[#00a99d] rounded-full border border-card"></span>
        </button>
        
        <div className="flex items-center gap-3 pl-4 border-l border-[#E2E8F0] dark:border-zinc-800">
          <div className="flex flex-col items-end">
            <span className="text-sm font-semibold text-[#173B63] dark:text-zinc-200">{fullName}</span>
            <span className="text-xs font-medium text-[#0F766E] dark:text-[#00a99d]">{roleName || 'User'}</span>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#0F766E] to-[#14B8A6] dark:from-[#1b497f] dark:to-[#00a99d] flex items-center justify-center text-white font-semibold shadow-inner">
            {displayInitial}
          </div>
          
          <button 
            onClick={handleLogout}
            className="ml-2 p-2 rounded-full hover:bg-red-500/10 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
            title={t('Logout', 'تسجيل الخروج')}
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
