'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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
  UserCheck,
  UserPlus,
  Users
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

function VisitorNewForm() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams?.get('type');

  // Mode: 'visitor' = Single Visitor, 'visit' = Full Delegation / Multi-Org Visit
  const [registrationType, setRegistrationType] = useState<'visitor' | 'visit'>(
    typeParam === 'visit' ? 'visit' : 'visitor'
  );

  useEffect(() => {
    if (typeParam === 'visit') {
      setRegistrationType('visit');
    } else if (typeParam === 'visitor') {
      setRegistrationType('visitor');
    }
  }, [typeParam]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Success dialog state
  const [successDialog, setSuccessDialog] = useState<{
    isOpen: boolean;
    visitNumber: string;
    visitId: string;
    visitorName: string;
  }>({
    isOpen: false,
    visitNumber: '',
    visitId: '',
    visitorName: ''
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

  // General Fields
  const [visitDate, setVisitDate] = useState<string>('');
  const [timeIn, setTimeIn] = useState<string>('');
  const [timeOut, setTimeOut] = useState<string>('');
  const [country, setCountry] = useState('Oman');
  const [coordinationBy, setCoordinationBy] = useState('Ectron');
  const [customCoordination, setCustomCoordination] = useState('');
  const [visitReason, setVisitReason] = useState('Business Meeting');
  const [customReason, setCustomReason] = useState('');
  const [notes, setNotes] = useState('');

  // Single Visitor Fields (Mode: 'visitor')
  const [singleNameAr, setSingleNameAr] = useState('');
  const [singleNameEn, setSingleNameEn] = useState('');
  const [singlePhone, setSinglePhone] = useState('');
  const [singleOrgAr, setSingleOrgAr] = useState('');
  const [singleOrgEn, setSingleOrgEn] = useState('');

  // Multi-Organization & Visitors state (Mode: 'visit')
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

    setSingleNameAr('');
    setSingleNameEn('');
    setSinglePhone('');
    setSingleOrgAr('');
    setSingleOrgEn('');

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
    setSuccessDialog({ isOpen: false, visitNumber: '', visitId: '', visitorName: '' });
  };

  const totalVisitorsCount = organizations.reduce((acc, o) => acc + o.visitors.length, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMsg(null);

    const effectiveReason = visitReason === 'Other' ? customReason.trim() : visitReason;
    if (!effectiveReason) {
      setErrorMsg(t('Please specify the visit reason.', 'يرجى تحديد سبب الزيارة'));
      return;
    }

    const effectiveCoordination = coordinationBy === 'Other'
      ? (customCoordination.trim() || 'Other')
      : coordinationBy;

    // Single Visitor Mode validation and payload
    if (registrationType === 'visitor') {
      const nameAr = singleNameAr.trim();
      const nameEn = singleNameEn.trim();
      const orgAr = singleOrgAr.trim();
      const orgEn = singleOrgEn.trim();

      if (!nameAr && !nameEn) {
        setErrorMsg(t('Please enter the visitor name.', 'يرجى إدخال اسم الزائر'));
        return;
      }
      if (!orgAr && !orgEn) {
        setErrorMsg(t('Please enter the organization / company name.', 'يرجى إدخال اسم المؤسسة أو جهة العمل'));
        return;
      }

      setIsSubmitting(true);
      try {
        const res = await submitInternalRegistration({
          visit_date: visitDate,
          time_in: timeIn,
          time_out: timeOut ? timeOut : null,
          country: country,
          coordination_by: effectiveCoordination,
          visit_reason: effectiveReason,
          notes: notes.trim(),
          organizations: [
            {
              organization_en: orgEn || orgAr,
              organization_ar: orgAr || orgEn,
              visitors: [
                {
                  full_name_ar: nameAr || nameEn,
                  full_name_en: nameEn || nameAr,
                  phone_number: singlePhone.trim()
                }
              ]
            }
          ]
        });

        if (res.success && res.visit_number) {
          setSuccessDialog({
            isOpen: true,
            visitNumber: res.visit_number,
            visitId: res.visit?.id || '',
            visitorName: nameAr || nameEn
          });
        } else {
          setErrorMsg(res.error || t('Failed to save visit data.', 'فشل في حفظ بيانات الزائر'));
        }
      } catch (err: any) {
        setErrorMsg(err?.message || t('A connection error occurred.', 'حدث خطأ في الاتصال بالنظام'));
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Full Visit Mode (Delegations / Multi-Org) validation and payload
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

    setIsSubmitting(true);
    try {
      const res = await submitInternalRegistration({
        visit_date: visitDate,
        time_in: timeIn,
        time_out: timeOut ? timeOut : null,
        country: country,
        coordination_by: effectiveCoordination,
        visit_reason: effectiveReason,
        notes: notes.trim(),
        organizations: validOrganizations
      });

      if (res.success && res.visit_number) {
        setSuccessDialog({
          isOpen: true,
          visitNumber: res.visit_number,
          visitId: res.visit?.id || '',
          visitorName: validOrganizations[0]?.visitors[0]?.full_name_ar || validOrganizations[0]?.visitors[0]?.full_name_en || ''
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
            <h1 className="text-2xl font-bold text-[#173B63] dark:text-white">
              {registrationType === 'visitor'
                ? t('Register New Visitor', 'إضافة زائر جديد (تسجيل مباشر)')
                : t('Register New Visit', 'إضافة زيارة جديدة (وفود ومؤسسات)')}
            </h1>
            <p className="text-sm text-slate-500 dark:text-zinc-400">
              {registrationType === 'visitor'
                ? t('Quick single visitor entry registration', 'تسجيل بيانات زائر فردي واحد بشكل سريع ومبسط داخل النظام')
                : t('Complete visit registration with multiple organizations and delegations', 'تسجيل وفد رسمي أو مؤسسات متعددة وزوار مشاركين')}
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

      {/* Mode Switcher Toggle Tabs */}
      <div className="flex p-1.5 bg-slate-100 dark:bg-zinc-800/80 rounded-2xl w-full max-w-lg mx-auto border border-slate-200 dark:border-zinc-700 shadow-inner">
        <button
          type="button"
          onClick={() => {
            setRegistrationType('visitor');
            setErrorMsg(null);
          }}
          className={`flex-1 py-3 px-4 rounded-xl text-sm sm:text-base font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            registrationType === 'visitor'
              ? 'bg-white dark:bg-zinc-900 text-[#0F766E] dark:text-teal-400 shadow-md scale-[1.02]'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
          }`}
        >
          <User className="w-5 h-5" />
          <span>{t('Add Visitor (Single)', 'إضافة زائر (زائر فردي)')}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setRegistrationType('visit');
            setErrorMsg(null);
          }}
          className={`flex-1 py-3 px-4 rounded-xl text-sm sm:text-base font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            registrationType === 'visit'
              ? 'bg-white dark:bg-zinc-900 text-[#173B63] dark:text-white shadow-md scale-[1.02]'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
          }`}
        >
          <Building2 className="w-5 h-5" />
          <span>{t('Add Visit (Delegations)', 'إضافة زيارة (وفود ومؤسسات)')}</span>
        </button>
      </div>

      {/* Error alert */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-center gap-3 text-red-700 dark:text-red-300 text-sm animate-in fade-in">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="flex-1">{errorMsg}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* 1. Date & Time Settings */}
        <div className="bg-white dark:bg-zinc-900/60 p-6 sm:p-8 rounded-3xl border border-border shadow-sm glass">
          <h2 className="text-lg sm:text-xl font-bold text-[#173B63] dark:text-white mb-5 pb-3 border-b border-border flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-[#0F766E] dark:text-teal-400" />
            <span>{t('Visit Date & Time', 'تاريخ وتوقيت الزيارة')}</span>
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
                  {t('Specify Visit Reason', 'تحديد سبب الزيارة (Specify Visit Reason)')}
                  <span className="text-red-500 mr-1">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customReason}
                  onChange={e => setCustomReason(e.target.value)}
                  placeholder={t('Type visit reason...', 'اكتب سبب الزيارة هنا...')}
                  className="w-full px-4 py-3.5 rounded-2xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-foreground text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
                />
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-sm sm:text-base font-bold text-slate-800 dark:text-zinc-200 mb-2">
                {t('Notes (Optional)', 'ملاحظات إضافية (اختياري)')}
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={t('Any special notes, meeting room or person to meet...', 'أي ملاحظات أو متطلبات خاصة بالزيارة أو الشخص المقابل...')}
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-foreground placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
              />
            </div>
          </div>
        </div>

        {/* 3. MODE: 'visitor' -> Single Visitor Form */}
        {registrationType === 'visitor' && (
          <div className="bg-white dark:bg-zinc-900/60 p-6 sm:p-8 rounded-3xl border border-border shadow-sm glass space-y-6">
            <h2 className="text-lg sm:text-xl font-bold text-[#0F766E] dark:text-teal-400 pb-3 border-b border-border flex items-center gap-2.5">
              <User className="w-5 h-5" />
              <span>{t('Visitor & Organization Information', 'بيانات الزائر والمؤسسة التابع لها')}</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Visitor Name (Arabic) */}
              <div>
                <label className="block text-sm sm:text-base font-bold text-slate-800 dark:text-zinc-200 mb-2">
                  {t('Visitor Name (Arabic)', 'اسم الزائر (بالعربية)')}
                  <span className="text-red-500 mr-1">*</span>
                </label>
                <input
                  type="text"
                  required={!singleNameEn}
                  value={singleNameAr}
                  onChange={e => setSingleNameAr(e.target.value)}
                  placeholder={t('e.g. Ahmed Al Saadi', 'مثال: أحمد بن علي السعدي')}
                  dir="rtl"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-foreground text-base focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
                />
              </div>

              {/* Visitor Name (English) */}
              <div>
                <label className="block text-sm sm:text-base font-bold text-slate-800 dark:text-zinc-200 mb-2">
                  {t('Visitor Name (English)', 'اسم الزائر (بالإنجليزية)')}
                </label>
                <input
                  type="text"
                  value={singleNameEn}
                  onChange={e => setSingleNameEn(e.target.value)}
                  placeholder="e.g. Ahmed Al Saadi"
                  dir="ltr"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-foreground text-base focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm sm:text-base font-bold text-slate-800 dark:text-zinc-200 mb-2">
                  {t('Phone Number', 'رقم الهاتف / النقال')}
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="tel"
                    value={singlePhone}
                    onChange={e => setSinglePhone(e.target.value)}
                    placeholder="+968 91234567"
                    dir="ltr"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-foreground text-base font-mono focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
                  />
                </div>
              </div>

              {/* Organization (Arabic) */}
              <div>
                <label className="block text-sm sm:text-base font-bold text-slate-800 dark:text-zinc-200 mb-2">
                  {t('Organization Name (Arabic)', 'اسم المؤسسة / الشركة (بالعربية)')}
                  <span className="text-red-500 mr-1">*</span>
                </label>
                <input
                  type="text"
                  required={!singleOrgEn}
                  value={singleOrgAr}
                  onChange={e => setSingleOrgAr(e.target.value)}
                  placeholder={t('e.g. Nama Supply', 'مثال: شركة نماء، وزارة العمل...')}
                  dir="rtl"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-foreground text-base focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
                />
              </div>

              {/* Organization (English) */}
              <div className="md:col-span-2">
                <label className="block text-sm sm:text-base font-bold text-slate-800 dark:text-zinc-200 mb-2">
                  {t('Organization Name (English)', 'اسم المؤسسة / الشركة (بالإنجليزية)')}
                </label>
                <input
                  type="text"
                  value={singleOrgEn}
                  onChange={e => setSingleOrgEn(e.target.value)}
                  placeholder="e.g. Nama Supply, Siemens..."
                  dir="ltr"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-foreground text-base focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
                />
              </div>
            </div>
          </div>
        )}

        {/* 4. MODE: 'visit' -> Multi-Organization Delegation Builder */}
        {registrationType === 'visit' && (
          <div className="bg-white dark:bg-zinc-900/60 p-6 sm:p-8 rounded-3xl border border-border shadow-sm glass space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-[#173B63] dark:text-white flex items-center gap-2.5">
                  <Building2 className="w-5 h-5 text-[#0F766E]" />
                  <span>{t('Participating Organizations & Visitors', 'المؤسسات المشاركة والزوار التابعين لها')}</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  {t('Add multiple organizations and individual visitors for joint delegations', 'يمكنك إضافة أكثر من مؤسسة وتسجيل زوار متعددين لكل مؤسسة')}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs sm:text-sm font-bold border border-blue-200 dark:border-blue-800/50">
                  {t('Organizations:', 'المؤسسات:')} {organizations.length}
                </span>
                <span className="px-3 py-1.5 rounded-full bg-teal-50 dark:bg-teal-950/40 text-[#0F766E] dark:text-teal-400 text-xs sm:text-sm font-bold border border-teal-200 dark:border-teal-800/50">
                  {t('Total Visitors:', 'إجمالي الزوار:')} {totalVisitorsCount}
                </span>
              </div>
            </div>

            {/* List of Organizations */}
            <div className="space-y-6">
              {organizations.map((org, orgIndex) => (
                <div
                  key={org.id}
                  className="p-5 sm:p-6 rounded-3xl bg-slate-50/70 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-700 space-y-5"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-xl bg-[#173B63] text-white flex items-center justify-center font-bold text-sm">
                        {orgIndex + 1}
                      </span>
                      <h3 className="text-base sm:text-lg font-bold text-[#173B63] dark:text-white">
                        {t('Organization', 'المؤسسة رقم')} #{orgIndex + 1}
                        {org.organization_ar || org.organization_en ? ` (${org.organization_ar || org.organization_en})` : ''}
                      </h3>
                    </div>

                    {organizations.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeOrganization(org.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-bold transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>{t('Remove Organization', 'حذف المؤسسة')}</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-zinc-200 mb-1">
                        {t('Organization Name (Arabic)', 'اسم المؤسسة (بالعربية)')}
                        <span className="text-red-500 mr-1">*</span>
                      </label>
                      <input
                        type="text"
                        required={!org.organization_en}
                        value={org.organization_ar}
                        onChange={e => updateOrganizationName(org.id, 'organization_ar', e.target.value)}
                        placeholder={t('e.g. Nama Supply', 'مثال: شركة نماء')}
                        dir="rtl"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-zinc-200 mb-1">
                        {t('Organization Name (English)', 'اسم المؤسسة (بالإنجليزية)')}
                      </label>
                      <input
                        type="text"
                        value={org.organization_en}
                        onChange={e => updateOrganizationName(org.id, 'organization_en', e.target.value)}
                        placeholder="e.g. Nama Supply"
                        dir="ltr"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
                      />
                    </div>
                  </div>

                  {/* Visitors for this Org */}
                  <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-zinc-700 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-border">
                      <span className="text-xs sm:text-sm font-bold text-[#0F766E] dark:text-teal-400">
                        {t('Visitors under this Organization', 'الزوار التابعين لهذه المؤسسة')} ({org.visitors.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => addVisitorToOrg(org.id)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#0F766E] dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 border border-teal-200 dark:border-teal-800 flex items-center gap-1.5 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{t('Add Visitor', 'إضافة زائر')}</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      {org.visitors.map((visitor, vIdx) => (
                        <div
                          key={visitor.id}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                        >
                          <div className="sm:col-span-4">
                            <input
                              type="text"
                              value={visitor.full_name_ar}
                              onChange={e => updateVisitorInOrg(org.id, visitor.id, 'full_name_ar', e.target.value)}
                              placeholder={t('Name in Arabic', 'الاسم بالعربية')}
                              dir="rtl"
                              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-bold"
                            />
                          </div>
                          <div className="sm:col-span-4">
                            <input
                              type="text"
                              value={visitor.full_name_en}
                              onChange={e => updateVisitorInOrg(org.id, visitor.id, 'full_name_en', e.target.value)}
                              placeholder={t('Name in English', 'الاسم بالإنجليزية')}
                              dir="ltr"
                              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-medium"
                            />
                          </div>
                          <div className="sm:col-span-3">
                            <input
                              type="tel"
                              value={visitor.phone_number}
                              onChange={e => updateVisitorInOrg(org.id, visitor.id, 'phone_number', e.target.value)}
                              placeholder={t('Phone', 'رقم الهاتف')}
                              dir="ltr"
                              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-mono font-medium"
                            />
                          </div>
                          <div className="sm:col-span-1 flex justify-center">
                            {org.visitors.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeVisitorFromOrg(org.id, visitor.id)}
                                className="p-1 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                                title={t('Remove', 'حذف')}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Another Organization Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={addOrganization}
                className="w-full py-3.5 rounded-2xl border-2 border-dashed border-[#173B63] dark:border-teal-500 text-[#173B63] dark:text-teal-300 bg-blue-50/60 dark:bg-zinc-800/80 hover:bg-blue-100 text-sm sm:text-base font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                <span>{t('+ Add Another Organization to Visit', '+ إضافة مؤسسة أخرى في نفس الزيارة')}</span>
              </button>
            </div>
          </div>
        )}

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-3">
          <Link
            href="/visitor/dashboard"
            className="px-6 py-3 rounded-2xl border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 text-sm font-bold transition-colors"
          >
            {t('Cancel', 'إلغاء')}
          </Link>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-3 rounded-2xl bg-gradient-to-r from-[#173B63] to-[#0F766E] hover:from-[#132f4f] hover:to-[#0c5c56] text-white font-extrabold text-sm sm:text-base shadow-lg hover:shadow-xl transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>{t('Saving...', 'جاري الحفظ...')}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>
                  {registrationType === 'visitor'
                    ? t('Register Single Visitor', 'تسجيل الزائر (حفظ)')
                    : t('Register Full Visit', 'تسجيل الزيارة بالكامل (حفظ)')}
                </span>
              </>
            )}
          </button>
        </div>

      </form>

      {/* Success Dialog */}
      {successDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 max-w-md w-full border border-teal-200 dark:border-teal-900 shadow-2xl text-center relative overflow-hidden">
            
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#173B63] via-[#0F766E] to-[#14B8A6]" />

            <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 text-[#0F766E] dark:text-teal-400 flex items-center justify-center mx-auto mb-4 shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <h3 className="text-2xl font-extrabold text-[#173B63] dark:text-white mb-2">
              {t('Registered Successfully!', 'تم التسجيل بنجاح!')}
            </h3>

            <p className="text-sm text-slate-600 dark:text-zinc-300 mb-6 font-medium">
              {registrationType === 'visitor'
                ? t(`Visitor ${successDialog.visitorName} has been successfully registered.`, `تم تسجيل بيانات الزائر ${successDialog.visitorName} بنجاح.`)
                : t('Visit and visitors have been saved successfully.', 'تم حفظ بيانات الزيارة والوفد المشارك بنجاح.')}
            </p>

            <div className="bg-slate-50 dark:bg-zinc-800/70 p-4 rounded-2xl mb-6 border border-border flex items-center justify-between">
              <div className="text-start">
                <span className="block text-xs text-slate-400 font-bold">{t('Visit ID', 'رقم الزيارة')}</span>
                <span className="font-mono font-extrabold text-xl text-[#0F766E] dark:text-teal-400">{successDialog.visitNumber}</span>
              </div>
              <div className="text-end">
                <span className="block text-xs text-slate-400 font-bold">{t('Visit Date', 'تاريخ الزيارة')}</span>
                <span className="font-mono font-bold text-sm text-slate-700 dark:text-zinc-200">{visitDate}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 text-sm font-bold transition-colors"
              >
                {registrationType === 'visitor' ? t('Add Another Visitor', 'تسجيل زائر آخر') : t('Add Another Visit', 'تسجيل زيارة أخرى')}
              </button>

              <button
                type="button"
                onClick={() => router.push('/visitor/dashboard')}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#173B63] to-[#0F766E] text-white text-sm font-bold shadow hover:opacity-95 transition-all flex items-center gap-1.5"
              >
                <span>{t('Go to Dashboard', 'الذهاب للوحة التحكم')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default function InternalVisitorNewPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center font-bold text-slate-500">Loading registration form...</div>}>
      <VisitorNewForm />
    </Suspense>
  );
}
