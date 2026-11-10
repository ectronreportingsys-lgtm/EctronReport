export interface EDCSDocumentVersion {
  version: string;
  uploadedAt: string;
  uploadedBy: string;
  fileName: string;
  fileSize: string;
  fileType: string;
  notes?: string;
  downloadUrl?: string;
}

export interface EDCSDocument {
  id: string;
  name: string;
  nameAr?: string;
  referenceNo: string;
  category: string;
  department: string;
  issueDate?: string;
  expiryDate?: string;
  isPermanent: boolean;
  responsiblePerson: string;
  reminderEmail: string;
  status: 'Active' | 'Expiring Soon' | 'Expired' | 'Permanent';
  daysRemaining?: number;
  notes?: string;
  currentVersion: string;
  fileName?: string;
  fileSize?: string;
  fileType?: string;
  versions: EDCSDocumentVersion[];
  lastNotificationSentAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Pure helper function to compute status and days remaining relative to today in Asia/Muscat timezone
export function computeDocumentStatus(doc: Omit<EDCSDocument, 'status' | 'daysRemaining'>): {
  status: 'Active' | 'Expiring Soon' | 'Expired' | 'Permanent';
  daysRemaining?: number;
} {
  if (doc.isPermanent || !doc.expiryDate) {
    return { status: 'Permanent', daysRemaining: undefined };
  }

  const today = new Date();
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  const [expYear, expMonth, expDay] = doc.expiryDate.split('-').map(Number);
  const expiryDate = new Date(expYear, expMonth - 1, expDay);

  const diffTime = expiryDate.getTime() - todayDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { status: 'Expired', daysRemaining: diffDays };
  } else if (diffDays <= 14) {
    return { status: 'Expiring Soon', daysRemaining: diffDays };
  } else {
    return { status: 'Active', daysRemaining: diffDays };
  }
}
