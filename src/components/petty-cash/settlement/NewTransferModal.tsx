'use client';

import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, AlertCircle, CheckCircle2, ShieldAlert, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { useLanguage } from '@/components/layout/LanguageProvider';
import { createTransferAction, TransferType } from '@/app/(dashboard)/petty-cash/actions/settlementActions';

interface NewTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  profiles: Array<{ id: string; full_name: string | null; username: string | null }>;
  batches: Array<{ id: string; name: string }>;
  custodyLedger: Array<{ employeeId: string; companyCashHeld: number }>;
}

export default function NewTransferModal({
  isOpen,
  onClose,
  onSuccess,
  profiles,
  batches,
  custodyLedger
}: NewTransferModalProps) {
  const { t } = useLanguage();

  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [transferType, setTransferType] = useState<TransferType>('personal_reimbursement_transfer');
  const [fromEmployeeId, setFromEmployeeId] = useState('');
  const [toEmployeeId, setToEmployeeId] = useState('');
  const [amount, setAmount] = useState('');
  const [batchId, setBatchId] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  
  const [allowDeficitOverride, setAllowDeficitOverride] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate suggested reference number based on date
  useEffect(() => {
    if (!referenceNo) {
      const d = new Date(transferDate);
      const y = !isNaN(d.getFullYear()) ? d.getFullYear() : new Date().getFullYear();
      const m = !isNaN(d.getMonth()) ? String(d.getMonth() + 1).padStart(2, '0') : '01';
      const rand = Math.floor(100 + Math.random() * 900);
      setReferenceNo(`TRF-${y}${m}-${rand}`);
    }
  }, [transferDate]);

  if (!isOpen) return null;

  // Determine custody held by selected sender for company cash transfer
  const senderCustody = custodyLedger.find(c => c.employeeId === fromEmployeeId);
  const availableSenderCustody = senderCustody ? senderCustody.companyCashHeld : 0;
  const numAmount = parseFloat(amount) || 0;
  const isCustodyExceeded = transferType === 'company_cash_transfer' && fromEmployeeId && numAmount > availableSenderCustody;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (numAmount <= 0) {
      setError(t('Amount must be greater than zero.', 'يجب أن يكون المبلغ أكبر من صفر.'));
      return;
    }

    if (isCustodyExceeded && !allowDeficitOverride) {
      setError(
        t(
          `Sender only holds OMR ${availableSenderCustody.toFixed(3)}. You must check the authorized exception override to proceed with a negative balance.`,
          `الموظف المحوّل يملك عهدة بقيمة OMR ${availableSenderCustody.toFixed(3)} فقط. يجب تفعيل استثناء التجاوز المعتمد للمتابعة بالرصيد السالب.`
        )
      );
      return;
    }

    setLoading(true);

    const res = await createTransferAction({
      transferDate,
      transferType,
      fromEmployeeId: (transferType === 'company_advance' || transferType === 'company_reimbursement') ? null : fromEmployeeId,
      toEmployeeId: transferType === 'cash_returned_to_company' ? null : toEmployeeId,
      amount: numAmount,
      batchId: batchId || undefined,
      referenceNo: referenceNo.trim() || undefined,
      notes: notes.trim() || undefined,
      allowCustodyDeficit: allowDeficitOverride
    });

    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      onSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 border border-[#B5CDE2] dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-gradient-to-r from-[#173B63] to-[#0F766E] text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <ArrowRightLeft className="w-5 h-5 text-[#2DD4BF]" />
            </div>
            <div>
              <h3 className="text-lg font-bold">
                {t('Record New Transfer', 'تسجيل حركة تحويل مالي جديدة')}
              </h3>
              <p className="text-xs text-white/80">
                {t('Inter-employee settlements, company advances, or custody transfers', 'تسويات بين الموظفين، سلف الشركة، أو تحويلات العهد النقدية')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 custom-scrollbar">
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Transfer Type Selection */}
          <div>
            <label className="block text-xs font-bold text-[#173B63] dark:text-zinc-300 uppercase tracking-wider mb-2">
              {t('Transfer Type', 'نوع التحويل المالي')} <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                {
                  id: 'personal_reimbursement_transfer',
                  title: t('Personal Reimbursement (Peer-to-Peer)', 'استرداد شخصي (بين موظفين)'),
                  desc: t('Employee A uses personal funds to pay Employee B', 'موظف يسدد لموظف آخر من ماله الخاص'),
                  badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                },
                {
                  id: 'company_cash_transfer',
                  title: t('Company Cash Transfer', 'تحويل عهدة نقدية للشركة'),
                  desc: t('Transfer physical petty cash custody to another employee', 'تحويل نقدية من عهدة موظف لعهدة موظف آخر'),
                  badge: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30'
                },
                {
                  id: 'company_advance',
                  title: t('Company Advance to Employee', 'سلفة عهدة نقدية من الشركة'),
                  desc: t('Company issues petty cash custody to employee', 'صرف عهدة نقدية جديدة من خزينة الشركة'),
                  badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                },
                {
                  id: 'company_reimbursement',
                  title: t('Company Reimbursement to Employee', 'صرف مستحقات شخصية من الشركة'),
                  desc: t('Company reimburses employee out-of-pocket expenses', 'الشركة تسدد للموظف نفقاته الشخصية'),
                  badge: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
                },
                {
                  id: 'cash_returned_to_company',
                  title: t('Cash Returned to Company', 'إرجاع عهدة نقدية للشركة'),
                  desc: t('Employee returns unused company petty cash to treasury', 'الموظف يرجع النقدية الفائضة للخزينة'),
                  badge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
                }
              ].map(type => (
                <div
                  key={type.id}
                  onClick={() => setTransferType(type.id as TransferType)}
                  className={clsx(
                    'p-3 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between text-left',
                    transferType === type.id
                      ? 'border-[#0F766E] bg-[#F0FDFA] dark:bg-[#0F766E]/15 dark:border-[#14B8A6] shadow-xs'
                      : 'border-border bg-white dark:bg-zinc-800/40 hover:border-zinc-400 dark:hover:border-zinc-700'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-[#173B63] dark:text-zinc-200">
                      {type.title}
                    </span>
                    {transferType === type.id && (
                      <CheckCircle2 className="w-4 h-4 text-[#0F766E] dark:text-teal-400 shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {type.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Date & Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                {t('Transfer Date', 'تاريخ التحويل')} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={transferDate}
                onChange={e => setTransferDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                {t('Reference Number', 'الرقم المرجعي للتحويل')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={referenceNo}
                onChange={e => setReferenceNo(e.target.value)}
                placeholder="TRF-202611-001"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
              />
            </div>
          </div>

          {/* Participants (From / To) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-border">
            {/* FROM */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                {t('From (Source)', 'الطرف المحوّل (المصدر)')} <span className="text-red-500">*</span>
              </label>
              {transferType === 'company_advance' || transferType === 'company_reimbursement' ? (
                <div className="px-3.5 py-2.5 rounded-xl bg-zinc-200 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300 text-sm font-semibold">
                  🏢 {t('ECTRON Company Treasury', 'خزينة شركة إلكترون')}
                </div>
              ) : (
                <>
                  <select
                    required
                    value={fromEmployeeId}
                    onChange={e => setFromEmployeeId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
                  >
                    <option value="">{t('-- Select Source Employee --', '-- اختر الموظف المحول --')}</option>
                    {profiles.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.full_name || p.username}
                      </option>
                    ))}
                  </select>
                  {transferType === 'company_cash_transfer' && fromEmployeeId && (
                    <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mt-1 block">
                      {t('Current company cash custody:', 'العهدة الحالية للموظف:')}{' '}
                      <strong className={availableSenderCustody < 0 ? 'text-red-500' : 'text-[#0F766E] dark:text-teal-400'}>
                        OMR {availableSenderCustody.toFixed(3)}
                      </strong>
                    </span>
                  )}
                </>
              )}
            </div>

            {/* TO */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                {t('To (Recipient)', 'الطرف المستلم')} <span className="text-red-500">*</span>
              </label>
              {transferType === 'cash_returned_to_company' ? (
                <div className="px-3.5 py-2.5 rounded-xl bg-zinc-200 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300 text-sm font-semibold">
                  🏢 {t('ECTRON Company Treasury', 'خزينة شركة إلكترون')}
                </div>
              ) : (
                <select
                  required
                  value={toEmployeeId}
                  onChange={e => setToEmployeeId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
                >
                  <option value="">{t('-- Select Recipient Employee --', '-- اختر الموظف المستلم --')}</option>
                  {profiles
                    .filter(p => p.id !== fromEmployeeId)
                    .map(p => (
                      <option key={p.id} value={p.id}>
                        {p.full_name || p.username}
                      </option>
                    ))}
                </select>
              )}
            </div>
          </div>

          {/* Amount & Related Batch */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                {t('Amount (OMR)', 'المبلغ بالريال العماني')} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-extrabold text-[#0F766E] dark:text-teal-400">
                  OMR
                </span>
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  required
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.000"
                  className="w-full pl-14 pr-3.5 py-2.5 rounded-xl border border-border bg-card text-foreground font-mono text-base font-bold focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                {t('Related Batch (Optional)', 'المجموعة المرتبطة (اختياري)')}
              </label>
              <select
                value={batchId}
                onChange={e => setBatchId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
              >
                <option value="">{t('-- None / General Transfer --', '-- بدون / تحويل عام --')}</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Custody Overdraw Warning / Exception Override */}
          {isCustodyExceeded && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 space-y-2">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-xs font-bold">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{t('Custody Limit Exceeded', 'تحذير: تجاوز حد العهدة النقدية المتاحة')}</span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                {t(
                  `The transfer amount (OMR ${numAmount.toFixed(3)}) exceeds available company cash (OMR ${availableSenderCustody.toFixed(3)}). This will result in a negative company cash deficit.`,
                  `مبلغ التحويل (OMR ${numAmount.toFixed(3)}) يتجاوز رصيد النقدية المتاحة (OMR ${availableSenderCustody.toFixed(3)}). سينتج عن ذلك عجز نقدي سالب.`
                )}
              </p>
              <label className="flex items-center gap-2.5 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowDeficitOverride}
                  onChange={e => setAllowDeficitOverride(e.target.checked)}
                  className="rounded border-zinc-400 text-red-600 focus:ring-red-500 w-4 h-4"
                />
                <span className="text-xs font-semibold text-red-700 dark:text-red-300">
                  {t('Authorize exception workflow (Allow custody deficit)', 'اعتماد استثناء رسمي وتخويل تسجيل العجز')}
                </span>
              </label>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              {t('Notes & Business Justification', 'ملاحظات وتبرير التحويل')}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={t('Enter details, PCV number, bank transfer reference, etc...', 'أدخل تفاصيل التحويل، رقم سند الصرف، إشعار بنكي، إلخ...')}
              className="w-full px-3.5 py-2 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl border border-border hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm font-semibold transition-colors cursor-pointer"
            >
              {t('Cancel', 'إلغاء')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#173B63] to-[#0F766E] hover:from-[#1b497f] hover:to-[#0D9488] text-white text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{t('Confirm & Record Transfer', 'تأكيد وتسجيل التحويل')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
