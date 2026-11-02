'use client';

import { useState, useEffect } from 'react';
import { UploadCloud, FileSpreadsheet, CheckCircle, AlertCircle, Clock, Calendar, Download, X, Trash2, User } from 'lucide-react';
import { useParams } from 'next/navigation';
import clsx from 'clsx';
import * as XLSX from 'xlsx';
import { createClient } from '@/lib/supabase';
import { useLanguage } from '@/components/layout/LanguageProvider';

export default function UploadPage() {
  const { t } = useLanguage();
  const params = useParams();
  const division = params.division;
  
  const [uploadMode, setUploadMode] = useState<'daily' | 'yearly'>('daily');
  const [shiftType, setShiftType] = useState<'shift' | 'official'>('shift');
  const [shift, setShift] = useState('shift1');
  
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [allowDateTyping, setAllowDateTyping] = useState(false);
  const [uploaderName, setUploaderName] = useState('');
  const [dailyTarget, setDailyTarget] = useState('640');
  const [note, setNote] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');

  const [history, setHistory] = useState<any[]>([]);
  const [selectedHistory, setSelectedHistory] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/upload?division=${division}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchHistory();
    fetchCurrentUser();
  }, [division]);

  const fetchCurrentUser = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('full_name, username').eq('id', user.id).single();
      if (profile && profile.full_name) {
        setUploaderName(profile.full_name);
      } else if (profile && profile.username) {
        setUploaderName(profile.username);
      } else {
        setUploaderName(user.email || 'Unknown');
      }
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setStatus('idle');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus('idle');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus('uploading');

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { cellDates: true });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];

      if (uploadMode === 'yearly') {
        const json: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        let dates: { dateStr: string, achIndex: number }[] = []; 
        let dailyData: Record<string, any> = {}; 

        for (let r = 0; r < json.length; r++) {
          const row = json[r];
          if (!row || !row.length) continue;
          
          const firstCell = String(row[0]).trim();
          
          if (firstCell === 'Date') {
            dates = [];
            for (let c = 1; c < row.length; c++) {
              if (row[c]) {
                let d = row[c];
                let dateStr = '';
                if (d instanceof Date) {
                  dateStr = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                } else if (typeof d === 'number') {
                  dateStr = new Date((d - 25569) * 86400 * 1000).toISOString().split('T')[0];
                } else {
                  const parsed = new Date(d);
                  if (!isNaN(parsed.getTime())) dateStr = parsed.toISOString().split('T')[0];
                }
                
                if (dateStr) {
                  dates.push({ dateStr, achIndex: c + 1 });
                  if (!dailyData[dateStr]) {
                    dailyData[dateStr] = { date: dateStr, assembly: 0, perso: 0, lasering: 0, packaging: 0, cartons: 0, palets: 0, cards: 0, insolation: 0, radiation_frequency: 0, calibration: 0, multy_test: 0, metrology: 0 };
                  }
                }
              }
            }
          } else if (dates.length > 0) {
            let dbKey = '';
            if (firstCell.includes('Assembly')) dbKey = 'assembly';
            else if (firstCell.includes('Perso')) dbKey = 'perso';
            else if (firstCell.includes('Lazi') || firstCell.includes('Laser')) dbKey = 'lasering';
            else if (firstCell.includes('Backag') || firstCell.includes('Packag')) dbKey = 'packaging';
            else if (firstCell.includes('Carton')) dbKey = 'cartons';
            else if (firstCell.includes('Palet')) dbKey = 'palets';
            else if (firstCell.includes('Card')) dbKey = 'cards';
            else if (firstCell.includes('Insol')) dbKey = 'insolation';
            else if (firstCell.includes('Radia')) dbKey = 'radiation_frequency';
            else if (firstCell.includes('Calib')) dbKey = 'calibration';
            else if (firstCell.includes('Multy')) dbKey = 'multy_test';
            else if (firstCell.includes('Metro')) dbKey = 'metrology';
            
            if (dbKey) {
              for (const d of dates) {
                const val = parseInt(row[d.achIndex]) || 0;
                dailyData[d.dateStr][dbKey] += val;
              }
            }
          }
        }
        
        // Override cards to always equal assembly for electricity
        if (division === 'electricity' || division === 'electricity-ecs1100') {
          Object.keys(dailyData).forEach(dateKey => {
            dailyData[dateKey].cards = dailyData[dateKey].assembly;
          });
        }
        
        const daysData = Object.values(dailyData);
        
        const res = await fetch('/api/upload/yearly', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ division, filename: file.name, daysData, uploaderName, target: parseInt(dailyTarget) || 640 })
        });

        if (!res.ok) throw new Error('Upload processing failed');

      } else {
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            division,
            date,
            shift: shiftType === 'official' ? 'official' : shift,
            rows: json,
            filename: file.name,
            uploaderName,
            target: parseInt(dailyTarget) || 640,
            note
          })
        });

        if (!res.ok) throw new Error('Upload processing failed');
      }

      setStatus('success');
      setShowSuccessModal(true);
      fetchHistory(); 
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/upload?id=${deletingId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setDeletingId(null);
        fetchHistory();
      } else {
        alert('Failed to delete report.');
      }
    } catch (e) {
      console.error(e);
      alert('An error occurred while deleting.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8 py-6 relative">
      <div>
        <h1 className="text-2xl font-bold text-[#173B63] dark:text-white">
          Data Entry - {division === 'water' ? 'Water Siconia' : division === 'electricity-ecs1100' ? 'Electricity ECS1100' : 'Electricity M212'}
        </h1>
        <p className="text-[#475569] dark:text-zinc-400 text-sm mt-1">Import Excel, CSV, or PDF files to automatically update the dashboard metrics.</p>
      </div>

      <div className="glass rounded-2xl p-8 border border-border dark:border-zinc-800/50 flex flex-col gap-8">
        
        {/* Mode Selection */}
        <div className="flex p-1 bg-[#F8FAFC] dark:bg-zinc-900/50 rounded-xl w-fit border border-border dark:border-zinc-800">
          <button
            onClick={() => setUploadMode('daily')}
            className={clsx(
              "px-6 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer",
              uploadMode === 'daily' ? "btn-primary-gradient bg-blue-600 text-white shadow-lg" : "text-[#475569] dark:text-zinc-400 hover:text-[#0F766E] hover:bg-[#F0FDFA] dark:hover:text-zinc-200 dark:hover:bg-transparent"
            )}
          >
            {t('Daily Shifts Report', 'تقرير شفتات')}
          </button>
          <button
            onClick={() => setUploadMode('yearly')}
            className={clsx(
              "px-6 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer",
              uploadMode === 'yearly' ? "btn-primary-gradient bg-blue-600 text-white shadow-lg" : "text-[#475569] dark:text-zinc-400 hover:text-[#0F766E] hover:bg-[#F0FDFA] dark:hover:text-zinc-200 dark:hover:bg-transparent"
            )}
          >
            {t('Yearly / Cumulative Report', 'تقرير تراكمي/سنوي')}
          </button>
        </div>

        {uploadMode === 'daily' && (
          <>
            {/* Date Selection */}
            <div>
              <label className="text-sm font-semibold text-[#173B63] dark:text-zinc-300 mb-3 block">{t('Select Date', 'تحديد التاريخ')}</label>
              <input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                onClick={(e) => {
                  if (!allowDateTyping) {
                    try { e.currentTarget.showPicker(); } catch (err) {}
                  }
                }}
                onDoubleClick={() => setAllowDateTyping(true)}
                onBlur={() => setAllowDateTyping(false)}
                onKeyDown={(e) => {
                  if (!allowDateTyping && e.key !== 'Tab') {
                    e.preventDefault();
                  }
                }}
                className={clsx(
                  "w-full bg-[#F8FAFC] dark:bg-zinc-900/50 border border-border dark:border-zinc-800 text-[#173B63] dark:text-zinc-200 rounded-xl p-4 focus:outline-none focus:border-[#14B8A6] dark:focus:border-blue-500/50 transition-colors",
                  !allowDateTyping && "cursor-pointer"
                )}
              />
            </div>

            {/* Shift Type Selection */}
            <div>
              <label className="text-sm font-semibold text-[#173B63] dark:text-zinc-300 mb-3 block">{t('Working Hours Type', 'نوع الدوام')}</label>
              <div className="grid grid-cols-2 gap-4 mb-4">
                 <label 
                    className={clsx(
                      "flex items-center justify-center gap-3 p-4 rounded-xl border cursor-pointer transition-all",
                      shiftType === 'shift' 
                        ? "bg-[#CCFBF1] dark:bg-blue-600/10 border-[#14B8A6] dark:border-blue-500 text-[#0F766E] dark:text-blue-400 font-medium" 
                        : "bg-[#F8FAFC] dark:bg-zinc-900/50 border-border dark:border-zinc-800 text-[#475569] dark:text-zinc-400 hover:bg-[#F0FDFA] hover:border-[#14B8A6]/50 dark:hover:bg-zinc-800"
                    )}
                    onClick={() => setShiftType('shift')}
                  >
                    <span>{t('Shifts', 'شفتات')}</span>
                  </label>
                  <label 
                    className={clsx(
                      "flex items-center justify-center gap-3 p-4 rounded-xl border cursor-pointer transition-all",
                      shiftType === 'official' 
                        ? "bg-[#CCFBF1] dark:bg-blue-600/10 border-[#14B8A6] dark:border-blue-500 text-[#0F766E] dark:text-blue-400 font-medium" 
                        : "bg-[#F8FAFC] dark:bg-zinc-900/50 border-border dark:border-zinc-800 text-[#475569] dark:text-zinc-400 hover:bg-[#F0FDFA] hover:border-[#14B8A6]/50 dark:hover:bg-zinc-800"
                    )}
                    onClick={() => setShiftType('official')}
                  >
                    <span>{t('Official Hours', 'دوام رسمي')}</span>
                  </label>
              </div>

              {shiftType === 'shift' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2">
                  {[
                    { id: 'shift1', label: t('Shift 1', 'الوردية 1') },
                    { id: 'shift2', label: t('Shift 2', 'الوردية 2') },
                    { id: 'shift3', label: t('Shift 3', 'الوردية 3') },
                    { id: 'all', label: t('All Shifts', 'كل الورديات') }
                  ].map(s => (
                    <label 
                      key={s.id} 
                      className={clsx(
                        "flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all",
                        shift === s.id 
                          ? "bg-[#CCFBF1] dark:bg-blue-600/10 border-[#14B8A6] dark:border-blue-500 text-[#0F766E] dark:text-blue-400 font-medium" 
                          : "bg-[#F8FAFC] dark:bg-zinc-900/50 border-border dark:border-zinc-800 text-[#475569] dark:text-zinc-400 hover:bg-[#F0FDFA] hover:border-[#14B8A6]/50 dark:hover:bg-zinc-800"
                      )}
                      onClick={() => setShift(s.id)}
                    >
                      <div className={clsx(
                        "w-4 h-4 rounded-full border flex items-center justify-center",
                        shift === s.id ? "border-[#0F766E] dark:border-blue-400" : "border-[#94A3B8] dark:border-zinc-600"
                      )}>
                        {shift === s.id && <div className="w-2 h-2 rounded-full bg-[#0F766E] dark:bg-blue-400" />}
                      </div>
                      <span className="text-sm">{s.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Uploader Name & Target */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-[#173B63] dark:text-zinc-300 mb-3 block">{t('Uploader Name', 'اسم رافع التقرير')}</label>
            <div className="w-full bg-[#F8FAFC] dark:bg-zinc-900/30 border border-border dark:border-zinc-800/80 text-[#475569] dark:text-zinc-400 rounded-xl p-4 cursor-not-allowed flex items-center gap-3">
               <User className="w-5 h-5 text-[#0F766E] dark:text-zinc-500" />
               {uploaderName ? <span className="text-[#173B63] dark:text-zinc-300 font-medium">{uploaderName}</span> : <span className="opacity-50">{t('Fetching name...', 'جاري جلب الاسم...')}</span>}
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-[#173B63] dark:text-zinc-300 mb-3 block">{t('Daily Target', 'الهدف اليومي')}</label>
            <input 
              type="number" 
              placeholder="e.g. 640"
              value={dailyTarget}
              onChange={(e) => setDailyTarget(e.target.value)}
              className="w-full bg-[#F8FAFC] dark:bg-zinc-900/50 border border-border dark:border-zinc-800 text-[#173B63] dark:text-zinc-200 rounded-xl p-4 focus:outline-none focus:border-[#14B8A6] dark:focus:border-blue-500/50 transition-colors"
            />
          </div>
        </div>

        {/* Note / Remark */}
        {uploadMode === 'daily' && (
          <div>
            <label className="text-sm font-semibold text-[#173B63] dark:text-zinc-300 mb-3 block">{t('Note / Remark', 'ملاحظات')}</label>
            <textarea 
              placeholder={t('Enter any notes or remarks for this day...', 'أدخل أي ملاحظات لهذا اليوم...')}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-[#F8FAFC] dark:bg-zinc-900/50 border border-border dark:border-zinc-800 text-[#173B63] dark:text-zinc-200 rounded-xl p-4 focus:outline-none focus:border-[#14B8A6] dark:focus:border-blue-500/50 transition-colors min-h-[100px] resize-y"
            />
          </div>
        )}

        {/* Drag and Drop Zone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={clsx(
            "relative flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-2xl transition-colors text-center",
            dragActive ? "border-[#14B8A6] dark:border-blue-500 bg-[#F0FDFA] dark:bg-blue-500/5" : "border-[#CBD5E1] dark:border-zinc-700 bg-[#F8FAFC] dark:bg-zinc-900/30 hover:bg-[#F0FDFA]/60 dark:hover:bg-zinc-900/60 hover:border-[#14B8A6] dark:hover:border-zinc-600",
            status === 'success' && "border-emerald-500/50 bg-emerald-500/5",
            status === 'error' && "border-danger/50 bg-danger/5"
          )}
        >
          <input
            type="file"
            accept=".xlsx,.xls,.csv,.pdf"
            onChange={handleChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          
          {status === 'success' ? (
            <div className="flex flex-col items-center text-emerald-600 dark:text-emerald-400 animate-in zoom-in">
              <CheckCircle className="w-16 h-16 mb-4" />
              <h3 className="text-xl font-bold mb-1">Upload Complete</h3>
              <p className="text-sm opacity-80">Data has been successfully imported to the database.</p>
            </div>
          ) : status === 'error' ? (
            <div className="flex flex-col items-center text-danger">
              <AlertCircle className="w-16 h-16 mb-4" />
              <h3 className="text-xl font-bold mb-1">Upload Failed</h3>
              <p className="text-sm opacity-80">There was an error parsing the file. Please try again.</p>
            </div>
          ) : file ? (
            <div className="flex flex-col items-center text-[#0F766E] dark:text-blue-400">
              <FileSpreadsheet className="w-16 h-16 mb-4" />
              <h3 className="text-xl font-bold mb-1">{file.name}</h3>
              <p className="text-sm opacity-80">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          ) : (
            <div className="flex flex-col items-center text-[#475569] dark:text-zinc-400">
              <div className="w-20 h-20 bg-[#CCFBF1]/60 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-6 text-[#0F766E] dark:text-zinc-300">
                <UploadCloud className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-[#173B63] dark:text-zinc-200 mb-2">Drag & Drop your file here</h3>
              <p className="text-sm max-w-sm mb-6">Supports Excel (.xlsx), CSV, and PDF formats. The system will automatically parse and save the data.</p>
              <button className="px-6 py-2.5 rounded-full bg-card dark:bg-zinc-800 border border-border dark:border-transparent text-[#0F766E] dark:text-white text-sm font-medium shadow-2xs pointer-events-none">
                Browse Files
              </button>
            </div>
          )}
        </div>

        {/* Action Button */}
        <button 
          onClick={handleUpload}
          disabled={!file || status === 'uploading' || status === 'success'}
          className="w-full py-4 rounded-xl btn-primary-gradient bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold text-lg hover:from-blue-500 hover:to-cyan-500 transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {status === 'uploading' ? 'Processing...' : 'Upload & Process Data'}
        </button>

      </div>

      {/* History Section */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-[#173B63] dark:text-white mb-6 flex items-center gap-2">
          <Download className="w-5 h-5 text-[#0F766E] dark:text-blue-400" />
          {t('Uploaded Files History', 'سجل الملفات المرفوعة (Downloads)')}
        </h2>
        
        <div className="flex flex-col gap-4">
          {history.length === 0 ? (
            <div className="text-[#64748B] dark:text-zinc-500 text-center py-8 glass rounded-2xl border border-border dark:border-zinc-800/50">
              {t('No files uploaded yet.', 'لا توجد ملفات مرفوعة بعد.')}
            </div>
          ) : (
            history.map((item) => (
              <div 
                key={item.id}
                className="glass rounded-xl p-5 border border-border dark:border-zinc-800/50 flex items-center justify-between hover:bg-[#F0FDFA]/60 dark:hover:bg-zinc-800/40 transition-colors group"
              >
                <div 
                  className="flex items-center gap-4 cursor-pointer flex-1"
                  onClick={() => setSelectedHistory(item)}
                >
                  <div className="w-12 h-12 rounded-xl bg-[#CCFBF1]/70 dark:bg-blue-500/10 text-[#0F766E] dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#173B63] dark:text-white mb-1">{item.filename}</h4>
                    <div className="flex items-center gap-4 text-sm text-[#475569] dark:text-zinc-400">
                      <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {item.date}</span>
                      <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {new Date(item.timestamp).toLocaleTimeString()}</span>
                      <span className="px-2 py-0.5 rounded bg-[#F0FDFA] dark:bg-zinc-800 border border-[#CCFBF1] dark:border-transparent text-xs text-[#0F766E] dark:text-zinc-300 capitalize">{item.shift}</span>
                    </div>
                    {item.uploaderName && item.uploaderName !== 'Unknown' && (
                      <div className="text-xs text-[#64748B] dark:text-zinc-500 mt-1">{t('Uploaded by:', 'تم الرفع بواسطة:')} <span className="text-[#173B63] dark:text-zinc-300">{item.uploaderName}</span></div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div 
                    onClick={() => setSelectedHistory(item)}
                    className="text-sm font-medium text-[#0F766E] dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer px-3 py-1 hover:bg-[#CCFBF1]/50 dark:hover:bg-blue-500/10 rounded-lg"
                  >
                    {t('View Data', 'عرض البيانات')}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingId(item.id);
                    }}
                    className="p-2 text-[#64748B] dark:text-zinc-500 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors cursor-pointer"
                    title={t('Delete Report', 'حذف التقرير')}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card dark:bg-zinc-900 border border-border dark:border-zinc-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-[#173B63] dark:text-white mb-2">{t('Report Uploaded Successfully!', 'تم رفع التقرير بنجاح!')}</h3>
            <p className="text-[#475569] dark:text-zinc-400 mb-6 text-sm">
              {t('The report is now available in the database.', 'التقرير جاهز الآن في قاعدة البيانات.')}
            </p>
            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setFile(null);
                  setStatus('idle');
                }}
                className="w-full py-2.5 rounded-xl btn-primary-gradient bg-blue-600 text-white font-medium hover:bg-blue-500 transition-colors cursor-pointer"
              >
                {t('Upload Another Report', 'رفع تقرير آخر')}
              </button>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full py-2.5 rounded-xl border border-border dark:border-zinc-700 text-[#475569] dark:text-zinc-300 font-medium hover:bg-[#F8FAFC] dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                {t('Close', 'إلغاء / إغلاق')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-xl font-bold text-[#173B63] dark:text-white mb-2">Delete Report?</h3>
            <p className="text-[#475569] dark:text-slate-400 mb-6 text-sm">
              Are you sure you want to delete this report? This will remove its data from the dashboard entirely. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingId(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl border border-border text-[#475569] dark:text-slate-300 font-medium hover:bg-[#F8FAFC] dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-danger text-white font-medium hover:bg-red-600 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for viewing full data */}
      {selectedHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-card rounded-2xl border border-border w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-border flex items-center justify-between bg-[#F8FAFC] dark:bg-slate-900/50">
              <div>
                <h3 className="text-xl font-bold text-[#173B63] dark:text-white mb-1">{selectedHistory.filename}</h3>
                <p className="text-sm text-[#475569] dark:text-slate-400">Uploaded on {new Date(selectedHistory.timestamp).toLocaleString()} • Shift: {selectedHistory.shift}</p>
              </div>
              <button 
                onClick={() => setSelectedHistory(null)}
                className="w-10 h-10 rounded-full bg-card border border-border hover:bg-[#F0FDFA] flex items-center justify-center text-[#475569] hover:text-[#0F766E] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-auto bg-background">
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
                {Object.entries(selectedHistory.summary).map(([key, val]) => (
                  <div key={key} className="glass p-4 rounded-xl border border-border text-center">
                    <div className="text-xs text-[#475569] dark:text-slate-400 uppercase tracking-wider mb-1 font-medium">{key}</div>
                    <div className="text-xl font-bold text-[#173B63] dark:text-white">{val as number}</div>
                  </div>
                ))}
              </div>

              {/* Full Data Table */}
              <h4 className="font-semibold text-[#173B63] dark:text-white mb-4">Raw Data Rows</h4>
              <FormattedDataTable rows={selectedHistory.rows} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const FormattedDataTable = ({ rows }: { rows: any[] }) => {
  const { t } = useLanguage();
  if (!rows || rows.length === 0) return null;

  const formattedRows = rows.map((row, idx) => {
    const keys = Object.keys(row);
    const getVal = (keywords: string[]) => {
      const k = keys.find(key => keywords.some(kw => key.toUpperCase().includes(kw.toUpperCase())));
      return k ? row[k] : undefined;
    };
    
    // Station
    let stationName = getVal(['STATION', 'NAME', 'OPERATION', 'المحطة', 'DESIGNATION']);
    if (!stationName) {
      stationName = Object.values(row).find(v => typeof v === 'string' && v.match(/[a-zA-Z]/) && !String(v).includes('BNR-')) || 'Unknown Station';
    }
    
    let code = getVal(['CODE', 'REFERENCE', 'ARTICLE']);
    if (!code) {
      code = Object.values(row).find(v => typeof v === 'string' && String(v).includes('BNR-')) || '';
    }

    // Numbers
    let passed = parseInt(getVal(['OK', 'PASS', 'GOOD', 'ناجح']) as string);
    let failed = parseInt(getVal(['KO', 'FAIL', 'DEFECT', 'رسب']) as string);
    let inputKey = keys.find(k => {
      const up = k.toUpperCase();
      return (up.includes('BOARD') || up.includes('INPUT') || up.includes('ENTRANT') || up.includes('دخل')) && !up.includes('OK') && !up.includes('KO');
    });
    let input = parseInt(inputKey ? row[inputKey] : undefined);
    
    let tests = parseInt(getVal(['TESTS', 'TOTAL', 'مرات']) as string);

    if (isNaN(passed)) passed = 0;
    if (isNaN(failed)) failed = 0;
    if (isNaN(input)) {
      if (passed > 0 || failed > 0) input = passed + failed;
      else input = 0;
    }
    if (isNaN(tests)) {
      if (input > 0) tests = input;
      else tests = passed + failed;
    }

    let fpy = input > 0 ? ((passed / input) * 100).toFixed(2) : '0.00';

    return { id: idx, stationName, code, tests, input, passed, failed, fpy };
  }).filter(r => r.input > 0 || r.passed > 0 || r.failed > 0 || r.tests > 0);

  if (formattedRows.length === 0) {
    return (
      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-[#F8FAFC] dark:bg-slate-900/80 text-[#475569] dark:text-slate-400 border-b border-border">
              <tr>
                {Object.keys(rows[0]).map(key => (
                  <th key={key} className="px-6 py-4 font-semibold whitespace-nowrap">{key}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row: any, i: number) => (
                <tr key={i} className="bg-transparent hover:bg-[#F0FDFA] dark:hover:bg-white/5 transition-colors">
                  {Object.values(row).map((val: any, j: number) => (
                    <td key={j} className="px-6 py-3 text-[#475569] dark:text-slate-300">{String(val)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-card rounded-xl overflow-hidden text-[#475569] dark:text-slate-300 shadow-xs border border-border">
      <div className="bg-card border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
           <span className="bg-[#CCFBF1] text-[#0F766E] dark:bg-[#14B8A6]/15 dark:text-[#2DD4BF] px-3 py-1 rounded-full text-xs font-bold">{formattedRows.length} {t('Stations', 'محطات')}</span>
        </div>
        <h3 className="font-bold text-[#173B63] dark:text-white text-lg">{t('Stations Details (Throughput & Yield)', 'تفاصيل المحطات (التدفق والإنتاجية)')}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-center">
          <thead className="bg-[#F8FAFC] dark:bg-slate-900 border-b border-border text-[#475569] dark:text-slate-400 font-bold text-[13px]">
            <tr>
              <th className="px-4 py-4 text-left whitespace-nowrap w-[200px]">{t('Station', 'المحطة')}</th>
              <th className="px-4 py-4 whitespace-nowrap">{t('Tests', 'مرات الفحص')}</th>
              <th className="px-4 py-4 whitespace-nowrap">{t('Input', 'المدخلات')}</th>
              <th className="px-4 py-4 whitespace-nowrap">{t('Passed (OK)', 'الناجح')}</th>
              <th className="px-4 py-4 whitespace-nowrap">{t('Failed (KO)', 'الراسب')}</th>
              <th className="px-4 py-4 whitespace-nowrap">{t('First Pass Yield (FPY %)', 'نسبة النجاح من أول مرة')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {formattedRows.map((row, i) => (
              <tr key={i} className="hover:bg-[#F0FDFA] dark:hover:bg-slate-800/40 transition-colors bg-card">
                <td className="px-4 py-3 text-right">
                  <div className="font-bold text-[#173B63] dark:text-slate-100 text-[14px]">{row.stationName}</div>
                  <div className="text-[11px] text-[#64748B] font-mono mt-0.5">{row.code}</div>
                </td>
                <td className="px-4 py-3 font-medium text-[#475569] dark:text-slate-400">{row.tests}</td>
                <td className="px-4 py-3 font-bold text-[#173B63] dark:text-slate-100">{row.input}</td>
                <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">{row.passed}</td>
                <td className="px-4 py-3 font-bold text-red-500">{row.failed}</td>
                <td className="px-4 py-3">
                  <span className={clsx(
                    "px-3 py-1.5 rounded-full text-[12px] font-bold border inline-block min-w-[60px]",
                    parseFloat(row.fpy) >= 95 ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" :
                    parseFloat(row.fpy) >= 80 ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20" :
                    "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
                  )}>
                    {row.fpy}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
