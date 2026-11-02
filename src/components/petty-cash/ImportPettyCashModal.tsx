'use client';

import React, { useState, useRef, useMemo } from 'react';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Calendar, 
  Layers, 
  User, 
  Tag, 
  Briefcase,
  HelpCircle,
  Hash,
  ArrowRight,
  Filter
} from 'lucide-react';
import clsx from 'clsx';
import * as XLSX from 'xlsx';
import { importPettyCashExpenses, ImportExpenseInputRow } from '@/app/(dashboard)/petty-cash/actions/pettyCashActions';
import { PettyCashBatch } from '@/app/(dashboard)/petty-cash/actions/batchesActions';
import { useLanguage } from '@/components/layout/LanguageProvider';

interface ImportPettyCashModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: { count: number; totalAmount: number }) => void;
  batches?: PettyCashBatch[];
  options?: {
    categories: any[];
    profiles: any[];
    projects: any[];
  };
}

interface ParsedExpenseRow {
  rawNo: string;
  date: string; // YYYY-MM-DD
  rawDate: string;
  description: string;
  categoryName: string;
  employeeName: string;
  amount: number;
  projectName: string;
  isValid: boolean;
  error?: string;
}

export default function ImportPettyCashModal({
  isOpen,
  onClose,
  onSuccess,
  batches = [],
  options
}: ImportPettyCashModalProps) {
  const { t } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Parsing result
  const [parsedRows, setParsedRows] = useState<ParsedExpenseRow[]>([]);
  const [detectedFormat, setDetectedFormat] = useState<'master' | 'standard' | null>(null);
  const [sheetName, setSheetName] = useState<string>('');

  // Configuration options
  const [defaultEmployeeId, setDefaultEmployeeId] = useState<string>('');
  const [defaultCategoryId, setDefaultCategoryId] = useState<string>('');
  const [autoCategorize, setAutoCategorize] = useState<boolean>(true);
  const [prefixMode, setPrefixMode] = useState<'monthly' | 'as_is'>('monthly');
  const [targetBatchId, setTargetBatchId] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean and parse cell value
  const cleanStr = (val: any): string => {
    if (val === undefined || val === null) return '';
    return String(val).trim();
  };

  // Parse excel serial or string date into YYYY-MM-DD
  const parseAnyDate = (val: any): { iso: string; display: string } | null => {
    if (!val) return null;

    // If numeric Excel date (number or numeric string like "46287")
    const numVal = typeof val === 'number' ? val : (typeof val === 'string' && /^\d{4,6}$/.test(val.trim()) ? parseFloat(val.trim()) : NaN);
    if (!isNaN(numVal) && numVal > 25000 && numVal < 90000) {
      try {
        const parsedDate = XLSX.SSF.parse_date_code(numVal);
        if (parsedDate && parsedDate.y && parsedDate.m && parsedDate.d) {
          const y = parsedDate.y;
          const m = String(parsedDate.m).padStart(2, '0');
          const d = String(parsedDate.d).padStart(2, '0');
          return { iso: `${y}-${m}-${d}`, display: `${y}-${m}-${d}` };
        }
      } catch (e) {}
    }

    const str = String(val).trim();
    if (!str) return null;

    // Check DD.MM.YYYY
    const dotMatch = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (dotMatch) {
      const d = dotMatch[1].padStart(2, '0');
      const m = dotMatch[2].padStart(2, '0');
      const y = dotMatch[3];
      return { iso: `${y}-${m}-${d}`, display: str };
    }

    // Check DD/MM/YYYY
    const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
      const d = slashMatch[1].padStart(2, '0');
      const m = slashMatch[2].padStart(2, '0');
      const y = slashMatch[3];
      return { iso: `${y}-${m}-${d}`, display: str };
    }

    // Check YYYY-MM-DD
    const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      const y = isoMatch[1];
      const m = isoMatch[2].padStart(2, '0');
      const d = isoMatch[3].padStart(2, '0');
      return { iso: `${y}-${m}-${d}`, display: str };
    }

    // Try standard Date.parse
    const timestamp = Date.parse(str);
    if (!isNaN(timestamp)) {
      const d = new Date(timestamp);
      const iso = d.toISOString().split('T')[0];
      return { iso, display: str };
    }

    return null;
  };

  // Parse amount string or number
  const parseAmount = (val: any): number => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    const cleaned = String(val).replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  // Process File
  const handleFileChange = async (selectedFile: File) => {
    setErrorMessage(null);
    setFile(selectedFile);
    setParsing(true);
    setParsedRows([]);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error(t('File does not contain valid worksheets.', 'الملف لا يحتوي على أوراق عمل صالحة.'));
      }

      const firstSheetName = workbook.SheetNames[0];
      setSheetName(firstSheetName);
      const worksheet = workbook.Sheets[firstSheetName];
      
      const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      if (!rawData || rawData.length === 0) {
        throw new Error(t('Worksheet is empty.', 'ورقة العمل فارغة.'));
      }

      // Step 1: Find Header Row
      let headerRowIndex = -1;
      let colMap = {
        no: -1,
        date: -1,
        desc: -1,
        category: -1,
        employee: -1,
        amount: -1,
        project: -1
      };

      for (let r = 0; r < Math.min(rawData.length, 25); r++) {
        const row = rawData[r].map(c => cleanStr(c).toLowerCase());
        
        let hasDate = -1;
        let hasDesc = -1;
        let hasAmount = -1;
        let hasNo = -1;
        let hasCat = -1;
        let hasEmp = -1;
        let hasProj = -1;

        row.forEach((cell, idx) => {
          if (cell.includes('expense no') || cell.includes('pcv no') || cell.includes('رقم المصروف') || cell.includes('المعرف') || (cell === 'no' || cell === 'no.' || cell === 'م')) {
            if (hasNo === -1) hasNo = idx;
          }
          if (cell.includes('date') || cell.includes('تاريخ') || cell.includes('التاريخ')) {
            if (hasDate === -1) hasDate = idx;
          }
          if (cell.includes('description') || cell.includes('request description') || cell.includes('البيان') || cell.includes('الوصف') || cell.includes('التفاصيل')) {
            if (hasDesc === -1) hasDesc = idx;
          }
          if (cell.includes('category') || cell.includes('التصنيف') || cell.includes('الفئة')) {
            if (hasCat === -1) hasCat = idx;
          }
          if (cell.includes('employee') || cell.includes('الموظف') || cell.includes('الاسم') || cell.includes('مستلم العهدة')) {
            if (hasEmp === -1) hasEmp = idx;
          }
          if (cell.includes('amount') || cell.includes('المبلغ') || cell.includes('total price') || cell.includes('القيمة') || cell.includes('omr')) {
            // Avoid matching summary titles like "total spent omr" as header cell if alone
            if (hasAmount === -1 && !cell.includes('spent') && !cell.includes('available')) hasAmount = idx;
          }
          if (cell.includes('project') || cell.includes('المشروع') || cell.includes('project name')) {
            if (hasProj === -1) hasProj = idx;
          }
        });

        // Valid header must have at least Date or Description, plus Amount
        if ((hasDate !== -1 || hasDesc !== -1) && (hasAmount !== -1 || hasProj !== -1)) {
          headerRowIndex = r;
          colMap = {
            no: hasNo,
            date: hasDate,
            desc: hasDesc,
            category: hasCat,
            employee: hasEmp,
            amount: hasAmount,
            project: hasProj
          };
          break;
        }
      }

      if (headerRowIndex === -1) {
        throw new Error(t('Could not find header row. Please ensure Date, Description, and Amount columns exist.', 'لم يتم العثور على صف العناوين الرئيسي في الملف. يرجى التأكد من وجود أعمدة (التاريخ، الوصف، المبلغ).'));
      }

      const hasCategoryCol = colMap.category !== -1;
      const hasEmployeeCol = colMap.employee !== -1;
      const isMasterFormat = hasCategoryCol || hasEmployeeCol;
      setDetectedFormat(isMasterFormat ? 'master' : 'standard');

      // Step 2: Extract Data Rows
      const rows: ParsedExpenseRow[] = [];
      const summaryKeywords = [
        'total', 'total spent', 'scrap', 'received in advance', 'extra amount',
        'amount available', 'new amount', 'total amount', 'prepared by', 'approved by',
        'received by', 'payment & receiving', 'الإجمالي', 'المجموع'
      ];

      for (let r = headerRowIndex + 1; r < rawData.length; r++) {
        const rawRow = rawData[r];
        if (!rawRow || rawRow.length === 0) continue;

        // Check if row is a summary or footer row
        const rowStr = rawRow.map(c => cleanStr(c).toLowerCase()).join(' ');
        if (!rowStr.trim()) continue;

        const isSummary = summaryKeywords.some(kw => rowStr.includes(kw));
        if (isSummary) {
          // Skip summary/total/signature rows (whether located at top or bottom)
          continue;
        }

        const rawNo = colMap.no !== -1 ? cleanStr(rawRow[colMap.no]) : '';
        const rawDateCell = colMap.date !== -1 ? rawRow[colMap.date] : null;
        const parsedDate = parseAnyDate(rawDateCell);
        
        const rawDesc = colMap.desc !== -1 ? cleanStr(rawRow[colMap.desc]) : '';
        const rawCat = colMap.category !== -1 ? cleanStr(rawRow[colMap.category]) : '';
        const rawEmp = colMap.employee !== -1 ? cleanStr(rawRow[colMap.employee]) : '';
        const rawAmt = colMap.amount !== -1 ? parseAmount(rawRow[colMap.amount]) : 0;
        const rawProj = colMap.project !== -1 ? cleanStr(rawRow[colMap.project]) : '';

        // If completely empty row (no date, no desc, no valid amount), skip
        if (!parsedDate && !rawDesc && rawAmt <= 0) continue;

        let error: string | undefined = undefined;
        let isValid = true;

        if (!parsedDate) {
          isValid = false;
          error = t('Invalid date', 'تاريخ غير صالح');
        } else if (rawAmt <= 0) {
          isValid = false;
          error = t('Invalid amount', 'المبلغ غير صالح');
        }

        rows.push({
          rawNo: rawNo || String(rows.length + 1).padStart(3, '0'),
          date: parsedDate?.iso || '',
          rawDate: parsedDate?.display || cleanStr(rawDateCell),
          description: rawDesc || t('General Expense', 'مصروف نثري عام'),
          categoryName: rawCat,
          employeeName: rawEmp,
          amount: rawAmt,
          projectName: rawProj || 'General / Factory Operations',
          isValid,
          error
        });
      }

      if (rows.length === 0) {
        throw new Error(t('No valid records found in file.', 'لم يتم العثور على أي قيود صالحة في الملف.'));
      }

      setParsedRows(rows);
    } catch (err: any) {
      console.error('Error parsing excel:', err);
      setErrorMessage(err.message || t('Error reading file. Please check file format.', 'حدث خطأ أثناء قراءة الملف. يرجى التحقق من صحة تنسيق الملف.'));
    } finally {
      setParsing(false);
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      handleFileChange(droppedFile);
    }
  };

  // Computed summary
  const validRows = useMemo(() => parsedRows.filter(r => r.isValid), [parsedRows]);
  const totalAmount = useMemo(() => validRows.reduce((sum, r) => sum + r.amount, 0), [validRows]);

  const dateRange = useMemo(() => {
    if (validRows.length === 0) return null;
    const sortedDates = [...validRows].map(r => r.date).filter(Boolean).sort();
    if (sortedDates.length === 0) return null;
    return {
      min: sortedDates[0],
      max: sortedDates[sortedDates.length - 1]
    };
  }, [validRows]);

  // Submit to Server
  const handleConfirmImport = async () => {
    if (validRows.length === 0) {
      setErrorMessage(t('No valid records to import.', 'لا توجد بيانات صالحة للاستيراد.'));
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const rowsPayload: ImportExpenseInputRow[] = validRows.map(r => ({
        expense_no: r.rawNo,
        expense_date: r.date,
        request_description: r.description,
        category_name: r.categoryName || undefined,
        employee_name: r.employeeName || undefined,
        amount: r.amount,
        project_name: r.projectName
      }));

      const res = await importPettyCashExpenses({
        rows: rowsPayload,
        defaultEmployeeId: defaultEmployeeId || null,
        defaultCategoryId: defaultCategoryId || null,
        autoCategorize,
        prefixMode,
        targetBatchId: targetBatchId || null
      });

      if (res.error) {
        throw new Error(res.error);
      }

      onSuccess({
        count: res.count || validRows.length,
        totalAmount: res.totalAmount || totalAmount
      });
      onClose();
    } catch (err: any) {
      console.error('Import error:', err);
      setErrorMessage(err.message || t('Error while saving records.', 'حدث خطأ أثناء حفظ القيود.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="glass bg-[#0F172A] border border-zinc-800 text-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800/80 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>{t('Upload & Import Petty Cash (Excel / CSV)', 'رفع واستيراد بيانات النثرية (Excel / CSV)')}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-medium">
                  Smart Importer
                </span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                {t('Supports Master Data formats, previous monthly files, and HR expense templates automatically', 'يدعم تنسيقات الماستر شيت الداخلية وتنسيقات الأشهر السابقة ونماذج HR تلقائياً')}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* File Upload Drop Area */}
          {!file ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={clsx(
                "border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all",
                isDragging 
                  ? "border-blue-500 bg-blue-500/10 scale-[1.01]" 
                  : "border-zinc-700/80 hover:border-blue-500/50 hover:bg-zinc-900/40 bg-zinc-900/20"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
              />
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4 border border-blue-500/20 shadow-md">
                <Upload className="w-7 h-7" />
              </div>
              <h3 className="text-base font-semibold text-white">
                {t('Click here to choose an Excel file or drag and drop it here', 'اضغط هنا لاختيار ملف Excel أو اسحبه إلى هذا المربع')}
              </h3>
              <p className="text-xs text-zinc-400 mt-1.5 max-w-md">
                {t('Accepts .xlsx, .xls, or .csv files. Columns, dates, amounts, and projects are automatically recognized.', 'يقبل ملفات .xlsx أو .xls أو .csv. يتعرف النظام تلقائياً على الأعمدة وتواريخ المصروفات والمبالغ والمشاريع.')}
              </p>
              
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-[11px] text-zinc-500">
                <span className="px-2.5 py-1 rounded-md bg-zinc-800/80 border border-zinc-700/50 text-zinc-300">
                  {t('October Format (Master Data)', 'تنسيق أكتوبر (ماستر شامل)')}
                </span>
                <span className="px-2.5 py-1 rounded-md bg-zinc-800/80 border border-zinc-700/50 text-zinc-300">
                  {t('Standard 5-column format', 'تنسيق سبتمبر والأشهر السابقة (5 أعمدة)')}
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-white">{file.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                    {sheetName && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                        {t('Sheet:', 'ورقة:')} {sheetName}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {detectedFormat === 'master' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        {t('Detected: Master Data (includes Employee & Category)', 'تم التعرف: ماستر شيت داخلي (يشمل الموظف والتصنيف)')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        {t('Detected: Standard Format (5 columns)', 'تم التعرف: تنسيق قياسي / أشهر سابقة (5 أعمدة)')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setFile(null);
                  setParsedRows([]);
                  setErrorMessage(null);
                }}
                className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
              >
                {t('Change File', 'تغيير الملف')}
              </button>
            </div>
          )}

          {/* Loading Indicator */}
          {parsing && (
            <div className="flex items-center justify-center py-10 gap-3 text-zinc-400">
              <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
              <span className="text-sm font-medium">{t('Parsing and analyzing columns...', 'جاري فحص وقراءة بيانات الملف وتحليل الأعمدة...')}</span>
            </div>
          )}

          {/* Error Notice */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Parsed Summary & Settings */}
          {parsedRows.length > 0 && !parsing && (
            <>
              {/* Stats Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
                  <span className="text-zinc-400 text-xs block">{t('Parsed Records Count', 'عدد القيود المقروءة')}</span>
                  <span className="text-xl font-bold text-white mt-0.5 block">{validRows.length}</span>
                  {parsedRows.length !== validRows.length && (
                    <span className="text-[10px] text-red-400">{t(`(${parsedRows.length - validRows.length} invalid records excluded)`, `(${parsedRows.length - validRows.length} قيود غير صالحة تم استبعادها)`)}</span>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
                  <span className="text-zinc-400 text-xs block">{t('Total Amount', 'إجمالي المبالغ')}</span>
                  <span className="text-xl font-bold text-emerald-400 mt-0.5 block">
                    {totalAmount.toFixed(3)} <span className="text-xs font-normal text-zinc-400">OMR</span>
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
                  <span className="text-zinc-400 text-xs block">{t('Date Range', 'الفترة الزمنية')}</span>
                  <span className="text-xs font-semibold text-zinc-200 mt-1 block truncate">
                    {dateRange ? `${dateRange.min} → ${dateRange.max}` : '-'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
                  <span className="text-zinc-400 text-xs block">{t('Data Format', 'نوع البيانات')}</span>
                  <span className="text-xs font-semibold text-blue-400 mt-1 block">
                    {detectedFormat === 'master' ? t('Master Data', 'Master Data (كامل)') : t('Standard', 'Standard (سابق)')}
                  </span>
                </div>
              </div>

              {/* Options & Mappings */}
              <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 space-y-4">
                <h4 className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-blue-400" />
                  <span>{t('Data Mapping & Assignment Settings', 'إعدادات مطابقة البيانات وتخصيص القيود')}</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  
                  {/* Default Employee (especially if format is standard/september) */}
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">
                      {t('Default Employee (for unassigned records):', 'الموظف الافتراضي (للقيود غير المعينة):')}
                    </label>
                    <select
                      value={defaultEmployeeId}
                      onChange={(e) => setDefaultEmployeeId(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="">{t('-- Leave Unassigned --', '-- دون تعيين موظف حالياً (Unassigned) --')}</option>
                      {(options?.profiles || []).map((p: any) => (
                        <option key={p.id} value={p.id}>
                          {p.full_name || p.username}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Batch Selection */}
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">
                      {t('Assign directly to Monthly Batch (Optional):', 'إضافة مباشرة إلى حزمة شهرية (اختياري):')}
                    </label>
                    <select
                      value={targetBatchId}
                      onChange={(e) => setTargetBatchId(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="">{t('-- No Batch Assigned --', '-- دون تخصيص لحزمة حالياً --')}</option>
                      {batches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.month}/{b.year})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Expense Number Prefix Mode */}
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">
                      {t('Expense Numbering Format:', 'صيغة رقم المصروف (Expense No):')}
                    </label>
                    <select
                      value={prefixMode}
                      onChange={(e) => setPrefixMode(e.target.value as any)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="monthly">{t('PC-YYYY-MM-### (Recommended - Prevents duplicates)', 'PC-YYYY-MM-### (موصى به - يمنع أي تكرار)')}</option>
                      <option value="as_is">{t('Keep original number from file (as is)', 'الرقم الأصلي من الشيت (إن وجد)')}</option>
                    </select>
                  </div>
                </div>

                {/* Auto Categorization Toggle */}
                <div className="flex flex-wrap items-center justify-between pt-2 border-t border-zinc-800/60 gap-3 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                    <input
                      type="checkbox"
                      checked={autoCategorize}
                      onChange={(e) => setAutoCategorize(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 bg-zinc-800 border-zinc-700 focus:ring-0"
                    />
                    <span>{t('Enable auto-categorization from description (if Category column missing)', 'تفعيل التصنيف الذكي التلقائي من نص الوصف (في حال عدم وجود عمود التصنيف)')}</span>
                  </label>

                  {/* Fallback category */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-zinc-400">{t('Fallback Category:', 'التصنيف البديل:')}</span>
                    <select
                      value={defaultCategoryId}
                      onChange={(e) => setDefaultCategoryId(e.target.value)}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                    >
                      <option value="">{t('Auto (Other / Office Supplies)', 'تلقائي (Other / Office Supplies)')}</option>
                      {(options?.categories || []).map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Preview Table (First 8 Rows) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
                  <span>{t(`Preview Parsed Records (showing first ${Math.min(8, validRows.length)} of ${validRows.length})`, `معاينة القيود المقروءة (عرض أول ${Math.min(8, validRows.length)} من إجمالي ${validRows.length} قيد)`)}</span>
                  <span className="text-[11px] text-emerald-400 font-medium">{t('✓ Ready to import', '✓ جاهزة للاستيراد')}</span>
                </div>

                <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-900/40">
                  <div className="overflow-x-auto max-h-56">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-900/90 text-zinc-400 sticky top-0 border-b border-zinc-800 text-[11px]">
                        <tr>
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">{t('Expense No', 'رقم المصروف')}</th>
                          <th className="py-2.5 px-3">{t('Date', 'التاريخ')}</th>
                          <th className="py-2.5 px-3">{t('Description', 'البيان / الوصف')}</th>
                          <th className="py-2.5 px-3">{t('Category', 'التصنيف')}</th>
                          <th className="py-2.5 px-3">{t('Employee', 'الموظف')}</th>
                          <th className="py-2.5 px-3">{t('Project', 'المشروع')}</th>
                          <th className="py-2.5 px-3 text-left">{t('Amount (OMR)', 'المبلغ (OMR)')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px]">
                        {validRows.slice(0, 8).map((r, i) => (
                          <tr key={i} className="hover:bg-zinc-800/30 transition-colors">
                            <td className="py-2 px-3 text-zinc-500 font-sans">{i + 1}</td>
                            <td className="py-2 px-3 text-zinc-300 font-medium">{r.rawNo}</td>
                            <td className="py-2 px-3 text-zinc-400 font-sans">{r.date}</td>
                            <td className="py-2 px-3 text-white font-sans max-w-[200px] truncate" title={r.description}>
                              {r.description}
                            </td>
                            <td className="py-2 px-3 font-sans">
                              {r.categoryName ? (
                                <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                                  {r.categoryName}
                                </span>
                              ) : (
                                <span className="text-zinc-500 italic">{t('Auto', 'تلقائي')}</span>
                              )}
                            </td>
                            <td className="py-2 px-3 font-sans">
                              {r.employeeName ? (
                                <span className="text-blue-300 font-medium">{r.employeeName}</span>
                              ) : (
                                <span className="text-zinc-500 italic">{t('Unassigned', 'غير محدد')}</span>
                              )}
                            </td>
                            <td className="py-2 px-3 font-sans text-zinc-300">{r.projectName}</td>
                            <td className="py-2 px-3 text-left font-bold text-emerald-400">
                              {r.amount.toFixed(3)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800/80 bg-zinc-900/60">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            {t('Cancel', 'إلغاء')}
          </button>

          <button
            onClick={handleConfirmImport}
            disabled={validRows.length === 0 || submitting}
            className={clsx(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md",
              validRows.length === 0 || submitting
                ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20 cursor-pointer"
            )}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t('Saving to Master Sheet...', 'جاري الحفظ والتسجيل في الماستر شيت...')}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{t(`Confirm & Import (${validRows.length} records - OMR ${totalAmount.toFixed(3)})`, `تأكيد واستيراد (${validRows.length} قيود - OMR ${totalAmount.toFixed(3)})`)}</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
