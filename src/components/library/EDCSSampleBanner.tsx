'use client';

import React from 'react';
import { ShieldCheck, Info, Sparkles, Database } from 'lucide-react';
import { useLanguage } from '@/components/layout/LanguageProvider';

export default function EDCSSampleBanner() {
  const { t } = useLanguage();

  return (
    <div className="relative overflow-hidden rounded-2xl border border-teal-500/30 bg-gradient-to-r from-[#173B63]/90 via-[#0F766E]/40 to-[#14B8A6]/20 p-4 sm:p-5 text-white shadow-lg backdrop-blur-md">
      <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[#14B8A6]/10 blur-2xl pointer-events-none" />
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#14B8A6]/20 border border-[#14B8A6]/40 text-[#2DD4BF] shadow-inner">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#14B8A6] text-zinc-950 font-mono">
                Phase 1 Preview
              </span>
              <span className="text-xs font-bold text-teal-300">
                {t('ECTRON Document Control System (EDCS)', 'نظام مراقبة وإدارة وثائق مصنع إلكترون (EDCS)')}
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-300 leading-relaxed max-w-3xl">
              {t(
                'Demonstration mode with realistic sample factory documents. Live cloud storage and database schema migration will connect after architecture approval. No production data or existing tables have been altered.',
                'بيئة عرض وتجربة تفاعلية لبيانات ووثائق المصنع (المكتبة). التخزين السحابي الخاص وقاعدة البيانات جاهزة للتفعيل بعد اعتماد وثيقة المعمارية ومخطط الأمان. لم يتم تعديل أي من بيانات المنظومة الحالية.'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/70 border border-teal-500/30 text-teal-300 text-xs font-semibold shadow-xs">
            <Database className="w-3.5 h-3.5 text-[#2DD4BF]" />
            <span>{t('Sample Data Active', 'بيانات تجريبية نشطة')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
