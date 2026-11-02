'use client';

import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { 
  QrCode, 
  Download, 
  Printer, 
  Copy, 
  Check, 
  ExternalLink, 
  Sparkles, 
  ShieldCheck, 
  Building2,
  Smartphone
} from 'lucide-react';
import { useLanguage } from '@/components/layout/LanguageProvider';

export default function VisitorQRCodePage() {
  const { t } = useLanguage();
  const [publicUrl, setPublicUrl] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [highResQrUrl, setHighResQrUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Generate public URL based on current browser origin
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://ectron.om';
    const targetUrl = `${origin}/visitor/register`;
    setPublicUrl(targetUrl);

    // Generate normal QR for UI
    QRCode.toDataURL(targetUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#173B63', // ECTRON Navy
        light: '#FFFFFF'
      }
    }).then(url => {
      setQrDataUrl(url);
    });

    // Generate High-Res QR for download and print (1024px)
    QRCode.toDataURL(targetUrl, {
      width: 1024,
      margin: 3,
      color: {
        dark: '#173B63',
        light: '#FFFFFF'
      }
    }).then(url => {
      setHighResQrUrl(url);
    });
  }, []);

  const handleCopy = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadPNG = () => {
    if (!highResQrUrl) return;
    const a = document.createElement('a');
    a.href = highResQrUrl;
    a.download = 'ECTRON_Visitor_Registration_QR.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrintPoster = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      
      {/* Print-only CSS rules for A4 Poster */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-poster, #printable-poster * {
            visibility: visible;
          }
          #printable-poster {
            position: fixed;
            left: 0;
            top: 0;
            width: 100vw;
            height: 100vh;
            margin: 0;
            padding: 3rem;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #ffffff !important;
            border: none !important;
            box-shadow: none !important;
            color: #173B63 !important;
            z-index: 99999;
          }
        }
      `}</style>

      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900/60 p-6 rounded-3xl border border-border shadow-sm glass print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#173B63] to-[#0F766E] flex items-center justify-center text-white shadow-sm">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#173B63] dark:text-white">
              {t('QR Code Management', 'رمز الاستجابة السريعة (QR Code Management)')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400">
              {t('Generate and print self-registration QR code for the reception gate', 'توليد وطباعة رمز التسجيل الذاتي للزوار عند بوابة الاستقبال')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadPNG}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4 text-[#0F766E]" />
            <span>{t('Download QR (PNG)', 'تحميل الرمز (PNG)')}</span>
          </button>

          <button
            type="button"
            onClick={handlePrintPoster}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#173B63] to-[#0F766E] text-white text-xs font-bold shadow flex items-center gap-1.5 hover:opacity-95 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>{t('Print Reception Poster (A4)', 'طباعة ملصق الاستقبال (A4 Poster)')}</span>
          </button>
        </div>
      </div>

      {/* URL Link Bar */}
      <div className="bg-white dark:bg-zinc-900/60 p-5 rounded-3xl border border-border shadow-sm glass print:hidden">
        <label className="block text-xs font-bold text-[#173B63] dark:text-zinc-300 mb-2">
          {t('Public Visitor Registration Link', 'رابط التسجيل العام للزوار (Public Registration Link)')}
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={publicUrl}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/80 text-xs sm:text-sm font-mono text-slate-700 dark:text-zinc-200 select-all focus:outline-none"
          />

          <button
            type="button"
            onClick={handleCopy}
            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-bold text-[#173B63] dark:text-zinc-200 transition-colors flex items-center gap-1.5"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{t('Copied!', 'تم النسخ!')}</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-[#0F766E]" />
                <span>{t('Copy Link', 'نسخ الرابط')}</span>
              </>
            )}
          </button>

          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 transition-colors"
            title={t('Open registration page in new tab', 'تجربة فتح صفحة التسجيل')}
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Poster Preview Card (Also used for A4 Print!) */}
      <div 
        id="printable-poster"
        ref={posterRef}
        className="bg-white rounded-3xl border-2 border-[#BDCEE0] dark:border-zinc-800 p-8 sm:p-12 text-center shadow-xl relative overflow-hidden text-slate-800"
      >
        {/* Decorative Top Accent Stripe */}
        <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-[#173B63] via-[#0F766E] to-[#14B8A6]" />

        {/* ECTRON Official Logo */}
        <div className="flex justify-center mb-6">
          <div className="flex items-baseline select-none tracking-tight">
            <span className="text-5xl font-extrabold text-[#173B63]">ectr</span>
            <span className="relative inline-flex items-center justify-center mx-1">
              <span className="w-5 h-5 rounded-full bg-[#14B8A6] inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#173B63] absolute -top-3.5 -right-0.5" />
            </span>
            <span className="text-5xl font-extrabold text-[#173B63]">n</span>
          </div>
        </div>

        <div className="text-xs font-bold tracking-widest text-[#0F766E] uppercase mb-1">
          Smart Factory Visitor Access
        </div>
        <h2 className="text-3xl font-extrabold text-[#173B63] mb-2">
          امسح الرمز لتسجيل زيارتك
        </h2>
        <h3 className="text-xl font-bold text-[#0F766E] mb-6">
          Scan to Register Your Visit
        </h3>

        {/* QR Code Graphic Frame */}
        <div className="inline-block p-4 bg-white rounded-3xl border-4 border-[#173B63]/10 shadow-lg mb-6">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="ECTRON Visitor Registration QR Code"
              className="w-64 h-64 sm:w-72 sm:h-72 object-contain mx-auto"
            />
          ) : (
            <div className="w-64 h-64 flex items-center justify-center bg-slate-50 text-slate-400">
              جاري توليد الرمز...
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="max-w-md mx-auto space-y-3 mb-6 text-sm text-slate-600">
          <div className="flex items-center justify-center gap-2 font-medium">
            <Smartphone className="w-4 h-4 text-[#0F766E]" />
            <span>وجه كاميرا هاتفك المحمول نحو الرمز لفتح استمارة التسجيل</span>
          </div>
          <p className="text-xs text-slate-400">
            Point your mobile camera at the QR code to open the self-registration form.
          </p>
        </div>

        {/* Footer info */}
        <div className="pt-6 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 max-w-lg mx-auto">
          <span>ECTRON Factory Reception</span>
          <span>قسم الأمن والاستقبال والسلامة المهنية</span>
        </div>
      </div>

    </div>
  );
}
