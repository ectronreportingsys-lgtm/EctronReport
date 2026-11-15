-- ==============================================================================
-- Function: delete_visit_record
-- Description: Concurrency-safe atomic visit & visitors deletion function
-- Security: SECURITY DEFINER ensures authorized deletion from public.visits & visit_visitors
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.delete_visit_record(p_visit_id text)
RETURNS boolean AS $$
DECLARE
  v_id uuid;
BEGIN
  -- 1. If p_visit_id is UUID, delete directly
  IF p_visit_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_id := p_visit_id::uuid;
    DELETE FROM public.visit_visitors WHERE visit_id = v_id;
    DELETE FROM public.visits WHERE id = v_id;
    RETURN true;
  END IF;

  -- 2. Otherwise search by visit_number (e.g. 'VIS-2026-0001')
  SELECT id INTO v_id FROM public.visits WHERE visit_number = p_visit_id LIMIT 1;
  IF v_id IS NOT NULL THEN
    DELETE FROM public.visit_visitors WHERE visit_id = v_id;
    DELETE FROM public.visits WHERE id = v_id;
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
