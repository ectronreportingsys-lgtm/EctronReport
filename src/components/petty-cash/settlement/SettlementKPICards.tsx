'use client';

import React from 'react';
import { Wallet, HandCoins, Vault, ArrowLeftRight, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/components/layout/LanguageProvider';

interface SettlementKPICardsProps {
  kpis: {
    totalPersonalExpenses: number;
    outstandingPersonalReimbursements: number;
    totalCompanyCashHeld: number;
    totalInternalTransferVolume: number;
    unclassifiedCount: number;
    unclassifiedTotalAmount: number;
  };
  onOpenReconciliation?: () => void;
}

const formatOMR = (val: number) => {
  return Number(val || 0).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
};

export default function SettlementKPICards({ kpis, onOpenReconciliation }: SettlementKPICardsProps) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col gap-4">
      {/* Reconciliation Alert Banner if unclassified expenses exist */}
      {kpis.unclassifiedCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-600 dark:text-amber-400">
                {t('Action Required: Unclassified Expenses Detected', 'تنبيه: توجد مصروفات غير مصنفة جهة التمويل')}
              </h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                {t(
                  `${kpis.unclassifiedCount} expense(s) totaling OMR ${formatOMR(kpis.unclassifiedTotalAmount)} are quarantined and excluded from ledgers until reconciled.`,
                  `يوجد ${kpis.unclassifiedCount} مصروف بقيمة إجمالية OMR ${formatOMR(kpis.unclassifiedTotalAmount)} معزولة ومستبعدة من كشوف الحسابات حتى يتم تصنيفها.`
                )}
              </p>
            </div>
          </div>
          {onOpenReconciliation && (
            <button
              onClick={onOpenReconciliation}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shrink-0 cursor-pointer shadow-sm"
            >
              {t('Reconcile Now', 'تصنيف ومطابقة الآن')}
            </button>
          )}
        </div>
      )}

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1: Total Personal Expenses */}
        <div className="p-5 rounded-2xl glass bg-gradient-to-br from-white to-[#EDF5FC] dark:bg-none border border-[#B5CDE2] border-l-4 border-l-[#173B63] dark:border-l dark:border-zinc-800/50 hover:border-[#14B8A6] dark:hover:border-zinc-700/50 flex items-center gap-4 transition-all">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#173B63] dark:bg-blue-600/20 text-white dark:text-blue-400 border border-[#173B63]/20 shrink-0 shadow-xs">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[#2B4C6F] dark:text-zinc-400 text-xs font-semibold">
              {t('Total Personal Expenses', 'إجمالي المصروفات الشخصية')}
            </p>
            <h3 className="text-2xl font-bold text-[#173B63] dark:text-white mt-0.5">
              OMR {formatOMR(kpis.totalPersonalExpenses)}
            </h3>
            <span className="text-[11px] text-[#0F766E] dark:text-teal-400 font-medium">
              {t('Out-of-pocket verified', 'مدفوعة من أموال الموظفين')}
            </span>
          </div>
        </div>

        {/* CARD 2: Outstanding Personal Reimbursements */}
        <div className="p-5 rounded-2xl glass bg-gradient-to-br from-white to-[#EBF9F6] dark:bg-none border border-[#B5CDE2] border-l-4 border-l-[#0F766E] dark:border-l dark:border-zinc-800/50 hover:border-[#14B8A6] dark:hover:border-zinc-700/50 flex items-center gap-4 transition-all">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#0F766E] dark:bg-emerald-500/20 text-white dark:text-emerald-400 border border-[#0F766E]/20 shrink-0 shadow-xs">
            <HandCoins className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[#2B4C6F] dark:text-zinc-400 text-xs font-semibold">
              {t('Outstanding Personal Reimbursements', 'مستحقات الاسترداد الشخصي')}
            </p>
            <h3 className="text-2xl font-bold text-[#0F766E] dark:text-emerald-400 mt-0.5">
              OMR {formatOMR(kpis.outstandingPersonalReimbursements)}
            </h3>
            <span className="text-[11px] text-[#475569] dark:text-zinc-400 font-medium">
              {t('Net payable by company', 'صافي مستحقات الموظفين')}
            </span>
          </div>
        </div>

        {/* CARD 3: Company Cash Held */}
        <div className="p-5 rounded-2xl glass bg-gradient-to-br from-white to-[#EBF9F6] dark:bg-none border border-[#B5CDE2] border-l-4 border-l-[#14B8A6] dark:border-l dark:border-zinc-800/50 hover:border-[#14B8A6] dark:hover:border-zinc-700/50 flex items-center gap-4 transition-all">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#14B8A6] dark:bg-teal-500/20 text-white dark:text-teal-400 border border-[#14B8A6]/20 shrink-0 shadow-xs">
            <Vault className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[#2B4C6F] dark:text-zinc-400 text-xs font-semibold">
              {t('Company Cash Held', 'النقدية في عهدة الموظفين')}
            </p>
            <h3 className="text-2xl font-bold text-[#173B63] dark:text-white mt-0.5">
              OMR {formatOMR(kpis.totalCompanyCashHeld)}
            </h3>
            <span className="text-[11px] text-[#0F766E] dark:text-teal-400 font-medium">
              {t('Active petty cash custody', 'عهدة نقدية نشطة')}
            </span>
          </div>
        </div>

        {/* CARD 4: Total Internal Transfers */}
        <div className="p-5 rounded-2xl glass bg-gradient-to-br from-white to-[#F5F3FF] dark:bg-none border border-[#B5CDE2] border-l-4 border-l-[#8B5CF6] dark:border-l dark:border-zinc-800/50 hover:border-[#8B5CF6] dark:hover:border-zinc-700/50 flex items-center gap-4 transition-all">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#8B5CF6] dark:bg-purple-500/20 text-white dark:text-purple-400 border border-[#8B5CF6]/20 shrink-0 shadow-xs">
            <ArrowLeftRight className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[#2B4C6F] dark:text-zinc-400 text-xs font-semibold">
              {t('Total Internal Transfers', 'إجمالي التحويلات الداخلية')}
            </p>
            <h3 className="text-2xl font-bold text-[#6D28D9] dark:text-purple-300 mt-0.5">
              OMR {formatOMR(kpis.totalInternalTransferVolume)}
            </h3>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium block">
              {t('Transfer volume only — not an expense', 'حجم التحويلات فقط — ليس مصروفاً إضافياً')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
