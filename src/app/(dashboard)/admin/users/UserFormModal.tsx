'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2 } from 'lucide-react';
import { useLanguage } from '@/components/layout/LanguageProvider';

interface UserFormModalProps {
  user?: any;
  roles: any[];
  onClose: () => void;
  onSuccess: (user: any) => void;
}

export const PERMISSION_MODULES = [
  {
    moduleEn: 'Electricity Division (M212)',
    moduleAr: 'قسم الكهرباء (M212)',
    permissions: [
      { key: 'electricity_dashboard', labelEn: 'Electricity Dashboard', labelAr: 'لوحة تحكم الكهرباء M212' },
      { key: 'electricity_reports', labelEn: 'Electricity Reports', labelAr: 'تقارير الكهرباء M212' },
      { key: 'electricity_daily_entry', labelEn: 'Electricity Daily Entry', labelAr: 'رفع بيانات الكهرباء M212' },
    ]
  },
  {
    moduleEn: 'Water Division (Siconia)',
    moduleAr: 'قسم المياه (Siconia)',
    permissions: [
      { key: 'water_dashboard', labelEn: 'Water Dashboard', labelAr: 'لوحة تحكم المياه Siconia' },
      { key: 'water_reports', labelEn: 'Water Reports', labelAr: 'تقارير المياه Siconia' },
      { key: 'water_daily_entry', labelEn: 'Water Daily Entry', labelAr: 'رفع بيانات المياه Siconia' },
    ]
  },
  {
    moduleEn: 'Electricity Division (ECS1100)',
    moduleAr: 'قسم الكهرباء (ECS1100)',
    permissions: [
      { key: 'electricity-ecs1100_dashboard', labelEn: 'ECS1100 Dashboard', labelAr: 'لوحة تحكم الكهرباء ECS1100' },
      { key: 'electricity-ecs1100_reports', labelEn: 'ECS1100 Reports', labelAr: 'تقارير الكهرباء ECS1100' },
      { key: 'electricity-ecs1100_daily_entry', labelEn: 'ECS1100 Daily Entry', labelAr: 'رفع بيانات الكهرباء ECS1100' },
    ]
  },
  {
    moduleEn: 'Petty Cash Module',
    moduleAr: 'إدارة العهد والمصروفات النثرية',
    permissions: [
      { key: 'petty_cash_dashboard', labelEn: 'Petty Cash Dashboard', labelAr: 'لوحة تحكم العهد النثرية' },
      { key: 'petty_cash_expenses', labelEn: 'Expenses & Settlement', labelAr: 'المصاريف وتصفية عهد الموظفين' },
      { key: 'petty_cash_resources', labelEn: 'Resources & Settings', labelAr: 'المصادر وإعدادات العهد' },
    ]
  },
  {
    moduleEn: 'Visitor Management System',
    moduleAr: 'نظام إدارة وتسجيل الزوار',
    permissions: [
      { key: 'visitor_dashboard', labelEn: 'Visitor Dashboard', labelAr: 'لوحة تحكم وإحصائيات الزوار' },
      { key: 'visitor_register', labelEn: 'Visitor Registration & QR', labelAr: 'تسجيل زيارة جديدة ورمز QR' },
      { key: 'visitor_list', labelEn: 'Visits List & Import', labelAr: 'قائمة الزيارات واستيراد إكسل' },
      { key: 'visitor_admin', labelEn: 'Visitor Administration', labelAr: 'إدارة وتعديل الزيارات' },
    ]
  },
  {
    moduleEn: 'Library & Document Control (EDCS)',
    moduleAr: 'المكتبة ونظام مراقبة الوثائق (EDCS)',
    permissions: [
      { key: 'library_dashboard', labelEn: 'Library Dashboard', labelAr: 'لوحة تحكم المكتبة والوثائق' },
      { key: 'library_registry', labelEn: 'Document Registry', labelAr: 'سجل واستعراض الوثائق' },
      { key: 'library_create', labelEn: 'Add / Renew Documents', labelAr: 'إضافة وتجديد الوثائق' },
      { key: 'library_admin', labelEn: 'Document Administration', labelAr: 'إدارة وحذف وثائق المصنع' },
    ]
  },
  {
    moduleEn: 'Admin Panel & Security',
    moduleAr: 'لوحة الإدارة والتحكم بالنظام',
    permissions: [
      { key: 'admin_panel', labelEn: 'Admin Panel Access', labelAr: 'دخول لوحة الإدارة العامة' },
      { key: 'manage_users', labelEn: 'User Management', labelAr: 'إدارة المستخدمين' },
      { key: 'manage_roles', labelEn: 'Role & Permission Management', labelAr: 'إدارة الصلاحيات والأنواع' },
    ]
  }
];

const ALL_PERMISSIONS = PERMISSION_MODULES.flatMap(m => m.permissions.map(p => ({ key: p.key, label: p.labelEn })));

