'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Layers, 
  ArrowRightLeft, 
  Wallet, 
  Vault, 
  Filter, 
  RotateCcw, 
  Plus, 
  AlertTriangle,
  Settings2,
  Calendar,
  Sparkles,
  LayoutGrid,
  ListFilter
} from 'lucide-react';
import clsx from 'clsx';
import { useLanguage } from '@/components/layout/LanguageProvider';
import SettlementKPICards from './SettlementKPICards';
import BatchSettlementAccordion from './BatchSettlementAccordion';
import EmployeeTransfersSection from './EmployeeTransfersSection';
import DualLedgersTable from './DualLedgersTable';
import NewTransferModal from './NewTransferModal';
import ReconciliationModal from './ReconciliationModal';
import CustodyOpeningModal from './CustodyOpeningModal';
import { useRouter, useSearchParams } from 'next/navigation';

interface SettlementViewProps {
  initialData: any;
}

const MONTHS = [
  { value: 1, en: 'January', ar: 'يناير' },
  { value: 2, en: 'February', ar: 'فبراير' },
  { value: 3, en: 'March', ar: 'مارس' },
  { value: 4, en: 'April', ar: 'أبريل' },
  { value: 5, en: 'May', ar: 'مايو' },
  { value: 6, en: 'June', ar: 'يونيو' },
  { value: 7, en: 'July', ar: 'يوليو' },
  { value: 8, en: 'August', ar: 'أغسطس' },
  { value: 9, en: 'September', ar: 'سبتمبر' },
  { value: 10, en: 'October', ar: 'أكتوبر' },
  { value: 11, en: 'November', ar: 'نوفمبر' },
  { value: 12, en: 'December', ar: 'ديسمبر' }
];

