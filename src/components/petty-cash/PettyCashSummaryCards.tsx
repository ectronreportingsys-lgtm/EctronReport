'use client';

import React from 'react';
import { Target, CheckCircle2, TrendingUp, AlertCircle } from 'lucide-react';
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
}

export default function PettyCashSummaryCards({ summary }: PettyCashSummaryCardsProps) {
  const { t } = useLanguage();

  const isWarning = summary.usedPercentage >= 70 && summary.usedPercentage <= 90;
  const isCritical = summary.usedPercentage > 90 && summary.usedPercentage <= 100;
  const isOverBudget = summary.usedPercentage > 100;

  const formatOMR = (val: number) => {
    return Number(val || 0).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    });
  };

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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Monthly Budget */}
      <div className="p-5 rounded-2xl glass bg-gradient-to-br from-white to-[#EDF5FC] dark:bg-none border border-[#B5CDE2] border-l-4 border-l-[#173B63] dark:border-l dark:border-zinc-800/50 hover:border-[#14B8A6] dark:hover:border-zinc-700/50 flex items-center gap-4 transition-all">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#173B63] dark:bg-[#3B82F6]/10 border border-[#173B63]/20 dark:border-[#3B82F6]/20 shrink-0 shadow-xs">
          <Target className="w-6 h-6 text-white dark:text-blue-400" />
        </div>
        <div>
          <p className="text-[#2B4C6F] dark:text-zinc-400 text-sm font-semibold">{t('Monthly Budget', 'الميزانية الشهرية')}</p>
          <h3 className="text-2xl font-bold text-[#173B63] dark:text-white mt-0.5">OMR {formatOMR(summary.budget)}</h3>
        </div>
      </div>

      {/* Spent Last Month */}
      <div className="p-5 rounded-2xl glass bg-gradient-to-br from-white to-[#EBF9F6] dark:bg-none border border-[#B5CDE2] border-l-4 border-l-[#14B8A6] dark:border-l dark:border-zinc-800/50 hover:border-[#14B8A6] dark:hover:border-zinc-700/50 flex items-center gap-4 transition-all">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${statusBg}`}>
          <TrendingUp className={`w-6 h-6 ${statusColor}`} />
        </div>
        <div>
          <p className="text-[#2B4C6F] dark:text-zinc-400 text-sm font-semibold">{t('Spent Last Month', 'المصروف الشهر الماضي')}</p>
          <h3 className={`text-2xl font-bold mt-0.5 ${statusColor}`}>OMR {formatOMR(summary.spent)}</h3>
        </div>
      </div>

      {/* Remaining Budget */}
      <div className="p-5 rounded-2xl glass bg-gradient-to-br from-white to-[#EBF9F6] dark:bg-none border border-[#B5CDE2] border-l-4 border-l-[#0F766E] dark:border-l dark:border-zinc-800/50 hover:border-[#14B8A6] dark:hover:border-zinc-700/50 flex items-center gap-4 transition-all">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isOverBudget ? 'bg-danger/10 border border-danger/20' : 'bg-[#0F766E] dark:bg-emerald-400/10 border border-[#0F766E]/20 dark:border-emerald-400/20 shadow-xs'}`}>
          <CheckCircle2 className={`w-6 h-6 ${isOverBudget ? 'text-danger' : 'text-white dark:text-emerald-400'}`} />
        </div>
        <div>
          <p className="text-[#2B4C6F] dark:text-zinc-400 text-sm font-semibold">{t('Remaining Budget', 'المتبقي من الميزانية')}</p>
          <h3 className={`text-2xl font-bold mt-0.5 ${isOverBudget ? 'text-danger' : 'text-[#173B63] dark:text-white'}`}>OMR {formatOMR(summary.remaining)}</h3>
        </div>
      </div>

      {/* Number of Expenses */}
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
  );
}
