'use client';

import { useState, useEffect } from 'react';
import { Edit2, Check, X } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '@/components/layout/ThemeProvider';
import { useLanguage } from '@/components/layout/LanguageProvider';

export function ShiftProductionChart({ data, xAxisData }: { data: number[], xAxisData?: string[] }) {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const options = {
    toolbox: {
      feature: {
        saveAsImage: {
          title: 'Export Image',
          pixelRatio: 2,
          name: 'chart_export',
          backgroundColor: isLight ? '#ffffff' : '#18181b',
          iconStyle: { borderColor: isLight ? '#0F766E' : '#00a99d' }
        }
      }
    },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: xAxisData || ['Shift 1', 'Shift 2', 'Shift 3', 'Official'],
      axisLabel: { color: isLight ? '#475569' : '#00a99d', fontWeight: 600 },
    },
    yAxis: {
      type: 'value',
      axisLabel: { 
        color: isLight ? '#475569' : '#00a99d',
        formatter: function(value: number) { return Math.round(value) + ''; }
      },
      splitLine: { lineStyle: { color: isLight ? '#E2E8F0' : '#27272a' } },
    },
    series: [
      {
        data: data || [0, 0, 0, 0],
        type: 'line',
        label: { 
          show: true, 
          position: 'top', 
          color: isLight ? '#173B63' : '#fff',
          fontWeight: 'bold',
          formatter: function(params: any) { return Math.round(params.value) + ''; }
        },
        smooth: true,
        lineStyle: { width: 3, color: isLight ? '#0F766E' : '#00a99d' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: isLight ? 'rgba(20, 184, 166, 0.28)' : 'rgba(0, 169, 157, 0.45)' },
              { offset: 1, color: 'rgba(0, 169, 157, 0)' }
            ]
          }
        },
        itemStyle: { color: isLight ? '#14B8A6' : '#00a99d' },
      }
    ]
  };

  return <ReactECharts option={options} style={{ height: '300px' }} />;
}

export function TargetVsActualChart({ categories, targetData, actualData }: { categories: string[], targetData: number[], actualData: number[] }) {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const options = {
    toolbox: {
      feature: {
        saveAsImage: {
          title: 'Export Image',
          pixelRatio: 2,
          name: 'chart_export',
          backgroundColor: isLight ? '#ffffff' : '#18181b',
          iconStyle: { borderColor: isLight ? '#0F766E' : '#00a99d' }
        }
      }
    },
    tooltip: { trigger: 'axis' },
    legend: { textStyle: { color: isLight ? '#173B63' : '#00a99d', fontWeight: 600 }, top: 0 },
    xAxis: {
      type: 'category',
      data: categories || [],
      axisLabel: { color: isLight ? '#475569' : '#00a99d', fontWeight: 500 },
    },
    yAxis: {
      type: 'value',
      axisLabel: { 
        color: isLight ? '#475569' : '#00a99d',
        formatter: function(value: number) { return Math.round(value) + ''; }
      },
      splitLine: { lineStyle: { color: isLight ? '#E2E8F0' : '#27272a' } },
    },
    series: [
      {
        name: 'Target',
        type: 'bar',
        data: targetData || [],
        label: { 
          show: true, 
          position: 'top', 
          color: isLight ? '#173B63' : '#fff',
          formatter: function(params: any) { return Math.round(params.value) + ''; }
        },
        itemStyle: { color: isLight ? '#173B63' : '#27272a', borderRadius: [4, 4, 0, 0] },
      },
      {
        name: 'Actual',
        type: 'bar',
        data: actualData || [],
        label: { 
          show: true, 
          position: 'top', 
          color: isLight ? '#0F766E' : '#fff',
          fontWeight: 'bold',
          formatter: function(params: any) { return Math.round(params.value) + ''; }
        },
        itemStyle: { color: isLight ? '#14B8A6' : '#00a99d', borderRadius: [4, 4, 0, 0] },
      }
    ]
  };

  return <ReactECharts option={options} style={{ height: '300px' }} />;
}

