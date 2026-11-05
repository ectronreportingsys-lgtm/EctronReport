'use client';

import React, { useState } from 'react';
import { X, AlertTriangle, CheckSquare, Square, Sparkles, Loader2, Check } from 'lucide-react';
import clsx from 'clsx';
import { useLanguage } from '@/components/layout/LanguageProvider';
import { bulkClassifyExpensesAction, classifyExpenseAction, FundingSource } from '@/app/(dashboard)/petty-cash/actions/settlementActions';

interface ReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  unclassifiedExpenses: any[];
}

const formatOMR = (val: number) => {
  return Number(val || 0).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
};

export default function ReconciliationModal({
  isOpen,
  onClose,
  onSuccess,
  unclassifiedExpenses
}: ReconciliationModalProps) {
  const { t } = useLanguage();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(unclassifiedExpenses.map(e => e.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleBulkApply = async (source: FundingSource) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setLoading(true);
    await bulkClassifyExpensesAction(ids, source);
    setLoading(false);
    onSuccess();
  };

  const handleSingleClassify = async (id: string, source: FundingSource) => {
    setLoading(true);
    await classifyExpenseAction(id, source);
    setLoading(false);
    onSuccess();
  };

  const totalSelectedAmount = unclassifiedExpenses
    .filter(e => selectedIds.has(e.id))
    .reduce((s, e) => s + e.amount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white dark:bg-zinc-900 border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-800 dark:text-amber-300">
                {t('Expense Funding Source Reconciliation Queue', 'قائمة مطابقة وتصنيف جهة التمويل للمصروفات')}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {t(
                  'Identify whether historical or imported expenses were paid using Personal Funds or Company Petty Cash.',
                  'حدد ما إذا كانت الفواتير المستوردة أو التاريخية قد دُفعت من أموال شخصية أو من عهدة الشركة النقدية.'
                )}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selection & Action Bar */}
        <div className="px-6 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={selectedIds.size === unclassifiedExpenses.length ? deselectAll : selectAll}
              className="flex items-center gap-1.5 font-bold text-[#173B63] dark:text-zinc-200 hover:text-[#0F766E] cursor-pointer"
            >
              {selectedIds.size === unclassifiedExpenses.length && unclassifiedExpenses.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-[#0F766E] dark:text-teal-400" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              <span>{t('Select All', 'تحديد الكل')} ({unclassifiedExpenses.length})</span>
            </button>

            {selectedIds.size > 0 && (
              <span className="text-zinc-500">
                • {selectedIds.size} {t('selected', 'محدد')} (OMR {formatOMR(totalSelectedAmount)})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={selectedIds.size === 0 || loading}
              onClick={() => handleBulkApply('company_cash')}
              className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold transition-all shadow-xs disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{t('Mark as Company Cash', 'تحديد كعهدة شركة')}</span>
            </button>

            <button
              disabled={selectedIds.size === 0 || loading}
              onClick={() => handleBulkApply('personal')}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-xs disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{t('Mark as Personal Funds', 'تحديد كأموال شخصية')}</span>
            </button>
          </div>
        </div>

        {/* Expenses List */}
        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-2 custom-scrollbar">
          {unclassifiedExpenses.length === 0 ? (
            <div className="py-12 text-center text-zinc-500">
              {t('All expenses are fully classified and reconciled! 🎉', 'جميع المصروفات مصنفة ومطابقة بالكامل! 🎉')}
            </div>
          ) : (
            unclassifiedExpenses.map((exp: any) => {
              const isChecked = selectedIds.has(exp.id);
              return (
                <div
                  key={exp.id}
                  onClick={() => toggleSelect(exp.id)}
                  className={clsx(
                    'p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer',
                    isChecked
                      ? 'border-[#0F766E] bg-[#F0FDFA] dark:bg-[#0F766E]/10'
                      : 'border-border bg-card hover:border-zinc-400'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}} // handled by parent onClick
                      className="w-4 h-4 rounded text-[#0F766E] focus:ring-[#14B8A6] cursor-pointer"
                    />

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-[#173B63] dark:text-white">
                          {exp.expense_no}
                        </span>
                        <span className="text-xs text-zinc-400 font-medium">
                          {exp.expense_date}
                        </span>
                        {exp.batch_id && (
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                            {exp.batch_id}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-medium text-foreground mt-0.5">
                        {exp.request_description}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
                        <span>{t('Category:', 'التصنيف:')} {exp.category_name}</span>
                        <span>•</span>
                        <span>{t('Project:', 'المشروع:')} {exp.project_name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                    <span className="font-mono font-bold text-sm text-[#173B63] dark:text-white">
                      OMR {formatOMR(exp.amount)}
                    </span>

                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleSingleClassify(exp.id, 'company_cash')}
                        className="px-2.5 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-teal-500/30 text-[11px] font-bold cursor-pointer"
                      >
                        {t('Company Cash', 'عهدة')}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSingleClassify(exp.id, 'personal')}
                        className="px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-[11px] font-bold cursor-pointer"
                      >
                        {t('Personal', 'شخصي')}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-zinc-50 dark:bg-zinc-900 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-800 text-white text-xs font-bold hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            {t('Done', 'إغلاق')}
          </button>
        </div>
      </div>
    </div>
  );
}
