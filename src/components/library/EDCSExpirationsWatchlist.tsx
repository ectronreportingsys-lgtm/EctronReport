'use client';

import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle2,
  Search, 
  FileText, 
  Mail, 
  User, 
  RotateCw, 
  Eye, 
  Download, 
  Building2,
  Calendar,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import clsx from 'clsx';
import { EDCSDocument } from '@/app/(dashboard)/library/actions/edcsActions';
import { useLanguage } from '@/components/layout/LanguageProvider';

interface EDCSExpirationsWatchlistProps {
  documents: EDCSDocument[];
  onViewDoc: (doc: EDCSDocument) => void;
  onRenewDoc: (doc: EDCSDocument) => void;
  onDownloadDoc: (doc: EDCSDocument) => void;
}

export default function EDCSExpirationsWatchlist({
  documents,
  onViewDoc,
  onRenewDoc,
  onDownloadDoc
}: EDCSExpirationsWatchlistProps) {
  const { t, lang } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'soon' | 'expired'>('all');

  // Filter to only expiring soon (<= 14 days) or expired (< 0 days)
  const expiringOrExpired = useMemo(() => {
    return documents.filter(doc => {
      if (doc.isPermanent || !doc.expiryDate) return false;
      return doc.status === 'Expiring Soon' || doc.status === 'Expired';
    });
  }, [documents]);

  const filteredItems = useMemo(() => {
    return expiringOrExpired.filter(doc => {
      if (filterType === 'soon' && doc.status !== 'Expiring Soon') return false;
      if (filterType === 'expired' && doc.status !== 'Expired') return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        doc.name.toLowerCase().includes(q) ||
        (doc.nameAr && doc.nameAr.toLowerCase().includes(q)) ||
        doc.referenceNo.toLowerCase().includes(q) ||
        doc.department.toLowerCase().includes(q) ||
        doc.category.toLowerCase().includes(q) ||
        doc.responsiblePerson.toLowerCase().includes(q)
      );
    }).sort((a, b) => {
      // Urgent first: expired first, then expiring soonest
      if (a.daysRemaining !== undefined && b.daysRemaining !== undefined) {
        return a.daysRemaining - b.daysRemaining;
      }
      return 0;
    });
  }, [expiringOrExpired, filterType, searchQuery]);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#121820]/90 p-5 sm:p-6 shadow-xl space-y-4">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>{t('Upcoming Expirations Watchlist', 'قائمة المتابعة والتنبيه المبكر')}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {expiringOrExpired.length} {t('Action Items', 'بنود تتطلب متابعة')}
              </span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {t(
                'Monitors critical factory permits, licenses, calibration and audits expiring within 14 days',
                'مراقبة تراخيص وشهادات المصنع ومعايرات الأجهزة التي تنتهي خلال 14 يوماً لإرسال التنبيهات والتجديد'
              )}
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-900/80 rounded-xl border border-zinc-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={clsx(
              'px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer',
              filterType === 'all'
                ? 'bg-zinc-800 text-white shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            )}
          >
            {t('All Alerts', 'كافة التنبيهات')} ({expiringOrExpired.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('soon')}
            className={clsx(
              'px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1',
              filterType === 'soon'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-zinc-400 hover:text-amber-300'
            )}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>&le; 14 {t('Days', 'يوماً')}</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterType('expired')}
            className={clsx(
              'px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1',
              filterType === 'expired'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'text-zinc-400 hover:text-rose-300'
            )}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span>{t('Expired', 'منتهية')}</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={t(
            'Search expiring documents by name, reference, department, or responsible person...',
            'البحث في الوثائق المنتهية وقريبة الانتهاء بالاسم، الرقم المرجعي، القسم أو المسؤول...'
          )}
          className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-[#14B8A6] transition-colors"
        />
      </div>

      {/* List items */}
      <div className="space-y-2.5">
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
            <h3 className="text-sm font-bold text-white">
              {searchQuery
                ? t('No expiring documents match your search query', 'لا توجد وثائق مطابقة للبحث')
                : t('No documents currently expiring within 14 days', 'ممتاز! لا توجد وثائق تنتهي خلال 14 يوماً')}
            </h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
              {t(
                'All factory certificates and compliance documents are up to date.',
                'كافة تراخيص المصنع وشهادات الجودة سارية ومحدثة.'
              )}
            </p>
          </div>
        ) : (
          filteredItems.map(doc => {
            const isExpired = doc.status === 'Expired';
            const days = doc.daysRemaining ?? 0;

            return (
              <div
                key={doc.id}
                className={clsx(
                  'group p-4 rounded-xl border transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4',
                  isExpired
                    ? 'bg-rose-950/20 border-rose-500/30 hover:border-rose-500/50'
                    : 'bg-amber-950/15 border-amber-500/30 hover:border-amber-500/50'
                )}
              >
                {/* Left: Document details */}
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div
                    className={clsx(
                      'p-2.5 rounded-xl shrink-0 mt-0.5',
                      isExpired ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    )}
                  >
                    {isExpired ? <ShieldAlert className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-white group-hover:text-teal-300 transition-colors truncate">
                        {doc.name}
                      </h4>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {doc.referenceNo}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-800 text-teal-300 border border-zinc-700">
                        {doc.currentVersion}
                      </span>
                    </div>

                    {doc.nameAr && (
                      <p className="text-xs text-zinc-400 mt-0.5 font-sans rtl:font-arabic">
                        {doc.nameAr}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-xs text-zinc-400 mt-2 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{doc.department}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{t('Expires:', 'ينتهي في:')} <strong className="text-zinc-200">{doc.expiryDate}</strong></span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 truncate">
                        <User className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{doc.responsiblePerson}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-teal-400 font-mono text-[11px] truncate">
                        <Mail className="w-3.5 h-3.5 text-teal-500" />
                        <span>{doc.reminderEmail}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Urgency badge & Action buttons */}
                <div className="flex items-center gap-3 self-end md:self-auto shrink-0 flex-wrap">
                  {/* Countdown Badge */}
                  <div
                    className={clsx(
                      'px-3 py-1.5 rounded-xl text-xs font-extrabold border shadow-xs flex items-center gap-1.5',
                      isExpired
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    )}
                  >
                    {isExpired ? (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                        <span>{t(`Expired ${Math.abs(days)} days ago`, `منتهية منذ ${Math.abs(days)} يوماً`)}</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>{t(`Expires in ${days} days`, `تنتهي خلال ${days} أيام`)}</span>
                      </>
                    )}
                  </div>

                  {/* Renew Button */}
                  <button
                    type="button"
                    onClick={() => onRenewDoc(doc)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-zinc-950 font-bold text-xs transition-colors shadow-xs cursor-pointer"
                    title={t('Renew document and upload new version', 'تجديد الوثيقة ورفع إصدار جديد')}
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>{t('Renew', 'تجديد')}</span>
                  </button>

                  {/* View Details */}
                  <button
                    type="button"
                    onClick={() => onViewDoc(doc)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold transition-colors border border-zinc-700/60 cursor-pointer"
                    title={t('View document details and history', 'عرض تفاصيل وسجل الوثيقة')}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{t('View', 'عرض')}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
