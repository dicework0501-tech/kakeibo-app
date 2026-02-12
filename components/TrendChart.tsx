
import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  LabelList
} from 'recharts';
import { MonthlyRecord } from '../types';
import { getColor } from '../constants';
import { Calendar } from 'lucide-react';

interface Props {
  records: MonthlyRecord[];
}

type RangeType = '6m' | '1y' | '2y' | 'custom';

const TrendChart: React.FC<Props> = ({ records }) => {
  const [rangeType, setRangeType] = useState<RangeType>('6m');
  
  const now = new Date();
  const [customStart, setCustomStart] = useState({ year: now.getFullYear(), month: 1 });
  const [customEnd, setCustomEnd] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });

  const filteredData = useMemo(() => {
    let sorted = [...records].sort((a, b) => (a.year * 12 + a.month) - (b.year * 12 + b.month));
    
    const nowValue = now.getFullYear() * 12 + (now.getMonth() + 1);
    let startValue = 0;
    let endValue = nowValue;

    if (rangeType === '6m') {
      startValue = nowValue - 5;
    } else if (rangeType === '1y') {
      startValue = nowValue - 11;
    } else if (rangeType === '2y') {
      startValue = nowValue - 23;
    } else {
      startValue = customStart.year * 12 + customStart.month;
      endValue = customEnd.year * 12 + customEnd.month;
    }

    const filtered = sorted.filter(r => {
      const val = r.year * 12 + r.month;
      return val >= startValue && val <= endValue;
    });

    // Transform for Stacked Bar Chart
    return filtered.map(r => {
      const entry: any = { name: `${r.year}/${r.month}` };
      let total = 0;
      r.assets.forEach(asset => {
        entry[asset.label] = asset.amount;
        total += asset.amount;
      });
      entry.total = total;
      entry.dummy = 0; // 0-height bar for label positioning
      return entry;
    });
  }, [records, rangeType, customStart, customEnd]);

  const assetLabels = useMemo(() => {
    const totals: Record<string, number> = {};
    records.forEach(r => {
      r.assets.forEach(a => {
        const amt = a.amount ?? 0;
        totals[a.label] = (totals[a.label] ?? 0) + amt;
      });
    });
    const labels = Object.keys(totals);
    return labels.sort((a, b) => (totals[b] ?? 0) - (totals[a] ?? 0));
  }, [records]);

  const years = Array.from({ length: 10 }, (_, i) => now.getFullYear() - 5 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const selectClasses = "text-[11px] font-black border border-slate-200 bg-slate-50 rounded-lg px-2 py-1 outline-none cursor-pointer text-slate-900 hover:border-blue-300 transition-colors appearance-none";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex bg-slate-100 p-1 rounded-xl">
          {(['6m', '1y', '2y', 'custom'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setRangeType(type)}
              className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
                rangeType === type 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {type === '6m' ? '6ヶ月' : type === '1y' ? '1年' : type === '2y' ? '2年' : 'カスタム'}
            </button>
          ))}
        </div>

        {rangeType === 'custom' && (
          <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 px-2 border-r border-slate-100 mr-1">
              <Calendar size={14} className="text-blue-500" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Period</span>
            </div>
            <div className="flex items-center gap-1">
              <select 
                value={customStart.year} 
                onChange={e => setCustomStart(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                className={selectClasses}
              >
                {years.map(y => <option key={y} value={y} className="bg-white text-slate-900">{y}年</option>)}
              </select>
              <select 
                value={customStart.month} 
                onChange={e => setCustomStart(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                className={selectClasses}
              >
                {months.map(m => <option key={m} value={m} className="bg-white text-slate-900">{m}月</option>)}
              </select>
            </div>
            <span className="text-slate-300 mx-1 font-bold">~</span>
            <div className="flex items-center gap-1">
              <select 
                value={customEnd.year} 
                onChange={e => setCustomEnd(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                className={selectClasses}
              >
                {years.map(y => <option key={y} value={y} className="bg-white text-slate-900">{y}年</option>)}
              </select>
              <select 
                value={customEnd.month} 
                onChange={e => setCustomEnd(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                className={selectClasses}
              >
                {months.map(m => <option key={m} value={m} className="bg-white text-slate-900">{m}月</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={filteredData} margin={{ top: 25, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="name" 
              fontSize={11} 
              tickLine={false} 
              axisLine={false} 
              tick={{ fill: '#94a3b8', fontWeight: 600 }}
              dy={10}
            />
            <YAxis 
              fontSize={11} 
              tickLine={false} 
              axisLine={false} 
              tick={{ fill: '#94a3b8', fontWeight: 600 }}
              tickFormatter={(val) => `¥${(val / 10000).toLocaleString()}万`}
            />
            <Tooltip 
              cursor={{ fill: '#f8fafc' }}
              contentStyle={{ 
                borderRadius: '16px', 
                border: 'none', 
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                padding: '12px'
              }}
              formatter={(val: number) => `¥${val.toLocaleString()}`}
              itemStyle={{ fontSize: '12px', fontWeight: 700, padding: '2px 0' }}
              labelStyle={{ fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              iconType="circle"
              payload={assetLabels.map(label => ({
                value: label,
                type: 'circle',
                id: label,
                color: getColor(label)
              }))}
              formatter={(value: string) => <span className="text-[10px] font-bold text-slate-500">{value}</span>}
            />
            {assetLabels.map((label) => (
              <Bar 
                key={label} 
                dataKey={label} 
                stackId="a" 
                fill={getColor(label)} 
                radius={[0, 0, 0, 0]} 
              />
            ))}
            <Bar dataKey="dummy" stackId="a" fill="transparent" isAnimationActive={false} legendType="none">
               <LabelList 
                 dataKey="total" 
                 position="top" 
                 formatter={(val: number) => val > 0 ? `¥${(val / 10000).toFixed(0)}万` : ''} 
                 style={{ fill: '#64748b', fontSize: '11px', fontWeight: '800' }}
                 offset={8}
               />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TrendChart;
