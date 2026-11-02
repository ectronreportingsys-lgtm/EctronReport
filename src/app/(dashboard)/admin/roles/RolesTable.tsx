'use client';

import { useState } from 'react';
import { Check, X, Loader2, Save } from 'lucide-react';
import clsx from 'clsx';
import { useLanguage } from '@/components/layout/LanguageProvider';

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

interface Permission {
  id: string;
  page_key: string;
  page_name: string;
}

export default function RolesTable({ initialRoles, allPermissions }: { initialRoles: Role[], allPermissions: Permission[] }) {
  const { t } = useLanguage();
  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const togglePermission = (roleId: string, permId: string) => {
    setRoles(prevRoles => prevRoles.map(role => {
      if (role.id === roleId) {
        const hasPerm = role.permissions.includes(permId);
        return {
          ...role,
          permissions: hasPerm 
            ? role.permissions.filter(id => id !== permId)
            : [...role.permissions, permId]
        };
      }
      return role;
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');
    try {
      const res = await fetch('/api/admin/roles/permissions', {
        method: 'POST',
        body: JSON.stringify({ roles })
      });
      if (!res.ok) throw new Error('Failed to save permissions');
      setSaveMessage(t('Permissions saved successfully!', 'تم حفظ الصلاحيات بنجاح!'));
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err: any) {
      setSaveMessage(t('Error saving: ', 'خطأ في الحفظ: ') + err.message);
    }
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <div className="flex items-center gap-4">
          {saveMessage && <span className={clsx("text-sm", saveMessage.includes('Error') || saveMessage.includes('خطأ') ? 'text-red-400' : 'text-emerald-400')}>{saveMessage}</span>}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg btn-primary-gradient bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {t('Save Changes', 'حفظ التعديلات')}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border border-zinc-800 rounded-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/80">
              <th className="py-4 px-6 text-sm font-semibold text-zinc-300 border-r border-zinc-800">{t('User Type', 'نوع المستخدم')}</th>
              {allPermissions.map(perm => (
                <th key={perm.id} className="py-4 px-4 text-xs font-medium text-zinc-400 text-center border-r border-zinc-800 break-words max-w-[100px]">
                  {t(perm.page_name, perm.page_name)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roles.map(role => (
              <tr key={role.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                <td className="py-4 px-6 border-r border-zinc-800">
                  <div className="font-semibold text-zinc-200">{role.name}</div>
                  <div className="text-xs text-zinc-500 mt-1">{role.description}</div>
                </td>
                {allPermissions.map(perm => {
                  const hasPerm = role.permissions.includes(perm.id);
                  const isAdmin = role.name === 'Admin';
                  return (
                    <td key={perm.id} className="py-4 px-4 text-center border-r border-zinc-800">
                      <button
                        type="button"
                        onClick={() => !isAdmin && togglePermission(role.id, perm.id)}
                        disabled={isAdmin}
                        className={clsx(
                          "w-6 h-6 rounded flex items-center justify-center mx-auto transition-colors",
                          hasPerm 
                            ? "bg-emerald-500/20 text-emerald-400" 
                            : "bg-zinc-800 text-zinc-600 hover:bg-zinc-700",
                          isAdmin && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {hasPerm ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
