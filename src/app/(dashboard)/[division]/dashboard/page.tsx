export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase-server';
import MetricsCards from '@/components/dashboard/MetricsCards';
import ProductionTable from '@/components/dashboard/ProductionTable';
import { ShiftProductionChart, TargetVsActualChart, AchievementGauge, MonthlyAggregationChart, YearlyGrowthChart } from '@/components/dashboard/Charts';
import DashboardControls from '@/components/dashboard/DashboardControls';
import YearlyTable from '../yearly-production/YearlyTable';
import TableDateRangePicker from '@/components/dashboard/TableDateRangePicker';
import T from '@/components/layout/T';

export default async function DashboardPage(props: {
  params: Promise<{ division: string }>;
  searchParams: Promise<{ startDate?: string; endDate?: string; mode?: string; year?: string }>;
}) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const division = params.division;
  const targetTable = division === 'water' ? 'water_daily_production' : division === 'electricity-ecs1100' ? 'electricity_ecs1100_daily_production' : 'electricity_daily_production';
  const supabase = await createClient();
  
  let startDate = searchParams.startDate;
  let endDate = searchParams.endDate;

  if (!startDate || !endDate) {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const adjustedDate = new Date(today.getTime() - (offset * 60 * 1000));
    startDate = adjustedDate.toISOString().split('T')[0];
    endDate = startDate;
  }

  let dataForDate: any = null;
  let achieved = 0;
  
  let latestFileName = null;
  let latestFileTime = null;
  let customTarget: number | null = null;
  
  try {
    const { data, error } = await supabase
      .from(targetTable)
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) throw error;
    
    if (data && data.length > 0) {
      dataForDate = {};
      data.forEach(shiftData => {
        const s = shiftData.shift || 'official';
        if (!dataForDate[s]) dataForDate[s] = {};
        
        const fields = ['assembly', 'perso', 'lasering', 'packaging', 'cartons', 'palets', 'cards', 'insolation', 'radiation_frequency', 'calibration', 'multy_test', 'metrology'];
        fields.forEach(f => {
           dataForDate[s][f] = (dataForDate[s][f] || 0) + (shiftData[f] || 0);
        });
        
        if (shiftData.failers) {
          if (!dataForDate[s].failers) dataForDate[s].failers = {};
          Object.keys(shiftData.failers).forEach(fKey => {
            if (fKey === 'note') {
              if (shiftData.failers.note) {
                dataForDate[s].failers.note = dataForDate[s].failers.note ? dataForDate[s].failers.note + '\n' + shiftData.failers.note : shiftData.failers.note;
              }
            } else {
              dataForDate[s].failers[fKey] = (dataForDate[s].failers[fKey] || 0) + (shiftData.failers[fKey] || 0);
            }
          });
        }

        if (division === 'water') {
            achieved += shiftData.packaging || 0;
        } else {
            achieved += shiftData.multy_test || 0;
        }
      });
    }

    const { data: latestFile } = await supabase
      .from('production_history')
      .select('filename, created_at, summary')
      .eq('division', division)
      .eq('date', endDate)
      .order('created_at', { ascending: false })
      .limit(1);

    if (latestFile && latestFile.length > 0) {
      latestFileName = latestFile[0].filename;
      latestFileTime = new Date(latestFile[0].created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      if (latestFile[0].summary?.target) {
        customTarget = latestFile[0].summary.target;
      }
    }
  } catch (e: any) {
    console.error('Error fetching dashboard data from Supabase:', e?.message || e);
  }

  const d1 = new Date(startDate);
  const d2 = new Date(endDate);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive
  
  const target = (customTarget || 640) * diffDays; // Use uploaded target * days
  const remaining = Math.max(0, target - achieved);
  const efficiency = target > 0 ? Number(((achieved / target) * 100).toFixed(1)) : 0;

  const metrics = {
    target,
    achieved,
    achievement: efficiency,
    remaining,
    efficiency,
  };

  const shiftProductionData = [0, 0, 0, 0];
  if (dataForDate) {
    if (dataForDate['shift1']) shiftProductionData[0] = division === 'water' ? (dataForDate['shift1'].packaging || 0) : (dataForDate['shift1'].multy_test || 0);
    if (dataForDate['shift2']) shiftProductionData[1] = division === 'water' ? (dataForDate['shift2'].packaging || 0) : (dataForDate['shift2'].multy_test || 0);
    if (dataForDate['shift3']) shiftProductionData[2] = division === 'water' ? (dataForDate['shift3'].packaging || 0) : (dataForDate['shift3'].multy_test || 0);
    if (dataForDate['official']) shiftProductionData[3] = division === 'water' ? (dataForDate['official'].packaging || 0) : (dataForDate['official'].multy_test || 0);
  }

  let chartCategories: string[] = [];
  let chartTargetData: number[] = [];
  let chartActualData: number[] = [];

  if (division === 'water') {
    chartCategories = ['Assembly', 'Perso', 'Lasering', 'Packaging (Meters)'];
    chartTargetData = [target, target, target, target];
    let actAssembly = 0, actPerso = 0, actLasering = 0, actPackaging = 0;
    if (dataForDate) {
      Object.values(dataForDate).forEach((shiftData: any) => {
        actAssembly += shiftData.assembly || 0;
        actPerso += shiftData.perso || 0;
        actLasering += shiftData.lasering || 0;
        actPackaging += shiftData.packaging || 0;
      });
    }
    chartActualData = [actAssembly, actPerso, actLasering, actPackaging];
  } else {
    chartCategories = ['Assembly', 'Insolation', 'Calibration', 'Multy test', 'Metrology', 'Perso', 'Cards'];
    chartTargetData = Array(7).fill(target); 
    let actAssembly = 0, actInsolation = 0, actCalibration = 0, actMultyTest = 0, actMetrology = 0, actPerso = 0, actCards = 0;
    if (dataForDate) {
      Object.values(dataForDate).forEach((shiftData: any) => {
        actAssembly += shiftData.assembly || 0;
        actInsolation += shiftData.insolation || 0;
        actCalibration += shiftData.calibration || 0;
        actMultyTest += shiftData.multy_test || 0;
        actMetrology += shiftData.metrology || 0;
        actPerso += shiftData.perso || 0;
        actCards += shiftData.cards || 0;
      });
    }
    chartActualData = [actAssembly, actInsolation, actCalibration, actMultyTest, actMetrology, actPerso, actCards];
  }

  let last10ChartData: number[] = [];
  let last10ChartDates: string[] = [];
  
  try {
    const table = division === 'water' ? 'water_daily_production' : division === 'electricity-ecs1100' ? 'electricity_ecs1100_daily_production' : 'electricity_daily_production';
    const field = division === 'water' ? 'packaging' : 'multy_test';
    
    const { data: recentData } = await supabase
      .from(table)
      .select(`date, ${field}`)
      .order('date', { ascending: false })
      .limit(100);
      
    if (recentData) {
      const groupedRecent: Record<string, number> = {};
      recentData.forEach((d: any) => {
        if (d.date) {
          groupedRecent[d.date] = (groupedRecent[d.date] || 0) + (d[field] || 0);
        }
      });
      const sortedDates = Object.keys(groupedRecent).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
      const top10Dates = sortedDates.slice(-10);
      last10ChartDates = top10Dates.map(d => d.slice(5)); // 'MM-DD'
      last10ChartData = top10Dates.map(d => groupedRecent[d]);
    }
  } catch (e) {
    console.error(`Error fetching last 10 days ${division} data:`, e);
  }

  const isWarning = metrics.efficiency < 90;
  const isExcellent = metrics.achieved >= metrics.target;

  const displayDate = startDate === endDate ? new Intl.DateTimeFormat('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(startDate)) : `${startDate} to ${endDate}`;
  
  const mode = searchParams.mode || 'daily';
  const year = searchParams.year || new Date().getFullYear().toString();

  let yearlyData: any[] = [];
  let allData: any[] = [];
  let flatData: any[] = [];
  let yearlyAchieved = 0;
  let yearlyTarget = 0;

  if (mode === 'yearly') {
    const { data: yData } = await supabase
      .from(targetTable)
      .select('*');
      
    allData = yData || [];
    yearlyData = allData.filter(d => d.date && d.date.startsWith(year));
    
    if (allData.length > 0) {
      // Group by date and sum
      const groupedData: Record<string, any> = {};
      
      yearlyData.forEach(row => {
        if (!groupedData[row.date]) {
          if (division === 'water') {
            groupedData[row.date] = { date: row.date, assembly: 0, perso: 0, lasering: 0, packaging: 0, cartons: 0, palets: 0 };
          } else {
            groupedData[row.date] = { date: row.date, cards: 0, assembly: 0, insolation: 0, radiation_frequency: 0, calibration: 0, multy_test: 0, metrology: 0, perso: 0 };
          }
        }
        
        if (division === 'water') {
          groupedData[row.date].assembly += row.assembly || 0;
          groupedData[row.date].perso += row.perso || 0;
          groupedData[row.date].lasering += row.lasering || 0;
          groupedData[row.date].packaging += row.packaging || 0;
          groupedData[row.date].cartons += row.cartons || 0;
          groupedData[row.date].palets += row.palets || 0;
        } else {
          groupedData[row.date].cards += row.cards || 0;
          groupedData[row.date].assembly += row.assembly || 0;
          groupedData[row.date].insolation += row.insolation || 0;
          groupedData[row.date].radiation_frequency += row.radiation_frequency || 0;
          groupedData[row.date].calibration += row.calibration || 0;
          groupedData[row.date].multy_test += row.multy_test || 0;
          groupedData[row.date].metrology += row.metrology || 0;
          groupedData[row.date].perso += row.perso || 0;
        }
      });

      flatData = Object.values(groupedData);
      // Sort newest first
      flatData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      flatData.forEach(row => {
         if (row.date && row.date.startsWith(year)) {
           yearlyAchieved += (division === 'water' ? row.packaging : row.multy_test) || 0;
           yearlyTarget += target;
         }
      });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white print:text-black">
            <T text={division === 'water' ? 'Water Siconia' : division === 'electricity-ecs1100' ? 'Electricity ECS1100' : 'Electricity M212'} /> - {mode === 'daily' ? `${displayDate}` : `${year}`}
          </h1>
          <p className="text-zinc-400 text-sm mt-1"><T text="Real-time overview of smart meters assembly" /></p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <DashboardControls currentMode={mode} currentDate={startDate} currentYear={year} division={division} />
          
          {mode === 'daily' && isWarning && (
            <div className="px-4 py-2 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-danger animate-pulse"></span>
              <T text="Warning: Efficiency below 90%" />
            </div>
          )}
          {mode === 'daily' && isExcellent && (
            <div className="px-4 py-2 rounded-xl bg-[#CCFBF1] dark:bg-[#14B8A6]/15 border border-[#14B8A6]/30 text-[#0F766E] dark:text-[#2DD4BF] text-sm font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#14B8A6] animate-pulse"></span>
              <T text="Excellent: Target Reached!" />
            </div>
          )}
        </div>
      </div>

      {mode === 'daily' ? (
        <>
          <MetricsCards metrics={metrics} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 flex flex-col gap-6">
              <div className="glass rounded-2xl p-6 border border-border">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                  <h3 className="text-lg font-semibold text-white print:text-black"><T text="Production Overview" /></h3>
                  <TableDateRangePicker />
                </div>
                <ProductionTable 
                  type={division as 'water' | 'electricity'} 
                  dynamicWaterData={dataForDate} 
                  failersData={
                    dataForDate 
                      ? Object.values(dataForDate).reduce((acc: any, shift: any) => {
                          if (shift.failers) {
                            Object.keys(shift.failers).forEach(k => {
                              if (k === 'note') {
                                if (shift.failers.note) {
                                  acc.note = acc.note ? acc.note + '\n' + shift.failers.note : shift.failers.note;
                                }
                              } else {
                                acc[k] = (acc[k] || 0) + (shift.failers[k] || 0);
                              }
                            });
                          }
                          return acc;
                        }, {})
                      : {}
                  }
                  dateRangeDisplay={startDate !== endDate ? `${startDate} to ${endDate}` : undefined}
                  date={startDate === endDate ? startDate : undefined}
                  latestFileName={latestFileName}
                  latestFileTime={latestFileTime}
                  target={target}
                />
              </div>
              
              <div className="glass rounded-2xl p-6 border border-border">
                <h3 className="text-lg font-semibold text-white print:text-black mb-6">
                  <T text="Production (Last 10 Days)" />
                </h3>
                <ShiftProductionChart 
                  data={last10ChartData} 
                  xAxisData={last10ChartDates.length > 0 ? last10ChartDates : undefined}
                />
              </div>
            </div>
            
            <div className="flex flex-col gap-6">
              <div className="glass rounded-2xl p-6 border border-border">
                <h3 className="text-lg font-semibold text-white print:text-black mb-6"><T text="Achievement" /></h3>
                <AchievementGauge achieved={metrics.achieved} target={metrics.target} />
              </div>

              <div className="glass rounded-2xl p-6 border border-border">
                <h3 className="text-lg font-semibold text-white print:text-black mb-6"><T text="Target vs Actual" /></h3>
                <TargetVsActualChart categories={chartCategories} targetData={chartTargetData} actualData={chartActualData} />
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="glass rounded-2xl p-6 border border-border lg:col-span-2">
              <h3 className="text-lg font-semibold text-white print:text-black mb-6"><T text="Yearly Aggregation by Month" /> - {year}</h3>
              <MonthlyAggregationChart dbData={yearlyData} division={division} year={year} />
            </div>
            <div className="glass rounded-2xl p-6 border border-border">
              <h3 className="text-lg font-semibold text-white print:text-black mb-6"><T text="Yearly Achievement" /></h3>
              <AchievementGauge achieved={yearlyAchieved} target={yearlyTarget} />
            </div>
          </div>
          
          <div className="glass rounded-2xl p-6 border border-border">
            <h3 className="text-lg font-semibold text-white print:text-black mb-6"><T text="Overall Yearly Growth" /></h3>
            <YearlyGrowthChart dbData={allData} division={division} />
          </div>

          <div className="glass rounded-2xl p-6 border border-border">
            <h3 className="text-lg font-semibold text-white print:text-black mb-6"><T text="Production History" /> - {year}</h3>
            <YearlyTable data={flatData} division={division} />
          </div>
        </div>
      )}
    </div>
  );
}
