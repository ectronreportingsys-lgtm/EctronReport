'use client';

import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import { Download, Printer } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import ProductionTable from '@/components/dashboard/ProductionTable';
import * as XLSX from 'xlsx';

import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/components/layout/ThemeProvider';
import { useLanguage } from '@/components/layout/LanguageProvider';

const TABS = ['Daily', 'Weekly', 'Monthly', 'Yearly'];

export default function ReportsPage() {
  const { t } = useLanguage();
  const params = useParams();
  const division = params.division as string;
  const [activeTab, setActiveTab] = useState('Daily');
  const [dbData, setDbData] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString());

  const [dateFilter, setDateFilter] = useState('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [allowStartDateTyping, setAllowStartDateTyping] = useState(false);
  const [allowEndDateTyping, setAllowEndDateTyping] = useState(false);

  const years = ['2023', '2024', '2025', '2026', '2027'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  useEffect(() => {
    async function fetchData() {
      const targetTable = division === 'water' ? 'water_daily_production' : 'electricity_daily_production';
      const { data, error } = await supabase.from(targetTable).select('*');
      if (data) setDbData(data);
    }
    fetchData();
  }, [division]);

  useEffect(() => {
    const today = new Date();
    
    // Helper to format date as YYYY-MM-DD local time correctly
    const formatDate = (d: Date) => {
      const offset = d.getTimezoneOffset();
      const adjustedDate = new Date(d.getTime() - (offset*60*1000));
      return adjustedDate.toISOString().split('T')[0];
    };

    if (dateFilter === 'today') {
      const str = formatDate(today);
      setStartDate(str);
      setEndDate(str);
    } else if (dateFilter === 'yesterday') {
      const d = new Date(today);
      d.setDate(d.getDate() - 1);
      const str = formatDate(d);
      setStartDate(str);
      setEndDate(str);
    } else if (dateFilter === 'last_week') {
      const start = new Date(today);
      start.setDate(start.getDate() - 7);
      setStartDate(formatDate(start));
      setEndDate(formatDate(today));
    } else if (dateFilter === 'this_month') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(formatDate(start));
      setEndDate(formatDate(today));
    }
  }, [dateFilter]);

  const [latestTarget, setLatestTarget] = useState(640);

  useEffect(() => {
    async function fetchHistoryTarget() {
      const dateToUse = endDate || new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('production_history')
        .select('summary')
        .eq('division', division)
        .eq('date', dateToUse)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (data && data.length > 0 && data[0].summary?.target) {
        setLatestTarget(data[0].summary.target);
      }
    }
    fetchHistoryTarget();
  }, [division, endDate]);

  const dailyData = dbData.filter(d => {
    if (!startDate || !endDate) return false;
    return d.date >= startDate && d.date <= endDate;
  });
  
  const shiftTotals = {
    shift1: {} as any,
    shift2: {} as any,
    shift3: {} as any,
    official: {} as any
  };

  const todayTotals = { assembly: 0, perso: 0, lasering: 0, packaging: 0, cartons: 0, palets: 0, cards: 0, insolation: 0, radiation_frequency: 0, calibration: 0, multy_test: 0, metrology: 0 };
  const failersTotals = { assembly: 0, perso: 0, lasering: 0, packaging: 0, cartons: 0, palets: 0, cards: 0, insolation: 0, radiation_frequency: 0, calibration: 0, multy_test: 0, metrology: 0, note: '' };
  
  dailyData.forEach(d => {
    // Totals for summary and steps efficiency
    todayTotals.assembly += (d.assembly || 0);
    todayTotals.perso += (d.perso || 0);
    todayTotals.lasering += (d.lasering || 0);
    todayTotals.packaging += (d.packaging || 0);
    todayTotals.cartons += (d.cartons || 0);
    todayTotals.palets += (d.palets || 0);
    todayTotals.cards += (d.cards || 0);
    todayTotals.insolation += (d.insolation || 0);
    todayTotals.radiation_frequency += (d.radiation_frequency || 0);
    todayTotals.calibration += (d.calibration || 0);
    todayTotals.multy_test += (d.multy_test || 0);
    todayTotals.metrology += (d.metrology || 0);

    // Failers totals
    if (d.failers) {
      // Sometimes it's a string from db
      let f = d.failers;
      if (typeof f === 'string') {
        try { f = JSON.parse(f); } catch (e) {}
      }
      failersTotals.assembly += (f.assembly || 0);
      failersTotals.perso += (f.perso || 0);
      failersTotals.lasering += (f.lasering || 0);
      failersTotals.packaging += (f.packaging || 0);
      failersTotals.cartons += (f.cartons || 0);
      failersTotals.palets += (f.palets || 0);
      failersTotals.cards += (f.cards || 0);
      failersTotals.insolation += (f.insolation || 0);
      failersTotals.radiation_frequency += (f.radiation_frequency || 0);
      failersTotals.calibration += (f.calibration || 0);
      failersTotals.multy_test += (f.multy_test || 0);
      failersTotals.metrology += (f.metrology || 0);
      
      if (f.note) {
        // @ts-ignore
        if (!failersTotals.note) failersTotals.note = f.note;
        // @ts-ignore
        else failersTotals.note += '\n' + f.note;
      }
    }

    // Totals per shift for ProductionTable
    const s = d.shift || 'official';
    if (shiftTotals[s as keyof typeof shiftTotals]) {
      const targetShift = shiftTotals[s as keyof typeof shiftTotals];
      targetShift.assembly = (targetShift.assembly || 0) + (d.assembly || 0);
      targetShift.perso = (targetShift.perso || 0) + (d.perso || 0);
      targetShift.lasering = (targetShift.lasering || 0) + (d.lasering || 0);
      targetShift.packaging = (targetShift.packaging || 0) + (d.packaging || 0);
      targetShift.cartons = (targetShift.cartons || 0) + (d.cartons || 0);
      targetShift.palets = (targetShift.palets || 0) + (d.palets || 0);
      targetShift.cards = (targetShift.cards || 0) + (d.cards || 0);
      targetShift.insolation = (targetShift.insolation || 0) + (d.insolation || 0);
      targetShift.radiation_frequency = (targetShift.radiation_frequency || 0) + (d.radiation_frequency || 0);
      targetShift.calibration = (targetShift.calibration || 0) + (d.calibration || 0);
      targetShift.multy_test = (targetShift.multy_test || 0) + (d.multy_test || 0);
      targetShift.metrology = (targetShift.metrology || 0) + (d.metrology || 0);
    }
  });

  // Calculate total target across the date range
  const d1 = new Date(startDate);
  const d2 = new Date(endDate);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive
  const rangeTarget = latestTarget * (diffDays || 1);

  const handlePrint = () => {
    window.print();
  };

  const exportToExcel = () => {
    let dataToExport = dbData;
    if (activeTab === 'Daily') {
      dataToExport = dailyData;
    } else if (activeTab === 'Weekly' || activeTab === 'Monthly') {
      dataToExport = dbData.filter(d => {
        if (!d.date) return false;
        const dt = new Date(d.date);
        if (activeTab === 'Weekly') {
          return dt.getFullYear().toString() === selectedYear && dt.getMonth().toString() === selectedMonth;
        }
        return dt.getFullYear().toString() === selectedYear;
      });
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `${activeTab} Report`);
    XLSX.writeFile(workbook, `${division}_${activeTab.toLowerCase()}_report.xlsx`);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Historical Reports</h1>
          <p className="text-zinc-400 text-sm mt-1">Analyze production trends over time</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-200 text-sm font-medium hover:bg-zinc-700 transition-colors border border-zinc-700">
            <Printer className="w-4 h-4" /> {t('Print Report')}
          </button>
          <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 rounded-lg btn-primary-gradient bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20">
            <Download className="w-4 h-4" /> {t('Export PDF')}
          </button>
          <button onClick={exportToExcel} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/20">
            <Download className="w-4 h-4" /> {t('Export Excel')}
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex p-1 bg-zinc-900/50 rounded-xl w-fit border border-zinc-800">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                "px-6 py-2 rounded-lg text-sm font-medium transition-all",
                activeTab === tab 
                  ? "btn-primary-gradient bg-blue-600 text-white shadow-lg" 
                  : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'Daily' && (
          <div className="flex items-center gap-3 bg-zinc-900/50 p-2 rounded-xl border border-zinc-800 flex-wrap">
            <select 
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="bg-zinc-800/50 border border-zinc-700 text-zinc-300 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500/50"
            >
              <option value="today">اليوم (Today)</option>
              <option value="yesterday">أمس (Yesterday)</option>
              <option value="last_week">الأسبوع الأخير (Last Week)</option>
              <option value="this_month">هذا الشهر (This Month)</option>
              <option value="custom">تحديد فترة (Custom)</option>
            </select>

            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={startDate}
                onChange={e => {
                  setStartDate(e.target.value);
                  setDateFilter('custom');
                }}
                onClick={(e) => {
                  if (!allowStartDateTyping) {
                    try { e.currentTarget.showPicker(); } catch (err) {}
                  }
                }}
                onDoubleClick={() => setAllowStartDateTyping(true)}
                onBlur={() => setAllowStartDateTyping(false)}
                onKeyDown={(e) => {
                  if (!allowStartDateTyping && e.key !== 'Tab') {
                    e.preventDefault();
                  }
                }}
                className={`bg-zinc-800/50 border border-zinc-700 text-zinc-300 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500/50 ${!allowStartDateTyping ? 'cursor-pointer' : ''}`}
              />
              <span className="text-zinc-500">-</span>
              <input 
                type="date" 
                value={endDate}
                onChange={e => {
                  setEndDate(e.target.value);
                  setDateFilter('custom');
                }}
                onClick={(e) => {
                  if (!allowEndDateTyping) {
                    try { e.currentTarget.showPicker(); } catch (err) {}
                  }
                }}
                onDoubleClick={() => setAllowEndDateTyping(true)}
                onBlur={() => setAllowEndDateTyping(false)}
                onKeyDown={(e) => {
                  if (!allowEndDateTyping && e.key !== 'Tab') {
                    e.preventDefault();
                  }
                }}
                className={`bg-zinc-800/50 border border-zinc-700 text-zinc-300 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500/50 ${!allowEndDateTyping ? 'cursor-pointer' : ''}`}
              />
            </div>
          </div>
        )}

        {(activeTab === 'Weekly' || activeTab === 'Monthly') && (
          <div className="flex items-center gap-3 bg-zinc-900/50 p-2 rounded-xl border border-zinc-800">
            <select 
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="bg-zinc-800/50 border border-zinc-700 text-zinc-300 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500/50"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>

            {activeTab === 'Weekly' && (
              <select 
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="bg-zinc-800/50 border border-zinc-700 text-zinc-300 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500/50"
              >
                {months.map((m, i) => <option key={i} value={i.toString()}>{m}</option>)}
              </select>
            )}
          </div>
        )}
      </div>

      <div className="glass rounded-2xl p-6 border border-border min-h-[400px]">
        {activeTab === 'Daily' && <DailyReport division={division} totals={todayTotals} date={startDate === endDate ? startDate : `${startDate} to ${endDate}`} target={rangeTarget} shiftData={shiftTotals} failersData={failersTotals} />}
        {activeTab === 'Weekly' && <WeeklyReport dbData={dbData} division={division} year={selectedYear} month={selectedMonth} target={latestTarget} />}
        {activeTab === 'Monthly' && <MonthlyReport dbData={dbData} division={division} year={selectedYear} target={latestTarget} />}
        {activeTab === 'Yearly' && <YearlyReport dbData={dbData} division={division} />}
      </div>
    </div>
  );
}

