import { createClient } from '@/lib/supabase-server';
import ClientLayoutShell from './ClientLayoutShell';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/');
  }
  
  let profile = null;
  let roleName = '';
  let permissions: string[] = [];

  if (user) {
    // Fetch profile and role
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*, roles(name)')
      .eq('id', user.id)
      .single();
      
    if (profileData) {
      profile = profileData;
      roleName = profileData.roles?.name || '';
      
      // Fetch user custom permissions first
      const { data: userPerms } = await supabase
        .from('user_permissions')
        .select('permissions(page_key)')
        .eq('user_id', user.id);
        
      if (userPerms && userPerms.length > 0) {
        // User has explicit custom permissions configured by the admin:
        // Use ONLY these assigned permissions (override any role defaults completely)
        permissions = userPerms
          .map((up: any) => up.permissions?.page_key)
          .filter((k: string) => Boolean(k) && k !== 'no_access');
      } else if (profileData.role_id) {
        // Fallback to role default permissions only when custom permissions have never been set
        const { data: rolePerms } = await supabase
          .from('role_permissions')
          .select('permissions(page_key)')
          .eq('role_id', profileData.role_id);
          
        if (rolePerms) {
          permissions = rolePerms
            .map((rp: any) => rp.permissions?.page_key)
            .filter((k: string) => Boolean(k) && k !== 'no_access');
        }
      }
    }
  }

  return (
    <ClientLayoutShell 
      userPermissions={permissions} 
      roleName={roleName} 
      profile={profile}
    >
      {children}
    </ClientLayoutShell>
  );
}
