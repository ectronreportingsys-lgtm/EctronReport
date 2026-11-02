import { createClient } from '@/lib/supabase-server';
import YearlyTable from './YearlyTable';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import T from '@/components/layout/T';

export default async function YearlyProductionPage(props: { params: Promise<{ division: string }> }) {
  const params = await props.params;
  const division = params.division;
  const supabase = await createClient();

  let flatData: any[] = [];

  try {
    const targetTable = division === 'water' ? 'water_daily_production' : division === 'electricity-ecs1100' ? 'electricity_ecs1100_daily_production' : 'electricity_daily_production';
    const { data, error } = await supabase
      .from(targetTable)
      .select('*');

    if (error) throw error;

    if (data && data.length > 0) {
      // Group by date and sum
      const groupedData: Record<string, any> = {};
      
      data.forEach(row => {
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
    }
  } catch (e) {
    console.error('Error fetching yearly production from Supabase:', e);
  }

  // Sort newest first
  flatData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="flex flex-col gap-6 py-6">
      <div className="flex items-center gap-4">
        <Link href={`/${division}/dashboard`} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">
            Yearly Production History - {division === 'water' ? 'Water Siconia' : division === 'electricity-ecs1100' ? 'Electricity ECS1100' : 'Electricity M212'}
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Complete record of daily production for the entire year</p>
        </div>
      </div>

      <YearlyTable data={flatData} division={division} />
    </div>
  );
}
