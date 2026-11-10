import React from 'react';
import { getEDCSDocuments } from '@/app/(dashboard)/library/actions/edcsActions';
import EDCSDashboardView from '@/components/library/EDCSDashboardView';

export const metadata = {
  title: 'Add New Document | EDCS Library | ECTRON',
  description: 'Upload and register new factory documents and configure 14-day expiry alerts'
};

export default async function LibraryNewDocumentPage() {
  const documents = await getEDCSDocuments();

  return (
    <EDCSDashboardView initialDocuments={documents} />
  );
}
