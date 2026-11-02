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
  Globe2, 
  ShieldCheck, 
  Calendar, 
  Clock, 
  FileText,
  AlertCircle,
  Sparkles,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { submitPublicRegistration } from '../actions/visitorActions';

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

export default function PublicVisitorRegisterPage() {
  const router = useRouter();
  const [lang, setLang] = useState<'ar' | 'en'>('en');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Success Dialog State
  const [successDialog, setSuccessDialog] = useState<{
    isOpen: boolean;
    visitNumber: string;
    visitDate: string;
    timeIn: string;
  }>({
    isOpen: false,
    visitNumber: '',
    visitDate: '',
    timeIn: ''
  });

  // Current Muscat Time
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDateStr, setCurrentDateStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Asia/Muscat',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }).format(now)
      );
      setCurrentDateStr(
        new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Muscat',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(now)
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // General Visit Form State
  const [country, setCountry] = useState('Oman');
  const [coordinationBy, setCoordinationBy] = useState('Ectron');
  const [customCoordination, setCustomCoordination] = useState('');
  const [visitReason, setVisitReason] = useState('Business Meeting');
  const [customReason, setCustomReason] = useState('');
  const [notes, setNotes] = useState('');
  const [honeypot, setHoneypot] = useState('');

  // Multi-Organization & Visitors State
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

  // Organization Management Handlers
  const addOrganization = () => {
    const newOrgId = `org-${Date.now()}`;
    setOrganizations(prev => [
      ...prev,
      {
        id: newOrgId,
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
    setSuccessDialog({ isOpen: false, visitNumber: '', visitDate: '', timeIn: '' });
  };

  const totalVisitorsCount = organizations.reduce((acc, o) => acc + o.visitors.length, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setErrorMsg(
        lang === 'ar'
          ? 'يرجى إدخال اسم مؤسسة واحدة على الأقل واسم زائر واحد تابع لها.'
          : 'Please enter at least one organization name and visitor name.'
      );
      return;
    }

    const effectiveReason = visitReason === 'Other' ? customReason.trim() : visitReason;
    if (!effectiveReason) {
      setErrorMsg(
        lang === 'ar' ? 'يرجى تحديد أو إدخال سبب الزيارة.' : 'Please specify the reason for the visit.'
      );
      return;
    }

    const effectiveCoordination = coordinationBy === 'Other'
      ? (customCoordination.trim() || (lang === 'ar' ? 'أخرى' : 'Other'))
      : coordinationBy;

    setIsSubmitting(true);
    try {
      const res = await submitPublicRegistration({
        country: country,
        coordination_by: effectiveCoordination,
        visit_reason: effectiveReason,
        notes: notes,
        honeypot: honeypot,
        organizations: validOrganizations
      });

      if (res.success && res.visit_number) {
        setSuccessDialog({
          isOpen: true,
          visitNumber: res.visit_number,
          visitDate: res.visit_date || currentDateStr,
          timeIn: res.time_in || currentTime
        });
      } else {
        setErrorMsg(res.error || (lang === 'ar' ? 'حدث خطأ أثناء حفظ الزيارة' : 'Failed to register visit'));
      }
    } catch (err: any) {
      setErrorMsg(err?.message || (lang === 'ar' ? 'تعذر الاتصال بالخادم' : 'Server connection failed'));
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
    { value: 'Ectron', labelEn: 'Ectron', labelAr: 'إلكترون (Ectron)' },
    { value: 'NEC', labelEn: 'NEC', labelAr: 'NEC' },
    { value: 'AAMU', labelEn: 'AAMU', labelAr: 'AAMU' },
    { value: 'Tadoom', labelEn: 'Tadoom', labelAr: 'تدوم (Tadoom)' },
    { value: 'TadoomX', labelEn: 'TadoomX', labelAr: 'تدوم إكس (TadoomX)' },
    { value: 'Other', labelEn: 'Other (Specify)', labelAr: 'أخرى (تحديد جهة التنسيق)' },
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

  const isRtl = lang === 'ar';

  return (
    <div className={`min-h-screen bg-gradient-to-br from-[#EBF2F7] via-[#F4F9FC] to-[#E0EEF8] dark:from-[#09090b] dark:via-[#121820] dark:to-[#0d1622] py-8 px-4 sm:px-6 lg:px-8 text-foreground transition-colors duration-300 ${isRtl ? 'rtl' : 'ltr'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Background Decorative Blobs */}
      <div className="fixed top-0 left-1/3 w-96 h-96 bg-[#14B8A6]/10 dark:bg-[#00a99d]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-[#173B63]/10 dark:bg-[#1b497f]/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-3xl mx-auto relative z-10">

        {/* Top Header Card */}
        <div className="bg-white/90 dark:bg-zinc-900/80 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-[#BDCEE0] dark:border-zinc-800 shadow-lg mb-6 glass">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            
            {/* ECTRON Brand */}
            <div className="flex items-center gap-3">
              <div className="flex items-baseline select-none tracking-tight">
                <span className="text-3xl font-extrabold text-[#173B63] dark:text-blue-400">ectr</span>
                <span className="relative inline-flex items-center justify-center mx-0.5">
                  <span className="w-4 h-4 rounded-full bg-[#14B8A6] dark:bg-[#00a99d] inline-block" />
                  <span className="w-2 h-2 rounded-full bg-[#173B63] dark:bg-blue-400 absolute -top-2.5 -right-0.5" />
                </span>
                <span className="text-3xl font-extrabold text-[#173B63] dark:text-blue-400">n</span>
              </div>
              <div className="h-8 w-px bg-slate-300 dark:bg-zinc-700 hidden sm:block mx-1" />
              <div>
                <span className="block text-xs uppercase tracking-widest text-[#0F766E] dark:text-[#00a99d] font-bold">
                  {lang === 'ar' ? 'مصنع إلكترون الذكي' : 'Smart Factory'}
                </span>
                <span className="text-xs text-slate-500 dark:text-zinc-400">
                  {lang === 'ar' ? 'نظام تسجيل الزوار' : 'Visitor Self-Registration'}
                </span>
              </div>
            </div>

            {/* Language Switcher */}
            <button
              type="button"
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#F0FDFA] hover:bg-[#CCFBF1] dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[#0F766E] dark:text-[#00a99d] border border-[#14B8A6]/40 text-sm font-semibold transition-all shadow-sm"
            >
              <Globe2 className="w-4 h-4" />
              <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-zinc-800 text-center sm:text-start">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#173B63] dark:text-white">
              {lang === 'ar' ? 'مرحباً بكم في إلكترون' : 'Welcome to ECTRON'}
            </h1>
            <p className="text-base sm:text-lg text-slate-600 dark:text-zinc-300 mt-2 font-medium">
              {lang === 'ar'
                ? 'يرجى تسجيل بيانات الزيارة لتسهيل إجراءات الدخول والترحيب بكم داخل المصنع.'
                : 'Please complete your visit details for seamless factory entry and reception.'}
            </p>
          </div>

          {/* Quick Date/Time Indicator */}
          <div className="mt-5 flex flex-wrap items-center gap-6 text-sm sm:text-base font-semibold text-[#0F766E] dark:text-teal-400 bg-teal-50/80 dark:bg-teal-950/40 px-5 py-3 rounded-2xl border border-teal-200/60 dark:border-teal-900/50">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              <span>{lang === 'ar' ? 'تاريخ اليوم:' : 'Date:'} {currentDateStr || '...'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              <span>{lang === 'ar' ? 'وقت الدخول التلقائي:' : 'Current Time In:'} {currentTime || '...'} (GMT+4)</span>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-center gap-3 text-red-700 dark:text-red-300 text-base font-semibold">
            <AlertCircle className="w-6 h-6 flex-shrink-0" />
            <p className="flex-1">{errorMsg}</p>
          </div>
        )}

        {/* Main Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Anti-spam honeypot (invisible to humans) */}
          <input
            type="text"
            name="company_website_url"
            value={honeypot}
            onChange={e => setHoneypot(e.target.value)}
            className="hidden"
            tabIndex={-1}
            autoComplete="off"
          />

          {/* 1. General Visit Information Card */}
          <div className="bg-white/90 dark:bg-zinc-900/80 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-[#BDCEE0] dark:border-zinc-800 shadow-lg glass">
            <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-slate-200 dark:border-zinc-800">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#173B63] to-[#0F766E] flex items-center justify-center text-white shadow-sm">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#173B63] dark:text-white">
                  {lang === 'ar' ? 'بيانات وتفاصيل الزيارة' : 'Visit Details'}
                </h2>
                <p className="text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
                  {lang === 'ar' ? 'المعلومات العامة حول الغرض والتنسيق والدولة' : 'General details regarding purpose, coordination and country'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Country */}
              <div>
                <label className="block text-base sm:text-lg font-bold text-[#173B63] dark:text-zinc-200 mb-2">
                  {lang === 'ar' ? 'الدولة' : 'Country'}
                </label>
                <select
                  value={country}
                  onChange={e => setCountry(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-2xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 text-foreground text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-[#14B8A6] focus:border-[#14B8A6] transition-all"
                >
                  {countries.map(c => (
                    <option key={c.en} value={c.en}>
                      {lang === 'ar' ? c.ar : c.en}
                    </option>
                  ))}
                </select>
              </div>

              {/* Coordination By (عن طريق) */}
              <div>
                <label className="block text-base sm:text-lg font-bold text-[#173B63] dark:text-zinc-200 mb-2">
                  {lang === 'ar' ? 'عن طريق (Coordination by)' : 'Coordination by'}
                </label>
                <select
                  value={coordinationBy}
                  onChange={e => setCoordinationBy(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-2xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 text-foreground text-base sm:text-lg font-medium focus:outline-none focus:ring-2 focus:ring-[#14B8A6] focus:border-[#14B8A6] transition-all"
                >
                  {coordinationOptions.map(co => (
                    <option key={co.value} value={co.value}>
                      {lang === 'ar' ? co.labelAr : co.labelEn}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Coordination if 'Other' selected */}
              {coordinationBy === 'Other' && (
                <div className="md:col-span-2">
                  <label className="block text-base sm:text-lg font-bold text-[#173B63] dark:text-zinc-200 mb-2">
                    {lang === 'ar' ? 'يرجى كتابة جهة التنسيق' : 'Specify Coordination Party'}
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customCoordination}
                    onChange={e => setCustomCoordination(e.target.value)}
                    placeholder={lang === 'ar' ? 'مثال: بالتنسيق مع شركة كذا أو شخص محدد...' : 'e.g. In coordination with XYZ Company...'}
                    className="w-full px-4 py-3.5 rounded-2xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 text-foreground text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-[#14B8A6] focus:border-[#14B8A6] transition-all"
                  />
                </div>
              )}

              {/* Visit Reason */}
              <div className={coordinationBy === 'Other' ? 'md:col-span-2' : ''}>
                <label className="block text-base sm:text-lg font-bold text-[#173B63] dark:text-zinc-200 mb-2">
                  {lang === 'ar' ? 'سبب الزيارة' : 'Visit Reason'}
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <select
                  value={visitReason}
                  onChange={e => setVisitReason(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-2xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 text-foreground text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-[#14B8A6] focus:border-[#14B8A6] transition-all"
                >
                  {visitReasons.map(r => (
                    <option key={r.en} value={r.en}>
                      {lang === 'ar' ? r.ar : r.en}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom reason if 'Other' selected */}
              {visitReason === 'Other' && (
                <div className="md:col-span-2">
                  <label className="block text-base sm:text-lg font-bold text-[#173B63] dark:text-zinc-200 mb-2">
                    {lang === 'ar' ? 'تحديد سبب الزيارة' : 'Specify Visit Reason'}
                  </label>
                  <input
                    type="text"
                    required
                    value={customReason}
                    onChange={e => setCustomReason(e.target.value)}
                    placeholder={lang === 'ar' ? 'اكتب سبب الزيارة هنا...' : 'Enter purpose of visit...'}
                    className="w-full px-4 py-3.5 rounded-2xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 text-foreground text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-[#14B8A6] focus:border-[#14B8A6] transition-all"
                  />
                </div>
              )}

              {/* Optional Notes */}
              <div className="md:col-span-2">
                <label className="block text-sm sm:text-base font-bold text-[#173B63] dark:text-zinc-200 mb-2">
                  {lang === 'ar' ? 'ملاحظات إضافية (اختياري)' : 'Additional Notes (Optional)'}
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder={lang === 'ar' ? 'أي تفاصيل أو متطلبات خاصة بالزيارة...' : 'Any special notes, meeting room or person to meet...'}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 text-foreground placeholder:text-slate-400 text-base focus:outline-none focus:ring-2 focus:ring-[#14B8A6] focus:border-[#14B8A6] transition-all"
                />
              </div>

            </div>
          </div>

          {/* 2. Organizations & Visitors Card (Multi-Organization support!) */}
          <div className="bg-white/90 dark:bg-zinc-900/80 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-[#BDCEE0] dark:border-zinc-800 shadow-lg glass">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-200 dark:border-zinc-800">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0F766E] to-[#14B8A6] flex items-center justify-center text-white shadow-sm">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-[#173B63] dark:text-white">
                    {lang === 'ar' ? 'المؤسسات والزوار المشاركون' : 'Participating Organizations & Visitors'}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
                    {lang === 'ar' 
                      ? 'يمكنك إضافة أكثر من مؤسسة في نفس الزيارة مع زوار كل مؤسسة'
                      : 'You can add multiple organizations and their respective visitors under this visit'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-sm font-bold border border-blue-200 dark:border-blue-800/50">
                  {lang === 'ar' ? `المؤسسات: ${organizations.length}` : `Orgs: ${organizations.length}`}
                </span>
                <span className="px-3 py-1.5 rounded-full bg-teal-50 dark:bg-teal-950/40 text-[#0F766E] dark:text-teal-400 text-sm font-bold border border-teal-200 dark:border-teal-800/50">
                  {lang === 'ar' ? `إجمالي الزوار: ${totalVisitorsCount}` : `Total Visitors: ${totalVisitorsCount}`}
                </span>
              </div>
            </div>

            {/* List of Organizations with their respective visitors */}
            <div className="space-y-6">
              {organizations.map((org, orgIndex) => (
                <div
                  key={org.id}
                  className="p-6 sm:p-7 rounded-3xl bg-[#F8FAFC] dark:bg-zinc-800/40 border-2 border-slate-200 dark:border-zinc-700/80 shadow-sm relative transition-all"
                >
                  {/* Organization Header */}
                  <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-200 dark:border-zinc-700">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-[#173B63] text-white flex items-center justify-center font-bold text-sm">
                        {orgIndex + 1}
                      </span>
                      <div>
                        <h3 className="text-lg sm:text-xl font-extrabold text-[#173B63] dark:text-white">
                          {lang === 'ar' ? `المؤسسة #${orgIndex + 1}` : `Organization #${orgIndex + 1}`}
                          {org.organization_ar || org.organization_en ? ` (${org.organization_ar || org.organization_en})` : ''}
                        </h3>
                        <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                          {lang === 'ar' ? `عدد الزوار في هذه المؤسسة: ${org.visitors.length}` : `Visitors in this org: ${org.visitors.length}`}
                        </span>
                      </div>
                    </div>

                    {organizations.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeOrganization(org.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs sm:text-sm font-bold transition-colors"
                        title={lang === 'ar' ? 'حذف هذه المؤسسة' : 'Remove organization'}
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>{lang === 'ar' ? 'حذف المؤسسة' : 'Remove Org'}</span>
                      </button>
                    )}
                  </div>

                  {/* Organization Names (EN / AR) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                    <div>
                      <label className="block text-sm sm:text-base font-bold text-[#173B63] dark:text-zinc-200 mb-2">
                        {lang === 'ar' ? 'اسم المؤسسة / الشركة (بالإنجليزية)' : 'Organization Name (English)'}
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <input
                        type="text"
                        required={!org.organization_ar}
                        value={org.organization_en}
                        onChange={e => updateOrganizationName(org.id, 'organization_en', e.target.value)}
                        placeholder="e.g. Nama Water Services, Siemens..."
                        dir="ltr"
                        className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-foreground text-base focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm sm:text-base font-bold text-[#173B63] dark:text-zinc-200 mb-2">
                        {lang === 'ar' ? 'اسم المؤسسة / الشركة (بالعربية)' : 'Organization Name (Arabic)'}
                      </label>
                      <input
                        type="text"
                        value={org.organization_ar}
                        onChange={e => updateOrganizationName(org.id, 'organization_ar', e.target.value)}
                        placeholder="مثال: شركة نماء، وزارة العمل..."
                        dir="rtl"
                        className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-foreground text-base focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
                      />
                    </div>
                  </div>

                  {/* Visitors sub-section under this Organization */}
                  <div className="bg-white dark:bg-zinc-900/80 p-5 rounded-2xl border border-slate-200 dark:border-zinc-700/60 shadow-inner">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-zinc-800">
                      <span className="text-sm sm:text-base font-bold text-[#0F766E] dark:text-teal-400 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {lang === 'ar' ? 'الزوار التابعون لهذه المؤسسة' : 'Visitors of this Organization'}
                      </span>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-950/40 text-[#0F766E] dark:text-teal-400 font-bold border border-teal-200 dark:border-teal-800">
                        {org.visitors.length} {lang === 'ar' ? 'زوار' : 'visitors'}
                      </span>
                    </div>

                    <div className="space-y-4">
                      {org.visitors.map((visitor, vIdx) => (
                        <div
                          key={visitor.id}
                          className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/60 relative"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-zinc-700 text-[#173B63] dark:text-zinc-200">
                              {lang === 'ar' ? `الزائر #${vIdx + 1}` : `Visitor #${vIdx + 1}`}
                            </span>
                            {org.visitors.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeVisitorFromOrg(org.id, visitor.id)}
                                className="text-red-500 hover:text-red-700 p-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>{lang === 'ar' ? 'حذف الزائر' : 'Remove'}</span>
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                                {lang === 'ar' ? 'الاسم (بالإنجليزية)' : 'Name (English)'}
                              </label>
                              <input
                                type="text"
                                value={visitor.full_name_en}
                                onChange={e => updateVisitorInOrg(org.id, visitor.id, 'full_name_en', e.target.value)}
                                placeholder="e.g. John Smith"
                                dir="ltr"
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                                {lang === 'ar' ? 'الاسم (بالعربية)' : 'Name (Arabic)'}
                              </label>
                              <input
                                type="text"
                                value={visitor.full_name_ar}
                                onChange={e => updateVisitorInOrg(org.id, visitor.id, 'full_name_ar', e.target.value)}
                                placeholder="مثال: أحمد بن علي السعدي"
                                dir="rtl"
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                                {lang === 'ar' ? 'رقم الهاتف' : 'Phone'}
                              </label>
                              <div className="relative">
                                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                  type="tel"
                                  value={visitor.phone_number}
                                  onChange={e => updateVisitorInOrg(org.id, visitor.id, 'phone_number', e.target.value)}
                                  placeholder="+968 91234567"
                                  dir="ltr"
                                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add Visitor to this Org */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800 flex justify-end">
                      <button
                        type="button"
                        onClick={() => addVisitorToOrg(org.id)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-[#0F766E] dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 border border-teal-200 dark:border-teal-800 transition-all"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{lang === 'ar' ? '+ إضافة زائر آخر لهذه المؤسسة' : '+ Add Visitor to this Organization'}</span>
                      </button>
                    </div>
                  </div>

                </div>
              ))}
            </div>

            {/* Add Another Organization Button */}
            <div className="mt-6 pt-5 border-t border-slate-200 dark:border-zinc-800 flex justify-center sm:justify-start">
              <button
                type="button"
                onClick={addOrganization}
                className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl border-2 border-dashed border-[#173B63] dark:border-teal-500 text-[#173B63] dark:text-teal-300 bg-blue-50/70 dark:bg-zinc-800/80 hover:bg-blue-100/70 dark:hover:bg-zinc-800 text-base font-extrabold transition-all shadow-sm hover:scale-[1.01]"
              >
                <Plus className="w-5 h-5 text-[#0F766E] dark:text-teal-400" />
                <span>{lang === 'ar' ? '+ إضافة مؤسسة أخرى في نفس الزيارة' : '+ Add Another Organization to Visit'}</span>
              </button>
            </div>
          </div>

          {/* Privacy Notice & Security Disclaimer */}
          <div className="p-5 rounded-2xl bg-slate-100/90 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 flex items-start gap-3.5 text-sm sm:text-base text-slate-600 dark:text-zinc-300">
            <ShieldCheck className="w-6 h-6 text-[#0F766E] dark:text-teal-400 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {lang === 'ar'
                ? 'إشعار الخصوصية: نحافظ على خصوصية بياناتك وتستخدم حصراً لتنظيم الدخول والأمان وتوثيق الزيارات داخل مصنع إلكترون وفق معايير الأمان والسلامة المهنية.'
                : 'Privacy Notice: Your information is collected strictly for security protocols, reception verification, and occupational safety records at ECTRON Smart Factory.'}
            </p>
          </div>

          {/* Submit Action */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3">
            <div className="text-sm text-slate-500 dark:text-zinc-400 font-medium">
              {lang === 'ar'
                ? '* الحقول المعلمة بالنجمة مطلوبة لإتمام التسجيل'
                : '* Fields marked with an asterisk are required'}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-gradient-to-r from-[#173B63] to-[#0F766E] hover:from-[#132f4f] hover:to-[#0c5c56] text-white font-extrabold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 text-lg disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  <span>{lang === 'ar' ? 'جاري تأكيد التسجيل...' : 'Registering Visit...'}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-6 h-6" />
                  <span>{lang === 'ar' ? 'تأكيد وحفظ الزيارة' : 'Confirm & Register Visit'}</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>

      {/* Confirmation Modal */}
      {successDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-teal-200 dark:border-teal-900 shadow-2xl text-center relative overflow-hidden">
            
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#173B63] via-[#0F766E] to-[#14B8A6]" />

            <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 text-[#0F766E] dark:text-teal-400 flex items-center justify-center mx-auto mb-4 shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#173B63] dark:text-white mb-2">
              {lang === 'ar' ? 'تم تسجيل الزيارة بنجاح!' : 'Visit Registered Successfully!'}
            </h3>

            <p className="text-base text-slate-600 dark:text-zinc-300 mb-6 leading-relaxed font-medium">
              {lang === 'ar'
                ? 'تم حفظ بيانات الزيارة والزوار بنجاح في نظام إلكترون. أهلاً وسهلاً بكم!'
                : 'Your visit and visitor information have been saved successfully. Welcome to ECTRON!'}
            </p>

            <div className="bg-slate-50 dark:bg-zinc-800/70 p-5 rounded-2xl mb-6 border border-slate-200 dark:border-zinc-700 flex items-center justify-between">
              <div className="text-start">
                <span className="block text-xs sm:text-sm text-slate-400 font-bold">
                  {lang === 'ar' ? 'رقم الزيارة المسجل' : 'Assigned Visit ID'}
                </span>
                <span className="font-mono font-extrabold text-xl sm:text-2xl text-[#173B63] dark:text-teal-400">
                  {successDialog.visitNumber}
                </span>
              </div>
              <div className="text-end">
                <span className="block text-xs sm:text-sm text-slate-400 font-bold">
                  {lang === 'ar' ? 'وقت الدخول' : 'Time In'}
                </span>
                <span className="font-mono font-bold text-lg text-slate-700 dark:text-zinc-200">
                  {successDialog.timeIn}
                </span>
              </div>
            </div>

            <p className="text-sm sm:text-base text-slate-600 dark:text-zinc-300 mb-6 font-semibold">
              {lang === 'ar' ? 'هل ترغب في تسجيل زيارة أخرى؟' : 'Would you like to register another visit?'}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="w-full sm:w-auto px-6 py-3 rounded-xl border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 text-base font-bold transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                <span>{lang === 'ar' ? 'تسجيل زيارة أخرى' : 'Register Another Visit'}</span>
              </button>

              <button
                type="button"
                onClick={() => router.push('/visitor/thank-you')}
                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-[#0F766E] to-[#14B8A6] text-white text-base font-extrabold shadow hover:opacity-95 transition-all flex items-center justify-center gap-2"
              >
                <span>{lang === 'ar' ? 'إنهاء (Finish)' : 'Finish'}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
