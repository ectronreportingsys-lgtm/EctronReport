import React from 'react';
import PettyCashAnalyticsDashboard from '@/components/petty-cash/PettyCashAnalyticsDashboard';
import { getPettyCashAnalyticsData } from '../actions/analyticsActions';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Petty Cash Analytics | ECTRON Reporting System',
  description: 'Executive analytics and KPI dashboard for Petty Cash expenses and budget monitoring',
};

export default async function PettyCashAnalyticsPage() {
  const data = await getPettyCashAnalyticsData();

  return (
    <PettyCashAnalyticsDashboard
      initialExpenses={data.expenses}
      allProjects={data.allProjects}
      baseProjects={data.baseProjects}
      availableYears={data.availableYears}
      initialBudgets={data.budgets}
    />
  );
}
