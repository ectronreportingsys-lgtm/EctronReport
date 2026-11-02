import React from 'react';
import { createClient } from '@/lib/supabase-server';
import PettyCashSummaryCards from '@/components/petty-cash/PettyCashSummaryCards';
import PettyCashBatchesSection from '@/components/petty-cash/PettyCashBatchesSection';
import ExpenseTable from '@/components/petty-cash/ExpenseTable';
import { getBatches, PettyCashBatch } from '@/app/(dashboard)/petty-cash/actions/batchesActions';
import T from '@/components/layout/T';

export default async function PettyCashDashboard() {
  const supabase = await createClient();
  
  // Calculate current month's dates
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  let spent = 0;
  let expenseCount = 0;

  let expensesData: any[] = [];
  let categoriesResp: any = { data: [] };
  let profilesResp: any = { data: [] };
  let projectsResp: any = { data: [] };
  let recurringResp: any[] = [];
  let batchesData: PettyCashBatch[] = [];

  try {
    try {
      batchesData = await getBatches();
    } catch (e) {}

    try {
      const { getRecurringDescriptions } = await import('@/app/(dashboard)/petty-cash/actions/resourcesActions');
      recurringResp = await getRecurringDescriptions();
    } catch (e) {}

    [categoriesResp, profilesResp, projectsResp] = await Promise.all([
      supabase.from('petty_cash_categories').select('id, name').eq('active', true).order('name'),
      supabase.from('profiles').select('id, full_name, username').eq('is_active', true).order('full_name'),
      supabase.from('projects').select('id, name').eq('active', true).order('name')
    ]);

    // Filter profiles by allowed petty cash employee IDs
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const settingsPath = path.join(process.cwd(), 'src', 'data', 'petty-cash-settings.json');
      const content = await fs.readFile(settingsPath, 'utf-8');
      const settings = JSON.parse(content);
      if (settings.allowedEmployeeIds && settings.allowedEmployeeIds.length > 0 && profilesResp.data) {
        const allowedSet = new Set(settings.allowedEmployeeIds);
        profilesResp.data = profilesResp.data.filter((p: any) => allowedSet.has(p.id));
      }
    } catch (e) {}

    const { data: expenses, error } = await supabase
      .from('petty_cash_expenses')
      .select(`
        id, 
        expense_no, 
        expense_date, 
        request_description, 
        category_id,
        employee_id,
        project_id,
        amount, 
        attachment_url,
        petty_cash_categories (name),
        profiles (full_name, username),
        projects (name)
      `)
      .order('expense_date', { ascending: true });

    if (!error && expenses) {
      expensesData = expenses;
      const currentMonthExpenses = expenses.filter(exp => 
        exp.expense_date && exp.expense_date >= startOfMonth && exp.expense_date <= endOfMonth
      );
      spent = currentMonthExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
      expenseCount = currentMonthExpenses.length;
    }
  } catch (e) {
    console.error('Error fetching petty cash expenses:', e);
  }

  const budget = 1000;
  const remaining = Math.max(0, budget - spent);
  const usedPercentage = (spent / budget) * 100;

  const summary = {
    budget,
    spent,
    remaining,
    usedPercentage,
    expenseCount
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white"><T text="Petty Cash Dashboard" /></h1>
          <p className="text-zinc-400 text-sm mt-1"><T text="Manage monthly budget, expenses, and employee settlements" /></p>
        </div>
      </div>
      
      <PettyCashSummaryCards 
        summary={summary} 
        batches={batchesData}
        options={{ 
          categories: categoriesResp.data || [], 
          profiles: profilesResp.data || [], 
          projects: projectsResp.data || []
        }}
      />

      <PettyCashBatchesSection 
        initialBatches={batchesData} 
        expensesData={expensesData} 
      />

      <div className="glass rounded-2xl p-6 border border-border mt-2">
        <ExpenseTable 
          expensesData={expensesData} 
          batches={batchesData}
          options={{ 
            categories: categoriesResp.data || [], 
            profiles: profilesResp.data || [], 
            projects: projectsResp.data || [],
            recurringDescriptions: recurringResp || []
          }} 
        />
      </div>
    </div>
  );
}
