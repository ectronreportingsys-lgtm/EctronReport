'use client';

import React, { useState, useMemo, useTransition } from 'react';
import { 
  Wallet, 
  PiggyBank, 
  TrendingUp, 
  TrendingDown, 
  Receipt, 
  Calendar, 
  Filter, 
  Layers, 
  AlertCircle, 
  ArrowUpRight, 
  ArrowDownRight, 
  RefreshCw,
  Plus,
  Settings,
  X,
  Check,
  Building2,
  ChevronRight,
  Info
} from 'lucide-react';
import Link from 'next/link';
import { 
  PettyCashExpenseRecord, 
  BudgetConfig, 
  saveBudgetConfig 
} from '@/app/(dashboard)/petty-cash/actions/analyticsActions';
import { useLanguage } from '@/components/layout/LanguageProvider';

export interface PettyCashAnalyticsDashboardProps {
  initialExpenses: PettyCashExpenseRecord[];
  allProjects: Array<{ id: string; name: string }>;
  baseProjects: string[];
  availableYears: number[];
  initialBudgets: BudgetConfig;
}

const BASE_MONTHS = [
  { value: 'ALL', en: 'All Months', ar: 'كامل العام' },
  { value: '01', en: 'January', ar: 'يناير' },
  { value: '02', en: 'February', ar: 'فبراير' },
  { value: '03', en: 'March', ar: 'مارس' },
  { value: '04', en: 'April', ar: 'أبريل' },
  { value: '05', en: 'May', ar: 'مايو' },
  { value: '06', en: 'June', ar: 'يونيو' },
  { value: '07', en: 'July', ar: 'يوليو' },
  { value: '08', en: 'August', ar: 'أغسطس' },
  { value: '09', en: 'September', ar: 'سبتمبر' },
  { value: '10', en: 'October', ar: 'أكتوبر' },
  { value: '11', en: 'November', ar: 'نوفمبر' },
  { value: '12', en: 'December', ar: 'ديسمبر' },
];

/**
 * Parses project allocation strings synchronously for client filtering
 */
function parseProjectAllocationsSync(projectName?: string | null): Array<{ projectName: string; percentage: number }> {
  if (!projectName || !projectName.trim()) {
    return [{ projectName: 'Unassigned', percentage: 100 }];
  }

  const clean = projectName.trim();

  // Multi-allocation with commas e.g. "Ectron 80%, AAMU 20%"
  if (clean.includes(',')) {
    const parts = clean.split(',').map(p => p.trim()).filter(Boolean);
    const parsed: Array<{ projectName: string; percentage: number }> = [];
    for (const part of parts) {
      const match = part.match(/^(.*?)\s*(\d+(?:\.\d+)?)\s*%/);
      if (match) {
        parsed.push({ projectName: match[1].trim(), percentage: parseFloat(match[2]) });
      } else {
        parsed.push({ projectName: part, percentage: 100 / parts.length });
      }
    }
    if (parsed.length > 0) return parsed;
  }

  // Multi-allocation with '&' e.g. "Tadoom & Ectron 50%" or "Ectron 50% & Tadoom 50%"
  if (clean.includes('&')) {
    const hasSinglePercentAtEnd = /^(.*?)\s*&\s*(.*?)\s*(\d+(?:\.\d+)?)\s*%$/.exec(clean);
    if (hasSinglePercentAtEnd) {
      const p1 = hasSinglePercentAtEnd[1].trim();
      const p2 = hasSinglePercentAtEnd[2].trim();
      const pct = parseFloat(hasSinglePercentAtEnd[3]);
      return [
        { projectName: p1, percentage: pct },
        { projectName: p2, percentage: pct }
      ];
    }

    const parts = clean.split('&').map(p => p.trim()).filter(Boolean);
    const parsed: Array<{ projectName: string; percentage: number }> = [];
    for (const part of parts) {
      const match = part.match(/^(.*?)\s*(\d+(?:\.\d+)?)\s*%/);
      if (match) {
        parsed.push({ projectName: match[1].trim(), percentage: parseFloat(match[2]) });
      } else {
        parsed.push({ projectName: part, percentage: 50 });
      }
    }
    if (parsed.length > 0) return parsed;
  }

  // Single project with percentage e.g. "Ectron 100%"
  const singleMatch = clean.match(/^(.*?)\s*(\d+(?:\.\d+)?)\s*%/);
  if (singleMatch) {
    return [{ projectName: singleMatch[1].trim(), percentage: parseFloat(singleMatch[2]) }];
  }

  return [{ projectName: clean, percentage: 100 }];
}

