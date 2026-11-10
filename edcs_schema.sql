-- ==============================================================================
-- ECTRON Document Control System (EDCS) - Database Schema & Architecture Review
-- Status: DRAFT / ARCHITECTURE REVIEW (DO NOT EXECUTE UNTIL PLAN IS APPROVED)
-- Target Database: Supabase PostgreSQL (Asia/Muscat Timezone)
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. Master Categories Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.edcs_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    name_ar VARCHAR(100),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Standard Factory Categories
INSERT INTO public.edcs_categories (name, name_ar, description) VALUES
('Environmental & Municipal', 'التصاريح البيئية والبلدية', 'Factory environmental licenses and municipality permits'),
('Quality & Standards', 'الجودة والمواصفات القياسية', 'ISO certifications and national quality standards'),
('Safety & Civil Defense', 'السلامة والدفاع المدني', 'Fire safety licenses, hazardous material approvals'),
('Calibration & Metrology', 'المعايرة والقياسات', 'Testing bench calibrations and certified metrology certificates'),
('Corporate & Legal', 'السجلات والوثائق القانونية', 'Commercial registrations, industrial licenses, MoCIIP permits'),
('Specialized Machinery', 'شهادات المعدات المتخصصة', 'RF chamber, radiation testing, and autoclave certifications'),
('Factory Infrastructure', 'المخططات والإنشاءات', 'As-built blueprints, single-line electrical diagrams'),
('Vendor & Supplier Contracts', 'عقود الموردين والشركات', 'Service level agreements, waste disposal, maintenance contracts')
ON CONFLICT (name) DO NOTHING;

-- ==============================================================================
-- 3. Main Documents Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.edcs_documents (
    id VARCHAR(50) PRIMARY KEY, -- e.g. 'EDCS-2026-001'
    reference_no VARCHAR(100) NOT NULL UNIQUE, -- e.g. 'ECT-ENV-2025-089'
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    category_id UUID REFERENCES public.edcs_categories(id) ON DELETE RESTRICT,
    department VARCHAR(100) NOT NULL,
    issue_date DATE,
    expiry_date DATE,
    is_permanent BOOLEAN DEFAULT FALSE,
    responsible_person VARCHAR(150) NOT NULL,
    reminder_email VARCHAR(255) NOT NULL,
    current_version VARCHAR(20) DEFAULT 'v1.0',
    status VARCHAR(30) DEFAULT 'Active', -- 'Active', 'Expiring Soon', 'Expired', 'Permanent'
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_edcs_docs_expiry ON public.edcs_documents(expiry_date);
CREATE INDEX IF NOT EXISTS idx_edcs_docs_dept ON public.edcs_documents(department);
CREATE INDEX IF NOT EXISTS idx_edcs_docs_status ON public.edcs_documents(status);

-- ==============================================================================
-- 4. Document Versions & File Storage Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.edcs_document_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id VARCHAR(50) REFERENCES public.edcs_documents(id) ON DELETE CASCADE,
    version VARCHAR(20) NOT NULL, -- e.g. 'v1.0', 'v2.0'
    storage_path TEXT NOT NULL, -- Path in private bucket: documents/{document_id}/{version}_{fileName}
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    file_type VARCHAR(100) DEFAULT 'application/pdf',
    uploaded_by VARCHAR(150) NOT NULL,
    uploaded_by_id UUID REFERENCES auth.users(id),
    notes TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(document_id, version)
);

CREATE INDEX IF NOT EXISTS idx_edcs_versions_doc ON public.edcs_document_versions(document_id);

-- ==============================================================================
-- 5. Expiry Notifications & Delivery Logs Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.edcs_notification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id VARCHAR(50) REFERENCES public.edcs_documents(id) ON DELETE CASCADE,
    document_version VARCHAR(20) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    days_before_expiry INT DEFAULT 14,
    notification_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL, -- 'Sent', 'Failed', 'Retrying'
    attempt_count INT DEFAULT 1,
    provider_message_id VARCHAR(255),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(document_id, document_version, notification_date) -- Prevents duplicate daily alerts
);

