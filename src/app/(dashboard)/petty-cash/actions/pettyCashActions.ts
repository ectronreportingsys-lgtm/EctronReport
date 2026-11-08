'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

import { getRecurringDescriptions } from './resourcesActions';
import { assignInvoicesToBatch } from './batchesActions';

export async function getFormData(expenseDate?: string) {
  const supabase = await createClient();
  
  const [categoriesResp, profilesResp, projectsResp, recurring] = await Promise.all([
    supabase.from('petty_cash_categories').select('id, name').eq('active', true).order('name'),
    supabase.from('profiles').select('id, full_name, username').eq('is_active', true).order('full_name'),
    supabase.from('projects').select('id, name').eq('active', true).order('name'),
    getRecurringDescriptions()
  ]);

  let allowedProfiles = profilesResp.data || [];
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const settingsPath = path.join(process.cwd(), 'src', 'data', 'petty-cash-settings.json');
    const content = await fs.readFile(settingsPath, 'utf-8');
    const settings = JSON.parse(content);
    if (settings.allowedEmployeeIds && settings.allowedEmployeeIds.length > 0) {
      const allowedSet = new Set(settings.allowedEmployeeIds);
      allowedProfiles = allowedProfiles.filter((p: any) => allowedSet.has(p.id));
    }
  } catch (e) {
    // fallback to all profiles
  }

  // Generate guaranteed unique next Expense No based on date
  const nextExpenseNo = await generateNextExpenseNo(expenseDate);

  return {
    categories: categoriesResp.data || [],
    profiles: allowedProfiles,
    projects: projectsResp.data || [],
    recurringDescriptions: recurring || [],
    nextExpenseNo
  };
}

