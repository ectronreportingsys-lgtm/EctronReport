'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FolderPlus,
  FolderOpen,
  FileSpreadsheet,
  FileText,
  PackageCheck,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  Send,
  Search,
  X,
  Loader2,
  Paperclip,
  Edit3,
  AlertTriangle,
  Check,
  Calendar,
  ArrowUpDown,
  Sparkles,
  Filter
} from 'lucide-react';
import clsx from 'clsx';
import {
  PettyCashBatch,
  createBatch,
  updateBatchMeta,
  deleteBatch,
  assignInvoicesToBatch,
  removeInvoicesFromBatch,
  reorderBatchInvoices,
  transferInvoicesBetweenBatches
} from '@/app/(dashboard)/petty-cash/actions/batchesActions';
import {
  exportBatchAccountsReport,
  exportBatchMergedPdf,
  exportBatchZipPackage
} from '@/lib/pettyCashBatchExporter';
import { useLanguage } from '@/components/layout/LanguageProvider';

const MONTH_NAMES = [
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

const ALL_STATUS_KEYS: Array<'In Progress' | 'Ready' | 'Submitted'> = ['In Progress', 'Ready', 'Submitted'];

const STATUS_ITEMS: Array<{
  key: 'In Progress' | 'Ready' | 'Submitted';
  en: string;
  ar: string;
  dotClass: string;
  activeClass: string;
}> = [
  {
    key: 'In Progress',
    en: 'In Progress',
    ar: 'قيد العمل',
    dotClass: 'bg-amber-500',
    activeClass: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/50 shadow-xs'
  },
  {
    key: 'Ready',
    en: 'Ready',
    ar: 'جاهز للرفع',
    dotClass: 'bg-emerald-500',
    activeClass: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 border-emerald-500/50 shadow-xs'
  },
  {
    key: 'Submitted',
    en: 'Submitted',
    ar: 'تم الرفع',
    dotClass: 'bg-blue-500',
    activeClass: 'bg-blue-500/15 text-blue-800 dark:text-blue-400 border-blue-500/50 shadow-xs'
  }
];

interface PettyCashBatchesSectionProps {
  initialBatches: PettyCashBatch[];
  expensesData: any[];
  onBatchesChange?: (batches: PettyCashBatch[]) => void;
}

export default function PettyCashBatchesSection({
  initialBatches,
  expensesData,
  onBatchesChange
}: PettyCashBatchesSectionProps) {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const today = new Date();

  const [batches, setBatches] = useState<PettyCashBatch[]>(initialBatches || []);
  useEffect(() => {
    setBatches(initialBatches || []);
  }, [initialBatches]);

  const updateLocalBatches = (updater: (prev: PettyCashBatch[]) => PettyCashBatch[]) => {
    setBatches(prev => {
      const next = updater(prev);
      onBatchesChange?.(next);
      return next;
    });
  };

  // Filter state - Default to all months & all statuses
  const [filterMonth, setFilterMonth] = useState<number | 'all'>('all');
  const [filterYear, setFilterYear] = useState<number>(today.getFullYear());
  const [selectedStatuses, setSelectedStatuses] = useState<Array<'In Progress' | 'Ready' | 'Submitted'>>(ALL_STATUS_KEYS);

  const isAllStatusesSelected = selectedStatuses.length === ALL_STATUS_KEYS.length;

  const handleSelectAllStatuses = () => {
    setSelectedStatuses(ALL_STATUS_KEYS);
  };

  const handleToggleStatus = (status: 'In Progress' | 'Ready' | 'Submitted') => {
    setSelectedStatuses(prev => {
      // If currently all are selected, clicking one isolates that single status
      if (prev.length === ALL_STATUS_KEYS.length) {
        return [status];
      }
      // If already included, toggle off
      if (prev.includes(status)) {
        const next = prev.filter(s => s !== status);
        // If nothing left, reset to all
        return next.length === 0 ? ALL_STATUS_KEYS : next;
      }
      // Otherwise, add it (multi-select)
      return [...prev, status];
    });
  };

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [workspaceTab, setWorkspaceTab] = useState<'current' | 'assign'>('current');

  // Create Batch Form
  const [newBatchName, setNewBatchName] = useState('');
  const [newBatchMonth, setNewBatchMonth] = useState<number>(today.getMonth() + 1);
  const [newBatchYear, setNewBatchYear] = useState<number>(today.getFullYear());
  const [newBatchPcvNo, setNewBatchPcvNo] = useState('');
  const [newBatchAdvance, setNewBatchAdvance] = useState('1000');
  const [newBatchStatus, setNewBatchStatus] = useState<'In Progress' | 'Ready' | 'Submitted'>('In Progress');

  // Edit Batch Meta inside Workspace
  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPcvNo, setEditPcvNo] = useState('');
  const [editAdvance, setEditAdvance] = useState('1000');

  // Assign tab state
  const [assignSearch, setAssignSearch] = useState('');
  const [assignMonthScope, setAssignMonthScope] = useState<'batch-month' | 'all'>('batch-month');
  const [selectedToAssign, setSelectedToAssign] = useState<string[]>([]);

  // Current Batch tab selection (for remove or transfer)
  const [selectedInBatch, setSelectedInBatch] = useState<string[]>([]);
  const [transferTargetBatchId, setTransferTargetBatchId] = useState<string>('');

  // Loading & Feedback
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // Map of expenseId -> expense object
  const expenseMap = useMemo(() => {
    const map = new Map<string, any>();
    (expensesData || []).forEach(exp => map.set(exp.id, exp));
    return map;
  }, [expensesData]);

  // Map of expenseId -> { batchId, batchName } for duplicate prevention
  const invoiceAssignmentMap = useMemo(() => {
    const map = new Map<string, { batchId: string; batchName: string }>();
    batches.forEach(b => {
      b.invoiceIds.forEach(invId => {
        map.set(invId, { batchId: b.id, batchName: b.name });
      });
    });
    return map;
  }, [batches]);

  // Status counts based on the current month/year
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      'In Progress': 0,
      'Ready': 0,
      'Submitted': 0,
      'all': 0
    };
    batches.forEach(b => {
      if (filterMonth !== 'all' && b.month !== filterMonth) return;
      if (b.year !== filterYear) return;
      counts.all++;
      if (counts[b.status] !== undefined) {
        counts[b.status]++;
      }
    });
    return counts;
  }, [batches, filterMonth, filterYear]);

  // Filtered batches for display (supports multi-status, month, year)
  const displayedBatches = useMemo(() => {
    return batches.filter(b => {
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(b.status)) return false;
      if (selectedStatuses.length === 0) return false;
      if (filterMonth !== 'all' && b.month !== filterMonth) return false;
      if (b.year !== filterYear) return false;
      return true;
    });
  }, [batches, selectedStatuses, filterMonth, filterYear]);

  const activeBatch = useMemo(
    () => batches.find(b => b.id === activeBatchId) || null,
    [batches, activeBatchId]
  );

  // Ordered invoice objects for a given batch
  const getBatchInvoices = (batch: PettyCashBatch) => {
    return batch.invoiceIds
      .map(id => expenseMap.get(id))
      .filter(Boolean);
  };

  // Auto-suggest next batch name e.g. "October 1", "October 2"
  const openCreateBatchModal = () => {
    const targetM = filterMonth === 'all' ? today.getMonth() + 1 : filterMonth;
    const targetY = filterYear;
    const monthEn = MONTH_NAMES.find(m => m.value === targetM)?.en || 'Batch';
    const existingInMonth = batches.filter(b => b.month === targetM && b.year === targetY);
    const suggestedName = `${monthEn} ${existingInMonth.length + 1}`;

    setNewBatchMonth(targetM);
    setNewBatchYear(targetY);
    setNewBatchName(suggestedName);
    setNewBatchPcvNo('');
    setNewBatchAdvance('1000');
    setNewBatchStatus('In Progress');
    setIsCreateModalOpen(true);
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatchName.trim()) return;
    setBusyAction('create');
    try {
      const res = await createBatch({
        name: newBatchName.trim(),
        month: newBatchMonth,
        year: newBatchYear,
        status: newBatchStatus,
        pcvNo: newBatchPcvNo.trim(),
        advanceAmount: parseFloat(newBatchAdvance) || 1000
      });
      if (res.error) {
        setToast({ type: 'error', text: res.error });
      } else if (res.batch) {
        updateLocalBatches(prev => [...prev, res.batch!]);
        setIsCreateModalOpen(false);
        setToast({ type: 'success', text: t(`Batch "${res.batch.name}" created successfully.`, `تم إنشاء المجموعة "${res.batch.name}" بنجاح.`) });
        // Open workspace directly on Assign tab so user can pick invoices immediately
        setActiveBatchId(res.batch.id);
        setWorkspaceTab('assign');
        setSelectedToAssign([]);
        router.refresh();
      }
    } finally {
      setBusyAction(null);
    }
  };

  const handleStatusChange = async (batch: PettyCashBatch, newStatus: 'In Progress' | 'Ready' | 'Submitted') => {
    setBusyAction(`status-${batch.id}`);
    try {
      const res = await updateBatchMeta(batch.id, { status: newStatus });
      if (res.batch) {
        updateLocalBatches(prev => prev.map(b => (b.id === batch.id ? res.batch! : b)));
        router.refresh();
      }
    } finally {
      setBusyAction(null);
    }
  };

  const handleSaveMeta = async () => {
    if (!activeBatch) return;
    setBusyAction('save-meta');
    try {
      const res = await updateBatchMeta(activeBatch.id, {
        name: editName.trim(),
        pcvNo: editPcvNo.trim(),
        advanceAmount: parseFloat(editAdvance) || 1000
      });
      if (res.error) {
        setToast({ type: 'error', text: res.error });
      } else if (res.batch) {
        updateLocalBatches(prev => prev.map(b => (b.id === activeBatch.id ? res.batch! : b)));
        setIsEditingMeta(false);
        setToast({ type: 'success', text: t('Batch details updated.', 'تم تحديث بيانات المجموعة.') });
        router.refresh();
      }
    } finally {
      setBusyAction(null);
    }
  };

  const handleDeleteBatch = async (batch: PettyCashBatch) => {
    if (!window.confirm(t(`Are you sure you want to delete batch "${batch.name}"? (Original invoices will remain in the system)`, `هل أنت متأكد من حذف المجموعة "${batch.name}"؟ (لن يتم حذف الفواتير الأصلية من النظام)`))) {
      return;
    }
    setBusyAction(`delete-${batch.id}`);
    try {
      await deleteBatch(batch.id);
      updateLocalBatches(prev => prev.filter(b => b.id !== batch.id));
      if (activeBatchId === batch.id) setActiveBatchId(null);
      setToast({ type: 'success', text: t(`Batch "${batch.name}" deleted while preserving original invoices.`, `تم حذف المجموعة "${batch.name}" مع الحفاظ على الفواتير الأصلية.`) });
      router.refresh();
    } finally {
      setBusyAction(null);
    }
  };

  // Assign selected invoices to activeBatch
  const handleAssignInvoices = async () => {
    if (!activeBatch || selectedToAssign.length === 0) return;
    setBusyAction('assign');
    try {
      const res = await assignInvoicesToBatch(activeBatch.id, selectedToAssign);
      if (res.error) {
        setToast({ type: 'error', text: res.error });
      } else if (res.batch) {
        updateLocalBatches(prev => prev.map(b => (b.id === activeBatch.id ? res.batch! : b)));
        setToast({
          type: 'success',
          text: t(`Added ${selectedToAssign.length} invoices to "${activeBatch.name}".`, `تمت إضافة ${selectedToAssign.length} فاتورة إلى "${activeBatch.name}".`)
        });
        setSelectedToAssign([]);
        setWorkspaceTab('current');
        router.refresh();
      }
    } finally {
      setBusyAction(null);
    }
  };

  // Remove invoices from activeBatch
  const handleRemoveFromBatch = async (idsToRemove: string[]) => {
    if (!activeBatch || idsToRemove.length === 0) return;
    setBusyAction('remove');
    try {
      const res = await removeInvoicesFromBatch(activeBatch.id, idsToRemove);
      if (res.batch) {
        updateLocalBatches(prev => prev.map(b => (b.id === activeBatch.id ? res.batch! : b)));
        setSelectedInBatch(prev => prev.filter(id => !idsToRemove.includes(id)));
        setToast({ type: 'success', text: t(`Removed ${idsToRemove.length} invoices from the batch.`, `تمت إزالة ${idsToRemove.length} فاتورة من المجموعة.`) });
        router.refresh();
      }
    } finally {
      setBusyAction(null);
    }
  };

  // Move invoice up/down in activeBatch
  const handleMoveInvoice = async (index: number, direction: 'up' | 'down') => {
    if (!activeBatch) return;
    const ids = [...activeBatch.invoiceIds];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= ids.length) return;

    const temp = ids[index];
    ids[index] = ids[targetIdx];
    ids[targetIdx] = temp;

    // Optimistic update
    updateLocalBatches(prev =>
      prev.map(b => (b.id === activeBatch.id ? { ...b, invoiceIds: ids } : b))
    );
    await reorderBatchInvoices(activeBatch.id, ids);
  };

  // Sort batch invoices by Date or Expense No
  const handleSortBatchInvoices = async (by: 'date' | 'expense_no') => {
    if (!activeBatch) return;
    const items = getBatchInvoices(activeBatch);
    items.sort((a, b) => {
      if (by === 'date') {
        return String(a.expense_date || '').localeCompare(String(b.expense_date || ''));
      }
      return String(a.expense_no || '').localeCompare(String(b.expense_no || ''));
    });
    const sortedIds = items.map(i => i.id);
    updateLocalBatches(prev =>
      prev.map(b => (b.id === activeBatch.id ? { ...b, invoiceIds: sortedIds } : b))
    );
    await reorderBatchInvoices(activeBatch.id, sortedIds);
    setToast({ type: 'success', text: t('Batch invoice order updated.', 'تم إعادة ترتيب الفواتير في المجموعة.') });
  };

  // Transfer invoices between batches
  const handleTransferInvoices = async (
    sourceId: string,
    targetId: string,
    invoiceIds: string[]
  ) => {
    if (!sourceId || !targetId || invoiceIds.length === 0) return;
    setBusyAction('transfer');
    try {
      const res = await transferInvoicesBetweenBatches(sourceId, targetId, invoiceIds);
      if (res.error) {
        setToast({ type: 'error', text: res.error });
      } else if (res.sourceBatch && res.targetBatch) {
        updateLocalBatches(prev =>
          prev.map(b => {
            if (b.id === res.sourceBatch!.id) return res.sourceBatch!;
            if (b.id === res.targetBatch!.id) return res.targetBatch!;
            return b;
          })
        );
        setSelectedInBatch([]);
        setTransferTargetBatchId('');
        setToast({
          type: 'success',
          text: t(`Transferred ${invoiceIds.length} invoices to "${res.targetBatch.name}".`, `تم نقل ${invoiceIds.length} فاتورة إلى "${res.targetBatch.name}".`)
        });
        router.refresh();
      }
    } finally {
      setBusyAction(null);
    }
  };

  // Export handlers
  const handleExportExcel = async (batch: PettyCashBatch) => {
    const invs = getBatchInvoices(batch);
    if (invs.length === 0) {
      setToast({ type: 'error', text: t('This batch is empty. Add invoices first to export accounts report.', 'هذه المجموعة فارغة. أضف فواتير أولاً لتصدير تقرير الحسابات.') });
      return;
    }
    setBusyAction(`excel-${batch.id}`);
    try {
      await exportBatchAccountsReport(batch, invs);
      setToast({
        type: 'success',
        text: t(`Exported Accounts Report for batch "${batch.name}".`, `تم تصدير تقرير الحسابات (Accounts Report) للمجموعة "${batch.name}".`)
      });
    } catch (err: any) {
      setToast({ type: 'error', text: err.message || t('Failed to export Excel report.', 'فشل تصدير ملف الإكسل.') });
    } finally {
      setBusyAction(null);
    }
  };

  const handleExportPdf = async (batch: PettyCashBatch) => {
    const invs = getBatchInvoices(batch);
    if (invs.length === 0) {
      setToast({ type: 'error', text: t('This batch is empty. Add invoices first to merge attachments.', 'هذه المجموعة فارغة. أضف فواتير أولاً لدمج المرفقات.') });
      return;
    }
    setBusyAction(`pdf-${batch.id}`);
    try {
      const { attachedCount } = await exportBatchMergedPdf(batch, invs);
      setToast({
        type: 'success',
        text: t(`Merged PDF exported (${attachedCount} attachments) in specified order.`, `تم تصدير ملف الـ PDF المدمج (${attachedCount} مرفقات) بالترتيب المحدد.`)
      });
    } catch (err: any) {
      setToast({ type: 'error', text: err.message || t('Failed to merge PDF.', 'فشل دمج ملف الـ PDF.') });
    } finally {
      setBusyAction(null);
    }
  };

  const handleExportZip = async (batch: PettyCashBatch) => {
    const invs = getBatchInvoices(batch);
    if (invs.length === 0) {
      setToast({ type: 'error', text: t('This batch is empty. Add invoices first to export package.', 'هذه المجموعة فارغة. أضف فواتير أولاً لتصدير الحزمة.') });
      return;
    }
    setBusyAction(`zip-${batch.id}`);
    try {
      await exportBatchZipPackage(batch, invs);
      setToast({
        type: 'success',
        text: t(`ZIP package (Accounts Report + Merged PDFs) exported for batch "${batch.name}".`, `تم تصدير حزمة ZIP (تقرير الحسابات + المرفقات المدمجة) للمجموعة "${batch.name}".`)
      });
    } catch (err: any) {
      setToast({ type: 'error', text: err.message || t('Failed to export ZIP package.', 'فشل تصدير حزمة ZIP.') });
    } finally {
      setBusyAction(null);
    }
  };

  // Candidate invoices for the "Assign Invoices" tab
  const candidateInvoices = useMemo(() => {
    if (!activeBatch) return [];
    return (expensesData || []).filter(exp => {
      if (assignMonthScope === 'batch-month' && exp.expense_date) {
        const [y, m] = exp.expense_date.split('-');
        if (parseInt(y, 10) !== activeBatch.year || parseInt(m, 10) !== activeBatch.month) {
          return false;
        }
      }
      if (assignSearch.trim()) {
        const q = assignSearch.toLowerCase().trim();
        const no = (exp.expense_no || '').toLowerCase();
        const desc = (exp.request_description || '').toLowerCase();
        const cat = (exp.petty_cash_categories?.name || '').toLowerCase();
        const proj = (exp.projects?.name || '').toLowerCase();
        return no.includes(q) || desc.includes(q) || cat.includes(q) || proj.includes(q);
      }
      return true;
    });
  }, [expensesData, activeBatch, assignMonthScope, assignSearch]);

  const selectableUnassignedIds = useMemo(() => {
    return candidateInvoices
      .filter(exp => !invoiceAssignmentMap.has(exp.id))
      .map(exp => exp.id);
  }, [candidateInvoices, invoiceAssignmentMap]);

  const currentMonthLabel =
    filterMonth === 'all'
      ? `All Months ${filterYear}`
      : `${MONTH_NAMES.find(m => m.value === filterMonth)?.en || ''} ${filterYear}`;

  return (
    <div className="glass rounded-2xl p-6 border border-border dark:border-zinc-800/60 flex flex-col gap-5">
      {/* Toast Notification */}
      {toast && (
        <div
          className={clsx(
            'p-3.5 rounded-xl flex items-center justify-between text-sm font-medium border shadow-md animate-in fade-in duration-200',
            toast.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-danger/10 text-danger border-danger/30'
          )}
        >
          <div className="flex items-center gap-2.5">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{toast.text}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-zinc-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col gap-3.5 border-b border-zinc-800 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={openCreateBatchModal}
              className="flex items-center gap-2 px-4 py-2 rounded-full btn-primary-gradient bg-zinc-100 hover:bg-white text-zinc-900 font-semibold text-sm transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Batch +</span>
            </button>

            {/* Month & Year Selectors */}
            <div className="flex items-center gap-2">
              <select
                value={filterMonth}
                onChange={e =>
                  setFilterMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))
                }
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs font-medium text-zinc-300 focus:outline-none focus:border-teal-500 cursor-pointer"
              >
                <option value="all">{t('All Months', 'كل الأشهر')}</option>
                {MONTH_NAMES.map(m => (
                  <option key={m.value} value={m.value}>
                    {lang === 'ar' ? m.ar : m.en}
                  </option>
                ))}
              </select>

              <select
                value={filterYear}
                onChange={e => setFilterYear(Number(e.target.value))}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs font-medium text-zinc-300 focus:outline-none focus:border-teal-500 cursor-pointer"
              >
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-right">
            <h2 className="text-lg font-bold text-white flex items-center sm:justify-end gap-2">
              <span>Petty Cash Batches</span>
              <FolderOpen className="w-5 h-5 text-[#14B8A6]" />
            </h2>
            <p className="text-xs text-zinc-400">{currentMonthLabel} — {t('Batches for accounting reports preparation', 'مجموعات تجهيز ملفات الحسابات')}</p>
          </div>
        </div>

        {/* Status Multi-Select Filter Bar (Allows selecting 1, multiple, or all statuses) */}
        <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-[#173B63] dark:text-zinc-400 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-[#14B8A6]" />
              <span>{t('Status Filter:', 'تصفية الحالات:')}</span>
            </span>

            {/* "All Statuses" toggle pill */}
            <button
              type="button"
              onClick={handleSelectAllStatuses}
              className={clsx(
                "px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                isAllStatusesSelected
                  ? "bg-[#173B63] dark:bg-zinc-100 text-white dark:text-zinc-900 border-[#173B63] dark:border-white shadow-xs"
                  : "bg-white dark:bg-zinc-900 text-[#475569] dark:text-zinc-400 border-[#D2E3F0] dark:border-zinc-800 hover:border-zinc-500"
              )}
            >
              <span>{t('All Statuses', 'كل الحالات')}</span>
              <span className="text-[10px] opacity-75">({statusCounts.all})</span>
            </button>

            {/* Individual Status pills with multi-select support */}
            {STATUS_ITEMS.map(status => {
              const isSelected = selectedStatuses.includes(status.key);
              const count = statusCounts[status.key] || 0;
              return (
                <button
                  key={status.key}
                  type="button"
                  onClick={() => handleToggleStatus(status.key)}
                  className={clsx(
                    "px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                    isSelected
                      ? status.activeClass
                      : "bg-white/80 dark:bg-zinc-900 text-[#475569] dark:text-zinc-500 border-[#D2E3F0] dark:border-zinc-800/80 hover:border-zinc-600 opacity-60 hover:opacity-100"
                  )}
                  title={t('Click to toggle this status (select one or multiple)', 'اضغط لاختيار أو إلغاء هذه الحالة (يمكن اختيار أكثر من حالة معاً)')}
                >
                  <span className={clsx("w-2 h-2 rounded-full", isSelected ? status.dotClass : "bg-zinc-400 dark:bg-zinc-600")} />
                  <span>{lang === 'ar' ? status.ar : status.en}</span>
                  <span className="text-[10px] opacity-80">({count})</span>
                  {isSelected && !isAllStatusesSelected && (
                    <Check className="w-3 h-3 stroke-[3]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Helper text */}
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
            <span>
              {selectedStatuses.length === ALL_STATUS_KEYS.length
                ? t('Showing all available statuses', 'عرض جميع الحالات المتاحة')
                : t(`${selectedStatuses.length} of ${ALL_STATUS_KEYS.length} statuses selected`, `تم اختيار ${selectedStatuses.length} من أصل ${ALL_STATUS_KEYS.length} حالات`)}
            </span>
            {selectedStatuses.length !== ALL_STATUS_KEYS.length && (
              <button
                type="button"
                onClick={handleSelectAllStatuses}
                className="text-[#14B8A6] hover:underline cursor-pointer font-semibold text-xs"
              >
                {t('Reset to All', 'استعادة الكل')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Batches Grid */}
      {displayedBatches.length === 0 ? (
        <div className="py-10 px-4 text-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#14B8A6]/10 border border-[#14B8A6]/20 flex items-center justify-center text-[#14B8A6]">
            <FolderPlus className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              {selectedStatuses.length === 0
                ? t('No status selected. Please select at least one status.', 'لم يتم تحديد أي حالة. يرجى اختيار حالة واحدة على الأقل.')
                : !isAllStatusesSelected
                ? t(`No invoice batches found matching the selected statuses (${selectedStatuses.map(s => t(s, s)).join(', ')})`, `لا توجد مجموعات فواتير مطابقة للحالات المحددة (${selectedStatuses.map(s => t(s, s)).join('، ')})`)
                : t(`No invoice batches found in ${currentMonthLabel}`, `لا توجد مجموعات فواتير في ${currentMonthLabel}`)}
            </h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
              {t('Create custom batches (e.g. October 1, October 2) and select pre-uploaded invoices to export the official accounts report and merged PDF.', 'أنشئ مجموعات مخصصة مثل (October 1, October 2) واختر الفواتير المرفوعة مسبقاً لتصدير تقرير الحسابات الرسمي وملف الـ PDF المدمج بضغطة زر.')}
            </p>
          </div>
          <button
            onClick={openCreateBatchModal}
            className="mt-1 flex items-center gap-2 px-5 py-2 rounded-xl btn-primary-gradient bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('Create First Batch', 'إنشاء أول مجموعة')} ({MONTH_NAMES.find(m => m.value === (filterMonth === 'all' ? today.getMonth() + 1 : filterMonth))?.en} 1)</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {displayedBatches.map(batch => {
            const batchInvoices = getBatchInvoices(batch);
            const totalAmount = batchInvoices.reduce(
              (sum, item) => sum + Number(item.amount || 0),
              0
            );
            const attachmentsCount = batchInvoices.filter(item => Boolean(item.attachment_url)).length;
            const advance = Number(batch.advanceAmount) || 1000;
            const remaining = advance - totalAmount;
            const isDeficit = remaining < 0;
            const progressPct = Math.min(100, Math.max(0, Math.round((totalAmount / advance) * 100)));

            return (
              <div
                key={batch.id}
                className="rounded-2xl border-2 border-[#B5CDE2] dark:border dark:border-zinc-800 bg-gradient-to-br from-[#F4F9FC] to-[#E6F4F1] dark:bg-none dark:bg-zinc-950/60 p-5 flex flex-col gap-4 hover:border-[#14B8A6] transition-all shadow-sm"
              >
                {/* Top row: Status pill + Actions (Left) & Batch Title + Invoice Count (Right) */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Status Selector Pill */}
                    <select
                      value={batch.status}
                      onChange={e =>
                        handleStatusChange(batch, e.target.value as 'In Progress' | 'Ready' | 'Submitted')
                      }
                      className={clsx(
                        'text-xs font-bold px-3 py-1 rounded-full border cursor-pointer focus:outline-none transition-colors',
                        batch.status === 'Ready'
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40'
                          : batch.status === 'Submitted'
                          ? 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/40'
                          : 'bg-[#173B63]/10 dark:bg-zinc-800 text-[#173B63] dark:text-zinc-300 border-[#173B63]/30 dark:border-zinc-700'
                      )}
                    >
                      <option value="In Progress" className="bg-zinc-900 text-zinc-200">
                        In Progress
                      </option>
                      <option value="Ready" className="bg-zinc-900 text-emerald-400">
                        Ready
                      </option>
                      <option value="Submitted" className="bg-zinc-900 text-blue-400">
                        Submitted
                      </option>
                    </select>

                    <button
                      onClick={() => {
                        setActiveBatchId(batch.id);
                        setWorkspaceTab(batchInvoices.length === 0 ? 'assign' : 'current');
                        setSelectedInBatch([]);
                        setSelectedToAssign([]);
                        setIsEditingMeta(false);
                      }}
                      className="px-3 py-1 rounded-full text-xs font-bold bg-[#CCFBF1] dark:bg-[#14B8A6]/15 text-[#0F766E] dark:text-[#14B8A6] border border-[#14B8A6] dark:border-[#14B8A6]/30 hover:bg-[#99F6E4] dark:hover:bg-[#14B8A6]/25 transition-colors cursor-pointer"
                    >
                      {t('Manage Invoices', 'إدارة الفواتير')} ({batchInvoices.length})
                    </button>

                    <button
                      onClick={() => handleDeleteBatch(batch)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                      title={t('Delete Batch', 'حذف المجموعة')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div
                    className="text-right cursor-pointer group"
                    onClick={() => {
                      setActiveBatchId(batch.id);
                      setWorkspaceTab(batchInvoices.length === 0 ? 'assign' : 'current');
                      setSelectedInBatch([]);
                      setSelectedToAssign([]);
                      setIsEditingMeta(false);
                    }}
                  >
                    <div className="flex items-center justify-end gap-2">
                      <h3 className="text-base font-bold text-[#173B63] dark:text-white group-hover:text-[#0F766E] dark:group-hover:text-[#14B8A6] transition-colors">
                        {batch.name}
                      </h3>
                      <FolderOpen className="w-4 h-4 text-[#0F766E] dark:text-zinc-400 group-hover:text-[#14B8A6] transition-colors" />
                    </div>
                    <p className="text-xs text-[#2B4C6F] dark:text-zinc-400 mt-0.5 font-medium">
                      Invoices {batchInvoices.length} • Attachments {attachmentsCount}
                    </p>
                  </div>
                </div>

                {/* Financial Summary Grid (Advance, Spent, Remaining) */}
                <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-white/80 dark:bg-zinc-900/80 border border-[#D2E3F0] dark:border-zinc-800 shadow-xs">
                  {/* Advance Budget */}
                  <div className="flex flex-col">
                    <span className="text-[11px] font-semibold text-[#475569] dark:text-zinc-400">
                      {t('Advance Budget', 'سلفة الباتش')}
                    </span>
                    <span className="text-sm font-bold text-[#173B63] dark:text-zinc-200 mt-0.5">
                      OMR {advance.toFixed(3)}
                    </span>
                  </div>

                  {/* Total Spent */}
                  <div className="flex flex-col border-x border-[#E2E8F0] dark:border-zinc-800/80 px-2">
                    <span className="text-[11px] font-semibold text-[#475569] dark:text-zinc-400">
                      {t('Total Spent', 'إجمالي المصروف')}
                    </span>
                    <span className="text-sm font-bold text-[#0F766E] dark:text-teal-400 mt-0.5">
                      OMR {totalAmount.toFixed(3)}
                    </span>
                  </div>

                  {/* Remaining Petty Cash */}
                  <div className="flex flex-col text-right">
                    <span className="text-[11px] font-semibold text-[#475569] dark:text-zinc-400">
                      {t('Remaining', 'المتبقي من الباتش')}
                    </span>
                    <span
                      className={clsx(
                        "text-sm font-extrabold mt-0.5",
                        isDeficit
                          ? "text-danger"
                          : "text-emerald-600 dark:text-emerald-400"
                      )}
                    >
                      {isDeficit ? `-OMR ${Math.abs(remaining).toFixed(3)}` : `OMR ${remaining.toFixed(3)}`}
                    </span>
                  </div>
                </div>

                {/* Progress Bar & Status Line */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-[#475569] dark:text-zinc-400 font-medium">
                    <span>
                      {progressPct}% {t('Consumed', 'مستهلك')}
                      {isDeficit && (
                        <span className="text-danger font-bold ml-1">
                          ({t('Deficit', 'عجز')}: OMR {Math.abs(remaining).toFixed(3)})
                        </span>
                      )}
                    </span>
                    <span className="font-mono text-[10px] text-[#4A6B8A] dark:text-zinc-500">{batch.id}</span>
                  </div>
                  <div className="w-full h-2 bg-[#D2E3F0] dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={clsx(
                        "h-full rounded-full transition-all duration-500",
                        isDeficit
                          ? "bg-danger"
                          : "bg-gradient-to-r from-[#173B63] via-[#0F766E] to-[#14B8A6]"
                      )}
                      style={{ width: `${Math.min(100, progressPct)}%` }}
                    />
                  </div>
                </div>

                {/* Bottom Export & Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <button
                    onClick={() => handleExportPdf(batch)}
                    disabled={busyAction !== null}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-[#173B63] dark:border-zinc-800 bg-[#173B63] hover:bg-[#1E4B7A] dark:bg-zinc-900/70 dark:hover:bg-zinc-800 text-xs font-semibold text-white transition-all cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    {busyAction === `pdf-${batch.id}` ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#2DD4BF]" />
                    ) : (
                      <FileText className="w-4 h-4 text-[#2DD4BF] dark:text-[#14B8A6]" />
                    )}
                    <span>Merged PDF</span>
                  </button>

                  <button
                    onClick={() => handleExportExcel(batch)}
                    disabled={busyAction !== null}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-[#0F766E] dark:border-zinc-800 bg-[#0F766E] hover:bg-[#0D9488] dark:bg-zinc-900/70 dark:hover:bg-zinc-800 text-xs font-semibold text-white transition-all cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    {busyAction === `excel-${batch.id}` ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <FileSpreadsheet className="w-4 h-4 text-[#CCFBF1] dark:text-emerald-400" />
                    )}
                    <span>Accounts Report</span>
                  </button>

                  <button
                    onClick={() => handleExportZip(batch)}
                    disabled={busyAction !== null}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-[#14B8A6] dark:border-[#14B8A6]/30 bg-[#CCFBF1] hover:bg-[#99F6E4] dark:bg-[#14B8A6]/10 dark:hover:bg-[#14B8A6]/20 text-xs font-bold text-[#0F766E] dark:text-[#14B8A6] transition-all cursor-pointer disabled:opacity-50 shadow-xs"
                    title={t('Export accounts report + merged attachments together in a single ZIP package', 'تصدير تقرير الحسابات + ملف المرفقات المدمج معاً في ملف ZIP واحد')}
                  >
                    {busyAction === `zip-${batch.id}` ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <PackageCheck className="w-4 h-4" />
                    )}
                    <span>ZIP Package</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE NEW BATCH                                                 */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div
            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl p-5 flex flex-col gap-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-[#14B8A6]" />
                <span>Create New Petty Cash Batch</span>
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  {t('Batch Name *', 'اسم المجموعة *')}
                </label>
                <input
                  type="text"
                  required
                  value={newBatchName}
                  onChange={e => setNewBatchName(e.target.value)}
                  placeholder="e.g. October 1, October 2..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#14B8A6]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">{t('Month', 'الشهر')}</label>
                  <select
                    value={newBatchMonth}
                    onChange={e => {
                      const m = Number(e.target.value);
                      setNewBatchMonth(m);
                      const monthEn = MONTH_NAMES.find(item => item.value === m)?.en || 'Batch';
                      const count = batches.filter(b => b.month === m && b.year === newBatchYear).length;
                      setNewBatchName(`${monthEn} ${count + 1}`);
                    }}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#14B8A6]"
                  >
                    {MONTH_NAMES.map(m => (
                      <option key={m.value} value={m.value}>
                        {lang === 'ar' ? m.ar : m.en}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">{t('Year', 'السنة')}</label>
                  <select
                    value={newBatchYear}
                    onChange={e => setNewBatchYear(Number(e.target.value))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#14B8A6]"
                  >
                    {[2024, 2025, 2026, 2027].map(y => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    {t('PCV No (Optional)', 'رقم PCV (اختياري)')}
                  </label>
                  <input
                    type="text"
                    value={newBatchPcvNo}
                    onChange={e => setNewBatchPcvNo(e.target.value)}
                    placeholder="e.g. PCV-2026-10"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#14B8A6]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    {t('Advance OMR', 'العهدة (OMR)')}
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={newBatchAdvance}
                    onChange={e => setNewBatchAdvance(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#14B8A6]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busyAction === 'create'}
                  className="flex items-center gap-2 btn-primary-gradient bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer"
                >
                  {busyAction === 'create' && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Create & Assign Invoices</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: BATCH WORKSPACE (MANAGE, REORDER, TRANSFER & ASSIGN INVOICES)    */}
      {/* ========================================================================= */}
      {activeBatch && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm overflow-y-auto"
          onClick={() => setActiveBatchId(null)}
        >
          <div
            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[84vh] my-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-zinc-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#14B8A6]/15 border border-[#14B8A6]/30 flex items-center justify-center text-[#14B8A6]">
                  <FolderOpen className="w-5 h-5" />
                </div>
                {isEditingMeta ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1 text-sm text-white font-bold w-40"
                      placeholder="Batch Name"
                    />
                    <input
                      type="text"
                      value={editPcvNo}
                      onChange={e => setEditPcvNo(e.target.value)}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-white w-28"
                      placeholder="PCV No"
                    />
                    <input
                      type="number"
                      value={editAdvance}
                      onChange={e => setEditAdvance(e.target.value)}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-white w-24"
                      placeholder="Advance"
                    />
                    <button
                      onClick={handleSaveMeta}
                      className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-semibold cursor-pointer"
                    >
                      {t('Save', 'حفظ')}
                    </button>
                    <button
                      onClick={() => setIsEditingMeta(false)}
                      className="px-2 py-1 rounded-lg bg-zinc-800 text-zinc-400 text-xs cursor-pointer"
                    >
                      {t('Cancel', 'إلغاء')}
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-white">{activeBatch.name}</h3>
                      <span className="text-xs font-mono text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">
                        {activeBatch.id}
                      </span>
                      <button
                        onClick={() => {
                          setEditName(activeBatch.name);
                          setEditPcvNo(activeBatch.pcvNo || '');
                          setEditAdvance(String(activeBatch.advanceAmount ?? 1000));
                          setIsEditingMeta(true);
                        }}
                        className="text-zinc-400 hover:text-white p-1 rounded"
                        title={t('Edit Batch Name or PCV No', 'تعديل اسم المجموعة أو رقم PCV')}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {(() => {
                      const invs = getBatchInvoices(activeBatch);
                      const total = invs.reduce((s, i) => s + Number(i.amount || 0), 0);
                      const adv = Number(activeBatch.advanceAmount) || 1000;
                      const rem = adv - total;
                      return (
                        <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1 flex-wrap">
                          <span>Created: {activeBatch.createdAt}</span>
                          <span>•</span>
                          <span>{MONTH_NAMES.find(m => m.value === activeBatch.month)?.en} {activeBatch.year}</span>
                          <span>•</span>
                          <span>Advance: <strong className="text-zinc-200">OMR {adv.toFixed(3)}</strong></span>
                          <span>•</span>
                          <span>Spent: <strong className="text-[#14B8A6]">OMR {total.toFixed(3)}</strong></span>
                          <span>•</span>
                          <span>
                            Remaining:{' '}
                            <strong className={rem < 0 ? 'text-danger font-bold' : 'text-emerald-400 font-bold'}>
                              {rem < 0 ? `-OMR ${Math.abs(rem).toFixed(3)}` : `OMR ${rem.toFixed(3)}`}
                            </strong>
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportExcel(activeBatch)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Accounts Report</span>
                </button>
                <button
                  onClick={() => handleExportPdf(activeBatch)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-semibold cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Merged PDF</span>
                </button>
                <button
                  onClick={() => handleExportZip(activeBatch)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl btn-primary-gradient bg-teal-600 text-white text-xs font-semibold cursor-pointer"
                >
                  <PackageCheck className="w-3.5 h-3.5" />
                  <span>ZIP</span>
                </button>
                <button
                  onClick={() => setActiveBatchId(null)}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Sub-navigation Tabs */}
            <div className="px-5 pt-3 border-b border-zinc-800 flex items-center justify-between gap-4 bg-zinc-900/40 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setWorkspaceTab('current')}
                  className={clsx(
                    'px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer',
                    workspaceTab === 'current'
                      ? 'border-[#14B8A6] text-[#14B8A6]'
                      : 'border-transparent text-zinc-400 hover:text-white'
                  )}
                >
                  {t('Batch Invoices & Export Order', 'فواتير المجموعة وترتيب التصدير')} ({getBatchInvoices(activeBatch).length})
                </button>
                <button
                  onClick={() => setWorkspaceTab('assign')}
                  className={clsx(
                    'px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5',
                    workspaceTab === 'assign'
                      ? 'border-[#14B8A6] text-[#14B8A6]'
                      : 'border-transparent text-zinc-400 hover:text-white'
                  )}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t(`Assign Invoices to ${activeBatch.name}`, `إضافة فواتير إلى ${activeBatch.name}`)}</span>
                </button>
              </div>

              {workspaceTab === 'current' && getBatchInvoices(activeBatch).length > 1 && (
                <div className="flex items-center gap-2 pb-2">
                  <button
                    onClick={() => handleSortBatchInvoices('date')}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowUpDown className="w-3 h-3" />
                    <span>{t('Sort by Date', 'ترتيب بالتاريخ')}</span>
                  </button>
                  <button
                    onClick={() => handleSortBatchInvoices('expense_no')}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowUpDown className="w-3 h-3" />
                    <span>{t('Sort by Expense No', 'ترتيب برقم الفاتورة')}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
              {workspaceTab === 'current' ? (
                /* ========================================================= */
                /* TAB 1: INVOICES IN THIS BATCH (REORDER / TRANSFER / REMOVE) */
                /* ========================================================= */
                <div className="flex flex-col gap-4">
                  {/* Bulk Bar for selected items inside batch */}
                  {selectedInBatch.length > 0 && (
                    <div className="p-3 rounded-xl bg-zinc-800/80 border border-zinc-700 flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs font-semibold text-white">
                        {t(`Selected ${selectedInBatch.length} invoices from batch`, `تم تحديد ${selectedInBatch.length} فاتورة من المجموعة`)}
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
                        {batches.filter(b => b.id !== activeBatch.id).length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <select
                              value={transferTargetBatchId}
                              onChange={e => setTransferTargetBatchId(e.target.value)}
                              className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-white"
                            >
                              <option value="">{t('Transfer to another batch...', 'نقل إلى مجموعة أخرى...')}</option>
                              {batches
                                .filter(b => b.id !== activeBatch.id)
                                .map(b => (
                                   <option key={b.id} value={b.id}>
                                    {b.name}
                                  </option>
                                ))}
                            </select>
                            <button
                              disabled={!transferTargetBatchId || busyAction === 'transfer'}
                              onClick={() =>
                                handleTransferInvoices(
                                  activeBatch.id,
                                  transferTargetBatchId,
                                  selectedInBatch
                                )
                              }
                              className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <ArrowRightLeft className="w-3 h-3" />
                              <span>{t('Transfer', 'نقل')}</span>
                            </button>
                          </div>
                        )}

                        <button
                          onClick={() => handleRemoveFromBatch(selectedInBatch)}
                          className="px-3 py-1 rounded-lg bg-danger/20 hover:bg-danger/30 text-danger border border-danger/30 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>{t('Remove from Batch', 'إزالة من المجموعة')}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {getBatchInvoices(activeBatch).length === 0 ? (
                    <div className="py-12 text-center flex flex-col items-center gap-3">
                      <p className="text-sm text-zinc-400">
                        {t(`No invoices added to batch ${activeBatch.name} currently.`, `لا توجد فواتير مضافة في مجموعة ${activeBatch.name} حالياً.`)}
                      </p>
                      <button
                        onClick={() => setWorkspaceTab('assign')}
                        className="px-4 py-2 rounded-xl btn-primary-gradient bg-blue-600 text-white text-xs font-semibold cursor-pointer"
                      >
                        {t('+ Select Invoices to Add to Batch', '+ اختيار فواتير لإضافتها للمجموعة')}
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-zinc-800">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-zinc-800/60 text-zinc-400 uppercase">
                          <tr>
                            <th className="p-3 w-8 text-center">
                              <input
                                type="checkbox"
                                checked={
                                  getBatchInvoices(activeBatch).length > 0 &&
                                  getBatchInvoices(activeBatch).every(i =>
                                    selectedInBatch.includes(i.id)
                                  )
                                }
                                onChange={() => {
                                  const allIds = getBatchInvoices(activeBatch).map(i => i.id);
                                  if (allIds.every(id => selectedInBatch.includes(id))) {
                                    setSelectedInBatch([]);
                                  } else {
                                    setSelectedInBatch(allIds);
                                  }
                                }}
                                className="rounded accent-[#14B8A6] cursor-pointer"
                              />
                            </th>
                            <th className="p-3 w-16 text-center">Order</th>
                            <th className="p-3">Expense No</th>
                            <th className="p-3">Date</th>
                            <th className="p-3">Request Description</th>
                            <th className="p-3">Category</th>
                            <th className="p-3">Amount</th>
                            <th className="p-3">Project Name</th>
                            <th className="p-3 text-center">File</th>
                            <th className="p-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60">
                          {getBatchInvoices(activeBatch).map((exp, idx, arr) => (
                            <tr key={exp.id} className="hover:bg-zinc-800/30 transition-colors">
                              <td className="p-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={selectedInBatch.includes(exp.id)}
                                  onChange={() =>
                                    setSelectedInBatch(prev =>
                                      prev.includes(exp.id)
                                        ? prev.filter(i => i !== exp.id)
                                        : [...prev, exp.id]
                                    )
                                  }
                                  className="rounded accent-[#14B8A6] cursor-pointer"
                                />
                              </td>
                              <td className="p-3 text-center">
                                <div className="inline-flex items-center gap-1">
                                  <span className="font-mono font-bold text-zinc-400 w-6">
                                    {String(idx + 1).padStart(2, '0')}
                                  </span>
                                  <div className="flex flex-col">
                                    <button
                                      disabled={idx === 0}
                                      onClick={() => handleMoveInvoice(idx, 'up')}
                                      className="text-zinc-400 hover:text-white disabled:opacity-20 cursor-pointer"
                                      title={t('Move Up', 'تحريك لأعلى')}
                                    >
                                      <ArrowUp className="w-3 h-3" />
                                    </button>
                                    <button
                                      disabled={idx === arr.length - 1}
                                      onClick={() => handleMoveInvoice(idx, 'down')}
                                      className="text-zinc-400 hover:text-white disabled:opacity-20 cursor-pointer"
                                      title={t('Move Down', 'تحريك لأسفل')}
                                    >
                                      <ArrowDown className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3 font-semibold text-blue-400 whitespace-nowrap">
                                {exp.expense_no}
                              </td>
                              <td className="p-3 text-zinc-300 whitespace-nowrap">
                                {exp.expense_date}
                              </td>
                              <td className="p-3 text-white max-w-[200px] truncate">
                                {exp.request_description}
                              </td>
                              <td className="p-3 text-zinc-300 whitespace-nowrap">
                                {exp.petty_cash_categories?.name || '-'}
                              </td>
                              <td className="p-3 font-bold text-emerald-400 whitespace-nowrap">
                                OMR {Number(exp.amount || 0).toFixed(3)}
                              </td>
                              <td className="p-3 text-zinc-300 whitespace-nowrap">
                                {exp.projects?.name || 'HEAD OFFICE'}
                              </td>
                              <td className="p-3 text-center">
                                {exp.attachment_url ? (
                                  <button
                                    onClick={() => window.open(exp.attachment_url, '_blank')}
                                    className="text-[#14B8A6] hover:underline cursor-pointer"
                                    title={t('View Attachment', 'عرض المرفق')}
                                  >
                                    <Paperclip className="w-3.5 h-3.5 inline" />
                                  </button>
                                ) : (
                                  <span className="text-zinc-600">-</span>
                                )}
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => handleRemoveFromBatch([exp.id])}
                                  className="text-zinc-400 hover:text-danger p-1 rounded cursor-pointer"
                                  title={t('Remove from Batch', 'إزالة من المجموعة')}
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                /* ========================================================= */
                /* TAB 2: ASSIGN EXISTING INVOICES TO BATCH                  */
                /* ========================================================= */
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-zinc-800 text-white">
                        Selected {selectedToAssign.length}
                      </span>
                      <button
                        onClick={() => {
                          if (
                            selectableUnassignedIds.length > 0 &&
                            selectableUnassignedIds.every(id => selectedToAssign.includes(id))
                          ) {
                            setSelectedToAssign([]);
                          } else {
                            setSelectedToAssign(selectableUnassignedIds);
                          }
                        }}
                        className="text-xs text-[#14B8A6] hover:underline cursor-pointer"
                      >
                        {t('Select All Available Invoices', 'تحديد كل الفواتير المتاحة')} ({selectableUnassignedIds.length})
                      </button>
                    </div>

                    <div className="flex items-center gap-2 flex-1 max-w-md">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={assignSearch}
                          onChange={e => setAssignSearch(e.target.value)}
                          placeholder={t('Search by expense no, description, project...', 'بحث برقم الفاتورة، الوصف، المشروع...')}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#14B8A6]"
                        />
                      </div>
                      <select
                        value={assignMonthScope}
                        onChange={e =>
                          setAssignMonthScope(e.target.value as 'batch-month' | 'all')
                        }
                        className="bg-zinc-800 border border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs text-zinc-300"
                      >
                        <option value="batch-month">
                          {t(`Invoices of Batch Month (${MONTH_NAMES.find(m => m.value === activeBatch.month)?.en})`, `فواتير شهر المجموعة (${MONTH_NAMES.find(m => m.value === activeBatch.month)?.ar})`)}
                        </option>
                        <option value="all">{t('All Uploaded Invoices', 'كل الفواتير المرفوعة')}</option>
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-zinc-800 max-h-[42vh]">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-zinc-800/70 text-zinc-400 uppercase sticky top-0 z-10">
                        <tr>
                          <th className="p-3">OMR</th>
                          <th className="p-3">Category / Project</th>
                          <th className="p-3">Description</th>
                          <th className="p-3">Date</th>
                          <th className="p-3">Invoice</th>
                          <th className="p-3 text-right">Status / Select</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60">
                        {candidateInvoices.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-zinc-500">
                              {t('No matching invoices found. You can switch to "All Uploaded Invoices".', 'لا توجد فواتير مطابقة. يمكنك التبديل إلى "كل الفواتير المرفوعة".')}
                            </td>
                          </tr>
                        ) : (
                          candidateInvoices.map(exp => {
                            const assignedInfo = invoiceAssignmentMap.get(exp.id);
                            const isAssignedHere = assignedInfo?.batchId === activeBatch.id;
                            const isAssignedOther =
                              assignedInfo && assignedInfo.batchId !== activeBatch.id;
                            const isChecked = selectedToAssign.includes(exp.id);

                            return (
                              <tr
                                key={exp.id}
                                onClick={() => {
                                  if (isAssignedHere || isAssignedOther) return;
                                  setSelectedToAssign(prev =>
                                    prev.includes(exp.id)
                                      ? prev.filter(id => id !== exp.id)
                                      : [...prev, exp.id]
                                  );
                                }}
                                className={clsx(
                                  'transition-colors',
                                  isAssignedHere || isAssignedOther
                                    ? 'opacity-65 bg-zinc-900/40'
                                    : 'hover:bg-zinc-800/40 cursor-pointer',
                                  isChecked && 'bg-[#14B8A6]/10'
                                )}
                              >
                                <td className="p-3 font-bold text-white whitespace-nowrap">
                                  {Number(exp.amount || 0).toFixed(3)}
                                </td>
                                <td className="p-3 text-zinc-300 whitespace-nowrap">
                                  <div>{exp.petty_cash_categories?.name || '-'}</div>
                                  <div className="text-[10px] text-zinc-500">
                                    {exp.projects?.name || 'HEAD OFFICE'}
                                  </div>
                                </td>
                                <td className="p-3 text-zinc-300 max-w-[220px] truncate">
                                  {exp.request_description}
                                </td>
                                <td className="p-3 text-zinc-400 whitespace-nowrap">
                                  {exp.expense_date}
                                </td>
                                <td className="p-3 font-semibold text-blue-400 whitespace-nowrap">
                                  {exp.expense_no}
                                </td>
                                <td
                                  className="p-3 text-right whitespace-nowrap"
                                  onClick={e => e.stopPropagation()}
                                >
                                  {isAssignedHere ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                      <Check className="w-3 h-3" /> {t('Assigned Here', 'مضافة هنا')}
                                    </span>
                                  ) : isAssignedOther ? (
                                    <div className="inline-flex items-center gap-2">
                                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                        {t('In:', 'في:')} {assignedInfo.batchName}
                                      </span>
                                      <button
                                        onClick={() =>
                                          handleTransferInvoices(
                                            assignedInfo.batchId,
                                            activeBatch.id,
                                            [exp.id]
                                          )
                                        }
                                        className="text-[11px] text-purple-400 hover:underline font-semibold cursor-pointer"
                                        title={t('Transfer this invoice to this batch', 'نقل هذه الفاتورة إلى هذه المجموعة')}
                                      >
                                        {t('Transfer Here', 'نقل لهنا')}
                                      </button>
                                    </div>
                                  ) : (
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() =>
                                        setSelectedToAssign(prev =>
                                          prev.includes(exp.id)
                                            ? prev.filter(id => id !== exp.id)
                                            : [...prev, exp.id]
                                        )
                                      }
                                      className="w-4 h-4 rounded-full accent-[#14B8A6] cursor-pointer"
                                    />
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Bottom Assign Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                    <button
                      disabled={selectedToAssign.length === 0 || busyAction === 'assign'}
                      onClick={handleAssignInvoices}
                      className="flex items-center gap-2 px-5 py-2 rounded-full btn-primary-gradient bg-zinc-100 hover:bg-white text-zinc-900 font-bold text-xs transition-all disabled:opacity-40 cursor-pointer"
                    >
                      {busyAction === 'assign' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      <span>Assign to {activeBatch.name}</span>
                    </button>

                    <span className="text-xs text-zinc-400">
                      Selected: <strong className="text-white">{selectedToAssign.length}</strong>{' '}
                      invoices (OMR{' '}
                      {candidateInvoices
                        .filter(i => selectedToAssign.includes(i.id))
                        .reduce((s, i) => s + Number(i.amount || 0), 0)
                        .toFixed(3)}
                      )
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
