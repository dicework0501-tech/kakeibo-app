
import { AppState } from '../types';
import { INITIAL_CATEGORIES, INITIAL_FP_FORM } from '../constants';

const STORAGE_KEY = 'couples_finance_data_v3';

export const saveState = (state: AppState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Failed to save state to localStorage", error);
  }
};

export const loadState = (): AppState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return {
        records: [],
        purposeSavings: [],
        fpDiagnosisForm: INITIAL_FP_FORM,
        categoryTemplate: INITIAL_CATEGORIES,
        cloudSettings: { supabaseUrl: '', supabaseKey: '', householdId: '', enabled: false }
      };
    }
    const parsed = JSON.parse(saved);
    if (!parsed.purposeSavings) parsed.purposeSavings = [];
    if (!parsed.fpDiagnosisForm) parsed.fpDiagnosisForm = INITIAL_FP_FORM;
    else {
      // 新フォーム項目へ移行：不足キーは初期値で補う
      const prev = parsed.fpDiagnosisForm;
      parsed.fpDiagnosisForm = { ...INITIAL_FP_FORM, ...prev };
      // 旧「最年長の子の生年月日」を childBirthDates に移行
      if (Array.isArray(parsed.fpDiagnosisForm.childBirthDates) && parsed.fpDiagnosisForm.childBirthDates.length === 0 && prev.oldestChildBirthDate) {
        parsed.fpDiagnosisForm.childBirthDates = [prev.oldestChildBirthDate];
      }
    }
    if (!parsed.categoryTemplate.assets) {
      parsed.categoryTemplate.assets = INITIAL_CATEGORIES.assets;
    }
    // 目標設定削除に伴い goals / assetAnnualRates は読み込まない
    delete parsed.goals;
    delete parsed.assetAnnualRates;
    return parsed;
  } catch (error) {
    console.error("Failed to load state from localStorage", error);
    return {
      records: [],
      purposeSavings: [],
      fpDiagnosisForm: INITIAL_FP_FORM,
      categoryTemplate: INITIAL_CATEGORIES
    };
  }
};

// --- Cloud Sync (Supabase) ---

/**
 * クラウドにデータを保存する
 */
export const pushToCloud = async (state: AppState): Promise<boolean> => {
  const { cloudSettings } = state;
  if (!cloudSettings?.enabled || !cloudSettings.supabaseUrl || !cloudSettings.supabaseKey || !cloudSettings.householdId) {
    return false;
  }

  try {
    const response = await fetch(`${cloudSettings.supabaseUrl}/rest/v1/household_sync`, {
      method: 'POST',
      headers: {
        'apikey': cloudSettings.supabaseKey,
        'Authorization': `Bearer ${cloudSettings.supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        id: cloudSettings.householdId,
        data: state,
        updated_at: new Date().toISOString()
      })
    });

    return response.ok;
  } catch (error) {
    console.error("Cloud push failed", error);
    return false;
  }
};

/**
 * クラウドからデータを取得する
 */
export const fetchFromCloud = async (cloudSettings: AppState['cloudSettings']): Promise<AppState | null> => {
  if (!cloudSettings?.enabled || !cloudSettings.supabaseUrl || !cloudSettings.supabaseKey || !cloudSettings.householdId) {
    return null;
  }

  try {
    const response = await fetch(
      `${cloudSettings.supabaseUrl}/rest/v1/household_sync?id=eq.${cloudSettings.householdId}&select=data`,
      {
        headers: {
          'apikey': cloudSettings.supabaseKey,
          'Authorization': `Bearer ${cloudSettings.supabaseKey}`,
        }
      }
    );

    const result = await response.json();
    if (result && result.length > 0) {
      return result[0].data;
    }
    return null;
  } catch (error) {
    console.error("Cloud fetch failed", error);
    return null;
  }
};

export const exportData = (state: AppState): string => {
  return btoa(unescape(encodeURIComponent(JSON.stringify(state))));
};

export const importData = (encodedData: string): AppState | null => {
  try {
    const json = decodeURIComponent(escape(atob(encodedData)));
    return JSON.parse(json);
  } catch (e) {
    console.error("Invalid data format", e);
    return null;
  }
};
