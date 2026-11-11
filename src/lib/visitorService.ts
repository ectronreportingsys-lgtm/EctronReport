import fs from 'fs';
import path from 'path';
import { createAdminClient } from './supabase-admin';
import { VisitRecord, OrganizationGroup, VisitorItem, extractOrganizationGroups } from './visitorTypes';

export * from './visitorTypes';

const LOCAL_STORE_PATH = path.join(process.cwd(), 'src', 'data', 'visits-store.json');

// Ensure local store file exists
function ensureLocalStore(): VisitRecord[] {
  try {
    if (!fs.existsSync(path.dirname(LOCAL_STORE_PATH))) {
      fs.mkdirSync(path.dirname(LOCAL_STORE_PATH), { recursive: true });
    }
    if (fs.existsSync(LOCAL_STORE_PATH)) {
      const content = fs.readFileSync(LOCAL_STORE_PATH, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error reading local visits store:', err);
  }
  return [];
}

function writeLocalStore(visits: VisitRecord[]) {
  try {
    if (!fs.existsSync(path.dirname(LOCAL_STORE_PATH))) {
      fs.mkdirSync(path.dirname(LOCAL_STORE_PATH), { recursive: true });
    }
    fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify(visits, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving local visits store:', err);
  }
}

// Helper to encode structured metadata (organizations & coordination_by) into notes string
export function encodeVisitMetadata(
  notes: string | undefined,
  metadata: { organizations?: OrganizationGroup[]; coordination_by?: string }
): string {
  const cleanNotes = (notes || '').replace(/\s*<!--ECTRON_METADATA:[\s\S]*?-->/g, '').trim();
  const metaObj: any = {};
  if (metadata.organizations && metadata.organizations.length > 0) {
    metaObj.organizations = metadata.organizations;
  }
  if (metadata.coordination_by) {
    metaObj.coordination_by = metadata.coordination_by;
  }
  if (Object.keys(metaObj).length === 0) return cleanNotes;
  const metaString = `\n<!--ECTRON_METADATA:${JSON.stringify(metaObj)}-->`;
  return cleanNotes ? `${cleanNotes}${metaString}` : metaString.trim();
}

// Helper to decode structured metadata from notes string
export function decodeVisitMetadata(rawNotes: string | undefined): {
  cleanNotes: string;
  organizations?: OrganizationGroup[];
  coordination_by?: string;
} {
  if (!rawNotes) return { cleanNotes: '' };
  const match = rawNotes.match(/<!--ECTRON_METADATA:([\s\S]*?)-->/);
  if (match) {
    try {
      const parsed = JSON.parse(match[1]);
      const cleanNotes = rawNotes.replace(/\s*<!--ECTRON_METADATA:[\s\S]*?-->/g, '').trim();
      return {
        cleanNotes,
        organizations: Array.isArray(parsed.organizations) ? parsed.organizations : undefined,
        coordination_by: parsed.coordination_by || undefined
      };
    } catch (e) {
      // ignore
    }
  }
  return { cleanNotes: rawNotes };
}

// Generate next sequential visit number for a year: VIS-YYYY-0001
export async function getNextVisitNumber(year: number = new Date().getFullYear()): Promise<string> {
  const prefix = `VIS-${year}-`;
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('visits')
      .select('visit_number')
      .like('visit_number', `${prefix}%`)
      .order('visit_number', { ascending: false })
      .limit(1);

    if (!error && data && data.length > 0) {
      const match = data[0].visit_number.match(/(\d+)$/);
      const nextNum = match ? parseInt(match[1], 10) + 1 : 1;
      return `${prefix}${String(nextNum).padStart(4, '0')}`;
    }
  } catch (e) {
    // fallback to local store
  }

  const localVisits = ensureLocalStore();
  const yearVisits = localVisits.filter(v => v.visit_number && v.visit_number.startsWith(prefix));
  let maxNum = 0;
  for (const v of yearVisits) {
    const match = v.visit_number.match(/(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  return `${prefix}${String(maxNum + 1).padStart(4, '0')}`;
}

// Get all visits with optional filtering
export async function getVisits(filters?: {
  year?: number;
  month?: number;
  search?: string;
  source?: string;
  country?: string;
  coordination?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<VisitRecord[]> {
  try {
    const supabase = createAdminClient();
    let query = supabase
      .from('visits')
      .select('*, visit_visitors(*)')
      .order('visit_date', { ascending: false })
      .order('time_in', { ascending: false });

    if (filters?.year) {
      const start = `${filters.year}-01-01`;
      const end = `${filters.year}-12-31`;
      query = query.gte('visit_date', start).lte('visit_date', end);
    }

    if (filters?.source && filters.source !== 'all') {
      query = query.eq('registration_source', filters.source);
    }

    if (filters?.country && filters.country !== 'all') {
      query = query.eq('country', filters.country);
    }

    if (filters?.dateFrom) {
      query = query.gte('visit_date', filters.dateFrom);
    }

    if (filters?.dateTo) {
      query = query.lte('visit_date', filters.dateTo);
    }

    const { data, error } = await query;
    if (!error && data) {
      let results: VisitRecord[] = data.map((v: any) => {
        const { cleanNotes, organizations, coordination_by } = decodeVisitMetadata(v.notes);
        const visitorsList: VisitorItem[] = (v.visit_visitors || []).map((vis: any) => ({ ...vis }));

        let orgGroups = organizations;
        if (!orgGroups || orgGroups.length === 0) {
          orgGroups = extractOrganizationGroups({
            ...v,
            notes: cleanNotes,
            visitors: visitorsList
          });
        }

        // Attach organization info to each visitor if known from orgGroups
        if (orgGroups && orgGroups.length > 0) {
          orgGroups.forEach(org => {
            (org.visitors || []).forEach(ov => {
              const matchVis = visitorsList.find(vl => vl.id === ov.id || (vl.full_name_ar === ov.full_name_ar && vl.full_name_en === ov.full_name_en));
              if (matchVis) {
                matchVis.organization_ar = org.organization_ar;
                matchVis.organization_en = org.organization_en;
              }
            });
          });
        }

        return {
          ...v,
          notes: cleanNotes,
          coordination_by: coordination_by || v.coordination_by || 'Ectron',
          visitors: visitorsList,
          organizations: orgGroups
        };
      });

      // Merge any local fallback visits not in Supabase yet
      try {
        const localStore = ensureLocalStore();
        const supaNumSet = new Set(results.map(v => v.visit_number));
        const missingFromSupa = localStore.filter(v => v.visit_number && !supaNumSet.has(v.visit_number));
        if (missingFromSupa.length > 0) {
          results = [...missingFromSupa, ...results];
        }
      } catch (mergeErr) {
        // Ignore merge error
      }

      // Apply month filter in memory
      if (filters?.month && filters.month > 0) {
        results = results.filter(v => {
          const m = new Date(v.visit_date).getMonth() + 1;
          return m === Number(filters.month);
        });
      }

      // Apply text search
      if (filters?.search && filters.search.trim()) {
        const q = filters.search.toLowerCase().trim();
        results = results.filter(v => {
          const matchOrg = (v.organization_en || '').toLowerCase().includes(q) || (v.organization_ar || '').includes(q);
          const matchReason = (v.visit_reason || '').toLowerCase().includes(q);
          const matchNumber = (v.visit_number || '').toLowerCase().includes(q);
          const matchVisitor = (v.visitors || []).some(
            vis => (vis.full_name_en || '').toLowerCase().includes(q) ||
                   (vis.full_name_ar || '').includes(q) ||
                   (vis.phone_number || '').includes(q)
          );
          return matchOrg || matchReason || matchNumber || matchVisitor;
        });
      }

      return results;
    }
  } catch (err) {
    // If Supabase table isn't created yet, fall back to local store
  }

  // Local fallback
  let list = ensureLocalStore();

  if (filters?.year) {
    list = list.filter(v => {
      const y = parseInt(v.visit_date.substring(0, 4), 10);
      return y === filters.year;
    });
  }

  if (filters?.month && filters.month > 0) {
    list = list.filter(v => {
      const parts = v.visit_date.split('-');
      return parseInt(parts[1], 10) === Number(filters.month);
    });
  }

  if (filters?.source && filters.source !== 'all') {
    list = list.filter(v => v.registration_source === filters.source);
  }

  if (filters?.country && filters.country !== 'all') {
    list = list.filter(v => (v.country || '').toLowerCase() === filters.country!.toLowerCase());
  }

  if (filters?.dateFrom) {
    list = list.filter(v => v.visit_date >= filters.dateFrom!);
  }

  if (filters?.dateTo) {
    list = list.filter(v => v.visit_date <= filters.dateTo!);
  }

  if (filters?.search && filters.search.trim()) {
    const q = filters.search.toLowerCase().trim();
    list = list.filter(v => {
      const matchOrg = (v.organization_en || '').toLowerCase().includes(q) || (v.organization_ar || '').includes(q);
      const matchReason = (v.visit_reason || '').toLowerCase().includes(q);
      const matchNumber = (v.visit_number || '').toLowerCase().includes(q);
      const matchVisitor = (v.visitors || []).some(
        vis => (vis.full_name_en || '').toLowerCase().includes(q) ||
               (vis.full_name_ar || '').includes(q) ||
               (vis.phone_number || '').includes(q)
      );
      return matchOrg || matchReason || matchNumber || matchVisitor;
    });
  }

  // Sort descending by date and time
  return list
    .map(v => ({
      ...v,
      organizations: v.organizations && v.organizations.length > 0 ? v.organizations : extractOrganizationGroups(v)
    }))
    .sort((a, b) => {
      const cmp = b.visit_date.localeCompare(a.visit_date);
      if (cmp !== 0) return cmp;
      return (b.time_in || '').localeCompare(a.time_in || '');
    });
}

// Get single visit by ID
export async function getVisitById(id: string): Promise<VisitRecord | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('visits')
      .select('*, visit_visitors(*)')
      .eq('id', id)
      .single();

    if (!error && data) {
      const { cleanNotes, organizations, coordination_by } = decodeVisitMetadata(data.notes);
      const visitorsList: VisitorItem[] = (data.visit_visitors || []).map((vis: any) => ({ ...vis }));
      const orgGroups = (organizations && organizations.length > 0)
        ? organizations
        : extractOrganizationGroups({ ...data, notes: cleanNotes, visitors: visitorsList });

      if (orgGroups && orgGroups.length > 0) {
        orgGroups.forEach(org => {
          (org.visitors || []).forEach(ov => {
            const matchVis = visitorsList.find(vl => vl.id === ov.id || (vl.full_name_ar === ov.full_name_ar && vl.full_name_en === ov.full_name_en));
            if (matchVis) {
              matchVis.organization_ar = org.organization_ar;
              matchVis.organization_en = org.organization_en;
            }
          });
        });
      }

      return {
        ...data,
        notes: cleanNotes,
        coordination_by: coordination_by || data.coordination_by || 'Ectron',
        visitors: visitorsList,
        organizations: orgGroups
      };
    }
  } catch (err) {
    // fallback
  }

  const list = ensureLocalStore();
  const v = list.find(item => item.id === id);
  if (!v) return null;
  return {
    ...v,
    organizations: v.organizations && v.organizations.length > 0 ? v.organizations : extractOrganizationGroups(v)
  };
}

// Create visit with multiple visitors atomically
export async function createVisit(data: {
  visit_date?: string;
  time_in?: string;
  time_out?: string | null;
  organization_en?: string;
  organization_ar?: string;
  country?: string;
  coordination_by?: string;
  visit_reason?: string;
  notes?: string;
  registration_source: 'public' | 'internal' | 'import';
  created_by?: string | null;
  created_by_name?: string | null;
  visitors?: Array<{
    organization_en?: string;
    organization_ar?: string;
    full_name_en?: string;
    full_name_ar?: string;
    phone_number?: string;
  }>;
  organizations?: OrganizationGroup[];
}): Promise<{ success: boolean; visit?: VisitRecord; error?: string }> {
  try {
    const visitDate = data.visit_date || new Date().toISOString().split('T')[0];
    const year = parseInt(visitDate.substring(0, 4), 10) || new Date().getFullYear();
    const nextVisitNumber = await getNextVisitNumber(year);

    const nowTime = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Muscat',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(new Date());

    const timeIn = data.time_in || nowTime;

    // Process multiple organizations if provided
    let finalVisitors: VisitorItem[] = data.visitors || [];
    let summaryOrgEn = (data.organization_en || '').trim();
    let summaryOrgAr = (data.organization_ar || '').trim();
    let structuredOrganizations: OrganizationGroup[] = data.organizations || [];

    if (data.organizations && data.organizations.length > 0) {
      finalVisitors = [];
      const orgNamesEn: string[] = [];
      const orgNamesAr: string[] = [];

      data.organizations.forEach((org, orgIdx) => {
        const oEn = (org.organization_en || '').trim();
        const oAr = (org.organization_ar || '').trim();
        if (oEn && !orgNamesEn.includes(oEn)) orgNamesEn.push(oEn);
        if (oAr && !orgNamesAr.includes(oAr)) orgNamesAr.push(oAr);

        (org.visitors || []).forEach((vis, visIdx) => {
          finalVisitors.push({
            id: vis.id || `vis-${Date.now()}-${orgIdx + 1}-${visIdx + 1}`,
            organization_en: oEn,
            organization_ar: oAr,
            full_name_en: (vis.full_name_en || '').trim(),
            full_name_ar: (vis.full_name_ar || '').trim(),
            phone_number: (vis.phone_number || '').trim(),
            created_at: new Date().toISOString()
          });
        });
      });

      if (!summaryOrgEn && orgNamesEn.length > 0) summaryOrgEn = orgNamesEn.join(' / ');
      if (!summaryOrgAr && orgNamesAr.length > 0) summaryOrgAr = orgNamesAr.join(' / ');
    } else if (finalVisitors.length > 0) {
      structuredOrganizations = extractOrganizationGroups({
        organization_en: summaryOrgEn,
        organization_ar: summaryOrgAr,
        visitors: finalVisitors
      });
    }

    const encodedNotes = encodeVisitMetadata(data.notes, {
      organizations: structuredOrganizations,
      coordination_by: data.coordination_by || 'Ectron'
    });

    // Try Supabase first
    try {
      const supabase = createAdminClient();

      // Check if stored procedure exists
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('create_visit_with_visitors', {
        p_visit: {
          visit_number: nextVisitNumber,
          visit_date: visitDate,
          time_in: timeIn,
          time_out: data.time_out || null,
          organization_en: summaryOrgEn,
          organization_ar: summaryOrgAr,
          country: data.country || 'Oman',
          coordination_by: data.coordination_by || 'Ectron',
          visit_reason: data.visit_reason || '',
          notes: encodedNotes,
          organizations: structuredOrganizations,
          registration_source: data.registration_source,
          created_by: data.created_by || null
        },
        p_visitors: finalVisitors
      });

      if (!rpcErr && rpcRes && rpcRes.id) {
        const created = await getVisitById(rpcRes.id);
        if (created) {
          try {
            const localVisits = ensureLocalStore();
            const existsIdx = localVisits.findIndex(v => v.id === created.id || v.visit_number === created.visit_number);
            if (existsIdx >= 0) {
              localVisits[existsIdx] = created;
            } else {
              localVisits.unshift(created);
            }
            writeLocalStore(localVisits);
          } catch (e) {
            // Ignore local backup error
          }
          return { success: true, visit: created };
        }
      }

      // If RPC not available, do standard Supabase insert
      const { data: insertedVisit, error: visitErr } = await supabase
        .from('visits')
        .insert({
          visit_number: nextVisitNumber,
          visit_date: visitDate,
          time_in: timeIn,
          time_out: data.time_out || null,
          organization_en: summaryOrgEn,
          organization_ar: summaryOrgAr,
          country: data.country || 'Oman',
          visit_reason: data.visit_reason || '',
          notes: encodedNotes,
          registration_source: data.registration_source,
          created_by: data.created_by || null
        })
        .select()
        .single();

      if (!visitErr && insertedVisit) {
        if (finalVisitors.length > 0) {
          const visitorsToInsert = finalVisitors.map(vis => ({
            visit_id: insertedVisit.id,
            full_name_en: vis.full_name_en || '',
            full_name_ar: vis.full_name_ar || '',
            phone_number: vis.phone_number || null
          }));
          await supabase.from('visit_visitors').insert(visitorsToInsert);
        }

        const fullVisit = await getVisitById(insertedVisit.id);
        const savedRecord = fullVisit || insertedVisit;
        try {
          const localVisits = ensureLocalStore();
          const existsIdx = localVisits.findIndex(v => v.id === savedRecord.id || v.visit_number === savedRecord.visit_number);
          if (existsIdx >= 0) {
            localVisits[existsIdx] = savedRecord;
          } else {
            localVisits.unshift(savedRecord);
          }
          writeLocalStore(localVisits);
        } catch (e) {
          // Ignore local backup error
        }
        return { success: true, visit: savedRecord };
      }
    } catch (dbErr) {
      console.warn('Supabase insert failed, syncing to local store:', dbErr);
    }

    // Local Store Fallback
    const localVisits = ensureLocalStore();
    const newId = 'visit-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    
    const formattedVisitors: VisitorItem[] = finalVisitors.map((vis, idx) => ({
      id: vis.id || `vis-${Date.now()}-${idx + 1}`,
      visit_id: newId,
      organization_en: vis.organization_en || summaryOrgEn,
      organization_ar: vis.organization_ar || summaryOrgAr,
      full_name_en: vis.full_name_en || '',
      full_name_ar: vis.full_name_ar || '',
      phone_number: vis.phone_number || '',
      created_at: new Date().toISOString()
    }));

    const newRecord: VisitRecord = {
      id: newId,
      visit_number: nextVisitNumber,
      visit_date: visitDate,
      time_in: timeIn,
      time_out: data.time_out || null,
      organization_en: summaryOrgEn,
      organization_ar: summaryOrgAr,
      country: data.country || 'Oman',
      coordination_by: data.coordination_by || 'Ectron',
      visit_reason: data.visit_reason || '',
      notes: data.notes || '',
      registration_source: data.registration_source,
      created_by: data.created_by || null,
      created_by_name: data.created_by_name || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      visitors: formattedVisitors,
      organizations: structuredOrganizations
    };

    localVisits.unshift(newRecord);
    writeLocalStore(localVisits);

    return { success: true, visit: newRecord };
  } catch (err: any) {
    console.error('Error creating visit:', err);
    return { success: false, error: err?.message || 'Failed to save visit' };
  }
}

// Update visit details
export async function updateVisit(id: string, updates: Partial<VisitRecord>): Promise<{ success: boolean; error?: string }> {
  let supabaseUpdated = false;

  try {
    const supabase = createAdminClient();
    
    // Process multiple organizations if provided
    let finalVisitors = updates.visitors;
    const orgNamesEn: string[] = [];
    const orgNamesAr: string[] = [];

    if (updates.organizations && updates.organizations.length > 0) {
      finalVisitors = [];
      updates.organizations.forEach(org => {
        const oEn = (org.organization_en || '').trim();
        const oAr = (org.organization_ar || '').trim();
        if (oEn && !orgNamesEn.includes(oEn)) orgNamesEn.push(oEn);
        if (oAr && !orgNamesAr.includes(oAr)) orgNamesAr.push(oAr);

        (org.visitors || []).forEach(vis => {
          finalVisitors!.push({
            id: vis.id,
            visit_id: id,
            organization_en: oEn,
            organization_ar: oAr,
            full_name_en: vis.full_name_en,
            full_name_ar: vis.full_name_ar,
            phone_number: vis.phone_number
          });
        });
      });
    }

    // Build clean Supabase payload using only existing columns in public.visits
    const supabaseVisitPayload: any = { updated_at: new Date().toISOString() };
    if (updates.visit_date !== undefined) supabaseVisitPayload.visit_date = updates.visit_date;
    if (updates.time_in !== undefined) supabaseVisitPayload.time_in = updates.time_in;
    if (updates.time_out !== undefined) supabaseVisitPayload.time_out = updates.time_out;
    if (updates.country !== undefined) supabaseVisitPayload.country = updates.country;
    if (updates.visit_reason !== undefined) supabaseVisitPayload.visit_reason = updates.visit_reason;
    const finalOrgs = (updates.organizations && updates.organizations.length > 0)
      ? updates.organizations
      : undefined;

    const encodedNotes = encodeVisitMetadata(updates.notes, {
      organizations: finalOrgs,
      coordination_by: updates.coordination_by
    });
    if (updates.notes !== undefined || finalOrgs || updates.coordination_by) {
      supabaseVisitPayload.notes = encodedNotes;
    }
    if (updates.registration_source !== undefined) supabaseVisitPayload.registration_source = updates.registration_source;

    if (orgNamesEn.length > 0) supabaseVisitPayload.organization_en = orgNamesEn.join(' / ');
    else if (updates.organization_en !== undefined) supabaseVisitPayload.organization_en = updates.organization_en;

    if (orgNamesAr.length > 0) supabaseVisitPayload.organization_ar = orgNamesAr.join(' / ');
    else if (updates.organization_ar !== undefined) supabaseVisitPayload.organization_ar = updates.organization_ar;

    const { error: visitUpdateErr } = await supabase.from('visits').update(supabaseVisitPayload).eq('id', id);
    if (!visitUpdateErr) {
      supabaseUpdated = true;
      if (finalVisitors && finalVisitors.length > 0) {
        await supabase.from('visit_visitors').delete().eq('visit_id', id);
        const visitorsToInsert = finalVisitors.map(vis => ({
          visit_id: id,
          full_name_en: vis.full_name_en || '',
          full_name_ar: vis.full_name_ar || '',
          phone_number: vis.phone_number || null
        }));
        await supabase.from('visit_visitors').insert(visitorsToInsert);
      }
    }
  } catch (e) {
    console.error('Supabase updateVisit error:', e);
  }

  // Also update local store (or fallback)
  const list = ensureLocalStore();
  const idx = list.findIndex(v => v.id === id);
  if (idx !== -1) {
    let finalVisitors = updates.visitors || list[idx].visitors || [];
    let summaryEn = updates.organization_en !== undefined ? updates.organization_en : list[idx].organization_en;
    let summaryAr = updates.organization_ar !== undefined ? updates.organization_ar : list[idx].organization_ar;
    let orgs = updates.organizations !== undefined ? updates.organizations : list[idx].organizations;

    if (updates.organizations && updates.organizations.length > 0) {
      finalVisitors = [];
      const orgNamesEn: string[] = [];
      const orgNamesAr: string[] = [];

      updates.organizations.forEach((org, oIdx) => {
        const oEn = (org.organization_en || '').trim();
        const oAr = (org.organization_ar || '').trim();
        if (oEn && !orgNamesEn.includes(oEn)) orgNamesEn.push(oEn);
        if (oAr && !orgNamesAr.includes(oAr)) orgNamesAr.push(oAr);

        (org.visitors || []).forEach((vis, vIdx) => {
          finalVisitors.push({
            id: vis.id || `vis-${Date.now()}-${oIdx + 1}-${vIdx + 1}`,
            visit_id: id,
            organization_en: oEn,
            organization_ar: oAr,
            full_name_en: vis.full_name_en,
            full_name_ar: vis.full_name_ar,
            phone_number: vis.phone_number,
            created_at: vis.created_at || new Date().toISOString()
          });
        });
      });

      if (orgNamesEn.length > 0) summaryEn = orgNamesEn.join(' / ');
      if (orgNamesAr.length > 0) summaryAr = orgNamesAr.join(' / ');
      orgs = updates.organizations;
    }

    list[idx] = {
      ...list[idx],
      ...updates,
      organization_en: summaryEn,
      organization_ar: summaryAr,
      visitors: finalVisitors,
      organizations: orgs || extractOrganizationGroups({ ...list[idx], visitors: finalVisitors }),
      updated_at: new Date().toISOString()
    };
    writeLocalStore(list);
    return { success: true };
  }

  if (supabaseUpdated) {
    return { success: true };
  }

  return { success: false, error: 'Visit record not found' };
}

// Update Time Out
export async function updateVisitTimeOut(id: string, timeOut: string): Promise<{ success: boolean; error?: string }> {
  return updateVisit(id, { time_out: timeOut });
}

// Delete visit (cascades to visitors and purges from both Supabase and Local Store)
export async function deleteVisit(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const list = ensureLocalStore();
    // 1. Identify visit details from local store or argument
    const localTarget = list.find(v => v.id === id || v.visit_number === id);
    const visitNumber = localTarget?.visit_number;
    const localId = localTarget?.id || id;

    const isUuid = (val?: string | null) =>
      Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

    // 2. Perform deletion in Supabase
    try {
      const supabase = createAdminClient();
      const supaIdsToDelete = new Set<string>();

      // Check if id or localId is a valid UUID
      if (isUuid(id)) supaIdsToDelete.add(id);
      if (isUuid(localId)) supaIdsToDelete.add(localId);

      // Search by visit_number in Supabase to find its exact Supabase UUID
      if (visitNumber) {
        const { data: byNum } = await supabase
          .from('visits')
          .select('id, visit_number')
          .eq('visit_number', visitNumber);
        if (byNum && byNum.length > 0) {
          byNum.forEach(v => {
            if (v.id) supaIdsToDelete.add(v.id);
          });
        }
      }

      // If id was a visit_number itself
      if (id.startsWith('VIS-')) {
        const { data: byRawNum } = await supabase
          .from('visits')
          .select('id, visit_number')
          .eq('visit_number', id);
        if (byRawNum && byRawNum.length > 0) {
          byRawNum.forEach(v => {
            if (v.id) supaIdsToDelete.add(v.id);
          });
        }
      }

      // For every matched Supabase visit, delete child visitors first, then visit
      for (const supaId of supaIdsToDelete) {
        try {
          await supabase.from('visit_visitors').delete().eq('visit_id', supaId);
        } catch (visErr) {
          console.warn('Error deleting visit_visitors in Supabase:', visErr);
        }

        try {
          await supabase.from('visits').delete().eq('id', supaId);
        } catch (vErr) {
          console.warn('Error deleting visit in Supabase:', vErr);
        }
      }

      // Also ensure deletion by visit_number if known
      if (visitNumber) {
        await supabase.from('visits').delete().eq('visit_number', visitNumber);
      }
      if (id.startsWith('VIS-')) {
        await supabase.from('visits').delete().eq('visit_number', id);
      }
    } catch (supaErr) {
      console.warn('Supabase delete error:', supaErr);
    }

    // 3. ALWAYS purge from local store by ALL matching keys so it never reappears
    const remaining = list.filter(v => {
      if (v.id === id || v.id === localId) return false;
      if (visitNumber && v.visit_number === visitNumber) return false;
      if (v.visit_number === id) return false;
      return true;
    });

    writeLocalStore(remaining);
    return { success: true };
  } catch (err: any) {
    console.error('Error in deleteVisit:', err);
    return { success: false, error: err?.message || 'Failed to delete visit' };
  }
}

// Calculate Dashboard Summary Metrics for selected Year and Month
export async function getDashboardStats(year: number, month?: number) {
  const visits = await getVisits({ year, month });

  const totalVisits = visits.length;
  let totalVisitors = 0;
  const orgsSet = new Set<string>();
  let publicCount = 0;
  let internalCount = 0;
  let importCount = 0;
  let completedCount = 0; // has time_out

  visits.forEach(v => {
    const vCount = v.visitors && v.visitors.length > 0 ? v.visitors.length : 1;
    totalVisitors += vCount;

    if (v.organizations && v.organizations.length > 0) {
      v.organizations.forEach(o => {
        const k = (o.organization_en || o.organization_ar || '').trim().toLowerCase();
        if (k) orgsSet.add(k);
      });
    } else {
      const orgKey = (v.organization_en || v.organization_ar || '').trim().toLowerCase();
      if (orgKey) {
        orgsSet.add(orgKey);
      }
    }

    if (v.registration_source === 'public') publicCount++;
    else if (v.registration_source === 'internal') internalCount++;
    else if (v.registration_source === 'import') importCount++;

    if (v.time_out && v.time_out.trim()) completedCount++;
  });

  const totalOrganizations = orgsSet.size;
  const averageVisitorsPerVisit = totalVisits > 0 ? (totalVisitors / totalVisits).toFixed(1) : '0';

  return {
    year,
    month: month || null,
    totalVisits,
    totalVisitors,
    totalOrganizations,
    averageVisitorsPerVisit: parseFloat(averageVisitorsPerVisit),
    breakdown: {
      publicCount,
      internalCount,
      importCount,
      completedCount,
      activeCount: totalVisits - completedCount
    }
  };
}

// Get all unique available years across stored visits
export async function getAvailableYears(): Promise<number[]> {
  const visits = await getVisits();
  const currentYear = new Date().getFullYear();
  const yearsSet = new Set<number>([currentYear]);

  visits.forEach(v => {
    if (v.visit_date) {
      const y = parseInt(v.visit_date.substring(0, 4), 10);
      if (!isNaN(y) && y > 2000 && y < 2100) {
        yearsSet.add(y);
      }
    }
  });

  return Array.from(yearsSet).sort((a, b) => b - a);
}
