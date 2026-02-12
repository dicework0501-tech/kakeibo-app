
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  PieChart as PieChartIcon, 
  TrendingUp, 
  Target, 
  Wallet,
  BrainCircuit,
  ChevronLeft,
  ChevronRight,
  ArrowRightLeft,
  Percent,
  TrendingDown,
  Coins,
  Settings,
  KeyRound,
  Cloud,
  CloudOff,
  FileText
} from 'lucide-react';
import { MonthlyRecord, AppState, CloudSettings } from './types';
import { saveState, loadState, exportData, importData, pushToCloud, fetchFromCloud } from './services/storageService';
import { analyzeFinance } from './services/geminiService';
import TrendChart from './components/TrendChart';
import AssetAllocationChart from './components/AssetAllocationChart';
import CashflowTab from './components/CashflowTab';
import PurposeSavingsTab from './components/PurposeSavingsTab';
import FPDiagnosisTab from './components/FPDiagnosisTab';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => loadState());
  const [activeTab, setActiveTab] = useState<'dashboard' | 'cashflow' | 'analysis' | 'purpose' | 'fp' | 'settings'>('dashboard');
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem('GEMINI_API_KEY') || '';
    } catch {
      return '';
    }
  });
  const [geminiModel, setGeminiModel] = useState<string>(() => {
    try {
      return localStorage.getItem('GEMINI_MODEL') || 'gemini-2.0-flash';
    } catch {
      return 'gemini-2.0-flash';
    }
  });
  const [geminiSaveMessage, setGeminiSaveMessage] = useState<string | null>(null);
  /** AIプロバイダー（設定で選択。将来 OpenAI / Claude などを追加可能） */
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openai' | 'claude'>(() => {
    try {
      const v = localStorage.getItem('AI_PROVIDER');
      if (v === 'gemini' || v === 'openai' || v === 'claude') return v;
      return 'gemini';
    } catch {
      return 'gemini';
    }
  });

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  useEffect(() => {
    const initCloud = async () => {
      if (state.cloudSettings?.enabled) {
        setIsSyncing(true);
        const cloudData = await fetchFromCloud(state.cloudSettings);
        if (cloudData) {
          setState(cloudData);
        }
        setIsSyncing(false);
      }
    };
    initCloud();
  }, []);

  useEffect(() => {
    saveState(state);
    const sync = async () => {
      if (state.cloudSettings?.enabled && !isSyncing) {
        await pushToCloud(state);
      }
    };
    sync();
  }, [state]);

  const currentRecord = useMemo(() => {
    return state.records.find(r => r.year === selectedYear && r.month === selectedMonth) || null;
  }, [state.records, selectedYear, selectedMonth]);

  const prevMonthDate = useMemo(() => {
    const d = new Date(selectedYear, selectedMonth - 2, 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }, [selectedYear, selectedMonth]);

  const prevRecord = useMemo(() => {
    return state.records.find(r => r.year === prevMonthDate.year && r.month === prevMonthDate.month) || null;
  }, [state.records, prevMonthDate]);

  const calculateSummary = (record: MonthlyRecord | null) => {
    if (!record) return { totalIncome: 0, totalExpense: 0, totalSavings: 0, totalAssets: 0, balance: 0, savingsRate: 0 };
    const totalIncome = (record.incomeDetails || []).reduce((sum, i) => sum + i.amount, 0);
    const totalExpense = (record.expenseDetails || []).reduce((sum, i) => sum + i.amount, 0);
    const totalSavings = (record.savingsDetails || []).reduce((sum, i) => sum + i.amount, 0);
    const totalAssets = (record.assets || []).reduce((sum, a) => sum + a.amount, 0);
    const balance = totalIncome - totalExpense - totalSavings;
    const savingsRate = totalIncome > 0 ? ((totalSavings + balance) / totalIncome) * 100 : 0;
    return { totalIncome, totalExpense, totalSavings, totalAssets, balance, savingsRate };
  };

  const summary = useMemo(() => calculateSummary(currentRecord), [currentRecord]);
  const prevSummary = useMemo(() => calculateSummary(prevRecord), [prevRecord]);

  const navigateMonth = (direction: number) => {
    if (direction === -1) {
      if (selectedMonth === 1) { setSelectedYear(selectedYear - 1); setSelectedMonth(12); } 
      else { setSelectedMonth(selectedMonth - 1); }
    } else {
      if (selectedMonth === 12) { setSelectedYear(selectedYear + 1); setSelectedMonth(1); } 
      else { setSelectedMonth(selectedMonth + 1); }
    }
  };

  const renderComparison = (current: number, prev: number, isInverse: boolean = false, isPercentUnit: boolean = false) => {
    if (!prevRecord) return (
       <div className="flex items-center gap-1 mt-1.5 h-4">
        <span className="text-[10px] font-black text-rose-500 flex items-center gap-0.5">
          <TrendingDown size={10} /> ¥0
        </span>
      </div>
    );
    const diff = current - prev;
    const isPositiveChange = diff > 0;
    const colorClass = isInverse ? (isPositiveChange ? 'text-rose-500' : 'text-emerald-500') : (isPositiveChange ? 'text-emerald-500' : 'text-rose-500');
    
    const absDiff = Math.abs(diff);
    const sign = isPositiveChange ? '+' : diff < 0 ? '-' : '';
    const percentChange = prev !== 0 ? (diff / Math.abs(prev)) * 100 : 0;
    const formattedPercent = `${isPositiveChange ? '+' : ''}${percentChange.toFixed(1)}%`;

    if (isPercentUnit) {
      // 貯蓄率の場合 (ptと%を表示)
      return (
        <div className={`flex items-center gap-1 mt-1.5 h-4 ${colorClass}`}>
          <span className="text-[10px] font-black flex items-center gap-0.5 whitespace-nowrap">
            {isPositiveChange ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {sign}{absDiff.toFixed(1)}pt ({formattedPercent})
          </span>
        </div>
      );
    } else {
      // 通常の金額の場合 (¥と%を表示)
      return (
        <div className={`flex items-center gap-1 mt-1.5 h-4 ${colorClass}`}>
          <span className="text-[10px] font-black flex items-center gap-0.5 whitespace-nowrap">
            {isPositiveChange ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {sign}¥{absDiff.toLocaleString()} ({formattedPercent})
          </span>
        </div>
      );
    }
  };

  const SummaryCard = ({ title, value, prevValue, isInverse = false, isPercent = false, colorClass, icon: Icon }: any) => (
    <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-50 flex flex-col justify-between hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <span className="text-slate-400 text-[10px] font-black uppercase tracking-wider">{title}</span>
        <div className={`p-1.5 rounded-xl ${colorClass.bg} ${colorClass.text} flex items-center justify-center`}>
          <Icon size={14} strokeWidth={2.5} />
        </div>
      </div>
      <div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-black text-slate-800 tracking-tight">
            {isPercent ? value.toFixed(1) : `¥${value.toLocaleString()}`}
          </span>
          {isPercent && <span className="text-sm font-black text-slate-400">%</span>}
        </div>
        {renderComparison(value, prevValue, isInverse, isPercent)}
      </div>
    </div>
  );

  const navButton = (tab: typeof activeTab, icon: React.ReactNode, label: string, shortLabel: string) => (
    <button
      type="button"
      onClick={() => setActiveTab(tab)}
      className={`flex flex-col items-center justify-center gap-0.5 min-h-[44px] min-w-[44px] flex-1 py-2 px-1 rounded-xl transition-all duration-300 md:flex-row md:justify-start md:gap-3 md:px-4 md:py-3.5 md:rounded-2xl md:min-w-0 md:flex-initial md:text-left ${
        activeTab === tab ? 'bg-blue-600 shadow-lg shadow-blue-500/30 text-white' : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
      }`}
    >
      {icon}
      <span className="text-[10px] font-bold md:text-sm md:font-bold hidden md:inline">{label}</span>
      <span className="text-[10px] font-bold md:hidden">{shortLabel}</span>
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f8fafc]">
      {/* Desktop: Sidebar（md以上で表示） */}
      <nav className="hidden md:flex md:fixed md:left-0 md:top-0 md:w-64 md:h-full bg-[#0f172a] text-white flex-col py-8 z-10 shadow-2xl">
        <div className="px-6 mb-10 text-center w-full">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-2xl mx-auto mb-4 shadow-lg flex items-center justify-center">
            <LayoutDashboard size={24} />
          </div>
          <h1 className="text-xl font-black tracking-tighter italic">Couples Finance</h1>
        </div>
        <div className="flex flex-col w-full px-3 gap-2">
          {navButton('dashboard', <LayoutDashboard size={20} />, 'ダッシュボード', 'ホーム')}
          {navButton('cashflow', <Wallet size={20} />, '収支・資産管理', '収支')}
          {navButton('analysis', <BrainCircuit size={20} />, 'AI資産分析', 'AI')}
          {navButton('purpose', <Target size={20} />, '目的別貯蓄', '目的')}
          {navButton('fp', <FileText size={20} />, 'FP診断', 'FP')}
          {navButton('settings', <Settings size={20} />, '設定', '設定')}
        </div>
      </nav>

      {/* Mobile: ボトムナビ（md未満で表示） */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-[#0f172a] text-white flex items-stretch justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.15)]"
        style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
      >
        {navButton('dashboard', <LayoutDashboard size={22} />, 'ダッシュボード', 'ホーム')}
        {navButton('cashflow', <Wallet size={22} />, '収支・資産管理', '収支')}
        {navButton('analysis', <BrainCircuit size={22} />, 'AI資産分析', 'AI')}
        {navButton('purpose', <Target size={22} />, '目的別貯蓄', '目的')}
        {navButton('fp', <FileText size={22} />, 'FP診断', 'FP')}
        {navButton('settings', <Settings size={22} />, '設定', '設定')}
      </nav>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-10 pb-20 md:pb-10">
        <header className="mb-4 md:mb-6">
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase">
            {activeTab === 'dashboard' ? 'Dashboard' : activeTab === 'cashflow' ? 'Cashflow' : activeTab === 'analysis' ? 'AI Insight' : activeTab === 'purpose' ? '目的別貯蓄' : activeTab === 'fp' ? 'FP診断' : 'Settings'}
          </h2>
        </header>

        {activeTab === 'dashboard' ? (
          <div className="space-y-6 animate-in fade-in duration-700">
            {/* Year/Month Navigation */}
            <div className="flex items-center justify-center gap-4 bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
              <button type="button" onClick={() => navigateMonth(-1)} className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 hover:bg-slate-50 active:bg-slate-100 rounded-full text-slate-400 transition-colors touch-manipulation"><ChevronLeft size={20} /></button>
              <div className="text-center min-w-28 md:min-w-32"><span className="text-lg md:text-xl font-black text-slate-800 tracking-tight">{selectedYear}年 {selectedMonth}月</span></div>
              <button type="button" onClick={() => navigateMonth(1)} className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 hover:bg-slate-50 active:bg-slate-100 rounded-full text-slate-400 transition-colors touch-manipulation"><ChevronRight size={20} /></button>
            </div>

            {/* Summary Grid */}
            <div className="grid grid-cols-2 gap-4">
              <SummaryCard 
                title="総資産額" 
                value={summary.totalAssets} 
                prevValue={prevSummary.totalAssets} 
                icon={TrendingUp} 
                colorClass={{bg: 'bg-slate-50', text: 'text-slate-400'}}
              />
              <SummaryCard 
                title="今月の収入" 
                value={summary.totalIncome} 
                prevValue={prevSummary.totalIncome} 
                icon={Coins} 
                colorClass={{bg: 'bg-emerald-50', text: 'text-emerald-400'}}
              />
              <SummaryCard 
                title="今月の支出" 
                value={summary.totalExpense} 
                prevValue={prevSummary.totalExpense} 
                isInverse={true}
                icon={Wallet} 
                colorClass={{bg: 'bg-rose-50', text: 'text-rose-400'}}
              />
              <SummaryCard 
                title="今月の積立" 
                value={summary.totalSavings} 
                prevValue={prevSummary.totalSavings} 
                icon={Target} 
                colorClass={{bg: 'bg-blue-50', text: 'text-blue-400'}}
              />
              <SummaryCard 
                title="収支(余剰金)" 
                value={summary.balance} 
                prevValue={prevSummary.balance} 
                icon={ArrowRightLeft} 
                colorClass={{bg: 'bg-amber-50', text: 'text-amber-400'}}
              />
              <SummaryCard 
                title="貯蓄率" 
                value={summary.savingsRate} 
                prevValue={prevSummary.savingsRate} 
                isPercent={true}
                icon={Percent} 
                colorClass={{bg: 'bg-indigo-50', text: 'text-indigo-400'}}
              />
            </div>

            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
              <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center"><TrendingUp size={16} /></div>
                資産推移チャート
              </h3>
              <TrendChart records={state.records} />
            </div>

            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
              <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center"><PieChartIcon size={16} /></div>
                今月の資産構成
              </h3>
              <AssetAllocationChart 
                data={currentRecord?.assets || []} 
                prevData={prevRecord?.assets || []} 
              />
            </div>
          </div>
        ) : activeTab === 'cashflow' ? (
          <CashflowTab state={state} setState={setState} selectedYear={selectedYear} setSelectedYear={setSelectedYear} selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} navigateMonth={navigateMonth} />
        ) : activeTab === 'analysis' ? (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white p-4 md:p-10 rounded-2xl md:rounded-[2.5rem] shadow-2xl border border-indigo-100">
               <div className="flex flex-col sm:flex-row items-start gap-4 mb-6 md:mb-10"><div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200 shrink-0"><BrainCircuit size={28} /></div><div className="min-w-0"><h3 className="text-xl md:text-2xl font-black text-slate-900">Gemini AI 金融診断</h3><p className="text-slate-500 font-medium text-sm mt-0.5">ポートフォリオに基づいた最適化アドバイス</p></div></div>
                {isAnalyzing ? (
                  <div className="py-12 md:py-20 flex flex-col items-center justify-center space-y-6"><div className="w-12 h-12 md:w-14 md:h-14 border-[4px] md:border-[6px] border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div><p className="text-indigo-600 font-black tracking-widest uppercase text-xs animate-pulse">診断中...</p></div>
                ) : (
                  <div className="bg-slate-50/50 p-4 md:p-8 rounded-3xl border border-slate-100 diagnosis-result"><div className="prose prose-slate max-w-none text-slate-700 whitespace-pre-wrap leading-relaxed font-medium text-sm md:text-base">{aiAdvice || "最新の収支データに基づいたAIアドバイスを生成します。"}</div></div>
                )}
                <button
                  disabled={isAnalyzing}
                  onClick={async () => {
                    if (isAnalyzing) return;
                    setIsAnalyzing(true);
                    setAiAdvice(await analyzeFinance(state));
                    setIsAnalyzing(false);
                  }}
                  className={`mt-10 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-indigo-200 transition-all flex items-center gap-3 w-full justify-center sm:w-auto ${
                    isAnalyzing ? 'opacity-60 cursor-not-allowed' : 'hover:bg-indigo-700'
                  }`}
                >
                  <TrendingUp size={20} /> 最新データで診断を開始
                </button>
            </div>
          </div>
        ) : activeTab === 'purpose' ? (
          <PurposeSavingsTab state={state} setState={setState} />
        ) : activeTab === 'fp' ? (
          <FPDiagnosisTab state={state} setState={setState} />
        ) : (
          <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-2xl md:rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-4 md:p-8 bg-slate-900 text-white flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shrink-0"><Settings size={24} /></div>
                <div className="min-w-0">
                  <h3 className="text-lg md:text-xl font-black">クラウド同期設定</h3>
                  <p className="text-slate-400 text-xs mt-0.5">夫婦でリアルタイムにデータを共有するための設定です。</p>
                </div>
              </div>
              <div className="p-4 md:p-8 space-y-6">
                {/* クラウド同期 ＝ このブロック全体。Supabase の値入力 → 同期ON */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
                  <p className="text-[11px] font-bold text-slate-500">※ ここが「クラウド同期」の設定です。下の3つを入れてから「同期を有効にする」をONにしてください。</p>
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 mb-1">Supabase URL</label>
                    <input
                      value={state.cloudSettings?.supabaseUrl ?? ''}
                      onChange={(e) => setState(prev => ({ ...prev, cloudSettings: { ...(prev.cloudSettings || { supabaseUrl: '', supabaseKey: '', householdId: '', enabled: false }), supabaseUrl: e.target.value } }))}
                      placeholder="https://xxxx.supabase.co"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 mb-1">API Key（anon のキー）</label>
                    <input
                      type="password"
                      value={state.cloudSettings?.supabaseKey ?? ''}
                      onChange={(e) => setState(prev => ({ ...prev, cloudSettings: { ...(prev.cloudSettings || { supabaseUrl: '', supabaseKey: '', householdId: '', enabled: false }), supabaseKey: e.target.value } }))}
                      placeholder="Supabase の API Keys → anon のキー"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 mb-1">世帯ID（夫婦で同じものを）</label>
                    <input
                      value={state.cloudSettings?.householdId ?? ''}
                      onChange={(e) => setState(prev => ({ ...prev, cloudSettings: { ...(prev.cloudSettings || { supabaseUrl: '', supabaseKey: '', householdId: '', enabled: false }), householdId: e.target.value } }))}
                      placeholder="例: my-house-001"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${state.cloudSettings?.enabled ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                        {state.cloudSettings?.enabled ? <Cloud size={20} /> : <CloudOff size={20} />}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">同期を有効にする</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Real-time Cloud Sync</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setState(prev => ({ ...prev, cloudSettings: { ...(prev.cloudSettings || { supabaseUrl: '', supabaseKey: '', householdId: '', enabled: false }), enabled: !prev.cloudSettings?.enabled } }))}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${state.cloudSettings?.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    >
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${state.cloudSettings?.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
                      <KeyRound size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">AI 設定（資産分析・FP診断）</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Saved in this browser</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 mb-1">AIプロバイダー</label>
                      <select
                        value={aiProvider}
                        onChange={(e) => {
                          const v = e.target.value as 'gemini' | 'openai' | 'claude';
                          setAiProvider(v);
                          try {
                            localStorage.setItem('AI_PROVIDER', v);
                          } catch {}
                        }}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      >
                        <option value="gemini">Google Gemini（利用可能）</option>
                        <option value="openai" disabled>OpenAI（準備中）</option>
                        <option value="claude" disabled>Claude（準備中）</option>
                      </select>
                      <p className="mt-1 text-[10px] text-slate-400 font-bold">
                        現在は Gemini のみ利用可能です。他は今後の対応予定です。
                      </p>
                    </div>

                    {aiProvider === 'gemini' && (
                      <>
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 mb-1">Gemini APIキー</label>
                      <input
                        type="password"
                        value={geminiApiKey}
                        onChange={(e) => setGeminiApiKey(e.target.value)}
                        placeholder="AI Studio で発行した API キーを貼り付け"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                      <p className="mt-1 text-[10px] text-slate-400 font-bold">
                        ※このキーはクラウド同期されず、このブラウザのローカルにのみ保存します。
                      </p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-black text-slate-500 mb-1">モデル</label>
                      <input
                        type="text"
                        value={geminiModel}
                        onChange={(e) => setGeminiModel(e.target.value)}
                        placeholder="gemini-2.0-flash"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <button
                        onClick={() => {
                          try {
                            // よくある貼り付けミス（改行/空白、GEMINI_API_KEY= 付き、引用符）を吸収
                            let key = geminiApiKey.replace(/\s+/g, '').trim();
                            const eqIdx = key.lastIndexOf('=');
                            if (eqIdx !== -1 && /^[A-Z0-9_]+=/i.test(key)) {
                              key = key.slice(eqIdx + 1);
                            }
                            if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
                              key = key.slice(1, -1);
                            }
                            const model = geminiModel.trim() || 'gemini-2.0-flash';
                            if (key) localStorage.setItem('GEMINI_API_KEY', key);
                            else localStorage.removeItem('GEMINI_API_KEY');
                            localStorage.setItem('GEMINI_MODEL', model);
                            setGeminiSaveMessage('保存しました。AI資産分析で「診断を開始」を押してください。');
                          } catch {
                            setGeminiSaveMessage('保存に失敗しました。（ブラウザ設定をご確認ください）');
                          }
                        }}
                        className="bg-indigo-600 text-white px-5 py-3 rounded-xl font-black shadow-sm hover:bg-indigo-700 transition-colors"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => {
                          try {
                            localStorage.removeItem('GEMINI_API_KEY');
                            localStorage.removeItem('GEMINI_MODEL');
                          } catch {}
                          setGeminiApiKey('');
                          setGeminiModel('gemini-2.0-flash');
                          setGeminiSaveMessage('クリアしました。');
                        }}
                        className="bg-white text-slate-700 px-5 py-3 rounded-xl font-black border border-slate-200 hover:bg-slate-50 transition-colors"
                      >
                        クリア
                      </button>
                    </div>

                    {geminiSaveMessage && (
                      <div className="text-[11px] font-bold text-slate-600 bg-white border border-slate-200 rounded-xl px-4 py-3">
                        {geminiSaveMessage}
                      </div>
                    )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
