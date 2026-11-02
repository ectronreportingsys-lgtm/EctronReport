'use client';

import Link from 'next/link';
import { Hammer, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/components/layout/LanguageProvider';

export default function ComingSoonPage() {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <div className="glass p-12 rounded-3xl border border-zinc-800 text-center max-w-lg w-full flex flex-col items-center">
        <div className="w-24 h-24 rounded-full bg-yellow-500/10 flex items-center justify-center mb-8 border border-yellow-500/20">
          <Hammer className="w-12 h-12 text-yellow-500" />
        </div>
        
        <h1 className="text-3xl font-bold text-white mb-4">
          {t('Coming Soon!', 'قريباً جداً!')}
        </h1>
        <p className="text-zinc-400 mb-8 leading-relaxed">
          {t(
            'We are currently preparing the dashboard and production reports for ECS1100 electricity meters. It will be available soon!',
            'نحن نعمل حالياً على تجهيز منصة لوحة التحكم وتقارير الإنتاج الخاصة بعدادات الكهرباء ECS1100. ستكون متاحة قريباً!'
          )}
        </p>

        <Link 
          href="/home" 
          className="flex items-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors font-medium border border-zinc-700 hover:border-zinc-600"
        >
          {t('Back to Home', 'العودة للصفحة الرئيسية')}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
