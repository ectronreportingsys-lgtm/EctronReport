'use client';

import React, { useState } from 'react';
import { 
  User, 
  Wallet, 
  Vault, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  ArrowRight,
  ChevronRight,
  TrendingUp,
  Settings2
} from 'lucide-react';
import clsx from 'clsx';
import { useLanguage } from '@/components/layout/LanguageProvider';

interface DualLedgersTableProps {
  personalLedger: Array<{
    employeeId: string;
    employeeName: string;
    username: string;
    personalExpensesPaid: number;
    reimbursementTransfersSent: number;
    reimbursementTransfersReceived: number;
    companyReimbursementsReceived: number;
    personalReceivable: number;
    isOverpaid: boolean;
  }>;
  custodyLedger: Array<{
    employeeId: string;
    employeeName: string;
    username: string;
    openingBalance: number;
    advancesReceived: number;
    custodyTransfersReceived: number;
    custodyTransfersSent: number;
    companyExpensesPaid: number;
    cashReturned: number;
    companyCashHeld: number;
    isDeficit: boolean;
  }>;
  onOpenOpeningBalances?: () => void;
}

const formatOMR = (val: number) => {
  return Number(val || 0).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
};

export default function DualLedgersTable({
  personalLedger,
  custodyLedger,
  onOpenOpeningBalances
}: DualLedgersTableProps) {
  const { t } = useLanguage();
  const [activeLedgerTab, setActiveLedgerTab] = useState<'both' | 'personal' | 'custody'>('both');

  return (
    <div className="space-y-6">
      {/* Tab Switcher & Subtitle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#173B63] dark:text-white flex items-center gap-2">
            <span>{t('Final Employee Summary (Independent Ledgers)', 'كشوف الحسابات المستقلة للموظفين')}</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {t(
              'Personal receivables and company petty cash custody are tracked in two strictly separate ledgers and are never automatically netted.',
              'تُفصل مستحقات الموظف الشخصية عن عهدة الشركة النقدية في كشفين مستقلين تماماً ولا يتم دمجهما تلقائياً أبداً.'
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-border">
            <button
              onClick={() => setActiveLedgerTab('both')}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                activeLedgerTab === 'both'
                  ? 'bg-white dark:bg-zinc-700 text-[#173B63] dark:text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              )}
            >
              {t('Both Ledgers', 'الكشفان معاً')}
            </button>
            <button
              onClick={() => setActiveLedgerTab('personal')}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                activeLedgerTab === 'personal'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-zinc-500 hover:text-blue-600'
              )}
            >
              {t('Personal Reimbursements', 'المصروفات الشخصية')}
            </button>
            <button
              onClick={() => setActiveLedgerTab('custody')}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                activeLedgerTab === 'custody'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-zinc-500 hover:text-teal-600'
              )}
            >
              {t('Company Custody', 'عهدة الشركة')}
            </button>
          </div>

          {onOpenOpeningBalances && (
            <button
              onClick={onOpenOpeningBalances}
              className="px-3 py-2 rounded-xl border border-border bg-card hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold text-[#173B63] dark:text-zinc-300 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Settings2 className="w-3.5 h-3.5 text-[#0F766E] dark:text-teal-400" />
              <span>{t('Opening Balances', 'الأرصدة الافتتاحية')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid of Tables */}
      <div className={clsx(
        'grid gap-6',
        activeLedgerTab === 'both' ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'
      )}>
        {/* ========================================================================= */}
        {/* LEDGER 1: Personal Expense Reimbursements */}
        {/* ========================================================================= */}
        {(activeLedgerTab === 'both' || activeLedgerTab === 'personal') && (
          <div className="rounded-3xl border border-[#BDCEE0] dark:border-zinc-800 bg-card shadow-xs overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-blue-900/10 to-blue-500/10 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#173B63] dark:text-white">
                    {t('Ledger 1: Personal Expense Reimbursements', 'الكشف الأول: استرداد المصروفات الشخصية')}
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {t('Paid personal funds vs reimbursements received', 'المدفوع من أموال الموظف مقابل الاستردادات')}
                  </p>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F8FAFC] dark:bg-zinc-800/80 text-[#2B4C6F] dark:text-zinc-300 uppercase tracking-wider font-bold border-b border-border">
                  <tr>
                    <th className="py-3 px-3.5">{t('Employee', 'الموظف')}</th>
                    <th className="py-3 px-3">{t('Personal Paid (+)', 'شخصي مدفوع (+)')}</th>
                    <th className="py-3 px-3">{t('Peer Trfs (Net)', 'تحويلات الزملاء')}</th>
                    <th className="py-3 px-3">{t('Reimbursed (-)', 'تم استرداده (-)')}</th>
                    <th className="py-3 px-3 text-right">{t('Personal Receivable', 'صافي المستحق')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {personalLedger.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-zinc-500">
                        {t('No personal expense activity recorded.', 'لا توجد حركات استرداد شخصي مسجلة.')}
                      </td>
                    </tr>
                  ) : (
                    personalLedger.map(emp => {
                      const netPeerTrf = emp.reimbursementTransfersSent - emp.reimbursementTransfersReceived;
                      return (
                        <tr key={emp.employeeId} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition-colors">
                          <td className="py-3 px-3.5">
                            <span className="font-bold text-[#173B63] dark:text-white block">
                              {emp.employeeName}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-mono">
                              {emp.username || emp.employeeId.slice(0, 8)}
                            </span>
                          </td>

                          <td className="py-3 px-3 font-mono font-medium text-zinc-700 dark:text-zinc-300">
                            OMR {formatOMR(emp.personalExpensesPaid)}
                          </td>

                          <td className="py-3 px-3 font-mono text-[11px]">
                            {netPeerTrf === 0 ? (
                              <span className="text-zinc-400">-</span>
                            ) : netPeerTrf > 0 ? (
                              <span className="text-blue-600 dark:text-blue-400 font-semibold">
                                +OMR {formatOMR(netPeerTrf)}
                              </span>
                            ) : (
                              <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                -OMR {formatOMR(Math.abs(netPeerTrf))}
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3 font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                            OMR {formatOMR(emp.companyReimbursementsReceived)}
                          </td>

                          <td className="py-3 px-3 text-right">
                            {emp.isOverpaid ? (
                              <div>
                                <span className="font-mono font-bold text-xs text-red-600 dark:text-red-400">
                                  -OMR {formatOMR(Math.abs(emp.personalReceivable))}
                                </span>
                                <span className="block text-[9px] font-bold text-red-500 uppercase">
                                  {t('Overpayment Review', 'فائض يتطلب مراجعة')}
                                </span>
                              </div>
                            ) : emp.personalReceivable > 0 ? (
                              <div>
                                <span className="font-mono font-bold text-xs text-[#0F766E] dark:text-teal-400">
                                  OMR {formatOMR(emp.personalReceivable)}
                                </span>
                                <span className="block text-[9px] font-semibold text-zinc-400">
                                  {t('Due to Employee', 'مستحق للموظف')}
                                </span>
                              </div>
                            ) : (
                              <span className="font-mono text-xs text-zinc-400 font-semibold">
                                OMR 0.000
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 border-t border-border text-[11px] text-zinc-500 flex justify-between items-center">
              <span>{t('Personal Receivable = Personal Paid + Trfs Sent - Trfs Recv - Reimbursed', 'المستحق الشخصي = المدفوع + المحول له - المستلم منه - المنصرف له')}</span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* LEDGER 2: Company Petty Cash Custody & Internal Transfers */}
        {/* ========================================================================= */}
        {(activeLedgerTab === 'both' || activeLedgerTab === 'custody') && (
          <div className="rounded-3xl border border-[#BDCEE0] dark:border-zinc-800 bg-card shadow-xs overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-teal-900/10 to-teal-500/10 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-600/15 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <Vault className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#173B63] dark:text-white">
                    {t('Ledger 2: Company Petty Cash Custody', 'الكشف الثاني: عهدة النثرية النقدية للشركة')}
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {t('Physical cash custody held and disbursed by employee', 'النقدية المستلمة تحت مسؤولية الموظف والمنصرفة منها')}
                  </p>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F8FAFC] dark:bg-zinc-800/80 text-[#2B4C6F] dark:text-zinc-300 uppercase tracking-wider font-bold border-b border-border">
                  <tr>
                    <th className="py-3 px-3.5">{t('Employee', 'الموظف')}</th>
                    <th className="py-3 px-3">{t('Opening / Advances (+)', 'الافتتاحي والسلف (+)')}</th>
                    <th className="py-3 px-3">{t('Custody Trfs (Net)', 'صافي تحويلات العهدة')}</th>
                    <th className="py-3 px-3">{t('Paid Cash (-)', 'منصرف نقد (-)')}</th>
                    <th className="py-3 px-3 text-right">{t('Company Cash Held', 'الرصيد المتبقي بالعهدة')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {custodyLedger.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-zinc-500">
                        {t('No company cash custody activity recorded.', 'لا توجد حركات عهد نقدية مسجلة.')}
                      </td>
                    </tr>
                  ) : (
                    custodyLedger.map(emp => {
                      const totalIn = emp.openingBalance + emp.advancesReceived;
                      const netCustodyTrf = emp.custodyTransfersReceived - emp.custodyTransfersSent;
                      return (
                        <tr key={emp.employeeId} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition-colors">
                          <td className="py-3 px-3.5">
                            <span className="font-bold text-[#173B63] dark:text-white block">
                              {emp.employeeName}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-mono">
                              {emp.username || emp.employeeId.slice(0, 8)}
                            </span>
                          </td>

                          <td className="py-3 px-3 font-mono font-medium text-zinc-700 dark:text-zinc-300">
                            OMR {formatOMR(totalIn)}
                          </td>

                          <td className="py-3 px-3 font-mono text-[11px]">
                            {netCustodyTrf === 0 ? (
                              <span className="text-zinc-400">-</span>
                            ) : netCustodyTrf > 0 ? (
                              <span className="text-teal-600 dark:text-teal-400 font-semibold">
                                +OMR {formatOMR(netCustodyTrf)}
                              </span>
                            ) : (
                              <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                -OMR {formatOMR(Math.abs(netCustodyTrf))}
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3 font-mono text-zinc-700 dark:text-zinc-300 font-medium">
                            OMR {formatOMR(emp.companyExpensesPaid + emp.cashReturned)}
                          </td>

                          <td className="py-3 px-3 text-right">
                            {emp.isDeficit ? (
                              <div>
                                <span className="font-mono font-bold text-xs text-red-600 dark:text-red-400">
                                  -OMR {formatOMR(Math.abs(emp.companyCashHeld))}
                                </span>
                                <span className="block text-[9px] font-bold text-red-500 uppercase">
                                  {t('Deficit Exception', 'عجز في العهدة')}
                                </span>
                              </div>
                            ) : emp.companyCashHeld > 0 ? (
                              <div>
                                <span className="font-mono font-bold text-xs text-[#0F766E] dark:text-teal-400">
                                  OMR {formatOMR(emp.companyCashHeld)}
                                </span>
                                <span className="block text-[9px] font-semibold text-zinc-400">
                                  {t('In Custody', 'نقدية بالعهدة')}
                                </span>
                              </div>
                            ) : (
                              <span className="font-mono text-xs text-zinc-400 font-semibold">
                                OMR 0.000
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 border-t border-border text-[11px] text-zinc-500 flex justify-between items-center">
              <span>{t('Cash Held = Opening + Advances + Trfs Recv - Trfs Sent - Expenses from Cash - Returned', 'العهدة = الافتتاحي + السلف + المستلم - المحول - المنصرف نقد - المرتجع')}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
