import { getVisits, getAvailableYears } from '@/lib/visitorService';
import VisitorDashboardView from '@/components/visitor/VisitorDashboardView';

export const metadata = {
  title: 'Visitor Management Dashboard | ECTRON Reporting System',
  description: 'Centralized visitor tracking, statistical summary, and reporting dashboard'
};

export default async function VisitorDashboardPage() {
  const [visits, availableYears] = await Promise.all([
    getVisits(),
    getAvailableYears()
  ]);

  const defaultYear = availableYears.length > 0 ? availableYears[0] : new Date().getFullYear();

  return (
    <VisitorDashboardView
      initialVisits={visits}
      initialYears={availableYears}
      initialSelectedYear={defaultYear}
      mode="dashboard"
    />
  );
}
