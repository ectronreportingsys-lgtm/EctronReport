'use server';

import { 
  createVisit, 
  getVisits, 
  getDashboardStats, 
  getAvailableYears, 
  updateVisitTimeOut, 
  updateVisit, 
  deleteVisit,
  getVisitById,
  VisitRecord 
} from '@/lib/visitorService';
import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

// Submit public visitor registration
export async function submitPublicRegistration(payload: {
  organization_en?: string;
  organization_ar?: string;
  country?: string;
  coordination_by?: string;
  visit_reason?: string;
  notes?: string;
  honeypot?: string;
  visitors?: Array<{
    full_name_en?: string;
    full_name_ar?: string;
    phone_number?: string;
  }>;
  organizations?: Array<{
    organization_en?: string;
    organization_ar?: string;
    visitors: Array<{
      full_name_en?: string;
      full_name_ar?: string;
      phone_number?: string;
    }>;
  }>;
}) {
  if (payload.honeypot) {
    return { success: true, visit_number: 'VIS-PROCESSED' };
  }

  // Handle structured organizations if provided
  if (payload.organizations && payload.organizations.length > 0) {
    const validOrganizations = payload.organizations
      .map(org => {
        const oEn = (org.organization_en || '').trim();
        const oAr = (org.organization_ar || '').trim();
        const validVisitors = (org.visitors || [])
          .map(v => ({
            full_name_en: (v.full_name_en || '').trim(),
            full_name_ar: (v.full_name_ar || '').trim(),
            phone_number: (v.phone_number || '').trim()
          }))
          .filter(v => v.full_name_en || v.full_name_ar);

        return {
          organization_en: oEn,
          organization_ar: oAr,
          visitors: validVisitors
        };
      })
      .filter(org => (org.organization_en || org.organization_ar) && org.visitors.length > 0);

    const totalVisitors = validOrganizations.reduce((acc, org) => acc + org.visitors.length, 0);
    if (validOrganizations.length === 0 || totalVisitors === 0) {
      return { success: false, error: 'Please enter at least one organization and visitor name.' };
    }

    const summaryEn = validOrganizations.map(o => o.organization_en).filter(Boolean).join(' / ');
    const summaryAr = validOrganizations.map(o => o.organization_ar).filter(Boolean).join(' / ');

    const res = await createVisit({
      organization_en: summaryEn,
      organization_ar: summaryAr,
      country: payload.country?.trim() || 'Oman',
      coordination_by: payload.coordination_by?.trim() || 'Ectron',
      visit_reason: payload.visit_reason?.trim(),
      notes: payload.notes?.trim(),
      registration_source: 'public',
      organizations: validOrganizations
    });

    if (res.success && res.visit) {
      revalidatePath('/visitor/dashboard');
      revalidatePath('/visitor/list');
      return {
        success: true,
        visit_number: res.visit.visit_number,
        visit_date: res.visit.visit_date,
        time_in: res.visit.time_in
      };
    }
    return { success: false, error: res.error || 'Failed to save visit' };
  }

  // Fallback: flat visitors array
  const validVisitors = (payload.visitors || [])
    .map(v => ({
      full_name_en: (v.full_name_en || '').trim(),
      full_name_ar: (v.full_name_ar || '').trim(),
      phone_number: (v.phone_number || '').trim()
    }))
    .filter(v => v.full_name_en || v.full_name_ar);

  if (validVisitors.length === 0) {
    return { success: false, error: 'Please provide at least one visitor name.' };
  }

  const res = await createVisit({
    organization_en: payload.organization_en?.trim(),
    organization_ar: payload.organization_ar?.trim(),
    country: payload.country?.trim() || 'Oman',
    coordination_by: payload.coordination_by?.trim() || 'Ectron',
    visit_reason: payload.visit_reason?.trim(),
    notes: payload.notes?.trim(),
    registration_source: 'public',
    visitors: validVisitors
  });

  if (res.success && res.visit) {
    revalidatePath('/visitor/dashboard');
    revalidatePath('/visitor/list');
    return {
      success: true,
      visit_number: res.visit.visit_number,
      visit_date: res.visit.visit_date,
      time_in: res.visit.time_in
    };
  }

  return { success: false, error: res.error || 'Failed to save visit' };
}