export async function generateNextExpenseNo(expenseDate?: string): Promise<string> {
  const supabase = await createClient();
  const d = expenseDate ? new Date(expenseDate) : new Date();
  const y = !isNaN(d.getFullYear()) ? d.getFullYear() : new Date().getFullYear();
  const m = !isNaN(d.getMonth()) ? String(d.getMonth() + 1).padStart(2, '0') : String(new Date().getMonth() + 1).padStart(2, '0');
  const prefix = `PC-${y}-${m}-`;

  const { data } = await supabase
    .from('petty_cash_expenses')
    .select('expense_no');

  const allNos = new Set((data || []).map((x: any) => (x.expense_no || '').toLowerCase().trim()));

  let maxSeq = 0;
  (data || []).forEach((x: any) => {
    const no = (x.expense_no || '').trim();
    if (no.startsWith(prefix)) {
      const part = no.substring(prefix.length);
      const num = parseInt(part, 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  });

  let nextSeq = maxSeq + 1;
  let candidate = `${prefix}${nextSeq.toString().padStart(3, '0')}`;
  while (allNos.has(candidate.toLowerCase())) {
    nextSeq++;
    candidate = `${prefix}${nextSeq.toString().padStart(3, '0')}`;
  }

  return candidate;
}

export async function getNextExpenseNoAction(expenseDate: string): Promise<string> {
  return await generateNextExpenseNo(expenseDate);
}

async function resolveProjectAllocation(
  supabase: any,
  projectAllocationsStr: string | null,
  directProjectId: string | null,
  projectText?: string | null
): Promise<string | null> {
  // If direct project text is provided (from single-line input in Update or New modal)
  if (projectText !== undefined && projectText !== null) {
    const trimmed = projectText.trim();
    if (!trimmed) {
      return null;
    }

    // Check if project exists by name (case-insensitive)
    const { data: existing } = await supabase
      .from('projects')
      .select('id')
      .ilike('name', trimmed)
      .maybeSingle();

    if (existing) {
      return existing.id;
    }

    // Create new project with this text
    const { data: newProj, error } = await supabase
      .from('projects')
      .insert([{ name: trimmed, active: true }])
      .select('id')
      .single();

    if (newProj) {
      return newProj.id;
    }
    if (error) {
      console.error('Error inserting project with text:', error);
    }
  }

  if (!projectAllocationsStr) {
    return directProjectId || null;
  }

  try {
    const allocations: Array<{ projectId: string; percentage: number }> = JSON.parse(projectAllocationsStr);
    const validAllocs = allocations.filter(a => a.projectId && Number(a.percentage) > 0);

    if (validAllocs.length === 0) {
      return null;
    }

    if (validAllocs.length === 1 && Number(validAllocs[0].percentage) === 100) {
      return validAllocs[0].projectId;
    }

    // Multiple projects or split percentages (e.g. 80% / 20%)
    const projectIds = validAllocs.map(a => a.projectId);
    const { data: projectRecords } = await supabase
      .from('projects')
      .select('id, name')
      .in('id', projectIds);

    const projectMap = new Map<string, string>((projectRecords || []).map((p: any) => [p.id, p.name]));

    const compositeParts = validAllocs.map(a => {
      const name = projectMap.get(a.projectId) || 'Project';
      return `${name} ${a.percentage}%`;
    });
    const compositeName = compositeParts.join(', ');

    // Check if this composite exists
    const { data: existingCombo } = await supabase
      .from('projects')
      .select('id')
      .ilike('name', compositeName)
      .maybeSingle();

    if (existingCombo) {
      return existingCombo.id;
    }

    // Insert new composite project so it's tracked in projects table
    const { data: newCombo, error: insertError } = await supabase
      .from('projects')
      .insert([{ name: compositeName, active: true }])
      .select('id')
      .single();

    if (newCombo) {
      return newCombo.id;
    }

    if (insertError) {
      console.error('Error inserting composite project:', insertError);
    }
    return validAllocs[0].projectId;
  } catch (err) {
    console.error('Error in resolveProjectAllocation:', err);
    return directProjectId || null;
  }
}

export async function createExpense(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let expense_no = formData.get('expense_no') as string;
  const expense_date = formData.get('expense_date') as string;
  const request_description = formData.get('request_description') as string;
  const category_id = formData.get('category_id') as string;
  const employee_id = formData.get('employee_id') as string;
  const amount = parseFloat(formData.get('amount') as string);
  const projectAllocationsStr = formData.get('project_allocations') as string | null;
  const directProjectId = formData.get('project_id') as string || null;
  const projectText = formData.get('project_text') as string | null;
  const project_id = await resolveProjectAllocation(supabase, projectAllocationsStr, directProjectId, projectText);
  
  const attachmentFile = formData.get('attachment') as File | null;
  let attachment_url = null;
  if (attachmentFile && attachmentFile.size > 0 && attachmentFile.name) {
    try {
      const fileExt = attachmentFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `petty-cash/${fileName}`;
      
      const arrayBuffer = await attachmentFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Create an admin client to bypass RLS for storage uploads
      const { createClient: createSupabaseAdmin } = require('@supabase/supabase-js');
      const supabaseAdmin = createSupabaseAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );

      const { error: uploadError } = await supabaseAdmin.storage
        .from('attachments')
        .upload(filePath, buffer, {
          contentType: attachmentFile.type,
          upsert: true
        });

      if (uploadError) {
        console.error('Error uploading attachment:', uploadError);
        return { error: 'Failed to upload attachment. Ensure the "attachments" bucket exists and permissions are correct.' };
      }

      const { data: publicUrlData } = supabaseAdmin.storage
        .from('attachments')
        .getPublicUrl(filePath);
        
      attachment_url = publicUrlData.publicUrl;
    } catch (err) {
      console.error('File processing error:', err);
      return { error: 'Failed to process attachment file.' };
    }
  }
  
  if (!expense_no || !expense_date || !request_description || !category_id || !employee_id || !amount || amount <= 0) {
    return { error: 'Missing required fields or invalid amount' };
  }

  // Check duplicate
  const { data: existing } = await supabase
    .from('petty_cash_expenses')
    .select('id')
    .eq('expense_date', expense_date)
    .eq('employee_id', employee_id)
    .eq('amount', amount)
    .eq('request_description', request_description)
    .eq('category_id', category_id);

  if (existing && existing.length > 0 && formData.get('confirm_duplicate') !== 'true') {
    return { error: 'DUPLICATE_WARNING', message: 'A similar expense already exists. Are you sure you want to save?' };
  }

  // Ensure expense_no is unique and auto-resolve any key collision
  if (!expense_no || !expense_no.trim()) {
    expense_no = await generateNextExpenseNo(expense_date);
  } else {
    const { data: conflict } = await supabase
      .from('petty_cash_expenses')
      .select('id')
      .ilike('expense_no', expense_no.trim())
      .maybeSingle();

    if (conflict) {
      expense_no = await generateNextExpenseNo(expense_date);
    }
  }

  const { data, error } = await supabase
    .from('petty_cash_expenses')
    .insert([{
      expense_no,
      expense_date,
      request_description,
      category_id,
      employee_id,
      amount,
      project_id,
      attachment_url,
      created_by: user?.id,
      updated_by: user?.id
    }])
    .select();

  if (error) {
    console.error('Error saving expense:', error);
    return { error: error.message };
  }

  revalidatePath('/petty-cash/dashboard');
  revalidatePath('/petty-cash/settlement');
  return { success: true, data };
}

export async function updateExpense(id: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const expense_date = formData.get('expense_date') as string;
  const request_description = formData.get('request_description') as string;
  const category_id = formData.get('category_id') as string;
  const employee_id = formData.get('employee_id') as string;
  const amount = parseFloat(formData.get('amount') as string);
  const projectAllocationsStr = formData.get('project_allocations') as string | null;
  const directProjectId = formData.get('project_id') as string || null;
  const projectText = formData.get('project_text') as string | null;
  const project_id = await resolveProjectAllocation(supabase, projectAllocationsStr, directProjectId, projectText);

  const attachmentFile = formData.get('attachment') as File | null;

  if (!expense_date || !request_description || !category_id || !employee_id || !amount || amount <= 0) {
    return { error: 'Missing required fields or invalid amount' };
  }

  const updatePayload: any = {
    expense_date,
    request_description,
    category_id,
    employee_id,
    amount,
    project_id,
    updated_by: user?.id,
    updated_at: new Date().toISOString()
  };

  if (attachmentFile && attachmentFile.size > 0 && attachmentFile.name) {
    try {
      const fileExt = attachmentFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `petty-cash/${fileName}`;
      
      const arrayBuffer = await attachmentFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Create an admin client to bypass RLS for storage uploads
      const { createClient: createSupabaseAdmin } = require('@supabase/supabase-js');
      const supabaseAdmin = createSupabaseAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );

      const { error: uploadError } = await supabaseAdmin.storage
        .from('attachments')
        .upload(filePath, buffer, {
          contentType: attachmentFile.type,
          upsert: true
        });

      if (uploadError) {
        console.error('Error uploading attachment:', uploadError);
        return { error: 'Failed to upload attachment. Ensure the "attachments" bucket exists and permissions are correct.' };
      }

      const { data: publicUrlData } = supabaseAdmin.storage
        .from('attachments')
        .getPublicUrl(filePath);
        
      updatePayload.attachment_url = publicUrlData.publicUrl;
    } catch (err) {
      console.error('File processing error:', err);
      return { error: 'Failed to process attachment file.' };
    }
  }

  const { data, error } = await supabase
    .from('petty_cash_expenses')
    .update(updatePayload)
    .eq('id', id)
    .select();

  if (error) {
    console.error('Error updating expense:', error);
    return { error: error.message };
  }

  revalidatePath('/petty-cash/dashboard');
  revalidatePath('/petty-cash/settlement');
  return { success: true, data };
}

