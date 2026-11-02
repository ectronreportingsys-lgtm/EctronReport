'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, Edit2, Loader2 } from 'lucide-react';
import { useLanguage } from '@/components/layout/LanguageProvider';

interface RolesManagementModalProps {
  initialRoles: any[];
  onClose: () => void;
  onRolesUpdated: (roles: any[]) => void;
}

export default function RolesManagementModal({ initialRoles, onClose, onRolesUpdated }: RolesManagementModalProps) {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [roles, setRoles] = useState(initialRoles);
  const [isLoading, setIsLoading] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  
  const [formData, setFormData] = useState({ name: '', description: '' });

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const isEdit = !!editingRole;
      const res = await fetch('/api/admin/roles', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, id: editingRole?.id })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      let updated;
      if (isEdit) {
        updated = roles.map(r => r.id === data.role.id ? data.role : r);
      } else {
        updated = [...roles, data.role];
      }
      setRoles(updated);
      onRolesUpdated(updated);
      
      setEditingRole(null);
      setFormData({ name: '', description: '' });
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('Are you sure you want to delete this role?', 'هل أنت متأكد من حذف هذا النوع؟'))) return;
    
    try {
      const res = await fetch(`/api/admin/roles?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      
      const updated = roles.filter(r => r.id !== id);
      setRoles(updated);
      onRolesUpdated(updated);
    } catch (err: any) {
      alert('Error deleting role');
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-white">{t('Roles Management', 'إدارة أنواع المستخدمين (Roles)')}</h2>
          <div className="flex items-center gap-4">
            <a href="/admin/roles" className="px-3 py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors border border-emerald-500/20">
              <Edit2 className="w-4 h-4" />
              {t('Manage Permissions', 'إدارة الصلاحيات')}
            </a>
            <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          {/* Add / Edit Form */}
          <form onSubmit={handleSave} className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 mb-6 flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-zinc-400 mb-1">{t('Role Name', 'النوع (Role Name)')}</label>
              <input
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Supervisor"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-zinc-400 mb-1">{t('Description', 'الوصف (Description)')}</label>
              <input
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('e.g. System Supervisor', 'مثال: مشرف النظام')}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
            <div className="flex gap-2">
              {editingRole && (
                <button type="button" onClick={() => { setEditingRole(null); setFormData({name:'', description:''}); }} className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700">
                  {t('Cancel', 'إلغاء')}
                </button>
              )}
              <button disabled={isLoading} type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-500 flex items-center gap-2">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingRole ? t('Update', 'تحديث') : t('Add', 'إضافة'))}
              </button>
            </div>
          </form>

          {/* Roles List */}
          <div className="border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-zinc-950">
                <tr>
                  <th className="py-3 px-4 font-semibold text-zinc-400">{t('Role', 'النوع')}</th>
                  <th className="py-3 px-4 font-semibold text-zinc-400">{t('Description', 'الوصف')}</th>
                  <th className="py-3 px-4 font-semibold text-zinc-400 text-right">{t('Actions', 'إجراءات')}</th>
                </tr>
              </thead>
              <tbody>
                {roles.map(role => (
                  <tr key={role.id} className="border-t border-zinc-800/50 hover:bg-zinc-800/20">
                    <td className="py-2 px-4 text-white font-medium">{role.name}</td>
                    <td className="py-2 px-4 text-zinc-400">{role.description}</td>
                    <td className="py-2 px-4 flex justify-end gap-2">
                      <button onClick={() => { setEditingRole(role); setFormData({ name: role.name, description: role.description || '' }); }} className="p-1.5 text-zinc-400 hover:text-blue-400 rounded-md">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(role.id)} className="p-1.5 text-zinc-400 hover:text-red-400 rounded-md">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
