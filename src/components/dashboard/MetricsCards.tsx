'use client';

import { Target, CheckCircle2, TrendingUp, AlertCircle, Zap } from 'lucide-react';
import clsx from 'clsx';
import { useLanguage } from '@/components/layout/LanguageProvider';

interface MetricsProps {
  target: number;
  achieved: number;
  remaining: number;
  achievement: number;
  efficiency: number;
}

export default function MetricsCards({ metrics }: { metrics: MetricsProps }) {
  const { t } = useLanguage();
  const isWarning = metrics.efficiency < 90;
  const isExcellent = metrics.achieved >= metrics.target;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      <MetricCard 
        title={t("Target", "المستهدف")} 
        value={metrics.target.toLocaleString()} 
        icon={Target} 
        color="text-blue-400" 
        bg="bg-blue-500/10" 
      />
      <MetricCard 
        title={t("Achieved", "المحقق")} 
        value={metrics.achieved.toLocaleString()} 
        icon={CheckCircle2} 
        color="text-emerald-400" 
        bg="bg-emerald-500/10" 
      />
      <MetricCard 
        title={t("Achievement", "نسبة الإنجاز")} 
        value={`${metrics.achievement}%`} 
        icon={TrendingUp} 
        color={isExcellent ? "text-emerald-400" : "text-blue-400"} 
        bg={isExcellent ? "bg-emerald-500/10" : "bg-blue-500/10"} 
      />
      <MetricCard 
        title={t("Remaining", "المتبقي")} 
        value={metrics.remaining.toLocaleString()} 
        icon={AlertCircle} 
        color="text-yellow-400" 
        bg="bg-yellow-500/10" 
      />
      <MetricCard 
        title={t("Efficiency", "الكفاءة")} 
        value={`${metrics.efficiency}%`} 
        icon={Zap} 
        color={isWarning ? "text-danger" : "text-emerald-400"} 
        bg={isWarning ? "bg-danger/10" : "bg-emerald-500/10"}
        glow={isWarning ? "shadow-[0_0_15px_rgba(239,68,68,0.2)]" : ""} 
      />
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  bg: string;
  glow?: string;
}

function MetricCard({ title, value, icon: Icon, color, bg, glow = "" }: MetricCardProps) {
  return (
    <div className={clsx("p-5 rounded-2xl glass bg-gradient-to-br from-white to-[#F0F7FC] dark:bg-none border border-[#B5CDE2] border-l-4 border-l-[#14B8A6] dark:border-l dark:border-border flex items-center gap-4", glow)}>
      <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center border border-[#173B63]/15 dark:border-transparent", bg)}>
        <Icon className={clsx("w-6 h-6", color)} />
      </div>
      <div>
        <p className="text-zinc-400 text-sm font-semibold">{title}</p>
        <h3 className="text-2xl font-bold text-white mt-1">{value}</h3>
      </div>
    </div>
  );
}
