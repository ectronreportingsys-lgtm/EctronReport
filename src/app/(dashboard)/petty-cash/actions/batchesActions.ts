'use server';

import fs from 'fs/promises';
import path from 'path';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase-server';

function revalidateBatchPaths() {
  revalidatePath('/petty-cash/dashboard');
  revalidatePath('/petty-cash/batches');
  revalidatePath('/petty-cash/settlement');
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

// Helper to safely read from local JSON file
async function readFileBatches(): Promise<PettyCashBatch[]> {
  try {
    const content = await fs.readFile(BATCHES_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    return Array.isArray(parsed.batches) ? parsed.batches : [];
  } catch (err) {
    return [];
  }
}

// Helper to safely write to local JSON file (never crash on Vercel read-only filesystem)
async function saveFileBatches(batches: PettyCashBatch[]): Promise<void> {
  try {
    const dir = path.dirname(BATCHES_FILE);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(BATCHES_FILE, JSON.stringify({ batches }, null, 2), 'utf-8');
  } catch (err) {
    // Silently ignore write errors on Vercel / serverless environment
  }
}

// Convert Supabase DB row to PettyCashBatch
function rowToBatch(row: any): PettyCashBatch {
  let invIds: string[] = [];
  if (Array.isArray(row.invoice_ids)) {
    invIds = row.invoice_ids;
  } else if (typeof row.invoice_ids === 'string') {
    try {
      invIds = JSON.parse(row.invoice_ids);
    } catch {
      invIds = [];
    }
  }

  let createdAtStr = '';
  if (row.created_at) {
    createdAtStr = String(row.created_at).split('T')[0];
  } else {
    createdAtStr = new Date().toISOString().split('T')[0];
  }

  return {
    id: row.id,
    name: row.name,
    month: Number(row.month),
    year: Number(row.year),
    createdAt: createdAtStr,
    status: row.status || 'In Progress',
    invoiceIds: invIds,
    pcvNo: row.pcv_no || '',
    advanceAmount: row.advance_amount !== undefined && row.advance_amount !== null ? Number(row.advance_amount) : 1000
  };
}

// Convert PettyCashBatch to Supabase DB payload
function batchToRow(b: PettyCashBatch): any {
  return {
    id: b.id,
    name: b.name,
    month: b.month,
    year: b.year,
    status: b.status,
    invoice_ids: b.invoiceIds || [],
    pcv_no: b.pcvNo || '',
    advance_amount: b.advanceAmount ?? 1000,
    created_at: b.createdAt || new Date().toISOString().split('T')[0],
    updated_at: new Date().toISOString()
  };
}

// Read batches: Supabase first, fallback to JSON
export async function getBatches(): Promise<PettyCashBatch[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('petty_cash_batches')
      .select('*')
      .order('created_at', { ascending: true });

    if (!error && data) {
      if (data.length > 0) {
        return data.map(rowToBatch);
      }
      // Table exists but is empty: seed from local JSON file
      const fileBatches = await readFileBatches();
      if (fileBatches.length > 0) {
        try {
          const rowsToInsert = fileBatches.map(batchToRow);
          await supabase.from('petty_cash_batches').insert(rowsToInsert);
          return fileBatches;
        } catch (seedErr) {
          console.warn('Could not auto-seed batches into Supabase:', seedErr);
          return fileBatches;
        }
      }
      return [];
    }
  } catch (err) {
    console.warn('Supabase getBatches failed, falling back to local file:', err);
  }

  // Fallback to local file
  return await readFileBatches();
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

  const batches = await getBatches();

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

  // Try Supabase insert
  try {
    const supabase = await createClient();
    const row = batchToRow(newBatch);
    const { error } = await supabase.from('petty_cash_batches').insert([row]);
    if (error) {
      console.warn('Failed to insert batch in Supabase:', error);
    } else if (validInitialIds.length > 0) {
      // Sync batch_id to petty_cash_expenses if column exists
      try {
        await supabase
          .from('petty_cash_expenses')
          .update({ batch_id: newBatch.id })
          .in('id', validInitialIds);
      } catch {}
    }
  } catch (sbErr) {
    console.warn('Supabase error during createBatch:', sbErr);
  }

  // Also update local file
  batches.push(newBatch);
  await saveFileBatches(batches);

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
  const batches = await getBatches();
  const idx = batches.findIndex(b => b.id === batchId);
  if (idx === -1) return { error: 'Batch not found.' };

  const target = batches[idx];

  if (updates.name !== undefined) {
    const trimmed = updates.name.trim();
    if (!trimmed) return { error: 'Batch name cannot be empty.' };
    target.name = trimmed;
  }
  if (updates.status !== undefined) target.status = updates.status;
  if (updates.month !== undefined) target.month = updates.month;
  if (updates.year !== undefined) target.year = updates.year;
  if (updates.pcvNo !== undefined) target.pcvNo = updates.pcvNo;
  if (updates.advanceAmount !== undefined) target.advanceAmount = updates.advanceAmount;

  // Supabase update
  try {
    const supabase = await createClient();
    const updatePayload: any = {
      updated_at: new Date().toISOString()
    };
    if (updates.name !== undefined) updatePayload.name = target.name;
    if (updates.status !== undefined) updatePayload.status = target.status;
    if (updates.month !== undefined) updatePayload.month = target.month;
    if (updates.year !== undefined) updatePayload.year = target.year;
    if (updates.pcvNo !== undefined) updatePayload.pcv_no = target.pcvNo;
    if (updates.advanceAmount !== undefined) updatePayload.advance_amount = target.advanceAmount;

    await supabase
      .from('petty_cash_batches')
      .update(updatePayload)
      .eq('id', batchId);
  } catch (sbErr) {
    console.warn('Supabase updateBatchMeta error:', sbErr);
  }

  // Update local file
  await saveFileBatches(batches);

  revalidateBatchPaths();
  return { success: true, batch: target };
}

export async function deleteBatch(batchId: string) {
  const batches = await getBatches();
  const filtered = batches.filter(b => b.id !== batchId);

  // Supabase delete
  try {
    const supabase = await createClient();
    await supabase.from('petty_cash_batches').delete().eq('id', batchId);
    // Unlink batch_id from expenses
    try {
      await supabase.from('petty_cash_expenses').update({ batch_id: null }).eq('batch_id', batchId);
    } catch {}
  } catch (sbErr) {
    console.warn('Supabase deleteBatch error:', sbErr);
  }

  // Update local file
  await saveFileBatches(filtered);

  revalidateBatchPaths();
  return { success: true };
}

export async function assignInvoicesToBatch(batchId: string, invoiceIdsToAdd: string[]) {
  if (!invoiceIdsToAdd || invoiceIdsToAdd.length === 0) {
    return { error: 'No invoices selected.' };
  }

  const batches = await getBatches();
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

  // Supabase update
  try {
    const supabase = await createClient();
    await supabase
      .from('petty_cash_batches')
      .update({
        invoice_ids: targetBatch.invoiceIds,
        updated_at: new Date().toISOString()
      })
      .eq('id', batchId);

    // Sync batch_id onto petty_cash_expenses if column exists
    try {
      await supabase
        .from('petty_cash_expenses')
        .update({ batch_id: batchId })
        .in('id', invoiceIdsToAdd);
    } catch {}
  } catch (sbErr) {
    console.warn('Supabase assignInvoicesToBatch error:', sbErr);
  }

  // Update local file
  await saveFileBatches(batches);

  revalidateBatchPaths();
  return { success: true, batch: targetBatch };
}

export async function removeInvoicesFromBatch(batchId: string, invoiceIdsToRemove: string[]) {
  const batches = await getBatches();
  const targetBatch = batches.find(b => b.id === batchId);
  if (!targetBatch) return { error: 'Batch not found.' };

  const removeSet = new Set(invoiceIdsToRemove);
  targetBatch.invoiceIds = targetBatch.invoiceIds.filter(id => !removeSet.has(id));

  // Supabase update
  try {
    const supabase = await createClient();
    await supabase
      .from('petty_cash_batches')
      .update({
        invoice_ids: targetBatch.invoiceIds,
        updated_at: new Date().toISOString()
      })
      .eq('id', batchId);

    // Unlink batch_id from removed expenses
    try {
      await supabase
        .from('petty_cash_expenses')
        .update({ batch_id: null })
        .in('id', invoiceIdsToRemove)
        .eq('batch_id', batchId);
    } catch {}
  } catch (sbErr) {
    console.warn('Supabase removeInvoicesFromBatch error:', sbErr);
  }

  // Update local file
  await saveFileBatches(batches);

  revalidateBatchPaths();
  return { success: true, batch: targetBatch };
}

export async function reorderBatchInvoices(batchId: string, orderedInvoiceIds: string[]) {
  const batches = await getBatches();
  const targetBatch = batches.find(b => b.id === batchId);
  if (!targetBatch) return { error: 'Batch not found.' };

  targetBatch.invoiceIds = orderedInvoiceIds;

  // Supabase update
  try {
    const supabase = await createClient();
    await supabase
      .from('petty_cash_batches')
      .update({
        invoice_ids: orderedInvoiceIds,
        updated_at: new Date().toISOString()
      })
      .eq('id', batchId);
  } catch (sbErr) {
    console.warn('Supabase reorderBatchInvoices error:', sbErr);
  }

  // Update local file
  await saveFileBatches(batches);

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
  const batches = await getBatches();
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

  // Supabase update
  try {
    const supabase = await createClient();
    await Promise.all([
      supabase
        .from('petty_cash_batches')
        .update({
          invoice_ids: sourceBatch.invoiceIds,
          updated_at: new Date().toISOString()
        })
        .eq('id', sourceBatchId),
      supabase
        .from('petty_cash_batches')
        .update({
          invoice_ids: targetBatch.invoiceIds,
          updated_at: new Date().toISOString()
        })
        .eq('id', targetBatchId)
    ]);

    // Update batch_id on transferred expenses
    try {
      await supabase
        .from('petty_cash_expenses')
        .update({ batch_id: targetBatchId })
        .in('id', invoiceIdsToTransfer);
    } catch {}
  } catch (sbErr) {
    console.warn('Supabase transferInvoicesBetweenBatches error:', sbErr);
  }

  // Update local file
  await saveFileBatches(batches);

  revalidateBatchPaths();
  return { success: true, sourceBatch, targetBatch };
}
