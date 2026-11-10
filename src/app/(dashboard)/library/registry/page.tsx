import React from 'react';
import { getEDCSDocuments } from '@/app/(dashboard)/library/actions/edcsActions';
import EDCSDashboardView from '@/components/library/EDCSDashboardView';

export const metadata = {
  title: 'Document Registry | ECTRON Document Control System (EDCS)',
  description: 'Factory document control registry, compliance certificates, and expiry tracking'
};

export default async function LibraryRegistryPage() {
  const documents = await getEDCSDocuments();

  return (
    <EDCSDashboardView initialDocuments={documents} />
  );
}