// Submit internal visitor registration (by authenticated ECTRON employees)
export async function submitInternalRegistration(payload: {
  visit_date?: string;
  time_in?: string;
  time_out?: string | null;
  organization_en?: string;
  organization_ar?: string;
  country?: string;
  coordination_by?: string;
  visit_reason?: string;
  notes?: string;
  visitors?: Array<{
    full_name_en?: string;
    full_name_ar?: string;
    phone_number?: string;
  }>;
  organizations?: Array<{
    organization_en?: string;
    organization_ar?: string;
    visitors: Array<{
      full_name_en?: string;
      full_name_ar?: string;
      phone_number?: string;
    }>;
  }>;
}) {
  try {
    let createdByName = 'Staff';
    let createdById: string | null = null;

    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        createdById = user.id;
        const { data: prof } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
        if (prof?.full_name) {
          createdByName = prof.full_name;
        }
      }
    } catch (authErr) {
      // Auth retrieval fallback
    }

    // Handle structured organizations if provided
    if (payload.organizations && payload.organizations.length > 0) {
      const validOrganizations = payload.organizations
        .map(org => {
          const oEn = (org.organization_en || '').trim();
          const oAr = (org.organization_ar || '').trim();
          const validVisitors = (org.visitors || [])
            .map(v => ({
              full_name_en: (v.full_name_en || '').trim(),
              full_name_ar: (v.full_name_ar || '').trim(),
              phone_number: (v.phone_number || '').trim()
            }))
            .filter(v => v.full_name_en || v.full_name_ar);

          return {
            organization_en: oEn,
            organization_ar: oAr,
            visitors: validVisitors
          };
        })
        .filter(org => (org.organization_en || org.organization_ar) && org.visitors.length > 0);

      const totalVisitors = validOrganizations.reduce((acc, org) => acc + org.visitors.length, 0);
      if (validOrganizations.length === 0 || totalVisitors === 0) {
        return { success: false, error: 'يرجى إدخال مؤسسة واحدة على الأقل وزائر واحد تابع لها.' };
      }

      const summaryEn = validOrganizations.map(o => o.organization_en).filter(Boolean).join(' / ');
      const summaryAr = validOrganizations.map(o => o.organization_ar).filter(Boolean).join(' / ');

      const res = await createVisit({
        visit_date: payload.visit_date,
        time_in: payload.time_in,
        time_out: payload.time_out,
        organization_en: summaryEn,
        organization_ar: summaryAr,
        country: payload.country?.trim() || 'Oman',
        coordination_by: payload.coordination_by?.trim() || 'Ectron',
        visit_reason: payload.visit_reason?.trim(),
        notes: payload.notes?.trim(),
        registration_source: 'internal',
        created_by: createdById,
        created_by_name: createdByName,
        organizations: validOrganizations
      });

      if (res.success && res.visit) {
        revalidatePath('/visitor/dashboard');
        revalidatePath('/visitor/list');
        return {
          success: true,
          visit_number: res.visit.visit_number,
          visit: res.visit
        };
      }

      return { success: false, error: res.error || 'فشل في حفظ بيانات الزيارة' };
    }

    // Fallback: flat visitors array
    const validVisitors = (payload.visitors || [])
      .map(v => ({
        full_name_en: (v.full_name_en || '').trim(),
        full_name_ar: (v.full_name_ar || '').trim(),
        phone_number: (v.phone_number || '').trim()
      }))
      .filter(v => v.full_name_en || v.full_name_ar);

    if (validVisitors.length === 0) {
      return { success: false, error: 'Please provide at least one visitor name.' };
    }

    const res = await createVisit({
      visit_date: payload.visit_date,
      time_in: payload.time_in,
      time_out: payload.time_out,
      organization_en: payload.organization_en?.trim(),
      organization_ar: payload.organization_ar?.trim(),
      country: payload.country?.trim() || 'Oman',
      coordination_by: payload.coordination_by?.trim() || 'Ectron',
      visit_reason: payload.visit_reason?.trim(),
      notes: payload.notes?.trim(),
      registration_source: 'internal',
      created_by: createdById,
      created_by_name: createdByName,
      visitors: validVisitors
    });

    if (res.success && res.visit) {
      revalidatePath('/visitor/dashboard');
      revalidatePath('/visitor/list');
      return {
        success: true,
        visit_number: res.visit.visit_number,
        visit: res.visit
      };
    }

    return { success: false, error: res.error || 'Failed to save visit' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Server error occurred' };
  }
}

