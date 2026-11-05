'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, Layers, FileSpreadsheet } from 'lucide-react';
import clsx from 'clsx';
import { useLanguage } from '@/components/layout/LanguageProvider';
import { PettyCashBatch } from '@/app/(dashboard)/petty-cash/actions/batchesActions';
import PettyCashActionButtons from './PettyCashActionButtons';
import ExpenseTable from './ExpenseTable';

interface ExpenseMasterSectionProps {
  expensesData: any[];
  batches?: PettyCashBatch[];
  options?: {
    categories: any[];
    profiles: any[];
    projects: any[];
    recurringDescriptions?: any[];
  };
}

export default function ExpenseMasterSection({
  expensesData,
  batches = [],
  options
}: ExpenseMasterSectionProps) {
  const { t } = useLanguage();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('ectron_expense_master_collapsed');
      if (saved !== null) {
        setIsCollapsed(saved === 'true');
      }
    } catch (e) {}
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('ectron_expense_master_collapsed', String(next));
      } catch (e) {}
      return next;
    });
  };

  return (
    <div
      className={clsx(
        'glass rounded-2xl border border-border dark:border-zinc-800/60 transition-all duration-200',
        isCollapsed ? 'p-4' : 'p-6 flex flex-col gap-5'
      )}
    >
      {/* Header Bar */}
      <div className={clsx('flex flex-col gap-4', !isCollapsed && 'border-b border-zinc-800 pb-4')}>
        <div className="flex items-center justify-between gap-4">
          {/* Left: Collapse/Expand Arrow + Title "Expense Master List" */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={toggleCollapse}
              className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-all cursor-pointer border border-zinc-700/60 flex items-center justify-center shrink-0 shadow-xs"
              title={isCollapsed ? t('Expand Expense Master List', 'إظهار قائمة المصروفات الرئيسية') : t('Collapse Expense Master List', 'طوي قائمة المصروفات الرئيسية')}
              aria-label={isCollapsed ? 'Expand' : 'Collapse'}
            >
              <ChevronDown
                className={clsx(
                  'w-5 h-5 transition-transform duration-200 text-zinc-200',
                  isCollapsed && '-rotate-90 rtl:rotate-90'
                )}
              />
            </button>

            <div
              onClick={isCollapsed ? toggleCollapse : undefined}
              className={clsx(
                'flex items-center gap-2.5',
                isCollapsed && 'cursor-pointer select-none'
              )}
            >
              <Layers className="w-5 h-5 text-blue-500 shrink-0" />
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Expense Master List</span>
              </h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-800/90 text-zinc-300 border border-zinc-700/60">
                {expensesData.length} {t('records', 'سجل')}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons: Placed inside the card directly above the Master Data table */}
        {!isCollapsed && (
          <div className="pt-1">
            <PettyCashActionButtons batches={batches} options={options} />
          </div>
        )}
      </div>

      {/* Expenses Master Table (hidden when collapsed) */}
      {!isCollapsed && (
        <ExpenseTable
          expensesData={expensesData}
          batches={batches}
          options={options}
        />
      )}
    </div>
  );
}
