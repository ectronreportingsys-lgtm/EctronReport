import React from 'react';
import { getSettlementData } from '@/app/(dashboard)/petty-cash/actions/settlementActions';
import SettlementView from '@/components/petty-cash/settlement/SettlementView';

export const metadata = {
  title: 'Employee Settlement & Custody Ledgers | ECTRON Petty Cash',
  description: 'Manage personal expense reimbursements and company petty cash custody independently'
};

export default async function EmployeeSettlementPage(props: {
  searchParams: Promise<{
    year?: string;
    month?: string;
    employeeId?: string;
    batchId?: string;
    transferType?: string;
    cumulative?: string;
  }>;
}) {
  const searchParams = await props.searchParams;

  const filters = {
    year: searchParams?.year && searchParams.year !== 'all' ? parseInt(searchParams.year, 10) : undefined,
    month: searchParams?.month && searchParams.month !== 'all' ? parseInt(searchParams.month, 10) : undefined,
    employeeId: searchParams?.employeeId && searchParams.employeeId !== 'all' ? searchParams.employeeId : undefined,
    batchId: searchParams?.batchId && searchParams.batchId !== 'all' ? searchParams.batchId : undefined,
    transferType: searchParams?.transferType && searchParams.transferType !== 'all' ? searchParams.transferType : undefined,
    isCumulative: searchParams?.cumulative !== 'false'
  };

  const initialData = await getSettlementData(filters);

  return (
    <SettlementView initialData={initialData} />
  );
}
