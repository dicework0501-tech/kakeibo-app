
import React, { useState, useMemo } from 'react';
import { Target, Plus, Trash2, Pencil, Check, X, Wallet } from 'lucide-react';
import { AppState, PurposeSavingsGoal, DetailItem, MonthlyRecord } from '../types';

const generateId = () => Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

const PAST_PERIOD_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: '過去1ヶ月分（先月）' },
  { value: 3, label: '過去3ヶ月分' },
  { value: 6, label: '過去6ヶ月分' },
  { value: 12, label: '過去1年分' },
  { value: 24, label: '過去2年分' }
];

const RATE_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7]; // 年率%

function getLabelKey(parentLabel: string, subLabel?: string): string {
  return subLabel === undefined ? parentLabel : `${parentLabel}/${subLabel}`;
}

/** 資産1行の合計。収支・資産管理では親の amount が内訳合計と同期しているため、親の amount のみ使う（内訳を足すと二重計上になる） */
function getAssetTotal(item: DetailItem): number {
  return item.amount;
}

interface Props {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

const PurposeSavingsTab: React.FC<Props> = ({ state, setState }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState<Partial<PurposeSavingsGoal> & { name: string; targetAmount: string; targetYear: string; targetMonth: string; assetRates: Record<string, number> }>({
    name: '',
    targetAmount: '',
    targetYear: String(new Date().getFullYear()),
    targetMonth: String(new Date().getMonth() + 1),
    assetIds: [],
    assetRates: {}
  });
  const [pastPeriodByGoal, setPastPeriodByGoal] = useState<Record<string, number>>({});

  const now = new Date();
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth() + 1;

  /** 当月＝収支・資産管理タブでシートが作成されている最新の月 */
  const latestRecord = useMemo(() => {
    if (!state.records.length) return null;
    const sorted = [...state.records].sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month));
    return sorted[0];
  }, [state.records]);

  const availableAssets = useMemo(() => latestRecord?.assets || [], [latestRecord]);

  /** 指定レコードでの選択資産・内訳の合計（id で照合。最新月専用） */
  const getAmountForRecord = (record: MonthlyRecord | null, assetIds: string[]): number => {
    if (!record) return 0;
    let sum = 0;
    for (const asset of record.assets) {
      if (assetIds.includes(asset.id)) {
        sum += getAssetTotal(asset);
      } else {
        for (const sub of asset.subItems || []) {
          if (assetIds.includes(sub.id)) sum += sub.amount;
        }
      }
    }
    return sum;
  };

  /** 選択されている資産・内訳を「ラベル」の一覧に変換（最新月のレコードから取得）。過去月は id が違うためラベルで照合する */
  const getSelectedLabels = (goal: PurposeSavingsGoal): { parentLabel: string; subLabel?: string }[] => {
    if (!latestRecord) return [];
    const out: { parentLabel: string; subLabel?: string }[] = [];
    for (const asset of latestRecord.assets) {
      if (goal.assetIds.includes(asset.id)) {
        out.push({ parentLabel: asset.label, subLabel: undefined });
      } else {
        for (const sub of asset.subItems || []) {
          if (goal.assetIds.includes(sub.id)) out.push({ parentLabel: asset.label, subLabel: sub.label });
        }
      }
    }
    return out;
  };

  /** 指定レコードで、ラベルで指定した資産・内訳の合計（過去月は id が違うためラベル照合で使用） */
  const getAmountForRecordByLabels = (record: MonthlyRecord | null, selectedLabels: { parentLabel: string; subLabel?: string }[]): number => {
    if (!record) return 0;
    let sum = 0;
    for (const { parentLabel, subLabel } of selectedLabels) {
      const asset = record.assets.find(a => a.label === parentLabel);
      if (!asset) continue;
      if (subLabel === undefined) {
        sum += asset.amount;
      } else {
        const sub = (asset.subItems || []).find(s => s.label === subLabel);
        if (sub) sum += sub.amount;
      }
    }
    return sum;
  };

  /** 選択された資産・内訳の合計（最新月） */
  const getCurrentAmount = (goal: PurposeSavingsGoal): number =>
    getAmountForRecord(latestRecord, goal.assetIds);

  /** 達成まであと何ヶ月か。基準は当月（収支・資産管理の最新月） */
  const getMonthsRemaining = (goal: PurposeSavingsGoal): number => {
    const targetVal = goal.targetYear * 12 + goal.targetMonth;
    const currentVal = latestRecord ? latestRecord.year * 12 + latestRecord.month : nowYear * 12 + nowMonth;
    return Math.max(0, targetVal - currentVal);
  };

  /** 選択資産ごとの想定年率の配分加重平均（小数）。現金は0%にすれば反映されない */
  const getWeightedAnnualRate = (goal: PurposeSavingsGoal): number => {
    if (!latestRecord) return goal.annualRate ?? 0;
    let totalAmount = 0;
    let weightedSum = 0;
    for (const asset of latestRecord.assets) {
      if (goal.assetIds.includes(asset.id)) {
        const amt = getAssetTotal(asset);
        const rate = goal.assetRates?.[asset.label] ?? goal.annualRate ?? 0;
        totalAmount += amt;
        weightedSum += amt * rate;
      } else {
        for (const sub of asset.subItems || []) {
          if (goal.assetIds.includes(sub.id)) {
            const amt = sub.amount;
            const key = getLabelKey(asset.label, sub.label);
            const rate = goal.assetRates?.[key] ?? goal.annualRate ?? 0;
            totalAmount += amt;
            weightedSum += amt * rate;
          }
        }
      }
    }
    if (totalAmount <= 0) return goal.annualRate ?? 0;
    return weightedSum / totalAmount;
  };

  /** 利率を反映した必要毎月積立額。年率は配分加重で算出 */
  const getMonthlyNeeded = (goal: PurposeSavingsGoal): number => {
    const current = getCurrentAmount(goal);
    const n = getMonthsRemaining(goal);
    if (n <= 0 || goal.targetAmount <= current) return 0;
    const rate = getWeightedAnnualRate(goal);
    if (rate <= 0) return Math.ceil((goal.targetAmount - current) / n);
    const r = rate / 12;
    const factor = Math.pow(1 + r, n);
    const futureCurrent = current * factor;
    const needFromSavings = goal.targetAmount - futureCurrent;
    if (needFromSavings <= 0) return 0;
    const annuityFactor = (factor - 1) / r;
    return Math.ceil(needFromSavings / annuityFactor);
  };

  /** 過去Nヶ月分の「期首」にあたるレコード（最新の月からNヶ月前の時点）。無い場合はそれ以前で最も新しい月 */
  const getRecordAtStartOfPastNMonths = (n: number): MonthlyRecord | null => {
    if (!latestRecord || n < 1) return null;
    const latestIndex = latestRecord.year * 12 + latestRecord.month;
    const targetIndex = latestIndex - n;
    const candidates = state.records.filter(r => (r.year * 12 + r.month) <= targetIndex);
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month));
    return candidates[0];
  };

  /** 積立増分。当月＝収支・資産管理の最新月。過去月は id が違うためラベルで同じ資産を照合。
   * 計算式: 当月の対象資産額 - Nヶ月前の対象資産額（過去期間の総増分）。月平均は value / actualMonths */
  const getPastAverageMonthly = (goal: PurposeSavingsGoal, pastMonths: number): { value: number; actualMonths: number } | null => {
    if (!latestRecord || pastMonths < 1) return null;
    const pastRecord = getRecordAtStartOfPastNMonths(pastMonths);
    if (!pastRecord) return null;
    const currentAmount = getAmountForRecord(latestRecord, goal.assetIds);
    const selectedLabels = getSelectedLabels(goal);
    const pastAmount = getAmountForRecordByLabels(pastRecord, selectedLabels);
    const latestIndex = latestRecord.year * 12 + latestRecord.month;
    const pastIndex = pastRecord.year * 12 + pastRecord.month;
    const actualMonths = latestIndex - pastIndex;
    if (actualMonths <= 0) return null;
    const totalIncrease = currentAmount - pastAmount;
    const value = totalIncrease / actualMonths;
    return { value, actualMonths };
  };

  const resetForm = () => {
    setForm({
      name: '',
      targetAmount: '',
      targetYear: String(nowYear),
      targetMonth: String(nowMonth),
      assetIds: [],
      assetRates: {}
    });
    setEditingId(null);
    setIsAdding(false);
  };

  const setFormAssetRate = (labelKey: string, percent: number) => {
    setForm(prev => ({ ...prev, assetRates: { ...(prev.assetRates || {}), [labelKey]: percent / 100 } }));
  };

  const saveGoal = () => {
    const name = form.name?.trim();
    const targetAmount = form.targetAmount ? parseInt(form.targetAmount.replace(/\D/g, ''), 10) : 0;
    const targetYear = form.targetYear ? parseInt(form.targetYear, 10) : nowYear;
    const targetMonth = form.targetMonth ? parseInt(form.targetMonth, 10) : nowMonth;
    if (!name || targetAmount <= 0) return;

    const assetRates: Record<string, number> = {};
    if (latestRecord) {
      for (const asset of latestRecord.assets) {
        if ((form.assetIds || []).includes(asset.id)) {
          const v = form.assetRates?.[asset.label];
          assetRates[asset.label] = typeof v === 'number' ? v : 0;
        }
        for (const sub of asset.subItems || []) {
          if ((form.assetIds || []).includes(sub.id)) {
            const key = getLabelKey(asset.label, sub.label);
            const v = form.assetRates?.[key];
            assetRates[key] = typeof v === 'number' ? v : 0;
          }
        }
      }
    }

    const payload = { name, targetAmount, targetYear, targetMonth, assetIds: form.assetIds || [], assetRates };

    if (editingId) {
      setState(prev => ({
        ...prev,
        purposeSavings: prev.purposeSavings.map(g =>
          g.id === editingId ? { ...g, ...payload } : g
        )
      }));
    } else {
      setState(prev => ({
        ...prev,
        purposeSavings: [...prev.purposeSavings, { id: generateId(), ...payload }]
      }));
    }
    resetForm();
  };

  const deleteGoal = (id: string) => {
    if (!window.confirm('この目的を削除しますか？')) return;
    setState(prev => ({ ...prev, purposeSavings: prev.purposeSavings.filter(g => g.id !== id) }));
    resetForm();
  };

  const startEdit = (goal: PurposeSavingsGoal) => {
    setForm({
      name: goal.name,
      targetAmount: String(goal.targetAmount),
      targetYear: String(goal.targetYear),
      targetMonth: String(goal.targetMonth),
      assetIds: [...goal.assetIds],
      assetRates: { ...(goal.assetRates || {}) }
    });
    setEditingId(goal.id);
    setIsAdding(false);
  };

  /** 親資産の子内訳の id 一覧 */
  const getChildIds = (asset: DetailItem): string[] =>
    (asset.subItems || []).map(s => s.id);

  const toggleAsset = (id: string, isParent: boolean) => {
    setForm(prev => {
      const current = prev.assetIds || [];
      const isChecked = current.includes(id);
      if (isChecked) {
        if (isParent) {
          const asset = availableAssets.find(a => a.id === id);
          const childIds = asset ? getChildIds(asset) : [];
          return { ...prev, assetIds: current.filter(x => x !== id && !childIds.includes(x)) };
        }
        return { ...prev, assetIds: current.filter(x => x !== id) };
      }
      if (isParent) {
        const asset = availableAssets.find(a => a.id === id);
        const childIds = asset ? getChildIds(asset) : [];
        return { ...prev, assetIds: current.filter(x => !childIds.includes(x)).concat(id) };
      }
      return { ...prev, assetIds: [...current, id] };
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center"><Target size={20} /></div>
            目的別貯蓄
          </h3>
          {latestRecord && (
            <p className="text-xs text-slate-500 mt-1">当月＝{latestRecord.year}年{latestRecord.month}月（収支・資産管理の最新月）</p>
          )}
        </div>
        {!isAdding && !editingId && (
          <button
            type="button"
            onClick={() => { setIsAdding(true); setForm({ name: '', targetAmount: '', targetYear: String(nowYear), targetMonth: String(nowMonth), assetIds: [], assetRates: {} }); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
          >
            <Plus size={18} /> 目的を追加
          </button>
        )}
      </div>

      {!latestRecord && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center text-amber-800 text-sm font-medium">
          収支・資産管理でいずれかの月のデータを作成すると、ここで資産を選択して目的別に管理できます。
        </div>
      )}

      {(isAdding || editingId) && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
          <h4 className="font-black text-slate-800">{editingId ? '編集' : '新しい目的を追加'}</h4>
          <div className="grid gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">目的名</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="例：老後資金、教育資金"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl font-medium text-slate-800 placeholder:text-slate-400"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">目標金額（円）</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.targetAmount}
                  onChange={e => setForm(f => ({ ...f, targetAmount: e.target.value.replace(/\D/g, '') }))}
                  placeholder="30000000"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl font-medium text-slate-800"
                />
              </div>
              <div className="col-span-2 flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-500 mb-1">目標達成時期</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={form.targetYear}
                      onChange={e => setForm(f => ({ ...f, targetYear: e.target.value }))}
                      placeholder="2030"
                      className="w-24 px-3 py-3 border border-slate-200 rounded-xl font-medium text-slate-800"
                    />
                    <span className="text-slate-500 font-bold self-center">年</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={form.targetMonth}
                      onChange={e => setForm(f => ({ ...f, targetMonth: e.target.value }))}
                      placeholder="12"
                      className="w-16 px-3 py-3 border border-slate-200 rounded-xl font-medium text-slate-800"
                    />
                    <span className="text-slate-500 font-bold self-center">月</span>
                  </div>
                </div>
              </div>
            </div>
            {availableAssets.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">この目的に充てる資産・内訳（資産額から選択）・想定年率</label>
                <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50/50 p-3 max-h-64 overflow-y-auto">
                  {availableAssets.map(asset => {
                    const hasSub = (asset.subItems?.length ?? 0) > 0;
                    const parentChecked = form.assetIds?.includes(asset.id) ?? false;
                    const parentKey = asset.label;
                    const parentRatePercent = Math.round(((form.assetRates || {})[parentKey] ?? 0) * 100);
                    return (
                      <div key={asset.id} className="space-y-1">
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 has-[:checked]:bg-indigo-50">
                          <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={parentChecked}
                              onChange={() => toggleAsset(asset.id, true)}
                              className="rounded border-slate-300 text-indigo-600 shrink-0"
                            />
                            <span className="text-sm font-bold text-slate-700">{asset.label}</span>
                            <span className="text-xs text-slate-500">¥{getAssetTotal(asset).toLocaleString()}</span>
                          </label>
                          <select
                            value={parentRatePercent}
                            onChange={e => setFormAssetRate(parentKey, Number(e.target.value))}
                            onClick={e => e.stopPropagation()}
                            className="w-14 shrink-0 px-1 py-1 rounded border border-slate-200 text-xs font-bold text-slate-700 bg-white"
                          >
                            {RATE_OPTIONS.map(p => (
                              <option key={p} value={p}>年{p}%</option>
                            ))}
                          </select>
                        </div>
                        {hasSub && (asset.subItems || []).map(sub => {
                          const subKey = getLabelKey(asset.label, sub.label);
                          const subRatePercent = Math.round(((form.assetRates || {})[subKey] ?? 0) * 100);
                          return (
                            <div key={sub.id} className="flex items-center gap-2 pl-8 pr-3 py-1.5 rounded-lg hover:bg-slate-100 has-[:checked]:bg-indigo-50">
                              <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={form.assetIds?.includes(sub.id) ?? false}
                                  onChange={() => toggleAsset(sub.id, false)}
                                  className="rounded border-slate-300 text-indigo-600 shrink-0"
                                />
                                <span className="text-sm text-slate-600">{sub.label}</span>
                                <span className="text-xs text-slate-500">¥{sub.amount.toLocaleString()}</span>
                              </label>
                              <select
                                value={subRatePercent}
                                onChange={e => setFormAssetRate(subKey, Number(e.target.value))}
                                onClick={e => e.stopPropagation()}
                                className="w-14 shrink-0 px-1 py-1 rounded border border-slate-200 text-xs font-bold text-slate-700 bg-white"
                              >
                                {RATE_OPTIONS.map(p => (
                                  <option key={p} value={p}>年{p}%</option>
                                ))}
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">現金は0%、投資信託などは想定年率を選ぶと必要積立額に反映されます（配分加重）</p>
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={saveGoal} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700">
              <Check size={16} /> 保存
            </button>
            <button type="button" onClick={resetForm} className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200">
              <X size={16} /> キャンセル
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {state.purposeSavings.length === 0 && !isAdding && (
          <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-4"><Target size={32} /></div>
            <p className="text-slate-500 font-medium mb-2">目的別貯蓄がまだありません</p>
            <p className="text-slate-400 text-sm mb-6">老後資金・教育資金など、目的ごとに現在額と毎月の積立目安を管理できます。</p>
            <button
              type="button"
              onClick={() => { setIsAdding(true); setForm({ name: '', targetAmount: '', targetYear: String(nowYear), targetMonth: String(nowMonth), assetIds: [], assetRates: {} }); }}
              className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700"
            >
              <Plus size={18} /> 目的を追加
            </button>
          </div>
        )}

        {state.purposeSavings.map(goal => {
          const current = getCurrentAmount(goal);
          const monthly = getMonthlyNeeded(goal);
          const monthsLeft = getMonthsRemaining(goal);
          const progress = goal.targetAmount > 0 ? Math.min(100, (current / goal.targetAmount) * 100) : 0;
          const pastMonths = pastPeriodByGoal[goal.id] ?? 3;
          const pastPace = getPastAverageMonthly(goal, pastMonths);
          const pastAverageMonthly = pastPace?.value ?? null;
          const actualMonths = pastPace?.actualMonths ?? 0;
          const isEditing = editingId === goal.id;
          const assetLabels = (() => {
            const list: string[] = [];
            for (const a of availableAssets) {
              if (goal.assetIds.includes(a.id)) {
                list.push(a.label);
              } else {
                for (const sub of a.subItems || []) {
                  if (goal.assetIds.includes(sub.id)) list.push(`${a.label} / ${sub.label}`);
                }
              }
            }
            return list;
          })();

          return (
            <div
              key={goal.id}
              className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h4 className="text-xl font-black text-slate-800">{goal.name}</h4>
                    <p className="text-base font-black text-indigo-600 mt-1">{goal.targetYear}年{goal.targetMonth}月まで</p>
                    {assetLabels.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {assetLabels.map(l => (
                          <span key={l} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold">
                            <Wallet size={10} /> {l}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {!isAdding && !editingId && (
                    <div className="flex gap-1">
                      <button type="button" onClick={() => startEdit(goal)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50">
                        <Pencil size={16} />
                      </button>
                      <button type="button" onClick={() => deleteGoal(goal.id)} className="p-2 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">現在の貯金額</p>
                    <p className="text-2xl font-black text-slate-800">¥{current.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">目標金額</p>
                    <p className="text-2xl font-black text-slate-800">¥{goal.targetAmount.toLocaleString()}</p>
                  </div>
                </div>

                <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-6">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {monthsLeft > 0 && goal.targetAmount > current && (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-stretch gap-6">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">あと{monthsLeft}ヶ月で達成するには</p>
                      <p className="text-3xl font-black text-indigo-700">毎月 ¥{monthly.toLocaleString()}</p>
                      {(getWeightedAnnualRate(goal) > 0) && (
                        <p className="text-sm text-indigo-600/80 mt-1">想定利率: 年率 {(getWeightedAnnualRate(goal) * 100).toFixed(1)}% (配分加重)</p>
                      )}
                      <p className="text-sm text-indigo-600/80 mt-0.5">の積立が目安です</p>
                    </div>
                    <div className="sm:w-px sm:bg-indigo-200/60 shrink-0" />
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">現在の積立ペース</span>
                        <select
                          value={pastMonths}
                          onChange={e => setPastPeriodByGoal(prev => ({ ...prev, [goal.id]: Number(e.target.value) }))}
                          className="px-2.5 py-1 rounded-lg border border-indigo-200 text-xs font-bold text-slate-700 bg-white"
                        >
                          {PAST_PERIOD_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                      <p className="text-[10px] text-indigo-600/90 mb-0.5">(当月 − {(actualMonths || pastMonths) || 1}ヶ月前の対象資産額) ÷ {(actualMonths || pastMonths) || 1}ヶ月</p>
                      {pastAverageMonthly !== null ? (
                        <>
                          <p className="text-2xl font-black text-slate-800">¥{Math.round(pastAverageMonthly).toLocaleString()} <span className="text-base font-bold text-slate-500">/ 月</span></p>
                          {pastAverageMonthly >= monthly ? (
                            <p className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-700 text-sm font-bold w-fit">
                              このペースで達成可能
                            </p>
                          ) : (
                            <p className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-xl bg-rose-100 text-rose-700 text-sm font-bold w-fit">
                              不足: ¥{Math.round(monthly - pastAverageMonthly).toLocaleString()} / 月
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-slate-500">該当期間のデータがありません</p>
                      )}
                    </div>
                  </div>
                )}

                {monthsLeft > 0 && current >= goal.targetAmount && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-700 font-bold text-sm">
                    目標金額に到達しています
                  </div>
                )}
                {monthsLeft <= 0 && current < goal.targetAmount && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-700 font-bold text-sm">
                    目標期日を過ぎています。期日を更新するか目標を見直してください。
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PurposeSavingsTab;