export default function UserFormModal({ user, roles, onClose, onSuccess }: UserFormModalProps) {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const [formData, setFormData] = useState({
    username: user?.username || '',
    password: '',
    full_name: user?.full_name || '',
    role_id: user?.roles?.id || roles[0]?.id || '',
    is_active: user?.is_active ?? true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  
  // Track if user has manually changed permissions so we don't overwrite them
  const [manuallyChanged, setManuallyChanged] = useState(false);

  const [initialLoaded, setInitialLoaded] = useState(false);

  // Auto-select permissions based on chosen role (if not manually edited)
  useEffect(() => {
    if (manuallyChanged) return;
    
    // Load existing user permissions only once when editing
    if (user && user.user_permissions && !initialLoaded) {
      const userPerms = user.user_permissions.map((up: any) => up.permissions?.page_key).filter(Boolean);
      setSelectedPermissions(userPerms);
      setInitialLoaded(true);
      return;
    }
    
    // Auto-update permissions if role changes (only for new users or if role is changed from original)
    if (!user || (user && formData.role_id !== user.roles?.id)) {
      const selectedRole = roles.find(r => r.id === formData.role_id);
      if (!selectedRole) return;
      
      const roleName = selectedRole.name.toLowerCase();
      
      if (roleName.includes('admin')) {
        setSelectedPermissions(ALL_PERMISSIONS.map(p => p.key));
      } else if (roleName.includes('manager')) {
        setSelectedPermissions(['electricity_dashboard', 'electricity_reports', 'water_dashboard', 'water_reports']);
      } else {
        setSelectedPermissions(['electricity_daily_entry', 'water_daily_entry']);
      }
    }
  }, [formData.role_id, roles, manuallyChanged, user, initialLoaded]);

  const togglePermission = (key: string) => {
    setManuallyChanged(true);
    setSelectedPermissions(prev => 
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const res = await fetch('/api/admin/users', {
        method: user ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, id: user?.id, custom_permissions: selectedPermissions })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save user (Check SUPABASE_SERVICE_ROLE_KEY)');
      
      onSuccess(data.user);
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-white">{user ? t('Edit User', 'تعديل المستخدم') : t('Add New User', 'إضافة مستخدم جديد')}</h2>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-6 p-3 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg">
              {error}
            </div>
          )}
          
          <form id="user-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">{t('Username', 'اسم المستخدم')}</label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={e => setFormData({ ...formData, username: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  {t('Password', 'كلمة المرور')} {user && <span className="text-zinc-500 text-xs">{t('(Leave blank to keep)', '(اترك فارغاً للإبقاء)')}</span>}
                </label>
                <input
                  type="password"
                  required={!user}
                  placeholder={user ? '••••••••' : t('e.g. 1234 (4 numbers or more)', 'مثال: 1234 (أربعة أرقام أو أكثر)')}
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
                <p className="text-[11px] text-zinc-400 mt-1">
                  {t('Supports 4 numbers (PIN) or standard password', 'يمكن تعيين 4 أرقام أو أي كلمة مرور')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">{t('Full Name', 'الاسم الكامل')}</label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">{t('User Type (Role)', 'نوع المستخدم (الدور)')}</label>
                <select
                  value={formData.role_id}
                  onChange={e => setFormData({ ...formData, role_id: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center mt-8">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-5 h-5 rounded border-zinc-700 bg-zinc-800 text-blue-500 focus:ring-blue-500/50"
                  />
                  <span className="text-sm font-medium text-zinc-300">{t('Active User', 'مستخدم نشط')}</span>
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-zinc-200">{t('Custom Permissions / Pages', 'صلاحيات مخصصة / صفحات')}</h3>
                <span className="text-xs text-teal-400 font-semibold">
                  {selectedPermissions.length} / {ALL_PERMISSIONS.length} {t('Selected', 'محدد')}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mb-4">{t('Select additional pages this user can access (overrides role defaults).', 'حدد الصفحات الإضافية المتاحة لهذا المستخدم.')}</p>
              
              <div className="space-y-4">
                {PERMISSION_MODULES.map((mod, mIdx) => {
                  const modKeys = mod.permissions.map(p => p.key);
                  const isAllSelected = modKeys.every(k => selectedPermissions.includes(k));
                  
                  return (
                    <div key={mIdx} className="p-3.5 rounded-xl border border-zinc-800/80 bg-zinc-950/40 space-y-2.5">
                      <div className="flex items-center justify-between border-b border-zinc-800/50 pb-2">
                        <span className="text-xs font-bold text-teal-400">
                          {t(mod.moduleEn, mod.moduleAr)}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (isAllSelected) {
                              setSelectedPermissions(prev => prev.filter(k => !modKeys.includes(k)));
                            } else {
                              setSelectedPermissions(prev => [...new Set([...prev, ...modKeys])]);
                            }
                            setManuallyChanged(true);
                          }}
                          className="text-[11px] text-zinc-400 hover:text-white transition-colors"
                        >
                          {isAllSelected ? t('Deselect All', 'إلغاء تحديد القسم') : t('Select All', 'تحديد القسم بالكامل')}
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {mod.permissions.map(perm => (
                          <label key={perm.key} className="flex items-center gap-2.5 p-2 rounded-lg border border-zinc-800/70 bg-zinc-900/60 hover:bg-zinc-800/60 cursor-pointer transition-colors">
                            <input 
                              type="checkbox"
                              checked={selectedPermissions.includes(perm.key)}
                              onChange={() => togglePermission(perm.key)}
                              className="rounded border-zinc-700 bg-zinc-800 text-teal-500 focus:ring-teal-500/50"
                            />
                            <span className="text-xs font-medium text-zinc-300">{t(perm.labelEn, perm.labelAr)}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </form>
        </div>
        
        <div className="p-6 border-t border-zinc-800 flex justify-end gap-3 bg-zinc-900/50">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors"
          >
            {t('Cancel', 'إلغاء')}
          </button>
          <button 
            type="submit" 
            form="user-form"
            disabled={isLoading}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors flex items-center gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {t('Save User', 'حفظ المستخدم')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
