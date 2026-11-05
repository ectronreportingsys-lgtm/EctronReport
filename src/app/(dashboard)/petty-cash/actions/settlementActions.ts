'use server';

import fs from 'fs/promises';
import path from 'path';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase-server';
import { getBatches, PettyCashBatch } from './batchesActions';

export type FundingSource = 'personal' | 'company_cash' | 'unclassified';
export type ReimbursementStatus = 'unreimbursed' | 'reimbursed' | 'not_applicable';

export type TransferType = 
  | 'personal_reimbursement_transfer' // Employee A -> Employee B (Personal funds)
  | 'company_cash_transfer'          // Employee A -> Employee B (Company custody)
  | 'company_advance'                // Company -> Employee (Advance Custody)
  | 'company_reimbursement'          // Company -> Employee (Reimbursement of personal out-of-pocket)
  | 'cash_returned_to_company';      // Employee -> Company (Custody returned)

export interface SettlementTransfer {
  id: string;
  referenceNo: string;
  transferDate: string;
  fromEmployeeId: string | null; // null represents Company Treasury
  toEmployeeId: string | null;   // null represents Company Treasury
  transferType: TransferType;
  amount: number;
  batchId?: string | null;
  notes?: string | null;
  isReversed: boolean;
  reversalReason?: string | null;
  reversedTransferId?: string | null;
  createdAt: string;
}

export interface CustodyOpeningBalance {
  employeeId: string;
  openingBalance: number;
  asOfDate: string;
  notes?: string;
  updatedAt: string;
}

export interface ExpenseClassificationMeta {
  fundingSource: FundingSource;
  reimbursementStatus: ReimbursementStatus;
  updatedAt: string;
}

// Storage paths for reliable local persistence
const TRANSFERS_FILE = path.join(process.cwd(), 'src', 'data', 'petty-cash-transfers.json');
const CUSTODY_FILE = path.join(process.cwd(), 'src', 'data', 'petty-cash-custody-openings.json');
const CLASSIFICATIONS_FILE = path.join(process.cwd(), 'src', 'data', 'petty-cash-expense-classifications.json');

// Helper: Read JSON file safely
async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    return fallback;
  }
}

// Helper: Save JSON file safely
async function saveJsonFile(filePath: string, data: any): Promise<boolean> {
  try {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`Error saving ${filePath}:`, err);
    return false;
  }
}

// ==============================================================================
// 1. Storage Operations
// ==============================================================================

export async function getTransfers(): Promise<SettlementTransfer[]> {
  // First attempt Supabase
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('petty_cash_transfers')
      .select('*')
      .order('transfer_date', { ascending: false });

    if (!error && Array.isArray(data)) {
      return data.map((t: any) => ({
        id: t.id,
        referenceNo: t.reference_no,
        transferDate: t.transfer_date,
        fromEmployeeId: t.from_employee_id,
        toEmployeeId: t.to_employee_id,
        transferType: t.transfer_type,
        amount: Number(t.amount || 0),
        batchId: t.batch_id,
        notes: t.notes,
        isReversed: Boolean(t.is_reversed),
        reversalReason: t.reversal_reason,
        reversedTransferId: t.reversed_transfer_id,
        createdAt: t.created_at
      }));
    }
  } catch (e) {
    // Fall back to local store
  }

  const stored = await readJsonFile<{ transfers: SettlementTransfer[] }>(TRANSFERS_FILE, { transfers: [] });
  return stored.transfers || [];
}

