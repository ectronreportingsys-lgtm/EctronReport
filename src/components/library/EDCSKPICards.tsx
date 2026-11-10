'use client';

import React from 'react';
import { Files, CheckCircle2, Clock, AlertTriangle, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';
import { useLanguage } from '@/components/layout/LanguageProvider';

interface EDCSKPICardsProps {
  metrics: {
    total: number;
    active: number;
    expiringSoon: number;
    expired: number;
    permanent: number;
  };
  onFilterClick?: (status: 'all' | 'Active' | 'Expiring Soon' | 'Expired') => void;
  activeFilter?: string;
}

export default function EDCSKPICards({ metrics, onFilterClick, activeFilter }: EDCSKPICardsProps) {
  const { t } = useLanguage();

  const cards = [
    {
      id: 'total',
      filterKey: 'all' as const,
      title: t('Total Documents', 'إجمالي الوثائق'),
      count: metrics.total,
      subtitle: t(`${metrics.permanent} permanent non-expiring files`, `${metrics.permanent} ملفات دائمة غير منتهية`),
      icon: Files,
      cardBg: 'bg-[#121820]/80 dark:bg-zinc-900/80 hover:border-[#14B8A6]/50',
      iconBg: 'bg-[#173B63]/30 border border-[#173B63]/50 text-teal-400',
      countColor: 'text-white',
      badgeClass: 'bg-teal-500/15 text-teal-300 border-teal-500/30'
    },
    {
      id: 'active',
      filterKey: 'Active' as const,
      title: t('Active Documents', 'وثائق سارية المفعول'),
      count: metrics.active,
      subtitle: t('Compliant & valid certificates', 'شهادات وتراخيص سارية ومطابقة'),
      icon: CheckCircle2,
      cardBg: 'bg-[#121820]/80 dark:bg-zinc-900/80 hover:border-emerald-500/50',
      iconBg: 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400',
      countColor: 'text-emerald-400',
      badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
    },
    {
      id: 'expiring',
      filterKey: 'Expiring Soon' as const,
      title: t('Expiring Within 14 Days', 'تنتهي خلال 14 يوماً'),
      count: metrics.expiringSoon,
      subtitle: t('Automated email alerts scheduled', 'تنبيهات بريدية مؤتمتة ومجدولة'),
      icon: Clock,
      cardBg: 'bg-[#121820]/80 dark:bg-zinc-900/80 hover:border-amber-500/50',
      iconBg: 'bg-amber-500/15 border border-amber-500/30 text-amber-400',
      countColor: 'text-amber-400',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      isPulsing: metrics.expiringSoon > 0
    },
    {
      id: 'expired',
      filterKey: 'Expired' as const,
      title: t('Expired Documents', 'وثائق منتهية الصلاحية'),
      count: metrics.expired,
      subtitle: t('Immediate renewal required', 'تتطلب إجراءات تجديد فورية'),
      icon: AlertTriangle,
      cardBg: 'bg-[#121820]/80 dark:bg-zinc-900/80 hover:border-rose-500/50',
      iconBg: 'bg-rose-500/15 border border-rose-500/30 text-rose-400',
      countColor: 'text-rose-400',
      badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      isAlert: metrics.expired > 0
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      {cards.map((card) => {
        const Icon = card.icon;
        const isSelected = activeFilter === card.filterKey;

        return (
          <div
            key={card.id}
            onClick={() => onFilterClick?.(card.filterKey)}
            className={clsx(
              'group relative rounded-2xl border p-5 transition-all duration-200 cursor-pointer shadow-md select-none flex flex-col justify-between overflow-hidden',
              card.cardBg,
              isSelected
                ? 'border-[#14B8A6] ring-2 ring-[#14B8A6]/30 shadow-teal-900/20'
                : 'border-zinc-800/80'
            )}
          >
            {card.isPulsing && (
              <span className="absolute top-3 right-3 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
            )}

            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-bold text-zinc-400 group-hover:text-zinc-200 transition-colors">
                  {card.title}
                </span>
                <div className={clsx('p-2.5 rounded-xl transition-transform duration-200 group-hover:scale-110', card.iconBg)}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>

              <div className="flex items-baseline gap-2">
                <span className={clsx('text-3xl sm:text-4xl font-extrabold tracking-tight', card.countColor)}>
                  {card.count}
                </span>
                <span className="text-xs text-zinc-500 font-medium">
                  {t('docs', 'وثائق')}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-800/70 flex items-center justify-between text-xs text-zinc-400">
              <span className="truncate max-w-[170px]">{card.subtitle}</span>
              <span className="text-teal-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 font-semibold text-[11px]">
                {t('View', 'عرض')}
                <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
