import React, { useState, useRef, useEffect } from 'react';
import { Calendar } from 'lucide-react';

interface Props {
  year: number;
  month: number;
  onSelect: (year: number, month: number) => void;
  /** ダッシュボード用はコンパクト、収支用は大きめ */
  variant?: 'compact' | 'default';
  className?: string;
}

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const MonthYearPicker: React.FC<Props> = ({ year, month, onSelect, variant = 'default', className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [draftYear, setDraftYear] = useState(year);
  const [draftMonth, setDraftMonth] = useState(month);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraftYear(year);
    setDraftMonth(month);
  }, [year, month]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const years = Array.from({ length: 15 }, (_, i) => currentYear - 5 + i);

  const handleApply = () => {
    onSelect(draftYear, draftMonth);
    setIsOpen(false);
  };

  const handleThisMonth = () => {
    onSelect(currentYear, currentMonth);
    setIsOpen(false);
  };

  const isCompact = variant === 'compact';

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-colors text-slate-800 font-black ${
          isCompact ? 'px-3 py-2 text-base min-w-[140px]' : 'px-5 py-3 text-xl md:text-2xl min-w-[180px]'
        }`}
      >
        <Calendar size={isCompact ? 18 : 22} className="text-slate-400 shrink-0" />
        <span className="tracking-tight">{year}年 {month}月</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">年</label>
                <select
                  value={draftYear}
                  onChange={(e) => setDraftYear(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 text-sm"
                >
                  {years.map(y => (
                    <option key={y} value={y}>{y}年</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">月</label>
                <select
                  value={draftMonth}
                  onChange={(e) => setDraftMonth(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 text-sm"
                >
                  {MONTHS.map(m => (
                    <option key={m} value={m}>{m}月</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleThisMonth}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors"
              >
                当月
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors"
              >
                反映
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthYearPicker;
