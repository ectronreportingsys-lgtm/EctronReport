'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Check, 
  RefreshCw, 
  ArrowRight,
  Users,
  Calendar,
  Clock,
  Sparkles,
  Info,
  Building2,
  LayoutDashboard
} from 'lucide-react';
import { loadDefaultExcelVisits, importHistoricalVisits } from '@/app/visitor/actions/visitorActions';
import { useLanguage } from '@/components/layout/LanguageProvider';

interface ParsedRow {
  sn: number;
  visit_date: string;
  time_in: string;
  time_out?: string | null;
  organization_en: string;
  organization_ar: string;
  country: string;
  coordination_by?: string;
  visit_reason: string;
  notes: string;
  visitors: Array<{
    full_name_en?: string;
    full_name_ar?: string;
    phone_number?: string;
  }>;
  status: 'ready' | 'duplicate' | 'ambiguous';
  isDuplicate: boolean;
  isMissingNames: boolean;
  selected?: boolean;
}

export default function VisitorExcelImportPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Results State
  const [importResult, setImportResult] = useState<{
    isOpen: boolean;
    importedCount: number;
    skippedCount: number;
    totalCount: number;
  } | null>(null);

  // Auto-load default system Excel on page load
  useEffect(() => {
    handleLoadDefault();
  }, []);

  const handleLoadDefault = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await loadDefaultExcelVisits();
      if (res.success && res.rows) {
        setRows(res.rows.map(r => ({ ...r, selected: r.status !== 'duplicate' })));
      } else {
        setErrorMsg(res.error || 'تعذر تحميل ملف الإكسل الافتراضي.');
      }
    } catch (e: any) {
      setErrorMsg(e?.message || 'خطأ أثناء قراءة الملف');
    } finally {
      setIsLoading(false);
    }
  };

  // Custom File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const wb = XLSX.read(data, { type: 'binary' });
        const sheetName = wb.SheetNames.includes('Ectron Visits') ? 'Ectron Visits' : wb.SheetNames[0];
        const raw: any[] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);

        function excelDateToString(serial: any) {
          if (!serial) return '2024-05-01';
          if (typeof serial === 'string') return serial;
          const utc_days = Math.floor(serial - 25569);
          const date_info = new Date(utc_days * 86400 * 1000);
          return date_info.toISOString().split('T')[0];
        }

        function excelTimeToString(serial: any) {
          if (serial === undefined || serial === null || serial === '') return '';
          if (typeof serial === 'string') return serial.trim();
          const totalSeconds = Math.round(serial * 86400);
          const hours = Math.floor(totalSeconds / 3600);
          const minutes = Math.floor((totalSeconds % 3600) / 60);
          return String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0');
        }

        const parsed: ParsedRow[] = raw.map((r, i) => {
          const dateStr = excelDateToString(r.Date);
          const timeIn = excelTimeToString(r['Time In']) || '09:00';
          const timeOut = excelTimeToString(r['Time out']) || null;
          const orgEn = (r['Orgnaizatin in English'] || r['Organization in English'] || '').trim();
          const orgAr = (r['Organization in Arabic'] || '').trim();
          const country = (r['Country'] || 'Oman').trim();
          const coordBy = (r['Cordination by'] || r['Coordination by'] || r['Cordination By'] || 'Ectron').toString().trim() || 'Ectron';
          const visitReason = (r['Visit Reson'] || r['Visit Reason'] || '').trim();
          const notes = (r['Notes'] || '').trim();

          const enNames = (r['Visitor Names'] || '').toString().split(/\r?\n/).map((s: string) => s.trim()).filter(Boolean);
          const arNames = (r['Visitor Arabic Name '] || r['Visitor Arabic Name'] || '').toString().split(/\r?\n/).map((s: string) => s.trim()).filter(Boolean);
          const phone = (r['Visitor Phone'] || '').toString().trim();

          const maxVisitors = Math.max(enNames.length, arNames.length);
          const visitors = [];

          if (maxVisitors === 0) {
            visitors.push({
              full_name_en: orgEn ? `Representative (${orgEn})` : 'Visitor',
              full_name_ar: orgAr ? `ممثل (${orgAr})` : 'زائر',
              phone_number: phone
            });
          } else {
            for (let idx = 0; idx < maxVisitors; idx++) {
              visitors.push({
                full_name_en: enNames[idx] || '',
                full_name_ar: arNames[idx] || '',
                phone_number: idx === 0 ? phone : ''
              });
            }
          }

          const isMissingNames = enNames.length === 0 && arNames.length === 0;

          return {
            sn: r.SN || (i + 1),
            visit_date: dateStr,
            time_in: timeIn,
            time_out: timeOut,
            organization_en: orgEn,
            organization_ar: orgAr,
            country: country,
            coordination_by: coordBy,
            visit_reason: visitReason,
            notes: notes,
            visitors: visitors,
            status: isMissingNames ? 'ambiguous' : 'ready',
            isDuplicate: false,
            isMissingNames: isMissingNames,
            selected: true
          };
        });

        setRows(parsed);
      } catch (err: any) {
        setErrorMsg('حدث خطأ أثناء معالجة ملف الإكسل المرفوع');
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const toggleSelectAll = (checked: boolean) => {
    setRows(prev => prev.map(r => ({ ...r, selected: checked })));
  };

  const toggleRow = (idx: number) => {
    setRows(prev =>
      prev.map((r, i) => (i === idx ? { ...r, selected: !r.selected } : r))
    );
  };

  // Perform Batch Import
  const handleExecuteImport = async () => {
    const toImport = rows.filter(r => r.selected);
    if (toImport.length === 0) {
      setErrorMsg('يرجى تحديد زيارة واحدة على الأقل للاستيراد.');
      return;
    }

    setIsImporting(true);
    setErrorMsg(null);

    try {
      const payload = toImport.map(r => ({
        visit_date: r.visit_date,
        time_in: r.time_in,
        time_out: r.time_out,
        organization_en: r.organization_en,
        organization_ar: r.organization_ar,
        country: r.country,
        coordination_by: r.coordination_by || 'Ectron',
        visit_reason: r.visit_reason,
        notes: r.notes,
        visitors: r.visitors
      }));

      const res = await importHistoricalVisits(payload);
      if (res.success) {
        setImportResult({
          isOpen: true,
          importedCount: res.importedCount || 0,
          skippedCount: res.skippedCount || 0,
          totalCount: payload.length
        });
      } else {
        setErrorMsg(res.error || 'فشلت عملية الاستيراد');
      }
    } catch (e: any) {
      setErrorMsg(e?.message || 'خطأ أثناء تنفيذ الاستيراد');
    } finally {
      setIsImporting(false);
    }
  };

  // Counts
  const readyCount = rows.filter(r => r.status === 'ready').length;
  const duplicateCount = rows.filter(r => r.status === 'duplicate').length;
  const ambiguousCount = rows.filter(r => r.status === 'ambiguous').length;
  const selectedCount = rows.filter(r => r.selected).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900/60 p-6 rounded-3xl border border-border shadow-sm glass">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#173B63] to-[#0F766E] flex items-center justify-center text-white shadow-sm">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#173B63] dark:text-white">
              {t('Historical Visits Excel Import', 'استيراد سجلات الزيارات التاريخية (Excel Import)')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400">
              {t('Import visits from Excel file with multi-organization and visitor support', 'استيراد الزيارات من ملف `Ectron Visits List.xlsx` مع دعم الوفود والزوار المتعددين')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/visitor/dashboard"
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>{t('Visits Dashboard', 'لوحة الزيارات')}</span>
          </Link>
        </div>
      </div>

      {/* Upload & Source Controls */}
      <div className="bg-white dark:bg-zinc-900/60 p-6 rounded-3xl border border-border shadow-sm glass space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[#173B63] dark:text-white mb-1">
              {t('Visits Data Source', 'مصدر بيانات الزيارات')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              {t('The default visits list was loaded automatically, or you can upload a custom file.', 'تم تحميل ملف `Ectron Visits List.xlsx` الخاص بالنظام تلقائياً، أو يمكنك رفع ملف إكسل مخصص.')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleLoadDefault}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl bg-[#F0FDFA] dark:bg-zinc-800 text-[#0F766E] dark:text-[#00a99d] border border-[#14B8A6]/40 hover:bg-[#CCFBF1] text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{t('Reload Default System File', 'إعادة قراءة ملف النظام الافتراضي')}</span>
            </button>

            <label className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-[#0F766E]" />
              <span>{t('Upload Custom Excel File...', 'رفع ملف Excel آخر...')}</span>
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-border text-center">
            <span className="block text-xs text-slate-500 mb-0.5">{t('Total Parsed Records', 'إجمالي السجلات المقروءة')}</span>
            <span className="text-lg font-bold text-[#173B63] dark:text-white">{rows.length}</span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-center">
            <span className="block text-xs text-emerald-700 dark:text-emerald-400 mb-0.5">{t('Ready for Import', 'جاهزة للاستيراد')}</span>
            <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{readyCount}</span>
          </div>

          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-center">
            <span className="block text-xs text-amber-700 dark:text-amber-400 mb-0.5">{t('Requires Review', 'تتطلب مراجعة (بدون اسم)')}</span>
            <span className="text-lg font-bold text-amber-700 dark:text-amber-300">{ambiguousCount}</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-center">
            <span className="block text-xs text-slate-500 mb-0.5">{t('Duplicates (Already Imported)', 'مكررة بالفعل (مستوردة سابقاً)')}</span>
            <span className="text-lg font-bold text-slate-600 dark:text-zinc-400">{duplicateCount}</span>
          </div>
        </div>
      </div>

      {/* Error alert */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-center gap-3 text-red-700 dark:text-red-300 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="flex-1">{errorMsg}</p>
        </div>
      )}

      {/* Preview Table Card */}
      <div className="bg-white dark:bg-zinc-900/60 rounded-3xl border border-border shadow-sm overflow-hidden glass">
        <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="select-all"
              checked={selectedCount === rows.length && rows.length > 0}
              onChange={e => toggleSelectAll(e.target.checked)}
              className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
            />
            <label htmlFor="select-all" className="text-xs sm:text-sm font-bold text-[#173B63] dark:text-white cursor-pointer">
              {t('Preview Records Before Import', 'معاينة السجلات قبل الاستيراد')} ({t('Selected', 'محدد')} {selectedCount} {t('of', 'من')} {rows.length})
            </label>
          </div>

          <button
            type="button"
            disabled={selectedCount === 0 || isImporting}
            onClick={handleExecuteImport}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#173B63] to-[#0F766E] hover:from-[#132f4f] hover:to-[#0c5c56] text-white text-xs sm:text-sm font-bold shadow transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isImporting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{t('Importing visits...', 'جاري استيراد الزيارات...')}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{t('Import Selected Records', 'بدء استيراد السجلات المحددة')} ({selectedCount})</span>
              </>
            )}
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm border-collapse">
            <thead className="bg-slate-50 dark:bg-zinc-800/60 border-b border-border text-slate-700 dark:text-zinc-300 font-bold">
              <tr>
                <th className="py-3.5 px-3 text-center">{t('Select', 'اختيار')}</th>
                <th className="py-3.5 px-3">#</th>
                <th className="py-3.5 px-4">{t('Date', 'التاريخ')}</th>
                <th className="py-3.5 px-4">{t('Time In / Out', 'الدخول / الخروج')}</th>
                <th className="py-3.5 px-4">{t('Organization / Company', 'المؤسسة / الشركة')}</th>
                <th className="py-3.5 px-4">{t('Coordination by', 'عن طريق')}</th>
                <th className="py-3.5 px-4">{t('Extracted Visitors', 'الزوار المستخرجون')}</th>
                <th className="py-3.5 px-4">{t('Visit Reason', 'سبب الزيارة')}</th>
                <th className="py-3.5 px-4 text-center">{t('Status', 'الحالة')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    {t('Loading and reading Excel data...', 'جاري تحميل وقراءة بيانات الإكسل...')}
                  </td>
                </tr>
              ) : (
                rows.map((r, idx) => {
                  const visitorNames = r.visitors
                    .map(v => v.full_name_ar || v.full_name_en)
                    .filter(Boolean)
                    .join('، ');

                  return (
                    <tr
                      key={idx}
                      className={`hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors ${
                        r.status === 'duplicate' ? 'opacity-60 bg-slate-50/30' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={r.selected || false}
                          onChange={() => toggleRow(idx)}
                          className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                        />
                      </td>

                      <td className="py-3 px-3 font-bold text-slate-400">{r.sn}</td>

                      <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-800 dark:text-zinc-200">
                        {r.visit_date}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-600 dark:text-zinc-300">
                        {r.time_in} {r.time_out ? `→ ${r.time_out}` : ''}
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-800 dark:text-zinc-100 max-w-[200px] truncate">
                        <div>{r.organization_ar || r.organization_en || '—'}</div>
                        {r.organization_ar && r.organization_en && (
                          <div className="text-xs text-slate-400 truncate font-normal">{r.organization_en}</div>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-teal-50 dark:bg-teal-950/40 text-[#0F766E] dark:text-teal-400 border border-teal-200 dark:border-teal-800">
                          {r.coordination_by || 'Ectron'}
                        </span>
                      </td>

                      <td className="py-3 px-4 max-w-[220px]">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 font-bold text-xs border border-teal-200 dark:border-teal-800">
                            {r.visitors.length} {t('Visitors', 'زائر')}
                          </span>
                        </div>
                        <div className="text-slate-600 dark:text-zinc-300 truncate text-xs font-medium" title={visitorNames}>
                          {visitorNames || (r.isMissingNames ? t('Default rep generated', 'تم توليد ممثل افتراضي') : '—')}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-600 dark:text-zinc-400 max-w-[160px] truncate">
                        {r.visit_reason || '—'}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {r.status === 'ready' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                            <Check className="w-3 h-3" />
                            {t('Ready', 'جاهز للاستيراد')}
                          </span>
                        )}
                        {r.status === 'ambiguous' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                            <AlertTriangle className="w-3 h-3" />
                            {t('Names Missing', 'أسماء مفقودة')}
                          </span>
                        )}
                        {r.status === 'duplicate' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 dark:bg-zinc-800 dark:text-zinc-400">
                            {t('Already Imported', 'مستورد سابقاً')}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Success Dialog */}
      {importResult?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 max-w-md w-full border border-teal-200 dark:border-teal-900 shadow-2xl text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#173B63] to-[#14B8A6]" />

            <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 text-[#0F766E] dark:text-teal-400 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <h3 className="text-xl font-bold text-[#173B63] dark:text-white mb-2">
              {t('Import Completed Successfully!', 'اكتملت عملية الاستيراد بنجاح!')}
            </h3>

            <p className="text-xs text-slate-600 dark:text-zinc-300 mb-6">
              {t('Historical visit records have been imported into the system.', 'تم إدراج سجلات الزيارات التاريخية في النظام وربط الزوار بكل زيارة.')}
            </p>

            <div className="grid grid-cols-2 gap-3 mb-6 bg-slate-50 dark:bg-zinc-800 p-3 rounded-2xl border border-border text-xs">
              <div>
                <span className="block text-slate-400">{t('Imported Successfully', 'تم استيرادها بنجاح')}</span>
                <span className="text-base font-bold text-emerald-600">{importResult.importedCount}</span>
              </div>
              <div>
                <span className="block text-slate-400">{t('Skipped (Duplicates)', 'تم تخطيها (مكررة)')}</span>
                <span className="text-base font-bold text-slate-500">{importResult.skippedCount}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push('/visitor/dashboard')}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#173B63] to-[#0F766E] text-white text-xs sm:text-sm font-bold shadow hover:opacity-95 transition-all flex items-center justify-center gap-2"
            >
              <span>{t('Go to Updated Visits Dashboard', 'الانتقال إلى لوحة الزيارات المحدثة')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
