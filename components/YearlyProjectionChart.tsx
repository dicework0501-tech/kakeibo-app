
import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine
} from 'recharts';
import { MonthlyRecord } from '../types';

function sumDetails(items: { amount?: number }[]): number {
  return items.reduce((s, i) => s + (i.amount ?? 0), 0);
}

export interface YearlyDatum {
  year: number;
  収入: number;
  支出: number;
  貯蓄: number;
  isProjected?: boolean;
}

interface Props {
  records: MonthlyRecord[];
  /** 将来年の想定に使う（未入力なら直近平均で延長） */
  currentAnnualIncomeMan?: number;
  /** 退職後の月額想定（円）。あれば将来年で収入をこれに切り替える年を推定して使用 */
  retirementMonthlyTarget?: number;
  /** 退職想定年（例: 65）。省略時は収入を直近平均のまま延長 */
  retirementAge?: number;
  /** ご本人の現在年齢の中央値（例: 35）。retirementAge と組み合わせて退職年を算出 */
  currentAge?: number;
}

const currentYear = new Date().getFullYear();

/** 想定年別の収支データを算出（実績年 + 将来の投影） */
export function computeYearlyProjection(
  records: MonthlyRecord[],
  options: {
    currentAnnualIncomeMan?: number;
    retirementMonthlyTarget?: number;
    retirementAge?: number;
    currentAge?: number;
  } = {}
): YearlyDatum[] {
  const sorted = [...records].sort((a, b) => (a.year * 12 + a.month) - (b.year * 12 + b.month));
  const byYear: Record<number, { income: number; expense: number; savings: number; count: number }> = {};

  sorted.forEach(r => {
    if (!byYear[r.year]) byYear[r.year] = { income: 0, expense: 0, savings: 0, count: 0 };
    byYear[r.year].income += sumDetails(r.incomeDetails);
    byYear[r.year].expense += sumDetails(r.expenseDetails);
    byYear[r.year].savings += sumDetails(r.savingsDetails);
    byYear[r.year].count += 1;
  });

  const years = Object.keys(byYear).map(Number).sort((a, b) => a - b);
  const data: YearlyDatum[] = years.map(y => ({
    year: y,
    収入: byYear[y].income,
    支出: byYear[y].expense,
    貯蓄: byYear[y].savings,
    isProjected: false
  }));

  if (data.length === 0) {
    const avgIncome = options.currentAnnualIncomeMan != null ? options.currentAnnualIncomeMan * 10000 : 0;
    const avgExpense = avgIncome * 0.7;
    const avgSavings = avgIncome - avgExpense;
    return Array.from({ length: 10 }, (_, i) => ({
      year: currentYear + i,
      収入: avgIncome,
      支出: avgExpense,
      貯蓄: avgSavings,
      isProjected: true
    }));
  }

  const n = sorted.length;
  const avgMonthlyIncome = sorted.reduce((s, r) => s + sumDetails(r.incomeDetails), 0) / n;
  const avgMonthlyExpense = sorted.reduce((s, r) => s + sumDetails(r.expenseDetails), 0) / n;
  const avgMonthlySavings = sorted.reduce((s, r) => s + sumDetails(r.savingsDetails), 0) / n;

  const projectedAnnualIncome = options.currentAnnualIncomeMan != null
    ? options.currentAnnualIncomeMan * 10000
    : avgMonthlyIncome * 12;
  const projectedAnnualExpense = avgMonthlyExpense * 12;
  const projectedAnnualSavings = (options.currentAnnualIncomeMan != null ? projectedAnnualIncome - projectedAnnualExpense : avgMonthlySavings * 12);

  const retirementYear = (options.retirementAge != null && options.currentAge != null)
    ? currentYear + (options.retirementAge - options.currentAge)
    : null;
  const postRetirementIncome = (options.retirementMonthlyTarget ?? 0) * 12;

  const lastYear = data[data.length - 1].year;
  const futureYears = Math.min(15, Math.max(5, 2035 - currentYear));
  for (let i = 1; i <= futureYears; i++) {
    const y = lastYear + i;
    if (y > currentYear + 30) break;
    const isRetired = retirementYear != null && y > retirementYear && postRetirementIncome > 0;
    data.push({
      year: y,
      収入: isRetired ? postRetirementIncome : projectedAnnualIncome,
      支出: projectedAnnualExpense,
      貯蓄: isRetired ? postRetirementIncome - projectedAnnualExpense : projectedAnnualSavings,
      isProjected: true
    });
  }

  return data;
}

const YearlyProjectionChart: React.FC<Props> = ({
  records,
  currentAnnualIncomeMan,
  retirementMonthlyTarget,
  retirementAge,
  currentAge
}) => {
  const data = useMemo(() => computeYearlyProjection(records, {
    currentAnnualIncomeMan,
    retirementMonthlyTarget: retirementMonthlyTarget ? Number(retirementMonthlyTarget) : undefined,
    retirementAge,
    currentAge
  }), [records, currentAnnualIncomeMan, retirementMonthlyTarget, retirementAge, currentAge]);

  const formatY = (v: number) => (v >= 10000 ? `${(v / 10000).toFixed(0)}万` : String(v));

  return (
    <div className="w-full h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 20, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickFormatter={v => `${v}年`}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickFormatter={formatY}
            width={44}
          />
          <Tooltip
            formatter={(value: number, name: string) => [`${(value / 10000).toFixed(1)}万円`, name]}
            labelFormatter={label => `${label}年`}
            contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => v} />
          {data.some(d => d.isProjected) && (
            <ReferenceLine
              x={data.find(d => d.isProjected)?.year ?? currentYear + 1}
              stroke="#94a3b8"
              strokeDasharray="4 4"
              label={{ value: '想定', position: 'top', fontSize: 10, fill: '#64748b' }}
            />
          )}
          <Line type="monotone" dataKey="収入" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="収入" />
          <Line type="monotone" dataKey="支出" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="支出" />
          <Line type="monotone" dataKey="貯蓄" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="貯蓄" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default YearlyProjectionChart;