export async function saveTransferRecord(transfer: SettlementTransfer): Promise<boolean> {
  // Try Supabase insert
  try {
    const supabase = await createClient();
    await supabase.from('petty_cash_transfers').insert([{
      id: transfer.id,
      reference_no: transfer.referenceNo,
      transfer_date: transfer.transferDate,
      from_employee_id: transfer.fromEmployeeId,
      to_employee_id: transfer.toEmployeeId,
      transfer_type: transfer.transferType,
      amount: transfer.amount,
      batch_id: transfer.batchId,
      notes: transfer.notes,
      is_reversed: transfer.isReversed,
      reversal_reason: transfer.reversalReason,
      reversed_transfer_id: transfer.reversedTransferId,
      created_at: transfer.createdAt
    }]);
  } catch (e) {
    // Ignore error if table not yet run
  }

  // Always sync to local store for reliability
  const stored = await readJsonFile<{ transfers: SettlementTransfer[] }>(TRANSFERS_FILE, { transfers: [] });
  const existingIdx = stored.transfers.findIndex(t => t.id === transfer.id);
  if (existingIdx >= 0) {
    stored.transfers[existingIdx] = transfer;
  } else {
    stored.transfers.unshift(transfer);
  }
  return await saveJsonFile(TRANSFERS_FILE, stored);
}

export async function getCustodyOpeningBalances(): Promise<Record<string, CustodyOpeningBalance>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('petty_cash_custody_opening_balances').select('*');
    if (!error && Array.isArray(data)) {
      const map: Record<string, CustodyOpeningBalance> = {};
      data.forEach((row: any) => {
        map[row.employee_id] = {
          employeeId: row.employee_id,
          openingBalance: Number(row.opening_balance || 0),
          asOfDate: row.as_of_date,
          notes: row.notes,
          updatedAt: row.updated_at || row.created_at
        };
      });
      return map;
    }
  } catch (e) {}

  const stored = await readJsonFile<{ balances: Record<string, CustodyOpeningBalance> }>(CUSTODY_FILE, { balances: {} });
  return stored.balances || {};
}

export async function getExpenseClassifications(): Promise<Record<string, ExpenseClassificationMeta>> {
  const stored = await readJsonFile<{ classifications: Record<string, ExpenseClassificationMeta> }>(CLASSIFICATIONS_FILE, { classifications: {} });
  return stored.classifications || {};
}

export async function saveExpenseClassifications(classifications: Record<string, ExpenseClassificationMeta>): Promise<boolean> {
  return await saveJsonFile(CLASSIFICATIONS_FILE, { classifications });
}

// ==============================================================================
// 2. Settlement Calculations and Aggregations
// ==============================================================================

export interface SettlementFilters {
  year?: number;
  month?: number;
  employeeId?: string;
  batchId?: string;
  transferType?: string;
  isCumulative?: boolean; // If true, balances are cumulative up to selected date
}

