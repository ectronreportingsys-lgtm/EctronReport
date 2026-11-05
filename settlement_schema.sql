-- ==============================================================================
-- ECTRON Reporting System – Employee Settlement Accounting Redesign Schema
-- Run this script in the Supabase SQL Editor
-- ==============================================================================

-- 1. Add Funding Source & Reimbursement Tracking to Petty Cash Expenses
ALTER TABLE public.petty_cash_expenses 
ADD COLUMN IF NOT EXISTS funding_source text DEFAULT 'unclassified' 
  CHECK (funding_source IN ('personal', 'company_cash', 'unclassified'));

ALTER TABLE public.petty_cash_expenses 
ADD COLUMN IF NOT EXISTS reimbursement_status text DEFAULT 'unreimbursed' 
  CHECK (reimbursement_status IN ('unreimbursed', 'reimbursed', 'not_applicable'));

ALTER TABLE public.petty_cash_expenses 
ADD COLUMN IF NOT EXISTS batch_id text;

CREATE INDEX IF NOT EXISTS idx_petty_cash_expenses_funding_source 
  ON public.petty_cash_expenses (funding_source);

CREATE INDEX IF NOT EXISTS idx_petty_cash_expenses_batch_id 
  ON public.petty_cash_expenses (batch_id);


-- 2. Create Employee Transfers & Custody Movements Table
CREATE TABLE IF NOT EXISTS public.petty_cash_transfers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reference_no text NOT NULL UNIQUE,
  transfer_date date NOT NULL,
  from_employee_id uuid REFERENCES public.profiles(id), -- NULL if issued from Company Treasury
  to_employee_id uuid REFERENCES public.profiles(id),   -- NULL if returned to Company Treasury
  transfer_type text NOT NULL CHECK (transfer_type IN (
    'personal_reimbursement_transfer', -- Employee A -> Employee B (Personal funds)
    'company_cash_transfer',          -- Employee A -> Employee B (Company custody)
    'company_advance',                -- Company -> Employee (Custody advance)
    'company_reimbursement',          -- Company -> Employee (Reimbursement of personal out-of-pocket)
    'cash_returned_to_company'        -- Employee -> Company (Unused custody returned)
  )),
  amount numeric NOT NULL CHECK (amount > 0),
  batch_id text,
  notes text,
  is_reversed boolean DEFAULT false NOT NULL,
  reversal_reason text,
  reversed_transfer_id uuid REFERENCES public.petty_cash_transfers(id),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.petty_cash_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations for petty_cash_transfers" 
  ON public.petty_cash_transfers FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_transfers_from_emp 
  ON public.petty_cash_transfers (from_employee_id);
CREATE INDEX IF NOT EXISTS idx_transfers_to_emp 
  ON public.petty_cash_transfers (to_employee_id);
CREATE INDEX IF NOT EXISTS idx_transfers_batch 
  ON public.petty_cash_transfers (batch_id);


-- 3. Create Company Cash Custody Opening Balances Table
CREATE TABLE IF NOT EXISTS public.petty_cash_custody_opening_balances (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid REFERENCES public.profiles(id) NOT NULL UNIQUE,
  opening_balance numeric NOT NULL DEFAULT 0,
  as_of_date date NOT NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.petty_cash_custody_opening_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations for petty_cash_custody_opening_balances" 
  ON public.petty_cash_custody_opening_balances FOR ALL USING (true);