export function AchievementGauge({ achieved, target }: { achieved: number, target: number }) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isLight = theme === 'light';
  const [manualMax, setManualMax] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  const autoMax = Math.ceil(Math.max(100, target * 1.2, achieved * 1.2) / 100) * 100;
  const currentMax = manualMax !== null ? manualMax : autoMax;

  const [tempValue, setTempValue] = useState(currentMax.toString());

  useEffect(() => {
    if (!isEditing) {
      setTempValue(currentMax.toString());
    }
  }, [currentMax, isEditing]);

  const handleSave = () => {
    const parsed = parseInt(tempValue);
    if (!isNaN(parsed) && parsed > 0) {
      setManualMax(parsed);
    }
    setIsEditing(false);
  };

  const options = {
    toolbox: {
      feature: {
        saveAsImage: {
          title: 'Export Image',
          pixelRatio: 2,
          name: 'chart_export',
          backgroundColor: isLight ? '#ffffff' : '#18181b',
          iconStyle: { borderColor: isLight ? '#0F766E' : '#00a99d' }
        }
      }
    },
    series: [
      {
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        center: ['50%', '75%'],
        radius: '100%',
        min: 0,
        max: currentMax,
        splitNumber: 10,
        axisLine: {
          lineStyle: {
            width: 15,
            color: [[0.8, '#ef4444'], [0.9, isLight ? '#173B63' : '#1b497f'], [1, isLight ? '#14B8A6' : '#00a99d']],
          }
        },
        pointer: {
          icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
          length: '12%',
          width: 20,
          offsetCenter: [0, '-60%'],
          itemStyle: { color: 'auto' }
        },
        axisTick: { length: 12, lineStyle: { color: 'auto', width: 2 } },
        splitLine: { length: 20, lineStyle: { color: 'auto', width: 5 } },
        axisLabel: { 
          color: isLight ? '#475569' : '#00a99d', 
          distance: -60, 
          fontSize: 13,
          fontWeight: 600,
          formatter: function (value: number) { return Math.round(value) + ''; }
        },
        title: { offsetCenter: [0, '-10%'], textStyle: { fontSize: 14, color: isLight ? '#0F766E' : '#00a99d', fontWeight: 'bold' } },
        detail: { fontSize: 30, offsetCenter: [0, '20%'], valueAnimation: true, formatter: '{value}', color: isLight ? '#173B63' : 'auto' },
        data: [{ value: achieved, name: 'Achieved' }]
      }
    ]
  };

  return (
    <div className="relative">
      <div className="absolute top-0 right-0 z-10">
        {isEditing ? (
          <div className="flex items-center gap-2 bg-zinc-800 p-2 rounded-lg shadow-lg border border-zinc-700">
            <input 
              type="number" 
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              className="w-20 bg-zinc-900 border border-zinc-700 text-white rounded px-2 py-1 text-sm focus:outline-none focus:border-[#00a99d]"
              autoFocus
            />
            <button onClick={handleSave} className="p-1 text-[#00a99d] hover:bg-[#00a99d]/10 rounded"><Check className="w-4 h-4" /></button>
            <button onClick={() => setIsEditing(false)} className="p-1 text-red-400 hover:bg-red-400/10 rounded"><X className="w-4 h-4" /></button>
          </div>
        ) : (
          <button 
            onClick={() => setIsEditing(true)}
            className="p-2 text-zinc-400 hover:text-[#00a99d] hover:bg-[#00a99d]/10 rounded-lg transition-colors"
            title={t('Edit Achievement', 'تعديل الإنجاز')}
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )}
      </div>
      <ReactECharts option={options} style={{ height: '300px' }} />
    </div>
  );
}

export function MonthlyAggregationChart({ dbData, division, year }: { dbData: any[], division: string, year: string }) {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const isWater = division === 'water';
  const data = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  
  dbData.forEach(d => {
    if (d.date && d.date.startsWith(year)) {
      const monthIndex = new Date(d.date).getMonth();
      const val = isWater ? (d.packaging || 0) : (d.multy_test || 0);
      data[monthIndex] += val;
    }
  });

  const options = {
    toolbox: {
      feature: {
        saveAsImage: {
          title: 'Export Image',
          pixelRatio: 2,
          name: 'chart_export',
          backgroundColor: isLight ? '#ffffff' : '#18181b',
          iconStyle: { borderColor: isLight ? '#0F766E' : '#00a99d' }
        }
      }
    },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], axisLabel: { color: isLight ? '#475569' : '#00a99d', fontWeight: 600 } },
    yAxis: { 
      type: 'value', 
      axisLabel: { 
        color: isLight ? '#475569' : '#00a99d',
        formatter: function(value: number) { return Math.round(value) + ''; }
      }, 
      splitLine: { lineStyle: { color: isLight ? '#E2E8F0' : '#27272a' } } 
    },
    series: [{ 
      type: 'bar', 
      data: data, 
      label: { 
        show: true, 
        position: 'top', 
        color: isLight ? '#173B63' : '#fff',
        fontWeight: 'bold',
        formatter: function(params: any) { return Math.round(params.value) + ''; }
      }, 
      itemStyle: { color: isLight ? '#0F766E' : '#3b82f6', borderRadius: [4, 4, 0, 0] } 
    }]
  };

  return <ReactECharts option={options} style={{ height: '400px' }} />;
}

export function YearlyGrowthChart({ dbData, division }: { dbData: any[], division: string }) {
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
    toolbox: {
      feature: {
        saveAsImage: {
          title: 'Export Image',
          pixelRatio: 2,
          name: 'chart_export',
          backgroundColor: isLight ? '#ffffff' : '#18181b',
          iconStyle: { borderColor: isLight ? '#0F766E' : '#00a99d' }
        }
      }
    },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: yearsLabels, axisLabel: { color: isLight ? '#475569' : '#00a99d', fontWeight: 600 } },
    yAxis: { 
      type: 'value', 
      axisLabel: { 
        color: isLight ? '#475569' : '#00a99d',
        formatter: function(value: number) { return Math.round(value) + ''; }
      }, 
      splitLine: { lineStyle: { color: isLight ? '#E2E8F0' : '#27272a' } } 
    },
    series: [{ 
      type: 'bar', 
      data: data, 
      label: { 
        show: true, 
        position: 'top', 
        color: isLight ? '#173B63' : '#fff',
        fontWeight: 'bold',
        formatter: function(params: any) { return Math.round(params.value) + ''; }
      }, 
      itemStyle: { color: isLight ? '#14B8A6' : '#00a99d', borderRadius: [4, 4, 0, 0] } 
    }]
  };
  return <ReactECharts option={options} style={{ height: '300px' }} />;
}