export async function getSettlementData(filters?: SettlementFilters) {
  const supabase = await createClient();

  // 1. Fetch metadata in parallel
  const [profilesResp, expensesResp, batches, transfers, custodyOpenings, classifications] = await Promise.all([
    supabase.from('profiles').select('id, full_name, username').eq('is_active', true).order('full_name'),
    supabase.from('petty_cash_expenses').select(`
      id,
      expense_no,
      expense_date,
      request_description,
      category_id,
      employee_id,
      amount,
      project_id,
      attachment_url,
      petty_cash_categories (name),
      projects (name)
    `).order('expense_date', { ascending: false }),
    getBatches(),
    getTransfers(),
    getCustodyOpeningBalances(),
    getExpenseClassifications()
  ]);

  const profiles = profilesResp.data || [];
  const rawExpenses = expensesResp.data || [];

  // Map batch membership: invoiceId -> batchId
  const invoiceBatchMap = new Map<string, string>();
  batches.forEach(b => {
    (b.invoiceIds || []).forEach(invId => {
      invoiceBatchMap.set(invId, b.id);
    });
  });

  // Augment expenses with classification and batch info
  const allExpenses = rawExpenses.map((exp: any) => {
    const meta = classifications[exp.id];
    const fundingSource: FundingSource = meta?.fundingSource || 'unclassified';
    const reimbursementStatus: ReimbursementStatus = meta?.reimbursementStatus || (fundingSource === 'personal' ? 'unreimbursed' : 'not_applicable');
    const batchId = invoiceBatchMap.get(exp.id) || null;

    return {
      ...exp,
      amount: Number(exp.amount || 0),
      funding_source: fundingSource,
      reimbursement_status: reimbursementStatus,
      batch_id: batchId,
      category_name: exp.petty_cash_categories?.name || 'Uncategorized',
      project_name: exp.projects?.name || 'General'
    };
  });

  // Calculate cutoff date for cumulative filters
  let periodEndDate: string | null = null;
  if (filters?.year) {
    const y = filters.year;
    const m = filters.month ? filters.month : 12;
    const end = new Date(y, m, 0);
    periodEndDate = end.toISOString().split('T')[0];
  }

  // Filter expenses based on period
  const filteredExpenses = allExpenses.filter(e => {
    if (!e.expense_date) return true;
    if (filters?.isCumulative && periodEndDate) {
      return e.expense_date <= periodEndDate;
    }
    if (filters?.year && !filters.isCumulative) {
      const expYear = parseInt(e.expense_date.split('-')[0], 10);
      if (expYear !== filters.year) return false;
    }
    if (filters?.month && !filters.isCumulative) {
      const expMonth = parseInt(e.expense_date.split('-')[1], 10);
      if (expMonth !== filters.month) return false;
    }
    if (filters?.employeeId && e.employee_id !== filters.employeeId) return false;
    if (filters?.batchId && e.batch_id !== filters.batchId) return false;
    return true;
  });

  // Filter transfers based on period and criteria
  const activeTransfers = transfers.filter(t => !t.isReversed);
  const filteredTransfers = transfers.filter(t => {
    if (!t.transferDate) return true;
    if (filters?.isCumulative && periodEndDate) {
      return t.transferDate <= periodEndDate;
    }
    if (filters?.year && !filters.isCumulative) {
      const trfYear = parseInt(t.transferDate.split('-')[0], 10);
      if (trfYear !== filters.year) return false;
    }
    if (filters?.month && !filters.isCumulative) {
      const trfMonth = parseInt(t.transferDate.split('-')[1], 10);
      if (trfMonth !== filters.month) return false;
    }
    if (filters?.transferType && t.transferType !== filters.transferType) return false;
    if (filters?.batchId && t.batchId !== filters.batchId) return false;
    if (filters?.employeeId) {
      if (t.fromEmployeeId !== filters.employeeId && t.toEmployeeId !== filters.employeeId) return false;
    }
    return true;
  });

  // ============================================================================
  // 3. LEDGER CALCULATIONS PER EMPLOYEE (Completely Separate Ledgers)
  // ============================================================================

  const personalLedger: Record<string, {
    employeeId: string;
    employeeName: string;
    username: string;
    personalExpensesPaid: number;
    reimbursementTransfersSent: number;
    reimbursementTransfersReceived: number;
    companyReimbursementsReceived: number;
    personalReceivable: number;
    isOverpaid: boolean;
  }> = {};

  const custodyLedger: Record<string, {
    employeeId: string;
    employeeName: string;
    username: string;
    openingBalance: number;
    advancesReceived: number;
    custodyTransfersReceived: number;
    custodyTransfersSent: number;
    companyExpensesPaid: number;
    cashReturned: number;
    companyCashHeld: number;
    isDeficit: boolean;
  }> = {};

  // Initialize ledgers for each profile
  profiles.forEach(p => {
    const opening = custodyOpenings[p.id]?.openingBalance || 0;

    personalLedger[p.id] = {
      employeeId: p.id,
      employeeName: p.full_name || p.username || 'Unknown',
      username: p.username || '',
      personalExpensesPaid: 0,
      reimbursementTransfersSent: 0,
      reimbursementTransfersReceived: 0,
      companyReimbursementsReceived: 0,
      personalReceivable: 0,
      isOverpaid: false
    };

    custodyLedger[p.id] = {
      employeeId: p.id,
      employeeName: p.full_name || p.username || 'Unknown',
      username: p.username || '',
      openingBalance: opening,
      advancesReceived: 0,
      custodyTransfersReceived: 0,
      custodyTransfersSent: 0,
      companyExpensesPaid: 0,
      cashReturned: 0,
      companyCashHeld: opening,
      isDeficit: false
    };
  });

  // Tally Expenses (Only classified transactions enter respective ledgers)
  // For ledger calculations: use cumulative expenses up to selected period
  const expensesForLedger = allExpenses.filter(e => {
    if (!e.expense_date) return true;
    if (periodEndDate) return e.expense_date <= periodEndDate;
    return true;
  });

  expensesForLedger.forEach(e => {
    if (!e.employee_id) return;
    
    // Ledger 1: Personal Expenses
    if (e.funding_source === 'personal') {
      if (personalLedger[e.employee_id]) {
        personalLedger[e.employee_id].personalExpensesPaid += e.amount;
      }
    }
    
    // Ledger 2: Company Cash Expenses
    if (e.funding_source === 'company_cash') {
      if (custodyLedger[e.employee_id]) {
        custodyLedger[e.employee_id].companyExpensesPaid += e.amount;
      }
    }
  });

  // Tally Transfers (Only active transfers up to selected period)
  const transfersForLedger = activeTransfers.filter(t => {
    if (!t.transferDate) return true;
    if (periodEndDate) return t.transferDate <= periodEndDate;
    return true;
  });

  transfersForLedger.forEach(t => {
    const amt = t.amount;

    switch (t.transferType) {
      // 1. Personal Reimbursement Transfer (Employee A -> Employee B)
      case 'personal_reimbursement_transfer':
        if (t.fromEmployeeId && personalLedger[t.fromEmployeeId]) {
          personalLedger[t.fromEmployeeId].reimbursementTransfersSent += amt;
        }
        if (t.toEmployeeId && personalLedger[t.toEmployeeId]) {
          personalLedger[t.toEmployeeId].reimbursementTransfersReceived += amt;
        }
        break;

      // 2. Company Cash Transfer (Employee A -> Employee B)
      case 'company_cash_transfer':
        if (t.fromEmployeeId && custodyLedger[t.fromEmployeeId]) {
          custodyLedger[t.fromEmployeeId].custodyTransfersSent += amt;
        }
        if (t.toEmployeeId && custodyLedger[t.toEmployeeId]) {
          custodyLedger[t.toEmployeeId].custodyTransfersReceived += amt;
        }
        break;

      // 3. Company Advance (Company -> Employee)
      case 'company_advance':
        if (t.toEmployeeId && custodyLedger[t.toEmployeeId]) {
          custodyLedger[t.toEmployeeId].advancesReceived += amt;
        }
        break;

      // 4. Company Reimbursement (Company -> Employee)
      case 'company_reimbursement':
        if (t.toEmployeeId && personalLedger[t.toEmployeeId]) {
          personalLedger[t.toEmployeeId].companyReimbursementsReceived += amt;
        }
        break;

      // 5. Cash Returned to Company (Employee -> Company)
      case 'cash_returned_to_company':
        if (t.fromEmployeeId && custodyLedger[t.fromEmployeeId]) {
          custodyLedger[t.fromEmployeeId].cashReturned += amt;
        }
        break;
    }
  });

  // Compute final ledger balances
  Object.values(personalLedger).forEach(row => {
    // Personal Receivable = Personal Paid + Transfers Sent - Transfers Received - Company Reimbursements
    const net = row.personalExpensesPaid + row.reimbursementTransfersSent - row.reimbursementTransfersReceived - row.companyReimbursementsReceived;
    row.personalReceivable = Math.round(net * 1000) / 1000;
    row.isOverpaid = row.personalReceivable < 0;
  });

  Object.values(custodyLedger).forEach(row => {
    // Company Cash Held = Opening + Advances + Transfers Received - Transfers Sent - Expenses from Cash - Cash Returned
    const net = row.openingBalance + row.advancesReceived + row.custodyTransfersReceived - row.custodyTransfersSent - row.companyExpensesPaid - row.cashReturned;
    row.companyCashHeld = Math.round(net * 1000) / 1000;
    row.isDeficit = row.companyCashHeld < 0;
  });

  // ============================================================================
  // 4. KPI CARDS CALCULATION
  // ============================================================================

  // KPI 1: Total Personal Expenses (verified personal expenses in current scope)
  const totalPersonalExpenses = filteredExpenses
    .filter(e => e.funding_source === 'personal')
    .reduce((sum, e) => sum + e.amount, 0);

  // KPI 2: Outstanding Personal Reimbursements (Net sum of positive personal receivables)
  const outstandingPersonalReimbursements = Object.values(personalLedger)
    .filter(r => r.personalReceivable > 0)
    .reduce((sum, r) => sum + r.personalReceivable, 0);

  // KPI 3: Company Cash Held (Total positive cash custody in employee hands)
  const totalCompanyCashHeld = Object.values(custodyLedger)
    .filter(r => r.companyCashHeld > 0)
    .reduce((sum, r) => sum + r.companyCashHeld, 0);

  // KPI 4: Total Internal Transfers (Display transfer volume only - NOT an additional expense!)
  const totalInternalTransferVolume = filteredTransfers
    .filter(t => !t.isReversed)
    .reduce((sum, t) => sum + t.amount, 0);

  // Reconciliation: Unclassified Expenses
  const unclassifiedExpenses = filteredExpenses.filter(e => e.funding_source === 'unclassified');
  const unclassifiedCount = unclassifiedExpenses.length;
  const unclassifiedTotalAmount = unclassifiedExpenses.reduce((sum, e) => sum + e.amount, 0);

  // ============================================================================
  // 5. EXPENSE SETTLEMENTS GROUPED BY BATCH (Section A)
  // ============================================================================

  const batchMap = new Map<string, PettyCashBatch>();
  batches.forEach(b => batchMap.set(b.id, b));

  const batchGroups: Array<{
    batchId: string;
    batchName: string;
    month: number;
    year: number;
    status: string;
    pcvNo: string;
    advanceAmount: number;
    totalAmount: number;
    personalAmount: number;
    companyCashAmount: number;
    unclassifiedAmount: number;
    unclassifiedCount: number;
    isFullyReconciled: boolean;
    employees: Array<{
      employeeId: string;
      employeeName: string;
      totalAmount: number;
      personalAmount: number;
      companyCashAmount: number;
      unclassifiedAmount: number;
      expenses: any[];
    }>;
  }> = [];

  // Group by Batch
  const expensesByBatch: Record<string, any[]> = {};
  filteredExpenses.forEach(exp => {
    const bId = exp.batch_id || 'unassigned';
    if (!expensesByBatch[bId]) expensesByBatch[bId] = [];
    expensesByBatch[bId].push(exp);
  });

  // Process existing batches
  batches.forEach(b => {
    if (filters?.batchId && b.id !== filters.batchId) return;
    if (filters?.year && b.year !== filters.year) return;
    if (filters?.month && b.month !== filters.month) return;

    const bExpenses = expensesByBatch[b.id] || [];
    
    // Group by employee within this batch
    const empMap: Record<string, any[]> = {};
    bExpenses.forEach(e => {
      const empId = e.employee_id || 'unassigned';
      if (!empMap[empId]) empMap[empId] = [];
      empMap[empId].push(e);
    });

    const employeesSummary = Object.keys(empMap).map(empId => {
      const p = profiles.find(pr => pr.id === empId);
      const list = empMap[empId];
      const total = list.reduce((s, e) => s + e.amount, 0);
      const personal = list.filter(e => e.funding_source === 'personal').reduce((s, e) => s + e.amount, 0);
      const company = list.filter(e => e.funding_source === 'company_cash').reduce((s, e) => s + e.amount, 0);
      const unclass = list.filter(e => e.funding_source === 'unclassified').reduce((s, e) => s + e.amount, 0);

      return {
        employeeId: empId,
        employeeName: p ? (p.full_name || p.username) : 'Unassigned Employee',
        totalAmount: total,
        personalAmount: personal,
        companyCashAmount: company,
        unclassifiedAmount: unclass,
        expenses: list
      };
    }).sort((a, b) => b.totalAmount - a.totalAmount);

    const bTotal = bExpenses.reduce((s, e) => s + e.amount, 0);
    const bPersonal = bExpenses.filter(e => e.funding_source === 'personal').reduce((s, e) => s + e.amount, 0);
    const bCompany = bExpenses.filter(e => e.funding_source === 'company_cash').reduce((s, e) => s + e.amount, 0);
    const bUnclassExpenses = bExpenses.filter(e => e.funding_source === 'unclassified');
    const bUnclassAmount = bUnclassExpenses.reduce((s, e) => s + e.amount, 0);

    batchGroups.push({
      batchId: b.id,
      batchName: b.name,
      month: b.month,
      year: b.year,
      status: b.status,
      pcvNo: b.pcvNo || '',
      advanceAmount: Number(b.advanceAmount || 0),
      totalAmount: bTotal,
      personalAmount: bPersonal,
      companyCashAmount: bCompany,
      unclassifiedAmount: bUnclassAmount,
      unclassifiedCount: bUnclassExpenses.length,
      isFullyReconciled: bUnclassExpenses.length === 0,
      employees: employeesSummary
    });
  });

  // Process unassigned expenses batch if any exist
  if (expensesByBatch['unassigned'] && expensesByBatch['unassigned'].length > 0) {
    const list = expensesByBatch['unassigned'];
    const empMap: Record<string, any[]> = {};
    list.forEach(e => {
      const empId = e.employee_id || 'unassigned';
      if (!empMap[empId]) empMap[empId] = [];
      empMap[empId].push(e);
    });

    const employeesSummary = Object.keys(empMap).map(empId => {
      const p = profiles.find(pr => pr.id === empId);
      const empList = empMap[empId];
      return {
        employeeId: empId,
        employeeName: p ? (p.full_name || p.username) : 'Unassigned Employee',
        totalAmount: empList.reduce((s, e) => s + e.amount, 0),
        personalAmount: empList.filter(e => e.funding_source === 'personal').reduce((s, e) => s + e.amount, 0),
        companyCashAmount: empList.filter(e => e.funding_source === 'company_cash').reduce((s, e) => s + e.amount, 0),
        unclassifiedAmount: empList.filter(e => e.funding_source === 'unclassified').reduce((s, e) => s + e.amount, 0),
        expenses: empList
      };
    });

    const unassignedUnclass = list.filter(e => e.funding_source === 'unclassified');

    batchGroups.push({
      batchId: 'unassigned',
      batchName: 'Unassigned Expenses (Not in Batch)',
      month: 0,
      year: 0,
      status: 'In Progress',
      pcvNo: '-',
      advanceAmount: 0,
      totalAmount: list.reduce((s, e) => s + e.amount, 0),
      personalAmount: list.filter(e => e.funding_source === 'personal').reduce((s, e) => s + e.amount, 0),
      companyCashAmount: list.filter(e => e.funding_source === 'company_cash').reduce((s, e) => s + e.amount, 0),
      unclassifiedAmount: unassignedUnclass.reduce((s, e) => s + e.amount, 0),
      unclassifiedCount: unassignedUnclass.length,
      isFullyReconciled: unassignedUnclass.length === 0,
      employees: employeesSummary
    });
  }

  return {
    kpis: {
      totalPersonalExpenses,
      outstandingPersonalReimbursements,
      totalCompanyCashHeld,
      totalInternalTransferVolume,
      unclassifiedCount,
      unclassifiedTotalAmount
    },
    ledgers: {
      personal: Object.values(personalLedger).filter(r => 
        r.personalExpensesPaid > 0 || r.personalReceivable !== 0 || r.companyReimbursementsReceived > 0
      ).sort((a, b) => b.personalReceivable - a.personalReceivable),
      custody: Object.values(custodyLedger).filter(r => 
        r.openingBalance > 0 || r.companyCashHeld !== 0 || r.companyExpensesPaid > 0 || r.advancesReceived > 0
      ).sort((a, b) => b.companyCashHeld - a.companyCashHeld)
    },
    batches: batchGroups,
    transfers: filteredTransfers,
    profiles,
    allBatches: batches,
    unclassifiedExpenses: unclassifiedExpenses.slice(0, 50)
  };
}

