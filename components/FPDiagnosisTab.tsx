
import React, { useState, useMemo } from 'react';
import {
  FileText,
  Users,
  DollarSign,
  Home,
  Briefcase,
  Shield,
  GraduationCap,
  Car,
  Calendar,
  Sparkles,
  Heart,
  TrendingUp
} from 'lucide-react';
import { AppState, FPDiagnosisForm } from '../types';
import { analyzeFPDiagnosis } from '../services/geminiService';
import { FP_OPTIONS } from '../constants';
import YearlyProjectionChart from './YearlyProjectionChart';

interface Props {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

/** 生年月日（YYYY-MM-DD）から現在の満年齢を算出 */
function getAgeFromBirthDate(birthDate: string): number | undefined {
  if (!birthDate || birthDate.length < 4) return undefined;
  const d = new Date(birthDate);
  if (Number.isNaN(d.getTime())) return undefined;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1;
  return age >= 0 ? age : undefined;
}

const SelectField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly { value: string; label: string }[];
  className?: string;
}> = ({ label, value, onChange, options, className = '' }) => (
  <div className={className}>
    <label className="block text-xs font-bold text-slate-500 mb-1">{label}</label>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-4 py-3 rounded-xl border border-slate-200 font-medium text-slate-800 bg-white"
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

const ADDITIONAL_QUESTIONS_HEADER = '【追加質問】';
const DIAGNOSIS_HEADER = '【診断結果】';

const FPDiagnosisTab: React.FC<Props> = ({ state, setState }) => {
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<string | null>(null);
  /** AIが追加質問を返したときのそのメッセージ全文（回答送信で再リクエストに使う） */
  const [pendingQuestions, setPendingQuestions] = useState<string | null>(null);
  /** 追加質問へのユーザーの回答 */
  const [followUpAnswer, setFollowUpAnswer] = useState('');

  const form = state.fpDiagnosisForm;
  const updateForm = (patch: Partial<FPDiagnosisForm>) => {
    setState(prev => ({
      ...prev,
      fpDiagnosisForm: { ...prev.fpDiagnosisForm, ...patch }
    }));
  };

  const isOwned = form.housingType === 'owned_house' || form.housingType === 'owned_condo';
  const isRent = form.housingType === 'rent';

  const chartProps = useMemo(() => {
    const retirementMap: Record<string, number> = { '50s': 55, '60': 60, '65': 65, '70': 70 };
    const currentAge = getAgeFromBirthDate(form.myBirthDate);
    return {
      currentAnnualIncomeMan: form.currentAnnualIncome ? parseInt(form.currentAnnualIncome, 10) : undefined,
      retirementMonthlyTarget: form.retirementMonthlyTarget ? parseInt(form.retirementMonthlyTarget, 10) : undefined,
      currentAge: currentAge ?? undefined,
      retirementAge: form.desiredRetirementAge ? retirementMap[form.desiredRetirementAge] : undefined
    };
  }, [form.currentAnnualIncome, form.retirementMonthlyTarget, form.myBirthDate, form.desiredRetirementAge]);

  const runDiagnosis = async () => {
    setIsDiagnosing(true);
    setDiagnosisResult(null);
    setPendingQuestions(null);
    setFollowUpAnswer('');
    try {
      const result = await analyzeFPDiagnosis(state, form);
      setDiagnosisResult(result);
      if (result.startsWith(ADDITIONAL_QUESTIONS_HEADER)) setPendingQuestions(result);
    } finally {
      setIsDiagnosing(false);
    }
  };

  const submitFollowUp = async () => {
    if (!pendingQuestions || !followUpAnswer.trim()) return;
    setIsDiagnosing(true);
    setDiagnosisResult(null);
    try {
      const result = await analyzeFPDiagnosis(state, form, [
        { role: 'assistant', content: pendingQuestions },
        { role: 'user', content: followUpAnswer.trim() }
      ]);
      setDiagnosisResult(result);
      setPendingQuestions(null);
      setFollowUpAnswer('');
    } finally {
      setIsDiagnosing(false);
    }
  };

  const isAdditionalQuestions = diagnosisResult?.startsWith(ADDITIONAL_QUESTIONS_HEADER);
  const displayResult = diagnosisResult?.startsWith(DIAGNOSIS_HEADER)
    ? diagnosisResult.slice(DIAGNOSIS_HEADER.length).trim()
    : diagnosisResult;

  const inputClass = "w-full px-4 py-3 rounded-xl border border-slate-200 font-medium text-slate-800";
  const sectionTitleClass = "flex items-center gap-2 text-sm font-black text-slate-700 mb-3";

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 bg-gradient-to-br from-emerald-600 to-teal-700 text-white">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
              <FileText size={28} />
            </div>
            <div>
              <h3 className="text-xl font-black">FP診断</h3>
              <p className="text-emerald-100 text-sm mt-0.5">プロのFPがヒアリングする項目に答えて、資産形成を診断</p>
            </div>
          </div>
        </div>

        {/* 想定年別収支グラフ（アプリの収支実績 + フォームの想定で延長） */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h4 className="flex items-center gap-2 text-sm font-black text-slate-700 mb-4">
            <TrendingUp size={16} className="text-slate-500" /> 想定年別の収支
          </h4>
          <p className="text-xs text-slate-500 mb-4">実績年はアプリの登録データ、将来年は現在のペースとFP回答（年収・退職・老後月額）から想定しています。</p>
          <YearlyProjectionChart
            records={state.records}
            currentAnnualIncomeMan={chartProps.currentAnnualIncomeMan}
            retirementMonthlyTarget={chartProps.retirementMonthlyTarget}
            retirementAge={chartProps.retirementAge}
            currentAge={chartProps.currentAge}
          />
        </div>

        <div className="p-6 space-y-8">
          {/* 1. 世帯・家族（生年月日で正確に把握） */}
          <section>
            <h4 className={sectionTitleClass}><Users size={16} className="text-slate-500" /> 世帯・家族</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField label="世帯形態" value={form.householdType} onChange={v => updateForm({ householdType: v })} options={FP_OPTIONS.householdType} />
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">ご本人の生年月日</label>
                <input type="date" value={form.myBirthDate} onChange={e => updateForm({ myBirthDate: e.target.value })} className={inputClass} />
                {form.myBirthDate && getAgeFromBirthDate(form.myBirthDate) != null && (
                  <p className="text-xs text-slate-500 mt-1">現在 {getAgeFromBirthDate(form.myBirthDate)} 歳</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">配偶者の生年月日（いない場合は未入力）</label>
                <input type="date" value={form.spouseBirthDate} onChange={e => updateForm({ spouseBirthDate: e.target.value })} className={inputClass} />
                {form.spouseBirthDate && getAgeFromBirthDate(form.spouseBirthDate) != null && (
                  <p className="text-xs text-slate-500 mt-1">現在 {getAgeFromBirthDate(form.spouseBirthDate)} 歳</p>
                )}
              </div>
              <SelectField label="お子様の人数" value={form.numberOfChildren} onChange={v => updateForm({ numberOfChildren: v })} options={FP_OPTIONS.numberOfChildren} />
              {(() => {
                const n = form.numberOfChildren === '3' ? 3 : (parseInt(form.numberOfChildren, 10) || 0);
                const childDates = [...form.childBirthDates];
                while (childDates.length < n) childDates.push('');
                return n > 0 ? (
                  <>
                    {Array.from({ length: n }, (_, i) => (
                      <div key={i}>
                        <label className="block text-xs font-bold text-slate-500 mb-1">お子様{i + 1}の生年月日</label>
                        <input
                          type="date"
                          value={childDates[i] ?? ''}
                          onChange={e => {
                            const next = [...childDates];
                            next[i] = e.target.value;
                            updateForm({ childBirthDates: next });
                          }}
                          className={inputClass}
                        />
                        {childDates[i] && getAgeFromBirthDate(childDates[i]) != null && (
                          <p className="text-xs text-slate-500 mt-1">現在 {getAgeFromBirthDate(childDates[i])} 歳</p>
                        )}
                      </div>
                    ))}
                  </>
                ) : null;
              })()}
              <SelectField label="扶養している親族（父母等）" value={form.dependentsOtherThanChildren} onChange={v => updateForm({ dependentsOtherThanChildren: v })} options={FP_OPTIONS.yesNo} />
            </div>
          </section>

          {/* 2. 収入 */}
          <section>
            <h4 className={sectionTitleClass}><DollarSign size={16} className="text-slate-500" /> 収入</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">世帯年収（現在・万円）</label>
                <input type="text" inputMode="numeric" value={form.currentAnnualIncome} onChange={e => updateForm({ currentAnnualIncome: e.target.value.replace(/\D/g, '') })} placeholder="例: 800" className={inputClass} />
              </div>
              <SelectField label="世帯年収の見通し" value={form.incomeOutlook} onChange={v => updateForm({ incomeOutlook: v })} options={FP_OPTIONS.incomeOutlook} />
              <SelectField label="主な収入源" value={form.incomeSource} onChange={v => updateForm({ incomeSource: v })} options={FP_OPTIONS.incomeSource} />
              <SelectField label="賞与" value={form.bonusFrequency} onChange={v => updateForm({ bonusFrequency: v })} options={FP_OPTIONS.bonusFrequency} />
            </div>
          </section>

          {/* 3. 就労・雇用 */}
          <section>
            <h4 className={sectionTitleClass}><Briefcase size={16} className="text-slate-500" /> 就労・雇用</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField label="ご本人の勤務形態" value={form.myEmployment} onChange={v => updateForm({ myEmployment: v })} options={FP_OPTIONS.employment} />
              <SelectField label="配偶者の勤務形態" value={form.spouseEmployment} onChange={v => updateForm({ spouseEmployment: v })} options={FP_OPTIONS.employment} />
              <SelectField label="退職金制度の有無" value={form.hasSeverance} onChange={v => updateForm({ hasSeverance: v })} options={FP_OPTIONS.yesNo} />
              <SelectField label="公的年金の見込み（夫婦合計・月額）" value={form.pensionOutlook} onChange={v => updateForm({ pensionOutlook: v })} options={FP_OPTIONS.pensionOutlook} />
            </div>
          </section>

          {/* 4. 住居 */}
          <section>
            <h4 className={sectionTitleClass}><Home size={16} className="text-slate-500" /> 住居</h4>
            <SelectField label="住居の形態" value={form.housingType} onChange={v => updateForm({ housingType: v })} options={FP_OPTIONS.housingType} />
            {isOwned && (
              <div className="mt-4 pl-4 border-l-2 border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">ローン残高（万円）</label>
                  <input type="text" inputMode="numeric" value={form.loanRemaining} onChange={e => updateForm({ loanRemaining: e.target.value.replace(/\D/g, '') })} placeholder="例: 2000" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">月の返済額（円）</label>
                  <input type="text" inputMode="numeric" value={form.monthlyRepayment} onChange={e => updateForm({ monthlyRepayment: e.target.value.replace(/\D/g, '') })} placeholder="例: 80000" className={inputClass} />
                </div>
                <SelectField label="金利タイプ" value={form.loanRateType} onChange={v => updateForm({ loanRateType: v })} options={FP_OPTIONS.loanRateType} />
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">金利（%）</label>
                  <input type="text" inputMode="decimal" value={form.loanInterestRate} onChange={e => updateForm({ loanInterestRate: e.target.value })} placeholder="例: 0.5" className={inputClass} />
                </div>
              </div>
            )}
            {isRent && (
              <div className="mt-4 pl-4 border-l-2 border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">月額家賃（円）</label>
                  <input type="text" inputMode="numeric" value={form.monthlyRent} onChange={e => updateForm({ monthlyRent: e.target.value.replace(/\D/g, '') })} placeholder="例: 120000" className={inputClass} />
                </div>
                <SelectField label="将来的な購入予定" value={form.rentToOwnPlan} onChange={v => updateForm({ rentToOwnPlan: v })} options={FP_OPTIONS.rentToOwnPlan} />
              </div>
            )}
          </section>

          {/* 5. 保障・保険 */}
          <section>
            <h4 className={sectionTitleClass}><Shield size={16} className="text-slate-500" /> 保障・保険</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField label="生命保険の有無・役割" value={form.lifeInsurance} onChange={v => updateForm({ lifeInsurance: v })} options={FP_OPTIONS.lifeInsurance} />
              <SelectField label="医療・がん保険" value={form.medicalInsurance} onChange={v => updateForm({ medicalInsurance: v })} options={FP_OPTIONS.medicalInsurance} />
            </div>
          </section>

          {/* 6. 教育 */}
          <section>
            <h4 className={sectionTitleClass}><GraduationCap size={16} className="text-slate-500" /> 教育</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField label="お子様の教育方針（進学想定）" value={form.childrenEducation} onChange={v => updateForm({ childrenEducation: v })} options={FP_OPTIONS.childrenEducation} />
              <SelectField label="教育資金の準備状況" value={form.educationSavingsStatus} onChange={v => updateForm({ educationSavingsStatus: v })} options={FP_OPTIONS.educationSavingsStatus} />
            </div>
          </section>

          {/* 7. 車・大型支出 */}
          <section>
            <h4 className={sectionTitleClass}><Car size={16} className="text-slate-500" /> 車・大型支出</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField label="車の保有・予定" value={form.carOwnership} onChange={v => updateForm({ carOwnership: v })} options={FP_OPTIONS.carOwnership} />
              <SelectField label="今後5年以内に予定している大型支出" value={form.largeExpensePlan} onChange={v => updateForm({ largeExpensePlan: v })} options={FP_OPTIONS.largeExpensePlan} />
            </div>
          </section>

          {/* 8. 老後・リタイア */}
          <section>
            <h4 className={sectionTitleClass}><Calendar size={16} className="text-slate-500" /> 老後・リタイア</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField label="希望退職時期（年代）" value={form.desiredRetirementAge} onChange={v => updateForm({ desiredRetirementAge: v })} options={FP_OPTIONS.desiredRetirementAge} />
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">老後資金の目標（月額・円）</label>
                <input type="text" inputMode="numeric" value={form.retirementMonthlyTarget} onChange={e => updateForm({ retirementMonthlyTarget: e.target.value.replace(/\D/g, '') })} placeholder="例: 250000" className={inputClass} />
              </div>
            </div>
          </section>

          {/* 9. ライフイベント */}
          <section>
            <h4 className={sectionTitleClass}><Heart size={16} className="text-slate-500" /> ライフイベント</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <SelectField label="帰省の頻度" value={form.visitParentsFrequency} onChange={v => updateForm({ visitParentsFrequency: v })} options={FP_OPTIONS.visitParentsFrequency} />
              <SelectField label="旅行・レジャーの年間頻度" value={form.travelFrequency} onChange={v => updateForm({ travelFrequency: v })} options={FP_OPTIONS.travelFrequency} />
              <SelectField label="将来やりたいこと" value={form.futureGoals} onChange={v => updateForm({ futureGoals: v })} options={FP_OPTIONS.futureGoals} />
            </div>
          </section>

          {/* 10. その他・補足（唯一の自由記述） */}
          <section>
            <h4 className={sectionTitleClass}><Sparkles size={16} className="text-slate-500" /> その他・補足</h4>
            <textarea value={form.otherNotes} onChange={e => updateForm({ otherNotes: e.target.value })} placeholder="FPに伝えておきたいこと、心配なことなど（任意）" rows={2} className={`${inputClass} resize-none`} />
          </section>

          <div className="pt-4">
            <button type="button" onClick={runDiagnosis} disabled={isDiagnosing}
              className={`w-full py-4 rounded-2xl font-black text-white flex items-center justify-center gap-3 transition-all ${isDiagnosing ? 'bg-slate-300 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-200'}`}>
              {isDiagnosing ? (<><span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />診断中...</>) : (<><FileText size={20} />AIで診断する</>)}
            </button>
          </div>
        </div>
      </div>

      {diagnosisResult && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-black text-slate-800">{isAdditionalQuestions ? '追加でお聞きしたいこと' : '診断結果'}</h3>
          </div>
          <div className="p-6">
            <div className="prose prose-slate max-w-none text-slate-700 whitespace-pre-wrap text-sm font-medium leading-relaxed diagnosis-result">
              {isAdditionalQuestions ? diagnosisResult.slice(ADDITIONAL_QUESTIONS_HEADER.length).trim() : (displayResult ?? diagnosisResult)}
            </div>
            {pendingQuestions && (
              <div className="mt-6 pt-6 border-t border-slate-100">
                <label className="block text-sm font-bold text-slate-700 mb-2">上記についてご回答ください（自由記述）</label>
                <textarea
                  value={followUpAnswer}
                  onChange={e => setFollowUpAnswer(e.target.value)}
                  placeholder="質問への回答を入力してください"
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 font-medium text-slate-800 placeholder:text-slate-400 resize-none"
                />
                <button
                  type="button"
                  onClick={submitFollowUp}
                  disabled={isDiagnosing || !followUpAnswer.trim()}
                  className={`mt-4 w-full py-3 rounded-xl font-black text-white flex items-center justify-center gap-2 transition-all ${isDiagnosing || !followUpAnswer.trim() ? 'bg-slate-300 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                >
                  {isDiagnosing ? (<><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />診断を続けています...</>) : (<>回答して診断を続ける</>)}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FPDiagnosisTab;
