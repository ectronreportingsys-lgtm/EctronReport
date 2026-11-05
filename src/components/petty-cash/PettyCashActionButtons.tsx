'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Users, 
  Settings2, 
  BarChart3 
} from 'lucide-react';
import { useLanguage } from '@/components/layout/LanguageProvider';
import { PettyCashBatch } from '@/app/(dashboard)/petty-cash/actions/batchesActions';
import NewExpenseModal from './NewExpenseModal';

interface PettyCashActionButtonsProps {
  batches?: PettyCashBatch[];
  options?: {
    categories: any[];
    profiles: any[];
    projects: any[];
  };
}

export default function PettyCashActionButtons({ batches = [], options }: PettyCashActionButtonsProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        {/* New Expense Button */}
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 btn-primary-gradient bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-md cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          {t('New Expense', 'مصروف جديد')}
        </button>

        {/* Employee Settlement Navigation */}
        <Link 
          href="/petty-cash/settlement" 
          className="flex items-center gap-2 bg-[#173B63] hover:bg-[#1E4B7A] dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-colors border border-[#173B63] dark:border-zinc-700 shadow-sm"
        >
          <Users className="w-5 h-5 text-[#2DD4BF] dark:text-blue-400" />
          {t('Employee Settlement', 'تسوية الموظفين')}
        </Link>

        {/* Resources & Settings Navigation */}
        <Link 
          href="/petty-cash/resources" 
          className="flex items-center gap-2 bg-[#1E4B7A] hover:bg-[#173B63] dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-colors border border-[#1E4B7A] dark:border-zinc-700 shadow-sm"
        >
          <Settings2 className="w-5 h-5 text-[#2DD4BF] dark:text-amber-400" />
          {t('Resources', 'المصادر')}
        </Link>

        {/* Analytics Navigation */}
        <Link 
          href="/petty-cash/analytics" 
          className="flex items-center gap-2 bg-[#0F766E] hover:bg-[#0D9488] dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-colors border border-[#0F766E] dark:border-zinc-700 shadow-sm"
        >
          <BarChart3 className="w-5 h-5 text-[#CCFBF1] dark:text-purple-400" />
          {t('Analytics', 'التحليلات')}
        </Link>
      </div>

      {/* New Expense Modal */}
      <NewExpenseModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => {
          setIsModalOpen(false);
          router.refresh();
        }} 
      />
    </>
  );
}
