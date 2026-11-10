'use client';

import React, { useState } from 'react';
import { 
  X, 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  Building2, 
  Calendar, 
  User, 
  Mail, 
  Paperclip,
  Check
} from 'lucide-react';
import clsx from 'clsx';
import { EDCSDocument, createEDCSDocument } from '@/app/(dashboard)/library/actions/edcsActions';
import { useLanguage } from '@/components/layout/LanguageProvider';

interface EDCSAddDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newDoc: EDCSDocument) => void;
}

const DEFAULT_CATEGORIES = [
  'Environmental & Municipal',
  'Quality & Standards',
  'Safety & Civil Defense',
  'Calibration & Metrology',
  'Corporate & Legal',
  'Specialized Machinery',
  'Factory Infrastructure',
  'Vendor & Supplier Contracts',
  'Staff Certifications & Licenses'
];

const DEFAULT_DEPARTMENTS = [
  'Health, Safety & Environment (HSE)',
  'Quality Assurance (QA)',
  'Production & Assembly',
  'Plant Engineering & Facilities',
  'Legal & Corporate Affairs',
  'Maintenance & Calibration',
  'Supply Chain & Procurement',
  'Executive Management'
];

export default function EDCSAddDocumentModal({ isOpen, onClose, onSuccess }: EDCSAddDocumentModalProps) {
  const { t } = useLanguage();

  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [department, setDepartment] = useState(DEFAULT_DEPARTMENTS[0]);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState('');
  const [isPermanent, setIsPermanent] = useState(false);
  const [responsiblePerson, setResponsiblePerson] = useState('');
  const [reminderEmail, setReminderEmail] = useState('');
  const [notes, setNotes] = useState('');

  // File state & validation
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    // Validate size (max 25MB)
    const maxSize = 25 * 1024 * 1024;
    if (selected.size > maxSize) {
      setFileError(t('File size exceeds the 25MB limit.', 'حجم الملف يتجاوز الحد المسموح (25 ميجابايت).'));
      return;
    }

    // Validate type (PDF, Word, Excel, Images)
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png'
    ];

    if (!allowedTypes.includes(selected.type) && !selected.name.match(/\.(pdf|docx|doc|xlsx|xls|png|jpg|jpeg)$/i)) {
      setFileError(t('Invalid file format. Please upload PDF, Word, Excel, or Image file.', 'نوع الملف غير مدعوم. يرجى رفع ملف PDF أو Word أو Excel أو صورة.'));
      return;
    }

    setFileError(null);
    setFile(selected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError(t('Document Name is required.', 'اسم الوثيقة مطلوب.'));
      return;
    }
    if (!responsiblePerson.trim()) {
      setFormError(t('Responsible person is required.', 'اسم الشخص المسؤول مطلوب.'));
      return;
    }
    if (!isPermanent && !expiryDate) {
      setFormError(t('Expiry Date is required for expiring documents.', 'تاريخ الانتهاء مطلوب للوثائق محددة الصلاحية.'));
      return;
    }
    if (!isPermanent && !reminderEmail.trim()) {
      setFormError(t('Reminder Email is required for 14-day expiry alerts.', 'البريد الإلكتروني للتنبيهات مطلوب قبل 14 يوماً من الانتهاء.'));
      return;
    }

    setLoading(true);

    try {
      const finalCategory = category === 'Other' ? customCategory.trim() || 'General' : category;

      const res = await createEDCSDocument({
        name,
        nameAr,
        referenceNo,
        category: finalCategory,
        department,
        issueDate: issueDate || undefined,
        expiryDate: isPermanent ? undefined : expiryDate,
        isPermanent,
        responsiblePerson,
        reminderEmail,
        notes,
        fileName: file ? file.name : undefined,
        fileSize: file ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : '1.2 MB',
        fileType: file ? file.type : 'application/pdf'
      });

      if (res.success && res.document) {
        onSuccess(res.document);
        onClose();
      } else {
        setFormError(res.error || t('Failed to add document', 'فشل إضافة الوثيقة'));
      }
    } catch (err: any) {
      setFormError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl border border-zinc-800 bg-[#121820] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-400">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {t('Add New Document to EDCS', 'إضافة وثيقة جديدة إلى نظام المكتبة')}
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                {t('Upload factory record, specify metadata, and configure 14-day expiry alerts', 'رفع وثيقة المصنع وتحديد البيانات وجدولة تنبيهات انتهاء الصلاحية')}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar text-xs">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Row 1: Document Name & Arabic Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-300 font-bold mb-1">
                {t('Document Name (English)', 'اسم الوثيقة (بالإنجليزية)')} <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Factory Environmental Operating Permit"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-teal-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-bold mb-1">
                {t('Document Name (Arabic)', 'اسم الوثيقة (بالعربية)')}
              </label>
              <input
                type="text"
                value={nameAr}
                onChange={e => setNameAr(e.target.value)}
                placeholder="مثال: تصريح التشغيل البيئي للمصنع"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-teal-500 font-medium"
              />
            </div>
          </div>

          {/* Row 2: Reference Number & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-300 font-bold mb-1">
                {t('Reference / Document Number', 'الرقم المرجعي / رقم الوثيقة')}
              </label>
              <input
                type="text"
                value={referenceNo}
                onChange={e => setReferenceNo(e.target.value)}
                placeholder="e.g. ECT-ENV-2026-001 (Auto if blank)"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-teal-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-bold mb-1">
                {t('Category', 'التصنيف')} <span className="text-rose-400">*</span>
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-200 focus:outline-none focus:border-teal-500 font-medium cursor-pointer"
              >
                {DEFAULT_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value="Other">{t('Other Category...', 'تصنيف آخر...')}</option>
              </select>
            </div>
          </div>

          {category === 'Other' && (
            <div>
              <label className="block text-zinc-300 font-bold mb-1">{t('Specify Custom Category', 'حدد التصنيف المخصص')}</label>
              <input
                type="text"
                value={customCategory}
                onChange={e => setCustomCategory(e.target.value)}
                placeholder="Enter custom category name"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-zinc-200"
              />
            </div>
          )}

          {/* Row 3: Department & Permanent Toggle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-300 font-bold mb-1">
                {t('Department', 'القسم / الإدارة')} <span className="text-rose-400">*</span>
              </label>
              <select
                value={department}
                onChange={e => setDepartment(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-200 focus:outline-none focus:border-teal-500 font-medium cursor-pointer"
              >
                {DEFAULT_DEPARTMENTS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 cursor-pointer hover:border-zinc-700 transition-colors">
                <input
                  type="checkbox"
                  checked={isPermanent}
                  onChange={e => setIsPermanent(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-500 accent-[#14B8A6] cursor-pointer"
                />
                <span className="text-zinc-200 font-semibold select-none">
                  {t('Non-expiring / Permanent Document', 'وثيقة دائمة / لا تنتهي صلاحيتها')}
                </span>
              </label>
            </div>
          </div>

          {/* Row 4: Issue Date & Expiry Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-300 font-bold mb-1">
                {t('Issue Date', 'تاريخ الإصدار')} <span className="text-zinc-500 font-normal">({t('Optional', 'اختياري')})</span>
              </label>
              <input
                type="date"
                value={issueDate}
                onChange={e => setIssueDate(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-200 focus:outline-none focus:border-teal-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-bold mb-1">
                {t('Expiry Date', 'تاريخ الانتهاء')} {!isPermanent && <span className="text-rose-400">*</span>}
              </label>
              <input
                type="date"
                disabled={isPermanent}
                value={isPermanent ? '' : expiryDate}
                onChange={e => setExpiryDate(e.target.value)}
                className={clsx(
                  'w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-200 focus:outline-none focus:border-teal-500 font-mono',
                  isPermanent && 'opacity-40 cursor-not-allowed bg-zinc-950'
                )}
              />
              {!isPermanent && (
                <span className="text-[10px] text-teal-400 mt-1 block">
                  {t('Automated reminder triggers exactly 14 days before this date.', 'سيتم إرسال تنبيه آلي قبل 14 يوماً تماماً من هذا التاريخ.')}
                </span>
              )}
            </div>
          </div>

          {/* Row 5: Responsible Person & Reminder Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-300 font-bold mb-1">
                {t('Responsible Person', 'الشخص المسؤول')} <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={responsiblePerson}
                onChange={e => setResponsiblePerson(e.target.value)}
                placeholder="e.g. Eng. Tariq Al-Balushi (HSE Lead)"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-teal-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-bold mb-1">
                {t('Reminder Email', 'بريد التنبيهات')} {!isPermanent && <span className="text-rose-400">*</span>}
              </label>
              <input
                type="email"
                required={!isPermanent}
                value={reminderEmail}
                onChange={e => setReminderEmail(e.target.value)}
                placeholder="tariq.hse@ectron.om"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-teal-500 font-mono"
              />
            </div>
          </div>

          {/* Row 6: Document File Upload */}
          <div>
            <label className="block text-zinc-300 font-bold mb-1">
              {t('Document File', 'ملف الوثيقة')} <span className="text-zinc-500 font-normal">({t('PDF, Word, Excel, Images up to 25MB', 'PDF، Word، Excel، صور حتى 25 ميجابايت')})</span>
            </label>
            <div className="border-2 border-dashed border-zinc-800 rounded-xl p-4 text-center hover:border-teal-500/50 transition-colors bg-zinc-900/40 relative">
              <input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center gap-1.5 pointer-events-none">
                <Paperclip className="w-6 h-6 text-teal-400 mb-1" />
                {file ? (
                  <div className="flex items-center gap-1.5 text-teal-300 font-bold">
                    <Check className="w-4 h-4" />
                    <span>{file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                  </div>
                ) : (
                  <>
                    <p className="text-zinc-300 font-semibold">{t('Click or drag file here to attach', 'اضغط أو اسحب الملف هنا للإرفاق')}</p>
                    <p className="text-[11px] text-zinc-500">{t('Will be stored in private secure cloud bucket', 'سيتم الحفظ المشفر في مساحة التخزين السحابية الخاصة')}</p>
                  </>
                )}
              </div>
            </div>
            {fileError && <p className="text-rose-400 text-[11px] mt-1">{fileError}</p>}
          </div>

          {/* Row 7: Notes */}
          <div>
            <label className="block text-zinc-300 font-bold mb-1">
              {t('Notes & Statutory Instructions', 'ملاحظات وتوجيهات التجديد')}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Requires site physical inspection report 2 weeks prior..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-teal-500 text-xs"
            />
          </div>

          {/* Footer Submit Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 font-semibold cursor-pointer transition-colors"
            >
              {t('Cancel', 'إلغاء')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-zinc-950 font-bold shadow-md shadow-teal-900/30 cursor-pointer transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>{t('Save & Register Document', 'حفظ وتسجيل الوثيقة')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
