'use client';

import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  Folder, 
  User, 
  Receipt, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Layers,
  Sparkles,
  ExternalLink,
  Loader2
} from 'lucide-react';
import clsx from 'clsx';
import { useLanguage } from '@/components/layout/LanguageProvider';
import { 
  classifyExpenseAction, 
  toggleExpenseReimbursementAction, 
  bulkClassifyExpensesAction, 
  FundingSource 
} from '@/app/(dashboard)/petty-cash/actions/settlementActions';

interface BatchSettlementAccordionProps {
  batches: Array<{
    batchId: string;
    batchName: string;
    month: number;
    year: number;
    status: string;
    pcvNo: string;
    advanceAmount: number;
    totalAmount: number;
    personalAmount: number;
    companyCashAmount: number;
    unclassifiedAmount: number;
    unclassifiedCount: number;
    isFullyReconciled: boolean;
    employees: Array<{
      employeeId: string;
      employeeName: string;
      totalAmount: number;
      personalAmount: number;
      companyCashAmount: number;
      unclassifiedAmount: number;
      expenses: any[];
    }>;
  }>;
  onRefresh: () => void;
}

const formatOMR = (val: number) => {
  return Number(val || 0).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
};

export default function BatchSettlementAccordion({ batches, onRefresh }: BatchSettlementAccordionProps) {
  const { t } = useLanguage();
  const [expandedBatchIds, setExpandedBatchIds] = useState<Set<string>>(new Set(batches.slice(0, 2).map(b => b.batchId)));
  const [expandedEmpKeys, setExpandedEmpKeys] = useState<Set<string>>(new Set());
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const toggleBatch = (id: string) => {
    setExpandedBatchIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleEmp = (key: string) => {
    setExpandedEmpKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleClassify = async (expenseId: string, source: FundingSource) => {
    setActionLoadingId(expenseId);
    await classifyExpenseAction(expenseId, source);
    setActionLoadingId(null);
    onRefresh();
  };

  const handleToggleReimbursed = async (expenseId: string, currentStatus: string) => {
    setActionLoadingId(expenseId);
    await toggleExpenseReimbursementAction(expenseId, currentStatus !== 'reimbursed');
    setActionLoadingId(null);
    onRefresh();
  };

  const handleBulkClassifyBatch = async (batchId: string, source: FundingSource, expenseIds: string[]) => {
    if (!expenseIds.length) return;
    setActionLoadingId(`bulk-${batchId}`);
    await bulkClassifyExpensesAction(expenseIds, source);
    setActionLoadingId(null);
    onRefresh();
  };

  if (batches.length === 0) {
    return (
      <div className="p-8 text-center text-zinc-500 rounded-2xl border border-border bg-card">
        {t('No batches found for the selected period.', 'لا توجد مجموعات مسجلة في هذه الفترة.')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {batches.map(batch => {
        const isExpanded = expandedBatchIds.has(batch.batchId);
        const allExpenseIdsInBatch = batch.employees.flatMap(e => e.expenses.map((exp: any) => exp.id));
        const unclassifiedIdsInBatch = batch.employees.flatMap(e => e.expenses.filter((exp: any) => exp.funding_source === 'unclassified').map((exp: any) => exp.id));

        return (
          <div
            key={batch.batchId}
            className="rounded-3xl border border-[#BDCEE0] dark:border-zinc-800 bg-card shadow-xs overflow-hidden transition-all"
          >
            {/* Batch Header Bar */}
            <div
              onClick={() => toggleBatch(batch.batchId)}
              className="p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 cursor-pointer hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors select-none"
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 transition-transform"
                >
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-[#173B63] dark:text-white">
                      {batch.batchName}
                    </h3>
                    <span className="font-mono text-xs px-2.5 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold border border-zinc-200 dark:border-zinc-700">
                      {batch.batchId}
                    </span>
                    {batch.pcvNo && (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        {batch.pcvNo}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mt-1 flex-wrap">
                    {batch.month > 0 && (
                      <span>{t('Period:', 'الفترة:')} {batch.month}/{batch.year}</span>
                    )}
                    <span>•</span>
                    <span>{batch.employees.length} {t('Employees', 'موظف')}</span>
                    <span>•</span>
                    <span>{allExpenseIdsInBatch.length} {t('Invoices', 'فاتورة')}</span>
                  </div>
                </div>
              </div>

              {/* Financial Snapshot & Reconciliation Status */}
              <div className="flex items-center gap-4 flex-wrap w-full lg:w-auto justify-between lg:justify-end">
                <div className="flex items-center gap-3 text-right">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-zinc-400 font-semibold uppercase">
                      {t('Total Expenses', 'إجمالي المصروفات')}
                    </span>
                    <span className="text-sm font-bold text-[#173B63] dark:text-white">
                      OMR {formatOMR(batch.totalAmount)}
                    </span>
                  </div>

                  <div className="h-7 w-px bg-border" />

                  <div className="flex flex-col">
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold uppercase">
                      {t('Personal', 'شخصي')}
                    </span>
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                      OMR {formatOMR(batch.personalAmount)}
                    </span>
                  </div>

                  <div className="h-7 w-px bg-border" />

                  <div className="flex flex-col">
                    <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold uppercase">
                      {t('Company Cash', 'عهدة نقدية')}
                    </span>
                    <span className="text-sm font-bold text-[#0F766E] dark:text-teal-400">
                      OMR {formatOMR(batch.companyCashAmount)}
                    </span>
                  </div>
                </div>

                {/* Reconciled Badge */}
                {batch.isFullyReconciled ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{t('Reconciled', 'مكتمل التصنيف')}</span>
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1.5 shrink-0">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{batch.unclassifiedCount} {t('Needs Classification', 'غير مصنف')}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="p-5 border-t border-border bg-[#F8FAFC]/50 dark:bg-zinc-900/40 space-y-4">
                {/* Batch Quick Classification Actions if unclassified exist */}
                {unclassifiedIdsInBatch.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-medium">
                      <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>
                        {t(
                          `Batch has ${unclassifiedIdsInBatch.length} unclassified expense(s). Quick classify all in batch:`,
                          `تحتوي هذه المجموعة على ${unclassifiedIdsInBatch.length} مصروف غير مصنف. تصنيف سريع للكل:`
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleBulkClassifyBatch(batch.batchId, 'company_cash', unclassifiedIdsInBatch);
                        }}
                        disabled={actionLoadingId === `bulk-${batch.batchId}`}
                        className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        {actionLoadingId === `bulk-${batch.batchId}` && <Loader2 className="w-3 h-3 animate-spin" />}
                        <span>{t('Mark All Company Cash', 'تحديد الكل عهدة شركة')}</span>
                      </button>

                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleBulkClassifyBatch(batch.batchId, 'personal', unclassifiedIdsInBatch);
                        }}
                        disabled={actionLoadingId === `bulk-${batch.batchId}`}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        {actionLoadingId === `bulk-${batch.batchId}` && <Loader2 className="w-3 h-3 animate-spin" />}
                        <span>{t('Mark All Personal', 'تحديد الكل أموال شخصية')}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Employees in Batch */}
                <div className="space-y-3">
                  {batch.employees.map(emp => {
                    const empKey = `${batch.batchId}-${emp.employeeId}`;
                    const isEmpExpanded = expandedEmpKeys.has(empKey);

                    return (
                      <div
                        key={empKey}
                        className="rounded-2xl border border-border bg-card overflow-hidden shadow-2xs"
                      >
                        {/* Employee Subheader */}
                        <div
                          onClick={() => toggleEmp(empKey)}
                          className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors select-none"
                        >
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              className="w-6 h-6 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500"
                            >
                              {isEmpExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </button>
                            <User className="w-4 h-4 text-[#0F766E] dark:text-teal-400" />
                            <span className="text-xs font-bold text-[#1E3A5F] dark:text-white">
                              {emp.employeeName}
                            </span>
                            <span className="text-[11px] text-zinc-400">
                              ({emp.expenses.length} {t('invoices', 'فواتير')})
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs">
                            <span className="font-semibold text-zinc-500 dark:text-zinc-400">
                              {t('Personal:', 'شخصي:')}{' '}
                              <strong className="text-blue-600 dark:text-blue-400">
                                OMR {formatOMR(emp.personalAmount)}
                              </strong>
                            </span>
                            <span className="text-zinc-300 dark:text-zinc-700">|</span>
                            <span className="font-semibold text-zinc-500 dark:text-zinc-400">
                              {t('Company Cash:', 'عهدة:')}{' '}
                              <strong className="text-[#0F766E] dark:text-teal-400">
                                OMR {formatOMR(emp.companyCashAmount)}
                              </strong>
                            </span>
                            {emp.unclassifiedAmount > 0 && (
                              <>
                                <span className="text-zinc-300 dark:text-zinc-700">|</span>
                                <span className="font-semibold text-amber-600 dark:text-amber-400">
                                  {t('Unclassified:', 'غير مصنف:')}{' '}
                                  <strong>OMR {formatOMR(emp.unclassifiedAmount)}</strong>
                                </span>
                              </>
                            )}
                            <span className="text-zinc-300 dark:text-zinc-700">|</span>
                            <span className="font-bold text-[#173B63] dark:text-white">
                              {t('Total:', 'المجموع:')} OMR {formatOMR(emp.totalAmount)}
                            </span>
                          </div>
                        </div>

                        {/* Employee Transactions Table */}
                        {isEmpExpanded && (
                          <div className="overflow-x-auto border-t border-border">
                            <table className="w-full text-[11px] text-left">
                              <thead className="bg-[#F8FAFC] dark:bg-zinc-800/60 text-zinc-500 uppercase font-semibold border-b border-border">
                                <tr>
                                  <th className="py-2.5 px-3.5">{t('Expense No / Date', 'رقم الفاتورة / التاريخ')}</th>
                                  <th className="py-2.5 px-3.5">{t('Description', 'الوصف')}</th>
                                  <th className="py-2.5 px-3.5">{t('Category / Project', 'التصنيف / المشروع')}</th>
                                  <th className="py-2.5 px-3.5">{t('Amount (OMR)', 'المبلغ')}</th>
                                  <th className="py-2.5 px-3.5">{t('Funding Source', 'جهة التمويل')}</th>
                                  <th className="py-2.5 px-3.5">{t('Reimbursement Status', 'حالة الاسترداد')}</th>
                                  <th className="py-2.5 px-3.5 text-center">{t('Classification Toggle', 'تعديل التمويل')}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {emp.expenses.map((exp: any) => {
                                  const isPersonal = exp.funding_source === 'personal';
                                  const isCash = exp.funding_source === 'company_cash';
                                  const isUnclass = exp.funding_source === 'unclassified';
                                  const isReimbursed = exp.reimbursement_status === 'reimbursed';
                                  const isItemLoading = actionLoadingId === exp.id;

                                  return (
                                    <tr key={exp.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                                      {/* No / Date */}
                                      <td className="py-2.5 px-3.5 font-mono">
                                        <span className="font-bold text-[#173B63] dark:text-white block">
                                          {exp.expense_no}
                                        </span>
                                        <span className="text-[10px] text-zinc-400">
                                          {exp.expense_date}
                                        </span>
                                      </td>

                                      {/* Description */}
                                      <td className="py-2.5 px-3.5 max-w-[200px] truncate text-foreground font-medium" title={exp.request_description}>
                                        {exp.request_description}
                                      </td>

                                      {/* Category / Project */}
                                      <td className="py-2.5 px-3.5 text-zinc-500 dark:text-zinc-400">
                                        <span className="block">{exp.category_name}</span>
                                        <span className="text-[10px] text-[#0F766E] dark:text-teal-400 font-medium">
                                          {exp.project_name}
                                        </span>
                                      </td>

                                      {/* Amount */}
                                      <td className="py-2.5 px-3.5 font-mono font-bold text-xs text-[#173B63] dark:text-white">
                                        OMR {formatOMR(exp.amount)}
                                      </td>

                                      {/* Funding Source Badge */}
                                      <td className="py-2.5 px-3.5">
                                        {isPersonal && (
                                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                                            {t('Personal Funds', 'أموال شخصية')}
                                          </span>
                                        )}
                                        {isCash && (
                                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/30">
                                            {t('Company Cash', 'عهدة الشركة')}
                                          </span>
                                        )}
                                        {isUnclass && (
                                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse">
                                            {t('Needs Classification', 'بحاجة لتصنيف')}
                                          </span>
                                        )}
                                      </td>

                                      {/* Reimbursement Status */}
                                      <td className="py-2.5 px-3.5">
                                        {isPersonal ? (
                                          <button
                                            type="button"
                                            disabled={isItemLoading}
                                            onClick={() => handleToggleReimbursed(exp.id, exp.reimbursement_status)}
                                            className={clsx(
                                              'px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer',
                                              isReimbursed
                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                                            )}
                                          >
                                            {isReimbursed ? t('Settled (Reimbursed)', 'تم الاسترداد') : t('Pending Reimbursement', 'بانتظار الصرف')}
                                          </button>
                                        ) : (
                                          <span className="text-[10px] text-zinc-400">
                                            {t('N/A (Custody Disbursed)', 'غير منطبق (عهدة مسلّمة)')}
                                          </span>
                                        )}
                                      </td>

                                      {/* Classification Toggle Actions */}
                                      <td className="py-2.5 px-3.5 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                          <button
                                            type="button"
                                            disabled={isItemLoading}
                                            onClick={() => handleClassify(exp.id, 'company_cash')}
                                            className={clsx(
                                              'px-2 py-0.5 rounded text-[10px] font-semibold border transition-all cursor-pointer',
                                              isCash
                                                ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                                                : 'border-border text-zinc-600 dark:text-zinc-400 hover:border-teal-500 hover:text-teal-600'
                                            )}
                                            title={t('Funded by company petty cash custody', 'مدفوعة من عهدة الشركة')}
                                          >
                                            {t('Cash', 'عهدة')}
                                          </button>

                                          <button
                                            type="button"
                                            disabled={isItemLoading}
                                            onClick={() => handleClassify(exp.id, 'personal')}
                                            className={clsx(
                                              'px-2 py-0.5 rounded text-[10px] font-semibold border transition-all cursor-pointer',
                                              isPersonal
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                                : 'border-border text-zinc-600 dark:text-zinc-400 hover:border-blue-500 hover:text-blue-600'
                                            )}
                                            title={t('Funded by employee out-of-pocket', 'مدفوعة من حساب الموظف الخاص')}
                                          >
                                            {t('Personal', 'شخصي')}
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
