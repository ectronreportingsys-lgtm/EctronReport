'use server';

import fs from 'fs/promises';
import path from 'path';
import { revalidatePath } from 'next/cache';
import { 
  EDCSDocument, 
  EDCSDocumentVersion, 
  computeDocumentStatus 
} from '@/lib/edcsTypes';

export type { EDCSDocument, EDCSDocumentVersion };

const DATA_FILE = path.join(process.cwd(), 'src', 'data', 'edcs-sample-documents.json');

async function readSampleData(): Promise<EDCSDocument[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    const docs = Array.isArray(parsed.documents) ? parsed.documents : [];
    
    return docs.map((doc: any) => {
      const { status, daysRemaining } = computeDocumentStatus(doc);
      return {
        ...doc,
        status,
        daysRemaining
      };
    });
  } catch (err) {
    console.error('Error reading EDCS sample data:', err);
    return [];
  }
}

async function writeSampleData(documents: EDCSDocument[]): Promise<void> {
  try {
    const dir = path.dirname(DATA_FILE);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify({ documents }, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Unable to write to local EDCS file (serverless environment):', err);
  }
}

// Fetch all documents with dynamic statuses
export async function getEDCSDocuments(): Promise<EDCSDocument[]> {
  const docs = await readSampleData();
  
  // Default sort: Expiring soonest first, then expired, then active, then permanent
  return docs.sort((a, b) => {
    // If both have daysRemaining, sort by daysRemaining ascending (e.g. 4 days before 9 days)
    if (a.daysRemaining !== undefined && b.daysRemaining !== undefined) {
      // Prioritize positive expiring soon (0 to 14) first
      const aIsSoon = a.daysRemaining >= 0 && a.daysRemaining <= 14;
      const bIsSoon = b.daysRemaining >= 0 && b.daysRemaining <= 14;
      if (aIsSoon && !bIsSoon) return -1;
      if (!aIsSoon && bIsSoon) return 1;

      return a.daysRemaining - b.daysRemaining;
    }
    if (a.daysRemaining !== undefined) return -1;
    if (b.daysRemaining !== undefined) return 1;
    return a.name.localeCompare(b.name);
  });
}

// Get KPI Metrics
export async function getEDCSKPIs() {
  const docs = await readSampleData();
  
  let total = docs.length;
  let active = 0;
  let expiringSoon = 0;
  let expired = 0;
  let permanent = 0;

  for (const doc of docs) {
    if (doc.status === 'Active') active++;
    else if (doc.status === 'Expiring Soon') expiringSoon++;
    else if (doc.status === 'Expired') expired++;
    else if (doc.status === 'Permanent') permanent++;
  }

  return {
    total,
    active,
    expiringSoon,
    expired,
    permanent
  };
}

// Create new document (Phase 1 mock storage & validation)
export async function createEDCSDocument(formData: {
  name: string;
  nameAr?: string;
  referenceNo?: string;
  category: string;
  department: string;
  issueDate?: string;
  expiryDate?: string;
  isPermanent: boolean;
  responsiblePerson: string;
  reminderEmail: string;
  notes?: string;
  fileName?: string;
  fileSize?: string;
  fileType?: string;
}): Promise<{ success: boolean; document?: EDCSDocument; error?: string }> {
  try {
    if (!formData.name?.trim()) return { success: false, error: 'Document Name is required.' };
    if (!formData.category?.trim()) return { success: false, error: 'Category is required.' };
    if (!formData.department?.trim()) return { success: false, error: 'Department is required.' };
    if (!formData.responsiblePerson?.trim()) return { success: false, error: 'Responsible person is required.' };
    if (!formData.isPermanent && !formData.expiryDate) {
      return { success: false, error: 'Expiry date is required for expiring documents.' };
    }
    if (!formData.isPermanent && !formData.reminderEmail?.trim()) {
      return { success: false, error: 'Reminder email is required to monitor document expirations.' };
    }

    const docs = await readSampleData();
    const docId = `EDCS-${new Date().getFullYear()}-${String(docs.length + 1).padStart(3, '0')}`;
    const refNo = formData.referenceNo?.trim() || `ECT-DOC-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;

    const newVersion: EDCSDocumentVersion = {
      version: 'v1.0',
      uploadedAt: new Date().toISOString(),
      uploadedBy: formData.responsiblePerson,
      fileName: formData.fileName || `${formData.name.replace(/\s+/g, '_')}_v1.pdf`,
      fileSize: formData.fileSize || '1.5 MB',
      fileType: formData.fileType || 'application/pdf',
      notes: 'Initial upload (v1.0)'
    };

    const newDocRaw: Omit<EDCSDocument, 'status' | 'daysRemaining'> = {
      id: docId,
      name: formData.name.trim(),
      nameAr: formData.nameAr?.trim() || undefined,
      referenceNo: refNo,
      category: formData.category,
      department: formData.department,
      issueDate: formData.issueDate || new Date().toISOString().split('T')[0],
      expiryDate: formData.isPermanent ? undefined : formData.expiryDate,
      isPermanent: !!formData.isPermanent,
      responsiblePerson: formData.responsiblePerson.trim(),
      reminderEmail: formData.reminderEmail.trim(),
      notes: formData.notes?.trim() || '',
      currentVersion: 'v1.0',
      fileName: newVersion.fileName,
      fileSize: newVersion.fileSize,
      fileType: newVersion.fileType,
      versions: [newVersion],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const { status, daysRemaining } = computeDocumentStatus(newDocRaw);
    const newDoc: EDCSDocument = {
      ...newDocRaw,
      status,
      daysRemaining
    };

    docs.unshift(newDoc);
    await writeSampleData(docs);

    revalidatePath('/library/dashboard');
    revalidatePath('/library/registry');

    return { success: true, document: newDoc };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create document.' };
  }
}

// Renew document (Version Bump, preservation of prior versions, new expiry date, audit trail)
export async function renewEDCSDocument(
  docId: string,
  payload: {
    newExpiryDate: string;
    newIssueDate?: string;
    renewedBy: string;
    fileName?: string;
    fileSize?: string;
    fileType?: string;
    notes?: string;
  }
): Promise<{ success: boolean; document?: EDCSDocument; error?: string }> {
  try {
    const docs = await readSampleData();
    const docIndex = docs.findIndex(d => d.id === docId);
    if (docIndex === -1) return { success: false, error: 'Document not found.' };

    const doc = docs[docIndex];
    if (!payload.newExpiryDate) return { success: false, error: 'New expiry date is required for renewal.' };

    // Calculate new version string e.g. v1.0 -> v2.0
    const currentVerNum = parseFloat(doc.currentVersion.replace('v', '')) || 1.0;
    const nextVer = `v${(Math.floor(currentVerNum) + 1).toFixed(1)}`;

    const newVersionObj: EDCSDocumentVersion = {
      version: nextVer,
      uploadedAt: new Date().toISOString(),
      uploadedBy: payload.renewedBy || doc.responsiblePerson,
      fileName: payload.fileName || `${doc.name.replace(/\s+/g, '_')}_${nextVer}.pdf`,
      fileSize: payload.fileSize || '2.0 MB',
      fileType: payload.fileType || 'application/pdf',
      notes: payload.notes || `Document renewal: valid until ${payload.newExpiryDate}`
    };

    const updatedDocRaw: Omit<EDCSDocument, 'status' | 'daysRemaining'> = {
      ...doc,
      currentVersion: nextVer,
      expiryDate: payload.newExpiryDate,
      issueDate: payload.newIssueDate || new Date().toISOString().split('T')[0],
      fileName: newVersionObj.fileName,
      fileSize: newVersionObj.fileSize,
      fileType: newVersionObj.fileType,
      versions: [newVersionObj, ...(doc.versions || [])],
      updatedAt: new Date().toISOString()
    };

    const { status, daysRemaining } = computeDocumentStatus(updatedDocRaw);
    const updatedDoc: EDCSDocument = {
      ...updatedDocRaw,
      status,
      daysRemaining
    };

    docs[docIndex] = updatedDoc;
    await writeSampleData(docs);

    revalidatePath('/library/dashboard');
    revalidatePath('/library/registry');

    return { success: true, document: updatedDoc };
  } catch (err: any) {
    return { success: false, error: err.message || 'Renewal failed.' };
  }
}

// Delete document
export async function deleteEDCSDocument(docId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const docs = await readSampleData();
    const filtered = docs.filter(d => d.id !== docId);
    await writeSampleData(filtered);

    revalidatePath('/library/dashboard');
    revalidatePath('/library/registry');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Deletion failed.' };
  }
}
