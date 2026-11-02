'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  User, 
  Phone, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  AlertCircle,
  ArrowRight,
  RefreshCw,
  LayoutDashboard,
  ListFilter,
  UserCheck
} from 'lucide-react';
import { submitInternalRegistration } from '@/app/visitor/actions/visitorActions';
import { useLanguage } from '@/components/layout/LanguageProvider';

interface VisitorItemForm {
  id: string;
  full_name_en: string;
  full_name_ar: string;
  phone_number: string;
}

interface OrganizationFormItem {
  id: string;
  organization_en: string;
  organization_ar: string;
  visitors: VisitorItemForm[];
}

export default function InternalVisitorNewPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Success dialog state
  const [successDialog, setSuccessDialog] = useState<{
    isOpen: boolean;
    visitNumber: string;
    visitId: string;
  }>({
    isOpen: false,
    visitNumber: '',
    visitId: ''
  });

  // Current Muscat Time helper
  const getMuscatNow = () => {
    const now = new Date();
    const time = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Muscat',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(now);
    const date = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Muscat',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(now);
    return { date, time };
  };

  // Form Fields
  const [visitDate, setVisitDate] = useState<string>('');
  const [timeIn, setTimeIn] = useState<string>('');
  const [timeOut, setTimeOut] = useState<string>('');
  const [country, setCountry] = useState('Oman');
  const [coordinationBy, setCoordinationBy] = useState('Ectron');
  const [customCoordination, setCustomCoordination] = useState('');
  const [visitReason, setVisitReason] = useState('Business Meeting');
  const [customReason, setCustomReason] = useState('');
  const [notes, setNotes] = useState('');

  // Multi-Organization & Visitors state
  const [organizations, setOrganizations] = useState<OrganizationFormItem[]>([
    {
      id: 'org-1',
      organization_en: '',
      organization_ar: '',
      visitors: [
        { id: 'vis-1', full_name_en: '', full_name_ar: '', phone_number: '' }
      ]
    }
  ]);

  useEffect(() => {
    const { date, time } = getMuscatNow();
    setVisitDate(date);
    setTimeIn(time);
  }, []);

  const addOrganization = () => {
    setOrganizations(prev => [
      ...prev,
      {
        id: `org-${Date.now()}`,
        organization_en: '',
        organization_ar: '',
        visitors: [
          { id: `vis-${Date.now()}-1`, full_name_en: '', full_name_ar: '', phone_number: '' }
        ]
      }
    ]);
  };

  const removeOrganization = (orgId: string) => {
    if (organizations.length <= 1) return;
    setOrganizations(prev => prev.filter(o => o.id !== orgId));
  };

  const updateOrganizationName = (orgId: string, field: 'organization_en' | 'organization_ar', value: string) => {
    setOrganizations(prev =>
      prev.map(o => (o.id === orgId ? { ...o, [field]: value } : o))
    );
  };

  const addVisitorToOrg = (orgId: string) => {
    setOrganizations(prev =>
      prev.map(o => {
        if (o.id !== orgId) return o;
        return {
          ...o,
          visitors: [
            ...o.visitors,
            { id: `vis-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`, full_name_en: '', full_name_ar: '', phone_number: '' }
          ]
        };
      })
    );
  };

  const removeVisitorFromOrg = (orgId: string, visitorId: string) => {
    setOrganizations(prev =>
      prev.map(o => {
        if (o.id !== orgId) return o;
        if (o.visitors.length <= 1) return o;
        return {
          ...o,
          visitors: o.visitors.filter(v => v.id !== visitorId)
        };
      })
    );
  };

  const updateVisitorInOrg = (orgId: string, visitorId: string, field: keyof VisitorItemForm, value: string) => {
    setOrganizations(prev =>
      prev.map(o => {
        if (o.id !== orgId) return o;
        return {
          ...o,
          visitors: o.visitors.map(v => (v.id === visitorId ? { ...v, [field]: value } : v))
        };
      })
    );
  };

  const resetForm = () => {
    const { date, time } = getMuscatNow();
    setVisitDate(date);
    setTimeIn(time);
    setTimeOut('');
    setCountry('Oman');
    setCoordinationBy('Ectron');
    setCustomCoordination('');
    setVisitReason('Business Meeting');
    setCustomReason('');
    setNotes('');
    setOrganizations([
      {
        id: 'org-1',
        organization_en: '',
        organization_ar: '',
        visitors: [
          { id: 'vis-1', full_name_en: '', full_name_ar: '', phone_number: '' }
        ]
      }
    ]);
    setErrorMsg(null);
    setSuccessDialog({ isOpen: false, visitNumber: '', visitId: '' });
  };

  const totalVisitorsCount = organizations.reduce((acc, o) => acc + o.visitors.length, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMsg(null);

    // Validate Organizations & Visitors
    const validOrganizations = organizations.map(org => {
      const oEn = org.organization_en.trim();
      const oAr = org.organization_ar.trim();
      const validVisitors = org.visitors.filter(v => v.full_name_en.trim() || v.full_name_ar.trim());
      return {
        organization_en: oEn,
        organization_ar: oAr,
        visitors: validVisitors
      };
    }).filter(org => (org.organization_en || org.organization_ar) && org.visitors.length > 0);

    if (validOrganizations.length === 0) {
      setErrorMsg(t('Please enter at least one organization and one visitor.', 'يرجى إدخال اسم مؤسسة واحدة على الأقل وزائر واحد تابع لها.'));
      return;
    }

    const effectiveReason = visitReason === 'Other' ? customReason.trim() : visitReason;
    if (!effectiveReason) {
      setErrorMsg(t('Please specify the visit reason.', 'يرجى تحديد سبب الزيارة'));
      return;
    }

    const effectiveCoordination = coordinationBy === 'Other'
      ? (customCoordination.trim() || 'Other')
      : coordinationBy;

    setIsSubmitting(true);
    try {
      const res = await submitInternalRegistration({
        visit_date: visitDate,
        time_in: timeIn,
        time_out: timeOut ? timeOut : null,
        country: country,
        coordination_by: effectiveCoordination,
        visit_reason: effectiveReason,
        notes: notes,
        organizations: validOrganizations
      });

      if (res.success && res.visit_number) {
        setSuccessDialog({
          isOpen: true,
          visitNumber: res.visit_number,
          visitId: res.visit?.id || ''
        });
      } else {
        setErrorMsg(res.error || t('Failed to save visit data.', 'فشل في حفظ بيانات الزيارة'));
      }
    } catch (err: any) {
      setErrorMsg(err?.message || t('A connection error occurred.', 'حدث خطأ في الاتصال بالنظام'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const visitReasons = [
    { en: 'Business Meeting', ar: 'اجتماع عمل' },
    { en: 'Factory Tour', ar: 'جولة بالمصنع' },
    { en: 'Shipment / Delivery', ar: 'توريد / تسليم شحنة' },
    { en: 'Technical Support / Maintenance', ar: 'دعم فني / صيانة' },
    { en: 'Inspection & Audit', ar: 'تفتيش وتدقيق' },
    { en: 'Interview', ar: 'مقابلة توظيف' },
    { en: 'Other', ar: 'أخرى (تحديد)' },
  ];

  const coordinationOptions = [
    { value: 'Ectron', label: 'Ectron' },
    { value: 'NEC', label: 'NEC' },
    { value: 'AAMU', label: 'AAMU' },
    { value: 'Tadoom', label: 'Tadoom' },
    { value: 'TadoomX', label: 'TadoomX' },
    { value: 'Other', label: t('Other (Specify)', 'أخرى (تحديد جهة التنسيق)') },
  ];

  const countries = [
    { en: 'Oman', ar: 'سلطنة عُمان' },
    { en: 'United Arab Emirates', ar: 'الإمارات العربية المتحدة' },
    { en: 'Saudi Arabia', ar: 'المملكة العربية السعودية' },
    { en: 'Qatar', ar: 'قطر' },
    { en: 'Kuwait', ar: 'الكويت' },
    { en: 'Bahrain', ar: 'البحرين' },
    { en: 'China', ar: 'الصين' },
    { en: 'India', ar: 'الهند' },
    { en: 'United Kingdom', ar: 'المملكة المتحدة' },
    { en: 'Other', ar: 'دولة أخرى' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900/60 p-6 rounded-3xl border border-border shadow-sm glass">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#173B63] to-[#0F766E] flex items-center justify-center text-white shadow-sm">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#173B63] dark:text-white">{t('Register New Visit (Internal)', 'تسجيل زيارة جديدة (داخلية)')}</h1>
            <p className="text-sm text-slate-500 dark:text-zinc-400">
              {t('On-site visit registration by Ectron reception and security staff', 'تسجيل الزيارات الميدانية بواسطة موظفي الاستقبال والأمن بإلكترون')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/visitor/dashboard"
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>{t('Dashboard', 'لوحة التحكم')}</span>
          </Link>
          <Link
            href="/visitor/list"
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <ListFilter className="w-4 h-4" />
            <span>{t('Visits Log', 'سجل الزيارات')}</span>
          </Link>
        </div>
      </div>

      {/* Error alert */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-center gap-3 text-red-700 dark:text-red-300 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="flex-1">{errorMsg}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* 1. Date & Time Settings (Internal Specific) */}
        <div className="bg-white dark:bg-zinc-900/60 p-6 sm:p-8 rounded-3xl border border-border shadow-sm glass">
          <h2 className="text-lg sm:text-xl font-bold text-[#173B63] dark:text-white mb-5 pb-3 border-b border-border flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-[#0F766E] dark:text-teal-400" />
            <span>{t('Visit Date & Time', 'تاريخ وتوقيت الزيارة')}</span>
            <span className="text-xs sm:text-sm font-medium text-slate-500 mr-2">{t('(Past dates can be recorded for historical visits)', '(يمكن إدخال تواريخ سابقة للزيارات التاريخية)')}</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className="block text-sm sm:text-base font-bold text-slate-800 dark:text-zinc-200 mb-2">
                {t('Visit Date', 'تاريخ الزيارة (Visit Date)')}
              </label>
              <input
                type="date"
                required
                value={visitDate}
                onChange={e => setVisitDate(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-foreground text-base focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
              />
            </div>

            <div>
              <label className="block text-sm sm:text-base font-bold text-slate-800 dark:text-zinc-200 mb-2">
                {t('Time In', 'وقت الدخول (Time In)')}
              </label>
              <input
                type="time"
                required
                value={timeIn}
                onChange={e => setTimeIn(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-foreground text-base focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
              />
            </div>

            <div>
              <label className="block text-sm sm:text-base font-bold text-slate-800 dark:text-zinc-200 mb-2">
                {t('Time Out (Optional)', 'وقت الخروج (Time Out) - اختياري')}
              </label>
              <input
                type="time"
                value={timeOut}
                onChange={e => setTimeOut(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-foreground text-base focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
              />
            </div>
          </div>
        </div>

        {/* 2. Visit Details & Purpose */}
        <div className="bg-white dark:bg-zinc-900/60 p-6 sm:p-8 rounded-3xl border border-border shadow-sm glass">
          <h2 className="text-lg sm:text-xl font-bold text-[#173B63] dark:text-white mb-5 pb-3 border-b border-border flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-[#0F766E] dark:text-teal-400" />
            <span>{t('Visit Details & Purpose', 'بيانات وتفاصيل الزيارة')}</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-base sm:text-lg font-bold text-slate-800 dark:text-zinc-200 mb-2">
                {t('Country', 'الدولة (Country)')}
              </label>
              <select
                value={country}
                onChange={e => setCountry(e.target.value)}
                className="w-full px-4 py-3.5 rounded-2xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-foreground text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
              >
                {countries.map(c => (
                  <option key={c.en} value={c.en}>{t(c.en, `${c.ar} (${c.en})`)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-base sm:text-lg font-bold text-slate-800 dark:text-zinc-200 mb-2">
                {t('Coordination by', 'عن طريق (Coordination by)')}
              </label>
              <select
                value={coordinationBy}
                onChange={e => setCoordinationBy(e.target.value)}
                className="w-full px-4 py-3.5 rounded-2xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-foreground text-base sm:text-lg font-medium focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
              >
                {coordinationOptions.map(co => (
                  <option key={co.value} value={co.value}>{co.label}</option>
                ))}
              </select>
            </div>

            {coordinationBy === 'Other' && (
              <div className="md:col-span-2">
                <label className="block text-base sm:text-lg font-bold text-slate-800 dark:text-zinc-200 mb-2">
                  {t('Specify Coordination Party', 'تحديد جهة التنسيق (Specify Coordination Party)')}
                  <span className="text-red-500 mr-1">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customCoordination}
                  onChange={e => setCustomCoordination(e.target.value)}
                  placeholder={t('e.g. In coordination with company or specific person...', 'مثال: بالتنسيق مع شركة كذا أو شخص محدد...')}
                  className="w-full px-4 py-3.5 rounded-2xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-foreground text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
                />
              </div>
            )}

            <div className={coordinationBy === 'Other' ? 'md:col-span-2' : ''}>
              <label className="block text-base sm:text-lg font-bold text-slate-800 dark:text-zinc-200 mb-2">
                {t('Visit Reason', 'سبب الزيارة (Visit Reason)')}
              </label>
              <select
                value={visitReason}
                onChange={e => setVisitReason(e.target.value)}
                className="w-full px-4 py-3.5 rounded-2xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-foreground text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
              >
                {visitReasons.map(r => (
                  <option key={r.en} value={r.en}>{t(r.en, `${r.ar} - ${r.en}`)}</option>
                ))}
              </select>
            </div>

            {visitReason === 'Other' && (
              <div className="md:col-span-2">
                <label className="block text-base sm:text-lg font-bold text-slate-800 dark:text-zinc-200 mb-2">
                  {t('Specify Visit Reason', 'تحديد سبب الزيارة')}
                </label>
                <input
                  type="text"
                  required
                  value={customReason}
                  onChange={e => setCustomReason(e.target.value)}
                  placeholder={t('Detailed visit reason...', 'سبب الزيارة بالتفصيل...')}
                  className="w-full px-4 py-3.5 rounded-2xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-foreground text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
                />
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-sm sm:text-base font-bold text-slate-800 dark:text-zinc-200 mb-2">
                {t('Notes', 'ملاحظات (Notes)')}
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={t('Any additional notes...', 'أي ملاحظات إضافية...')}
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-foreground text-base focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
              />
            </div>
          </div>
        </div>

        {/* 3. Multi-Organization & Visitors Section */}
        <div className="bg-white dark:bg-zinc-900/60 p-6 sm:p-8 rounded-3xl border border-border shadow-sm glass">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-border">
            <h2 className="text-lg sm:text-xl font-bold text-[#173B63] dark:text-white flex items-center gap-2.5">
              <Building2 className="w-5 h-5 text-[#0F766E] dark:text-teal-400" />
              <span>{t('Participating Organizations & Visitors', 'المؤسسات والزوار المشاركون')}</span>
            </h2>

            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold px-3.5 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-800">
                {t('Organizations:', 'المؤسسات:')} {organizations.length}
              </span>
              <span className="text-sm font-extrabold px-3.5 py-1 bg-teal-50 dark:bg-teal-950/40 text-[#0F766E] dark:text-teal-400 rounded-full border border-teal-200 dark:border-teal-800">
                {t('Total Visitors:', 'إجمالي الزوار:')} {totalVisitorsCount}
              </span>
            </div>
          </div>

          <div className="space-y-6">
            {organizations.map((org, orgIndex) => (
              <div
                key={org.id}
                className="p-6 rounded-3xl bg-[#F8FAFC] dark:bg-zinc-800/40 border-2 border-slate-200 dark:border-zinc-700/80 shadow-sm relative transition-all"
              >
                {/* Organization Header */}
                <div className="flex items-center justify-between pb-3.5 mb-5 border-b border-slate-200 dark:border-zinc-700">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-[#173B63] text-white flex items-center justify-center font-bold text-sm">
                      {orgIndex + 1}
                    </span>
                    <div>
                      <h3 className="text-lg sm:text-xl font-extrabold text-[#173B63] dark:text-white">
                        {t('Organization', 'المؤسسة')} #{orgIndex + 1}
                        {org.organization_ar || org.organization_en ? ` (${org.organization_ar || org.organization_en})` : ''}
                      </h3>
                      <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                        {t('Number of visitors in this organization:', 'عدد الزوار في هذه المؤسسة:')} {org.visitors.length}
                      </span>
                    </div>
                  </div>

                  {organizations.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeOrganization(org.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs sm:text-sm font-bold transition-colors"
                      title={t('Delete Organization', 'حذف المؤسسة')}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>{t('Delete Organization', 'حذف المؤسسة')}</span>
                    </button>
                  )}
                </div>

                {/* Organization Names */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                  <div>
                    <label className="block text-sm sm:text-base font-bold text-slate-800 dark:text-zinc-200 mb-2">
                      {t('Organization / Company Name (English)', 'اسم المؤسسة / الشركة (بالإنجليزية)')}
                    </label>
                    <input
                      type="text"
                      required={!org.organization_ar}
                      value={org.organization_en}
                      onChange={e => updateOrganizationName(org.id, 'organization_en', e.target.value)}
                      placeholder="e.g. Nama Water, Siemens, Ministry..."
                      className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-foreground text-base focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm sm:text-base font-bold text-slate-800 dark:text-zinc-200 mb-2">
                      {t('Organization / Company Name (Arabic)', 'اسم المؤسسة / الشركة (بالعربية)')}
                    </label>
                    <input
                      type="text"
                      value={org.organization_ar}
                      onChange={e => updateOrganizationName(org.id, 'organization_ar', e.target.value)}
                      placeholder={t('e.g. Nama Supply, Ministry of Labour...', 'مثال: شركة نماء، وزارة العمل...')}
                      className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-foreground text-base focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
                    />
                  </div>
                </div>

                {/* Visitors Sub-section under this Organization */}
                <div className="bg-white dark:bg-zinc-900/80 p-5 rounded-2xl border border-slate-200 dark:border-zinc-700/60 shadow-inner">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-zinc-800">
                    <span className="text-sm sm:text-base font-bold text-[#0F766E] dark:text-teal-400 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>{t('Visitors of this Organization', 'الزوار التابعون لهذه المؤسسة')}</span>
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-950/40 text-[#0F766E] dark:text-teal-400 font-bold border border-teal-200 dark:border-teal-800">
                      {org.visitors.length} {t('visitors', 'زوار')}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {org.visitors.map((visitor, vIndex) => (
                      <div
                        key={visitor.id}
                        className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/60 relative"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-zinc-700 text-[#173B63] dark:text-zinc-200">
                            {t('Visitor', 'الزائر')} #{vIndex + 1}
                          </span>

                          {org.visitors.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeVisitorFromOrg(org.id, visitor.id)}
                              className="text-red-500 hover:text-red-700 p-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>{t('Delete Visitor', 'حذف الزائر')}</span>
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                              {t('Full Name (English)', 'الاسم الكامل (بالإنجليزية)')}
                            </label>
                            <input
                              type="text"
                              value={visitor.full_name_en}
                              onChange={e => updateVisitorInOrg(org.id, visitor.id, 'full_name_en', e.target.value)}
                              placeholder="e.g. John Doe"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                              {t('Full Name (Arabic)', 'الاسم الكامل (بالعربية)')}
                            </label>
                            <input
                              type="text"
                              value={visitor.full_name_ar}
                              onChange={e => updateVisitorInOrg(org.id, visitor.id, 'full_name_ar', e.target.value)}
                              placeholder={t('e.g. Salim Khalfan', 'مثال: سالم بن خلفان المعمري')}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                              {t('Phone Number', 'رقم الهاتف')}
                            </label>
                            <input
                              type="tel"
                              value={visitor.phone_number}
                              onChange={e => updateVisitorInOrg(org.id, visitor.id, 'phone_number', e.target.value)}
                              placeholder="9xxxxxxx"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800 flex justify-end">
                    <button
                      type="button"
                      onClick={() => addVisitorToOrg(org.id)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-[#0F766E] dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 border border-teal-200 dark:border-teal-800 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{t('+ Add Visitor to this Organization', '+ إضافة زائر لهذه المؤسسة')}</span>
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>

          {/* Add Another Organization Button */}
          <div className="mt-6 pt-4 border-t border-border flex justify-start">
            <button
              type="button"
              onClick={addOrganization}
              className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl border-2 border-dashed border-[#173B63] dark:border-teal-500 text-[#173B63] dark:text-teal-300 bg-blue-50/70 dark:bg-zinc-800/80 hover:bg-blue-100/70 dark:hover:bg-zinc-800 text-base font-extrabold transition-all shadow-sm"
            >
              <Plus className="w-5 h-5 text-[#0F766E] dark:text-teal-400" />
              <span>{t('+ Add Another Organization to Same Visit', '+ إضافة مؤسسة أخرى في نفس الزيارة')}</span>
            </button>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-3">
          <button
            type="button"
            onClick={resetForm}
            className="px-6 py-3 rounded-2xl border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 text-base font-bold transition-colors"
          >
            {t('Clear & Reset', 'إلغاء وتفريغ')}
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-9 py-3.5 rounded-2xl bg-gradient-to-r from-[#173B63] to-[#0F766E] hover:from-[#132f4f] hover:to-[#0c5c56] text-white font-extrabold text-base shadow-md transition-all flex items-center gap-2.5 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>{t('Saving...', 'جاري الحفظ...')}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>{t('Confirm & Save Visit', 'حفظ وتأكيد الزيارة')}</span>
              </>
            )}
          </button>
        </div>

      </form>

      {/* Success Dialog */}
      {successDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 max-w-md w-full border border-teal-200 dark:border-teal-900 shadow-2xl text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#173B63] to-[#14B8A6]" />

            <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 text-[#0F766E] dark:text-teal-400 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <h3 className="text-xl font-bold text-[#173B63] dark:text-white mb-2">
              {t('Visit Registered Successfully!', 'تم تسجيل الزيارة بنجاح!')}
            </h3>
            <p className="text-sm text-slate-600 dark:text-zinc-300 mb-4">
              {t('Visit and visitor details were saved successfully under ID:', 'تم حفظ بيانات الزيارة والزوار بنجاح تحت المعرف:')}
            </p>

            <div className="py-2 px-4 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 font-mono font-bold text-lg mb-6 border border-teal-200 dark:border-teal-800">
              {successDialog.visitNumber}
            </div>

            <p className="text-xs text-slate-500 dark:text-zinc-400 mb-6 font-medium">
              {t('Would you like to register another visit?', 'هل ترغب في تسجيل زيارة أخرى؟')}
            </p>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="w-full py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>{t('Register Another Visit', 'تسجيل زيارة أخرى')}</span>
              </button>

              <button
                type="button"
                onClick={() => router.push('/visitor/dashboard')}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#173B63] to-[#0F766E] text-white text-sm font-bold shadow hover:opacity-95 transition-all flex items-center justify-center gap-2"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>{t('Go to Visits Dashboard', 'الانتقال للوحة الزيارات (Dashboard)')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