// ==============================================================================
// 3. Transfer Management Actions (Section B)
// ==============================================================================

export interface CreateTransferInput {
  transferDate: string;
  fromEmployeeId: string | null;
  toEmployeeId: string | null;
  transferType: TransferType;
  amount: number;
  batchId?: string;
  referenceNo?: string;
  notes?: string;
  allowCustodyDeficit?: boolean;
}

export async function createTransferAction(input: CreateTransferInput) {
  try {
    const amount = Number(input.amount);
    if (!amount || isNaN(amount) || amount <= 0) {
      return { error: 'Transfer amount must be a positive number greater than 0.' };
    }

    if (!input.transferDate) {
      return { error: 'Transfer date is required.' };
    }

    // Validate participants based on transfer type
    if (input.transferType === 'personal_reimbursement_transfer' || input.transferType === 'company_cash_transfer') {
      if (!input.fromEmployeeId || !input.toEmployeeId) {
        return { error: 'Both sender and recipient employees are required for this transfer type.' };
      }
      if (input.fromEmployeeId === input.toEmployeeId) {
        return { error: 'Sender and recipient must be different employees.' };
      }
    } else if (input.transferType === 'company_advance' || input.transferType === 'company_reimbursement') {
      if (!input.toEmployeeId) {
        return { error: 'Recipient employee is required.' };
      }
    } else if (input.transferType === 'cash_returned_to_company') {
      if (!input.fromEmployeeId) {
        return { error: 'Source employee returning cash is required.' };
      }
    }

    // Custody Validation for Company Cash Transfers:
    // Prevent sender from transferring more company cash than they officially hold
    if (input.transferType === 'company_cash_transfer' && input.fromEmployeeId && !input.allowCustodyDeficit) {
      const settlement = await getSettlementData();
      const senderCustody = settlement.ledgers.custody.find(c => c.employeeId === input.fromEmployeeId);
      const availableCash = senderCustody ? senderCustody.companyCashHeld : 0;
      if (amount > availableCash) {
        return {
          error: `Insufficient company cash custody. The sender currently holds OMR ${availableCash.toFixed(3)}, which is less than the requested transfer of OMR ${amount.toFixed(3)}.`,
          requiresOverride: true,
          availableCash
        };
      }
    }

    // Generate unique reference number if not provided: TRF-YYYYMM-###
    const existingTransfers = await getTransfers();
    const d = new Date(input.transferDate);
    const y = !isNaN(d.getFullYear()) ? d.getFullYear() : new Date().getFullYear();
    const m = !isNaN(d.getMonth()) ? String(d.getMonth() + 1).padStart(2, '0') : '01';
    const prefix = `TRF-${y}${m}-`;

    let maxSeq = 0;
    existingTransfers.forEach(t => {
      if (t.referenceNo && t.referenceNo.startsWith(prefix)) {
        const seqPart = parseInt(t.referenceNo.replace(prefix, ''), 10);
        if (!isNaN(seqPart) && seqPart > maxSeq) maxSeq = seqPart;
      }
    });

    const refNo = (input.referenceNo || '').trim() || `${prefix}${String(maxSeq + 1).padStart(3, '0')}`;

    const newTransfer: SettlementTransfer = {
      id: `trf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      referenceNo: refNo,
      transferDate: input.transferDate,
      fromEmployeeId: input.fromEmployeeId || null,
      toEmployeeId: input.toEmployeeId || null,
      transferType: input.transferType,
      amount: Math.round(amount * 1000) / 1000,
      batchId: input.batchId || null,
      notes: (input.notes || '').trim() || null,
      isReversed: false,
      createdAt: new Date().toISOString()
    };

    await saveTransferRecord(newTransfer);
    revalidatePath('/petty-cash/settlement');
    return { success: true, transfer: newTransfer };
  } catch (err: any) {
    console.error('Error creating transfer:', err);
    return { error: err.message || 'Failed to record transfer.' };
  }
}

// Reversal Entry (Section G: cancellation through reversal rather than deleting history)
export async function reverseTransferAction(transferId: string, reason: string) {
  try {
    const trimmedReason = (reason || '').trim();
    if (!trimmedReason) {
      return { error: 'Reversal reason is required for financial audit trail.' };
    }

    const transfers = await getTransfers();
    const original = transfers.find(t => t.id === transferId);
    if (!original) {
      return { error: 'Transfer not found.' };
    }
    if (original.isReversed) {
      return { error: 'This transfer has already been reversed.' };
    }

    // Mark original as reversed
    original.isReversed = true;
    original.reversalReason = trimmedReason;
    await saveTransferRecord(original);

    // Create offsetting reversal transfer
    const reversalRecord: SettlementTransfer = {
      id: `trf-rev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      referenceNo: `REV-${original.referenceNo}`,
      transferDate: new Date().toISOString().split('T')[0],
      fromEmployeeId: original.toEmployeeId, // Inverted
      toEmployeeId: original.fromEmployeeId, // Inverted
      transferType: original.transferType,
      amount: original.amount,
      batchId: original.batchId,
      notes: `Reversal of ${original.referenceNo}: ${trimmedReason}`,
      isReversed: false,
      reversedTransferId: original.id,
      createdAt: new Date().toISOString()
    };

    await saveTransferRecord(reversalRecord);
    revalidatePath('/petty-cash/settlement');
    return { success: true, reversal: reversalRecord };
  } catch (err: any) {
    console.error('Error reversing transfer:', err);
    return { error: err.message || 'Failed to reverse transfer.' };
  }
}