export default function SettlementView({ initialData }: SettlementViewProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Active module view tab
  const [activeTab, setActiveTab] = useState<'batches' | 'transfers' | 'ledgers'>('batches');

  // Filters State
  const [selectedYear, setSelectedYear] = useState<string>(searchParams.get('year') || '2026');
  const [selectedMonth, setSelectedMonth] = useState<string>(searchParams.get('month') || 'all');
  const [selectedEmployee, setSelectedEmployee] = useState<string>(searchParams.get('employeeId') || 'all');
  const [selectedBatch, setSelectedBatch] = useState<string>(searchParams.get('batchId') || 'all');
  const [selectedTransferType, setSelectedTransferType] = useState<string>(searchParams.get('transferType') || 'all');
  const [isCumulative, setIsCumulative] = useState<boolean>(searchParams.get('cumulative') !== 'false');

  // Modals state
  const [isNewTransferOpen, setIsNewTransferOpen] = useState(false);
  const [isReconciliationOpen, setIsReconciliationOpen] = useState(false);
  const [isOpeningBalancesOpen, setIsOpeningBalancesOpen] = useState(false);

  // Apply URL params when filters change
  const applyFilters = (newFilters: {
    year?: string;
    month?: string;
    employeeId?: string;
    batchId?: string;
    transferType?: string;
    cumulative?: boolean;
  }) => {
    const params = new URLSearchParams();
    const y = newFilters.year !== undefined ? newFilters.year : selectedYear;
    const m = newFilters.month !== undefined ? newFilters.month : selectedMonth;
    const emp = newFilters.employeeId !== undefined ? newFilters.employeeId : selectedEmployee;
    const b = newFilters.batchId !== undefined ? newFilters.batchId : selectedBatch;
    const tt = newFilters.transferType !== undefined ? newFilters.transferType : selectedTransferType;
    const cum = newFilters.cumulative !== undefined ? newFilters.cumulative : isCumulative;

    if (y && y !== 'all') params.set('year', y);
    if (m && m !== 'all') params.set('month', m);
    if (emp && emp !== 'all') params.set('employeeId', emp);
    if (b && b !== 'all') params.set('batchId', b);
    if (tt && tt !== 'all') params.set('transferType', tt);
    if (cum !== undefined) params.set('cumulative', String(cum));

    startTransition(() => {
      router.push(`/petty-cash/settlement?${params.toString()}`);
    });
  };

  const handleResetFilters = () => {
    setSelectedYear('all');
    setSelectedMonth('all');
    setSelectedEmployee('all');
    setSelectedBatch('all');
    setSelectedTransferType('all');
    setIsCumulative(true);
    startTransition(() => {
      router.push('/petty-cash/settlement');
    });
  };

  const refreshData = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  const { kpis, ledgers, batches, transfers, profiles, allBatches, unclassifiedExpenses } = initialData;

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header & Actions */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/petty-cash/dashboard"
            className="flex items-center justify-center w-10 h-10 rounded-2xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors shadow-2xs"
            title={t('Back to Petty Cash Dashboard', 'العودة إلى لوحة تحكم النثريات')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-[#173B63] dark:text-white tracking-tight">
              {t('Employee Settlement & Custody Ledgers', 'تسوية حسابات الموظفين والعهد النقدية')}
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {t(
                'Dual independent financial ledgers: Personal Reimbursements & Company Petty Cash Custody',
                'نظام الكشفين الماليين المنفصلين: استرداد النفقات الشخصية وعهدة النثرية النقدية للشركة'
              )}
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {kpis.unclassifiedCount > 0 && (
            <button
              onClick={() => setIsReconciliationOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              <AlertTriangle className="w-4 h-4 text-amber-500 animate-pulse" />
              <span>{t('Reconciliation Queue', 'مطابقة الفواتير')} ({kpis.unclassifiedCount})</span>
            </button>
          )}

          <button
            onClick={() => setIsOpeningBalancesOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold text-[#173B63] dark:text-zinc-300 transition-colors shadow-2xs cursor-pointer"
          >
            <Settings2 className="w-4 h-4 text-[#0F766E] dark:text-teal-400" />
            <span>{t('Opening Balances', 'الأرصدة الافتتاحية')}</span>
          </button>

          <button
            onClick={() => setIsNewTransferOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#173B63] to-[#0F766E] hover:from-[#1b497f] hover:to-[#0D9488] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('New Transfer', 'تحويل جديد')}</span>
          </button>
        </div>
      </div>

      {/* 2. Global Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-card border border-[#B5CDE2] dark:border-zinc-800 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          <div className="flex items-center gap-1.5 text-zinc-500 font-bold mr-1">
            <Filter className="w-4 h-4 text-[#0F766E] dark:text-teal-400" />
            <span>{t('Filters:', 'التصفية:')}</span>
          </div>

          {/* Year */}
          <select
            value={selectedYear}
            onChange={e => {
              setSelectedYear(e.target.value);
              applyFilters({ year: e.target.value });
            }}
            className="px-2.5 py-1.5 rounded-lg border border-border bg-card text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-[#14B8A6]"
          >
            <option value="all">{t('All Years', 'كل السنوات')}</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>

          {/* Month */}
          <select
            value={selectedMonth}
            onChange={e => {
              setSelectedMonth(e.target.value);
              applyFilters({ month: e.target.value });
            }}
            className="px-2.5 py-1.5 rounded-lg border border-border bg-card text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-[#14B8A6]"
          >
            <option value="all">{t('All Months', 'كل الأشهر')}</option>
            {MONTHS.map(m => (
              <option key={m.value} value={m.value}>
                {t(m.en, m.ar)}
              </option>
            ))}
          </select>

          {/* Employee */}
          <select
            value={selectedEmployee}
            onChange={e => {
              setSelectedEmployee(e.target.value);
              applyFilters({ employeeId: e.target.value });
            }}
            className="px-2.5 py-1.5 rounded-lg border border-border bg-card text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-[#14B8A6] max-w-[170px] truncate"
          >
            <option value="all">{t('All Employees', 'جميع الموظفين')}</option>
            {profiles.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.full_name || p.username}
              </option>
            ))}
          </select>

          {/* Batch */}
          <select
            value={selectedBatch}
            onChange={e => {
              setSelectedBatch(e.target.value);
              applyFilters({ batchId: e.target.value });
            }}
            className="px-2.5 py-1.5 rounded-lg border border-border bg-card text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-[#14B8A6] max-w-[170px] truncate"
          >
            <option value="all">{t('All Batches', 'جميع المجموعات')}</option>
            {allBatches.map((b: any) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          {/* Reset button */}
          <button
            onClick={handleResetFilters}
            className="px-2.5 py-1.5 rounded-lg border border-border hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
            title={t('Reset all filters', 'إعادة ضبط كل الفلاتر')}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t('Reset', 'إعادة ضبط')}</span>
          </button>
        </div>

        {/* Cumulative Balance Toggle (Section H requirement) */}
        <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-border self-start lg:self-center shrink-0">
          <input
            type="checkbox"
            checked={isCumulative}
            onChange={e => {
              setIsCumulative(e.target.checked);
              applyFilters({ cumulative: e.target.checked });
            }}
            className="w-4 h-4 rounded text-[#0F766E] focus:ring-[#14B8A6] cursor-pointer"
          />
          <span className="text-[11px] font-bold text-[#173B63] dark:text-zinc-200">
            {t('Cumulative Balances to Date', 'الأرصدة التراكمية حتى التاريخ')}
          </span>
        </label>
      </div>

      {/* 3. KPI Summary Cards */}
      <SettlementKPICards
        kpis={kpis}
        onOpenReconciliation={() => setIsReconciliationOpen(true)}
      />

      {/* 4. Section Navigation Tabs */}
      <div className="flex items-center border-b border-border text-sm font-semibold">
        <button
          onClick={() => setActiveTab('batches')}
          className={clsx(
            'flex items-center gap-2 px-5 py-3 border-b-2 font-bold transition-all cursor-pointer',
            activeTab === 'batches'
              ? 'border-[#0F766E] text-[#0F766E] dark:text-teal-400 bg-[#F0FDFA] dark:bg-[#0F766E]/10'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          )}
        >
          <Layers className="w-4 h-4" />
          <span>{t('Section A: Expense Settlements by Batch', 'القسم أ: تسويات المصروفات حسب المجموعات')}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-normal">
            {batches.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('transfers')}
          className={clsx(
            'flex items-center gap-2 px-5 py-3 border-b-2 font-bold transition-all cursor-pointer',
            activeTab === 'transfers'
              ? 'border-[#0F766E] text-[#0F766E] dark:text-teal-400 bg-[#F0FDFA] dark:bg-[#0F766E]/10'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          )}
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>{t('Section B: Employee Transfers & Movements', 'القسم ب: حركات التحويل المالي')}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-normal">
            {transfers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('ledgers')}
          className={clsx(
            'flex items-center gap-2 px-5 py-3 border-b-2 font-bold transition-all cursor-pointer',
            activeTab === 'ledgers'
              ? 'border-[#0F766E] text-[#0F766E] dark:text-teal-400 bg-[#F0FDFA] dark:bg-[#0F766E]/10'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          )}
        >
          <Vault className="w-4 h-4" />
          <span>{t('Section E: Final Dual Ledgers Summary', 'القسم ج: كشوفات الحسابات المزدوجة المستقلة')}</span>
        </button>
      </div>

      {/* 5. Main Active Tab View */}
      {activeTab === 'batches' && (
        <BatchSettlementAccordion
          batches={batches}
          onRefresh={refreshData}
        />
      )}

      {activeTab === 'transfers' && (
        <EmployeeTransfersSection
          transfers={transfers}
          profiles={profiles}
          onOpenNewTransfer={() => setIsNewTransferOpen(true)}
          onRefresh={refreshData}
        />
      )}

      {activeTab === 'ledgers' && (
        <DualLedgersTable
          personalLedger={ledgers.personal}
          custodyLedger={ledgers.custody}
          onOpenOpeningBalances={() => setIsOpeningBalancesOpen(true)}
        />
      )}

      {/* 6. Modals */}
      <NewTransferModal
        isOpen={isNewTransferOpen}
        onClose={() => setIsNewTransferOpen(false)}
        onSuccess={refreshData}
        profiles={profiles}
        batches={allBatches}
        custodyLedger={ledgers.custody}
      />

      <ReconciliationModal
        isOpen={isReconciliationOpen}
        onClose={() => setIsReconciliationOpen(false)}
        onSuccess={refreshData}
        unclassifiedExpenses={unclassifiedExpenses}
      />

      <CustodyOpeningModal
        isOpen={isOpeningBalancesOpen}
        onClose={() => setIsOpeningBalancesOpen(false)}
        onSuccess={refreshData}
        profiles={profiles}
        custodyLedger={ledgers.custody}
      />
    </div>
  );
}