function DailyReport({ division, totals, date, target, shiftData, failersData }: { division: string, totals: any, date: string, target: number, shiftData: any, failersData?: any }) {
  const { t } = useLanguage();
  const isWater = division === 'water';
  
  const achieved = isWater ? totals.packaging : totals.multy_test;
  const remaining = Math.max(0, target - achieved);
  const eff = target > 0 ? ((achieved / target) * 100).toFixed(1) : '0';
  const totalFailers = failersData ? Object.values(failersData).reduce((acc: number, val: any) => acc + (Number(val) || 0), 0) : 0;

  const formatStep = (val: number) => {
    const v = target > 0 ? (val / target) * 100 : 0;
    return `${v.toFixed(1)}%`;
  };

  const getStatus = (val: number) => {
    const v = target > 0 ? (val / target) * 100 : 0;
    if (v >= 90) return 'success';
    if (v >= 50) return 'warning';
    return 'danger';
  };

  return (
    <div className="flex flex-col gap-6">



      <h3 className="text-lg font-semibold text-white print:text-black mb-2">{t('Daily Summary')}</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatBox label={t("Today's Target")} value={target.toLocaleString()} />
        <StatBox label={t("Production")} value={achieved.toLocaleString()} color="text-[#0F766E] dark:text-[#00a99d]" />
        <StatBox label={t("Remaining")} value={remaining.toLocaleString()} color="text-orange-500" />
        <StatBox label={t("Total Failers")} value={totalFailers.toLocaleString()} color="text-red-500" />
        <StatBox label={t("Efficiency")} value={`${eff}%`} />
      </div>
      
      <div className="mt-4">
        <h4 className="text-sm text-zinc-400 mb-3 font-medium">{t('Production Steps Efficiency')}</h4>
        {isWater ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StepBox name="Assembly" value={formatStep(totals.assembly)} status={getStatus(totals.assembly)} />
            <StepBox name="Perso" value={formatStep(totals.perso)} status={getStatus(totals.perso)} />
            <StepBox name="Lasering" value={formatStep(totals.lasering)} status={getStatus(totals.lasering)} />
            <StepBox name="Packaging" value={formatStep(totals.packaging)} status={getStatus(totals.packaging)} />
            <StepBox name="Cartons" value={formatStep(totals.cartons)} status={getStatus(totals.cartons)} />
            <StepBox name="Pallets" value={formatStep(totals.palets)} status={getStatus(totals.palets)} />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <StepBox name="Cards" value={formatStep(totals.cards)} status={getStatus(totals.cards)} />
            <StepBox name="Assembly" value={formatStep(totals.assembly)} status={getStatus(totals.assembly)} />
            <StepBox name="Insolation" value={formatStep(totals.insolation)} status={getStatus(totals.insolation)} />
            <StepBox name="Radiation Freq" value={formatStep(totals.radiation_frequency)} status={getStatus(totals.radiation_frequency)} />
            <StepBox name="Calibration" value={formatStep(totals.calibration)} status={getStatus(totals.calibration)} />
            <StepBox name="Multy test" value={formatStep(totals.multy_test)} status={getStatus(totals.multy_test)} />
            <StepBox name="Metrology" value={formatStep(totals.metrology)} status={getStatus(totals.metrology)} />
            <StepBox name="Perso" value={formatStep(totals.perso)} status={getStatus(totals.perso)} />
          </div>
        )}
      </div>
      
      <div className="mt-8">
        <h4 className="text-sm text-zinc-400 mb-3 font-medium">{t('Detailed Production Table')}</h4>
        <ProductionTable 
          type={division as 'water' | 'electricity'} 
          dynamicWaterData={shiftData}
          dateRangeDisplay={date.includes('to') ? date : undefined}
          date={!date.includes('to') ? date : undefined}
          target={target}
          failersData={failersData}
        />
      </div>
    </div>
  );
}

