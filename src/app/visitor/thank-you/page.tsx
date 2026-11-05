'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle, ArrowLeft, Home, Sparkles, Building2 } from 'lucide-react';
import { createClient } from '@/lib/supabase';

export default function VisitorThankYouPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setIsAuthenticated(true);
        }
      } catch (e) {
        // public user
      }
    }
    checkAuth();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EBF2F7] via-[#F0F7FC] to-[#D4E8F7] dark:from-[#09090b] dark:via-[#111827] dark:to-[#0f172a] flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300">
      
      {/* Decorative Orbs */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-[#14B8A6]/20 dark:bg-[#00a99d]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#173B63]/20 dark:bg-[#1b497f]/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-lg w-full bg-white/90 dark:bg-zinc-900/80 backdrop-blur-md rounded-3xl p-8 sm:p-10 border border-[#BDCEE0] dark:border-zinc-800 shadow-2xl text-center relative z-10 glass">
        
        {/* ECTRON Brand Mark */}
        <div className="flex justify-center mb-6">
          <img 
            src="/logo.png" 
            alt="ECTRON" 
            className="h-12 w-auto max-w-[200px] object-contain" 
          />
        </div>

        {/* Animated Success Badge */}
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#0F766E] to-[#14B8A6] flex items-center justify-center text-white mx-auto mb-6 shadow-lg shadow-teal-500/20">
          <CheckCircle className="w-10 h-10" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#173B63] dark:text-white mb-2">
          Thank You for Visiting ECTRON!
        </h1>
        <h2 className="text-lg font-semibold text-[#0F766E] dark:text-[#00a99d] mb-4">
          شكراً لزيارتكم إلكترون!
        </h2>

        <p className="text-sm text-slate-600 dark:text-zinc-300 mb-8 leading-relaxed">
          Your registration has been completed successfully. We look forward to welcoming you to the ECTRON Smart Factory.
          <br />
          <span className="text-xs text-slate-500 dark:text-zinc-400 block mt-2">
            تم تسجيل بياناتكم بنجاح. نتطلع للترحيب بكم ونتمنى لكم زيارة مثمرة وموفقة في رحاب مصنع إلكترون الذكي.
          </span>
        </p>

        {/* Navigation Action */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {isAuthenticated ? (
            <Link
              href="/visitor/dashboard"
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-[#173B63] to-[#0F766E] text-white text-sm font-bold shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </Link>
          ) : (
            <Link
              href="/visitor/register"
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-[#0F766E] to-[#14B8A6] text-white text-sm font-bold shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Register Another Visit</span>
            </Link>
          )}
        </div>

      </div>

    </div>
  );
}
