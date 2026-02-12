
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { DetailItem } from '../types';
import { getColor } from '../constants';

interface Props {
  data: DetailItem[];
  prevData?: DetailItem[];
}

const AssetAllocationChart: React.FC<Props> = ({ data, prevData = [] }) => {
  const chartData = data
    .filter(item => item.amount > 0)
    .map(item => ({
      name: item.label,
      value: item.amount
    }));

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  if (chartData.length === 0) {
    return <div className="h-72 flex items-center justify-center text-gray-400">資産データがありません</div>;
  }

  const renderCustomizedLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent, name, fill } = props;
    const RADIAN = Math.PI / 180;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const percentText = `${(percent * 100).toFixed(0)}%`;

    const sx = cx + (outerRadius + 5) * cos;
    const sy = cy + (outerRadius + 5) * sin;
    const mx = cx + (outerRadius + 18) * cos;
    const my = cy + (outerRadius + 18) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 12;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';
    const sign = cos >= 0 ? 1 : -1;

    if (percent < 0.03) return null;

    return (
      <g>
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" strokeWidth={1.5} />
        <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
        <text x={ex + sign * 6} y={ey - 4} textAnchor={textAnchor} fill="#1e293b" className="text-[9px] font-black">
          {name}
        </text>
        <text x={ex + sign * 6} y={ey + 6} textAnchor={textAnchor} fill="#64748b" className="text-[10px] font-black">
          {percentText}
        </text>
      </g>
    );
  };

  return (
    <div className="space-y-8">
      <div className="h-80 w-full pb-10">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 24, right: 50, bottom: 56, left: 50 }}>
            <Pie
              data={chartData}
              cx="50%"
              cy="45%"
              innerRadius={52}
              outerRadius={72}
              paddingAngle={3}
              dataKey="value"
              labelLine={false}
              label={renderCustomizedLabel}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.name)} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number, name: string) => {
                const percent = ((value / total) * 100).toFixed(1);
                return [`¥${value.toLocaleString()} (${percent}%)`, name];
              }}
              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold', fontSize: '12px' }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={32}
              wrapperStyle={{ paddingTop: '16px' }}
              iconType="circle"
              formatter={(value: string) => <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* ダッシュボード用の資産リスト */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
        {data.filter(a => a.amount > 0).map(asset => {
          const prevAsset = prevData.find(pa => pa.label === asset.label);
          const diff = asset.amount - (prevAsset?.amount || 0);
          const absDiff = Math.abs(diff);
          const isPositive = diff > 0;
          const isNegative = diff < 0;
          const percentDiff = prevAsset && prevAsset.amount !== 0 ? (diff / prevAsset.amount) * 100 : 0;

          return (
            <div key={asset.id} className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-2 shadow-sm transition-all hover:border-slate-200">
              <div className="flex justify-between items-start">
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] font-black text-slate-400 block uppercase tracking-widest">{asset.label}</span>
                  <span className="text-sm font-black text-slate-800 truncate block">¥{asset.amount.toLocaleString()}</span>
                </div>
                <span className="text-[10px] font-black text-blue-600 bg-blue-100/50 px-2 py-1 rounded-lg ml-2">{total > 0 ? ((asset.amount / total) * 100).toFixed(1) : 0}%</span>
              </div>
              
              <div className="flex items-center gap-1 border-t border-slate-100/50 pt-1.5 mt-0.5">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter opacity-60">前月比:</span>
                <div className={`flex items-center gap-0.5 text-[10px] font-black ${isPositive ? 'text-emerald-500' : isNegative ? 'text-rose-500' : 'text-slate-400'}`}>
                  {isPositive ? <TrendingUp size={10} /> : isNegative ? <TrendingDown size={10} /> : null}
                  <span>
                    {isPositive ? '+' : isNegative ? '-' : ''}¥{absDiff.toLocaleString()}
                    {prevAsset ? ` (${isPositive ? '+' : ''}${percentDiff.toFixed(1)}%)` : ''}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AssetAllocationChart;
