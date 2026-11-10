import React from 'react';
import { getEDCSDocuments } from '@/app/(dashboard)/library/actions/edcsActions';
import EDCSDashboardView from '@/components/library/EDCSDashboardView';

export const metadata = {
  title: 'Library & Document Control (EDCS) | ECTRON',
  description: 'Factory document control system, expiration monitoring, and automated alerts'
};

export default async function LibraryDashboardPage() {
  const documents = await getEDCSDocuments();

  return (
    <EDCSDashboardView initialDocuments={documents} />
  );
}
