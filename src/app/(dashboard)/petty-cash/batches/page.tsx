import React from 'react';
import Link from 'next/link';
import { ArrowLeft, FolderOpen, LayoutDashboard } from 'lucide-react';
import { createClient } from '@/lib/supabase-server';
import { getBatches, PettyCashBatch } from '@/app/(dashboard)/petty-cash/actions/batchesActions';
import PettyCashBatchesSection from '@/components/petty-cash/PettyCashBatchesSection';
import T from '@/components/layout/T';

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
      .order('expense_date', { ascending: true });

    if (!error && expenses) {
      expensesData = expenses;
    }
  } catch (e) {
    console.error('Error fetching expenses for batches:', e);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Link
            href="/petty-cash/dashboard"
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors border border-zinc-700/50 shadow-sm cursor-pointer"
            title="العودة إلى لوحة تحكم النثرية"
          >
            <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
              <FolderOpen className="w-6 h-6 text-[#14B8A6]" />
              <span><T text="All Petty Cash Batches" /></span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              <T text="Comprehensive view of all batches across all months and statuses" />
            </p>
          </div>
        </div>
      </div>

      {/* Full Batches Section */}
      <PettyCashBatchesSection
        initialBatches={batchesData}
        expensesData={expensesData}
        isFullPage={true}
      />
    </div>
  );
}
