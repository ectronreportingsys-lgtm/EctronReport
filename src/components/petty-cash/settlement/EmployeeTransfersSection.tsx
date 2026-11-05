'use client';

import React, { useState } from 'react';
import { 
  ArrowLeftRight, 
  Plus, 
  RotateCcw, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  FileText,
  Building,
  User,
  Loader2
} from 'lucide-react';
import clsx from 'clsx';
import { useLanguage } from '@/components/layout/LanguageProvider';
import { SettlementTransfer, reverseTransferAction } from '@/app/(dashboard)/petty-cash/actions/settlementActions';

interface EmployeeTransfersSectionProps {
  transfers: SettlementTransfer[];
  profiles: Array<{ id: string; full_name: string | null; username: string | null }>;
  onOpenNewTransfer: () => void;
  onRefresh: () => void;
}

const formatOMR = (val: number) => {
  return Number(val || 0).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
};

export default function EmployeeTransfersSection({
  transfers,
  profiles,
  onOpenNewTransfer,
  onRefresh
}: EmployeeTransfersSectionProps) {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  
  // Reversal Dialog State
  const [reversingTransfer, setReversingTransfer] = useState<SettlementTransfer | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [reversingLoading, setReversingLoading] = useState(false);
  const [reversalError, setReversalError] = useState<string | null>(null);

  const getEmployeeName = (id: string | null) => {
    if (!id) return t('ECTRON Company Treasury', 'خزينة شركة إلكترون');
    const p = profiles.find(item => item.id === id);
    return p ? (p.full_name || p.username || 'Unknown') : id;
  };

  const getTransferTypeBadge = (type: string) => {
    switch (type) {
      case 'personal_reimbursement_transfer':
        return {
          label: t('Personal Reimbursement', 'استرداد شخصي (موظف لموظف)'),
          classes: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
        };
      case 'company_cash_transfer':
        return {
          label: t('Company Cash Transfer', 'تحويل عهدة نقدية'),
          classes: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30'
        };
      case 'company_advance':
        return {
          label: t('Company Advance', 'سلفة من الشركة'),
          classes: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
        };
      case 'company_reimbursement':
        return {
          label: t('Company Reimbursement', 'صرف مستحقات من الشركة'),
          classes: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
        };
      case 'cash_returned_to_company':
        return {
          label: t('Cash Returned to Company', 'إرجاع عهدة للشركة'),
          classes: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
        };
      default:
        return {
          label: type,
          classes: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30'
        };
    }
  };

  const filteredTransfers = transfers.filter(tr => {
    if (typeFilter !== 'all' && tr.transferType !== typeFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const ref = (tr.referenceNo || '').toLowerCase();
      const notes = (tr.notes || '').toLowerCase();
      const from = getEmployeeName(tr.fromEmployeeId).toLowerCase();
      const to = getEmployeeName(tr.toEmployeeId).toLowerCase();
      if (!ref.includes(q) && !notes.includes(q) && !from.includes(q) && !to.includes(q)) return false;
    }
    return true;
  });

  const handleExecuteReversal = async () => {
    if (!reversingTransfer) return;
    if (!reversalReason.trim()) {
      setReversalError(t('Reversal reason is required.', 'سبب الإلغاء/القيد العكسي مطلوب.'));
      return;
    }

    setReversingLoading(true);
    setReversalError(null);

    const res = await reverseTransferAction(reversingTransfer.id, reversalReason);
    setReversingLoading(false);

    if (res.error) {
      setReversalError(res.error);
    } else {
      setReversingTransfer(null);
      setReversalReason('');
      onRefresh();
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={t('Search reference, employee, notes...', 'بحث بالمرجع، اسم الموظف، الملاحظات...')}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-card text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
            />
          </div>

          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-border bg-card text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
          >
            <option value="all">{t('All Types', 'جميع الأنواع')}</option>
            <option value="personal_reimbursement_transfer">{t('Personal Reimbursement', 'استرداد شخصي')}</option>
            <option value="company_cash_transfer">{t('Company Cash Transfer', 'تحويل عهدة نقدية')}</option>
            <option value="company_advance">{t('Company Advance', 'سلفة شركة')}</option>
            <option value="company_reimbursement">{t('Company Reimbursement', 'صرف مستحقات')}</option>
            <option value="cash_returned_to_company">{t('Cash Returned', 'إرجاع عهدة')}</option>
          </select>
        </div>

        <button
          onClick={onOpenNewTransfer}
          className="flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-[#173B63] to-[#0F766E] hover:from-[#1b497f] hover:to-[#0D9488] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{t('New Transfer', 'تسجيل تحويل جديد')}</span>
        </button>
      </div>

      {/* Transfers History Table */}
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-xs">
        <table className="w-full text-xs text-left">
          <thead className="bg-[#F0F6FA] dark:bg-zinc-800/80 text-[#2B4C6F] dark:text-zinc-300 uppercase tracking-wider font-bold border-b border-border">
            <tr>
              <th className="py-3 px-4">{t('Ref No / Date', 'المرجع / التاريخ')}</th>
              <th className="py-3 px-4">{t('Transfer Type', 'نوع التحويل')}</th>
              <th className="py-3 px-4">{t('From (Source)', 'من (المصدر)')}</th>
              <th className="py-3 px-4">{t('To (Recipient)', 'إلى (المستلم)')}</th>
              <th className="py-3 px-4">{t('Batch', 'المجموعة')}</th>
              <th className="py-3 px-4">{t('Amount (OMR)', 'المبلغ')}</th>
              <th className="py-3 px-4">{t('Status', 'الحالة')}</th>
              <th className="py-3 px-4 text-center">{t('Actions', 'الإجراءات')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredTransfers.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-zinc-500">
                  {t('No transfer records found matching the criteria.', 'لا توجد حركات تحويل مطابقة للشروط.')}
                </td>
              </tr>
            ) : (
              filteredTransfers.map(tr => {
                const badge = getTransferTypeBadge(tr.transferType);
                return (
                  <tr
                    key={tr.id}
                    className={clsx(
                      'hover:bg-[#F8FAFC] dark:hover:bg-zinc-800/40 transition-colors',
                      tr.isReversed && 'opacity-60 bg-red-500/5'
                    )}
                  >
                    {/* Ref No & Date */}
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-[#173B63] dark:text-white block">
                        {tr.referenceNo}
                      </span>
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {tr.transferDate}
                      </span>
                    </td>

                    {/* Transfer Type */}
                    <td className="py-3.5 px-4">
                      <span className={clsx('inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold border', badge.classes)}>
                        {badge.label}
                      </span>
                      {tr.notes && (
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 truncate max-w-[220px]" title={tr.notes}>
                          {tr.notes}
                        </p>
                      )}
                    </td>

                    {/* From */}
                    <td className="py-3.5 px-4 font-medium text-[#1E3A5F] dark:text-zinc-200">
                      <div className="flex items-center gap-1.5">
                        {!tr.fromEmployeeId ? (
                          <Building className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        ) : (
                          <User className="w-3.5 h-3.5 text-[#0F766E] dark:text-teal-400 shrink-0" />
                        )}
                        <span className="truncate max-w-[140px]">{getEmployeeName(tr.fromEmployeeId)}</span>
                      </div>
                    </td>

                    {/* To */}
                    <td className="py-3.5 px-4 font-medium text-[#1E3A5F] dark:text-zinc-200">
                      <div className="flex items-center gap-1.5">
                        {!tr.toEmployeeId ? (
                          <Building className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        ) : (
                          <User className="w-3.5 h-3.5 text-[#14B8A6] dark:text-teal-400 shrink-0" />
                        )}
                        <span className="truncate max-w-[140px]">{getEmployeeName(tr.toEmployeeId)}</span>
                      </div>
                    </td>

                    {/* Batch */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                      {tr.batchId || '-'}
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 font-mono font-bold text-sm text-[#173B63] dark:text-white">
                      OMR {formatOMR(tr.amount)}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {tr.isReversed ? (
                        <div>
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30">
                            {t('Reversed', 'تم الإلغاء بقيد عكسي')}
                          </span>
                          {tr.reversalReason && (
                            <span className="block text-[10px] text-red-500 mt-0.5 truncate max-w-[140px]" title={tr.reversalReason}>
                              {tr.reversalReason}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          {t('Active', 'قيد نشط ومثبت')}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center">
                      {!tr.isReversed && (
                        <button
                          onClick={() => {
                            setReversingTransfer(tr);
                            setReversalReason('');
                            setReversalError(null);
                          }}
                          className="px-2.5 py-1 rounded-lg border border-red-500/30 hover:bg-red-500/10 text-red-600 dark:text-red-400 text-[11px] font-semibold transition-colors cursor-pointer inline-flex items-center gap-1"
                          title={t('Cancel through an offsetting reversal entry', 'إلغاء من خلال إدخال قيد عكسي مطابق')}
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>{t('Reverse', 'قيد عكسي')}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Reversal Confirmation Modal */}
      {reversingTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-red-500/30 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold">
                  {t('Reverse Transfer Entry', 'إدخال قيد عكسي للتحويل')}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {reversingTransfer.referenceNo} (OMR {formatOMR(reversingTransfer.amount)})
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              {t(
                'Per financial audit standards, this transfer will NOT be erased from history. An offsetting reversal entry will be generated to balance out the ledger accurately.',
                'وفقاً لمعايير التدقيق المالي، لن يتم حذف هذا التحويل من السجلات، بل سيتم تسجيل قيد عكسي مطابق لعكس أثره المالي في كشوف الحسابات بدقة.'
              )}
            </p>

            {reversalError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 text-xs">
                {reversalError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                {t('Reason for Reversal', 'سبب القيد العكسي')} <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={2}
                required
                value={reversalReason}
                onChange={e => setReversalReason(e.target.value)}
                placeholder={t('e.g. Incorrect recipient selected, duplicate entry...', 'مثال: خطأ في تحديد المستلم، قيد مكرر بالخطأ...')}
                className="w-full px-3.5 py-2 rounded-xl border border-border bg-card text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setReversingTransfer(null)}
                disabled={reversingLoading}
                className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                {t('Cancel', 'إلغاء')}
              </button>
              <button
                type="button"
                onClick={handleExecuteReversal}
                disabled={reversingLoading}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {reversingLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{t('Confirm Reversal', 'تأكيد القيد العكسي')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