// ==============================================================================
// 4. Expense Classification & Reconciliation (Section H)
// ==============================================================================

export async function classifyExpenseAction(expenseId: string, fundingSource: FundingSource) {
  try {
    const classifications = await getExpenseClassifications();
    classifications[expenseId] = {
      fundingSource,
      reimbursementStatus: fundingSource === 'personal' ? 'unreimbursed' : 'not_applicable',
      updatedAt: new Date().toISOString()
    };

    await saveExpenseClassifications(classifications);
    revalidatePath('/petty-cash/settlement');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to classify expense.' };
  }
}

export async function bulkClassifyExpensesAction(expenseIds: string[], fundingSource: FundingSource) {
  try {
    if (!expenseIds || expenseIds.length === 0) {
      return { error: 'No expenses selected.' };
    }

    const classifications = await getExpenseClassifications();
    const now = new Date().toISOString();

    expenseIds.forEach(id => {
      classifications[id] = {
        fundingSource,
        reimbursementStatus: fundingSource === 'personal' ? 'unreimbursed' : 'not_applicable',
        updatedAt: now
      };
    });

    await saveExpenseClassifications(classifications);
    revalidatePath('/petty-cash/settlement');
    return { success: true, count: expenseIds.length };
  } catch (err: any) {
    return { error: err.message || 'Failed to bulk classify expenses.' };
  }
}

