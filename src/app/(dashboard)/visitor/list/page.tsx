import { getVisits, getAvailableYears } from '@/lib/visitorService';
import VisitorDashboardView from '@/components/visitor/VisitorDashboardView';

export const metadata = {
  title: 'Manage Visits List | ECTRON Visitor Management',
  description: 'Complete management and administration of ECTRON registered visits and visitors'
};

export default async function VisitorListPage() {
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
      mode="manage"
    />
  );
}
