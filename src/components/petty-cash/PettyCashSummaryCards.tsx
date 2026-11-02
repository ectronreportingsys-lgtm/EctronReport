'use client';

import React, { useState } from 'react';
import { Target, CheckCircle2, TrendingUp, AlertCircle, Plus, FileSpreadsheet, Users, BarChart3, Settings2, Upload, FileText } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import NewExpenseModal from './NewExpenseModal';
import ImportPettyCashModal from './ImportPettyCashModal';
import { PettyCashBatch } from '@/app/(dashboard)/petty-cash/actions/batchesActions';
import { useLanguage } from '@/components/layout/LanguageProvider';

interface PettyCashSummary {
  budget: number;
  spent: number;
  remaining: number;
  usedPercentage: number;
  expenseCount: number;
}

interface PettyCashSummaryCardsProps {
  summary: PettyCashSummary;
  batches?: PettyCashBatch[];
  options?: {
    categories: any[];
    profiles: any[];
    projects: any[];
  };
}

export default function PettyCashSummaryCards({ summary, batches = [], options }: PettyCashSummaryCardsProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const isWarning = summary.usedPercentage >= 70 && summary.usedPercentage <= 90;
  const isCritical = summary.usedPercentage > 90 && summary.usedPercentage <= 100;
  const isOverBudget = summary.usedPercentage > 100;

  let statusColor = "text-[#10B981] dark:text-emerald-400";
  let statusBg = "bg-[#10B981]/10 border border-[#10B981]/20";
  if (isWarning) {
    statusColor = "text-amber-600 dark:text-yellow-400";
    statusBg = "bg-amber-500/10 dark:bg-yellow-400/10 border border-amber-500/20 dark:border-yellow-400/20";
  } else if (isCritical || isOverBudget) {
    statusColor = "text-danger";
    statusBg = "bg-danger/10 border border-danger/20";
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl glass bg-gradient-to-br from-white to-[#EDF5FC] dark:bg-none border border-[#B5CDE2] border-l-4 border-l-[#173B63] dark:border-l dark:border-zinc-800/50 hover:border-[#14B8A6] dark:hover:border-zinc-700/50 flex items-center gap-4 transition-all">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#173B63] dark:bg-[#3B82F6]/10 border border-[#173B63]/20 dark:border-[#3B82F6]/20 shrink-0 shadow-xs">
            <Target className="w-6 h-6 text-white dark:text-blue-400" />
          </div>
          <div>
            <p className="text-[#2B4C6F] dark:text-zinc-400 text-sm font-semibold">{t('Monthly Budget', 'الميزانية الشهرية')}</p>
            <h3 className="text-2xl font-bold text-[#173B63] dark:text-white mt-0.5">OMR {summary.budget.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl glass bg-gradient-to-br from-white to-[#EBF9F6] dark:bg-none border border-[#B5CDE2] border-l-4 border-l-[#14B8A6] dark:border-l dark:border-zinc-800/50 hover:border-[#14B8A6] dark:hover:border-zinc-700/50 flex items-center gap-4 transition-all">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${statusBg}`}>
            <TrendingUp className={`w-6 h-6 ${statusColor}`} />
          </div>
          <div>
            <p className="text-[#2B4C6F] dark:text-zinc-400 text-sm font-semibold">{t('Spent This Month', 'المصروف هذا الشهر')}</p>
            <h3 className={`text-2xl font-bold mt-0.5 ${statusColor}`}>OMR {summary.spent.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl glass bg-gradient-to-br from-white to-[#EBF9F6] dark:bg-none border border-[#B5CDE2] border-l-4 border-l-[#0F766E] dark:border-l dark:border-zinc-800/50 hover:border-[#14B8A6] dark:hover:border-zinc-700/50 flex items-center gap-4 transition-all">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isOverBudget ? 'bg-danger/10 border border-danger/20' : 'bg-[#0F766E] dark:bg-emerald-400/10 border border-[#0F766E]/20 dark:border-emerald-400/20 shadow-xs'}`}>
            <CheckCircle2 className={`w-6 h-6 ${isOverBudget ? 'text-danger' : 'text-white dark:text-emerald-400'}`} />
          </div>
          <div>
            <p className="text-[#2B4C6F] dark:text-zinc-400 text-sm font-semibold">{t('Remaining Budget', 'المتبقي من الميزانية')}</p>
            <h3 className={`text-2xl font-bold mt-0.5 ${isOverBudget ? 'text-danger' : 'text-[#173B63] dark:text-white'}`}>OMR {summary.remaining.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl glass bg-gradient-to-br from-white to-[#EDF5FC] dark:bg-none border border-[#B5CDE2] border-l-4 border-l-[#1E4B7A] dark:border-l dark:border-zinc-800/50 hover:border-[#14B8A6] dark:hover:border-zinc-700/50 flex items-center gap-4 transition-all">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#1E4B7A] dark:bg-purple-400/10 border border-[#1E4B7A]/20 dark:border-purple-400/20 shrink-0 shadow-xs">
            <AlertCircle className="w-6 h-6 text-white dark:text-purple-400" />
          </div>
          <div>
            <p className="text-[#2B4C6F] dark:text-zinc-400 text-sm font-semibold">{t('Number of Expenses', 'عدد المصروفات')}</p>
            <h3 className="text-2xl font-bold text-[#173B63] dark:text-white mt-0.5">{summary.expenseCount}</h3>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 btn-primary-gradient bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-md cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          {t('New Expense', 'مصروف جديد')}
        </button>
        <Link href="/petty-cash/settlement" className="flex items-center gap-2 bg-[#173B63] hover:bg-[#1E4B7A] dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-colors border border-[#173B63] dark:border-zinc-700 shadow-sm">
          <Users className="w-5 h-5 text-[#2DD4BF] dark:text-blue-400" />
          {t('Employee Settlement', 'تسوية الموظفين')}
        </Link>
        <Link href="/petty-cash/resources" className="flex items-center gap-2 bg-[#1E4B7A] hover:bg-[#173B63] dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-colors border border-[#1E4B7A] dark:border-zinc-700 shadow-sm">
          <Settings2 className="w-5 h-5 text-[#2DD4BF] dark:text-amber-400" />
          {t('Resources', 'المصادر')}
        </Link>
        <Link href="/petty-cash/analytics" className="flex items-center gap-2 bg-[#0F766E] hover:bg-[#0D9488] dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-colors border border-[#0F766E] dark:border-zinc-700 shadow-sm">
          <BarChart3 className="w-5 h-5 text-[#CCFBF1] dark:text-purple-400" />
          {t('Analytics', 'التحليلات')}
        </Link>
        <button 
          onClick={() => setIsImportModalOpen(true)}
          className="flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 px-5 py-2.5 rounded-xl font-bold transition-colors border border-blue-500/30 cursor-pointer shadow-xs ml-auto"
        >
          <Upload className="w-5 h-5 text-blue-500 dark:text-blue-400" />
          {t('Import Excel', 'استيراد إكسل')}
        </button>

        <a 
          href="/Ectron_Petty_Cash_User_Guide.docx"
          download="Ectron_Petty_Cash_User_Guide.docx"
          className="flex items-center gap-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-300 px-5 py-2.5 rounded-xl font-bold transition-colors border border-purple-500/30 cursor-pointer shadow-xs"
          title={t('Download Executive User Guide (Word)', 'تحميل دليل المستخدم التنفيذي بصيغة Word للإدارة')}
        >
          <FileText className="w-5 h-5 text-purple-500 dark:text-purple-400" />
          <span>{t('Download User Guide (Word)', 'تحميل دليل المستخدم (Word)')}</span>
        </a>
      </div>

      <NewExpenseModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => {
          setIsModalOpen(false);
          router.refresh();
        }} 
      />

      <ImportPettyCashModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          setIsImportModalOpen(false);
          router.refresh();
        }}
        batches={batches}
        options={options}
      />
    </div>
  );
}
