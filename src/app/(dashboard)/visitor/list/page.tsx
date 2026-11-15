import { getVisits, getAvailableYears } from '@/lib/visitorService';
import VisitorDashboardView from '@/components/visitor/VisitorDashboardView';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Manage Visits List | ECTRON Visitor Management',
  description: 'Complete management and administration of ECTRON registered visits and visitors'
};

export default async function VisitorListPage() {
  const visits = await getVisits();
  const availableYears = await getAvailableYears(visits);

  return (
    <VisitorDashboardView
      initialVisits={visits}
      initialYears={availableYears}
      initialSelectedYear={0}
      mode="manage"
    />
  );
}
