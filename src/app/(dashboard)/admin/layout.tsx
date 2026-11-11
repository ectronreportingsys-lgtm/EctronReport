import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');
  
  // Fetch profile and role
  const { data: profileData } = await supabase
    .from('profiles')
    .select('roles(name)')
    .eq('id', user.id)
    .single();
    
  if (!profileData) {
    redirect('/electricity/dashboard');
  }

  const role: any = profileData?.roles ? (Array.isArray(profileData.roles) ? profileData.roles[0] : profileData.roles) : null;
  if (role?.name !== 'Admin') {
    redirect('/electricity/dashboard'); // Restrict access
  }

  return (
    <div className="relative">
      {/* Subtle background glow for admin area in dark mode */}
      <div className="hidden dark:block absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none z-0" />
      <div className="hidden dark:block absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none z-0" />
      
      <div>
        {children}
      </div>
    </div>
  );
}
