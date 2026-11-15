import { getVisits, getAvailableYears } from '@/lib/visitorService';
import VisitorDashboardView from '@/components/visitor/VisitorDashboardView';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Visitor Management Dashboard | ECTRON Reporting System',
  description: 'Centralized visitor tracking, statistical summary, and reporting dashboard'
};

export default async function VisitorDashboardPage() {
  const visits = await getVisits();
  const availableYears = await getAvailableYears(visits);

  return (
    <VisitorDashboardView
      initialVisits={visits}
      initialYears={availableYears}
      initialSelectedYear={0}
      mode="dashboard"
    />
  );
}
