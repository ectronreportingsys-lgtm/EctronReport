import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { normalizeAuthPassword } from '@/lib/authUtils';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password, full_name, role_id, is_active, custom_permissions } = body;
    const email = username.includes('@') ? username : `${username}@ectron.local`;

    const supabase = createAdminClient();

    // 1. Create user in auth.users
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: normalizeAuthPassword(password),
      email_confirm: true,
      user_metadata: {
        username,
        full_name,
      }
    });

    if (authError) throw authError;

    // Upsert the profile to guarantee it exists and has the correct role
    if (authData.user) {
      await supabase
        .from('profiles')
        .upsert({ 
          id: authData.user.id,
          username,
          full_name,
          role_id,
          is_active: is_active !== undefined ? is_active : true
        });
        
      // Add custom permissions if provided
      if (custom_permissions) {
        if (custom_permissions.length > 0) {
          const { data: perms } = await supabase.from('permissions').select('id, page_key').in('page_key', custom_permissions);
          if (perms && perms.length > 0) {
            const userPerms = perms.map(p => ({ user_id: authData.user.id, permission_id: p.id }));
            await supabase.from('user_permissions').insert(userPerms);
          }
        } else {
          // Explicitly zero permissions assigned: insert 'no_access' marker
          const { data: noAccessPerm } = await supabase.from('permissions').select('id').eq('page_key', 'no_access').single();
          if (noAccessPerm) {
            await supabase.from('user_permissions').insert({ user_id: authData.user.id, permission_id: noAccessPerm.id });
          }
        }
      }
      
      // Fetch the complete user object to return
      const { data: newUser } = await supabase
        .from('profiles')
        .select('id, username, full_name, is_active, roles(id, name), user_permissions ( permissions ( page_key ) )')
        .eq('id', authData.user.id)
        .single();
        
      return NextResponse.json({ success: true, user: newUser });
    }

    return NextResponse.json({ error: 'Failed to create user' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, username, password, full_name, role_id, is_active, custom_permissions } = body;
    const email = username.includes('@') ? username : `${username}@ectron.local`;

    const supabase = createAdminClient();

    // Update Auth user
    const updateData: any = {
      email,
      user_metadata: { username, full_name }
    };
    if (password) updateData.password = normalizeAuthPassword(password);

    const { error: authError } = await supabase.auth.admin.updateUserById(id, updateData);
    if (authError) throw authError;

    // Update Profile
    const profileUpdate: any = { username, full_name, role_id };
    if (is_active !== undefined) profileUpdate.is_active = is_active;
    
    const { error: profileError } = await supabase
      .from('profiles')
      .update(profileUpdate)
      .eq('id', id);
    if (profileError) throw profileError;

    // Update custom permissions (delete old, insert new)
    await supabase.from('user_permissions').delete().eq('user_id', id);
    
    if (custom_permissions) {
      if (custom_permissions.length > 0) {
        const { data: perms } = await supabase.from('permissions').select('id, page_key').in('page_key', custom_permissions);
        if (perms && perms.length > 0) {
          const userPerms = perms.map(p => ({ user_id: id, permission_id: p.id }));
          await supabase.from('user_permissions').insert(userPerms);
        }
      } else {
        // Explicitly zero permissions assigned: insert 'no_access' marker
        const { data: noAccessPerm } = await supabase.from('permissions').select('id').eq('page_key', 'no_access').single();
        if (noAccessPerm) {
          await supabase.from('user_permissions').insert({ user_id: id, permission_id: noAccessPerm.id });
        }
      }
    }

    const { data: updatedUser } = await supabase
      .from('profiles')
      .select('id, username, full_name, is_active, roles(id, name), user_permissions ( permissions ( page_key ) )')
      .eq('id', id)
      .single();

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.deleteUser(id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