export async function deleteExpenses(ids: string[]) {
  try {
    const supabase = await createClient();

    if (!ids || ids.length === 0) {
      return { error: 'No expenses selected.' };
    }

    const { error } = await supabase
      .from('petty_cash_expenses')
      .delete()
      .in('id', ids);

    if (error) {
      console.error('Error deleting expenses:', error);
      return { error: error.message };
    }

    revalidatePath('/petty-cash/dashboard');
    revalidatePath('/petty-cash/settlement');
    return { success: true };
  } catch (err: any) {
    console.error('Unexpected error in deleteExpenses:', err);
    return { error: err.message || 'Failed to delete expenses' };
  }
}

export async function transferExpensesMonth(
  ids: string[],
  targetYear: number,
  targetMonth: number, // 1 to 12
  specificDate?: string
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!ids || ids.length === 0) {
      return { error: 'No expenses selected.' };
    }

    if (specificDate) {
      const { error } = await supabase
        .from('petty_cash_expenses')
        .update({
          expense_date: specificDate,
          updated_by: user?.id,
          updated_at: new Date().toISOString()
        })
        .in('id', ids);

      if (error) {
        console.error('Error transferring expenses:', error);
        return { error: error.message };
      }
    } else {
      // Fetch each expense's current date so we can keep the day
      const { data: expenses, error: fetchError } = await supabase
        .from('petty_cash_expenses')
        .select('id, expense_date')
        .in('id', ids);

      if (fetchError || !expenses) {
        return { error: fetchError?.message || 'Failed to fetch selected expenses.' };
      }

      // Max days in the target month (targetMonth is 1-indexed: 1 = Jan, ..., 12 = Dec)
      const maxDaysInTargetMonth = new Date(targetYear, targetMonth, 0).getDate();

      for (const exp of expenses) {
        let day = 1;
        if (exp.expense_date) {
          const parts = exp.expense_date.split('-');
          if (parts.length === 3) {
            const origDay = parseInt(parts[2], 10);
            day = Math.min(origDay || 1, maxDaysInTargetMonth);
          }
        }
        const pad = (n: number) => n.toString().padStart(2, '0');
        const newDate = `${targetYear}-${pad(targetMonth)}-${pad(day)}`;

        const { error: updateErr } = await supabase
          .from('petty_cash_expenses')
          .update({
            expense_date: newDate,
            updated_by: user?.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', exp.id);

        if (updateErr) {
          console.error(`Error updating expense ${exp.id}:`, updateErr);
        }
      }
    }

    revalidatePath('/petty-cash/dashboard');
    revalidatePath('/petty-cash/settlement');
    return { success: true };
  } catch (err: any) {
    console.error('Unexpected error in transferExpensesMonth:', err);
    return { error: err.message || 'Failed to transfer expenses' };
  }
}

