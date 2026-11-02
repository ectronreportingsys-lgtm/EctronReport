'use client';

import { useState, useEffect } from 'react';
import { BrainCircuit, Sparkles, AlertTriangle, TrendingDown } from 'lucide-react';
import { useLanguage } from '@/components/layout/LanguageProvider';

export default function AnalysisPage() {
  const { t } = useLanguage();
  const [isGenerating, setIsGenerating] = useState(true);
  const [text, setText] = useState('');

  const fullText = `تم تحقيق 94.2% من الهدف اليومي.
أفضل أداء كان لقسم Calibration بنسبة 99%.
أقل أداء كان Metrology بسبب انخفاض الإنتاج.
انخفض الإنتاج بنسبة 8% مقارنة بالأمس.
السبب الرئيسي هو نقص SIM Cards.`;

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setText(fullText.slice(0, i));
      i++;
      if (i > fullText.length) {
        clearInterval(interval);
        setIsGenerating(false);
      }
    }, 50);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8 py-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-[#CCFBF1] dark:bg-purple-500/20 flex items-center justify-center border border-[#14B8A6]/30 dark:border-purple-500/30 shadow-xs">
          <BrainCircuit className="w-6 h-6 text-[#0F766E] dark:text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#173B63] dark:text-white">{t('AI Automated Analysis')}</h1>
          <p className="text-[#475569] dark:text-zinc-400 text-sm">{t('Insights generated automatically from your production data.')}</p>
        </div>
      </div>

      <div className="glass rounded-2xl p-8 border border-border dark:border-zinc-800/50 relative overflow-hidden">
        <div className="hidden dark:block absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col gap-6 text-right" dir="rtl">
          <div className="flex items-center justify-between mb-2 border-b border-border dark:border-zinc-800/50 pb-4">
            <h2 className="text-xl font-bold text-[#173B63] dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#14B8A6] dark:text-purple-400" />
              التحليل اليومي الذكي
            </h2>
            <span className="text-xs font-semibold px-3 py-1 bg-[#CCFBF1] dark:bg-purple-500/10 text-[#0F766E] dark:text-purple-400 rounded-full border border-[#14B8A6]/30 dark:border-purple-500/20">
              {isGenerating ? 'جاري التوليد...' : 'تم التحديث'}
            </span>
          </div>

          <div className="min-h-[150px]">
            <p className="text-lg leading-loose text-[#475569] dark:text-zinc-200 whitespace-pre-line font-medium">
              {text}
              {isGenerating && <span className="inline-block w-1.5 h-5 mr-1 bg-[#14B8A6] dark:bg-purple-400 animate-pulse align-middle" />}
            </p>
          </div>
          
          {!isGenerating && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-6 border-t border-border dark:border-zinc-800/50">
              <div className="p-4 rounded-xl bg-red-50 dark:bg-danger/10 border border-red-200 dark:border-danger/20 flex gap-4 text-right">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-danger shrink-0" />
                <div>
                  <h4 className="text-[#173B63] dark:text-white font-bold mb-1">تنبيه عاجل</h4>
                  <p className="text-sm text-[#475569] dark:text-zinc-400">نقص في مخزون SIM Cards أثر على قسم Metrology. يرجى التواصل مع قسم المشتريات.</p>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-warning/10 border border-amber-200 dark:border-warning/20 flex gap-4 text-right">
                <TrendingDown className="w-6 h-6 text-amber-600 dark:text-warning shrink-0" />
                <div>
                  <h4 className="text-[#173B63] dark:text-white font-bold mb-1">انخفاض الإنتاج</h4>
                  <p className="text-sm text-[#475569] dark:text-zinc-400">يوجد انخفاض بنسبة 8% عن الأمس. يجب مراجعة خطة العمل لتعويض الفارق في الوردية القادمة.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