export async function toggleExpenseReimbursementAction(expenseId: string, isReimbursed: boolean) {
  try {
    const classifications = await getExpenseClassifications();
    const existing = classifications[expenseId] || {
      fundingSource: 'personal',
      reimbursementStatus: 'unreimbursed',
      updatedAt: new Date().toISOString()
    };

    existing.reimbursementStatus = isReimbursed ? 'reimbursed' : 'unreimbursed';
    existing.updatedAt = new Date().toISOString();
    classifications[expenseId] = existing;

    await saveExpenseClassifications(classifications);
    revalidatePath('/petty-cash/settlement');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to update reimbursement status.' };
  }
}

// ==============================================================================
// 5. Custody Starting / Opening Balance Setup
// ==============================================================================

export async function updateCustodyOpeningBalanceAction(employeeId: string, openingBalance: number, asOfDate: string, notes?: string) {
  try {
    const stored = await readJsonFile<{ balances: Record<string, CustodyOpeningBalance> }>(CUSTODY_FILE, { balances: {} });
    stored.balances[employeeId] = {
      employeeId,
      openingBalance: Math.round(Number(openingBalance || 0) * 1000) / 1000,
      asOfDate: asOfDate || new Date().toISOString().split('T')[0],
      notes: notes || '',
      updatedAt: new Date().toISOString()
    };

    await saveJsonFile(CUSTODY_FILE, stored);
    revalidatePath('/petty-cash/settlement');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to update opening balance.' };
  }
}
