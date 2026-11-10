'use client';

import React from 'react';
import { 
  X, 
  FileText, 
  Building2, 
  Calendar, 
  User, 
  Mail, 
  Download, 
  RotateCw, 
  History, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  ShieldCheck,
  BellRing,
  Layers,
  Paperclip
} from 'lucide-react';
import clsx from 'clsx';
import { EDCSDocument } from '@/app/(dashboard)/library/actions/edcsActions';
import { useLanguage } from '@/components/layout/LanguageProvider';

interface EDCSViewDocumentModalProps {
  isOpen: boolean;
  document: EDCSDocument | null;
  onClose: () => void;
  onRenew: (doc: EDCSDocument) => void;
  onDownload: (doc: EDCSDocument) => void;
}

export default function EDCSViewDocumentModal({
  isOpen,
  document,
  onClose,
  onRenew,
  onDownload
}: EDCSViewDocumentModalProps) {
  const { t } = useLanguage();

  if (!isOpen || !document) return null;

  const days = document.daysRemaining;
  const isExpired = document.status === 'Expired';
  const isSoon = document.status === 'Expiring Soon';
  const isPermanent = document.status === 'Permanent' || document.isPermanent;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl border border-zinc-800 bg-[#121820] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-teal-300 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                  {document.referenceNo}
                </span>
                <span className="text-xs font-bold text-white bg-teal-500/15 px-2 py-0.5 rounded border border-teal-500/30">
                  {document.currentVersion}
                </span>
              </div>
              <h3 className="text-base font-bold text-white mt-1">
                {document.name}
              </h3>
              {document.nameAr && (
                <p className="text-xs text-zinc-400 font-sans rtl:font-arabic">
                  {document.nameAr}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs custom-scrollbar">
          {/* Status & Expiry Banner */}
          <div className={clsx(
            'p-4 rounded-xl border flex items-center justify-between gap-3 flex-wrap',
            isPermanent
              ? 'bg-blue-950/20 border-blue-500/30 text-blue-300'
              : isExpired
              ? 'bg-rose-950/25 border-rose-500/40 text-rose-300'
              : isSoon
              ? 'bg-amber-950/25 border-amber-500/40 text-amber-300'
              : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
          )}>
            <div className="flex items-center gap-2.5">
              {isPermanent ? (
                <ShieldCheck className="w-5 h-5 text-blue-400" />
              ) : isExpired ? (
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              ) : isSoon ? (
                <Clock className="w-5 h-5 text-amber-400" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              )}
              <div>
                <span className="font-bold text-sm block">
                  {isPermanent
                    ? t('Permanent Factory Document (Non-Expiring)', 'وثيقة مصنع دائمة (غير منتهية)')
                    : isExpired
                    ? t(`EXPIRED: ${Math.abs(days || 0)} Days Ago`, `منتهية الصلاحية منذ ${Math.abs(days || 0)} يوماً`)
                    : isSoon
                    ? t(`EXPIRING SOON: ${days} Days Remaining`, `تنبيه: متبقي ${days} يوماً على الانتهاء`)
                    : t(`Active & Fully Compliant (${days} Days Remaining)`, `سارية المفعول ومطابقة (${days} يوماً متبقي)`)}
                </span>
                <span className="text-[11px] opacity-80">
                  {isPermanent
                    ? t('Master reference, schematics or standard architectural document.', 'مخطط إنشائي أو مرجع قياسي غير محدد بمدة زمنية.')
                    : t(`Valid until: ${document.expiryDate}`, `تاريخ الصلاحية حتى: ${document.expiryDate}`)}
                </span>
              </div>
            </div>

            {!isPermanent && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRenew(document);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-zinc-950 font-bold text-xs transition-colors cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>{t('Renew Now', 'تجديد الآن')}</span>
              </button>
            )}
          </div>

          {/* Core Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800">
              <span className="text-zinc-500 font-semibold block mb-1">{t('Category', 'التصنيف')}</span>
              <span className="text-zinc-200 font-bold">{document.category}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800">
              <span className="text-zinc-500 font-semibold block mb-1">{t('Department', 'القسم / الإدارة')}</span>
              <span className="text-zinc-200 font-bold">{document.department}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800">
              <span className="text-zinc-500 font-semibold block mb-1">{t('Issue Date', 'تاريخ الإصدار')}</span>
              <span className="text-zinc-200 font-mono">{document.issueDate || '—'}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800">
              <span className="text-zinc-500 font-semibold block mb-1">{t('Expiry Date', 'تاريخ الانتهاء')}</span>
              <span className="text-zinc-200 font-mono">{document.isPermanent ? t('Permanent', 'دائمة') : document.expiryDate}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800">
              <span className="text-zinc-500 font-semibold block mb-1">{t('Responsible Person', 'الشخص المسؤول')}</span>
              <span className="text-zinc-200 font-bold">{document.responsiblePerson}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800">
              <span className="text-zinc-500 font-semibold block mb-1">{t('Reminder Email', 'بريد التنبيهات')}</span>
              <span className="text-teal-400 font-mono font-semibold">{document.reminderEmail}</span>
            </div>
          </div>

          {/* Automated Expiration & Notification Monitoring Card */}
          {!isPermanent && (
            <div className="p-4 rounded-xl border border-teal-500/30 bg-teal-950/15 space-y-2">
              <div className="flex items-center gap-2 text-teal-300 font-bold">
                <BellRing className="w-4 h-4 text-teal-400" />
                <span>{t('14-Day Expiration Notification Monitor', 'نظام المراقبة والتنبيه الآلي (14 يوماً)')}</span>
              </div>
              <p className="text-[11px] text-zinc-300 leading-relaxed">
                {t(
                  'Scheduled service checks expiration daily (Asia/Muscat timezone). Automated dispatch occurs exactly 14 days before expiration. Duplicates are strictly prevented per document version.',
                  'الخدمة المجدولة تفحص التواريخ يومياً بتوقيت مسقط. يتم إرسال التنبيه البريدي قبل 14 يوماً تماماً من موعد الانتهاء مع منع تكرار التنبيه لنفس الإصدار.'
                )}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-zinc-400 pt-1 border-t border-teal-500/20">
                <span>{t('Target Recipient:', 'المرسل إليه:')}</span>
                <strong className="text-teal-300 font-mono">{document.reminderEmail}</strong>
              </div>
            </div>
          )}

          {/* Current File Card */}
          <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-zinc-800 text-teal-400">
                <Paperclip className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-white block truncate max-w-sm">
                  {document.fileName || `${document.name}.pdf`}
                </span>
                <span className="text-[11px] text-zinc-400">
                  {document.fileSize || '2.4 MB'} • {document.currentVersion} • {t('Private Secure Storage', 'تخزين سحابي مشفر')}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onDownload(document)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-teal-300 hover:text-white font-bold text-xs border border-zinc-700/60 transition-colors cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('Download File', 'تحميل الملف')}</span>
            </button>
          </div>

          {/* Notes */}
          {document.notes && (
            <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <span className="text-zinc-500 font-semibold block mb-1">{t('Notes & Statutory Instructions', 'الملاحظات والتوجيهات')}</span>
              <p className="text-zinc-300 leading-relaxed">{document.notes}</p>
            </div>
          )}

          {/* Version History Table */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-teal-400" />
              <h4 className="font-bold text-white text-xs">{t('Version History & Audit Log', 'سجل الإصدارات والأرشفة')}</h4>
            </div>

            <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-950/40">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-zinc-900/80 text-zinc-400 border-b border-zinc-800 font-semibold">
                    <th className="px-3 py-2">{t('Version', 'الإصدار')}</th>
                    <th className="px-3 py-2">{t('Uploaded At', 'تاريخ الرفع')}</th>
                    <th className="px-3 py-2">{t('Uploaded By', 'القائم بالرفع')}</th>
                    <th className="px-3 py-2">{t('File Name', 'اسم الملف')}</th>
                    <th className="px-3 py-2">{t('Notes', 'الملاحظات')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-zinc-300 font-medium">
                  {document.versions && document.versions.length > 0 ? (
                    document.versions.map((ver, idx) => (
                      <tr key={idx} className="hover:bg-zinc-900/30">
                        <td className="px-3 py-2 font-mono font-bold text-teal-300">
                          {ver.version} {idx === 0 && <span className="text-[10px] bg-teal-500/20 text-teal-300 px-1 rounded ml-1 font-sans">{t('Current', 'الحالي')}</span>}
                        </td>
                        <td className="px-3 py-2 font-mono text-zinc-400">
                          {ver.uploadedAt ? ver.uploadedAt.split('T')[0] : '—'}
                        </td>
                        <td className="px-3 py-2 font-semibold text-white">
                          {ver.uploadedBy || '—'}
                        </td>
                        <td className="px-3 py-2 text-zinc-400 truncate max-w-[140px]">
                          {ver.fileName || 'document.pdf'}
                        </td>
                        <td className="px-3 py-2 text-zinc-400">
                          {ver.notes || '—'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-3 py-3 text-center text-zinc-500">
                        {t('No previous versions archived yet.', 'لا توجد إصدارات سابقة مؤرشفة بعد.')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-zinc-800 bg-zinc-900/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold cursor-pointer"
          >
            {t('Close', 'إغلاق')}
          </button>
        </div>
      </div>
    </div>
  );
}
