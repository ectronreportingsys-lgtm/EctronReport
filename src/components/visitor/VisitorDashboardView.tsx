'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  Building2, 
  Users, 
  Calendar, 
  Clock, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  Plus, 
  Eye, 
  Edit3, 
  Trash2, 
  QrCode, 
  FileSpreadsheet, 
  ArrowUpDown,
  CheckCircle2,
  X,
  ExternalLink,
  ChevronDown,
  Globe2,
  Upload,
  RefreshCw,
  PhoneCall,
  UserPlus
} from 'lucide-react';
import { VisitRecord, OrganizationGroup, VisitorItem, extractOrganizationGroups } from '@/lib/visitorTypes';
import { updateTimeOut, removeVisit, updateVisitDetails } from '@/app/visitor/actions/visitorActions';
import { exportVisitsListToExcel, exportDetailedVisitorsToExcel, printVisitsReport } from '@/lib/visitorExporter';
import { useLanguage } from '@/components/layout/LanguageProvider';

interface VisitorDashboardViewProps {
  initialVisits: VisitRecord[];
  initialYears: number[];
  initialSelectedYear: number;
}

export default function VisitorDashboardView({
  initialVisits,
  initialYears,
  initialSelectedYear,
}: VisitorDashboardViewProps) {
  const { t } = useLanguage();
  const [visits, setVisits] = useState<VisitRecord[]>(initialVisits);
  const [selectedYear, setSelectedYear] = useState<number>(initialSelectedYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(0); // 0 = all
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [selectedCoordination, setSelectedCoordination] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Modals state
  const [selectedVisitModal, setSelectedVisitModal] = useState<VisitRecord | null>(null);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [editForm, setEditForm] = useState<VisitRecord | null>(null);
  const [editCustomCoordination, setEditCustomCoordination] = useState<string>('');
  const [timeOutModal, setTimeOutModal] = useState<{ isOpen: boolean; visitId: string; time: string }>({
    isOpen: false,
    visitId: '',
    time: ''
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; visitId: string; visitNumber: string }>({
    isOpen: false,
    visitId: '',
    visitNumber: ''
  });

  const [isUpdating, setIsUpdating] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // Available countries from data
  const availableCountries = useMemo(() => {
    const s = new Set<string>();
    visits.forEach(v => { if (v.country) s.add(v.country); });
    return Array.from(s).sort();
  }, [visits]);

  // Sister company helper
  const sisterCompaniesList = ['Ectron', 'NEC', 'AAMU', 'Tadoom', 'TadoomX', 'Other'];

  const renderCoordinationBadge = (coordRaw?: string) => {
    const coord = (coordRaw || 'Ectron').trim();
    const cLower = coord.toLowerCase();

    if (cLower === 'ectron') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-extrabold bg-teal-50 text-[#0F766E] border border-teal-200 dark:bg-teal-950/40 dark:text-teal-400 dark:border-teal-800">
          {t('Ectron', 'إلكترون (Ectron)')}
        </span>
      );
    }
    if (cLower === 'nec') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800">
          NEC
        </span>
      );
    }
    if (cLower === 'aamu') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-extrabold bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800">
          AAMU
        </span>
      );
    }
    if (cLower === 'tadoom') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-extrabold bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800">
          {t('Tadoom', 'تدوم (Tadoom)')}
        </span>
      );
    }
    if (cLower === 'tadoomx') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-extrabold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">
          {t('TadoomX', 'تدوم إكس (TadoomX)')}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-extrabold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800" title={coord}>
        {coord}
      </span>
    );
  };

  // Filtered Visits
  const filteredVisits = useMemo(() => {
    return visits.filter(v => {
      // Year filter
      if (selectedYear) {
        const y = parseInt(v.visit_date.substring(0, 4), 10);
        if (y !== selectedYear) return false;
      }

      // Month filter
      if (selectedMonth > 0) {
        const parts = v.visit_date.split('-');
        if (parseInt(parts[1], 10) !== selectedMonth) return false;
      }

      // Source filter
      if (selectedSource !== 'all' && v.registration_source !== selectedSource) {
        return false;
      }

      // Country filter
      if (selectedCountry !== 'all' && (v.country || '').toLowerCase() !== selectedCountry.toLowerCase()) {
        return false;
      }

      // Coordination filter
      if (selectedCoordination !== 'all') {
        const coord = (v.coordination_by || 'Ectron').toLowerCase();
        if (selectedCoordination === 'Other') {
          const known = ['ectron', 'nec', 'aamu', 'tadoom', 'tadoomx'];
          if (known.includes(coord)) return false;
        } else {
          if (coord !== selectedCoordination.toLowerCase()) return false;
        }
      }

      // Date range filter
      if (dateFrom && v.visit_date < dateFrom) return false;
      if (dateTo && v.visit_date > dateTo) return false;

      // Text Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchNumber = v.visit_number.toLowerCase().includes(q);
        const matchOrgEn = (v.organization_en || '').toLowerCase().includes(q);
        const matchOrgAr = (v.organization_ar || '').includes(q);
        const matchReason = (v.visit_reason || '').toLowerCase().includes(q);
        const matchCoord = (v.coordination_by || '').toLowerCase().includes(q);
        const matchVisitor = (v.visitors || []).some(
          vis => (vis.full_name_en || '').toLowerCase().includes(q) ||
                 (vis.full_name_ar || '').includes(q) ||
                 (vis.phone_number || '').includes(q)
        );
        return matchNumber || matchOrgEn || matchOrgAr || matchReason || matchCoord || matchVisitor;
      }

      return true;
    });
  }, [visits, selectedYear, selectedMonth, selectedSource, selectedCountry, selectedCoordination, dateFrom, dateTo, searchTerm]);

  // Dashboard Stats Calculations for filtered subset
  const stats = useMemo(() => {
    const totalVisits = filteredVisits.length;
    let totalVisitors = 0;
    const orgsSet = new Set<string>();

    filteredVisits.forEach(v => {
      const count = v.visitors && v.visitors.length > 0 ? v.visitors.length : 1;
      totalVisitors += count;

      const orgGroups = extractOrganizationGroups(v);
      if (orgGroups.length > 0) {
        orgGroups.forEach(og => {
          const k = (og.organization_en || og.organization_ar || '').trim().toLowerCase();
          if (k) orgsSet.add(k);
        });
      } else {
        const orgKey = (v.organization_en || v.organization_ar || '').trim().toLowerCase();
        if (orgKey) orgsSet.add(orgKey);
      }
    });

    const totalOrganizations = orgsSet.size;
    const averageVisitors = totalVisits > 0 ? (totalVisitors / totalVisits).toFixed(1) : '0';

    return {
      totalVisits,
      totalVisitors,
      totalOrganizations,
      averageVisitors
    };
  }, [filteredVisits]);

  // Handle Quick Time Out
  const handleOpenTimeOut = (visit: VisitRecord) => {
    const nowTime = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Muscat',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(new Date());

    setTimeOutModal({
      isOpen: true,
      visitId: visit.id,
      time: visit.time_out || nowTime
    });
  };

  const handleSaveTimeOut = async () => {
    if (!timeOutModal.visitId || !timeOutModal.time) return;
    setIsUpdating(true);
    try {
      const res = await updateTimeOut(timeOutModal.visitId, timeOutModal.time);
      if (res.success) {
        setVisits(prev =>
          prev.map(v => (v.id === timeOutModal.visitId ? { ...v, time_out: timeOutModal.time } : v))
        );
        setTimeOutModal({ isOpen: false, visitId: '', time: '' });
      }
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle Delete
  const handleConfirmDelete = async () => {
    if (!deleteConfirm.visitId) return;
    setIsUpdating(true);
    try {
      const res = await removeVisit(deleteConfirm.visitId);
      if (res.success) {
        setVisits(prev => prev.filter(v => v.id !== deleteConfirm.visitId));
        setDeleteConfirm({ isOpen: false, visitId: '', visitNumber: '' });
      }
    } finally {
      setIsUpdating(false);
    }
  };

  // Open unified visit modal in view mode or edit mode
  const handleOpenVisitModal = (visit: VisitRecord, editMode = false) => {
    const v: VisitRecord = JSON.parse(JSON.stringify(visit));
    if (!v.organizations || v.organizations.length === 0) {
      v.organizations = extractOrganizationGroups(v);
    }
    setSelectedVisitModal(v);
    setEditForm(JSON.parse(JSON.stringify(v)));
    setIsEditMode(editMode);
    const coord = v.coordination_by || 'Ectron';
    setEditCustomCoordination(sisterCompaniesList.includes(coord) ? '' : coord);
  };

  // Edit Organization & Visitors Handlers
  const handleAddOrgInEdit = () => {
    if (!editForm) return;
    const currentOrgs: OrganizationGroup[] = editForm.organizations && editForm.organizations.length > 0
      ? [...editForm.organizations]
      : extractOrganizationGroups(editForm);

    currentOrgs.push({
      organization_en: '',
      organization_ar: '',
      visitors: [{ full_name_en: '', full_name_ar: '', phone_number: '' }]
    });
    setEditForm({ ...editForm, organizations: currentOrgs });
  };

  const handleRemoveOrgFromEdit = (oIndex: number) => {
    if (!editForm) return;
    const currentOrgs: OrganizationGroup[] = editForm.organizations && editForm.organizations.length > 0
      ? [...editForm.organizations]
      : extractOrganizationGroups(editForm);

    if (currentOrgs.length <= 1) return;
    const updated = currentOrgs.filter((_, idx) => idx !== oIndex);
    setEditForm({ ...editForm, organizations: updated });
  };

  const handleUpdateOrgInEdit = (oIndex: number, field: 'organization_en' | 'organization_ar', value: string) => {
    if (!editForm) return;
    const currentOrgs: OrganizationGroup[] = editForm.organizations && editForm.organizations.length > 0
      ? [...editForm.organizations]
      : extractOrganizationGroups(editForm);

    currentOrgs[oIndex] = { ...currentOrgs[oIndex], [field]: value };
    setEditForm({ ...editForm, organizations: currentOrgs });
  };

  const handleAddVisitorToOrgInEdit = (oIndex: number) => {
    if (!editForm) return;
    const currentOrgs: OrganizationGroup[] = editForm.organizations && editForm.organizations.length > 0
      ? [...editForm.organizations]
      : extractOrganizationGroups(editForm);

    const org = currentOrgs[oIndex];
    org.visitors = [...(org.visitors || []), { full_name_en: '', full_name_ar: '', phone_number: '' }];
    setEditForm({ ...editForm, organizations: currentOrgs });
  };

  const handleRemoveVisitorFromOrgInEdit = (oIndex: number, vIndex: number) => {
    if (!editForm) return;
    const currentOrgs: OrganizationGroup[] = editForm.organizations && editForm.organizations.length > 0
      ? [...editForm.organizations]
      : extractOrganizationGroups(editForm);

    const org = currentOrgs[oIndex];
    if ((org.visitors || []).length <= 1) return;
    org.visitors = org.visitors.filter((_, idx) => idx !== vIndex);
    setEditForm({ ...editForm, organizations: currentOrgs });
  };

  const handleUpdateVisitorInOrgInEdit = (oIndex: number, vIndex: number, field: keyof VisitorItem, value: string) => {
    if (!editForm) return;
    const currentOrgs: OrganizationGroup[] = editForm.organizations && editForm.organizations.length > 0
      ? [...editForm.organizations]
      : extractOrganizationGroups(editForm);

    const org = currentOrgs[oIndex];
    const newVisitors = [...(org.visitors || [])];
    newVisitors[vIndex] = { ...newVisitors[vIndex], [field]: value };
    org.visitors = newVisitors;
    setEditForm({ ...editForm, organizations: currentOrgs });
  };

  // Handle Edit Save
  const handleSaveModalEdit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editForm) return;
    setIsUpdating(true);
    setErrorToast(null);
    try {
      const finalCoordination = editForm.coordination_by === 'Other'
        ? (editCustomCoordination.trim() || 'Other')
        : editForm.coordination_by;

      const currentOrgs: OrganizationGroup[] = editForm.organizations && editForm.organizations.length > 0
        ? editForm.organizations
        : extractOrganizationGroups(editForm);

      // Validate and clean organizations
      const validOrgs: OrganizationGroup[] = currentOrgs.map(org => ({
        organization_en: (org.organization_en || '').trim(),
        organization_ar: (org.organization_ar || '').trim(),
        visitors: (org.visitors || []).filter(vis => (vis.full_name_ar || '').trim() || (vis.full_name_en || '').trim())
      })).filter(org => (org.organization_en || org.organization_ar) || org.visitors.length > 0);

      const summaryEn = validOrgs.map(o => o.organization_en).filter(Boolean).join(' / ');
      const summaryAr = validOrgs.map(o => o.organization_ar).filter(Boolean).join(' / ');

      // Flatten visitors
      const flattenedVisitors: VisitorItem[] = [];
      validOrgs.forEach(org => {
        org.visitors.forEach(vis => {
          flattenedVisitors.push({
            ...vis,
            organization_en: org.organization_en,
            organization_ar: org.organization_ar
          });
        });
      });

      const updatedPayload: Partial<VisitRecord> = {
        organization_en: summaryEn || editForm.organization_en,
        organization_ar: summaryAr || editForm.organization_ar,
        country: editForm.country,
        coordination_by: finalCoordination,
        visit_reason: editForm.visit_reason,
        time_in: editForm.time_in,
        time_out: editForm.time_out,
        visit_date: editForm.visit_date,
        notes: editForm.notes,
        organizations: validOrgs.length > 0 ? validOrgs : undefined,
        visitors: flattenedVisitors.length > 0 ? flattenedVisitors : undefined
      };

      const res = await updateVisitDetails(editForm.id, updatedPayload);
      if (res.success) {
        const updatedRecord: VisitRecord = {
          ...editForm,
          coordination_by: finalCoordination,
          organization_en: updatedPayload.organization_en,
          organization_ar: updatedPayload.organization_ar,
          country: updatedPayload.country,
          visit_reason: updatedPayload.visit_reason,
          time_in: updatedPayload.time_in || editForm.time_in,
          time_out: updatedPayload.time_out,
          visit_date: updatedPayload.visit_date || editForm.visit_date,
          notes: updatedPayload.notes,
          organizations: validOrgs.length > 0 ? validOrgs : editForm.organizations,
          visitors: flattenedVisitors.length > 0 ? flattenedVisitors : editForm.visitors
        };
        setVisits(prev =>
          prev.map(v => (v.id === editForm.id ? updatedRecord : v))
        );
        setSelectedVisitModal(updatedRecord);
        setEditForm(JSON.parse(JSON.stringify(updatedRecord)));
        setIsEditMode(false);
        setSuccessToast(t('Visit details updated successfully!', 'تم التعديل بنجاح'));
        setTimeout(() => setSuccessToast(null), 4000);
      } else {
        setErrorToast(res.error || t('Failed to save changes', 'فشل في حفظ التعديلات'));
        setTimeout(() => setErrorToast(null), 5000);
      }
    } catch (err: any) {
      setErrorToast(err?.message || t('Failed to save changes', 'فشل في حفظ التعديلات'));
      setTimeout(() => setErrorToast(null), 5000);
    } finally {
      setIsUpdating(false);
    }
  };

  const months = useMemo(() => [
    { num: 0, name: t('All Year', 'جميع الأشهر (All Year)') },
    { num: 1, name: t('January', 'يناير (January)') },
    { num: 2, name: t('February', 'فبراير (February)') },
    { num: 3, name: t('March', 'مارس (March)') },
    { num: 4, name: t('April', 'أبريل (April)') },
    { num: 5, name: t('May', 'مايو (May)') },
    { num: 6, name: t('June', 'يونيو (June)') },
    { num: 7, name: t('July', 'يوليو (July)') },
    { num: 8, name: t('August', 'أغسطس (August)') },
    { num: 9, name: t('September', 'سبتمبر (September)') },
    { num: 10, name: t('October', 'أكتوبر (October)') },
    { num: 11, name: t('November', 'نوفمبر (November)') },
    { num: 12, name: t('December', 'ديسمبر (December)') }
  ], [t]);

  return (
    <div className="w-full space-y-6 pb-16">
      
      {/* 1. Header & Quick Actions Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-zinc-900/70 p-6 rounded-3xl border border-border shadow-sm glass">
        <div>
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#173B63] to-[#0F766E] flex items-center justify-center text-white shadow-md">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#173B63] dark:text-white">
                {t('Visitor Dashboard', 'لوحة إدارة الزوار (Visitor Dashboard)')}
              </h1>
              <p className="text-sm sm:text-base text-slate-500 dark:text-zinc-400 font-medium mt-0.5">
                {t('Monitor and track on-site visits, self-registrations, and delegations', 'متابعة وإحصائيات الزيارات الميدانية وتسجيلات الدخول الذاتية والداخلية')}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/visitor/new"
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#173B63] to-[#0F766E] hover:from-[#132f4f] hover:to-[#0c5c56] text-white text-sm sm:text-base font-extrabold shadow-md transition-all flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            <span>{t('New Visit Registration', 'تسجيل زيارة جديدة')}</span>
          </Link>

          <Link
            href="/visitor/qrcode"
            className="px-4 py-3 rounded-xl bg-[#F0FDFA] dark:bg-zinc-800 text-[#0F766E] dark:text-[#00a99d] border border-[#14B8A6]/40 hover:bg-[#CCFBF1] text-sm sm:text-base font-bold transition-colors flex items-center gap-2"
          >
            <QrCode className="w-5 h-5" />
            <span>{t('QR Code', 'رمز الاستجابة QR')}</span>
          </Link>

          <Link
            href="/visitor/import"
            className="px-4 py-3 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 text-sm sm:text-base font-bold transition-colors flex items-center gap-2"
          >
            <Upload className="w-5 h-5" />
            <span>{t('Import Excel', 'استيراد إكسل')}</span>
          </Link>

          {/* Export Buttons */}
          <div className="flex items-center gap-2 border-l border-slate-200 dark:border-zinc-700 pl-3">
            <button
              onClick={() => exportDetailedVisitorsToExcel(filteredVisits)}
              title={t('Download Visitors List', 'تنزيل قائمة الزوار')}
              className="px-4 py-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-sm sm:text-base font-bold flex items-center gap-2 transition-colors shadow-xs cursor-pointer"
            >
              <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>{t('Download Visitors List', 'تنزيل قائمة الزوار')}</span>
            </button>

            <button
              onClick={() => printVisitsReport()}
              title={t('Print Visits Report', 'طباعة تقرير الزيارات')}
              className="p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-50 text-slate-700 dark:text-zinc-200 text-sm font-bold transition-colors cursor-pointer"
            >
              <Printer className="w-5 h-5 text-slate-600 dark:text-zinc-400" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Year & Month Period Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-zinc-900/60 p-4 sm:p-5 rounded-2xl border border-border shadow-sm glass">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm font-bold text-[#173B63] dark:text-zinc-200 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#0F766E] dark:text-teal-400" />
            {t('Statistical Period:', 'الفترة الإحصائية:')}
          </span>

          {/* Year selector */}
          <div className="flex items-center gap-1.5 bg-[#F0F6FA] dark:bg-zinc-800 p-1.5 rounded-xl border border-[#D2E3F0] dark:border-zinc-700">
            {initialYears.map(yr => (
              <button
                key={yr}
                onClick={() => setSelectedYear(yr)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  selectedYear === yr
                    ? 'bg-gradient-to-r from-[#173B63] to-[#0F766E] text-white shadow-sm'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-[#173B63] dark:hover:text-white'
                }`}
              >
                {yr}
              </button>
            ))}
          </div>

          {/* Month filter */}
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(Number(e.target.value))}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-zinc-700 bg-[#F8FAFC] dark:bg-zinc-800 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
          >
            {months.map(m => (
              <option key={m.num} value={m.num}>{m.name}</option>
            ))}
          </select>
        </div>

        <div className="text-sm font-medium text-slate-600 dark:text-zinc-300">
          {t('Showing', 'عرض')} <span className="font-extrabold text-[#173B63] dark:text-teal-400 text-base">{filteredVisits.length}</span> {t('of', 'من إجمالي')} <span className="font-bold">{visits.length}</span> {t('recorded visits', 'زيارة مسجلة')}
        </div>
      </div>

      {/* 3. Summary Cards (Section 4 requirements) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Total Visits */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-white via-[#F0F7FC] to-[#E0EEF8] dark:from-zinc-900/80 dark:to-zinc-800/60 border border-[#9BB8D3] dark:border-zinc-800 shadow-sm glass transition-all hover:scale-[1.01]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-[#475569] dark:text-zinc-300">{t('Total Visits', 'إجمالي الزيارات')}</span>
            <div className="w-12 h-12 rounded-2xl bg-[#173B63] text-[#2DD4BF] flex items-center justify-center shadow-inner">
              <Calendar className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl sm:text-5xl font-black text-[#173B63] dark:text-white">
              {stats.totalVisits}
            </span>
            <span className="text-sm text-slate-500 dark:text-zinc-400 font-bold">{t('Recorded Visits', 'زيارة مسجلة')}</span>
          </div>
          <div className="mt-4 text-xs text-slate-600 dark:text-zinc-400 border-t border-slate-200/70 dark:border-zinc-700/60 pt-2.5 flex items-center justify-between font-medium">
            <span>{t(`For Year ${selectedYear}`, `لعام ${selectedYear}`)}</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{t('100% Documented', '100% موثقة')}</span>
          </div>
        </div>

        {/* Card 2: Total Visitors */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-white via-[#F0FBF9] to-[#DCF5F0] dark:from-zinc-900/80 dark:to-zinc-800/60 border border-[#8ED8CD] dark:border-zinc-800 shadow-sm glass transition-all hover:scale-[1.01]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-[#475569] dark:text-zinc-300">{t('Total Visitors', 'إجمالي الزوار')}</span>
            <div className="w-12 h-12 rounded-2xl bg-[#0F766E] text-white flex items-center justify-center shadow-inner">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl sm:text-5xl font-black text-[#0F766E] dark:text-teal-400">
              {stats.totalVisitors}
            </span>
            <span className="text-sm text-slate-500 dark:text-zinc-400 font-bold">{t('Persons / Visitors', 'شخص / زائر')}</span>
          </div>
          <div className="mt-4 text-xs text-slate-600 dark:text-zinc-400 border-t border-teal-200/70 dark:border-zinc-700/60 pt-2.5 flex items-center justify-between font-medium">
            <span>{t('Delegations & Individuals', 'شامل الوفود والأفراد')}</span>
            <span className="text-[#0F766E] dark:text-teal-400 font-bold">{t('+ Multiple Delegations', '+ وفود متعددة')}</span>
          </div>
        </div>

        {/* Card 3: Total Organizations */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-white via-[#F0F7FC] to-[#E0EEF8] dark:from-zinc-900/80 dark:to-zinc-800/60 border border-[#9BB8D3] dark:border-zinc-800 shadow-sm glass transition-all hover:scale-[1.01]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-[#475569] dark:text-zinc-300">{t('Organizations & Companies', 'المؤسسات والشركات')}</span>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#173B63] to-[#0F766E] text-white flex items-center justify-center shadow-inner">
              <Building2 className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl sm:text-5xl font-black text-[#173B63] dark:text-white">
              {stats.totalOrganizations}
            </span>
            <span className="text-sm text-slate-500 dark:text-zinc-400 font-bold">{t('Organizations', 'مؤسسة مستقلة')}</span>
          </div>
          <div className="mt-4 text-xs text-slate-600 dark:text-zinc-400 border-t border-slate-200/70 dark:border-zinc-700/60 pt-2.5 flex items-center justify-between font-medium">
            <span>{t('Government & Private', 'جهات حكومية وخاصة')}</span>
            <span className="text-blue-600 dark:text-blue-400 font-bold">{t('Diverse Partners', 'تنوع الشركاء')}</span>
          </div>
        </div>

        {/* Card 4: Average Visitors per Visit */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-white via-[#F0FBF9] to-[#DCF5F0] dark:from-zinc-900/80 dark:to-zinc-800/60 border border-[#8ED8CD] dark:border-zinc-800 shadow-sm glass transition-all hover:scale-[1.01]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-[#475569] dark:text-zinc-300">{t('Avg Visitors / Visit', 'متوسط الزوار لكل زيارة')}</span>
            <div className="w-12 h-12 rounded-2xl bg-[#14B8A6] text-white flex items-center justify-center shadow-inner">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl sm:text-5xl font-black text-[#0F766E] dark:text-teal-400">
              {stats.averageVisitors}
            </span>
            <span className="text-sm text-slate-500 dark:text-zinc-400 font-bold">{t('Visitors / Visit', 'زائر / زيارة')}</span>
          </div>
          <div className="mt-4 text-xs text-slate-600 dark:text-zinc-400 border-t border-teal-200/70 dark:border-zinc-700/60 pt-2.5 flex items-center justify-between font-medium">
            <span>{t('Average Delegation Size', 'معدل حجم الوفود')}</span>
            <span className="text-[#0F766E] dark:text-teal-400 font-bold">{t('Key Metric', 'مؤشر دقيق')}</span>
          </div>
        </div>

      </div>

      {/* 4. Search and Filter Bar */}
      <div className="bg-white dark:bg-zinc-900/60 p-5 rounded-3xl border border-border shadow-sm glass space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
          
          {/* Search Input */}
          <div className="md:col-span-4 relative">
            <Search className="w-5 h-5 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={t('Search by visitor name, organization, visit #, coordination agency...', 'بحث باسم الزائر، المؤسسة، رقم الزيارة، جهة التنسيق...')}
              className="w-full pr-12 pl-4 py-3 rounded-2xl border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/80 text-foreground placeholder:text-slate-400 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
            />
          </div>

          {/* Coordination by Sister Company filter */}
          <div className="md:col-span-2">
            <select
              value={selectedCoordination}
              onChange={e => setSelectedCoordination(e.target.value)}
              className="w-full px-3 py-3 rounded-2xl border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/80 text-foreground text-sm sm:text-base font-bold focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
            >
              <option value="all">{t('All Coordination Agencies', 'كل جهات التنسيق')}</option>
              <option value="Ectron">Ectron</option>
              <option value="NEC">NEC</option>
              <option value="AAMU">AAMU</option>
              <option value="Tadoom">Tadoom</option>
              <option value="TadoomX">TadoomX</option>
              <option value="Other">{t('Other', 'أخرى')}</option>
            </select>
          </div>

          {/* Source filter */}
          <div className="md:col-span-2">
            <select
              value={selectedSource}
              onChange={e => setSelectedSource(e.target.value)}
              className="w-full px-3 py-3 rounded-2xl border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/80 text-foreground text-sm sm:text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
            >
              <option value="all">{t('All Sources', 'كل المصادر')}</option>
              <option value="public">{t('Public QR', 'ذاتي QR')}</option>
              <option value="internal">{t('Internal', 'داخلي')}</option>
              <option value="import">{t('Imported', 'مستورد')}</option>
            </select>
          </div>

          {/* Country filter */}
          <div className="md:col-span-2">
            <select
              value={selectedCountry}
              onChange={e => setSelectedCountry(e.target.value)}
              className="w-full px-3 py-3 rounded-2xl border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/80 text-foreground text-sm sm:text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
            >
              <option value="all">{t('All Countries', 'كل الدول')}</option>
              {availableCountries.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Clear filters button */}
          <div className="md:col-span-2 flex items-center">
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedCoordination('all');
                setSelectedSource('all');
                setSelectedCountry('all');
                setSelectedMonth(0);
                setDateFrom('');
                setDateTo('');
              }}
              className="w-full py-3 rounded-2xl border border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-sm font-bold text-slate-700 dark:text-zinc-200 transition-colors flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-4 h-4" />
              <span>{t('Reset', 'إعادة ضبط')}</span>
            </button>
          </div>

        </div>
      </div>

      {/* 5. Visits List Table */}
      <div className="bg-white dark:bg-zinc-900/60 rounded-3xl border border-border shadow-sm overflow-hidden glass">
        <div className="p-5 sm:p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg sm:text-xl font-extrabold text-[#173B63] dark:text-white">
              {t('Visits Log', 'سجل الزيارات')}
            </h2>
            <span className="text-sm px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/40 text-[#0F766E] dark:text-teal-400 font-extrabold border border-teal-200 dark:border-teal-800">
              {filteredVisits.length} {t('Visits', 'زيارة')}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-base border-collapse">
            <thead>
              <tr className="bg-slate-50/90 dark:bg-zinc-800/70 border-b border-border text-slate-700 dark:text-zinc-200 font-bold text-sm sm:text-base">
                <th className="py-4 px-4">{t('Visit #', 'رقم الزيارة')}</th>
                <th className="py-4 px-4">{t('Date', 'التاريخ')}</th>
                <th className="py-4 px-4">{t('Time In / Out', 'الدخول / الخروج')}</th>
                <th className="py-4 px-4">{t('Organization / Company', 'المؤسسة / الشركة')}</th>
                <th className="py-4 px-4">{t('Country', 'الدولة')}</th>
                <th className="py-4 px-4">{t('Coordination by', 'عن طريق')}</th>
                <th className="py-4 px-4">{t('Visitors', 'الزوار')}</th>
                <th className="py-4 px-4">{t('Visit Reason', 'سبب الزيارة')}</th>
                <th className="py-4 px-4 text-center">{t('Source', 'المصدر')}</th>
                <th className="py-4 px-4 text-center">{t('Actions', 'الإجراءات')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredVisits.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-14 text-center text-slate-400 dark:text-zinc-500 text-base">
                    {t('No visits found matching the current search criteria', 'لا توجد زيارات مطابقة لمعايير البحث الحالية')}
                  </td>
                </tr>
              ) : (
                filteredVisits.map((visit) => {
                  const visitorsList = visit.visitors || [];
                  const orgGroups = extractOrganizationGroups(visit);
                  const visitorNames = visitorsList
                    .map(v => v.full_name_ar || v.full_name_en)
                    .filter(Boolean)
                    .join('، ');

                  return (
                    <tr
                      key={visit.id}
                      onDoubleClick={() => handleOpenVisitModal(visit, false)}
                      className="hover:bg-teal-50/50 dark:hover:bg-zinc-800/60 transition-colors group cursor-pointer select-none"
                      title={t('Double-click to view and edit full details', 'انقر نقراً مزدوجاً لعرض وتعديل كامل البيانات')}
                    >
                      {/* Visit Number */}
                      <td className="py-4 px-4 font-mono font-extrabold text-base text-[#173B63] dark:text-teal-400 whitespace-nowrap">
                        {visit.visit_number}
                      </td>

                      {/* Date */}
                      <td className="py-4 px-4 text-slate-800 dark:text-zinc-200 font-medium whitespace-nowrap text-base">
                        {visit.visit_date}
                      </td>

                      {/* Time In / Out */}
                      <td className="py-4 px-4 text-slate-700 dark:text-zinc-300 whitespace-nowrap">
                        <div className="flex items-center gap-2 font-mono text-sm sm:text-base">
                          <span className="text-[#0F766E] dark:text-teal-400 font-bold">{visit.time_in}</span>
                          <span className="text-slate-400 font-bold">→</span>
                          {visit.time_out ? (
                            <span className="text-slate-800 dark:text-zinc-200 font-bold">{visit.time_out}</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenTimeOut(visit)}
                              className="text-xs sm:text-sm px-3 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900 font-bold transition-colors"
                              title={t('Record check-out time now', 'تسجيل وقت الخروج الآن')}
                            >
                              {t('Check Out', 'تسجيل الخروج')}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Organization */}
                      <td className="py-4 px-4 font-bold text-slate-900 dark:text-zinc-100 max-w-[240px]">
                        {orgGroups.length > 1 ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              {t('Joint Delegation', 'وفد مشترك')} ({orgGroups.length} {t('orgs', 'مؤسسات')})
                            </span>
                            <div className="space-y-0.5 mt-0.5">
                              {orgGroups.map((og, idx) => (
                                <div key={idx} className="text-sm font-extrabold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5 truncate">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#0F766E] flex-shrink-0"></span>
                                  <span className="truncate">{og.organization_ar || og.organization_en}</span>
                                  <span className="text-xs text-slate-400 font-bold flex-shrink-0">({og.visitors?.length || 0})</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="truncate text-base">{visit.organization_ar || visit.organization_en || '—'}</div>
                            {visit.organization_ar && visit.organization_en && (
                              <div className="text-xs sm:text-sm text-slate-500 font-normal truncate mt-0.5">{visit.organization_en}</div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Country */}
                      <td className="py-4 px-4 text-slate-700 dark:text-zinc-300 font-medium whitespace-nowrap text-base">
                        {visit.country || 'Oman'}
                      </td>

                      {/* Coordination By */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {renderCoordinationBadge(visit.coordination_by)}
                      </td>

                      {/* Visitors Badge & Preview */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1 max-w-[200px]">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-950/40 text-[#0F766E] dark:text-teal-400 text-xs sm:text-sm font-extrabold border border-teal-200 dark:border-teal-800 whitespace-nowrap">
                              {visitorsList.length || 1} {t('Visitors', 'زائر')}
                            </span>
                            {orgGroups.length > 1 && (
                              <span className="text-xs font-bold text-slate-400 dark:text-zinc-500 whitespace-nowrap">
                                {t('Across', 'عبر')} {orgGroups.length} {t('entities', 'جهات')}
                              </span>
                            )}
                          </div>
                          {orgGroups.length > 1 ? (
                            <div className="text-xs text-slate-600 dark:text-zinc-300 truncate font-medium" title={orgGroups.map(og => `${og.organization_ar || og.organization_en || t('Organization', 'مؤسسة')}: ${(og.visitors || []).map(v => v.full_name_ar || v.full_name_en).join(', ')}`).join(' | ')}>
                              {orgGroups.map(og => `${og.organization_ar || og.organization_en || t('Organization', 'مؤسسة')} (${og.visitors?.length || 0})`).join(' • ')}
                            </div>
                          ) : (
                            <span className="text-sm sm:text-base font-medium text-slate-700 dark:text-zinc-200 truncate" title={visitorNames}>
                              {visitorNames || '—'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Reason */}
                      <td className="py-4 px-4 text-slate-700 dark:text-zinc-300 font-medium max-w-[160px] truncate text-base">
                        {visit.visit_reason || '—'}
                      </td>

                      {/* Source */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold ${
                          visit.registration_source === 'public'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
                            : visit.registration_source === 'internal'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                            : 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
                        }`}>
                          {visit.registration_source === 'public'
                            ? t('Public (QR)', 'ذاتي (Public)')
                            : visit.registration_source === 'internal'
                            ? t('Internal', 'داخلي (Internal)')
                            : t('Imported (Excel)', 'إكسل (Import)')}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          {/* View Details */}
                          <button
                            type="button"
                            onClick={() => handleOpenVisitModal(visit, false)}
                            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 hover:text-[#0F766E] transition-colors cursor-pointer"
                            title={t('View Full Details', 'عرض التفاصيل الكاملة')}
                          >
                            <Eye className="w-5 h-5" />
                          </button>

                          {/* Edit Visit */}
                          <button
                            type="button"
                            onClick={() => handleOpenVisitModal(visit, true)}
                            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 hover:text-blue-600 transition-colors cursor-pointer"
                            title={t('Edit Visit', 'تعديل الزيارة')}
                          >
                            <Edit3 className="w-5 h-5" />
                          </button>

                          {/* Quick Time Out */}
                          <button
                            type="button"
                            onClick={() => handleOpenTimeOut(visit)}
                            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 hover:text-amber-600 transition-colors"
                            title={t('Record/Update Time Out', 'تسجيل/تحديث وقت الخروج')}
                          >
                            <Clock className="w-5 h-5" />
                          </button>

                          {/* Delete Visit */}
                          <button
                            type="button"
                            onClick={() => setDeleteConfirm({ isOpen: true, visitId: visit.id, visitNumber: visit.visit_number })}
                            className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-400 hover:text-red-600 transition-colors"
                            title={t('Delete Visit', 'حذف الزيارة')}
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
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

      {/* MODAL 1: Unified View & Edit Visit Modal */}
      {selectedVisitModal && (() => {
        const detailsOrgGroups = selectedVisitModal.organizations && selectedVisitModal.organizations.length > 0
          ? selectedVisitModal.organizations
          : extractOrganizationGroups(selectedVisitModal);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-4xl w-full p-6 sm:p-8 border border-border shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
              
              {/* Header Bar */}
              <div className="flex items-start justify-between gap-4 mb-6 pb-4 border-b border-border">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#173B63] to-[#0F766E] flex items-center justify-center text-white shadow-md flex-shrink-0">
                    <Building2 className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-mono font-bold text-[#0F766E] dark:text-teal-400">
                        {selectedVisitModal.visit_number}
                      </span>
                      {detailsOrgGroups.length > 1 && (
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          {t('Joint Delegation', 'وفد مشترك')} ({detailsOrgGroups.length} {t('orgs', 'مؤسسات')})
                        </span>
                      )}
                      {isEditMode && (
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          {t('Edit Mode', 'وضع التعديل')}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl sm:text-2xl font-extrabold text-[#173B63] dark:text-white mt-1">
                      {isEditMode
                        ? `${t('Edit Visit Details', 'تعديل بيانات الزيارة')} (${selectedVisitModal.visit_number})`
                        : (selectedVisitModal.organization_ar || selectedVisitModal.organization_en || t('Visit Details', 'تفاصيل الزيارة'))
                      }
                    </h3>
                  </div>
                </div>

                {/* Top Corner Action Controls */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedVisitModal(null);
                      setIsEditMode(false);
                    }}
                    className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition-colors"
                    title={t('Close', 'إغلاق')}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Success Notification Inside Modal */}
              {successToast && (
                <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <span className="text-sm font-bold">{successToast}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSuccessToast(null)}
                    className="p-1 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Error Notification Inside Modal */}
              {errorToast && (
                <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-3">
                    <X className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                    <span className="text-sm font-bold">{errorToast}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setErrorToast(null)}
                    className="p-1 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* VIEW MODE */}
              {!isEditMode && (
                <div className="space-y-6">
                  {/* General Info Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 bg-slate-50 dark:bg-zinc-800/60 p-5 rounded-2xl border border-border text-base">
                    <div>
                      <span className="block text-slate-400 font-semibold mb-1 text-sm">{t('Visit Date', 'تاريخ الزيارة')}</span>
                      <span className="font-bold text-base text-slate-800 dark:text-zinc-100">{selectedVisitModal.visit_date}</span>
                    </div>
                    <div>
                      <span className="block text-slate-400 font-semibold mb-1 text-sm">{t('Time In', 'وقت الدخول')}</span>
                      <span className="font-extrabold text-base text-[#0F766E] dark:text-teal-400 font-mono">{selectedVisitModal.time_in}</span>
                    </div>
                    <div>
                      <span className="block text-slate-400 font-semibold mb-1 text-sm">{t('Time Out', 'وقت الخروج')}</span>
                      <span className="font-bold text-base text-slate-800 dark:text-zinc-100 font-mono">{selectedVisitModal.time_out || t('Not recorded yet', 'لم يسجل بعد')}</span>
                    </div>
                    <div>
                      <span className="block text-slate-400 font-semibold mb-1 text-sm">{t('Country', 'الدولة')}</span>
                      <span className="font-bold text-base text-slate-800 dark:text-zinc-100">{selectedVisitModal.country || 'Oman'}</span>
                    </div>
                    <div>
                      <span className="block text-slate-400 font-semibold mb-1 text-sm">{t('Coordination by', 'عن طريق')}</span>
                      <div>{renderCoordinationBadge(selectedVisitModal.coordination_by)}</div>
                    </div>
                    <div>
                      <span className="block text-slate-400 font-semibold mb-1 text-sm">{t('Registration Source', 'مصدر التسجيل')}</span>
                      <span className="font-bold text-base capitalize text-slate-800 dark:text-zinc-100">{selectedVisitModal.registration_source}</span>
                    </div>
                    <div className="col-span-2 sm:col-span-3">
                      <span className="block text-slate-400 font-semibold mb-1 text-sm">{t('Visit Reason', 'سبب الزيارة')}</span>
                      <span className="font-bold text-base text-slate-800 dark:text-zinc-100">{selectedVisitModal.visit_reason || '—'}</span>
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedVisitModal.notes && (
                    <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/50 text-sm">
                      <span className="font-bold text-amber-800 dark:text-amber-300 block mb-1">{t('Visit Notes:', 'ملاحظات الزيارة:')}</span>
                      <p className="text-slate-800 dark:text-zinc-200 leading-relaxed font-medium">{selectedVisitModal.notes}</p>
                    </div>
                  )}

                  {/* Organizations & Associated Visitors */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-extrabold text-[#173B63] dark:text-white flex items-center gap-2">
                        <Users className="w-5 h-5 text-[#0F766E]" />
                        <span>{t('Participating Organizations & Visitors', 'المؤسسات والزوار المشاركون')} ({selectedVisitModal.visitors?.length || 0} {t('visitors', 'زائر')})</span>
                      </h4>
                      {detailsOrgGroups.length > 1 && (
                        <span className="text-xs px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/40 text-[#0F766E] dark:text-teal-400 border border-teal-200 dark:border-teal-800 font-extrabold">
                          {detailsOrgGroups.length} {t('participating organizations', 'مؤسسات مشاركة')}
                        </span>
                      )}
                    </div>

                    {detailsOrgGroups.map((org, oIdx) => (
                      <div key={oIdx} className="border border-border rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-zinc-800/40 shadow-sm">
                        {/* Organization sub-header */}
                        <div className="p-3.5 bg-gradient-to-r from-[#F0F7FC] to-[#F0FBF9] dark:from-zinc-800 dark:to-zinc-800/80 border-b border-border flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-900/40 text-[#0F766E] dark:text-teal-400 flex items-center justify-center font-bold text-sm">
                              {oIdx + 1}
                            </div>
                            <div>
                              <span className="text-base font-extrabold text-[#173B63] dark:text-white">
                                {org.organization_ar || org.organization_en || t('Organization / Entity', 'المؤسسة / الجهة')}
                              </span>
                              {org.organization_ar && org.organization_en && (
                                <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium mr-2">
                                  ({org.organization_en})
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs px-2.5 py-1 rounded-full bg-white dark:bg-zinc-700 text-[#0F766E] dark:text-teal-400 font-extrabold border border-teal-200/60 dark:border-teal-800 shadow-sm">
                            {org.visitors?.length || 0} {t('visitors', 'زائر')}
                          </span>
                        </div>

                        {/* Visitors table for this organization */}
                        <table className="w-full text-right text-sm">
                          <thead className="bg-white dark:bg-zinc-800/60 text-slate-600 dark:text-zinc-300 font-bold border-b border-border">
                            <tr>
                              <th className="py-2.5 px-3.5 w-12 text-center">#</th>
                              <th className="py-2.5 px-3.5">{t('Name (Arabic)', 'الاسم بالعربية')}</th>
                              <th className="py-2.5 px-3.5">{t('Name (English)', 'الاسم بالإنجليزية')}</th>
                              <th className="py-2.5 px-3.5">{t('Phone Number', 'رقم الهاتف')}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border bg-white dark:bg-zinc-900">
                            {(!org.visitors || org.visitors.length === 0) ? (
                              <tr>
                                <td colSpan={4} className="py-4 text-center text-slate-400 text-xs">{t('No visitors registered for this organization', 'لا يوجد زوار مسجلون لهذه المؤسسة')}</td>
                              </tr>
                            ) : (
                              org.visitors.map((vis, vIdx) => (
                                <tr key={vis.id || vIdx} className="hover:bg-slate-50 dark:hover:bg-zinc-800/40 font-medium">
                                  <td className="py-2.5 px-3.5 text-center font-bold text-slate-400">{vIdx + 1}</td>
                                  <td className="py-2.5 px-3.5 font-bold text-slate-900 dark:text-zinc-100">{vis.full_name_ar || '—'}</td>
                                  <td className="py-2.5 px-3.5 text-slate-700 dark:text-zinc-300">{vis.full_name_en || '—'}</td>
                                  <td className="py-2.5 px-3.5 font-mono text-slate-700 dark:text-zinc-300">
                                    {vis.phone_number ? (
                                      <a href={`tel:${vis.phone_number}`} className="text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 font-bold">
                                        <PhoneCall className="w-3.5 h-3.5" />
                                        <span>{vis.phone_number}</span>
                                      </a>
                                    ) : '—'}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>

                  {/* Bottom View Actions */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                    <button
                      type="button"
                      onClick={() => setIsEditMode(true)}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#173B63] to-[#0F766E] text-white text-sm font-bold shadow hover:opacity-95 flex items-center gap-2 transition-all"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>{t('Edit Visit', 'تعديل بيانات الزيارة')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedVisitModal(null);
                        setIsEditMode(false);
                      }}
                      className="px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 text-sm font-bold transition-colors"
                    >
                      {t('Close', 'إغلاق النافذة')}
                    </button>
                  </div>
                </div>
              )}

              {/* EDIT MODE */}
              {isEditMode && editForm && (() => {
                const currentOrgs = editForm.organizations && editForm.organizations.length > 0
                  ? editForm.organizations
                  : extractOrganizationGroups(editForm);

                return (
                  <form onSubmit={handleSaveModalEdit} className="space-y-6">
                    {/* General Visit Info */}
                    <div className="bg-slate-50/70 dark:bg-zinc-800/40 p-4 sm:p-5 rounded-2xl border border-border space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                        <div>
                          <label className="block text-xs sm:text-sm font-bold mb-1">{t('Visit Date', 'تاريخ الزيارة')}</label>
                          <input
                            type="date"
                            required
                            value={editForm.visit_date}
                            onChange={e => setEditForm({ ...editForm, visit_date: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-xs sm:text-sm font-bold mb-1">{t('Time In', 'وقت الدخول')}</label>
                          <input
                            type="time"
                            required
                            value={editForm.time_in}
                            onChange={e => setEditForm({ ...editForm, time_in: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm font-semibold font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs sm:text-sm font-bold mb-1">{t('Time Out', 'وقت الخروج')}</label>
                          <input
                            type="time"
                            value={editForm.time_out || ''}
                            onChange={e => setEditForm({ ...editForm, time_out: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm font-semibold font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs sm:text-sm font-bold mb-1.5">{t('Country', 'الدولة')}</label>
                          <input
                            type="text"
                            value={editForm.country || ''}
                            onChange={e => setEditForm({ ...editForm, country: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-xs sm:text-sm font-bold mb-1.5">{t('Coordination by', 'عن طريق')}</label>
                          <select
                            value={
                              sisterCompaniesList.includes(editForm.coordination_by || 'Ectron')
                                ? (editForm.coordination_by || 'Ectron')
                                : 'Other'
                            }
                            onChange={e => {
                              const val = e.target.value;
                              if (val === 'Other') {
                                setEditForm({ ...editForm, coordination_by: 'Other' });
                                if (!editCustomCoordination) setEditCustomCoordination(editForm.coordination_by || '');
                              } else {
                                setEditForm({ ...editForm, coordination_by: val });
                              }
                            }}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm font-bold"
                          >
                            <option value="Ectron">Ectron</option>
                            <option value="NEC">NEC</option>
                            <option value="AAMU">AAMU</option>
                            <option value="Tadoom">Tadoom</option>
                            <option value="TadoomX">TadoomX</option>
                            <option value="Other">{t('Other', 'أخرى (تحديد جهة التنسيق)')}</option>
                          </select>
                        </div>
                      </div>

                      {((editForm.coordination_by === 'Other') || (!sisterCompaniesList.includes(editForm.coordination_by || 'Ectron'))) && (
                        <div>
                          <label className="block text-xs sm:text-sm font-bold mb-1.5">{t('Specify Coordination Agency', 'تحديد جهة التنسيق')}</label>
                          <input
                            type="text"
                            value={editCustomCoordination || editForm.coordination_by || ''}
                            onChange={e => {
                              setEditCustomCoordination(e.target.value);
                              setEditForm({ ...editForm, coordination_by: e.target.value });
                            }}
                            placeholder={t('Type coordination agency name...', 'اكتب اسم جهة التنسيق...')}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm font-medium"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-xs sm:text-sm font-bold mb-1.5">{t('Visit Reason', 'سبب الزيارة')}</label>
                        <input
                          type="text"
                          value={editForm.visit_reason || ''}
                          onChange={e => setEditForm({ ...editForm, visit_reason: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-xs sm:text-sm font-bold mb-1.5">{t('Notes', 'ملاحظات')}</label>
                        <textarea
                          rows={2}
                          value={editForm.notes || ''}
                          onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm font-medium"
                        />
                      </div>
                    </div>

                    {/* Multi-Organizations Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-base sm:text-lg font-extrabold text-[#173B63] dark:text-white flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-[#0F766E]" />
                            <span>{t('Organizations & Visitors', 'المؤسسات والزوار التابعين لها')}</span>
                          </h4>
                          <p className="text-xs text-slate-500">{t('Edit names and visitors under each organization', 'يمكنك تعديل أسماء المؤسسات والزوار التابعين لكل مؤسسة')}</p>
                        </div>

                        <button
                          type="button"
                          onClick={handleAddOrgInEdit}
                          className="px-3.5 py-2 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-[#0F766E] dark:text-teal-400 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 text-xs sm:text-sm font-bold flex items-center gap-1.5"
                        >
                          <Plus className="w-4 h-4" />
                          <span>{t('Add Another Organization', 'إضافة مؤسسة أخرى')}</span>
                        </button>
                      </div>

                      {currentOrgs.map((org, oIdx) => (
                        <div key={oIdx} className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 shadow-sm space-y-4">
                          {/* Organization Header */}
                          <div className="flex items-center justify-between pb-3 border-b border-border">
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-lg bg-teal-100 dark:bg-teal-900/50 text-[#0F766E] dark:text-teal-400 font-extrabold text-xs flex items-center justify-center">
                                {oIdx + 1}
                              </span>
                              <span className="text-sm sm:text-base font-extrabold text-[#173B63] dark:text-white">
                                {t('Organization', 'المؤسسة رقم')} #{oIdx + 1}
                              </span>
                            </div>

                            {currentOrgs.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveOrgFromEdit(oIdx)}
                                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                                title={t('Delete this organization', 'حذف هذه المؤسسة')}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          {/* Organization Names */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div>
                              <label className="block text-xs font-bold mb-1 text-slate-600 dark:text-zinc-300">
                                {t('Organization Name (Arabic)', 'اسم المؤسسة بالعربية')}
                              </label>
                              <input
                                type="text"
                                value={org.organization_ar || ''}
                                onChange={e => handleUpdateOrgInEdit(oIdx, 'organization_ar', e.target.value)}
                                placeholder={t('e.g. Nama Supply', 'مثال: نماء لتزويد الكهرباء')}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-sm font-medium"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold mb-1 text-slate-600 dark:text-zinc-300">
                                {t('Organization Name (English)', 'اسم المؤسسة بالإنجليزية')}
                              </label>
                              <input
                                type="text"
                                value={org.organization_en || ''}
                                onChange={e => handleUpdateOrgInEdit(oIdx, 'organization_en', e.target.value)}
                                placeholder="e.g. Nama Supply"
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-sm font-medium"
                              />
                            </div>
                          </div>

                          {/* Visitors for this org */}
                          <div className="pt-2 border-t border-slate-100 dark:border-zinc-700/50 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-zinc-300">
                                {t('Visitors for this Organization', 'الزوار التابعين لهذه المؤسسة')} ({org.visitors?.length || 0})
                              </span>
                              <button
                                type="button"
                                onClick={() => handleAddVisitorToOrgInEdit(oIdx)}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold text-[#0F766E] dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40 border border-teal-200/60 dark:border-teal-800 flex items-center gap-1"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>{t('Add Visitor', 'إضافة زائر')}</span>
                              </button>
                            </div>

                            {(org.visitors || []).map((vis, vIdx) => (
                              <div key={vis.id || vIdx} className="p-3 rounded-xl bg-slate-50/80 dark:bg-zinc-800/90 border border-slate-200/80 dark:border-zinc-700/60 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                                <div className="sm:col-span-4">
                                  <input
                                    type="text"
                                    placeholder={t('Name in Arabic', 'الاسم بالعربية')}
                                    value={vis.full_name_ar || ''}
                                    onChange={e => handleUpdateVisitorInOrgInEdit(oIdx, vIdx, 'full_name_ar', e.target.value)}
                                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-bold"
                                  />
                                </div>
                                <div className="sm:col-span-4">
                                  <input
                                    type="text"
                                    placeholder={t('Name in English', 'Name in English')}
                                    value={vis.full_name_en || ''}
                                    onChange={e => handleUpdateVisitorInOrgInEdit(oIdx, vIdx, 'full_name_en', e.target.value)}
                                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-medium"
                                  />
                                </div>
                                <div className="sm:col-span-3">
                                  <input
                                    type="tel"
                                    placeholder={t('Phone Number', 'رقم الهاتف')}
                                    value={vis.phone_number || ''}
                                    onChange={e => handleUpdateVisitorInOrgInEdit(oIdx, vIdx, 'phone_number', e.target.value)}
                                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-mono font-medium"
                                  />
                                </div>
                                <div className="sm:col-span-1 flex justify-center">
                                  {(org.visitors || []).length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveVisitorFromOrgInEdit(oIdx, vIdx)}
                                      className="p-1 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                                      title={t('Delete this visitor', 'حذف هذا الزائر')}
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Bottom Edit Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                      <button
                        type="button"
                        onClick={() => {
                          setEditForm(JSON.parse(JSON.stringify(selectedVisitModal)));
                          setIsEditMode(false);
                        }}
                        className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 text-sm font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800"
                      >
                        {t('Cancel', 'إلغاء')}
                      </button>
                      <button
                        type="submit"
                        disabled={isUpdating}
                        className="px-7 py-2.5 rounded-xl bg-gradient-to-r from-[#173B63] to-[#0F766E] text-white text-sm font-bold shadow hover:opacity-95 disabled:opacity-50 flex items-center gap-2"
                      >
                        {isUpdating ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>{t('Saving...', 'جاري الحفظ...')}</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>{t('Save Changes', 'حفظ التعديلات')}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                );
              })()}

            </div>
          </div>
        );
      })()}

      {/* MODAL 2: Quick Time Out Modal */}
      {timeOutModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-sm w-full p-6 border border-border shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-[#0F766E] dark:text-teal-400 flex items-center justify-center mx-auto mb-3">
              <Clock className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-[#173B63] dark:text-white mb-1">
              {t('Record Time Out', 'تسجيل وقت المغادرة (Time Out)')}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {t('Enter visit departure time for visitors', 'أدخل وقت انتهاء الزيارة ومغادرة الزوار')}
            </p>

            <input
              type="time"
              value={timeOutModal.time}
              onChange={e => setTimeOutModal(prev => ({ ...prev, time: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-center font-mono font-bold text-lg mb-4 focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
            />

            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setTimeOutModal({ isOpen: false, visitId: '', time: '' })}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-zinc-700 text-xs font-semibold text-slate-600 dark:text-zinc-300"
              >
                {t('Cancel', 'إلغاء')}
              </button>
              <button
                type="button"
                disabled={isUpdating}
                onClick={handleSaveTimeOut}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-[#173B63] to-[#0F766E] text-white text-xs font-bold shadow hover:opacity-95 disabled:opacity-50"
              >
                {isUpdating ? t('Saving...', 'جاري الحفظ...') : t('Save Time Out', 'حفظ وقت الخروج')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Delete Confirmation */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-sm w-full p-6 border border-red-200 dark:border-red-900/50 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-red-600 mb-1">
              {t('Confirm Visit Deletion', 'تأكيد حذف الزيارة')}
            </h3>
            <p className="text-xs text-slate-600 dark:text-zinc-400 mb-4">
              {t('Are you sure you want to delete visit', 'هل أنت متأكد من رغبتك في حذف الزيارة رقم')} <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">{deleteConfirm.visitNumber}</span> {t('and all associated visitors? This action cannot be undone.', 'وجميع الزوار المرتبطين بها؟ هذا الإجراء لا يمكن التراجع عنه.')}
            </p>

            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm({ isOpen: false, visitId: '', visitNumber: '' })}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-zinc-700 text-xs font-semibold text-slate-600 dark:text-zinc-300"
              >
                {t('Cancel', 'إلغاء')}
              </button>
              <button
                type="button"
                disabled={isUpdating}
                onClick={handleConfirmDelete}
                className="px-6 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow disabled:opacity-50"
              >
                {isUpdating ? t('Deleting...', 'جاري الحذف...') : t('Yes, Delete Visit', 'نعم، حذف الزيارة')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification Floating Banner */}
      {successToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[70] bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-bold animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successToast}</span>
        </div>
      )}
      {errorToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[70] bg-red-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-bold animate-in fade-in slide-in-from-top-4">
          <X className="w-5 h-5 flex-shrink-0" />
          <span>{errorToast}</span>
        </div>
      )}

    </div>
  );
}
