import { createClient } from '@/lib/supabase-server';
import RolesTable from './RolesTable';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import T from '@/components/layout/T';

export default async function RolesPage() {
  const supabase = await createClient();

  const { data: roles } = await supabase.from('roles').select('*').order('name');
  const { data: permissions } = await supabase.from('permissions').select('*').order('page_name');
  const { data: rolePermissions } = await supabase.from('role_permissions').select('*');

  // Map permissions to roles
  const rolesWithPerms = roles?.map(role => {
    return {
      ...role,
      permissions: rolePermissions
        ?.filter(rp => rp.role_id === role.id)
        .map(rp => rp.permission_id) || []
    };
  }) || [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white"><T text="Role & Permissions Management" /></h1>
          <p className="text-zinc-400 text-sm mt-1"><T text="Configure default access permissions for each user type" /></p>
        </div>
        <Link href="/admin/users" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <T text="Back to Users" />
        </Link>
      </div>

      <div className="glass rounded-2xl border border-border p-6 overflow-hidden">
        <RolesTable initialRoles={rolesWithPerms} allPermissions={permissions || []} />
      </div>
    </div>
  );
}