export async function bulkUpdateExpenses(
  ids: string[],
  updates: {
    category_id?: string;
    employee_id?: string;
    project_id?: string;
    expense_date?: string;
  }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!ids || ids.length === 0) {
      return { error: 'No expenses selected.' };
    }

    const payload: any = {
      updated_by: user?.id,
      updated_at: new Date().toISOString()
    };

    if (updates.category_id) payload.category_id = updates.category_id;
    if (updates.employee_id) payload.employee_id = updates.employee_id;
    if (updates.project_id) payload.project_id = updates.project_id;
    if (updates.expense_date) payload.expense_date = updates.expense_date;

    const { error } = await supabase
      .from('petty_cash_expenses')
      .update(payload)
      .in('id', ids);

    if (error) {
      console.error('Error bulk updating expenses:', error);
      return { error: error.message };
    }

    revalidatePath('/petty-cash/dashboard');
    revalidatePath('/petty-cash/settlement');
    return { success: true };
  } catch (err: any) {
    console.error('Unexpected error in bulkUpdateExpenses:', err);
    return { error: err.message || 'Failed to bulk update expenses' };
  }
}

export interface ImportExpenseInputRow {
  expense_no?: string;
  expense_date: string;
  request_description: string;
  category_name?: string;
  employee_name?: string;
  amount: number;
  project_name?: string;
}

export interface ImportExpensesPayload {
  rows: ImportExpenseInputRow[];
  defaultEmployeeId?: string | null;
  defaultCategoryId?: string | null;
  autoCategorize?: boolean;
  prefixMode?: 'monthly' | 'as_is';
  targetBatchId?: string | null;
}

