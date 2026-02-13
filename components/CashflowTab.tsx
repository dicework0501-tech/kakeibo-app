
import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Coins, 
  Wallet, 
  PieChart as PieChartIcon, 
  Target,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Layers,
  Pencil,
  Check,
  X,
  GripVertical
} from 'lucide-react';
import { MonthlyRecord, DetailItem, AppState } from '../types';
import AssetAllocationChart from './AssetAllocationChart';
import MonthYearPicker from './MonthYearPicker';

interface Props {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  selectedYear: number;
  setSelectedYear: (y: number) => void;
  selectedMonth: number;
  setSelectedMonth: (m: number) => void;
  navigateMonth: (dir: number) => void;
}

const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
};

const CashflowTab: React.FC<Props> = ({ 
  state, 
  setState, 
  selectedYear, 
  setSelectedYear,
  selectedMonth, 
  setSelectedMonth,
  navigateMonth 
}) => {
  const [newCatNames, setNewCatNames] = useState<Record<string, string>>({
    income: '', expense: '', savings: '', assets: ''
  });
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [addingSubItemTo, setAddingSubItemTo] = useState<{ id: string, type: string } | null>(null);
  const [newSubItemName, setNewSubItemName] = useState('');
  const [editingItem, setEditingItem] = useState<{ type: string; id: string; draft: string } | null>(null);
  const [editingSubItem, setEditingSubItem] = useState<{ type: string; parentId: string; subId: string; draft: string } | null>(null);
  /** 収入・支出・積立・資産の各ブロックのアコーディオン開閉（デフォルトは全て閉＝合計のみ表示） */
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ income: false, expense: false, savings: false, assets: false });
  /** ドラッグ中の項目（並び替え用） */
  const [dragState, setDragState] = useState<{ type: string; parentId: string | null; index: number } | null>(null);

  // 現在表示中の月のレコード
  const record = state.records.find(r => r.year === selectedYear && r.month === selectedMonth);

  // この月のデータを削除
  const deleteCurrentMonth = () => {
    if (!record) return;
    if (!window.confirm(`${selectedYear}年${selectedMonth}月のデータを削除します。よろしいですか？`)) return;
    setState(prev => ({
      ...prev,
      records: prev.records.filter(r => !(r.year === selectedYear && r.month === selectedMonth))
    }));
  };
  
  // 「引き継ぎ元」となる最新の過去レコードを探す
  const lastAvailableRecord = useMemo(() => {
    const currentVal = selectedYear * 12 + selectedMonth;
    return [...state.records]
      .filter(r => (r.year * 12 + r.month) < currentVal)
      // 最新の過去レコードを正しく選ぶ（a.month と b.month の取り違えバグ修正）
      .sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month))[0] || null;
  }, [state.records, selectedYear, selectedMonth]);

  const getKey = (type: string) => {
    return type === 'income' ? 'incomeDetails' : type === 'expense' ? 'expenseDetails' : type === 'savings' ? 'savingsDetails' : 'assets';
  };

  // 全角数字（１２３）→半角（123）に正規化して、数字以外を除去
  const normalizeAmountInput = (raw: string): string => {
    return raw
      .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
      .replace(/[^0-9]/g, '');
  };

  const parseAmount = (raw: string): number => {
    const normalized = normalizeAmountInput(raw);
    return normalized ? parseInt(normalized, 10) : 0;
  };

  const updateItemLabel = (type: string, id: string, label: string) => {
    const nextLabel = label.trim();
    if (!nextLabel) return;
    setState(prev => ({
      ...prev,
      records: prev.records.map(r => {
        if (r.year !== selectedYear || r.month !== selectedMonth) return r;
        const key = getKey(type);
        const currentItems = (r as any)[key] as DetailItem[];
        return {
          ...r,
          [key]: currentItems.map(item => item.id === id ? { ...item, label: nextLabel } : item)
        };
      })
    }));
  };

  const updateSubLabel = (type: string, parentId: string, subId: string, label: string) => {
    const nextLabel = label.trim();
    if (!nextLabel) return;
    setState(prev => ({
      ...prev,
      records: prev.records.map(r => {
        if (r.year !== selectedYear || r.month !== selectedMonth) return r;
        const key = getKey(type);
        const currentItems = (r as any)[key] as DetailItem[];
        return {
          ...r,
          [key]: currentItems.map(item => {
            if (item.id !== parentId) return item;
            const newSubItems = (item.subItems || []).map(sub => sub.id === subId ? { ...sub, label: nextLabel } : sub);
            return { ...item, subItems: newSubItems };
          })
        };
      })
    }));
  };

  /**
   * 内訳モードに切り替える（subItems が無い場合に作る）。
   * すでに入力済みの親金額がある場合は「その他」に退避して保持する。
   */
  const ensureSubItemMode = (type: string, parentId: string) => {
    setState(prev => ({
      ...prev,
      records: prev.records.map(r => {
        if (r.year !== selectedYear || r.month !== selectedMonth) return r;
        const key = getKey(type);
        const currentItems = (r as any)[key] as DetailItem[];
        return {
          ...r,
          [key]: currentItems.map(item => {
            if (item.id !== parentId) return item;
            if (item.subItems) return item;
            const carried = item.amount || 0;
            const newSubItems = carried > 0
              ? [{ id: generateId(), label: 'その他', amount: carried }]
              : [];
            return {
              ...item,
              subItems: newSubItems,
              amount: newSubItems.reduce((sum, s) => sum + s.amount, 0),
            };
          })
        };
      })
    }));
  };

  const createRecordIfMissing = () => {
    // 構造と金額をコピーする関数（次月シートで全項目の金額を引き継ぐ）
    const copyStructure = (items: DetailItem[], carryOverAmount: boolean = true): DetailItem[] => {
      return items.map(item => ({
        id: generateId(),
        label: item.label,
        amount: carryOverAmount ? item.amount : 0,
        subItems: item.subItems ? item.subItems.map(sub => ({
          id: generateId(),
          label: sub.label,
          amount: carryOverAmount ? sub.amount : 0
        })) : undefined
      }));
    };

    const newRecord: MonthlyRecord = {
      id: generateId(),
      year: selectedYear,
      month: selectedMonth,
      incomeDetails: lastAvailableRecord ? copyStructure(lastAvailableRecord.incomeDetails) : state.categoryTemplate.income.map(label => ({ id: generateId(), label, amount: 0 })),
      expenseDetails: lastAvailableRecord ? copyStructure(lastAvailableRecord.expenseDetails) : state.categoryTemplate.expense.map(label => {
        if (label === '固定費') {
          return {
            id: generateId(),
            label,
            amount: 0,
            subItems: [
              { id: generateId(), label: '住宅ローン/家賃', amount: 0 },
              { id: generateId(), label: '自動車ローン', amount: 0 },
              { id: generateId(), label: '通信費', amount: 0 },
              { id: generateId(), label: '保険料', amount: 0 }
            ]
          };
        }
        // 固定変動費/やりくり費/特別費 は内訳を追加できるように subItems を用意しておく
        if (['固定変動費', 'やりくり費', '特別費'].includes(label)) {
          return { id: generateId(), label, amount: 0, subItems: [] };
        }
        return { id: generateId(), label, amount: 0 };
      }),
      savingsDetails: lastAvailableRecord ? copyStructure(lastAvailableRecord.savingsDetails) : state.categoryTemplate.savings.map(label => ({ id: generateId(), label, amount: 0 })),
      assets: lastAvailableRecord ? copyStructure(lastAvailableRecord.assets, true) : state.categoryTemplate.assets.map(label => ({ id: generateId(), label, amount: 0 })),
      updatedAt: new Date().toISOString()
    };

    setState(prev => ({ ...prev, records: [...prev.records, newRecord] }));
  };

  const updateAmount = (type: string, id: string, amount: number) => {
    setState(prev => ({
      ...prev,
      records: prev.records.map(r => {
        if (r.year !== selectedYear || r.month !== selectedMonth) return r;
        const key = getKey(type);
        const currentItems = (r as any)[key] as DetailItem[];
        return {
          ...r,
          [key]: currentItems.map(item => item.id === id ? { ...item, amount } : item)
        };
      })
    }));
  };

  const updateSubAmount = (type: string, parentId: string, subId: string, amount: number) => {
    setState(prev => ({
      ...prev,
      records: prev.records.map(r => {
        if (r.year !== selectedYear || r.month !== selectedMonth) return r;
        const key = getKey(type);
        const currentItems = (r as any)[key] as DetailItem[];
        return {
          ...r,
          [key]: currentItems.map(item => {
            if (item.id !== parentId) return item;
            const newSubItems = (item.subItems || []).map(sub => sub.id === subId ? { ...sub, amount } : sub);
            return {
              ...item,
              subItems: newSubItems,
              amount: newSubItems.reduce((sum, s) => sum + s.amount, 0)
            };
          })
        };
      })
    }));
  };

  const addItem = (type: string) => {
    const label = newCatNames[type as keyof typeof newCatNames]?.trim();
    if (!label) return;

    setState(prev => ({
      ...prev,
      records: prev.records.map(r => {
        if (r.year !== selectedYear || r.month !== selectedMonth) return r;
        const key = getKey(type);
        const currentItems = (r as any)[key] as DetailItem[];
        return { ...r, [key]: [...currentItems, { id: generateId(), label, amount: 0 }] };
      })
    }));
    setNewCatNames(prev => ({ ...prev, [type]: '' }));
  };

  const addSubItemAction = (type: string, parentId: string) => {
    const label = newSubItemName.trim();
    if (!label) return;

    setState(prev => ({
      ...prev,
      records: prev.records.map(r => {
        if (r.year !== selectedYear || r.month !== selectedMonth) return r;
        const key = getKey(type);
        const currentItems = (r as any)[key] as DetailItem[];
        return {
          ...r,
          [key]: currentItems.map(item => {
            if (item.id !== parentId) return item;
            const newSubItems = [...(item.subItems || []), { id: generateId(), label, amount: 0 }];
            return {
              ...item,
              subItems: newSubItems,
              amount: newSubItems.reduce((sum, s) => sum + s.amount, 0)
            };
          })
        };
      })
    }));
    setAddingSubItemTo(null);
    setNewSubItemName('');
  };

  const deleteSubItem = (type: string, parentId: string, subId: string) => {
    if (!window.confirm('この内訳を削除しますか？')) return;

    setState(prev => ({
      ...prev,
      records: prev.records.map(r => {
        if (r.year !== selectedYear || r.month !== selectedMonth) return r;
        const key = getKey(type);
        const currentItems = (r as any)[key] as DetailItem[];
        return {
          ...r,
          [key]: currentItems.map(item => {
            if (item.id !== parentId) return item;
            const newSubItems = (item.subItems || []).filter(sub => sub.id !== subId);
            return {
              ...item,
              subItems: newSubItems,
              amount: newSubItems.reduce((sum, s) => sum + s.amount, 0)
            };
          })
        };
      })
    }));
  };

  const deleteItemForThisMonth = (type: string, id: string) => {
    setState(prev => ({
      ...prev,
      records: prev.records.map(r => {
        if (r.year !== selectedYear || r.month !== selectedMonth) return r;
        const key = getKey(type);
        const currentItems = (r as any)[key] as DetailItem[];
        return {
          ...r,
          [key]: currentItems.filter(i => i.id !== id)
        };
      })
    }));
  };

  /** 項目の並び順を変更（ドラッグ＆ドロップ） */
  const reorderItems = (type: string, fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setState(prev => ({
      ...prev,
      records: prev.records.map(r => {
        if (r.year !== selectedYear || r.month !== selectedMonth) return r;
        const key = getKey(type);
        const list = [...((r as any)[key] as DetailItem[])];
        const [removed] = list.splice(fromIndex, 1);
        list.splice(toIndex, 0, removed);
        return { ...r, [key]: list };
      })
    }));
    setDragState(null);
  };

  /** 内訳の並び順を変更（ドラッグ＆ドロップ） */
  const reorderSubItems = (type: string, parentId: string, fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setState(prev => ({
      ...prev,
      records: prev.records.map(r => {
        if (r.year !== selectedYear || r.month !== selectedMonth) return r;
        const key = getKey(type);
        const list = (r as any)[key] as DetailItem[];
        return {
          ...r,
          [key]: list.map(item => {
            if (item.id !== parentId || !item.subItems) return item;
            const subs = [...item.subItems];
            const [removed] = subs.splice(fromIndex, 1);
            subs.splice(toIndex, 0, removed);
            const amount = subs.reduce((sum, s) => sum + s.amount, 0);
            return { ...item, subItems: subs, amount };
          })
        };
      })
    }));
    setDragState(null);
  };

  const renderSection = (title: string, type: 'income' | 'expense' | 'savings' | 'assets', items: DetailItem[], colorClass: string, Icon: any, isExpanded: boolean, onToggle: () => void) => (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full">
      <button
        type="button"
        onClick={onToggle}
        className={`w-full p-4 ${colorClass} text-white flex justify-between items-center text-left hover:opacity-95 active:opacity-90 transition-opacity`}
      >
        <h3 className="font-bold flex items-center gap-2 text-sm uppercase tracking-wider">
          <Icon size={16} />
          {title}
        </h3>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <span className="text-[10px] block opacity-70 font-black">TOTAL</span>
            <span className="text-sm font-black tracking-tight">¥{items.reduce((sum, i) => sum + i.amount, 0).toLocaleString()}</span>
          </div>
          {isExpanded ? <ChevronUp size={18} className="shrink-0" /> : <ChevronDown size={18} className="shrink-0" />}
        </div>
      </button>

      {isExpanded && (
      <>
      <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[600px]">
        {items.map((item, itemIndex) => {
          const autoExpanded = type === 'expense' && ['固定費', '固定変動費', 'やりくり費', '特別費'].includes(item.label);
          const isExpanded = expandedItems[item.id] ?? autoExpanded;
          const hasSubContainer = item.subItems !== undefined;
          const isBreakdownMode = hasSubContainer;
          const isDragging = dragState?.parentId === null && dragState?.type === type && dragState?.index === itemIndex;

          return (
            <div
              key={item.id}
              className={`group flex flex-col gap-1 ${isDragging ? 'opacity-50' : ''}`}
              draggable
              onDragStart={(e) => {
                setDragState({ type, parentId: null, index: itemIndex });
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', '');
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragState && dragState.parentId === null && dragState.type === type) reorderItems(type, dragState.index, itemIndex);
                setDragState(null);
              }}
              onDragEnd={() => setDragState(null)}
            >
              <div className="relative bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 flex flex-col gap-1.5 shadow-sm">
                <div className="flex justify-between items-center px-1">
                  <div className="flex items-center gap-1 flex-1 min-w-0">
                    <span className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 shrink-0" title="ドラッグで並び替え">
                      <GripVertical size={14} />
                    </span>
                    {hasSubContainer && (
                      <button 
                        type="button"
                        onClick={() => setExpandedItems(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                        className="p-1 hover:bg-slate-200 rounded-md text-slate-500 transition-colors"
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    )}
                    {editingItem?.type === type && editingItem?.id === item.id ? (
                      <input
                        autoFocus
                        type="text"
                        value={editingItem.draft}
                        onChange={(e) => setEditingItem({ ...editingItem, draft: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            updateItemLabel(type, item.id, editingItem.draft);
                            setEditingItem(null);
                          }
                          if (e.key === 'Escape') setEditingItem(null);
                        }}
                        className="flex-1 min-w-0 px-2 py-1 text-[11px] font-black text-slate-900 border border-slate-200 rounded-md bg-white"
                      />
                    ) : (
                      <span
                        className="text-[11px] font-black text-slate-700 uppercase tracking-tight truncate"
                        title={item.label}
                      >
                        {item.label}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center">
                    {editingItem?.type === type && editingItem?.id === item.id ? (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            updateItemLabel(type, item.id, editingItem.draft);
                            setEditingItem(null);
                          }}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-full"
                          title="確定"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setEditingItem(null);
                          }}
                          className="p-2 text-slate-400 hover:bg-slate-200 rounded-full"
                          title="キャンセル"
                        >
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        {/* 内訳を追加したいが、まだ subItems が無い場合の導線 */}
                        {!hasSubContainer && (type === 'expense' || type === 'savings' || type === 'assets') && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              ensureSubItemMode(type, item.id);
                              setExpandedItems(prev => ({ ...prev, [item.id]: true }));
                              setAddingSubItemTo({ id: item.id, type });
                              setNewSubItemName('');
                            }}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all cursor-pointer relative z-50 bg-transparent rounded-full"
                            title="内訳を追加"
                          >
                            <Layers size={16} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setEditingItem({ type, id: item.id, draft: item.label });
                          }}
                          className="p-2 text-slate-300 hover:text-slate-700 transition-all cursor-pointer relative z-50 bg-transparent rounded-full"
                          title="項目名を編集"
                        >
                          <Pencil size={16} />
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation(); // これで親のイベントを遮断
                            if(window.confirm(`「${item.label}」を削除しますか？`)) {
                              deleteItemForThisMonth(type, item.id);
                            }
                          }}
                          className="p-2 -mr-1 text-slate-300 hover:text-rose-500 transition-all cursor-pointer relative z-50 bg-transparent rounded-full"
                          title="削除"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px]">¥</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={item.amount || ''}
                    onChange={(e) => (!isBreakdownMode) && updateAmount(type, item.id, parseAmount(e.target.value))}
                    placeholder="0"
                    readOnly={isBreakdownMode}
                    className={`w-full pl-6 pr-3 py-2.5 border border-slate-200 rounded-lg outline-none text-right font-black text-slate-900 bg-white text-base shadow-inner ${isBreakdownMode ? 'bg-slate-100/50 cursor-default' : ''}`}
                  />
                </div>
              </div>

              {isExpanded && hasSubContainer && (
                <div className="ml-4 pl-4 border-l-2 border-blue-100 space-y-2 mt-1">
                  {item.subItems!.map((sub, subIndex) => {
                    const isSubDragging = dragState?.parentId === item.id && dragState?.type === type && dragState?.index === subIndex;
                    return (
                    <div
                      key={sub.id}
                      className={`flex flex-col gap-1 bg-white p-2 rounded-lg border border-slate-100 shadow-sm relative ${isSubDragging ? 'opacity-50' : ''}`}
                      draggable
                      onDragStart={(e) => {
                        setDragState({ type, parentId: item.id, index: subIndex });
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', '');
                      }}
                      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (dragState && dragState.parentId === item.id && dragState.type === type) reorderSubItems(type, item.id, dragState.index, subIndex);
                        setDragState(null);
                      }}
                      onDragEnd={() => setDragState(null)}
                    >
                      <div className="flex justify-between items-center px-1">
                        <span className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 shrink-0 mr-1" title="ドラッグで並び替え">
                          <GripVertical size={12} />
                        </span>
                        {editingSubItem?.type === type && editingSubItem?.parentId === item.id && editingSubItem?.subId === sub.id ? (
                          <input
                            autoFocus
                            type="text"
                            value={editingSubItem.draft}
                            onChange={(e) => setEditingSubItem({ ...editingSubItem, draft: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                updateSubLabel(type, item.id, sub.id, editingSubItem.draft);
                                setEditingSubItem(null);
                              }
                              if (e.key === 'Escape') setEditingSubItem(null);
                            }}
                            className="flex-1 min-w-0 px-2 py-1 text-[10px] font-bold text-slate-900 border border-slate-200 rounded-md bg-white"
                          />
                        ) : (
                          <span className="text-[10px] font-bold text-slate-700 truncate flex-1" title={sub.label}>{sub.label}</span>
                        )}
                        <div className="flex items-center">
                          {editingSubItem?.type === type && editingSubItem?.parentId === item.id && editingSubItem?.subId === sub.id ? (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  updateSubLabel(type, item.id, sub.id, editingSubItem.draft);
                                  setEditingSubItem(null);
                                }}
                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-full"
                                title="確定"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setEditingSubItem(null);
                                }}
                                className="p-2 text-slate-400 hover:bg-slate-200 rounded-full"
                                title="キャンセル"
                              >
                                <X size={14} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setEditingSubItem({ type, parentId: item.id, subId: sub.id, draft: sub.label });
                                }}
                                className="p-2 -mr-1 text-slate-400 hover:text-slate-800 cursor-pointer relative z-50"
                                title="内訳名を編集"
                              >
                                <Pencil size={14} />
                              </button>
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  deleteSubItem(type, item.id, sub.id);
                                }}
                                className="p-2 -mr-1 text-slate-400 hover:text-rose-600 cursor-pointer relative z-50"
                                title="削除"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-black text-[10px] z-10">¥</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={sub.amount || ''}
                          onChange={(e) => updateSubAmount(type, item.id, sub.id, parseAmount(e.target.value))}
                          placeholder="0"
                          className="w-full pl-6 pr-3 py-2 border border-slate-200 rounded-lg outline-none text-right font-black text-slate-900 bg-slate-50 text-[13px] shadow-sm"
                        />
                      </div>
                    </div>
                  ); })}
                  
                  {addingSubItemTo?.id === item.id ? (
                    <div className="bg-blue-50 p-2 rounded-lg border border-blue-200 space-y-2">
                      <input 
                        autoFocus
                        type="text"
                        value={newSubItemName}
                        onChange={(e) => setNewSubItemName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addSubItemAction(type, item.id)}
                        placeholder={type === 'assets' ? '内訳を入力...' : '内訳名を入力...'}
                        className="w-full px-2 py-2 text-sm border border-blue-200 rounded-md outline-none bg-white font-black text-slate-900 placeholder:text-slate-400"
                      />
                      <div className="flex gap-1">
                        <button 
                          type="button"
                          onClick={() => addSubItemAction(type, item.id)}
                          className="flex-1 py-2 bg-blue-600 text-white rounded-md text-[11px] font-black"
                        >
                          確定
                        </button>
                        <button 
                          type="button"
                          onClick={() => setAddingSubItemTo(null)}
                          className="px-3 py-2 bg-slate-200 text-slate-600 rounded-md text-[11px] font-black"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button 
                      type="button"
                      onClick={() => setAddingSubItemTo({ id: item.id, type })}
                      className="w-full py-2.5 border border-dashed border-blue-200 rounded-lg text-[10px] font-black text-blue-600 bg-blue-50/50 hover:bg-blue-100/50 transition-all flex items-center justify-center gap-1"
                    >
                      <Plus size={12} /> 内訳を追加
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-3 border-t border-slate-100 bg-slate-50/30">
        <div className="flex gap-2">
          <input
            type="text"
            value={newCatNames[type as keyof typeof newCatNames]}
            onChange={(e) => setNewCatNames(prev => ({ ...prev, [type]: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && addItem(type)}
            placeholder="項目名..."
            className="flex-1 px-3 py-3 text-sm border border-slate-200 rounded-xl outline-none bg-white font-black text-slate-900 shadow-sm"
          />
          <button 
            type="button"
            onClick={() => addItem(type)}
            className="px-4 bg-slate-800 text-white rounded-xl hover:bg-slate-700 active:scale-95 transition-all"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>
      </>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 space-y-3">
        <div className="flex items-center justify-center gap-4">
          <button type="button" onClick={() => navigateMonth(-1)} className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 hover:bg-slate-50 rounded-full text-slate-400"><ChevronLeft size={24} /></button>
          <MonthYearPicker year={selectedYear} month={selectedMonth} onSelect={(y, m) => { setSelectedYear(y); setSelectedMonth(m); }} variant="default" />
          <button type="button" onClick={() => navigateMonth(1)} className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 hover:bg-slate-50 rounded-full text-slate-400"><ChevronRight size={24} /></button>
        </div>
        {record && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={deleteCurrentMonth}
              className="text-xs text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-1"
            >
              <Trash2 size={12} /> この月のデータを削除
            </button>
          </div>
        )}
      </div>

      {!record ? (
        <div className="bg-white p-20 rounded-[3rem] border border-dashed border-slate-200 flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner"><Coins size={40} /></div>
          <h3 className="text-2xl font-black text-slate-800 mb-2">{selectedYear}年{selectedMonth}月</h3>
          <p className="text-slate-400 mb-8 max-w-sm text-sm font-medium">収支シートがありません。{lastAvailableRecord ? `${lastAvailableRecord.year}年${lastAvailableRecord.month}月の項目と資産額を引き継いで作成します。` : '新しいシートを作成します。'}</p>
          <button type="button" onClick={createRecordIfMissing} className="bg-blue-600 text-white px-12 py-4 rounded-2xl font-black shadow-xl hover:bg-blue-700 transition-all active:scale-95">シートを作成</button>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
            {renderSection('収入', 'income', record.incomeDetails, 'bg-emerald-500', Coins, expandedSections.income ?? false, () => setExpandedSections(prev => ({ ...prev, income: !prev.income })))}
            {renderSection('支出', 'expense', record.expenseDetails, 'bg-rose-500', Wallet, expandedSections.expense ?? false, () => setExpandedSections(prev => ({ ...prev, expense: !prev.expense })))}
            {renderSection('積立', 'savings', record.savingsDetails, 'bg-blue-500', Target, expandedSections.savings ?? false, () => setExpandedSections(prev => ({ ...prev, savings: !prev.savings })))}
            {renderSection('資産額', 'assets', record.assets, 'bg-slate-800', Wallet, expandedSections.assets ?? false, () => setExpandedSections(prev => ({ ...prev, assets: !prev.assets })))}
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
            <h3 className="font-black text-slate-800 text-xl mb-8 flex items-center gap-3">資産構成の内訳</h3>
            <div className="flex flex-col lg:flex-row items-center gap-12">
              <div className="flex-1 w-full lg:w-1/2"><AssetAllocationChart data={record.assets} prevData={lastAvailableRecord?.assets} /></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashflowTab;
