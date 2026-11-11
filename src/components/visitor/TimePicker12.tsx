'use client';

import React, { useState, useEffect } from 'react';
import { Clock, X } from 'lucide-react';
import { useLanguage } from '@/components/layout/LanguageProvider';

export interface TimePicker12Props {
  value: string; // "HH:mm" (24h) or ""
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  allowClear?: boolean;
  showNowButton?: boolean;
  compact?: boolean;
}

// Exactly 1 to 12 without repetition
const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

// Exactly 0 to 59 without repetition
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

export function TimePicker12({
  value,
  onChange,
  label,
  required = false,
  disabled = false,
  className = '',
  allowClear,
  showNowButton = true,
  compact = false,
}: TimePicker12Props) {
  const { lang, t } = useLanguage();
  const isAr = lang === 'ar';

  // Parse 24-hour value ("HH:mm") into 12-hour components
  const hasValue = Boolean(value && value.includes(':'));
  let parsedHour: number | null = null;
  let parsedMinute: number | null = null;
  let parsedPeriod: 'AM' | 'PM' = 'AM';

  if (hasValue) {
    const parts = value.split(':');
    const h24 = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (!isNaN(h24) && !isNaN(m)) {
      parsedPeriod = h24 >= 12 ? 'PM' : 'AM';
      const hMod = h24 % 12;
      parsedHour = hMod === 0 ? 12 : hMod;
      parsedMinute = Math.max(0, Math.min(59, m));
    }
  }

  const [activePeriod, setActivePeriod] = useState<'AM' | 'PM'>(parsedPeriod);

  useEffect(() => {
    if (hasValue) {
      setActivePeriod(parsedPeriod);
    }
  }, [hasValue, parsedPeriod]);

  // Convert (hour12, minute, period) to 24h "HH:mm"
  const emitChange = (h: number, m: number, p: 'AM' | 'PM') => {
    let h24 = h % 12;
    if (p === 'PM') h24 += 12;
    const hStr = String(h24).padStart(2, '0');
    const mStr = String(m).padStart(2, '0');
    onChange(`${hStr}:${mStr}`);
  };

  const handleHourChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) {
      onChange('');
      return;
    }
    const newH = parseInt(val, 10);
    const newM = parsedMinute !== null ? parsedMinute : 0;
    emitChange(newH, newM, activePeriod);
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) {
      return;
    }
    const newM = parseInt(val, 10);
    const newH = parsedHour !== null ? parsedHour : 12;
    emitChange(newH, newM, activePeriod);
  };

  const handlePeriodToggle = (newP: 'AM' | 'PM') => {
    setActivePeriod(newP);
    if (parsedHour !== null) {
      emitChange(parsedHour, parsedMinute !== null ? parsedMinute : 0, newP);
    }
  };

  const setNow = () => {
    const now = new Date();
    const timeStr = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Muscat',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(now);
    onChange(timeStr);
  };

  const handleClear = () => {
    onChange('');
  };

  const canClear = allowClear !== undefined ? allowClear : !required;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between mb-1">
          <label className={`block font-bold text-slate-800 dark:text-zinc-200 ${compact ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'}`}>
            {label}
            {required && <span className="text-red-500 ms-1">*</span>}
          </label>
          <div className="flex items-center gap-1.5">
            {showNowButton && !disabled && (
              <button
                type="button"
                onClick={setNow}
                className="text-xs px-2 py-0.5 rounded-md font-semibold text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-colors"
                title={t('Set current time', 'ضبط الوقت الحالي')}
              >
                {t('Now', 'الآن')}
              </button>
            )}
            {canClear && hasValue && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs px-1.5 py-0.5 rounded-md font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center gap-0.5"
                title={t('Clear time', 'مسح الوقت')}
              >
                <X className="w-3 h-3" />
                <span>{t('Clear', 'مسح')}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Control row */}
      <div
        className={`flex items-center gap-1.5 sm:gap-2 rounded-2xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-sm focus-within:ring-2 focus-within:ring-[#14B8A6] focus-within:border-transparent transition-all ${
          compact ? 'p-1 sm:p-1.5' : 'p-2'
        }`}
      >
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <Clock className="w-4 h-4 text-slate-400 ms-1 flex-shrink-0" />

          {/* Hour Select: 1 to 12 without repetition */}
          <div className="flex-1 min-w-[55px]">
            <select
              aria-label={t('Hour (1-12)', 'الساعة (1-12)')}
              value={parsedHour !== null ? parsedHour : ''}
              onChange={handleHourChange}
              disabled={disabled}
              required={required}
              className={`w-full text-center rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-foreground font-bold font-mono focus:outline-none focus:bg-white dark:focus:bg-zinc-800 cursor-pointer ${
                compact ? 'py-1.5 px-1 text-sm' : 'py-2 px-1 text-base'
              }`}
            >
              <option value="" disabled={required}>
                {t('Hour', 'الساعة')}
              </option>
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, '0')}
                </option>
              ))}
            </select>
          </div>

          <span className="text-lg sm:text-xl font-bold text-slate-400 select-none">:</span>

          {/* Minute Select: 0 to 59 without repetition */}
          <div className="flex-1 min-w-[55px]">
            <select
              aria-label={t('Minute (00-59)', 'الدقيقة (00-59)')}
              value={parsedMinute !== null ? parsedMinute : ''}
              onChange={handleMinuteChange}
              disabled={disabled}
              required={required && parsedHour !== null}
              className={`w-full text-center rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-foreground font-bold font-mono focus:outline-none focus:bg-white dark:focus:bg-zinc-800 cursor-pointer ${
                compact ? 'py-1.5 px-1 text-sm' : 'py-2 px-1 text-base'
              }`}
            >
              <option value="" disabled={required}>
                {t('Minute', 'الدقيقة')}
              </option>
              {MINUTES.map((m) => (
                <option key={m} value={m}>
                  {String(m).padStart(2, '0')}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* AM / PM Segmented Toggle */}
        <div className="flex items-center bg-slate-100 dark:bg-zinc-900 p-0.5 sm:p-1 rounded-xl border border-slate-200 dark:border-zinc-700 flex-shrink-0">
          <button
            type="button"
            onClick={() => handlePeriodToggle('AM')}
            disabled={disabled}
            className={`rounded-lg font-bold transition-all ${
              compact ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-xs sm:text-sm'
            } ${
              activePeriod === 'AM' && hasValue
                ? 'bg-[#0F766E] text-white shadow-sm'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {isAr ? 'صباحاً' : 'AM'}
          </button>
          <button
            type="button"
            onClick={() => handlePeriodToggle('PM')}
            disabled={disabled}
            className={`rounded-lg font-bold transition-all ${
              compact ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-xs sm:text-sm'
            } ${
              activePeriod === 'PM' && hasValue
                ? 'bg-[#0F766E] text-white shadow-sm'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {isAr ? 'مساءً' : 'PM'}
          </button>
        </div>
      </div>
    </div>
  );
}
