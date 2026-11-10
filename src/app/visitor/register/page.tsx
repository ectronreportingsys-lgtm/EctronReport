'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  User, 
  Phone, 
  CheckCircle2, 
  Globe2, 
  ShieldCheck, 
  Calendar, 
  Clock, 
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { submitPublicRegistration } from '../actions/visitorActions';

export default function PublicVisitorRegisterPage() {
  const router = useRouter();
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Success Dialog State
  const [successDialog, setSuccessDialog] = useState<{
    isOpen: boolean;
    visitNumber: string;
    visitDate: string;
    timeIn: string;
    visitorName: string;
  }>({
    isOpen: false,
    visitNumber: '',
    visitDate: '',
    timeIn: '',
    visitorName: ''
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

  // Single Visitor Form Fields
  const [fullNameAr, setFullNameAr] = useState('');
  const [fullNameEn, setFullNameEn] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [country, setCountry] = useState('Oman');
  const [visitReason, setVisitReason] = useState('Business Meeting');
  const [customReason, setCustomReason] = useState('');
  const [notes, setNotes] = useState('');
  const [honeypot, setHoneypot] = useState('');

  const resetForm = () => {
    setFullNameAr('');
    setFullNameEn('');
    setPhoneNumber('');
    setOrganizationName('');
    setCountry('Oman');
    setVisitReason('Business Meeting');
    setCustomReason('');
    setNotes('');
    setErrorMsg(null);
    setSuccessDialog({ isOpen: false, visitNumber: '', visitDate: '', timeIn: '', visitorName: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const nameAr = fullNameAr.trim();
    const nameEn = fullNameEn.trim();
    const org = organizationName.trim();

    if (!nameAr && !nameEn) {
      setErrorMsg(
        lang === 'ar'
          ? 'يرجى إدخال اسم الزائر الكريم.'
          : 'Please enter your full name.'
      );
      return;
    }

    if (!org) {
      setErrorMsg(
        lang === 'ar'
          ? 'يرجى إدخال اسم جهة العمل أو المؤسسة.'
          : 'Please enter your organization or company name.'
      );
      return;
    }

    const effectiveReason = visitReason === 'Other' ? customReason.trim() : visitReason;
    if (!effectiveReason) {
      setErrorMsg(
        lang === 'ar' ? 'يرجى تحديد أو إدخال سبب الزيارة.' : 'Please specify the visit reason.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitPublicRegistration({
        country: country,
        coordination_by: 'Ectron',
        visit_reason: effectiveReason,
        notes: notes.trim(),
        honeypot: honeypot,
        organizations: [
          {
            organization_en: org,
            organization_ar: org,
            visitors: [
              {
                full_name_ar: nameAr || nameEn,
                full_name_en: nameEn || nameAr,
                phone_number: phoneNumber.trim()
              }
            ]
          }
        ]
      });

      if (res.success && res.visit_number) {
        setSuccessDialog({
          isOpen: true,
          visitNumber: res.visit_number,
          visitDate: res.visit_date || currentDateStr,
          timeIn: res.time_in || currentTime,
          visitorName: nameAr || nameEn
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
    { en: 'Shipment / Delivery', ar: 'توريد أو استلام شحنة' },
    { en: 'Technical Support / Maintenance', ar: 'دعم فني أو صيانة' },
    { en: 'Inspection & Audit', ar: 'تفتيش وتدقيق' },
    { en: 'Interview', ar: 'مقابلة توظيف' },
    { en: 'Other', ar: 'أخرى (تحديد)' },
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

      <div className="max-w-2xl mx-auto relative z-10">

        {/* Top Header Card */}
        <div className="bg-white/95 dark:bg-zinc-900/90 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-[#BDCEE0] dark:border-zinc-800 shadow-xl mb-6 glass">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            
            {/* ECTRON Brand */}
            <div className="flex items-center gap-3">
              <img 
                src="/logo.png" 
                alt="ECTRON" 
                className="h-10 w-auto max-w-[160px] object-contain" 
              />
              <div className="h-8 w-px bg-slate-300 dark:bg-zinc-700 hidden sm:block mx-1" />
              <div>
                <span className="block text-xs uppercase tracking-widest text-[#0F766E] dark:text-[#00a99d] font-extrabold">
                  {lang === 'ar' ? 'مصنع إلكترون الذكي' : 'Smart Factory'}
                </span>
                <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                  {lang === 'ar' ? 'تسجيل زائر جديد' : 'Visitor Self-Registration'}
                </span>
              </div>
            </div>

            {/* Language Switcher */}
            <button
              type="button"
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#F0FDFA] hover:bg-[#CCFBF1] dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[#0F766E] dark:text-[#00a99d] border border-[#14B8A6]/40 text-sm font-bold transition-all shadow-sm"
            >
              <Globe2 className="w-4 h-4" />
              <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-zinc-800 text-center sm:text-start">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#173B63] dark:text-white">
              {lang === 'ar' ? 'مرحباً بكم في إلكترون' : 'Welcome to ECTRON'}
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-zinc-300 mt-2 font-medium">
              {lang === 'ar'
                ? 'يرجى تسجيل بياناتك لتسهيل إجراءات الدخول والترحيب بك داخل المصنع.'
                : 'Please fill in your details for quick and smooth reception at the factory.'}
            </p>
          </div>

          {/* Date & Time Bar */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm font-semibold text-[#0F766E] dark:text-teal-400 bg-teal-50/90 dark:bg-teal-950/40 px-4 py-2.5 rounded-2xl border border-teal-200/60 dark:border-teal-900/50">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{lang === 'ar' ? 'التاريخ:' : 'Date:'} {currentDateStr || '...'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{lang === 'ar' ? 'وقت الدخول:' : 'Time In:'} {currentTime || '...'}</span>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-center gap-3 text-red-700 dark:text-red-300 text-sm sm:text-base font-semibold animate-in fade-in">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="flex-1">{errorMsg}</p>
          </div>
        )}

        {/* Single Visitor Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Anti-spam honeypot */}
          <input
            type="text"
            name="company_website_url"
            value={honeypot}
            onChange={e => setHoneypot(e.target.value)}
            className="hidden"
            tabIndex={-1}
            autoComplete="off"
          />

          {/* CARD 1: Visitor Information */}
          <div className="bg-white/95 dark:bg-zinc-900/90 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-[#BDCEE0] dark:border-zinc-800 shadow-xl glass space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-zinc-800">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#173B63] to-[#0F766E] flex items-center justify-center text-white shadow-sm">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-[#173B63] dark:text-white">
                  {lang === 'ar' ? 'بيانات الزائر' : 'Visitor Information'}
                </h2>
                <span className="text-xs text-slate-500 dark:text-zinc-400">
                  {lang === 'ar' ? 'الاسم ورقم التواصل' : 'Name & Contact Details'}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {/* Full Name (Arabic) */}
              <div>
                <label className="block text-sm sm:text-base font-bold text-[#173B63] dark:text-zinc-200 mb-1.5">
                  {lang === 'ar' ? 'الاسم الكامل (بالعربية)' : 'Full Name (Arabic)'}
                  <span className="text-red-500 mr-1">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullNameAr}
                  onChange={e => setFullNameAr(e.target.value)}
                  placeholder={lang === 'ar' ? 'مثال: أحمد بن علي السعدي' : 'e.g. Ahmed Al Saadi'}
                  dir="rtl"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-foreground text-base focus:outline-none focus:ring-2 focus:ring-[#14B8A6] focus:border-[#14B8A6] transition-all"
                />
              </div>

              {/* Full Name (English) */}
              <div>
                <label className="block text-sm sm:text-base font-bold text-[#173B63] dark:text-zinc-200 mb-1.5">
                  {lang === 'ar' ? 'الاسم بالإنجليزية (اختياري)' : 'Full Name (English)'}
                </label>
                <input
                  type="text"
                  value={fullNameEn}
                  onChange={e => setFullNameEn(e.target.value)}
                  placeholder="e.g. Ahmed Al Saadi"
                  dir="ltr"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-foreground text-base focus:outline-none focus:ring-2 focus:ring-[#14B8A6] focus:border-[#14B8A6] transition-all"
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm sm:text-base font-bold text-[#173B63] dark:text-zinc-200 mb-1.5">
                  {lang === 'ar' ? 'رقم الهاتف / النقال' : 'Phone Number'}
                  <span className="text-red-500 mr-1">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                    placeholder="+968 91234567"
                    dir="ltr"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-foreground text-base font-mono focus:outline-none focus:ring-2 focus:ring-[#14B8A6] focus:border-[#14B8A6] transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* CARD 2: Organization & Visit Details */}
          <div className="bg-white/95 dark:bg-zinc-900/90 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-[#BDCEE0] dark:border-zinc-800 shadow-xl glass space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-zinc-800">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0F766E] to-[#14B8A6] flex items-center justify-center text-white shadow-sm">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-[#173B63] dark:text-white">
                  {lang === 'ar' ? 'جهة العمل وتفاصيل الزيارة' : 'Company & Visit Details'}
                </h2>
                <span className="text-xs text-slate-500 dark:text-zinc-400">
                  {lang === 'ar' ? 'المؤسسة والغرض من الزيارة' : 'Organization and purpose of entry'}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {/* Organization Name */}
              <div>
                <label className="block text-sm sm:text-base font-bold text-[#173B63] dark:text-zinc-200 mb-1.5">
                  {lang === 'ar' ? 'اسم المؤسسة أو الشركة' : 'Organization / Company Name'}
                  <span className="text-red-500 mr-1">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={organizationName}
                  onChange={e => setOrganizationName(e.target.value)}
                  placeholder={lang === 'ar' ? 'مثال: شركة نماء، وزارة التجارة، شركة سيمنز...' : 'e.g. Nama Services, Siemens, Ministry of Commerce...'}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-foreground text-base focus:outline-none focus:ring-2 focus:ring-[#14B8A6] focus:border-[#14B8A6] transition-all"
                />
              </div>

              {/* Country & Visit Reason Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Visit Reason */}
                <div>
                  <label className="block text-sm sm:text-base font-bold text-[#173B63] dark:text-zinc-200 mb-1.5">
                    {lang === 'ar' ? 'سبب الزيارة' : 'Visit Reason'}
                  </label>
                  <select
                    value={visitReason}
                    onChange={e => setVisitReason(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-foreground text-sm sm:text-base font-semibold focus:outline-none focus:ring-2 focus:ring-[#14B8A6] transition-all"
                  >
                    {visitReasons.map(r => (
                      <option key={r.en} value={r.en}>
                        {lang === 'ar' ? r.ar : r.en}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Country */}
                <div>
                  <label className="block text-sm sm:text-base font-bold text-[#173B63] dark:text-zinc-200 mb-1.5">
                    {lang === 'ar' ? 'الدولة' : 'Country'}
                  </label>
                  <select
                    value={country}
                    onChange={e => setCountry(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-foreground text-sm sm:text-base font-semibold focus:outline-none focus:ring-2 focus:ring-[#14B8A6] transition-all"
                  >
                    {countries.map(c => (
                      <option key={c.en} value={c.en}>
                        {lang === 'ar' ? c.ar : c.en}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Custom reason if 'Other' selected */}
              {visitReason === 'Other' && (
                <div>
                  <label className="block text-sm sm:text-base font-bold text-[#173B63] dark:text-zinc-200 mb-1.5">
                    {lang === 'ar' ? 'يرجى تحديد سبب الزيارة' : 'Specify Visit Reason'}
                    <span className="text-red-500 mr-1">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customReason}
                    onChange={e => setCustomReason(e.target.value)}
                    placeholder={lang === 'ar' ? 'اكتب سبب الزيارة هنا...' : 'Enter your reason for visit...'}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-foreground text-base focus:outline-none focus:ring-2 focus:ring-[#14B8A6] transition-all"
                  />
                </div>
              )}

              {/* Optional Notes */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-600 dark:text-zinc-300 mb-1.5">
                  {lang === 'ar' ? 'ملاحظات إضافية (اختياري)' : 'Additional Notes (Optional)'}
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder={lang === 'ar' ? 'اسم الشخص الذي تقابله، أو أي ملاحظات أخرى...' : 'Person to meet, or any additional notes...'}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-foreground placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#14B8A6] transition-all"
                />
              </div>
            </div>
          </div>

          {/* Privacy Notice */}
          <div className="p-4 rounded-2xl bg-slate-100/90 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 flex items-start gap-3 text-xs sm:text-sm text-slate-600 dark:text-zinc-400">
            <ShieldCheck className="w-5 h-5 text-[#0F766E] dark:text-teal-400 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {lang === 'ar'
                ? 'إشعار الخصوصية: بياناتك محمية وتُستخدم حصراً لتنظيم الدخول وتوثيق الزيارات داخل مصنع إلكترون وفق معايير الأمان والسلامة.'
                : 'Privacy Notice: Your information is collected strictly for security protocols and visitor verification at ECTRON Smart Factory.'}
            </p>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#173B63] to-[#0F766E] hover:from-[#132f4f] hover:to-[#0c5c56] text-white font-extrabold shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-3 text-lg disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>{lang === 'ar' ? 'جاري تسجيل الزيارة...' : 'Registering...'}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{lang === 'ar' ? 'تسجيل الزيارة والدخول' : 'Register & Confirm Entry'}</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>

      {/* Confirmation Modal */}
      {successDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 max-w-md w-full border border-teal-200 dark:border-teal-900 shadow-2xl text-center relative overflow-hidden">
            
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#173B63] via-[#0F766E] to-[#14B8A6]" />

            <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 text-[#0F766E] dark:text-teal-400 flex items-center justify-center mx-auto mb-4 shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <h3 className="text-2xl font-extrabold text-[#173B63] dark:text-white mb-2">
              {lang === 'ar' ? 'تم تسجيل بياناتك بنجاح!' : 'Registration Successful!'}
            </h3>

            <p className="text-sm sm:text-base text-slate-600 dark:text-zinc-300 mb-6 font-medium">
              {lang === 'ar'
                ? `أهلاً وسهلاً بك يا ${successDialog.visitorName} في مصنع إلكترون.`
                : `Welcome to ECTRON, ${successDialog.visitorName}.`}
            </p>

            <div className="bg-slate-50 dark:bg-zinc-800/70 p-5 rounded-2xl mb-6 border border-slate-200 dark:border-zinc-700 flex items-center justify-between">
              <div className="text-start">
                <span className="block text-xs text-slate-400 font-bold">
                  {lang === 'ar' ? 'رقم الزيارة' : 'Visit ID'}
                </span>
                <span className="font-mono font-extrabold text-xl text-[#0F766E] dark:text-teal-400">
                  {successDialog.visitNumber}
                </span>
              </div>
              <div className="text-end">
                <span className="block text-xs text-slate-400 font-bold">
                  {lang === 'ar' ? 'وقت الدخول' : 'Time In'}
                </span>
                <span className="font-mono font-bold text-base text-slate-700 dark:text-zinc-200">
                  {successDialog.timeIn}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 text-sm font-bold transition-colors"
              >
                {lang === 'ar' ? 'تسجيل زائر آخر' : 'Register Another'}
              </button>

              <button
                type="button"
                onClick={() => router.push('/visitor/thank-you')}
                className="w-full sm:w-auto px-7 py-2.5 rounded-xl bg-gradient-to-r from-[#0F766E] to-[#14B8A6] text-white text-sm font-extrabold shadow hover:opacity-95 transition-all flex items-center justify-center gap-2"
              >
                <span>{lang === 'ar' ? 'تم والحمد لله' : 'Done'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
