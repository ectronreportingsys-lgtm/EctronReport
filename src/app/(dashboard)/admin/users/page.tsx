import { createClient } from '@/lib/supabase-server';
import UsersTable from './UsersTable';
import { UserPlus, Download, Upload } from 'lucide-react';
import Link from 'next/link';
import T from '@/components/layout/T';

export default async function AdminUsersPage() {
  const supabase = await createClient();

  // Fetch all profiles along with their roles
  const { data: users, error } = await supabase
    .from('profiles')
    .select(`
      id,
      username,
      full_name,
      is_active,
      roles ( id, name ),
      user_permissions ( permissions ( page_key ) )
    `)
    .order('created_at', { ascending: false });

  // Fetch all roles for the Add/Edit form
  const { data: roles } = await supabase.from('roles').select('*');
  const { data: allPermissions } = await supabase.from('permissions').select('*');
  const { data: rolePermissions } = await supabase.from('role_permissions').select('*');

  // Map permissions to users
  const usersWithPerms: any[] = (users || []).map((user: any) => {
    let permNames = new Set<string>();
    
    // Extract role safely whether it's an object or an array (Supabase typings can be weird)
    const role = Array.isArray(user.roles) ? user.roles[0] : user.roles;

    // Admin has everything
    if (role?.name === 'Admin') {
      permNames.add('Full Access (Admin)');
    } else {
      // Add role permissions
      if (role?.id && rolePermissions && allPermissions) {
        const rolePermIds = rolePermissions.filter(rp => rp.role_id === role.id).map(rp => rp.permission_id);
        const rolePerms = allPermissions.filter(p => rolePermIds.includes(p.id)).map(p => p.page_name);
        rolePerms.forEach(p => permNames.add(p));
      }
      
      // Add user custom permissions (if any)
      if (user.user_permissions && allPermissions) {
        user.user_permissions.forEach((up: any) => {
          if (up.permissions?.page_key) {
            const perm = allPermissions.find(p => p.page_key === up.permissions.page_key);
            if (perm) permNames.add(perm.page_name);
          }
        });
      }
    }
    
    return {
      ...user,
      roles: role,
      computed_permissions: Array.from(permNames)
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white"><T text="Users Management" /></h1>
          <p className="text-zinc-400 text-sm mt-1"><T text="Manage system users, roles, and permissions" /></p>
        </div>
        
        <div className="flex items-center gap-3">
          <Link href="/api/admin/users/export-template" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors">
            <Download className="w-4 h-4" />
            <T text="Download Template" />
          </Link>
        </div>
      </div>

      <UsersTable initialUsers={usersWithPerms} roles={roles || []} />
    </div>
  );
}
