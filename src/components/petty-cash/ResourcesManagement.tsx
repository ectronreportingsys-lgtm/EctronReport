'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Users, 
  Briefcase, 
  Tags, 
  FileText, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  Loader2, 
  AlertTriangle, 
  Search,
  CheckCircle2,
  FolderPlus
} from 'lucide-react';
import clsx from 'clsx';
import { 
  createProject, 
  updateProject, 
  deleteProject,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleEmployeeAllowed,
  updateEmployeeName,
  addRecurringDescription,
  updateRecurringDescription,
  deleteRecurringDescription
} from '@/app/(dashboard)/petty-cash/actions/resourcesActions';
import { useLanguage } from '@/components/layout/LanguageProvider';

interface ResourcesProps {
  initialEmployees: any[];
  initialProjects: any[];
  initialCategories: any[];
  initialDescriptions: any[];
}

export default function ResourcesManagement({
  initialEmployees,
  initialProjects,
  initialCategories,
  initialDescriptions
}: ResourcesProps) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'employees' | 'projects' | 'categories' | 'descriptions'>('employees');

  // Lists state
  const [employees, setEmployees] = useState<any[]>(initialEmployees);
  const [projects, setProjects] = useState<any[]>(initialProjects);
  const [categories, setCategories] = useState<any[]>(initialCategories);
  const [descriptions, setDescriptions] = useState<any[]>(initialDescriptions);

  // Loading & Toast
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filter & Search states
  const [empSearch, setEmpSearch] = useState('');
  const [empFilter, setEmpFilter] = useState<'all' | 'active'>('all');
  const [projSearch, setProjSearch] = useState('');
  const [catSearch, setCatSearch] = useState('');
  const [descSearch, setDescSearch] = useState('');

  // Add Item states
  const [newProjectName, setNewProjectName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newDescText, setNewDescText] = useState('');

  // Inline Editing states
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [editingEmployeeName, setEditingEmployeeName] = useState('');

  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState('');

  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');

  const [editingDescId, setEditingDescId] = useState<string | null>(null);
  const [editingDescText, setEditingDescText] = useState('');

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'project' | 'category' | 'description';
    id: string;
    name: string;
  } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  /* ========================================================================= */
  /* 1. EMPLOYEE HANDLERS                                                      */
  /* ========================================================================= */
  const handleToggleEmployee = async (id: string) => {
    setLoading(true);
    try {
      const res = await toggleEmployeeAllowed(id);
      if (res.success) {
        setEmployees(prev => prev.map(emp => 
          emp.id === id ? { ...emp, isPettyCashAllowed: !emp.isPettyCashAllowed } : emp
        ));
        showToast('success', t('Employee status updated successfully.', 'تم تحديث حالة الموظف بنجاح.'));
      } else {
        showToast('error', t('Failed to update employee status.', 'فشل في تحديث حالة الموظف.'));
      }
    } catch (e: any) {
      showToast('error', e.message || t('Error while updating.', 'خطأ أثناء التحديث.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEmployeeName = async (id: string) => {
    if (!editingEmployeeName.trim()) return;
    setLoading(true);
    try {
      const res = await updateEmployeeName(id, editingEmployeeName);
      if (res.success) {
        setEmployees(prev => prev.map(emp => 
          emp.id === id ? { ...emp, full_name: editingEmployeeName.trim(), displayName: editingEmployeeName.trim() } : emp
        ));
        setEditingEmployeeId(null);
        showToast('success', t('Employee name updated successfully.', 'تم تعديل اسم الموظف بنجاح.'));
      } else {
        showToast('error', res.error || t('Failed to update employee name.', 'فشل في تعديل الاسم.'));
      }
    } catch (e: any) {
      showToast('error', e.message || t('Error while updating name.', 'خطأ أثناء تعديل الاسم.'));
    } finally {
      setLoading(false);
    }
  };

  /* ========================================================================= */
  /* 2. PROJECT HANDLERS                                                       */
  /* ========================================================================= */
  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    setLoading(true);
    try {
      const res = await createProject(newProjectName);
      if (res.success && res.data) {
        setProjects(prev => [...prev, ...res.data].sort((a, b) => a.name.localeCompare(b.name)));
        setNewProjectName('');
        showToast('success', t('Project added successfully.', 'تمت إضافة المشروع بنجاح.'));
      } else {
        showToast('error', res.error || t('Failed to add project.', 'فشل في إضافة المشروع.'));
      }
    } catch (e: any) {
      showToast('error', e.message || t('Error while adding project.', 'خطأ أثناء الإضافة.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProjectName = async (id: string) => {
    if (!editingProjectName.trim()) return;
    setLoading(true);
    try {
      const res = await updateProject(id, editingProjectName);
      if (res.success && res.data) {
        setProjects(prev => prev.map(p => p.id === id ? res.data[0] : p));
        setEditingProjectId(null);
        showToast('success', t('Project name updated successfully.', 'تم تعديل اسم المشروع بنجاح.'));
      } else {
        showToast('error', res.error || t('Failed to update project.', 'فشل في تعديل المشروع.'));
      }
    } catch (e: any) {
      showToast('error', e.message || t('Error while updating project.', 'خطأ أثناء التعديل.'));
    } finally {
      setLoading(false);
    }
  };

  /* ========================================================================= */
  /* 3. CATEGORY HANDLERS                                                      */
  /* ========================================================================= */
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setLoading(true);
    try {
      const res = await createCategory(newCategoryName);
      if (res.success && res.data) {
        setCategories(prev => [...prev, ...res.data].sort((a, b) => a.name.localeCompare(b.name)));
        setNewCategoryName('');
        showToast('success', t('Category added successfully.', 'تمت إضافة التصنيف بنجاح.'));
      } else {
        showToast('error', res.error || t('Failed to add category.', 'فشل في إضافة التصنيف.'));
      }
    } catch (e: any) {
      showToast('error', e.message || t('Error while adding category.', 'خطأ أثناء الإضافة.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCategoryName = async (id: string) => {
    if (!editingCategoryName.trim()) return;
    setLoading(true);
    try {
      const res = await updateCategory(id, editingCategoryName);
      if (res.success && res.data) {
        setCategories(prev => prev.map(c => c.id === id ? res.data[0] : c));
        setEditingCategoryId(null);
        showToast('success', t('Category name updated successfully.', 'تم تعديل اسم التصنيف بنجاح.'));
      } else {
        showToast('error', res.error || t('Failed to update category.', 'فشل في تعديل التصنيف.'));
      }
    } catch (e: any) {
      showToast('error', e.message || t('Error while updating category.', 'خطأ أثناء التعديل.'));
    } finally {
      setLoading(false);
    }
  };

  /* ========================================================================= */
  /* 4. RECURRING DESCRIPTION HANDLERS                                         */
  /* ========================================================================= */
  const handleAddDescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDescText.trim()) return;
    setLoading(true);
    try {
      const res = await addRecurringDescription(newDescText);
      if (res.success && res.item) {
        setDescriptions(prev => [...prev, res.item]);
        setNewDescText('');
        showToast('success', t('Recurring description added successfully.', 'تمت إضافة الوصف المتكرر بنجاح.'));
      } else {
        showToast('error', res.error || t('Failed to add description.', 'فشل في إضافة الوصف.'));
      }
    } catch (e: any) {
      showToast('error', e.message || t('Error while adding description.', 'خطأ أثناء الإضافة.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDescription = async (id: string) => {
    if (!editingDescText.trim()) return;
    setLoading(true);
    try {
      const res = await updateRecurringDescription(id, editingDescText);
      if (res.success && res.item) {
        setDescriptions(prev => prev.map(d => d.id === id ? res.item : d));
        setEditingDescId(null);
        showToast('success', t('Description updated successfully.', 'تم تعديل الوصف بنجاح.'));
      } else {
        showToast('error', res.error || t('Failed to update description.', 'فشل في تعديل الوصف.'));
      }
    } catch (e: any) {
      showToast('error', e.message || t('Error while updating description.', 'خطأ أثناء التعديل.'));
    } finally {
      setLoading(false);
    }
  };

  /* ========================================================================= */
  /* DELETE HANDLER                                                            */
  /* ========================================================================= */
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setLoading(true);
    try {
      if (deleteTarget.type === 'project') {
        const res = await deleteProject(deleteTarget.id);
        if (res.success) {
          setProjects(prev => prev.filter(p => p.id !== deleteTarget.id));
          showToast('success', t('Project deleted successfully.', 'تم حذف المشروع بنجاح.'));
        } else {
          showToast('error', res.error || t('Failed to delete project.', 'فشل في حذف المشروع.'));
        }
      } else if (deleteTarget.type === 'category') {
        const res = await deleteCategory(deleteTarget.id);
        if (res.success) {
          setCategories(prev => prev.filter(c => c.id !== deleteTarget.id));
          showToast('success', t('Category deleted successfully.', 'تم حذف التصنيف بنجاح.'));
        } else {
          showToast('error', res.error || t('Failed to delete category.', 'فشل في حذف التصنيف.'));
        }
      } else if (deleteTarget.type === 'description') {
        const res = await deleteRecurringDescription(deleteTarget.id);
        if (res.success) {
          setDescriptions(prev => prev.filter(d => d.id !== deleteTarget.id));
          showToast('success', t('Description deleted successfully.', 'تم حذف الوصف بنجاح.'));
        } else {
          showToast('error', t('Failed to delete description.', 'فشل في حذف الوصف.'));
        }
      }
      setDeleteTarget(null);
    } catch (e: any) {
      showToast('error', e.message || t('Error while deleting.', 'خطأ أثناء الحذف.'));
    } finally {
      setLoading(false);
    }
  };

  // Filtered lists
  const filteredEmployees = employees.filter(emp => {
    if (empFilter === 'active' && !emp.isPettyCashAllowed) return false;
    if (empSearch.trim()) {
      const q = empSearch.toLowerCase().trim();
      const name = (emp.full_name || '').toLowerCase();
      const user = (emp.username || '').toLowerCase();
      return name.includes(q) || user.includes(q);
    }
    return true;
  });

  const filteredProjects = projects.filter(p => 
    !projSearch.trim() || p.name.toLowerCase().includes(projSearch.toLowerCase().trim())
  );

  const filteredCategories = categories.filter(c => 
    !catSearch.trim() || c.name.toLowerCase().includes(catSearch.toLowerCase().trim())
  );

  const filteredDescriptions = descriptions.filter(d => 
    !descSearch.trim() || d.text.toLowerCase().includes(descSearch.toLowerCase().trim())
  );

  const activeEmployeeCount = employees.filter(e => e.isPettyCashAllowed).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Toast Alert */}
      {toast && (
        <div className={clsx(
          "p-4 rounded-xl flex items-center justify-between text-sm font-medium animate-in fade-in duration-200 border shadow-lg",
          toast.type === 'success' 
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" 
            : "bg-danger/10 text-danger border-danger/30"
        )}>
          <div className="flex items-center gap-3">
            {toast.type === 'success' ? <Check className="w-5 h-5 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
            <span>{toast.text}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-zinc-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link 
            href="/petty-cash/dashboard" 
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
            title={t("Back to Petty Cash Dashboard", "العودة إلى لوحة تحكم العهدة")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">{t("Resources Management", "إدارة المصادر والقوائم")}</h1>
            <p className="text-zinc-400 text-sm mt-0.5">
              {t("Manage eligible employees, projects, categories, and recurring descriptions", "تحديد الموظفين المصرح لهم، وإدارة المشاريع والتصنيفات ونصوص الوصف المتكررة")}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-zinc-900 border border-zinc-800 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('employees')}
          className={clsx(
            "flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-medium transition-all",
            activeTab === 'employees' 
              ? "bg-blue-600 text-white shadow-md" 
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
          )}
        >
          <Users className="w-4 h-4" />
          <span>{t("Employees", "الموظفون")}</span>
          <span className={clsx(
            "text-xs px-2 py-0.5 rounded-full font-bold",
            activeTab === 'employees' ? "bg-white/20 text-white" : "bg-zinc-800 text-blue-400"
          )}>
            {activeEmployeeCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('projects')}
          className={clsx(
            "flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-medium transition-all",
            activeTab === 'projects' 
              ? "bg-purple-600 text-white shadow-md" 
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
          )}
        >
          <Briefcase className="w-4 h-4" />
          <span>{t("Projects", "المشاريع")}</span>
          <span className={clsx(
            "text-xs px-2 py-0.5 rounded-full font-bold",
            activeTab === 'projects' ? "bg-white/20 text-white" : "bg-zinc-800 text-purple-400"
          )}>
            {projects.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={clsx(
            "flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-medium transition-all",
            activeTab === 'categories' 
              ? "bg-emerald-600 text-white shadow-md" 
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
          )}
        >
          <Tags className="w-4 h-4" />
          <span>{t("Categories", "التصنيفات")}</span>
          <span className={clsx(
            "text-xs px-2 py-0.5 rounded-full font-bold",
            activeTab === 'categories' ? "bg-white/20 text-white" : "bg-zinc-800 text-emerald-400"
          )}>
            {categories.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('descriptions')}
          className={clsx(
            "flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-medium transition-all",
            activeTab === 'descriptions' 
              ? "bg-amber-600 text-white shadow-md" 
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
          )}
        >
          <FileText className="w-4 h-4" />
          <span>{t("Descriptions", "الأوصاف المتكررة")}</span>
          <span className={clsx(
            "text-xs px-2 py-0.5 rounded-full font-bold",
            activeTab === 'descriptions' ? "bg-white/20 text-white" : "bg-zinc-800 text-amber-400"
          )}>
            {descriptions.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: EMPLOYEES                                                          */}
      {/* ========================================================================= */}
      {activeTab === 'employees' && (
        <div className="glass rounded-2xl p-6 border border-border flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                {t("Eligible Employees for Petty Cash", "الموظفون المصرح لهم في العهدة")}
              </h2>
              <p className="text-zinc-400 text-xs mt-1">
                {t("Active employees here will appear in the employee selection dropdown when recording expenses.", "الموظفون المفعّلون هنا سيظهرون في قائمة اختيار الموظف عند تسجيل أي فاتورة أو مصروف جديد.")}
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400 font-medium">
              <span>{t("Currently Active:", "المفعّلون حالياً:")}</span>
              <span className="font-bold text-white">{t(`${activeEmployeeCount} employees`, `${activeEmployeeCount} موظف`)}</span>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t("Search employee by name or staff ID...", "بحث عن موظف بالاسم أو الرقم الوظيفي...")}
                value={empSearch}
                onChange={e => setEmpSearch(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEmpFilter('all')}
                className={clsx(
                  "flex-1 py-2 rounded-xl text-xs font-medium border transition-colors",
                  empFilter === 'all' 
                    ? "bg-zinc-800 text-white border-zinc-700" 
                    : "text-zinc-400 border-zinc-800 hover:bg-zinc-800/40"
                )}
              >
                {t(`All (${employees.length})`, `الكل (${employees.length})`)}
              </button>
              <button
                onClick={() => setEmpFilter('active')}
                className={clsx(
                  "flex-1 py-2 rounded-xl text-xs font-medium border transition-colors",
                  empFilter === 'active' 
                    ? "bg-blue-600/20 text-blue-400 border-blue-500/30" 
                    : "text-zinc-400 border-zinc-800 hover:bg-zinc-800/40"
                )}
              >
                {t(`Active for PC (${activeEmployeeCount})`, `المفعّلون للعهدة فقط (${activeEmployeeCount})`)}
              </button>
            </div>
          </div>

          {/* Employees Table */}
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-zinc-400 bg-zinc-800/50 uppercase">
                <tr>
                  <th className="px-4 py-3 text-center w-24">{t("Active for PC", "مفعّل للعهدة")}</th>
                  <th className="px-4 py-3">{t("Employee Name", "اسم الموظف")}</th>
                  <th className="px-4 py-3">{t("Staff ID / Username", "الرقم الوظيفي / المعرف")}</th>
                  <th className="px-4 py-3 text-center w-36">{t("Actions", "الإجراءات")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                      {t("No employees matching your search.", "لا يوجد موظفون مطابقون لبحثك.")}
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map(emp => {
                    const isAllowed = !!emp.isPettyCashAllowed;
                    const isEditing = editingEmployeeId === emp.id;

                    return (
                      <tr 
                        key={emp.id}
                        className={clsx(
                          "border-b border-zinc-800/50 transition-colors",
                          isAllowed ? "bg-blue-500/5 hover:bg-blue-500/10" : "hover:bg-zinc-800/30 opacity-70"
                        )}
                      >
                        {/* Toggle Checkbox */}
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={isAllowed}
                            onChange={() => handleToggleEmployee(emp.id)}
                            disabled={loading}
                            className="w-4 h-4 rounded bg-zinc-800 border-zinc-600 text-blue-600 focus:ring-0 cursor-pointer accent-blue-600"
                            title={isAllowed ? t("Disable for petty cash", "إلغاء التفعيل للعهدة") : t("Enable for petty cash", "تفعيل للعهدة")}
                          />
                        </td>

                        {/* Name */}
                        <td className="px-4 py-3 font-medium text-white">
                          {isEditing ? (
                            <div className="flex items-center gap-2 max-w-sm">
                              <input
                                type="text"
                                value={editingEmployeeName}
                                onChange={e => setEditingEmployeeName(e.target.value)}
                                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1 text-sm text-white focus:outline-none focus:border-blue-500 flex-1"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveEmployeeName(emp.id)}
                                disabled={loading}
                                className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                                title={t("Save", "حفظ")}
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingEmployeeId(null)}
                                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors"
                                title={t("Cancel", "إلغاء")}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span>{emp.displayName}</span>
                              {isAllowed && (
                                <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-semibold">
                                  {t("Active for PC", "متاح للعهدة")}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Username */}
                        <td className="px-4 py-3 text-zinc-400 text-xs font-mono">
                          {emp.username}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                setEditingEmployeeId(emp.id);
                                setEditingEmployeeName(emp.full_name || emp.displayName);
                              }}
                              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                              title={t("Edit Name", "تعديل الاسم")}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleEmployee(emp.id)}
                              disabled={loading}
                              className={clsx(
                                "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors",
                                isAllowed
                                  ? "bg-danger/10 text-danger hover:bg-danger/20"
                                  : "bg-blue-600/20 text-blue-400 hover:bg-blue-600/30"
                              )}
                            >
                              {isAllowed ? t('Disable', 'تعطيل') : t('Enable', 'تفعيل')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PROJECTS                                                           */}
      {/* ========================================================================= */}
      {activeTab === 'projects' && (
        <div className="glass rounded-2xl p-6 border border-border flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-purple-400" />
                {t("Projects Management", "إدارة المشاريع")}
              </h2>
              <p className="text-zinc-400 text-xs mt-1">
                {t("Add new projects, edit names, or delete them to appear in expense options.", "إضافة مشاريع جديدة أو تعديل أسمائها أو حذفها لتظهر في خيارات تسجيل المصروفات.")}
              </p>
            </div>
            <div className="text-xs px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 font-bold">
              {t("Total Projects:", "إجمالي المشاريع:")} {projects.length}
            </div>
          </div>

          {/* Quick Add Form */}
          <form onSubmit={handleAddProject} className="flex gap-3">
            <input
              type="text"
              required
              placeholder={t("New project name (e.g. ECT Project)...", "اسم المشروع الجديد (e.g. ECT Project)...")}
              value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
            />
            <button
              type="submit"
              disabled={loading || !newProjectName.trim()}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>{t("Add Project", "إضافة مشروع")}</span>
            </button>
          </form>

          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t("Search projects...", "بحث في المشاريع...")}
              value={projSearch}
              onChange={e => setProjSearch(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Projects Table */}
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-zinc-400 bg-zinc-800/50 uppercase">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">{t("Project Name", "اسم المشروع")}</th>
                  <th className="px-4 py-3 text-center w-28">{t("Status", "الحالة")}</th>
                  <th className="px-4 py-3 text-center w-36">{t("Actions", "الإجراءات")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                      {t("No projects added yet.", "لا توجد مشاريع مضافة.")}
                    </td>
                  </tr>
                ) : (
                  filteredProjects.map((proj, idx) => {
                    const isEditing = editingProjectId === proj.id;
                    return (
                      <tr key={proj.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                        <td className="px-4 py-3 text-zinc-500 text-xs w-12">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium text-white">
                          {isEditing ? (
                            <div className="flex items-center gap-2 max-w-sm">
                              <input
                                type="text"
                                value={editingProjectName}
                                onChange={e => setEditingProjectName(e.target.value)}
                                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1 text-sm text-white focus:outline-none focus:border-purple-500 flex-1"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveProjectName(proj.id)}
                                disabled={loading}
                                className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white"
                                title={t("Save", "حفظ")}
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingProjectId(null)}
                                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400"
                                title={t("Cancel", "إلغاء")}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <span>{proj.name}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">
                            {t("Active", "نشط")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                setEditingProjectId(proj.id);
                                setEditingProjectName(proj.name);
                              }}
                              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                              title={t("Edit project name", "تعديل اسم المشروع")}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget({ type: 'project', id: proj.id, name: proj.name })}
                              className="p-1.5 rounded-lg hover:bg-danger/10 text-zinc-400 hover:text-danger transition-colors"
                              title={t("Delete project", "حذف المشروع")}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CATEGORIES                                                         */}
      {/* ========================================================================= */}
      {activeTab === 'categories' && (
        <div className="glass rounded-2xl p-6 border border-border flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Tags className="w-5 h-5 text-emerald-400" />
                {t("Expense Categories Management", "إدارة فئات المصروفات")}
              </h2>
              <p className="text-zinc-400 text-xs mt-1">
                {t("Add new categories, edit names, or delete them to appear in expense category options.", "إضافة تصنيفات جديدة أو تعديل أسمائها أو حذفها لتظهر في خيارات فئات المصروفات.")}
              </p>
            </div>
            <div className="text-xs px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
              {t("Total Categories:", "إجمالي التصنيفات:")} {categories.length}
            </div>
          </div>

          {/* Quick Add Form */}
          <form onSubmit={handleAddCategory} className="flex gap-3">
            <input
              type="text"
              required
              placeholder={t("New category name (e.g. Office Supplies)...", "اسم التصنيف الجديد (e.g. Office Supplies)...")}
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={loading || !newCategoryName.trim()}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>{t("Add Category", "إضافة تصنيف")}</span>
            </button>
          </form>

          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t("Search categories...", "بحث في التصنيفات...")}
              value={catSearch}
              onChange={e => setCatSearch(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Categories Table */}
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-zinc-400 bg-zinc-800/50 uppercase">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">{t("Category Name", "اسم التصنيف")}</th>
                  <th className="px-4 py-3 text-center w-28">{t("Status", "الحالة")}</th>
                  <th className="px-4 py-3 text-center w-36">{t("Actions", "الإجراءات")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                      {t("No categories added yet.", "لا توجد تصنيفات مضافة.")}
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((cat, idx) => {
                    const isEditing = editingCategoryId === cat.id;
                    return (
                      <tr key={cat.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                        <td className="px-4 py-3 text-zinc-500 text-xs w-12">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium text-white">
                          {isEditing ? (
                            <div className="flex items-center gap-2 max-w-sm">
                              <input
                                type="text"
                                value={editingCategoryName}
                                onChange={e => setEditingCategoryName(e.target.value)}
                                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1 text-sm text-white focus:outline-none focus:border-emerald-500 flex-1"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveCategoryName(cat.id)}
                                disabled={loading}
                                className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white"
                                title={t("Save", "حفظ")}
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingCategoryId(null)}
                                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400"
                                title={t("Cancel", "إلغاء")}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <span>{cat.name}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">
                            {t("Active", "نشط")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                setEditingCategoryId(cat.id);
                                setEditingCategoryName(cat.name);
                              }}
                              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                              title={t("Edit category name", "تعديل اسم التصنيف")}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget({ type: 'category', id: cat.id, name: cat.name })}
                              className="p-1.5 rounded-lg hover:bg-danger/10 text-zinc-400 hover:text-danger transition-colors"
                              title={t("Delete category", "حذف التصنيف")}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: RECURRING DESCRIPTIONS                                             */}
      {/* ========================================================================= */}
      {activeTab === 'descriptions' && (
        <div className="glass rounded-2xl p-6 border border-border flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                {t("Recurring Descriptions Management", "الأوصاف المتكررة")}
              </h2>
              <p className="text-zinc-400 text-xs mt-1">
                {t("Recurring descriptions appear in quick select during expense entry for faster recording.", "نصوص الوصف المتكررة تظهر في القائمة السريعة عند تسجيل أي فاتورة لتسريع الإدخال كخيار اختياري.")}
              </p>
            </div>
            <div className="text-xs px-3 py-1.5 rounded-xl bg-amber-500/10 border border-purple-500/20 text-amber-400 font-bold">
              {t("Total Descriptions:", "إجمالي الأوصاف:")} {descriptions.length}
            </div>
          </div>

          {/* Quick Add Form */}
          <form onSubmit={handleAddDescription} className="flex gap-3">
            <input
              type="text"
              required
              placeholder={t("New recurring description text (e.g. Hospitality and snacks)...", "نص الوصف المتكرر الجديد (e.g. ضيافة واجتماعات ووجبات خفيفة)...")}
              value={newDescText}
              onChange={e => setNewDescText(e.target.value)}
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              disabled={loading || !newDescText.trim()}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>{t("Add Description", "إضافة وصف")}</span>
            </button>
          </form>

          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t("Search recurring descriptions...", "بحث في الأوصاف المتكررة...")}
              value={descSearch}
              onChange={e => setDescSearch(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Descriptions Table */}
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-zinc-400 bg-zinc-800/50 uppercase">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">{t("Description Text", "نص الوصف")}</th>
                  <th className="px-4 py-3 text-center w-36">{t("Actions", "الإجراءات")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredDescriptions.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-zinc-500">
                      {t("No recurring descriptions added yet.", "لا توجد أوصاف متكررة مضافة.")}
                    </td>
                  </tr>
                ) : (
                  filteredDescriptions.map((desc, idx) => {
                    const isEditing = editingDescId === desc.id;
                    return (
                      <tr key={desc.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                        <td className="px-4 py-3 text-zinc-500 text-xs w-12">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium text-white">
                          {isEditing ? (
                            <div className="flex items-center gap-2 max-w-lg">
                              <input
                                type="text"
                                value={editingDescText}
                                onChange={e => setEditingDescText(e.target.value)}
                                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1 text-sm text-white focus:outline-none focus:border-amber-500 flex-1"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveDescription(desc.id)}
                                disabled={loading}
                                className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white"
                                title={t("Save", "حفظ")}
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingDescId(null)}
                                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400"
                                title={t("Cancel", "إلغاء")}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <span>{desc.text}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                setEditingDescId(desc.id);
                                setEditingDescText(desc.text);
                              }}
                              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                              title={t("Edit description", "تعديل الوصف")}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget({ type: 'description', id: desc.id, name: desc.text })}
                              className="p-1.5 rounded-lg hover:bg-danger/10 text-zinc-400 hover:text-danger transition-colors"
                              title={t("Delete description", "حذف الوصف")}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE CONFIRMATION MODAL                                                 */}
      {/* ========================================================================= */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div 
            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl p-6 flex flex-col gap-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-danger/10 text-danger flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{t("Confirm Delete", "تأكيد الحذف")}</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  {t(
                    `Are you sure you want to delete this ${deleteTarget.type === 'project' ? 'project' : deleteTarget.type === 'category' ? 'category' : 'description'}:`,
                    `هل أنت متأكد من حذف ${deleteTarget.type === 'project' ? 'المشروع' : deleteTarget.type === 'category' ? 'التصنيف' : 'الوصف'}:`
                  )}
                  <br />
                  <span className="text-white font-semibold mt-1 inline-block">"{deleteTarget.name}"</span>?
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                {t("Cancel", "إلغاء")}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium bg-danger hover:bg-red-600 text-white transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>{t("Permanent Delete", "حذف نهائي")}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