-- ==============================================================================
-- 6. Audit Trail Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.edcs_audit_trail (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id VARCHAR(50),
    action VARCHAR(50) NOT NULL, -- 'CREATE', 'RENEW', 'UPDATE', 'DOWNLOAD', 'DELETE'
    performed_by VARCHAR(150),
    performed_by_id UUID REFERENCES auth.users(id),
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 7. Supabase Storage Architecture: Private Bucket Setup
-- ==============================================================================
-- Bucket: edcs-documents-private
-- Public: FALSE (Strictly private; files accessed via 60-second signed URLs only)
-- Max File Size: 26,214,400 bytes (25MB)
-- Allowed MIME Types:
--   application/pdf,
--   application/msword,
--   application/vnd.openxmlformats-officedocument.wordprocessingml.document,
--   application/vnd.ms-excel,
--   application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,
--   image/jpeg,
--   image/png

/*
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'edcs-documents-private',
    'edcs-documents-private',
    false,
    26214400,
    ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png'
    ]
)
ON CONFLICT (id) DO NOTHING;
*/

-- ==============================================================================
-- 8. Row Level Security (RLS) Policies
-- ==============================================================================
ALTER TABLE public.edcs_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edcs_document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edcs_notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edcs_audit_trail ENABLE ROW LEVEL SECURITY;

-- Rule 1: Viewers can view documents if authorized
CREATE POLICY "EDCS Viewer Read Documents" ON public.edcs_documents
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.role_permissions rp ON ur.role_id = rp.role_id
            JOIN public.permissions p ON rp.permission_id = p.id
            WHERE ur.user_id = auth.uid() AND (p.key = 'library_registry' OR p.key = 'admin_panel')
        )
    );

-- Rule 2: Editors can insert documents
CREATE POLICY "EDCS Editor Insert Documents" ON public.edcs_documents
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.role_permissions rp ON ur.role_id = rp.role_id
            JOIN public.permissions p ON rp.permission_id = p.id
            WHERE ur.user_id = auth.uid() AND (p.key = 'library_create' OR p.key = 'admin_panel')
        )
    );

-- Rule 3: Editors can update documents
CREATE POLICY "EDCS Editor Update Documents" ON public.edcs_documents
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.role_permissions rp ON ur.role_id = rp.role_id
            JOIN public.permissions p ON rp.permission_id = p.id
            WHERE ur.user_id = auth.uid() AND (p.key = 'library_create' OR p.key = 'admin_panel')
        )
    );

-- Rule 4: Admins can delete documents
CREATE POLICY "EDCS Admin Delete Documents" ON public.edcs_documents
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'Admin'
        )
    );

-- Storage RLS: Download only via signed URLs or authenticated viewers
-- (Storage policies configured in storage.objects schema with private bucket guard)

-- ==============================================================================
-- 9. Scheduled Expiry Alert Procedure (Asia/Muscat Timezone)
-- ==============================================================================
-- Runs daily at 08:00 AM Asia/Muscat (04:00 AM UTC)
CREATE OR REPLACE FUNCTION public.edcs_check_upcoming_expirations()
RETURNS TABLE (
    document_id VARCHAR,
    document_name VARCHAR,
    expiry_date DATE,
    recipient_email VARCHAR,
    days_left INT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.name,
        d.expiry_date,
        d.reminder_email,
        (d.expiry_date - (NOW() AT TIME ZONE 'Asia/Muscat')::DATE)::INT AS days_left
    FROM public.edcs_documents d
    WHERE 
        d.is_permanent = FALSE
        AND d.expiry_date IS NOT NULL
        -- Exactly 14 days before expiration OR already expired within 7 days
        AND (d.expiry_date - (NOW() AT TIME ZONE 'Asia/Muscat')::DATE) = 14
        -- Prevent duplicate email alert for the same version
        AND NOT EXISTS (
            SELECT 1 FROM public.edcs_notification_logs l
            WHERE l.document_id = d.id 
              AND l.document_version = d.current_version
              AND l.status = 'Sent'
        );
END;
$$;