function StepBox({ name, value, status }: { name: string, value: string, status: 'success' | 'warning' | 'danger' }) {
  const bg = status === 'success' ? 'bg-emerald-500/10 border-emerald-500/20' : 
             status === 'warning' ? 'bg-zinc-800/50 border-zinc-700' : 
             'bg-danger/10 border-danger/20';
  const text = status === 'success' ? 'text-emerald-400' : 
               status === 'warning' ? 'text-zinc-400' : 
               'text-danger';
  
  return (
    <div className={clsx("p-4 rounded-xl border flex flex-col items-center justify-center text-center", bg)}>
      <p className={clsx("text-sm mb-1 font-medium", text)}>{name}</p>
      <p className="text-xl text-white font-bold">{value}</p>
    </div>
  );
}

function WeeklyReport({ dbData, division, year, month, target }: { dbData: any[], division: string, year: string, month: string, target: number }) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const isWater = division === 'water';
  const getDailyTotal = (d: any) => isWater ? (d.packaging || 0) : (d.multy_test || 0);
  
  const data = [0, 0, 0, 0];
  dbData.forEach(d => {
    if (d.date) {
      const dt = new Date(d.date);
      if (dt.getFullYear().toString() === year && dt.getMonth().toString() === month) {
        const day = dt.getDate();
        if (day <= 7) data[0] += getDailyTotal(d);
        else if (day <= 14) data[1] += getDailyTotal(d);
        else if (day <= 21) data[2] += getDailyTotal(d);
        else data[3] += getDailyTotal(d);
      }
    }
  });

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = months[parseInt(month)];

  const options = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: ['Week 1 (1-7)', 'Week 2 (8-14)', 'Week 3 (15-21)', 'Week 4 (22+)'], axisLabel: { color: isLight ? '#475569' : '#a1a1aa' } },
    yAxis: { type: 'value', axisLabel: { color: isLight ? '#475569' : '#a1a1aa' }, splitLine: { lineStyle: { color: isLight ? '#E2E8F0' : '#27272a' } } },
    series: [
      {
        type: 'bar',
        data: data,
        label: { show: true, position: 'top', color: isLight ? '#173B63' : '#fff', fontWeight: 'bold' },
        itemStyle: { color: isLight ? '#0F766E' : '#3b82f6', borderRadius: [4, 4, 0, 0] }
      }
    ]
  };

  const numDays = new Date(parseInt(year), parseInt(month) + 1, 0).getDate();
  const monthDates = Array.from({ length: numDays }, (_, i) => {
    const d = new Date(parseInt(year), parseInt(month), i + 1);
    const offset = d.getTimezoneOffset();
    const adjustedDate = new Date(d.getTime() - (offset * 60 * 1000));
    return {
      dateStr: adjustedDate.toISOString().split('T')[0],
      dayName: d.toLocaleDateString('en-US', { weekday: 'long' }),
      formattedDate: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-')
    };
  });

  const getStatusColor = (percentage: number) => {
    if (percentage >= 98) return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
    if (percentage >= 90) return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
    return 'text-danger bg-danger/10 border-danger/20';
  };

  const getStatusDot = (percentage: number) => {
    if (percentage >= 98) return '🟢';
    if (percentage >= 90) return '🟡';
    return '🔴';
  };

  const getStepDataForDate = (dateStr: string, stepId: string) => {
    let shift1 = 0, shift2 = 0, shift3 = 0, official = 0, failer = 0;
    dbData.forEach(d => {
      if (d.date === dateStr) {
        const val = d[stepId] || 0;
        if (d.shift === 'shift1') shift1 += val;
        else if (d.shift === 'shift2') shift2 += val;
        else if (d.shift === 'shift3') shift3 += val;
        else official += val;

        if (d.failers) {
          let f = d.failers;
          if (typeof f === 'string') { try { f = JSON.parse(f); } catch (e) {} }
          if (f && f[stepId]) failer += (f[stepId] || 0);
        }
      }
    });
    const total = shift1 + shift2 + shift3 + official;
    const stepTarget = stepId === 'cartons' ? Math.round(target / 10) : (stepId === 'palets' ? 1 : target);
    const percentage = stepTarget > 0 ? Number(((total / stepTarget) * 100).toFixed(1)) : 0;
    return { target: stepTarget, total, shift1: shift1 + official, shift2, shift3, failer, percentage };
  };

  const getNoteForDate = (dateStr: string) => {
    let noteStr = '';
    dbData.forEach(d => {
      if (d.date === dateStr && d.failers) {
        let f = d.failers;
        if (typeof f === 'string') { try { f = JSON.parse(f); } catch (e) {} }
        if (f && f.note) noteStr += (noteStr ? '\n' : '') + f.note;
      }
    });
    return noteStr;
  };

  const steps = isWater ? [
    { id: 'assembly', label: 'Assembly' },
    { id: 'perso', label: 'Perso' },
    { id: 'lasering', label: 'Lasering' },
    { id: 'packaging', label: 'Packaging' },
    { id: 'cartons', label: 'Cartons' },
    { id: 'palets', label: 'Palets' },
  ] : [
    { id: 'assembly', label: 'Assembly' },
    { id: 'insolation', label: 'Insolation' },
    { id: 'radiation_frequency', label: 'Radiation Frequency' },
    { id: 'calibration', label: 'Calibration' },
    { id: 'multy_test', label: 'Multy test' },
    { id: 'metrology', label: 'Metrology' },
    { id: 'perso', label: 'Perso' },
    { id: 'cards', label: 'Cards' },
  ];

  const thBase = "py-1.5 px-2 text-xs font-semibold border-r text-center whitespace-nowrap";
  const tdBase = "py-1 px-2 text-[13px] font-medium border-r text-center whitespace-nowrap";
  const borderClass = "border-zinc-800";

  return (
    <div className="flex flex-col gap-8 h-full">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">{t('Weekly Production')} - {monthName} {year}</h3>
        <ReactECharts option={options} style={{ height: '300px' }} />
      </div>

      <div className="flex-1 min-h-0">
        <h4 className="text-sm text-zinc-400 mb-3 font-medium">{t('Detailed Production Table (Horizontal Scroll)')}</h4>
        <div className="w-full overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 custom-scrollbar pb-2">
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50">
                <th className="py-2 px-3 text-sm font-bold text-white sticky left-0 z-30 border-r border-zinc-800 bg-zinc-900">
                  Day
                </th>
                {monthDates.map(d => {
                  const isWeekend = d.dayName === 'Friday' || d.dayName === 'Saturday';
                  return (
                    <th key={`day-${d.dateStr}`} colSpan={7} className={clsx(
                      "py-2 px-3 text-sm font-semibold text-white text-center border-r-[3px] border-r-white/80",
                      isWeekend && "bg-zinc-800/60"
                    )}>
                      {d.dayName}
                    </th>
                  );
                })}
              </tr>
              <tr className="border-b border-zinc-800 bg-zinc-900/50">
                <th className="py-1.5 px-3 text-sm font-bold text-zinc-300 sticky left-0 z-30 border-r border-zinc-800 bg-zinc-900">
                  Date
                </th>
                {monthDates.map(d => {
                  const isWeekend = d.dayName === 'Friday' || d.dayName === 'Saturday';
                  return (
                    <th key={`date-${d.dateStr}`} colSpan={7} className={clsx(
                      "py-1.5 px-3 text-xs font-semibold text-zinc-300 text-center border-r-[3px] border-r-white/80",
                      isWeekend && "bg-zinc-800/60"
                    )}>
                      {d.formattedDate}
                    </th>
                  );
                })}
              </tr>
              <tr className="border-b border-zinc-800 bg-zinc-900/40">
                <th className="py-1.5 px-3 text-sm font-bold text-zinc-300 sticky left-0 z-30 border-r border-zinc-800 bg-zinc-900">
                  Note
                </th>
                {monthDates.map(d => {
                  const isWeekend = d.dayName === 'Friday' || d.dayName === 'Saturday';
                  const note = getNoteForDate(d.dateStr);
                  return (
                    <th key={`note-${d.dateStr}`} colSpan={7} className={clsx(
                      "py-1.5 px-3 text-xs font-medium text-zinc-300 text-center border-r-[3px] border-r-white/80 whitespace-pre-wrap font-normal align-top min-w-[100px]",
                      isWeekend && "bg-zinc-800/60"
                    )}>
                      {note || '-'}
                    </th>
                  );
                })}
              </tr>
              <tr className="border-b border-zinc-800 bg-zinc-900/80">
                <th className="py-1.5 px-3 text-sm font-semibold text-zinc-200 sticky left-0 z-30 border-r border-zinc-800 bg-zinc-900">
                  Step
                </th>
                {monthDates.map(d => {
                  const isWeekend = d.dayName === 'Friday' || d.dayName === 'Saturday';
                  const bgClass = isWeekend ? "bg-zinc-800/60" : "";
                  return (
                    <React.Fragment key={`headers-${d.dateStr}`}>
                      <th className={clsx(thBase, borderClass, bgClass, "text-zinc-400")}>Target</th>
                      <th className={clsx(thBase, borderClass, bgClass, "text-white")}>Total</th>
                      <th className={clsx(thBase, borderClass, bgClass, "text-zinc-400")}>Shift 1</th>
                      <th className={clsx(thBase, borderClass, bgClass, "text-zinc-400")}>Shift 2</th>
                      <th className={clsx(thBase, borderClass, bgClass, "text-zinc-400")}>Shift 3</th>
                      <th className={clsx(thBase, borderClass, bgClass, "text-red-400/80")}>Failer</th>
                      <th className={clsx(thBase, bgClass, "text-zinc-300 border-r-[3px] border-r-white/80")}>%</th>
                    </React.Fragment>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {steps.map(step => (
                <tr key={step.id} className="hover:bg-zinc-800/30 transition-colors bg-zinc-900/10">
                  <td className="py-1.5 px-3 text-[13px] font-medium text-zinc-200 sticky left-0 z-20 border-r border-zinc-800 bg-zinc-900 whitespace-nowrap min-w-[130px]">
                    <div className="flex items-center gap-2 h-full">
                      <span className="text-[9px]">
                        {(() => {
                          let totalSum = 0; let targetSum = 0;
                          monthDates.forEach(d => {
                            const data = getStepDataForDate(d.dateStr, step.id);
                            totalSum += data.total; targetSum += data.target;
                          });
                          const avg = targetSum > 0 ? (totalSum / targetSum) * 100 : 0;
                          return getStatusDot(avg);
                        })()}
                      </span>
                      {step.label}
                    </div>
                  </td>
                  {monthDates.map(d => {
                    const data = getStepDataForDate(d.dateStr, step.id);
                    const isWeekend = d.dayName === 'Friday' || d.dayName === 'Saturday';
                    const bgClass = isWeekend ? "bg-zinc-800/40" : "";
                    const totalBg = isWeekend ? "bg-zinc-700/40" : "bg-zinc-800/20";
                    return (
                      <React.Fragment key={`${step.id}-${d.dateStr}`}>
                        <td className={clsx(tdBase, borderClass, bgClass, "text-zinc-400")}>{data.target}</td>
                        <td className={clsx(tdBase, borderClass, totalBg, "text-white font-bold")}>{data.total}</td>
                        <td className={clsx(tdBase, borderClass, bgClass, "text-zinc-400")}>{data.shift1}</td>
                        <td className={clsx(tdBase, borderClass, bgClass, "text-zinc-400")}>{data.shift2}</td>
                        <td className={clsx(tdBase, borderClass, bgClass, "text-zinc-400")}>{data.shift3}</td>
                        <td className={clsx(tdBase, borderClass, bgClass, "text-red-400/80")}>{data.failer}</td>
                        <td className={clsx(tdBase, bgClass, "border-r-[3px] border-r-white/80")}>
                          <span className={clsx(
                            "inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-medium border",
                            getStatusColor(data.percentage)
                          )}>
                            {data.percentage}%
                          </span>
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MonthlyReport({ dbData, division, year, target }: { dbData: any[], division: string, year: string, target: number }) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const isWater = division === 'water';
  const getDailyTotal = (d: any) => isWater ? (d.packaging || 0) : (d.multy_test || 0);
  
  const data = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  dbData.forEach(d => {
    if (d.date && new Date(d.date).getFullYear().toString() === year) {
      const monthIndex = new Date(d.date).getMonth();
      data[monthIndex] += getDailyTotal(d);
    }
  });

  const monthsList = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
  const options = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], axisLabel: { color: isLight ? '#475569' : '#a1a1aa' } },
    yAxis: { type: 'value', axisLabel: { color: isLight ? '#475569' : '#a1a1aa' }, splitLine: { lineStyle: { color: isLight ? '#E2E8F0' : '#27272a' } } },
    series: [{ type: 'line', data: data, label: { show: true, position: 'top', color: isLight ? '#173B63' : '#fff', fontWeight: 'bold' }, itemStyle: { color: isLight ? '#14B8A6' : '#00a99d' }, smooth: true, areaStyle: { opacity: 0.2 } }]
  };

  const getStatusColor = (percentage: number) => {
    if (percentage >= 98) return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
    if (percentage >= 90) return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
    return 'text-danger bg-danger/10 border-danger/20';
  };

  const getStatusDot = (percentage: number) => {
    if (percentage >= 98) return '🟢';
    if (percentage >= 90) return '🟡';
    return '🔴';
  };

  const getStepDataForMonth = (monthIndex: number, stepId: string) => {
    let shift1 = 0, shift2 = 0, shift3 = 0, official = 0, failer = 0;
    const monthData = dbData.filter(d => {
      if (!d.date) return false;
      const dt = new Date(d.date);
      return dt.getFullYear().toString() === year && dt.getMonth() === monthIndex;
    });

    monthData.forEach(d => {
      const val = d[stepId] || 0;
      if (d.shift === 'shift1') shift1 += val;
      else if (d.shift === 'shift2') shift2 += val;
      else if (d.shift === 'shift3') shift3 += val;
      else official += val;

      if (d.failers) {
        let f = d.failers;
        if (typeof f === 'string') { try { f = JSON.parse(f); } catch (e) {} }
        if (f && f[stepId]) failer += (f[stepId] || 0);
      }
    });

    const total = shift1 + shift2 + shift3 + official;
    const daysInMonth = new Date(parseInt(year), monthIndex + 1, 0).getDate();
    const dailyStepTarget = stepId === 'cartons' ? Math.round(target / 10) : (stepId === 'palets' ? 1 : target);
    const stepTarget = dailyStepTarget * daysInMonth; 

    const percentage = stepTarget > 0 ? Number(((total / stepTarget) * 100).toFixed(1)) : 0;
    return { target: stepTarget, total, shift1: shift1 + official, shift2, shift3, failer, percentage };
  };

  const steps = isWater ? [
    { id: 'assembly', label: 'Assembly' },
    { id: 'perso', label: 'Perso' },
    { id: 'lasering', label: 'Lasering' },
    { id: 'packaging', label: 'Packaging' },
    { id: 'cartons', label: 'Cartons' },
    { id: 'palets', label: 'Palets' },
  ] : [
    { id: 'assembly', label: 'Assembly' },
    { id: 'insolation', label: 'Insolation' },
    { id: 'radiation_frequency', label: 'Radiation Frequency' },
    { id: 'calibration', label: 'Calibration' },
    { id: 'multy_test', label: 'Multy test' },
    { id: 'metrology', label: 'Metrology' },
    { id: 'perso', label: 'Perso' },
    { id: 'cards', label: 'Cards' },
  ];

  const thBase = "py-1.5 px-2 text-xs font-semibold border-r text-center whitespace-nowrap";
  const tdBase = "py-1 px-2 text-[13px] font-medium border-r text-center whitespace-nowrap";
  const borderClass = "border-zinc-800";

  return (
    <div className="flex flex-col gap-8 h-full">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">{t('Monthly Production')} - {year}</h3>
        <ReactECharts option={options} style={{ height: '300px' }} />
      </div>

      <div className="flex-1 min-h-0">
        <h4 className="text-sm text-zinc-400 mb-3 font-medium">{t('Detailed Monthly Table (Horizontal Scroll)')}</h4>
        <div className="w-full overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 custom-scrollbar pb-2">
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50">
                <th className="py-2 px-3 text-sm font-bold text-white sticky left-0 z-30 border-r border-zinc-800 bg-zinc-900">
                  Month
                </th>
                {monthsList.map((monthName, i) => (
                  <th key={`month-${i}`} colSpan={7} className="py-2 px-3 text-sm font-semibold text-white text-center border-r-[3px] border-r-white/80">
                    {monthName}
                  </th>
                ))}
              </tr>
              <tr className="border-b border-zinc-800 bg-zinc-900/80">
                <th className="py-1.5 px-3 text-sm font-semibold text-zinc-200 sticky left-0 z-30 border-r border-zinc-800 bg-zinc-900">
                  Step
                </th>
                {monthsList.map((_, i) => (
                  <React.Fragment key={`headers-${i}`}>
                    <th className={`${thBase} ${borderClass} text-zinc-400`}>Target</th>
                    <th className={`${thBase} ${borderClass} text-white`}>Total</th>
                    <th className={`${thBase} ${borderClass} text-zinc-400`}>Shift 1</th>
                    <th className={`${thBase} ${borderClass} text-zinc-400`}>Shift 2</th>
                    <th className={`${thBase} ${borderClass} text-zinc-400`}>Shift 3</th>
                    <th className={`${thBase} ${borderClass} text-red-400/80`}>Failer</th>
                    <th className={`${thBase} text-zinc-300 border-r-[3px] border-r-white/80`}>%</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {steps.map(step => (
                <tr key={step.id} className="hover:bg-zinc-800/30 transition-colors bg-zinc-900/10">
                  <td className="py-1.5 px-3 text-[13px] font-medium text-zinc-200 sticky left-0 z-20 border-r border-zinc-800 bg-zinc-900 whitespace-nowrap min-w-[130px]">
                    <div className="flex items-center gap-2 h-full">
                      <span className="text-[9px]">
                        {(() => {
                          let totalSum = 0; let targetSum = 0;
                          monthsList.forEach((_, i) => {
                            const data = getStepDataForMonth(i, step.id);
                            totalSum += data.total; targetSum += data.target;
                          });
                          const avg = targetSum > 0 ? (totalSum / targetSum) * 100 : 0;
                          return getStatusDot(avg);
                        })()}
                      </span>
                      {step.label}
                    </div>
                  </td>
                  {monthsList.map((_, i) => {
                    const data = getStepDataForMonth(i, step.id);
                    return (
                      <React.Fragment key={`${step.id}-${i}`}>
                        <td className={`${tdBase} ${borderClass} text-zinc-400`}>{data.target}</td>
                        <td className={`${tdBase} ${borderClass} bg-zinc-800/20 text-white font-bold`}>{data.total}</td>
                        <td className={`${tdBase} ${borderClass} text-zinc-400`}>{data.shift1}</td>
                        <td className={`${tdBase} ${borderClass} text-zinc-400`}>{data.shift2}</td>
                        <td className={`${tdBase} ${borderClass} text-zinc-400`}>{data.shift3}</td>
                        <td className={`${tdBase} ${borderClass} text-red-400/80`}>{data.failer}</td>
                        <td className={`${tdBase} border-r-[3px] border-r-white/80`}>
                          <span className={clsx(
                            "inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-medium border",
                            getStatusColor(data.percentage)
                          )}>
                            {data.percentage}%
                          </span>
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function YearlyReport({ dbData, division }: { dbData: any[], division: string }) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const isWater = division === 'water';
  const getDailyTotal = (d: any) => isWater ? (d.packaging || 0) : (d.multy_test || 0);

  const startYear = isWater ? 2025 : 2023;
  const numYears = 5;
  const data = Array(numYears).fill(0);
  const yearsLabels = Array.from({ length: numYears }, (_, i) => (startYear + i).toString());

  dbData.forEach(d => {
    if (d.date) {
      const year = new Date(d.date).getFullYear();
      const index = year - startYear;
      if (index >= 0 && index < numYears) {
        data[index] += getDailyTotal(d);
      }
    }
  });

  const options = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: yearsLabels, axisLabel: { color: isLight ? '#475569' : '#a1a1aa' } },
    yAxis: { type: 'value', axisLabel: { color: isLight ? '#475569' : '#a1a1aa' }, splitLine: { lineStyle: { color: isLight ? '#E2E8F0' : '#27272a' } } },
    series: [{ type: 'bar', data: data, label: { show: true, position: 'top', color: isLight ? '#173B63' : '#fff', fontWeight: 'bold' }, itemStyle: { color: isLight ? '#14B8A6' : '#00a99d', borderRadius: [4, 4, 0, 0] } }]
  };
  return <div className="h-full"><h3 className="text-lg font-semibold text-white mb-4">{t('Yearly Growth')}</h3><ReactECharts option={options} style={{ height: '300px' }} /></div>;
}

function StatBox({ label, value, color = "text-white" }: { label: string, value: string | number, color?: string }) {
  return (
    <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
      <p className="text-sm text-zinc-400 mb-1">{label}</p>
      <p className={clsx("text-2xl font-bold", color)}>{value}</p>
    </div>
  );
}
