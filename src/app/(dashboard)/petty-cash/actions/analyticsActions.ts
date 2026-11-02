'use server';

import { createClient } from '@/lib/supabase-server';
import fs from 'fs/promises';
import path from 'path';

export interface PettyCashExpenseRecord {
  id: string;
  expense_no: string;
  expense_date: string;
  request_description: string;
  category_id: string | null;
  category_name?: string;
  employee_id: string | null;
  employee_name?: string;
  project_id: string | null;
  project_name?: string;
  amount: number;
}

export interface ProjectAllocationItem {
  projectName: string;
  percentage: number;
}

export interface BudgetConfig {
  monthlyBudgets?: Record<string, number>; // e.g. "2026-10": 1000
  yearlyBudgets?: Record<string, number>;  // e.g. "2026": 12000
  defaultMonthlyBudget?: number | null;
}

export interface AnalyticsDataPayload {
  expenses: PettyCashExpenseRecord[];
  allProjects: Array<{ id: string; name: string }>;
  baseProjects: string[];
  availableYears: number[];
  availableMonths: string[]; // YYYY-MM
  budgets: BudgetConfig;
}

const SETTINGS_FILE = path.join(process.cwd(), 'src', 'data', 'petty-cash-settings.json');
const BATCHES_FILE = path.join(process.cwd(), 'src', 'data', 'petty-cash-batches.json');

/**
 * Parses project allocations from a project name string.
 * Supports patterns:
 * - "Ectron 80%, AAMU 20%"
 * - "Ectron 85%, NEC 5%, AAMU 10%"
 * - "Tadoom & Ectron 50%"
 * - "Ectron 50% & Tadoom 50%"
 * - "Head Office" (100%)
 */
export async function parseProjectAllocationsHelper(projectName?: string | null): Promise<ProjectAllocationItem[]> {
  if (!projectName || !projectName.trim()) {
    return [{ projectName: 'Unassigned', percentage: 100 }];
  }

  const clean = projectName.trim();

  // Multi-allocation with commas e.g. "Ectron 80%, AAMU 20%"
  if (clean.includes(',')) {
    const parts = clean.split(',').map(p => p.trim()).filter(Boolean);
    const parsed: ProjectAllocationItem[] = [];
    for (const part of parts) {
      const match = part.match(/^(.*?)\s*(\d+(?:\.\d+)?)\s*%/);
      if (match) {
        parsed.push({
          projectName: match[1].trim(),
          percentage: parseFloat(match[2])
        });
      } else {
        parsed.push({ projectName: part, percentage: 100 / parts.length });
      }
    }
    if (parsed.length > 0) return parsed;
  }

  // Multi-allocation with '&' e.g. "Tadoom & Ectron 50%" or "Ectron 50% & Tadoom 50%"
  if (clean.includes('&')) {
    const hasSinglePercentAtEnd = /^(.*?)\s*&\s*(.*?)\s*(\d+(?:\.\d+)?)\s*%$/.exec(clean);
    if (hasSinglePercentAtEnd) {
      const p1 = hasSinglePercentAtEnd[1].trim();
      const p2 = hasSinglePercentAtEnd[2].trim();
      const pct = parseFloat(hasSinglePercentAtEnd[3]);
      return [
        { projectName: p1, percentage: pct },
        { projectName: p2, percentage: pct }
      ];
    }

    const parts = clean.split('&').map(p => p.trim()).filter(Boolean);
    const parsed: ProjectAllocationItem[] = [];
    for (const part of parts) {
      const match = part.match(/^(.*?)\s*(\d+(?:\.\d+)?)\s*%/);
      if (match) {
        parsed.push({
          projectName: match[1].trim(),
          percentage: parseFloat(match[2])
        });
      } else {
        parsed.push({ projectName: part, percentage: 50 });
      }
    }
    if (parsed.length > 0) return parsed;
  }

  // Single project with percentage e.g. "Ectron 100%"
  const singleMatch = clean.match(/^(.*?)\s*(\d+(?:\.\d+)?)\s*%/);
  if (singleMatch) {
    return [{
      projectName: singleMatch[1].trim(),
      percentage: parseFloat(singleMatch[2])
    }];
  }

  // Single standard project name (100%)
  return [{ projectName: clean, percentage: 100 }];
}

