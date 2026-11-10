'use client';

import React, { useState } from 'react';
import { 
  X, 
  RotateCw, 
  Calendar, 
  User, 
  FileText, 
  UploadCloud, 
  History, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2,
  Paperclip,
  Check
} from 'lucide-react';
import clsx from 'clsx';
import { EDCSDocument, renewEDCSDocument } from '@/app/(dashboard)/library/actions/edcsActions';
import { useLanguage } from '@/components/layout/LanguageProvider';

interface EDCSRenewDocumentModalProps {
  isOpen: boolean;
  document: EDCSDocument | null;
  onClose: () => void;
  onSuccess: (updatedDoc: EDCSDocument) => void;
}

export default function EDCSRenewDocumentModal({
  isOpen,
  document,
  onClose,
  onSuccess
}: EDCSRenewDocumentModalProps) {
  const { t } = useLanguage();

  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [newIssueDate, setNewIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [renewedBy, setRenewedBy] = useState(document?.responsiblePerson || '');
  const [renewalNotes, setRenewalNotes] = useState('');

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !document) return null;

  // Calculate next version e.g. v1.2 -> v2.0
  const currentVer = parseFloat(document.currentVersion.replace('v', '')) || 1.0;
  const nextVer = `v${(Math.floor(currentVer) + 1).toFixed(1)}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newExpiryDate) {
      setError(t('Please select the new expiration date.', 'يرجى تحديد تاريخ الانتهاء الجديد.'));
      return;
    }
    if (!renewedBy.trim()) {
      setError(t('Please provide the name of the person renewing the document.', 'يرجى كتابة اسم القائم بالتجديد.'));
      return;
    }

    setLoading(true);

    try {
      const res = await renewEDCSDocument(document.id, {
        newExpiryDate,
        newIssueDate,
        renewedBy,
        fileName: file ? file.name : undefined,
        fileSize: file ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : '2.1 MB',
        fileType: file ? file.type : 'application/pdf',
        notes: renewalNotes
      });

      if (res.success && res.document) {
        onSuccess(res.document);
        onClose();
      } else {
        setError(res.error || t('Renewal failed.', 'فشل التجديد.'));
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred during renewal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl border border-zinc-800 bg-[#121820] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-400">
              <RotateCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {t('Renew Factory Document', 'تجديد وثيقة المصنع')}
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                {document.name} ({document.referenceNo})
              </p>
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

        {/* Version Bump Banner */}
        <div className="p-4 bg-teal-500/10 border-b border-teal-500/20 flex items-center justify-between text-xs text-teal-300">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-teal-400 shrink-0" />
            <span>
              {t('Version Transition:', 'ترقية الإصدار:')}{' '}
              <strong className="text-white font-mono">{document.currentVersion}</strong> &rarr;{' '}
              <strong className="text-teal-300 font-mono font-bold">{nextVer}</strong>
            </span>
          </div>
          <span className="text-[11px] text-teal-400/80 bg-teal-500/15 px-2 py-0.5 rounded-full border border-teal-500/30">
            {t('Audit Log Preserved', 'الأرشيف السابق محفوظ')}
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs custom-scrollbar">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Expiration reference */}
          <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between text-zinc-300">
            <span>{t('Previous Expiration Date:', 'تاريخ الانتهاء السابق:')}</span>
            <span className="font-mono font-bold text-rose-400">{document.expiryDate || t('None', 'لا يوجد')}</span>
          </div>

          {/* New Expiry Date & Issue Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-300 font-bold mb-1">
                {t('New Expiry Date', 'تاريخ الانتهاء الجديد')} <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                required
                value={newExpiryDate}
                onChange={e => setNewExpiryDate(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-200 focus:outline-none focus:border-teal-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-bold mb-1">
                {t('Renewal / Issue Date', 'تاريخ التجديد / الإصدار')}
              </label>
              <input
                type="date"
                value={newIssueDate}
                onChange={e => setNewIssueDate(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-200 focus:outline-none focus:border-teal-500 font-mono"
              />
            </div>
          </div>

          {/* Renewed By */}
          <div>
            <label className="block text-zinc-300 font-bold mb-1">
              {t('Renewed By (Authorized Person)', 'القائم بالتجديد (المفوض)')} <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={renewedBy}
              onChange={e => setRenewedBy(e.target.value)}
              placeholder="e.g. Eng. Tariq Al-Balushi"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-200 focus:outline-none focus:border-teal-500 font-medium"
            />
          </div>

          {/* New Document File */}
          <div>
            <label className="block text-zinc-300 font-bold mb-1">
              {t('New Document File (Optional if retaining current file)', 'ملف الوثيقة المجددة (اختياري في حال استبقاء الملف)')}
            </label>
            <div className="border border-dashed border-zinc-800 rounded-xl p-4 text-center hover:border-teal-500/50 transition-colors bg-zinc-900/40 relative">
              <input
                type="file"
                onChange={e => setFile(e.target.files?.[0] || null)}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center gap-1.5 pointer-events-none">
                <Paperclip className="w-5 h-5 text-teal-400" />
                {file ? (
                  <span className="text-teal-300 font-bold">{file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                ) : (
                  <span className="text-zinc-400">{t('Attach renewed certificate or permit scan', 'إرفاق نسخة الشهادة أو التصريح المجدد')}</span>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-zinc-300 font-bold mb-1">
              {t('Renewal Notes & Audit Trail Reference', 'ملاحظات التجديد ومرجع الاعتماد')}
            </label>
            <textarea
              rows={2}
              value={renewalNotes}
              onChange={e => setRenewalNotes(e.target.value)}
              placeholder="e.g. Approved by ROP Civil Defense after inspection pass #9021..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-teal-500 text-xs"
            />
          </div>

          {/* Footer Submit */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 font-semibold cursor-pointer"
            >
              {t('Cancel', 'إلغاء')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-zinc-950 font-bold shadow-md shadow-teal-900/30 cursor-pointer transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
              <span>{t('Confirm Renewal & Bump Version', 'تأكيد التجديد وترقية الإصدار')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
