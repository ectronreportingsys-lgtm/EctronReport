'use client';

import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Loader2, Plus, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { getFormData, createExpense, getNextExpenseNoAction } from '@/app/(dashboard)/petty-cash/actions/pettyCashActions';
import { useLanguage } from '@/components/layout/LanguageProvider';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NewExpenseModal({ isOpen, onClose, onSuccess }: ModalProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [formDataOptions, setFormDataOptions] = useState<any>(null);
  
  const [expenseNo, setExpenseNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [amount, setAmount] = useState('');
  const [projectAllocations, setProjectAllocations] = useState<Array<{ projectId: string; percentage: number }>>([
    { projectId: '', percentage: 100 }
  ]);
  const [combinedProjectText, setCombinedProjectText] = useState('');
  const [isCustomText, setIsCustomText] = useState(false);
  const [attachmentName, setAttachmentName] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState(false);

  const handleAddProjectRow = () => {
    const currentTotal = projectAllocations.reduce((sum, p) => sum + (Number(p.percentage) || 0), 0);
    const remaining = Math.max(0, 100 - currentTotal);
    setProjectAllocations(prev => [
      ...prev,
      { projectId: '', percentage: remaining > 0 ? remaining : 0 }
    ]);
  };

  const handleRemoveProjectRow = (index: number) => {
    if (projectAllocations.length <= 1) return;
    setProjectAllocations(prev => prev.filter((_, i) => i !== index));
  };

  const handleProjectChange = (index: number, newProjectId: string) => {
    setProjectAllocations(prev => prev.map((item, i) => i === index ? { ...item, projectId: newProjectId } : item));
  };

  const handlePercentageChange = (index: number, val: string) => {
    const num = val === '' ? 0 : Number(val);
    setProjectAllocations(prev => prev.map((item, i) => i === index ? { ...item, percentage: num } : item));
  };

  // Auto-generate combined single-line project text e.g. "Ectron 80%, AAMU 20%"
  useEffect(() => {
    if (!isCustomText && formDataOptions?.projects) {
      const valid = projectAllocations.filter(a => a.projectId);
      if (valid.length === 0) {
        setCombinedProjectText('');
      } else if (valid.length === 1 && Number(valid[0].percentage) === 100) {
        const p = formDataOptions.projects.find((item: any) => item.id === valid[0].projectId);
        setCombinedProjectText(p ? p.name : '');
      } else {
        const text = valid.map(a => {
          const p = formDataOptions.projects.find((item: any) => item.id === a.projectId);
          const pName = p ? p.name : 'Project';
          return `${pName} ${a.percentage}%`;
        }).join(', ');
        setCombinedProjectText(text);
      }
    }
  }, [projectAllocations, formDataOptions, isCustomText]);

  useEffect(() => {
    if (isOpen) {
      setDataLoading(true);
      setError(null);
      setDuplicateWarning(false);
      const todayDate = new Date().toISOString().split('T')[0];
      setDate(todayDate);
      getFormData(todayDate).then((data) => {
        setFormDataOptions(data);
        setExpenseNo(data.nextExpenseNo);
        // Reset form
        setDescription('');
        setCategoryId('');
        setEmployeeId('');
        setAmount('');
        setProjectAllocations([{ projectId: '', percentage: 100 }]);
        setCombinedProjectText('');
        setIsCustomText(false);
        setAttachmentName('');
        setDataLoading(false);
      }).catch(err => {
        console.error(err);
        setError('Failed to load form data');
        setDataLoading(false);
      });
    }
  }, [isOpen]);

  const handleDateChange = async (newDate: string) => {
    setDate(newDate);
    try {
      const nextNo = await getNextExpenseNoAction(newDate);
      if (nextNo) {
        setExpenseNo(nextNo);
      }
    } catch (e) {
      console.error('Error updating expense number on date change:', e);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent, confirmDuplicate = false) => {
    e.preventDefault();
    setError(null);

    // Validate project allocations if at least one project is selected
    const activeAllocations = projectAllocations.filter(p => p.projectId);
    if (activeAllocations.length > 0) {
      const sum = activeAllocations.reduce((s, p) => s + (Number(p.percentage) || 0), 0);
      if (sum !== 100) {
        setError(t(`Project allocation percentages must equal 100% (Current total: ${sum}%)`, `مجموع نسب المشاريع يجب أن يكون 100% (المجموع الحالي: ${sum}%)`));
        return;
      }
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('expense_no', expenseNo);
    formData.append('expense_date', date);
    formData.append('request_description', description);
    formData.append('category_id', categoryId);
    formData.append('employee_id', employeeId);
    formData.append('amount', amount);
    if (combinedProjectText.trim()) {
      formData.append('project_text', combinedProjectText.trim());
    }
    if (activeAllocations.length > 0) {
      formData.append('project_allocations', JSON.stringify(activeAllocations));
    }
    if (confirmDuplicate) formData.append('confirm_duplicate', 'true');

    const input = document.getElementById('file-upload') as HTMLInputElement;
    let fileToUpload = null;
    let originalFile = null;
    let successMessage = t('Expense recorded successfully.', 'تم حفظ البيانات بنجاح.');

    if (input && input.files && input.files.length > 0) {
      originalFile = input.files[0];
      
      if (originalFile.type.startsWith('image/')) {
        try {
          const imageCompression = (await import('browser-image-compression')).default;
          const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true };
          fileToUpload = await imageCompression(originalFile, options);
          
          if (fileToUpload.size < originalFile.size) {
            const origSize = (originalFile.size / 1024 / 1024).toFixed(2);
            const compSize = (fileToUpload.size / 1024 / 1024).toFixed(2);
            successMessage = t(`Attachment compressed from ${origSize}MB to ${compSize}MB and saved successfully.`, `تم تقليل حجم الملف المرفق من ${origSize}MB إلى ${compSize}MB وتم حفظ البيانات بنجاح.`);
          }
        } catch (error) {
          console.error("Error compressing image", error);
          fileToUpload = originalFile;
        }
      } else {
        fileToUpload = originalFile;
        if (originalFile.type === 'application/pdf') {
          successMessage = t(`Expense recorded successfully. (Note: PDF saved at original size ${(originalFile.size / 1024 / 1024).toFixed(2)}MB)`, `تم حفظ البيانات بنجاح. (ملاحظة: تم حفظ ملف الـ PDF بحجمه الأصلي ${(originalFile.size / 1024 / 1024).toFixed(2)}MB)`);
        }
      }
      
      formData.append('attachment', fileToUpload || originalFile, (fileToUpload || originalFile).name);
    }

    try {
      const result = await createExpense(formData);
      if (result.error) {
        if (result.error === 'DUPLICATE_WARNING') {
          setDuplicateWarning(true);
          setError(result.message || 'Duplicate detected');
        } else {
          setError(result.error);
        }
      } else if (result.success) {
        alert(successMessage);
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const allProjects = formDataOptions?.projects || [];
  const baseProjects = allProjects.filter((p: any) => !p.name.includes('%'));
  const comboProjects = allProjects.filter((p: any) => p.name.includes('%'));
  const totalPercentage = projectAllocations.reduce((sum, p) => sum + (Number(p.percentage) || 0), 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[82vh] my-auto">
        <div className="flex justify-between items-center px-5 py-4 border-b border-zinc-800 shrink-0">
          <h2 className="text-lg font-bold text-white">New Petty Cash Expense</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
          {dataLoading ? (
            <div className="flex flex-col items-center justify-center h-40">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
              <p className="text-zinc-400">Loading form data...</p>
            </div>
          ) : (
            <form id="expense-form" onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
              
              {error && (
                <div className={`p-4 rounded-xl flex items-start gap-3 ${duplicateWarning ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400' : 'bg-danger/10 border border-danger/20 text-danger'}`}>
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">{error}</p>
                    {duplicateWarning && (
                      <button 
                        type="button"
                        onClick={(e) => handleSubmit(e, true)}
                        className="mt-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 px-3 py-1.5 rounded-lg text-sm transition-colors"
                      >
                        Yes, save anyway
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Expense No</label>
                  <input 
                    type="text" 
                    value={expenseNo} 
                    readOnly 
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-300 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Date <span className="text-danger">*</span></label>
                  <input 
                    type="date" 
                    required
                    value={date}
                    onChange={e => handleDateChange(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                  <label className="block text-xs font-medium text-zinc-400">Request Description <span className="text-danger">*</span></label>
                  {formDataOptions?.recurringDescriptions && formDataOptions.recurringDescriptions.length > 0 && (
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          setDescription(e.target.value);
                          e.target.value = '';
                        }
                      }}
                      defaultValue=""
                      className="text-xs bg-zinc-900 hover:bg-zinc-800 text-blue-400 border border-blue-500/30 rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer"
                    >
                      <option value="" disabled>{t('⚡ Select from recurring descriptions...', '⚡ اختيار من الأوصاف المتكررة...')}</option>
                      {formDataOptions.recurringDescriptions.map((item: any) => (
                        <option key={item.id} value={item.text} className="bg-zinc-800 text-white">
                          {item.text}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <textarea 
                  required
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder={t('Write expense description here (or select from recurring above)...', 'اكتب وصف المصروف هنا (أو اختر من الأوصاف المتكررة أعلاه)...')}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500 min-h-[60px] resize-y text-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Category <span className="text-danger">*</span></label>
                  <select 
                    required
                    value={categoryId}
                    onChange={e => setCategoryId(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select Category</option>
                    {formDataOptions?.categories.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Employee <span className="text-danger">*</span></label>
                  <select 
                    required
                    value={employeeId}
                    onChange={e => setEmployeeId(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select Employee</option>
                    {formDataOptions?.profiles.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.full_name || p.username}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Amount (OMR) <span className="text-danger">*</span></label>
                <input 
                  type="number" 
                  required
                  min="0.001"
                  step="0.001"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.000 (e.g. 2.835)"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              {/* Multi-Project Allocation Section */}
              <div className="bg-zinc-800/40 border border-zinc-700/60 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <label className="block text-sm font-semibold text-white">
                      {t('Project Allocation', 'المشاريع والنسب المئوية')}
                    </label>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {t('Select 100% for a single project or add multiple projects to split.', 'اختر مشروعاً بنسبة 100% افتراضياً أو أضف أكثر من مشروع لتوزيع النسب')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={clsx(
                      "text-xs px-2.5 py-1 rounded-full font-bold transition-colors border",
                      totalPercentage === 100 
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" 
                        : totalPercentage === 0
                        ? "bg-zinc-700/50 text-zinc-400 border-zinc-600/40"
                        : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                    )}>
                      Total: {totalPercentage}% {totalPercentage === 100 && '✓'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5">
                  {projectAllocations.map((alloc, idx) => {
                    const parsedAmount = parseFloat(amount);
                    const shareAmount = !isNaN(parsedAmount) && parsedAmount > 0 
                      ? (parsedAmount * ((Number(alloc.percentage) || 0) / 100)).toFixed(3) 
                      : null;

                    return (
                      <div key={idx} className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        {/* Project Select */}
                        <div className="flex-1 min-w-[200px]">
                          <select 
                            value={alloc.projectId}
                            onChange={e => handleProjectChange(idx, e.target.value)}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                          >
                            <option value="">{t('None / Select Project (Optional)', 'None / Select Project (اختياري)')}</option>
                            {baseProjects.length > 0 && (
                              <optgroup label={t('Projects', 'Projects (المشاريع الأساسية)')}>
                                {baseProjects.map((p: any) => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                              </optgroup>
                            )}
                            {comboProjects.length > 0 && (
                              <optgroup label="Pre-defined Splits">
                                {comboProjects.map((p: any) => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                              </optgroup>
                            )}
                          </select>
                        </div>

                        {/* Percentage Input */}
                        <div className="relative w-28 flex-shrink-0">
                          <input 
                            type="number"
                            min="1"
                            max="100"
                            step="1"
                            value={alloc.percentage === 0 ? '' : alloc.percentage}
                            onChange={e => handlePercentageChange(idx, e.target.value)}
                            placeholder="100"
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-3 pr-7 py-2 text-sm text-white focus:outline-none focus:border-blue-500 text-center font-bold"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400 pointer-events-none">%</span>
                        </div>

                        {/* Calculated Share Preview in OMR */}
                        {shareAmount && alloc.projectId && (
                          <div className="text-xs text-zinc-400 font-mono whitespace-nowrap bg-zinc-900/80 px-2.5 py-2 rounded-xl border border-zinc-800 flex-shrink-0" title={t('Calculated share in OMR', 'الحصة التقديرية بالريال')}>
                            OMR {shareAmount}
                          </div>
                        )}

                        {/* Delete Row button */}
                        {projectAllocations.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveProjectRow(idx)}
                            className="p-2 rounded-xl text-zinc-400 hover:text-danger hover:bg-danger/10 transition-colors flex-shrink-0 cursor-pointer"
                            title={t('Delete project row', 'حذف هذا المشروع')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleAddProjectRow}
                    className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-lg transition-colors border border-blue-500/20 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t('+ Add Another Project', '+ إضافة مشروع آخر (Add Project)')}</span>
                  </button>

                  {totalPercentage !== 100 && totalPercentage > 0 && (
                    <span className="text-xs text-amber-400/90 font-medium">
                      {t('⚠️ Total percentages must equal 100%', '⚠️ مجموع النسب يجب أن يساوي 100%')}
                    </span>
                  )}
                </div>

                {/* Assembled Single Line Project Text */}
                <div className="pt-2 border-t border-zinc-800 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium text-zinc-400">
                      {t('Combined Project Text:', 'النص المجمّع للمشروع (Combined Project Text):')}
                    </label>
                    {isCustomText && (
                      <button
                        type="button"
                        onClick={() => setIsCustomText(false)}
                        className="text-xs text-blue-400 hover:underline cursor-pointer"
                      >
                        {t('Reset Auto-generation', 'إعادة التوليد التلقائي')}
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={combinedProjectText}
                    onChange={e => {
                      setIsCustomText(true);
                      setCombinedProjectText(e.target.value);
                    }}
                    placeholder={t('e.g. Ectron 80%, AAMU 20% or Head Office', 'e.g. Ectron 80%, AAMU 20% أو Head Office')}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-blue-400 font-medium focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[11px] text-zinc-500">
                    {t('This combined text will be saved to the database and appears in the master sheet and edit dialog as a single line.', 'هذا النص هو ما سيتم حفظه في قاعدة البيانات ويظهر في الماستر شيت وفي نافذة التعديل كسطر واحد.')}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Receipt / Attachment (Optional)</label>
                <div 
                  className="w-full h-20 bg-zinc-800/50 border-2 border-dashed border-zinc-700 rounded-xl flex flex-col items-center justify-center text-zinc-400 hover:border-blue-500 hover:text-blue-400 transition-colors cursor-pointer"
                  onClick={() => document.getElementById('file-upload')?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      const file = e.dataTransfer.files[0];
                      // Display file name (simulated attach)
                      const input = document.getElementById('file-upload') as HTMLInputElement;
                      if (input) {
                        const dataTransfer = new DataTransfer();
                        dataTransfer.items.add(file);
                        input.files = dataTransfer.files;
                        setAttachmentName(file.name);
                      }
                    }
                  }}
                >
                  <input 
                    id="file-upload" 
                    type="file" 
                    className="hidden" 
                    name="attachment"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setAttachmentName(e.target.files[0].name);
                      }
                    }}
                  />
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm font-medium px-4 text-center truncate w-full">{attachmentName || "Click to browse or drag and drop"}</p>
                </div>
              </div>
            </form>
          )}
        </div>

        <div className="px-5 py-3.5 border-t border-zinc-800 flex justify-end gap-3 bg-zinc-900/50 rounded-b-2xl shrink-0">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            form="expense-form"
            disabled={loading || dataLoading || duplicateWarning}
            className="flex items-center gap-2 btn-primary-gradient bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-sm font-medium transition-colors shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save Expense
          </button>
        </div>
      </div>
    </div>
  );
}
