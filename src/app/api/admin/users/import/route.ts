import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { normalizeAuthPassword } from '@/lib/authUtils';

export async function POST(request: Request) {
  try {
    const { users } = await request.json();
    if (!users || !Array.isArray(users)) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: rolesData } = await supabase.from('roles').select('id, name');
    const roleMap: Record<string, string> = {};
    if (rolesData) {
      rolesData.forEach(r => { roleMap[r.name.toLowerCase()] = r.id; });
    }

    let successCount = 0;
    let errors = [];

    for (const u of users) {
      try {
        const usernameStr = String(u.username);
        const email = usernameStr.includes('@') ? usernameStr : `${usernameStr}@ectron.local`;
        const role_id = roleMap[u.user_type?.toLowerCase()] || roleMap['employee'];

        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email,
          password: normalizeAuthPassword(u.password),
          email_confirm: true,
          user_metadata: {
            username: usernameStr,
            full_name: String(u.full_name || u.name || ''),
          }
        });

        if (authError) throw authError;

        if (authData.user) {
          await supabase
            .from('profiles')
            .update({ role_id })
            .eq('id', authData.user.id);
          
          successCount++;
        }
      } catch (err: any) {
        errors.push({ username: u.username, error: err.message });
      }
    }

    return NextResponse.json({ success: true, count: successCount, errors });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
