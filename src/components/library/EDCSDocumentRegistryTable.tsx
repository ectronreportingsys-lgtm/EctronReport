'use client';

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Eye, 
  Download, 
  RotateCw, 
  Edit3, 
  Trash2, 
  FileText, 
  Building2, 
  Calendar, 
  User, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  FolderOpen,
  Plus
} from 'lucide-react';
import clsx from 'clsx';
import { EDCSDocument } from '@/app/(dashboard)/library/actions/edcsActions';
import { useLanguage } from '@/components/layout/LanguageProvider';

interface EDCSDocumentRegistryTableProps {
  documents: EDCSDocument[];
  onViewDoc: (doc: EDCSDocument) => void;
  onRenewDoc: (doc: EDCSDocument) => void;
  onEditDoc: (doc: EDCSDocument) => void;
  onDownloadDoc: (doc: EDCSDocument) => void;
  onDeleteDoc?: (doc: EDCSDocument) => void;
  onAddNewDoc: () => void;
  initialStatusFilter?: string;
}

export default function EDCSDocumentRegistryTable({
  documents,
  onViewDoc,
  onRenewDoc,
  onEditDoc,
  onDownloadDoc,
  onDeleteDoc,
  onAddNewDoc,
  initialStatusFilter = 'all'
}: EDCSDocumentRegistryTableProps) {
  const { t } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  // Sorting: 'soonest' (asc - urgent first), 'latest' (desc - furthest first)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const toggleSort = () => {
    setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
  };

  // Distinct Categories & Departments
  const categories = useMemo(() => {
    const set = new Set<string>();
    documents.forEach(d => { if (d.category) set.add(d.category); });
    return Array.from(set);
  }, [documents]);

  const departments = useMemo(() => {
    const set = new Set<string>();
    documents.forEach(d => { if (d.department) set.add(d.department); });
    return Array.from(set);
  }, [documents]);

  // Filtered & Sorted documents
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      // Status filter
      if (statusFilter !== 'all' && doc.status !== statusFilter) return false;

      // Category filter
      if (categoryFilter !== 'all' && doc.category !== categoryFilter) return false;

      // Department filter
      if (departmentFilter !== 'all' && doc.department !== departmentFilter) return false;

      // Search Query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        doc.name.toLowerCase().includes(q) ||
        (doc.nameAr && doc.nameAr.toLowerCase().includes(q)) ||
        doc.referenceNo.toLowerCase().includes(q) ||
        doc.category.toLowerCase().includes(q) ||
        doc.department.toLowerCase().includes(q) ||
        doc.responsiblePerson.toLowerCase().includes(q) ||
        (doc.notes && doc.notes.toLowerCase().includes(q))
      );
    }).sort((a, b) => {
      // Sorting by Expiry Date
      // Permanent documents placed at the bottom regardless of sort
      if (a.isPermanent && !b.isPermanent) return 1;
      if (!a.isPermanent && b.isPermanent) return -1;
      if (a.isPermanent && b.isPermanent) return a.name.localeCompare(b.name);

      const dateA = a.expiryDate || '9999-99-99';
      const dateB = b.expiryDate || '9999-99-99';

      const cmp = dateA.localeCompare(dateB);
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [documents, statusFilter, categoryFilter, departmentFilter, searchQuery, sortDirection]);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#121820]/90 p-5 sm:p-6 shadow-xl space-y-5">
      {/* Table Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-400">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>{t('Document Registry', 'سجل الوثائق والمستندات')}</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-800 text-teal-300 border border-zinc-700">
                  {filteredDocuments.length} {t('files', 'ملفات')}
                </span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                {t(
                  'Comprehensive index of all factory records, standard compliance certificates, and expiry tracking',
                  'فهرس شامل لجميع تراخيص المصنع، شهادات الجودة، وسجلات الصلاحية والمطابقة'
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Action Button: Add New Document */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={onAddNewDoc}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-zinc-950 font-bold text-xs sm:text-sm transition-all shadow-md shadow-teal-900/30 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{t('Add Document', 'إضافة وثيقة جديدة')}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 flex-wrap">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t(
              'Search by document name, ref no, department, responsible person...',
              'البحث باسم الوثيقة، الرقم المرجعي، القسم، أو الشخص المسؤول...'
            )}
            className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-[#14B8A6] transition-colors"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-medium text-zinc-200 focus:outline-none focus:border-[#14B8A6] cursor-pointer"
          >
            <option value="all">{t('All Statuses', 'كل الحالات')}</option>
            <option value="Active">{t('Active Documents', 'سارية المفعول')}</option>
            <option value="Expiring Soon">{t('Expiring Soon (≤ 14d)', 'قريبة الانتهاء (≤ 14 يوم)')}</option>
            <option value="Expired">{t('Expired', 'منتهية الصلاحية')}</option>
            <option value="Permanent">{t('Permanent / Non-Expiring', 'دائمة غير منتهية')}</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-medium text-zinc-200 focus:outline-none focus:border-[#14B8A6] cursor-pointer max-w-[170px] truncate"
          >
            <option value="all">{t('All Categories', 'كل التصنيفات')}</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={e => setDepartmentFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-medium text-zinc-200 focus:outline-none focus:border-[#14B8A6] cursor-pointer max-w-[170px] truncate"
          >
            <option value="all">{t('All Departments', 'كل الأقسام')}</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          {/* Sort Direction Toggle Button */}
          <button
            type="button"
            onClick={toggleSort}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold transition-colors cursor-pointer select-none"
            title={sortDirection === 'asc' ? t('Sorted by Expiry: Soonest First', 'الترتيب: الأقرب انتهاءً أولاً') : t('Sorted by Expiry: Latest First', 'الترتيب: الأبعد انتهاءً أولاً')}
          >
            <span className="p-0.5 rounded text-teal-400">
              {sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
            </span>
            <span className="hidden sm:inline">
              {sortDirection === 'asc' ? t('Soonest Expiry', 'الأقرب انتهاءً') : t('Furthest Expiry', 'الأبعد انتهاءً')}
            </span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-xl border border-zinc-800/80 bg-zinc-950/40">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/60 text-zinc-400 font-bold uppercase tracking-wider text-[11px]">
              <th className="px-4 py-3">{t('Document Name & Ref', 'اسم الوثيقة والمرجع')}</th>
              <th className="px-3 py-3">{t('Category', 'التصنيف')}</th>
              <th className="px-3 py-3">{t('Department', 'القسم')}</th>
              <th className="px-3 py-3">{t('Issue Date', 'تاريخ الإصدار')}</th>
              <th 
                onClick={toggleSort}
                className="px-3 py-3 cursor-pointer select-none hover:text-white transition-colors group"
                title={t('Click to sort by expiry date', 'اضغط للترتيب حسب تاريخ الانتهاء')}
              >
                <div className="flex items-center gap-1">
                  <span>{t('Expiry Date', 'تاريخ الانتهاء')}</span>
                  <span className="text-teal-400">
                    {sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                  </span>
                </div>
              </th>
              <th className="px-3 py-3">{t('Days Remaining', 'المدة المتبقية')}</th>
              <th className="px-3 py-3">{t('Responsible Person', 'المسؤول')}</th>
              <th className="px-3 py-3 text-center">{t('Status', 'الحالة')}</th>
              <th className="px-4 py-3 text-center">{t('Actions', 'الإجراءات')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 font-medium">
            {filteredDocuments.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-zinc-500">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-semibold">{t('No documents found matching the filters.', 'لم يتم العثور على وثائق مطابقة للشروط.')}</p>
                </td>
              </tr>
            ) : (
              filteredDocuments.map((doc) => {
                const days = doc.daysRemaining;
                const isExpired = doc.status === 'Expired';
                const isSoon = doc.status === 'Expiring Soon';
                const isPermanent = doc.status === 'Permanent' || doc.isPermanent;

                return (
                  <tr 
                    key={doc.id}
                    className="hover:bg-zinc-800/30 transition-colors group"
                  >
                    {/* Document Name & Ref */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col gap-0.5">
                        <span 
                          onClick={() => onViewDoc(doc)}
                          className="font-bold text-white group-hover:text-teal-300 cursor-pointer transition-colors"
                        >
                          {doc.name}
                        </span>
                        {doc.nameAr && (
                          <span className="text-[11px] text-zinc-400 font-sans rtl:font-arabic">
                            {doc.nameAr}
                          </span>
                        )}
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="font-mono text-[10px] text-zinc-400 bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-700/60">
                            {doc.referenceNo}
                          </span>
                          <span className="font-bold text-[10px] text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/20">
                            {doc.currentVersion}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-3 py-3.5 text-zinc-300">
                      <span className="px-2 py-1 rounded-md bg-zinc-800/60 border border-zinc-700/40 text-[11px]">
                        {doc.category}
                      </span>
                    </td>

                    {/* Department */}
                    <td className="px-3 py-3.5 text-zinc-300">
                      <span className="truncate max-w-[140px] block">
                        {doc.department}
                      </span>
                    </td>

                    {/* Issue Date */}
                    <td className="px-3 py-3.5 text-zinc-400 font-mono text-[11px]">
                      {doc.issueDate || '—'}
                    </td>

                    {/* Expiry Date */}
                    <td className="px-3 py-3.5 font-mono text-[11px]">
                      {isPermanent ? (
                        <span className="text-blue-400 font-semibold">{t('Permanent', 'دائمة')}</span>
                      ) : (
                        <span className={clsx(
                          isExpired ? 'text-rose-400 font-bold' : isSoon ? 'text-amber-400 font-bold' : 'text-zinc-200'
                        )}>
                          {doc.expiryDate}
                        </span>
                      )}
                    </td>

                    {/* Days Remaining */}
                    <td className="px-3 py-3.5">
                      {isPermanent ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                          {t('No Expiry', 'بدون انتهاء')}
                        </span>
                      ) : isExpired ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          {t(`Expired ${Math.abs(days || 0)}d ago`, `منتهية (${Math.abs(days || 0)} يوم)`)}
                        </span>
                      ) : isSoon ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 w-max">
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>{t(`${days} days left`, `${days} يوم متبقي`)}</span>
                        </span>
                      ) : (
                        <span className="text-zinc-300 font-medium">
                          {t(`${days} days`, `${days} يوماً`)}
                        </span>
                      )}
                    </td>

                    {/* Responsible Person */}
                    <td className="px-3 py-3.5 text-zinc-300">
                      <div className="flex flex-col">
                        <span className="font-semibold text-white truncate max-w-[130px]">{doc.responsiblePerson}</span>
                        <span className="text-[10px] text-teal-400 font-mono truncate max-w-[130px]">{doc.reminderEmail}</span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-3 py-3.5 text-center">
                      <span className={clsx(
                        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border',
                        isPermanent
                          ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                          : isExpired
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : isSoon
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      )}>
                        <span className={clsx(
                          'w-1.5 h-1.5 rounded-full',
                          isPermanent ? 'bg-blue-400' : isExpired ? 'bg-rose-400' : isSoon ? 'bg-amber-400' : 'bg-emerald-400'
                        )} />
                        <span>
                          {doc.status === 'Active' ? t('Active', 'سارية') :
                           doc.status === 'Expiring Soon' ? t('Expiring', 'قاربت الانتهاء') :
                           doc.status === 'Expired' ? t('Expired', 'منتهية') :
                           t('Permanent', 'دائمة')}
                        </span>
                      </span>
                    </td>

                    {/* Actions: View, Download, Edit, Renew */}
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* View Action */}
                        <button
                          type="button"
                          onClick={() => onViewDoc(doc)}
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                          title={t('View document dossier & version history', 'عرض ملف الوثيقة وسجل الإصدارات')}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Download Action */}
                        <button
                          type="button"
                          onClick={() => onDownloadDoc(doc)}
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                          title={t('Download file (sample signed URL trigger)', 'تحميل الملف (رابط آمن تجريبي)')}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit Action */}
                        <button
                          type="button"
                          onClick={() => onEditDoc(doc)}
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                          title={t('Edit metadata', 'تعديل البيانات')}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Renew Action */}
                        {!isPermanent && (
                          <button
                            type="button"
                            onClick={() => onRenewDoc(doc)}
                            className="p-1.5 rounded-lg bg-teal-500/20 hover:bg-teal-500 text-teal-300 hover:text-zinc-950 border border-teal-500/30 transition-all cursor-pointer"
                            title={t('Renew document & upload new version', 'تجديد الوثيقة ورفع إصدار جديد')}
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
