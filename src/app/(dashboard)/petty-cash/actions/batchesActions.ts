'use server';

import fs from 'fs/promises';
import path from 'path';
import { revalidatePath } from 'next/cache';

function revalidateBatchPaths() {
  revalidatePath('/petty-cash/dashboard');
  revalidatePath('/petty-cash/batches');
}

export interface PettyCashBatch {
  id: string;
  name: string;
  month: number; // 1 - 12
  year: number;
  createdAt: string;
  status: 'In Progress' | 'Ready' | 'Submitted';
  invoiceIds: string[]; // Ordered list of expense IDs
  pcvNo?: string;
  advanceAmount?: number;
}

const BATCHES_FILE = path.join(process.cwd(), 'src', 'data', 'petty-cash-batches.json');

async function readBatches(): Promise<PettyCashBatch[]> {
  try {
    const content = await fs.readFile(BATCHES_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    return Array.isArray(parsed.batches) ? parsed.batches : [];
  } catch (err) {
    return [];
  }
}

async function saveBatches(batches: PettyCashBatch[]): Promise<boolean> {
  try {
    const dir = path.dirname(BATCHES_FILE);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(BATCHES_FILE, JSON.stringify({ batches }, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error saving petty cash batches:', err);
    return false;
  }
}

export async function getBatches(): Promise<PettyCashBatch[]> {
  return await readBatches();
}

export async function createBatch(payload: {
  name: string;
  month: number;
  year: number;
  status?: 'In Progress' | 'Ready' | 'Submitted';
  pcvNo?: string;
  advanceAmount?: number;
  initialInvoiceIds?: string[];
}) {
  const name = (payload.name || '').trim();
  if (!name) {
    return { error: 'Batch name is required.' };
  }

  const batches = await readBatches();

  // Check duplicate batch name in same month/year
  const exists = batches.some(
    b => b.month === payload.month && b.year === payload.year && b.name.toLowerCase() === name.toLowerCase()
  );
  if (exists) {
    return { error: `A batch named "${name}" already exists for this month.` };
  }

  // Prevent accidental duplicate invoice assignments across active batches
  const assignedSet = new Set<string>();
  batches.forEach(b => {
    b.invoiceIds.forEach(id => assignedSet.add(id));
  });

  const validInitialIds = (payload.initialInvoiceIds || []).filter(id => !assignedSet.has(id));

  const pad = (n: number) => n.toString().padStart(2, '0');
  const uniqueSuffix = Math.floor(100 + Math.random() * 900);
  const newBatch: PettyCashBatch = {
    id: `BATCH-${payload.year}${pad(payload.month)}-${Date.now().toString().slice(-4)}${uniqueSuffix}`,
    name,
    month: payload.month,
    year: payload.year,
    createdAt: new Date().toISOString().split('T')[0],
    status: payload.status || 'In Progress',
    invoiceIds: validInitialIds,
    pcvNo: payload.pcvNo || '',
    advanceAmount: payload.advanceAmount ?? 1000
  };

  batches.push(newBatch);
  await saveBatches(batches);
  revalidateBatchPaths();
  return { success: true, batch: newBatch };
}

export async function updateBatchMeta(
  batchId: string,
  updates: {
    name?: string;
    status?: 'In Progress' | 'Ready' | 'Submitted';
    month?: number;
    year?: number;
    pcvNo?: string;
    advanceAmount?: number;
  }
) {
  const batches = await readBatches();
  const idx = batches.findIndex(b => b.id === batchId);
  if (idx === -1) return { error: 'Batch not found.' };

  if (updates.name !== undefined) {
    const trimmed = updates.name.trim();
    if (!trimmed) return { error: 'Batch name cannot be empty.' };
    batches[idx].name = trimmed;
  }
  if (updates.status !== undefined) batches[idx].status = updates.status;
  if (updates.month !== undefined) batches[idx].month = updates.month;
  if (updates.year !== undefined) batches[idx].year = updates.year;
  if (updates.pcvNo !== undefined) batches[idx].pcvNo = updates.pcvNo;
  if (updates.advanceAmount !== undefined) batches[idx].advanceAmount = updates.advanceAmount;

  await saveBatches(batches);
  revalidateBatchPaths();
  return { success: true, batch: batches[idx] };
}

export async function deleteBatch(batchId: string) {
  const batches = await readBatches();
  const filtered = batches.filter(b => b.id !== batchId);
  await saveBatches(filtered);
  revalidateBatchPaths();
  return { success: true };
}

export async function assignInvoicesToBatch(batchId: string, invoiceIdsToAdd: string[]) {
  if (!invoiceIdsToAdd || invoiceIdsToAdd.length === 0) {
    return { error: 'No invoices selected.' };
  }

  const batches = await readBatches();
  const targetBatch = batches.find(b => b.id === batchId);
  if (!targetBatch) {
    return { error: 'Target batch not found.' };
  }

  // Prevent accidental duplicate assignment across any active batch
  const conflicts: { invoiceId: string; batchName: string }[] = [];
  batches.forEach(b => {
    if (b.id !== batchId) {
      b.invoiceIds.forEach(invId => {
        if (invoiceIdsToAdd.includes(invId)) {
          conflicts.push({ invoiceId: invId, batchName: b.name });
        }
      });
    }
  });

  if (conflicts.length > 0) {
    return {
      error: `Duplicate assignment prevented: ${conflicts.length} invoice(s) are already assigned to another batch (${conflicts[0].batchName}). Use "Transfer" if you want to move them.`
    };
  }

  const existingSet = new Set(targetBatch.invoiceIds);
  invoiceIdsToAdd.forEach(id => {
    if (!existingSet.has(id)) {
      targetBatch.invoiceIds.push(id);
      existingSet.add(id);
    }
  });

  await saveBatches(batches);
  revalidateBatchPaths();
  return { success: true, batch: targetBatch };
}

export async function removeInvoicesFromBatch(batchId: string, invoiceIdsToRemove: string[]) {
  const batches = await readBatches();
  const targetBatch = batches.find(b => b.id === batchId);
  if (!targetBatch) return { error: 'Batch not found.' };

  const removeSet = new Set(invoiceIdsToRemove);
  targetBatch.invoiceIds = targetBatch.invoiceIds.filter(id => !removeSet.has(id));

  await saveBatches(batches);
  revalidateBatchPaths();
  return { success: true, batch: targetBatch };
}

export async function reorderBatchInvoices(batchId: string, orderedInvoiceIds: string[]) {
  const batches = await readBatches();
  const targetBatch = batches.find(b => b.id === batchId);
  if (!targetBatch) return { error: 'Batch not found.' };

  targetBatch.invoiceIds = orderedInvoiceIds;
  await saveBatches(batches);
  revalidateBatchPaths();
  return { success: true, batch: targetBatch };
}

export async function transferInvoicesBetweenBatches(
  sourceBatchId: string,
  targetBatchId: string,
  invoiceIdsToTransfer: string[]
) {
  if (sourceBatchId === targetBatchId) {
    return { error: 'Source and target batch must be different.' };
  }
  const batches = await readBatches();
  const sourceBatch = batches.find(b => b.id === sourceBatchId);
  const targetBatch = batches.find(b => b.id === targetBatchId);

  if (!sourceBatch || !targetBatch) {
    return { error: 'Source or target batch not found.' };
  }

  const transferSet = new Set(invoiceIdsToTransfer);
  sourceBatch.invoiceIds = sourceBatch.invoiceIds.filter(id => !transferSet.has(id));

  const targetExisting = new Set(targetBatch.invoiceIds);
  invoiceIdsToTransfer.forEach(id => {
    if (!targetExisting.has(id)) {
      targetBatch.invoiceIds.push(id);
      targetExisting.add(id);
    }
  });

  await saveBatches(batches);
  revalidateBatchPaths();
  return { success: true, sourceBatch, targetBatch };
}