export async function getPettyCashAnalyticsData(): Promise<AnalyticsDataPayload> {
  const supabase = await createClient();

  // 1. Fetch all expenses with category, profile, and project joins
  const { data: rawExpenses, error: expError } = await supabase
    .from('petty_cash_expenses')
    .select(`
      id,
      expense_no,
      expense_date,
      request_description,
      amount,
      category_id,
      employee_id,
      project_id,
      petty_cash_categories (name),
      profiles (full_name),
      projects (id, name)
    `)
    .order('expense_date', { ascending: false });

  if (expError) {
    console.error('Error fetching petty cash expenses for analytics:', expError);
  }

  // 2. Fetch projects table
  const { data: rawProjects } = await supabase
    .from('projects')
    .select('id, name')
    .order('name');

  // 3. Read settings for configured budgets
  let budgets: BudgetConfig = {};
  try {
    const settingsContent = await fs.readFile(SETTINGS_FILE, 'utf-8');
    const settings = JSON.parse(settingsContent);
    if (settings.budgets) {
      budgets = settings.budgets;
    } else if (settings.monthlyBudgets) {
      budgets = { monthlyBudgets: settings.monthlyBudgets };
    }
  } catch (err) {
    // No settings file or no budgets set
  }

  // Also check batch advance amounts if no budget is configured in settings
  try {
    const batchesContent = await fs.readFile(BATCHES_FILE, 'utf-8');
    const parsedBatches = JSON.parse(batchesContent);
    const batches = Array.isArray(parsedBatches.batches) ? parsedBatches.batches : [];
    
    // If budgets.monthlyBudgets is not explicitly defined, accumulate batch advance amounts as fallback budget
    if (!budgets.monthlyBudgets || Object.keys(budgets.monthlyBudgets).length === 0) {
      const batchBudgets: Record<string, number> = {};
      batches.forEach((b: any) => {
        if (b.year && b.month && typeof b.advanceAmount === 'number' && b.advanceAmount > 0) {
          const ym = `${b.year}-${String(b.month).padStart(2, '0')}`;
          batchBudgets[ym] = (batchBudgets[ym] || 0) + b.advanceAmount;
        }
      });
      if (Object.keys(batchBudgets).length > 0) {
        budgets.monthlyBudgets = batchBudgets;
      }
    }
  } catch (err) {
    // ignore
  }

  // 4. Map expenses to flat objects
  const expenses: PettyCashExpenseRecord[] = (rawExpenses || []).map((e: any) => {
    return {
      id: e.id,
      expense_no: e.expense_no,
      expense_date: e.expense_date,
      request_description: e.request_description || '',
      category_id: e.category_id,
      category_name: e.petty_cash_categories?.name || 'Uncategorized',
      employee_id: e.employee_id,
      employee_name: e.profiles?.full_name || 'Unassigned',
      project_id: e.project_id,
      project_name: e.projects?.name || 'Unassigned',
      amount: Number(e.amount) || 0
    };
  });

  // 5. Compute distinct years and months from actual transaction dates
  const yearSet = new Set<number>();
  const monthSet = new Set<string>();

  expenses.forEach(e => {
    if (e.expense_date && /^\d{4}-\d{2}/.test(e.expense_date)) {
      const y = parseInt(e.expense_date.substring(0, 4), 10);
      const ym = e.expense_date.substring(0, 7);
      if (!isNaN(y)) yearSet.add(y);
      monthSet.add(ym);
    }
  });

  // Current year fallback if empty
  if (yearSet.size === 0) {
    yearSet.add(new Date().getFullYear());
  }

  const availableYears = Array.from(yearSet).sort((a, b) => b - a);
  const availableMonths = Array.from(monthSet).sort();

  // 6. Compute base project names (resolving multi-project composite names)
  const baseProjectSet = new Set<string>();
  const allProjects = (rawProjects || []).map((p: any) => ({ id: p.id, name: p.name }));

  allProjects.forEach(p => {
    const name = p.name || '';
    if (!name.includes('%') && !name.includes('&')) {
      baseProjectSet.add(name);
    } else {
      // Parse composite names to extract base project names
      const parts = name.split(/[,&]/);
      parts.forEach((part: string) => {
        const cleanName = part.replace(/\d+(?:\.\d+)?\s*%/g, '').trim();
        if (cleanName && cleanName.length > 1) {
          baseProjectSet.add(cleanName);
        }
      });
    }
  });

  const baseProjects = Array.from(baseProjectSet).sort((a, b) => a.localeCompare(b));

  return {
    expenses,
    allProjects,
    baseProjects,
    availableYears,
    availableMonths,
    budgets
  };
}

export async function saveBudgetConfig(budgets: BudgetConfig) {
  try {
    let currentSettings: any = {};
    try {
      const content = await fs.readFile(SETTINGS_FILE, 'utf-8');
      currentSettings = JSON.parse(content);
    } catch (e) {
      currentSettings = {};
    }

    currentSettings.budgets = budgets;
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(currentSettings, null, 2), 'utf-8');
    return { success: true };
  } catch (err: any) {
    console.error('Error saving budget config:', err);
    return { error: err.message || 'Failed to save budget' };
  }
}