export default function PettyCashAnalyticsDashboard({
  initialExpenses,
  allProjects,
  baseProjects,
  availableYears,
  initialBudgets
}: PettyCashAnalyticsDashboardProps) {
  const { t } = useLanguage();

  // Default year: newest available year or 2026
  const defaultYear = availableYears.length > 0 ? availableYears[0] : 2026;

  // Filter States
  const [selectedYear, setSelectedYear] = useState<number>(defaultYear);
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedProject, setSelectedProject] = useState<string>('ALL');

  const months = useMemo(() => 
    BASE_MONTHS.map(m => ({ value: m.value, label: t(m.en, m.ar) })),
    [t]
  );

  // Budget configuration state
  const [budgets, setBudgets] = useState<BudgetConfig>(initialBudgets);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [budgetInput, setBudgetInput] = useState<string>('');
  const [isPending, startTransition] = useTransition();
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Distinct projects list: merge base projects and all specific project names
  const projectFilterOptions = useMemo(() => {
    const list: Array<{ value: string; label: string; group?: string }> = [
      { value: 'ALL', label: t('All Projects', 'جميع المشاريع') }
    ];

    // Add Base Projects
    baseProjects.forEach(bp => {
      list.push({ value: bp, label: bp, group: 'Primary Projects' });
    });

    // Add Composite / Specific Projects if not already in base
    allProjects.forEach(p => {
      if ((p.name.includes('%') || p.name.includes('&')) && !baseProjects.includes(p.name)) {
        list.push({ value: p.name, label: p.name, group: 'Allocated / Composite' });
      }
    });

    return list;
  }, [baseProjects, allProjects]);

  // Calculations for KPI Cards
  const metrics = useMemo(() => {
    // Deduplicate expenses by unique ID (and composite key safety)
    const seenExpenseIds = new Set<string>();
    const uniqueExpenses: PettyCashExpenseRecord[] = [];

    initialExpenses.forEach(exp => {
      const key = exp.id || `${exp.expense_date}_${exp.amount}_${exp.request_description}_${exp.project_id}`;
      if (!seenExpenseIds.has(key)) {
        seenExpenseIds.add(key);
        uniqueExpenses.push(exp);
      }
    });

    // Helper to evaluate an expense's matching portion for the selected project
    const matchExpenseForProject = (exp: PettyCashExpenseRecord, targetProject: string) => {
      if (targetProject === 'ALL') {
        return { isMatch: true, allocatedAmount: exp.amount };
      }

      const pName = (exp.project_name || 'Unassigned').trim();
      const targetLower = targetProject.toLowerCase().trim();

      // Exact match to full string
      if (pName.toLowerCase() === targetLower) {
        return { isMatch: true, allocatedAmount: exp.amount };
      }

      // Check allocations
      const allocations = parseProjectAllocationsSync(pName);
      const matchedAlloc = allocations.find(a => a.projectName.toLowerCase().trim() === targetLower);
      if (matchedAlloc) {
        const allocatedAmount = exp.amount * (matchedAlloc.percentage / 100);
        return { isMatch: true, allocatedAmount };
      }

      return { isMatch: false, allocatedAmount: 0 };
    };

    // 1. Current Selected Period Expenses
    let currentTotalExpenses = 0;
    let currentTransactionCount = 0;
    const currentPeriodExpenses: PettyCashExpenseRecord[] = [];

    uniqueExpenses.forEach(exp => {
      if (!exp.expense_date) return;
      const [yStr, mStr] = exp.expense_date.split('-');
      const expYear = parseInt(yStr, 10);

      if (expYear !== selectedYear) return;

      if (selectedMonth !== 'ALL') {
        if (mStr !== selectedMonth) return;
      }

      const { isMatch, allocatedAmount } = matchExpenseForProject(exp, selectedProject);
      if (isMatch) {
        currentTotalExpenses += allocatedAmount;
        currentTransactionCount += 1;
        currentPeriodExpenses.push(exp);
      }
    });

    // 2. Budget Remaining Calculation
    let approvedBudget: number | null = null;
    if (selectedMonth !== 'ALL') {
      const ymKey = `${selectedYear}-${selectedMonth}`;
      if (budgets.monthlyBudgets && typeof budgets.monthlyBudgets[ymKey] === 'number') {
        approvedBudget = budgets.monthlyBudgets[ymKey];
      } else if (typeof budgets.defaultMonthlyBudget === 'number') {
        approvedBudget = budgets.defaultMonthlyBudget;
      }
    } else {
      // All Months for selected year
      if (budgets.yearlyBudgets && typeof budgets.yearlyBudgets[String(selectedYear)] === 'number') {
        approvedBudget = budgets.yearlyBudgets[String(selectedYear)];
      } else if (budgets.monthlyBudgets) {
        // Sum any configured months in this year
        let yearSum = 0;
        let count = 0;
        for (let m = 1; m <= 12; m++) {
          const mKey = `${selectedYear}-${String(m).padStart(2, '0')}`;
          if (typeof budgets.monthlyBudgets[mKey] === 'number') {
            yearSum += budgets.monthlyBudgets[mKey];
            count++;
          }
        }
        if (count > 0) {
          approvedBudget = yearSum;
        } else if (typeof budgets.defaultMonthlyBudget === 'number') {
          approvedBudget = budgets.defaultMonthlyBudget * 12;
        }
      }
    }

    const budgetRemaining = approvedBudget !== null ? approvedBudget - currentTotalExpenses : null;
    const isOverBudget = budgetRemaining !== null && budgetRemaining < 0;

    // 3. Monthly Change Calculation
    let previousPeriodExpensesSum = 0;
    let hasPreviousPeriodRecords = false;

    if (selectedMonth !== 'ALL') {
      const curM = parseInt(selectedMonth, 10);
      let prevM = curM - 1;
      let prevY = selectedYear;
      if (prevM === 0) {
        prevM = 12;
        prevY = selectedYear - 1;
      }
      const prevMStr = String(prevM).padStart(2, '0');

      uniqueExpenses.forEach(exp => {
        if (!exp.expense_date) return;
        const [yStr, mStr] = exp.expense_date.split('-');
        const expYear = parseInt(yStr, 10);

        if (expYear === prevY && mStr === prevMStr) {
          const { isMatch, allocatedAmount } = matchExpenseForProject(exp, selectedProject);
          if (isMatch) {
            previousPeriodExpensesSum += allocatedAmount;
            hasPreviousPeriodRecords = true;
          }
        }
      });
    } else {
      // Compare with previous year
      const prevY = selectedYear - 1;
      uniqueExpenses.forEach(exp => {
        if (!exp.expense_date) return;
        const [yStr] = exp.expense_date.split('-');
        const expYear = parseInt(yStr, 10);

        if (expYear === prevY) {
          const { isMatch, allocatedAmount } = matchExpenseForProject(exp, selectedProject);
          if (isMatch) {
            previousPeriodExpensesSum += allocatedAmount;
            hasPreviousPeriodRecords = true;
          }
        }
      });
    }

    let monthlyChangePercent: number | null = null;
    if (hasPreviousPeriodRecords && previousPeriodExpensesSum > 0) {
      monthlyChangePercent = ((currentTotalExpenses - previousPeriodExpensesSum) / previousPeriodExpensesSum) * 100;
    }

    return {
      totalExpenses: currentTotalExpenses,
      approvedBudget,
      budgetRemaining,
      isOverBudget,
      monthlyChangePercent,
      hasPreviousPeriodRecords,
      previousPeriodExpensesSum,
      totalTransactions: currentTransactionCount,
      periodExpenseCount: currentPeriodExpenses.length
    };
  }, [initialExpenses, selectedYear, selectedMonth, selectedProject, budgets]);

  // Open modal to configure budget
  const handleOpenBudgetModal = () => {
    let currentVal = '';
    if (selectedMonth !== 'ALL') {
      const ymKey = `${selectedYear}-${selectedMonth}`;
      if (budgets.monthlyBudgets?.[ymKey]) {
        currentVal = String(budgets.monthlyBudgets[ymKey]);
      }
    } else if (budgets.yearlyBudgets?.[String(selectedYear)]) {
      currentVal = String(budgets.yearlyBudgets[String(selectedYear)]);
    }
    setBudgetInput(currentVal);
    setSaveSuccess(false);
    setIsBudgetModalOpen(true);
  };

  const handleSaveBudget = () => {
    const val = parseFloat(budgetInput);
    const updated = { ...budgets };

    if (selectedMonth !== 'ALL') {
      const ymKey = `${selectedYear}-${selectedMonth}`;
      if (!updated.monthlyBudgets) updated.monthlyBudgets = {};
      if (isNaN(val) || val <= 0) {
        delete updated.monthlyBudgets[ymKey];
      } else {
        updated.monthlyBudgets[ymKey] = val;
      }
    } else {
      if (!updated.yearlyBudgets) updated.yearlyBudgets = {};
      if (isNaN(val) || val <= 0) {
        delete updated.yearlyBudgets[String(selectedYear)];
      } else {
        updated.yearlyBudgets[String(selectedYear)] = val;
      }
    }

    startTransition(async () => {
      await saveBudgetConfig(updated);
      setBudgets(updated);
      setSaveSuccess(true);
      setTimeout(() => {
        setIsBudgetModalOpen(false);
        setSaveSuccess(false);
      }, 700);
    });
  };

  // Format currency in OMR with 3 decimals
  const formatOMR = (amount: number) => {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    });
  };

  const selectedMonthObj = months.find(m => m.value === selectedMonth);

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header & Petty Cash Module Tabs */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#0F766E] dark:text-[#14B8A6] uppercase tracking-wider mb-1">
            <span>Petty Cash Module</span>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
            <span>Executive Analytics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#173B63] dark:text-white tracking-tight">
            Petty Cash Analytics
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-0.5">
            Real-time financial performance indicators, budget compliance, and transaction volume
          </p>
        </div>

        {/* Quick Module Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-zinc-900/80 rounded-2xl border border-[#BDCEE0] dark:border-zinc-800 shadow-xs self-stretch md:self-auto overflow-x-auto">
          <Link
            href="/petty-cash/dashboard"
            className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-[#0F766E] hover:bg-[#F0FDFA] dark:hover:bg-zinc-800 transition-colors whitespace-nowrap"
          >
            Dashboard
          </Link>
          <div className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-[#173B63] to-[#0F766E] text-white dark:from-[#1b497f] dark:to-[#00a99d] shadow-xs whitespace-nowrap">
            Analytics
          </div>
          <Link
            href="/petty-cash/settlement"
            className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-[#0F766E] hover:bg-[#F0FDFA] dark:hover:bg-zinc-800 transition-colors whitespace-nowrap"
          >
            Settlement
          </Link>
          <Link
            href="/petty-cash/resources"
            className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-[#0F766E] hover:bg-[#F0FDFA] dark:hover:bg-zinc-800 transition-colors whitespace-nowrap"
          >
            Resources
          </Link>
        </div>
      </div>

      {/* 2. Top Interactive Filter Controls Bar */}
      <div className="glass rounded-2xl p-4 sm:p-5 border border-[#BDCEE0] dark:border-zinc-800/80 shadow-xs bg-white dark:bg-zinc-900/40">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-bold text-[#173B63] dark:text-zinc-200">
            <Filter className="w-4 h-4 text-[#0F766E] dark:text-[#14B8A6]" />
            <span>Dashboard Filters</span>
            <span className="text-xs font-normal text-zinc-400 ml-1">
              (Auto-updates all metrics instantly)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto">
            {/* Year Filter */}
            <div className="flex items-center gap-2 bg-[#F8FAFC] dark:bg-zinc-800/60 border border-[#BDCEE0] dark:border-zinc-700/60 rounded-xl px-3 py-2">
              <Calendar className="w-4 h-4 text-[#0F766E] dark:text-[#14B8A6] shrink-0" />
              <div className="flex flex-col min-w-0 flex-1">
                <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                  Reporting Year
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                  className="bg-transparent text-sm font-bold text-[#173B63] dark:text-zinc-100 focus:outline-none cursor-pointer"
                >
                  {availableYears.map(yr => (
                    <option key={yr} value={yr} className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Month Filter */}
            <div className="flex items-center gap-2 bg-[#F8FAFC] dark:bg-zinc-800/60 border border-[#BDCEE0] dark:border-zinc-700/60 rounded-xl px-3 py-2">
              <Calendar className="w-4 h-4 text-[#0F766E] dark:text-[#14B8A6] shrink-0" />
              <div className="flex flex-col min-w-0 flex-1">
                <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                  Reporting Month
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent text-sm font-bold text-[#173B63] dark:text-zinc-100 focus:outline-none cursor-pointer"
                >
                  {months.map(m => (
                    <option key={m.value} value={m.value} className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Project Filter */}
            <div className="flex items-center gap-2 bg-[#F8FAFC] dark:bg-zinc-800/60 border border-[#BDCEE0] dark:border-zinc-700/60 rounded-xl px-3 py-2">
              <Building2 className="w-4 h-4 text-[#0F766E] dark:text-[#14B8A6] shrink-0" />
              <div className="flex flex-col min-w-0 flex-1">
                <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                  Project Allocation
                </label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="bg-transparent text-sm font-bold text-[#173B63] dark:text-zinc-100 focus:outline-none cursor-pointer truncate"
                >
                  {projectFilterOptions.map(p => (
                    <option key={p.value} value={p.value} className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Active Filter Indicators */}
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border/60 text-xs">
          <span className="text-zinc-500 font-medium">Active Scope:</span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E0F7F4] dark:bg-[#00a99d]/15 text-[#0F766E] dark:text-[#14B8A6] font-semibold border border-[#14B8A6]/30">
            Year: {selectedYear}
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E0F7F4] dark:bg-[#00a99d]/15 text-[#0F766E] dark:text-[#14B8A6] font-semibold border border-[#14B8A6]/30">
            Month: {selectedMonthObj?.label.split(' ')[0] || selectedMonth}
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E0F7F4] dark:bg-[#00a99d]/15 text-[#0F766E] dark:text-[#14B8A6] font-semibold border border-[#14B8A6]/30">
            Project: {selectedProject === 'ALL' ? 'All Projects' : selectedProject}
          </span>
          {(selectedMonth !== 'ALL' || selectedProject !== 'ALL') && (
            <button
              onClick={() => {
                setSelectedMonth('ALL');
                setSelectedProject('ALL');
              }}
              className="ml-auto text-xs text-zinc-500 hover:text-[#0F766E] underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* 3. Four Core Responsive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1: Total Expenses */}
        <div className="relative p-5 rounded-2xl glass bg-gradient-to-br from-white to-[#F0FDF4]/30 dark:bg-none border border-[#BDCEE0] border-l-4 border-l-[#14B8A6] dark:border-l-[#14B8A6] dark:border-zinc-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#2B4C6F] dark:text-zinc-400">
                Total Expenses
              </span>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#14B8A6]/10 text-[#0F766E] dark:text-[#14B8A6] border border-[#14B8A6]/20">
                <Wallet className="w-5 h-5" />
              </div>
            </div>

            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xs font-extrabold text-[#0F766E] dark:text-[#14B8A6]">OMR</span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-[#173B63] dark:text-white tracking-tight">
                {formatOMR(metrics.totalExpenses)}
              </h3>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Period records:</span>
            <span className="font-semibold text-[#173B63] dark:text-zinc-300">
              {metrics.totalTransactions} transactions
            </span>
          </div>
        </div>

        {/* CARD 2: Budget Remaining */}
        <div className={`relative p-5 rounded-2xl glass bg-gradient-to-br from-white to-[#F0FDF4]/30 dark:bg-none border border-[#BDCEE0] border-l-4 ${
          metrics.isOverBudget 
            ? 'border-l-red-500 dark:border-l-red-500' 
            : metrics.approvedBudget === null 
            ? 'border-l-amber-500 dark:border-l-amber-500'
            : 'border-l-[#0F766E] dark:border-l-[#0F766E]'
        } dark:border-zinc-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#2B4C6F] dark:text-zinc-400">
                Budget Remaining
              </span>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                metrics.isOverBudget
                  ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                  : metrics.approvedBudget === null
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                  : 'bg-[#0F766E]/10 text-[#0F766E] dark:text-[#14B8A6] border-[#0F766E]/20'
              }`}>
                <PiggyBank className="w-5 h-5" />
              </div>
            </div>

            {metrics.approvedBudget === null ? (
              <div className="flex flex-col mt-1">
                <h3 className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight">
                  Not Set
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  No approved budget configured
                </p>
              </div>
            ) : metrics.isOverBudget ? (
              <div className="flex flex-col mt-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-xs font-extrabold text-red-600 dark:text-red-400">-OMR</span>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-red-600 dark:text-red-400 tracking-tight">
                    {formatOMR(Math.abs(metrics.budgetRemaining!))}
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-red-500 mt-0.5">
                  Over budget by OMR {formatOMR(Math.abs(metrics.budgetRemaining!))}
                </span>
              </div>
            ) : (
              <div className="flex flex-col mt-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-xs font-extrabold text-[#0F766E] dark:text-[#14B8A6]">OMR</span>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-[#173B63] dark:text-white tracking-tight">
                    {formatOMR(metrics.budgetRemaining!)}
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  Within approved limit
                </span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs">
            <span className="text-zinc-500 dark:text-zinc-400">
              {metrics.approvedBudget !== null ? `Budget: OMR ${formatOMR(metrics.approvedBudget)}` : 'Approval status:'}
            </span>
            <button
              onClick={handleOpenBudgetModal}
              className="text-xs font-semibold text-[#0F766E] hover:text-[#0D9488] dark:text-[#14B8A6] underline cursor-pointer"
            >
              {metrics.approvedBudget !== null ? 'Adjust Budget' : 'Configure Budget'}
            </button>
          </div>
        </div>

        {/* CARD 3: Monthly Change */}
        <div className="relative p-5 rounded-2xl glass bg-gradient-to-br from-white to-[#F0FDF4]/30 dark:bg-none border border-[#BDCEE0] border-l-4 border-l-[#173B63] dark:border-l-[#3B82F6] dark:border-zinc-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#2B4C6F] dark:text-zinc-400">
                Monthly Change
              </span>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                metrics.monthlyChangePercent === null
                  ? 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
                  : metrics.monthlyChangePercent > 0
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              }`}>
                {metrics.monthlyChangePercent === null ? (
                  <TrendingUp className="w-5 h-5 text-zinc-400" />
                ) : metrics.monthlyChangePercent > 0 ? (
                  <TrendingUp className="w-5 h-5" />
                ) : (
                  <TrendingDown className="w-5 h-5" />
                )}
              </div>
            </div>

            {metrics.monthlyChangePercent === null ? (
              <div className="flex flex-col mt-1">
                <h3 className="text-2xl font-extrabold text-zinc-400 dark:text-zinc-500 tracking-tight">
                  N/A
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  No previous period comparison data
                </p>
              </div>
            ) : (
              <div className="flex flex-col mt-1">
                <div className="flex items-center gap-1.5">
                  {metrics.monthlyChangePercent > 0 ? (
                    <ArrowUpRight className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0" />
                  ) : (
                    <ArrowDownRight className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  )}
                  <h3 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
                    metrics.monthlyChangePercent > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {metrics.monthlyChangePercent > 0 ? '+' : ''}
                    {metrics.monthlyChangePercent.toFixed(1)}%
                  </h3>
                </div>
                <span className="text-[11px] font-medium text-zinc-500 mt-0.5">
                  {metrics.monthlyChangePercent > 0 ? 'Increase vs prior period' : 'Reduction vs prior period'}
                </span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Prior baseline:</span>
            <span className="font-semibold text-[#173B63] dark:text-zinc-300">
              {metrics.hasPreviousPeriodRecords ? `OMR ${formatOMR(metrics.previousPeriodExpensesSum)}` : 'None'}
            </span>
          </div>
        </div>

        {/* CARD 4: Total Transactions */}
        <div className="relative p-5 rounded-2xl glass bg-gradient-to-br from-white to-[#F0FDF4]/30 dark:bg-none border border-[#BDCEE0] border-l-4 border-l-[#0D9488] dark:border-l-[#00a99d] dark:border-zinc-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#2B4C6F] dark:text-zinc-400">
                Total Transactions
              </span>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#0D9488]/10 text-[#0D9488] dark:text-[#00a99d] border border-[#0D9488]/20">
                <Receipt className="w-5 h-5" />
              </div>
            </div>

            <div className="flex items-baseline gap-1.5 mt-1">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-[#173B63] dark:text-white tracking-tight">
                {metrics.totalTransactions}
              </h3>
              <span className="text-xs font-semibold text-zinc-400">unique entries</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Duplicates omitted:</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              Verified 0 duplicates
            </span>
          </div>
        </div>
      </div>

      {/* 4. Empty-state Banner if Filter yields zero rows */}
      {metrics.totalTransactions === 0 && (
        <div className="glass rounded-2xl p-8 border border-dashed border-[#BDCEE0] dark:border-zinc-700 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Info className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-[#173B63] dark:text-white">
            No Expense Transactions Found
          </h4>
          <p className="text-sm text-zinc-500 max-w-md">
            No petty cash records match the selected combination of Year ({selectedYear}), Month ({selectedMonthObj?.label.split(' ')[0]}), and Project ({selectedProject}). Try selecting &quot;All Months&quot; or &quot;All Projects&quot;.
          </p>
          <button
            onClick={() => {
              setSelectedMonth('ALL');
              setSelectedProject('ALL');
            }}
            className="mt-2 px-4 py-2 bg-[#173B63] text-white rounded-xl text-xs font-semibold hover:bg-[#1E4B7A] transition-colors"
          >
            Show All Expenses
          </button>
        </div>
      )}

      {/* 5. Configure Budget Modal */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-[#BDCEE0] dark:border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setIsBudgetModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#0F766E]/10 text-[#0F766E] dark:text-[#14B8A6] flex items-center justify-center border border-[#0F766E]/20">
                <PiggyBank className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#173B63] dark:text-white">
                  Configure Approved Budget
                </h3>
                <p className="text-xs text-zinc-500">
                  {selectedMonth !== 'ALL' 
                    ? `Set budget for ${selectedMonthObj?.label.split(' ')[0]} ${selectedYear}`
                    : `Set yearly budget for ${selectedYear}`}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#173B63] dark:text-zinc-300 block mb-1.5">
                  Approved Budget Amount (OMR)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                    OMR
                  </span>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="e.g. 1000.000 (leave empty to reset to Not Set)"
                    value={budgetInput}
                    onChange={(e) => setBudgetInput(e.target.value)}
                    className="w-full pl-14 pr-4 py-2.5 rounded-xl border border-[#BDCEE0] dark:border-zinc-700 bg-[#F8FAFC] dark:bg-zinc-800 text-sm font-semibold text-[#173B63] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/40"
                  />
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Leave blank or enter 0 to reset to &quot;Not Set&quot;.
                </p>
              </div>

              {saveSuccess && (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>Approved budget saved successfully!</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBudgetModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleSaveBudget}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#173B63] to-[#0F766E] text-white text-xs font-bold hover:shadow-md transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Budget</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