export async function importPettyCashExpenses(payload: ImportExpensesPayload) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { rows, defaultEmployeeId, defaultCategoryId, autoCategorize = true, prefixMode = 'monthly', targetBatchId } = payload;
    if (!rows || rows.length === 0) {
      return { error: 'No rows provided for import.' };
    }

    // 1. Fetch metadata
    const [categoriesResp, profilesResp, projectsResp, existingExpensesResp] = await Promise.all([
      supabase.from('petty_cash_categories').select('id, name'),
      supabase.from('profiles').select('id, full_name, username'),
      supabase.from('projects').select('id, name'),
      supabase.from('petty_cash_expenses').select('expense_no')
    ]);

    const categories = categoriesResp.data || [];
    const profiles = profilesResp.data || [];
    const projects = projectsResp.data || [];
    const existingExpenseNos = new Set((existingExpensesResp.data || []).map((e: any) => (e.expense_no || '').toLowerCase()));

    const catMap = new Map<string, string>();
    categories.forEach((c: any) => catMap.set(c.name.toLowerCase().trim(), c.id));

    const profMap = new Map<string, string>();
    profiles.forEach((p: any) => {
      if (p.full_name) profMap.set(p.full_name.toLowerCase().trim(), p.id);
      if (p.username) profMap.set(p.username.toLowerCase().trim(), p.id);
    });

    const projMap = new Map<string, string>();
    projects.forEach((p: any) => projMap.set(p.name.toLowerCase().trim(), p.id));

    // Fallback category
    const defaultCatId = defaultCategoryId || catMap.get('other') || catMap.get('office supplies') || (categories[0]?.id ?? null);

    // Keyword auto-categorizer
    const smartCategorize = (desc: string): string => {
      const d = (desc || '').toLowerCase();
      if (d.includes('kitchen') || d.includes('beverage') || d.includes('water') || d.includes('coffee') || d.includes('tea') || d.includes('milk') || d.includes('refreshment')) {
        return catMap.get('refreshments') || catMap.get('kitchen tools') || defaultCatId;
      }
      if (d.includes('lunch') || d.includes('dinner') || d.includes('snack') || d.includes('guest') || d.includes('hospitality') || d.includes('biscute') || d.includes('sweet')) {
        return catMap.get('hospitality') || defaultCatId;
      }
      if (d.includes('cleaning') || d.includes('sewage') || d.includes('trash') || d.includes('waste')) {
        return catMap.get('cleaning') || defaultCatId;
      }
      if (d.includes('transportation') || d.includes('van') || d.includes('taxi') || d.includes('custom')) {
        return catMap.get('transportation') || defaultCatId;
      }
      if (d.includes('delever') || d.includes('delivery') || d.includes('courier') || d.includes('transformation charge')) {
        return catMap.get('delivery services') || catMap.get('transportation') || defaultCatId;
      }
      if (d.includes('fuel') || d.includes('petrol') || d.includes('diesel')) {
        return catMap.get('fuel') || defaultCatId;
      }
      if (d.includes('adapter') || d.includes('wire') || d.includes('optical reader') || d.includes('cabling') || d.includes('wifi') || d.includes('iron') || d.includes('screwdriver') || d.includes('electrical')) {
        return catMap.get('electrical supplies') || catMap.get('it supplies') || catMap.get('small tools') || defaultCatId;
      }
      if (d.includes('mask') || d.includes('glove') || d.includes('safety') || d.includes('vest') || d.includes('shoe')) {
        return catMap.get('safety items') || defaultCatId;
      }
      if (d.includes('troly') || d.includes('trolley') || d.includes('forklift') || d.includes('pallet') || d.includes('tape') || d.includes('rope')) {
        return catMap.get('warehouse equipment') || defaultCatId;
      }
      if (d.includes('service') || d.includes('maintenance') || d.includes('repair') || d.includes('extinguisher')) {
        return catMap.get('maintenance') || defaultCatId;
      }
      if (d.includes('stationery') || d.includes('barcode') || d.includes('paper') || d.includes('pen') || d.includes('file')) {
        return catMap.get('stationery') || catMap.get('office supplies') || defaultCatId;
      }
      if (d.includes('labor') || d.includes('labour') || d.includes('worker')) {
        return catMap.get('external labor') || defaultCatId;
      }
      return defaultCatId;
    };

    // Helper to resolve or create projects
    const resolveProject = async (pName?: string): Promise<string | null> => {
      if (!pName) return null;
      const clean = pName.trim();
      const lower = clean.toLowerCase();
      if (projMap.has(lower)) return projMap.get(lower)!;

      // Fuzzy checks
      if (lower.includes('head office')) return projMap.get('head office') || null;
      if (lower.includes('sagemcom three phase')) return projMap.get('sagemcom three phase') || projMap.get('sagemcom') || null;
      if (lower.includes('sagemcom')) return projMap.get('sagemcom') || null;
      if (lower.includes('tadoom 50% ectron 50%') || lower.includes('ectron 50% & tadoom 50%') || lower.includes('tadoom & ectron 50%')) {
        return projMap.get('tadoom & ectron 50%') || projMap.get('ectron 50% & tadoom 50%') || null;
      }
      if (lower.includes('ect project')) return projMap.get('ect project') || null;
      if (lower.includes('tadoom')) return projMap.get('tadoom') || null;
      if (lower.includes('ectron')) return projMap.get('ectron') || null;

      // Create new project
      try {
        const { data: newP } = await supabase.from('projects').insert([{ name: clean, active: true }]).select('id').single();
        if (newP) {
          projMap.set(lower, newP.id);
          return newP.id;
        }
      } catch (e) {}
      return null;
    };

    // 2. Prepare rows for insertion
    const preparedInserts: any[] = [];
    const usedNosInCurrentBatch = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const dateStr = (row.expense_date || '').trim();
      const [y = '2026', m = '01'] = dateStr.split('-');

      // Determine Category
      let categoryId: string | null = null;
      if (row.category_name && catMap.has(row.category_name.toLowerCase().trim())) {
        categoryId = catMap.get(row.category_name.toLowerCase().trim())!;
      } else if (autoCategorize) {
        categoryId = smartCategorize(row.request_description);
      } else {
        categoryId = defaultCatId;
      }

      // Determine Employee
      let employeeId: string | null = null;
      if (row.employee_name && profMap.has(row.employee_name.toLowerCase().trim())) {
        employeeId = profMap.get(row.employee_name.toLowerCase().trim())!;
      } else if (defaultEmployeeId) {
        employeeId = defaultEmployeeId;
      }

      // Determine Project
      const projectId = await resolveProject(row.project_name);

      // Determine Unique Expense No
      let finalExpenseNo = '';
      if (prefixMode === 'as_is' && row.expense_no) {
        let candidate = row.expense_no.trim();
        if (!existingExpenseNos.has(candidate.toLowerCase()) && !usedNosInCurrentBatch.has(candidate.toLowerCase())) {
          finalExpenseNo = candidate;
        }
      }

      if (!finalExpenseNo) {
        // Generate PC-YYYY-MM-###
        let seq = i + 1;
        if (row.expense_no && /^\d+$/.test(row.expense_no.trim())) {
          seq = parseInt(row.expense_no.trim(), 10);
        }
        let candidate = `PC-${y}-${m.padStart(2, '0')}-${seq.toString().padStart(3, '0')}`;
        let retry = 0;
        while (existingExpenseNos.has(candidate.toLowerCase()) || usedNosInCurrentBatch.has(candidate.toLowerCase())) {
          retry++;
          candidate = `PC-${y}-${m.padStart(2, '0')}-${(seq + retry).toString().padStart(3, '0')}`;
        }
        finalExpenseNo = candidate;
      }

      usedNosInCurrentBatch.add(finalExpenseNo.toLowerCase());

      preparedInserts.push({
        expense_no: finalExpenseNo,
        expense_date: dateStr,
        request_description: row.request_description || 'General Expense',
        category_id: categoryId,
        employee_id: employeeId,
        project_id: projectId,
        amount: Number(row.amount || 0),
        created_by: user?.id,
        updated_by: user?.id
      });
    }

    // 3. Insert into Supabase
    const { data: inserted, error: insertErr } = await supabase
      .from('petty_cash_expenses')
      .insert(preparedInserts)
      .select('id, amount');

    if (insertErr) {
      console.error('Error inserting imported expenses:', insertErr);
      return { error: insertErr.message || 'Failed to save imported expenses' };
    }

    const insertedIds = (inserted || []).map((x: any) => x.id);
    const sumAmount = (inserted || []).reduce((acc: number, x: any) => acc + Number(x.amount || 0), 0);

    // 4. Optionally assign to batch
    if (targetBatchId && insertedIds.length > 0) {
      try {
        await assignInvoicesToBatch(targetBatchId, insertedIds);
      } catch (bErr) {
        console.error('Error assigning imported expenses to batch:', bErr);
      }
    }

    revalidatePath('/petty-cash/dashboard');
    revalidatePath('/petty-cash/settlement');

    return {
      success: true,
      count: insertedIds.length,
      totalAmount: sumAmount
    };
  } catch (err: any) {
    console.error('Unexpected error in importPettyCashExpenses:', err);
    return { error: err.message || 'Failed to process import' };
  }
}


