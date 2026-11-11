export interface VisitorItem {
  id?: string;
  visit_id?: string;
  organization_en?: string;
  organization_ar?: string;
  full_name_en?: string;
  full_name_ar?: string;
  phone_number?: string;
  created_at?: string;
}

export interface OrganizationGroup {
  id?: string;
  organization_en: string;
  organization_ar: string;
  visitors: VisitorItem[];
}

export interface VisitRecord {
  id: string;
  visit_number: string;
  visit_date: string;
  time_in: string;
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
  created_at?: string;
  updated_at?: string;
  visitors?: VisitorItem[];
  organizations?: OrganizationGroup[];
}

// Helper to group visitors under their respective organizations
export function extractOrganizationGroups(visit: Partial<VisitRecord>): OrganizationGroup[] {
  if (visit.organizations && Array.isArray(visit.organizations) && visit.organizations.length > 0) {
    return visit.organizations;
  }

  const visitors = visit.visitors || [];
  if (visitors.length === 0) {
    if (visit.organization_en || visit.organization_ar) {
      return [{
        id: 'org-1',
        organization_en: visit.organization_en || '',
        organization_ar: visit.organization_ar || '',
        visitors: []
      }];
    }
    return [];
  }

  // 1. If individual visitors carry distinct organization information, group by it
  const hasSpecificOrgs = visitors.some(v => Boolean((v.organization_ar || v.organization_en)?.trim()));
  if (hasSpecificOrgs) {
    const map = new Map<string, { organization_en: string; organization_ar: string; visitors: VisitorItem[] }>();

    visitors.forEach((vis) => {
      const orgEn = (vis.organization_en || visit.organization_en || '').trim();
      const orgAr = (vis.organization_ar || visit.organization_ar || '').trim();
      const key = (orgEn.toLowerCase() + '___' + orgAr.toLowerCase()) || 'default';

      if (!map.has(key)) {
        map.set(key, {
          organization_en: orgEn || visit.organization_en || '',
          organization_ar: orgAr || visit.organization_ar || '',
          visitors: []
        });
      }
      map.get(key)!.visitors.push(vis);
    });

    return Array.from(map.values()).map((val, idx) => ({
      id: `org-${idx + 1}`,
      organization_en: val.organization_en,
      organization_ar: val.organization_ar,
      visitors: val.visitors
    }));
  }

  // 2. If organization_ar or organization_en contains multiple entities separated by ' / '
  const orgArParts = (visit.organization_ar || '').split(/\s*\/\s*/).map(s => s.trim()).filter(Boolean);
  const orgEnParts = (visit.organization_en || '').split(/\s*\/\s*/).map(s => s.trim()).filter(Boolean);
  const splitCount = Math.max(orgArParts.length, orgEnParts.length);

  if (splitCount > 1) {
    const groups: OrganizationGroup[] = [];
    for (let i = 0; i < splitCount; i++) {
      groups.push({
        id: `org-${i + 1}`,
        organization_ar: orgArParts[i] || orgEnParts[i] || '',
        organization_en: orgEnParts[i] || orgArParts[i] || '',
        visitors: []
      });
    }

    // Assign visitors to organizations
    if (visitors.length === splitCount) {
      visitors.forEach((vis, i) => {
        groups[i].visitors.push({
          ...vis,
          organization_ar: groups[i].organization_ar,
          organization_en: groups[i].organization_en
        });
      });
    } else {
      // Distribute evenly or place under corresponding organizations
      visitors.forEach((vis, i) => {
        const targetIdx = i < splitCount ? i : splitCount - 1;
        groups[targetIdx].visitors.push({
          ...vis,
          organization_ar: groups[targetIdx].organization_ar,
          organization_en: groups[targetIdx].organization_en
        });
      });
    }

    return groups;
  }

  // 3. Single organization fallback
  return [{
    id: 'org-1',
    organization_en: visit.organization_en || '',
    organization_ar: visit.organization_ar || '',
    visitors: visitors.map(v => ({
      ...v,
      organization_en: v.organization_en || visit.organization_en || '',
      organization_ar: v.organization_ar || visit.organization_ar || ''
    }))
  }];
}
