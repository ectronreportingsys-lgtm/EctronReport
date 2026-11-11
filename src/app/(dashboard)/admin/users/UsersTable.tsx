'use client';

import { useState } from 'react';
import { UserPlus, Trash2, Edit2, ShieldAlert, Upload, CheckCircle2, AlertTriangle, XCircle, Loader2, ArrowUpDown, ChevronUp, ChevronDown, Download } from 'lucide-react';
import clsx from 'clsx';
import UserFormModal, { PERMISSION_MODULES } from './UserFormModal';
import RolesManagementModal from './RolesManagementModal';
import { createClient } from '@/lib/supabase';
import * as xlsx from 'xlsx';
import { useLanguage } from '@/components/layout/LanguageProvider';

interface User {
  id: string;
  username: string;
  full_name: string;
  is_active: boolean;
  roles: { id: string; name: string } | null;
  computed_permissions?: string[];
}

export default function UsersTable({ initialUsers, roles: initialRoles }: { initialUsers: User[], roles: any[] }) {
  const { t } = useLanguage();
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [roles, setRoles] = useState<any[]>(initialRoles);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  const [isRolesModalOpen, setIsRolesModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Import State
  const [importSummary, setImportSummary] = useState<any>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSelectFileModalOpen, setIsSelectFileModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Sort State
  const [sortConfig, setSortConfig] = useState<{ key: 'full_name' | 'username' | null, direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });

  const handleSort = (key: 'full_name' | 'username') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedUsers = [...users].sort((a, b) => {
    if (!sortConfig.key) return 0;
    
    const aValue = String(a[sortConfig.key] || '').toLowerCase();
    const bValue = String(b[sortConfig.key] || '').toLowerCase();
    
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const toggleSelect = (id: string) => {
    setSelectedUsers(prev => 
      prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(u => u.id));
    }
  };

  const toggleUserStatus = async (user: User) => {
    const newStatus = !user.is_active;
    // Optimistic update
    setUsers(users.map(u => u.id === user.id ? { ...u, is_active: newStatus } : u));
    
    try {
      const res = await fetch('/api/admin/users/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, is_active: newStatus })
      });
      if (!res.ok) throw new Error('Failed to update status');
    } catch (err) {
      // Revert on error
      setUsers(users.map(u => u.id === user.id ? { ...u, is_active: user.is_active } : u));
      alert(t('An error occurred while updating user status.', 'حدث خطأ أثناء تحديث حالة المستخدم'));
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    await fetch(`/api/admin/users?id=${userToDelete.id}`, { method: 'DELETE' });
    setUsers(users.filter(u => u.id !== userToDelete.id));
    setUserToDelete(null);
  };

  const handleBulkDelete = async () => {
    await fetch(`/api/admin/users/bulk-delete`, {
      method: 'POST',
      body: JSON.stringify({ ids: selectedUsers })
    });
    setUsers(users.filter(u => !selectedUsers.includes(u.id)));
    setSelectedUsers([]);
    setIsBulkDeleteModalOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const processSelectedFile = () => {
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = xlsx.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = xlsx.utils.sheet_to_json(ws);

      let valid: any[] = [];
      let existCount = 0;
      let missingPassCount = 0;

      data.forEach((row: any) => {
        if (!row.password) {
          missingPassCount++;
          return;
        }
        
        // Convert to string in case it's a number from Excel
        const rowUsername = String(row.username);

        // Check if user already exists locally
        if (users.find(u => u.username === rowUsername)) {
          existCount++;
          return;
        }

        // Keep the string version
        row.username = rowUsername;
        valid.push(row);
      });

      setImportSummary({
        total: data.length,
        valid,
        existCount,
        missingPassCount,
        fileName: selectedFile.name
      });
      setIsSelectFileModalOpen(false);
      setIsImportModalOpen(true);
    };
    reader.readAsBinaryString(selectedFile);
  };

  const confirmImport = async () => {
    setIsImporting(true);
    try {
      const res = await fetch('/api/admin/users/import', {
        method: 'POST',
        body: JSON.stringify({ users: importSummary.valid })
      });
      const result = await res.json();
      
      if (result.errors && result.errors.length > 0) {
        alert(t('An issue occurred while adding some users:\n', 'حدثت مشكلة أثناء إضافة بعض المستخدمين:\n') + result.errors.map((e: any) => `${e.username}: ${e.error}`).join('\n'));
      }
      
      if (result.success && result.count > 0) {
        window.location.reload();
      } else if (result.success && result.count === 0) {
        alert(t('No users were added. Please check the errors.', 'لم يتم إضافة أي مستخدم. يرجى مراجعة الأخطاء.'));
        setIsImporting(false);
      }
    } catch (e: any) {
      alert('Network error: ' + e.message);
    }
    
    setIsImporting(false);
    setIsImportModalOpen(false);
  };

  const exportToExcel = () => {
    const exportData = users.map(u => ({
      'Name': u.full_name,
      'Username': u.username,
      'Role': u.roles?.name || 'Unknown',
      'Permissions': u.computed_permissions?.join(', ') || '-',
      'Status': u.is_active ? 'Active' : 'Inactive'
    }));

    const worksheet = xlsx.utils.json_to_sheet(exportData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Users");
    
    xlsx.writeFile(workbook, "Users_List.xlsx");
  };

  return (
    <>
      <div className="glass rounded-2xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex justify-between items-center bg-zinc-900/50">
          <div className="flex items-center gap-2">
            {selectedUsers.length > 0 && (
              <button 
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-danger/10 hover:bg-danger/20 text-danger text-sm font-medium transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                {t('Delete Selected', 'حذف المحدد')} ({selectedUsers.length})
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={exportToExcel}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-sm font-medium transition-colors cursor-pointer border border-blue-500/20"
            >
              <Download className="w-4 h-4" />
              {t('Export Excel', 'تصدير إكسل')}
            </button>
            <button 
              onClick={() => setIsSelectFileModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-sm font-medium transition-colors cursor-pointer border border-emerald-500/20"
            >
              <Upload className="w-4 h-4" />
              {t('Upload Excel', 'رفع إكسل')}
            </button>
            <button 
            onClick={() => setIsRolesModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors border border-zinc-700"
          >
            {t('Manage Roles', 'إدارة الصلاحيات (Roles)')}
          </button>
          <button 
            onClick={() => { setEditingUser(null); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg btn-primary-gradient bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            {t('Add User', 'إضافة مستخدم')}
          </button>
        </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/80">
                <th className="py-3 px-4 w-12 text-center">
                  <input 
                    type="checkbox" 
                    checked={selectedUsers.length > 0 && selectedUsers.length === users.length}
                    onChange={toggleSelectAll}
                    className="rounded border-zinc-700 bg-zinc-800 text-blue-500 focus:ring-blue-500/50"
                  />
                </th>
                <th className="py-3 px-4 text-sm font-semibold text-zinc-400">
                  <button onClick={() => handleSort('full_name')} className="flex items-center gap-2 hover:text-white transition-colors w-full text-left">
                    Name
                    {sortConfig.key === 'full_name' ? (sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />) : <ArrowUpDown className="w-4 h-4 opacity-50" />}
                  </button>
                </th>
                <th className="py-3 px-4 text-sm font-semibold text-zinc-400">
                  <button onClick={() => handleSort('username')} className="flex items-center gap-2 hover:text-white transition-colors w-full text-left">
                    Username
                    {sortConfig.key === 'username' ? (sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />) : <ArrowUpDown className="w-4 h-4 opacity-50" />}
                  </button>
                </th>
                <th className="py-3 px-4 text-sm font-semibold text-zinc-400">Role</th>
                <th className="py-3 px-4 text-sm font-semibold text-zinc-400">Permissions</th>
                <th className="py-3 px-4 text-sm font-semibold text-zinc-400 text-center">Status</th>
                <th className="py-3 px-4 text-sm font-semibold text-zinc-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-500 text-sm">No users found.</td>
                </tr>
              ) : sortedUsers.map(user => (
                <tr key={user.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                  <td className="py-3 px-4 text-center">
                    <input 
                      type="checkbox" 
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => toggleSelect(user.id)}
                      className="rounded border-zinc-700 bg-zinc-800 text-blue-500 focus:ring-blue-500/50"
                    />
                  </td>
                  <td className="py-3 px-4 text-sm text-zinc-200">{user.full_name}</td>
                  <td className="py-3 px-4 text-sm text-zinc-400">{user.username}</td>
                  <td className="py-3 px-4 text-sm">
                    <span className={clsx(
                      "px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap",
                      user.roles?.name === 'Admin' ? "bg-purple-500/10 border-purple-500/20 text-purple-400" :
                      user.roles?.name === 'Manager' ? "bg-blue-500/10 border-blue-500/20 text-blue-400" :
                      user.roles?.name === 'Supervisor' || user.roles?.name === 'سوبر فايزر' ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                      user.roles?.name === 'Employee' || user.roles?.name === 'موظف' || user.roles?.name === 'الموظف' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                      "bg-zinc-800 border-zinc-700 text-zinc-400"
                    )}>
                      {user.roles?.name || 'Unknown'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {user.computed_permissions && user.computed_permissions.length > 0 ? (
                        user.computed_permissions.map((p, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 text-[10px]">
                            {p}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-zinc-500">-</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-center">
                    <button 
                      onClick={() => toggleUserStatus(user)}
                      className={clsx(
                        "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                        user.is_active ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20" : "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                      )}
                    >
                      {user.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="py-3 px-4 flex items-center justify-end gap-2">
                    <button 
                      onClick={() => { setEditingUser(user); setIsModalOpen(true); }}
                      className="p-1.5 text-zinc-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setUserToDelete(user)}
                      className="p-1.5 text-zinc-400 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <UserFormModal 
          user={editingUser} 
          roles={roles}
          onClose={() => setIsModalOpen(false)} 
          onSuccess={(savedUser) => {
            const role = Array.isArray(savedUser.roles) ? savedUser.roles[0] : savedUser.roles;
            let computed: string[] = [];
            if (role?.name === 'Admin') {
              computed = ['Full Access (Admin)'];
            } else if (savedUser.user_permissions && savedUser.user_permissions.length > 0) {
              const allFlat = PERMISSION_MODULES.flatMap(m => m.permissions);
              computed = savedUser.user_permissions
                .map((up: any) => {
                  const key = up.permissions?.page_key;
                  if (!key || key === 'no_access') return null;
                  const found = allFlat.find(p => p.key === key);
                  return found ? t(found.labelEn, found.labelAr) : key;
                })
                .filter(Boolean);
              if (computed.length === 0) computed = [t('No Access', 'لا توجد صفحات مفعلة')];
            }
            const formattedUser = {
              ...savedUser,
              roles: role,
              computed_permissions: computed
            };

            if (editingUser) {
              setUsers(users.map(u => u.id === formattedUser.id ? formattedUser : u));
              setSuccessMessage(t('User updated successfully!', 'تم تعديل بيانات المستخدم بنجاح!'));
            } else {
              setUsers([formattedUser, ...users]);
              setSuccessMessage(t('User added successfully!', 'تمت إضافة المستخدم بنجاح!'));
            }
            setIsModalOpen(false);
          }} 
        />
      )}

      {/* Success Message Modal */}
      {successMessage && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-zinc-900 border border-emerald-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4 text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{t('Success', 'نجاح')}</h3>
            <p className="text-zinc-300 text-sm mb-6">{successMessage}</p>
            <button 
              onClick={() => setSuccessMessage(null)}
              className="w-full px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
            >
              {t('OK', 'حسناً')}
            </button>
          </div>
        </div>
      )}

      {/* Roles Management Modal */}
      {isRolesModalOpen && (
        <RolesManagementModal 
          initialRoles={roles}
          onClose={() => setIsRolesModalOpen(false)}
          onRolesUpdated={(newRoles) => setRoles(newRoles)}
        />
      )}

      {/* Delete Single User Confirmation */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 text-warning mb-4">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="text-lg font-bold">{t('Confirm Delete', 'تأكيد الحذف')}</h3>
            </div>
            <p className="text-zinc-300 text-sm mb-2">
              {t('Are you sure you want to delete user', 'هل أنت متأكد من حذف المستخدم')} <strong>"{userToDelete.full_name}"</strong>?
            </p>
            <p className="text-zinc-500 text-xs mb-6">
              {t('They will not be able to log in after deletion.', 'لن يتمكن من تسجيل الدخول بعد الحذف.')}
            </p>
            
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors"
              >
                {t('Cancel', 'إلغاء')}
              </button>
              <button 
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg bg-danger hover:bg-red-600 text-white text-sm font-medium transition-colors"
              >
                {t('Delete', 'حذف')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 text-danger mb-4">
              <Trash2 className="w-6 h-6" />
              <h3 className="text-lg font-bold">{t('Bulk Delete', 'حذف جماعي')}</h3>
            </div>
            <p className="text-zinc-300 text-sm mb-6">
              {selectedUsers.length} {t('users will be permanently deleted. Are you sure?', 'مستخدمين سيتم حذفهم بشكل نهائي. هل أنت متأكد؟')}
            </p>
            
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors"
              >
                {t('Cancel', 'إلغاء')}
              </button>
              <button 
                onClick={handleBulkDelete}
                className="px-4 py-2 rounded-lg bg-danger hover:bg-red-600 text-white text-sm font-medium transition-colors"
              >
                {t('Confirm Delete', 'تأكيد الحذف')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Select File Modal */}
      {isSelectFileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">{t('Select Excel File', 'اختيار ملف الإكسل')}</h3>
            <p className="text-zinc-400 text-sm mb-6">{t('Please select a .xlsx or .xls file to import users from.', 'الرجاء اختيار ملف بصيغة .xlsx أو .xls ليتم استيراد المستخدمين منه.')}</p>
            
            <div className="mb-6">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-zinc-700 rounded-lg cursor-pointer bg-zinc-900/50 hover:bg-zinc-800/50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 text-zinc-400 mb-2" />
                  <p className="mb-2 text-sm text-zinc-400">
                    <span className="font-semibold text-blue-400">{t('Click to select', 'اضغط للاختيار')}</span> {t('or drag file here', 'أو اسحب الملف هنا')}
                  </p>
                  {selectedFile && (
                    <p className="text-emerald-400 text-sm font-medium mt-2">
                      {t('Selected:', 'تم اختيار:')} {selectedFile.name}
                    </p>
                  )}
                </div>
                <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileChange} />
              </label>
            </div>

            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => { setIsSelectFileModalOpen(false); setSelectedFile(null); }}
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors"
              >
                {t('Cancel', 'إلغاء')}
              </button>
              <button 
                onClick={processSelectedFile}
                disabled={!selectedFile}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
              >
                {t('Process File', 'معالجة الملف')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {isImportModalOpen && importSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            {isImporting ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-4" />
                <p className="text-zinc-300 text-lg font-medium">{t('Importing data...', 'جاري استيراد البيانات...')}</p>
                <p className="text-zinc-500 text-sm mt-2">{t('Please wait until the process is completed', 'الرجاء الانتظار حتى تكتمل العملية')}</p>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-bold text-white mb-4">{t('Users Import Summary', 'ملخص استيراد المستخدمين')}</h3>
                
                {importSummary.fileName && (
                  <div className="mb-4 text-sm text-zinc-400 text-center bg-zinc-800/50 py-2 rounded-lg">
                    {t('File:', 'الملف:')} <span className="text-zinc-200">{importSummary.fileName}</span>
                  </div>
                )}

                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                    <span className="text-zinc-400 text-sm">{t('Total users in file', 'إجمالي المستخدمين في الملف')}</span>
                    <span className="font-bold text-white">{importSummary.total}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400 text-sm">{t('Valid for addition', 'صالح للإضافة')}</span>
                    </div>
                    <span className="font-bold text-emerald-400">{importSummary.valid.length}</span>
                  </div>
                  
                  {importSummary.existCount > 0 && (
                    <div className="flex items-center justify-between p-3 bg-warning/10 rounded-lg border border-warning/20">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-warning" />
                        <span className="text-warning text-sm">{t('Already exists (ignored)', 'موجود مسبقاً (تم التجاهل)')}</span>
                      </div>
                      <span className="font-bold text-warning">{importSummary.existCount}</span>
                    </div>
                  )}
                  
                  {importSummary.missingPassCount > 0 && (
                    <div className="flex items-center justify-between p-3 bg-danger/10 rounded-lg border border-danger/20">
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-danger" />
                        <span className="text-danger text-sm">{t('Missing password', 'ينقصها كلمة مرور')}</span>
                      </div>
                      <span className="font-bold text-danger">{importSummary.missingPassCount}</span>
                    </div>
                  )}
                </div>

                <p className="text-zinc-300 text-sm mb-6 text-center">
                  {t('Do you want to add the', 'هل تريد إضافة الـ')} <strong>{importSummary.valid.length}</strong> {t('valid users?', 'مستخدم الصالحين؟')}
                </p>
                
                <div className="flex gap-3 justify-end">
                  <button 
                    onClick={() => setIsImportModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors"
                  >
                    {t('Cancel', 'إلغاء')}
                  </button>
                  <button 
                    onClick={confirmImport}
                    disabled={importSummary.valid.length === 0}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                  >
                    {t('Confirm Import', 'تأكيد الاستيراد')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