// Fetch dashboard statistics
export async function getDashboardData(year: number, month?: number) {
  const [stats, availableYears] = await Promise.all([
    getDashboardStats(year, month),
    getAvailableYears()
  ]);

  return { stats, availableYears };
}

// Fetch visits list with filters
export async function fetchVisitsList(filters?: {
  year?: number;
  month?: number;
  search?: string;
  source?: string;
  country?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  return await getVisits(filters);
}

// Update visit time out (Time Out)
export async function updateTimeOut(visitId: string, timeOut: string) {
  const res = await updateVisitTimeOut(visitId, timeOut);
  if (res.success) {
    revalidatePath('/visitor/dashboard');
    revalidatePath('/visitor/list');
  }
  return res;
}

// Update visit details and its visitors
export async function updateVisitDetails(visitId: string, updates: Partial<VisitRecord>) {
  const res = await updateVisit(visitId, updates);
  if (res.success) {
    revalidatePath('/visitor/dashboard');
    revalidatePath('/visitor/list');
  }
  return res;
}

// Delete visit (authorized users)
export async function removeVisit(visitId: string) {
  const res = await deleteVisit(visitId);
  if (res.success) {
    revalidatePath('/visitor/dashboard');
    revalidatePath('/visitor/list');
  }
  return res;
}

// Import historical visits from Excel data
export async function importHistoricalVisits(records: Array<{
  visit_date: string;
  time_in: string;
  time_out?: string | null;
  organization_en?: string;
  organization_ar?: string;
  country?: string;
  coordination_by?: string;
  visit_reason?: string;
  notes?: string;
  visitors: Array<{
    full_name_en?: string;
    full_name_ar?: string;
    phone_number?: string;
  }>;
}>) {
  try {
    let importedCount = 0;
    let skippedCount = 0;

    // Get existing visits to avoid exact duplicate imports (same date, time, and organization)
    const existing = await getVisits();
    const existingKeys = new Set(
      existing.map(v => `${v.visit_date}_${v.time_in}_${(v.organization_en || v.organization_ar || '').toLowerCase()}`)
    );

    for (const rec of records) {
      const key = `${rec.visit_date}_${rec.time_in}_${(rec.organization_en || rec.organization_ar || '').toLowerCase()}`;
      if (existingKeys.has(key)) {
        skippedCount++;
        continue;
      }

      const res = await createVisit({
        visit_date: rec.visit_date,
        time_in: rec.time_in,
        time_out: rec.time_out,
        organization_en: rec.organization_en,
        organization_ar: rec.organization_ar,
        country: rec.country || 'Oman',
        coordination_by: rec.coordination_by || 'Ectron',
        visit_reason: rec.visit_reason,
        notes: rec.notes,
        registration_source: 'import',
        visitors: rec.visitors && rec.visitors.length > 0 ? rec.visitors : [{ full_name_en: 'Visitor', full_name_ar: 'زائر' }]
      });

      if (res.success) {
        importedCount++;
        existingKeys.add(key);
      }
    }

    revalidatePath('/visitor/dashboard');
    revalidatePath('/visitor/list');

    return {
      success: true,
      importedCount,
      skippedCount,
      totalCount: records.length
    };
  } catch (error: any) {
    console.error('Import error:', error);
    return { success: false, error: error?.message || 'Failed to import visits' };
  }
}

// Read the default Ectron Visits List.xlsx file and return parsed preview
export async function loadDefaultExcelVisits() {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const xlsx = await import('xlsx');

    const filePath = path.join(process.cwd(), 'Ectron Visits List.xlsx');
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'Ectron Visits List.xlsx file not found on server.' };
    }

    const buffer = fs.readFileSync(filePath);
    const wb = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = wb.SheetNames.includes('Ectron Visits') ? 'Ectron Visits' : wb.SheetNames[0];
    const rawRows: any[] = xlsx.utils.sheet_to_json(wb.Sheets[sheetName]);

    function excelDateToString(serial: any) {
      if (!serial) return '2024-05-01';
      if (typeof serial === 'string') return serial;
      const utc_days = Math.floor(serial - 25569);
      const date_info = new Date(utc_days * 86400 * 1000);
      return date_info.toISOString().split('T')[0];
    }

    function excelTimeToString(serial: any) {
      if (serial === undefined || serial === null || serial === '') return '';
      if (typeof serial === 'string') return serial.trim();
      const totalSeconds = Math.round(serial * 86400);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      return String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0');
    }

    // Check existing visits for duplicate flagging
    const existing = await getVisits();
    const existingKeys = new Set(
      existing.map(v => `${v.visit_date}_${v.time_in}_${(v.organization_en || v.organization_ar || '').toLowerCase()}`)
    );

    const parsed = rawRows.map((r, i) => {
      const dateStr = excelDateToString(r.Date);
      const timeIn = excelTimeToString(r['Time In']) || '09:00';
      const timeOut = excelTimeToString(r['Time out']) || null;
      const orgEn = (r['Orgnaizatin in English'] || r['Organization in English'] || '').trim();
      const orgAr = (r['Organization in Arabic'] || '').trim();
      const country = (r['Country'] || 'Oman').trim();
      const coordBy = (r['Cordination by'] || r['Coordination by'] || r['Cordination By'] || 'Ectron').toString().trim() || 'Ectron';
      const visitReason = (r['Visit Reson'] || r['Visit Reason'] || '').trim();
      const notes = (r['Notes'] || '').trim();

      const enNames = (r['Visitor Names'] || '').toString().split(/\r?\n/).map((s: string) => s.trim()).filter(Boolean);
      const arNames = (r['Visitor Arabic Name '] || r['Visitor Arabic Name'] || '').toString().split(/\r?\n/).map((s: string) => s.trim()).filter(Boolean);
      const phone = (r['Visitor Phone'] || '').toString().trim();

      const maxVisitors = Math.max(enNames.length, arNames.length);
      const visitors = [];

      if (maxVisitors === 0) {
        // Flagged: missing visitor names
        visitors.push({
          full_name_en: orgEn ? `Representative (${orgEn})` : 'Visitor',
          full_name_ar: orgAr ? `ممثل (${orgAr})` : 'زائر',
          phone_number: phone
        });
      } else {
        for (let idx = 0; idx < maxVisitors; idx++) {
          visitors.push({
            full_name_en: enNames[idx] || '',
            full_name_ar: arNames[idx] || '',
            phone_number: idx === 0 ? phone : ''
          });
        }
      }

      const dupKey = `${dateStr}_${timeIn}_${(orgEn || orgAr).toLowerCase()}`;
      const isDuplicate = existingKeys.has(dupKey);
      const isMissingNames = enNames.length === 0 && arNames.length === 0;

      let status: 'ready' | 'duplicate' | 'ambiguous' = 'ready';
      if (isDuplicate) status = 'duplicate';
      else if (isMissingNames) status = 'ambiguous';

      return {
        sn: r.SN || (i + 1),
        visit_date: dateStr,
        time_in: timeIn,
        time_out: timeOut,
        organization_en: orgEn,
        organization_ar: orgAr,
        country: country,
        coordination_by: coordBy,
        visit_reason: visitReason,
        notes: notes,
        visitors: visitors,
        status: status,
        isDuplicate: isDuplicate,
        isMissingNames: isMissingNames
      };
    });

    return { success: true, rows: parsed };
  } catch (err: any) {
    console.error('Error loading default Excel:', err);
    return { success: false, error: err?.message || 'Failed to parse Excel file.' };
  }
}
