'use client';

import React, { useState } from 'react';
import { X, Vault, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useLanguage } from '@/components/layout/LanguageProvider';
import { updateCustodyOpeningBalanceAction } from '@/app/(dashboard)/petty-cash/actions/settlementActions';

interface CustodyOpeningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  profiles: Array<{ id: string; full_name: string | null; username: string | null }>;
  custodyLedger: Array<{ employeeId: string; openingBalance: number }>;
}

export default function CustodyOpeningModal({
  isOpen,
  onClose,
  onSuccess,
  profiles,
  custodyLedger
}: CustodyOpeningModalProps) {
  const { t } = useLanguage();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectEmployee = (id: string) => {
    setSelectedEmployeeId(id);
    const existing = custodyLedger.find(c => c.employeeId === id);
    if (existing) {
      setOpeningBalance(String(existing.openingBalance || ''));
    } else {
      setOpeningBalance('0');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId) {
      setError(t('Please select an employee.', 'يرجى اختيار الموظف.'));
      return;
    }

    setLoading(true);
    setError(null);

    const res = await updateCustodyOpeningBalanceAction(
      selectedEmployeeId,
      parseFloat(openingBalance) || 0,
      asOfDate,
      notes.trim() || undefined
    );

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
      <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-teal-900/20 to-teal-500/10 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600/20 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Vault className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#173B63] dark:text-white">
                {t('Employee Custody Opening Balances', 'الأرصدة الافتتاحية لعهدة الموظفين')}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {t('Set starting cash custody for employees from prior accounting periods.', 'تحديد رصيد العهدة النقدية الأولي للموظفين من فترات محاسبية سابقة.')}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              {t('Employee', 'الموظف')} <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={selectedEmployeeId}
              onChange={e => handleSelectEmployee(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">{t('-- Select Employee --', '-- اختر الموظف --')}</option>
              {profiles.map(p => {
                const cur = custodyLedger.find(c => c.employeeId === p.id);
                return (
                  <option key={p.id} value={p.id}>
                    {p.full_name || p.username} {cur && cur.openingBalance > 0 ? `(Current Opening: OMR ${cur.openingBalance.toFixed(3)})` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                {t('Opening Balance (OMR)', 'الرصيد الافتتاحي (ر.ع)')} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                required
                value={openingBalance}
                onChange={e => setOpeningBalance(e.target.value)}
                placeholder="0.000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-foreground font-mono text-sm font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                {t('As of Date', 'اعتباراً من تاريخ')} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={asOfDate}
                onChange={e => setAsOfDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              {t('Notes & Reference', 'ملاحظات ومرجع التسوية')}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={t('e.g. Carried forward cash custody from previous fiscal quarter...', 'مثال: عهدة نقدية مرحلة من الربع المالي السابق...')}
              className="w-full px-3.5 py-2 rounded-xl border border-border bg-card text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              {t('Cancel', 'إلغاء')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{t('Save Opening Balance', 'حفظ الرصيد الافتتاحي')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
