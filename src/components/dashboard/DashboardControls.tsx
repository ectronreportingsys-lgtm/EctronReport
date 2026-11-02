'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar as CalendarIcon, Clock, Filter } from 'lucide-react';
import clsx from 'clsx';
import Link from 'next/link';
import { useLanguage } from '@/components/layout/LanguageProvider';

export default function DashboardControls({ currentMode, currentDate, currentYear, division }: { currentMode: string, currentDate: string, currentYear: string, division: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  const handleYearChange = (year: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('year', year);
    router.push(`/${division}/dashboard?${params.toString()}`);
  };

  const years = ['2023', '2024', '2025', '2026', '2027'];

  const createUrl = (mode: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('mode', mode);
    return `/${division}/dashboard?${params.toString()}`;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-3">
      {/* Mode Toggle */}
      <div className="flex p-1 bg-zinc-900/80 rounded-xl border border-zinc-800">
        <Link
          href={createUrl('daily')}
          className={clsx(
            "px-4 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all",
            currentMode === 'daily' ? "btn-primary-gradient dark:bg-none dark:bg-blue-600 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          <Clock className="w-4 h-4" />
          {t('Daily', 'يومي')}
        </Link>
        <Link
          href={createUrl('yearly')}
          className={clsx(
            "px-4 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all",
            currentMode === 'yearly' ? "btn-primary-gradient dark:bg-none dark:bg-emerald-600 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          <CalendarIcon className="w-4 h-4 text-white" />
          {t('Yearly', 'سنوي')}
        </Link>
      </div>

      {/* Date/Year Picker */}
      <div className="flex items-center gap-2">
        {currentMode === 'yearly' && (
          <div className="relative">
             <select 
               value={currentYear}
               onChange={(e) => handleYearChange(e.target.value)}
               className="bg-zinc-900/50 border border-zinc-800 text-zinc-300 text-sm rounded-xl px-4 py-2 focus:outline-none focus:border-emerald-500/50 appearance-none pr-10"
             >
               {years.map(y => <option key={y} value={y}>{y}</option>)}
             </select>
             <Filter className="w-4 h-4 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )}
      </div>
    </div>
  );
}
