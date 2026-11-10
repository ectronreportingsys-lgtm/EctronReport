'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { 
  FolderArchive, 
  Plus, 
  FolderOpen, 
  FileSpreadsheet, 
  Layers, 
  RotateCw, 
  Bell, 
  ShieldCheck, 
  Download, 
  Check, 
  Info,
  ChevronRight
} from 'lucide-react';
import { EDCSDocument, computeDocumentStatus } from '@/lib/edcsTypes';
import EDCSSampleBanner from '@/components/library/EDCSSampleBanner';
import EDCSKPICards from '@/components/library/EDCSKPICards';
import EDCSExpirationsWatchlist from '@/components/library/EDCSExpirationsWatchlist';
import EDCSDocumentRegistryTable from '@/components/library/EDCSDocumentRegistryTable';
import EDCSAddDocumentModal from '@/components/library/EDCSAddDocumentModal';
import EDCSRenewDocumentModal from '@/components/library/EDCSRenewDocumentModal';
import EDCSViewDocumentModal from '@/components/library/EDCSViewDocumentModal';
import { useLanguage } from '@/components/layout/LanguageProvider';

interface EDCSDashboardViewProps {
  initialDocuments: EDCSDocument[];
}

export default function EDCSDashboardView({ initialDocuments }: EDCSDashboardViewProps) {
  const { t } = useLanguage();

  const [documents, setDocuments] = useState<EDCSDocument[]>(initialDocuments || []);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'registry'>('dashboard');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<EDCSDocument | null>(null);
  const [renewingDoc, setRenewingDoc] = useState<EDCSDocument | null>(null);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  // Filter selection from KPI click
  const [registryFilter, setRegistryFilter] = useState<string>('all');

  // Compute live metrics
  const metrics = React.useMemo(() => {
    let total = documents.length;
    let active = 0;
    let expiringSoon = 0;
    let expired = 0;
    let permanent = 0;

    for (const doc of documents) {
      if (doc.status === 'Active') active++;
      else if (doc.status === 'Expiring Soon') expiringSoon++;
      else if (doc.status === 'Expired') expired++;
      else if (doc.status === 'Permanent') permanent++;
    }

    return { total, active, expiringSoon, expired, permanent };
  }, [documents]);

  const handleKPIClick = (filterKey: 'all' | 'Active' | 'Expiring Soon' | 'Expired') => {
    setRegistryFilter(filterKey);
    setActiveTab('registry');
  };

  const handleDocAdded = (newDoc: EDCSDocument) => {
    setDocuments(prev => [newDoc, ...prev]);
  };

  const handleDocRenewed = (updatedDoc: EDCSDocument) => {
    setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
  };

  const handleDownloadDoc = (doc: EDCSDocument) => {
    setDownloadNotice(t(
      `Mock Signed URL generated for "${doc.fileName || doc.name}". (In production, a short-lived 60s private signed token is issued by Supabase Storage).`,
      `تم إنشاء رابط تنزيل آمن تجريبي للملف "${doc.fileName || doc.name}". (في بيئة الإنتاج يتم إصدار رابط خاص ومشفّر لمدة 60 ثانية عبر Supabase Storage).`
    ));
    setTimeout(() => setDownloadNotice(null), 5000);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Download / Info Notification */}
      {downloadNotice && (
        <div className="p-4 rounded-xl bg-teal-500/15 border border-teal-500/40 text-teal-300 text-xs font-semibold flex items-center justify-between shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-teal-400 shrink-0" />
            <span>{downloadNotice}</span>
          </div>
          <button onClick={() => setDownloadNotice(null)} className="text-zinc-400 hover:text-white cursor-pointer">
            &times;
          </button>
        </div>
      )}

      {/* Main Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#0F766E] dark:text-[#14B8A6] uppercase tracking-wider mb-1">
            <span>ECTRON Factory Core</span>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
            <span>Document Control (EDCS)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#173B63] dark:text-white tracking-tight flex items-center gap-2.5">
            <FolderArchive className="w-7 h-7 text-[#14B8A6]" />
            <span>{t('ECTRON Library & Document Control', 'مكتبة المصنع ونظام مراقبة الوثائق (EDCS)')}</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            {t(
              'Secure cloud repository for factory permits, ISO certifications, calibrations, and 14-day early warning alerts',
              'المستودع السحابي الآمن لتراخيص المصنع، شهادات الجودة، سجلات المعايرة، ونظام التنبيه المبكر قبل 14 يوماً'
            )}
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap self-stretch sm:self-auto">
          {/* Add Document Button */}
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-zinc-950 font-bold text-xs sm:text-sm transition-all shadow-md shadow-teal-900/30 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{t('Add Document', 'إضافة وثيقة جديدة')}</span>
          </button>

          {/* Tab Switcher: Dashboard / Full Registry */}
          <div className="flex items-center p-1 bg-zinc-900/80 rounded-xl border border-zinc-800">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={clsx(
                'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                activeTab === 'dashboard'
                  ? 'bg-zinc-800 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              {t('Dashboard View', 'لوحة التحكم')}
            </button>
            <button
              type="button"
              onClick={() => {
                setRegistryFilter('all');
                setActiveTab('registry');
              }}
              className={clsx(
                'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                activeTab === 'registry'
                  ? 'bg-zinc-800 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              <span>{t('Full Registry', 'سجل الوثائق')}</span>
              <span className="text-[10px] bg-zinc-800 px-1.5 rounded-full text-teal-300 font-mono">
                {documents.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Phase 1 Sample Data Notice Banner */}
      <EDCSSampleBanner />

      {/* 4 KPI Cards */}
      <EDCSKPICards
        metrics={metrics}
        onFilterClick={handleKPIClick}
        activeFilter={registryFilter}
      />

      {/* Tab 1: Dashboard View (Upcoming Expirations Watchlist + Summary Highlights) */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Upcoming Expirations Watchlist */}
          <EDCSExpirationsWatchlist
            documents={documents}
            onViewDoc={doc => setViewingDoc(doc)}
            onRenewDoc={doc => setRenewingDoc(doc)}
            onDownloadDoc={handleDownloadDoc}
          />

          {/* Quick Registry Table Snapshot */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-teal-400" />
                <span>{t('All Factory Documents Overview', 'نظرة عامة على وثائق المصنع')}</span>
              </h3>
              <button
                type="button"
                onClick={() => setActiveTab('registry')}
                className="text-xs font-bold text-teal-400 hover:text-teal-300 hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>{t('Open Full Document Registry', 'فتح سجل الوثائق الكامل')}</span>
                <ChevronRight className="w-4 h-4 rtl:rotate-180" />
              </button>
            </div>

            <EDCSDocumentRegistryTable
              documents={documents}
              onViewDoc={doc => setViewingDoc(doc)}
              onRenewDoc={doc => setRenewingDoc(doc)}
              onEditDoc={doc => setViewingDoc(doc)}
              onDownloadDoc={handleDownloadDoc}
              onAddNewDoc={() => setIsAddModalOpen(true)}
              initialStatusFilter="all"
            />
          </div>
        </div>
      )}

      {/* Tab 2: Full Document Registry View */}
      {activeTab === 'registry' && (
        <EDCSDocumentRegistryTable
          documents={documents}
          onViewDoc={doc => setViewingDoc(doc)}
          onRenewDoc={doc => setRenewingDoc(doc)}
          onEditDoc={doc => setViewingDoc(doc)}
          onDownloadDoc={handleDownloadDoc}
          onAddNewDoc={() => setIsAddModalOpen(true)}
          initialStatusFilter={registryFilter}
        />
      )}

      {/* Modals */}
      <EDCSAddDocumentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleDocAdded}
      />

      <EDCSRenewDocumentModal
        isOpen={!!renewingDoc}
        document={renewingDoc}
        onClose={() => setRenewingDoc(null)}
        onSuccess={handleDocRenewed}
      />

      <EDCSViewDocumentModal
        isOpen={!!viewingDoc}
        document={viewingDoc}
        onClose={() => setViewingDoc(null)}
        onRenew={doc => setRenewingDoc(doc)}
        onDownload={handleDownloadDoc}
      />
    </div>
  );
}
