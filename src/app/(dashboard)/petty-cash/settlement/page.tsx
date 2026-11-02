import React from 'react';
import { createClient } from '@/lib/supabase-server';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import T from '@/components/layout/T';

export default async function EmployeeSettlement() {
  const supabase = await createClient();

  // Fetch all employees (profiles) who have expenses or reimbursements
  const { data: profiles } = await supabase.from('profiles').select('id, full_name, username').eq('is_active', true);
  const { data: expenses } = await supabase.from('petty_cash_expenses').select('employee_id, amount');
  const { data: reimbursements } = await supabase.from('petty_cash_reimbursements').select('employee_id, amount');

  const settlementData: any[] = [];

  if (profiles) {
    profiles.forEach(profile => {
      const empExpenses = expenses?.filter(e => e.employee_id === profile.id) || [];
      const empReimbursements = reimbursements?.filter(r => r.employee_id === profile.id) || [];

      const totalPaid = empExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const totalReimbursed = empReimbursements.reduce((sum, r) => sum + Number(r.amount), 0);
      const amountDue = totalPaid - totalReimbursed;

      if (totalPaid > 0 || totalReimbursed > 0) {
        settlementData.push({
          id: profile.id,
          name: profile.full_name || profile.username || 'Unknown',
          totalPaid,
          totalReimbursed,
          amountDue
        });
      }
    });
  }

  // Sort by Amount Due descending
  settlementData.sort((a, b) => b.amountDue - a.amountDue);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 mb-2">
        <Link 
          href="/petty-cash/dashboard" 
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white"><T text="Employee Settlement" /></h1>
          <p className="text-zinc-400 text-sm mt-1"><T text="Track employee out-of-pocket expenses and reimbursements" /></p>
        </div>
      </div>

      <div className="glass rounded-2xl p-6 border border-border dark:border-zinc-800/50">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white"><T text="Settlement Overview" /></h2>
          <button className="btn-primary-gradient bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium text-sm transition-colors shadow-lg shadow-blue-900/20">
            <T text="+ New Reimbursement" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-400 bg-zinc-800/50 uppercase">
              <tr>
                <th className="px-4 py-3 rounded-tl-lg"><T text="Employee" /></th>
                <th className="px-4 py-3"><T text="Total Paid" /></th>
                <th className="px-4 py-3"><T text="Total Reimbursed" /></th>
                <th className="px-4 py-3"><T text="Amount Due" /></th>
                <th className="px-4 py-3 rounded-tr-lg"><T text="Amount Owed" /></th>
              </tr>
            </thead>
            <tbody>
              {settlementData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-500 border-b border-zinc-800/50">
                    <T text="No settlement records found." />
                  </td>
                </tr>
              ) : (
                settlementData.map((row) => (
                  <tr key={row.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{row.name}</td>
                    <td className="px-4 py-3 text-zinc-300">OMR {row.totalPaid.toFixed(3)}</td>
                    <td className="px-4 py-3 text-emerald-400">OMR {row.totalReimbursed.toFixed(3)}</td>
                    <td className="px-4 py-3 font-bold text-blue-400">
                      {row.amountDue > 0 ? `OMR ${row.amountDue.toFixed(3)}` : '-'}
                    </td>
                    <td className="px-4 py-3 font-bold text-danger">
                      {row.amountDue < 0 ? `OMR ${Math.abs(row.amountDue).toFixed(3)}` : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
