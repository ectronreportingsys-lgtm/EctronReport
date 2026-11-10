import React from 'react';
import { createClient } from '@/lib/supabase-server';
import { getBatches, PettyCashBatch } from '@/app/(dashboard)/petty-cash/actions/batchesActions';
import PettyCashBatchesSection from '@/components/petty-cash/PettyCashBatchesSection';

export const metadata = {
  title: 'All Petty Cash Batches | ECTRON',
  description: 'View and manage all petty cash batches and preparation files'
};

export default async function PettyCashBatchesPage() {
  const supabase = await createClient();

  let batchesData: PettyCashBatch[] = [];
  let expensesData: any[] = [];

  try {
    batchesData = await getBatches();
  } catch (e) {
    console.error('Error fetching batches:', e);
  }

  try {
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
      .order('expense_date', { ascending: false });

    if (!error && expenses) {
      expensesData = expenses;
    }
  } catch (e) {
    console.error('Error fetching expenses for batches:', e);
  }

  return (
    <PettyCashBatchesSection
      initialBatches={batchesData}
      expensesData={expensesData}
      isFullPage={true}
    />
  );
}
