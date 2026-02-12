
export const ASSET_COLORS: Record<string, string> = {
  '現金': '#10b981',
  '個別株': '#3b82f6',
  '投資信託': '#8b5cf6',
  '金': '#f59e0b',
  'ETF': '#06b6d4',
  '仮想通貨': '#ef4444',
  '保険': '#0d9488',
  'その他': '#6b7280',
};

export const INITIAL_CATEGORIES = {
  income: ['給与(D)', '給与(S)', '副業', '児童手当', 'その他'],
  expense: ['固定費', '固定変動費', 'やりくり費', '特別費'],
  savings: ['NISA(D)', 'NISA(S)', 'SONY個人年金'],
  assets: ['投資信託', '個別株', '金', 'ETF', '仮想通貨', '保険', '現金']
};

export const getColor = (label: string): string => {
  return ASSET_COLORS[label] || `hsl(${Math.abs(label.split('').reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0)) % 360}, 70%, 50%)`;
};

/** FP診断：選択肢（プロFPヒアリング想定） */
export const FP_OPTIONS = {
  householdType: [
    { value: '', label: '選択してください' },
    { value: 'single', label: '単身' },
    { value: 'couple_only', label: '夫婦のみ' },
    { value: 'couple_1child', label: '夫婦+子1人' },
    { value: 'couple_2children', label: '夫婦+子2人' },
    { value: 'couple_3children', label: '夫婦+子3人以上' },
    { value: 'single_parent', label: 'ひとり親+子' },
    { value: 'other', label: 'その他' }
  ],
  ageRange: [
    { value: '', label: '選択' },
    { value: '20s', label: '20代' },
    { value: '30s', label: '30代' },
    { value: '40s', label: '40代' },
    { value: '50s', label: '50代' },
    { value: '60s', label: '60代以上' }
  ],
  spouseAgeRange: [
    { value: '', label: '選択' },
    { value: 'none', label: '配偶者はいない' },
    { value: '20s', label: '20代' },
    { value: '30s', label: '30代' },
    { value: '40s', label: '40代' },
    { value: '50s', label: '50代' },
    { value: '60s', label: '60代以上' }
  ],
  numberOfChildren: [
    { value: '', label: '選択' },
    { value: '0', label: '0人' },
    { value: '1', label: '1人' },
    { value: '2', label: '2人' },
    { value: '3', label: '3人以上' }
  ],
  oldestChildAgeRange: [
    { value: '', label: '選択' },
    { value: 'none', label: '該当なし' },
    { value: 'preschool', label: '未就学' },
    { value: 'elementary', label: '小学生' },
    { value: 'junior', label: '中学生' },
    { value: 'high', label: '高校生' },
    { value: 'university', label: '大学生以上' }
  ],
  yesNo: [
    { value: '', label: '選択' },
    { value: 'yes', label: 'いる・ある' },
    { value: 'no', label: 'いない・ない' }
  ],
  incomeOutlook: [
    { value: '', label: '選択' },
    { value: 'increase', label: '増加見込み' },
    { value: 'flat', label: '横ばい' },
    { value: 'decrease', label: '減少見込み' },
    { value: 'uncertain', label: '不安定・不明' }
  ],
  incomeSource: [
    { value: '', label: '選択' },
    { value: 'salary_only', label: '給与のみ' },
    { value: 'salary_bonus', label: '給与+賞与' },
    { value: 'self_employed', label: '自営・事業' },
    { value: 'pension', label: '年金' },
    { value: 'multiple', label: '複数・その他' }
  ],
  bonusFrequency: [
    { value: '', label: '選択' },
    { value: 'twice', label: '年2回' },
    { value: 'once', label: '年1回' },
    { value: 'none', label: 'なし・不定' }
  ],
  employment: [
    { value: '', label: '選択' },
    { value: 'regular', label: '正社員' },
    { value: 'contract', label: '契約・派遣' },
    { value: 'self_employed', label: '自営' },
    { value: 'homemaker', label: '専業主婦・主夫' },
    { value: 'other', label: '無職・その他' }
  ],
  pensionOutlook: [
    { value: '', label: '選択' },
    { value: '20', label: '月20万円未満' },
    { value: '20_30', label: '月20〜30万円' },
    { value: '30_40', label: '月30〜40万円' },
    { value: '40', label: '月40万円以上' },
    { value: 'unknown', label: '不明・考えていない' }
  ],
  housingType: [
    { value: '', label: '選択' },
    { value: 'owned_house', label: '持ち家（戸建）' },
    { value: 'owned_condo', label: '持ち家（マンション等）' },
    { value: 'rent', label: '賃貸' },
    { value: 'parents', label: '実家' },
    { value: 'other', label: 'その他' }
  ],
  loanRateType: [
    { value: '', label: '選択' },
    { value: 'fixed', label: '固定金利' },
    { value: 'variable', label: '変動金利' },
    { value: 'mixed', label: '固定・変動の混合' },
    { value: 'unknown', label: 'わからない' }
  ],
  rentToOwnPlan: [
    { value: '', label: '選択' },
    { value: 'within_5', label: '5年以内に検討' },
    { value: '5_10', label: '5〜10年以内に検討' },
    { value: '10_later', label: '10年以降・未定' },
    { value: 'no_plan', label: '購入予定なし' }
  ],
  lifeInsurance: [
    { value: '', label: '選択' },
    { value: 'death_only', label: '死亡保障のみ' },
    { value: 'death_illness', label: '死亡・病気・介護' },
    { value: 'minimal', label: '最低限のみ・ほぼなし' },
    { value: 'none', label: '加入なし' },
    { value: 'unknown', label: 'わからない' }
  ],
  medicalInsurance: [
    { value: '', label: '選択' },
    { value: 'corporate', label: '会社の医療・がん保険あり' },
    { value: 'individual', label: '個人で医療・がん保険加入' },
    { value: 'both', label: '両方' },
    { value: 'none', label: 'なし' },
    { value: 'unknown', label: 'わからない' }
  ],
  childrenEducation: [
    { value: '', label: '選択' },
    { value: 'public', label: 'すべて公立想定' },
    { value: 'private_some', label: '一部私立を検討' },
    { value: 'private_all', label: '私立中心で検討' },
    { value: 'undecided', label: '未定・子供いない' }
  ],
  educationSavingsStatus: [
    { value: '', label: '選択' },
    { value: 'saving', label: 'すでに準備中' },
    { value: 'will_start', label: 'これから始める' },
    { value: 'not_yet', label: 'まだ考えていない' },
    { value: 'na', label: '該当なし' }
  ],
  carOwnership: [
    { value: '', label: '選択' },
    { value: 'one', label: '1台保有' },
    { value: 'two', label: '2台保有' },
    { value: 'plan_to_buy', label: '購入予定あり' },
    { value: 'none', label: 'なし・予定なし' }
  ],
  largeExpensePlan: [
    { value: '', label: '選択' },
    { value: 'none', label: '特になし' },
    { value: 'house', label: '住宅購入・リフォーム' },
    { value: 'car', label: '車の買い替え' },
    { value: 'wedding', label: '結婚・結婚式' },
    { value: 'education', label: '教育（留学等）' },
    { value: 'other', label: 'その他' }
  ],
  desiredRetirementAge: [
    { value: '', label: '選択' },
    { value: '50s', label: '50代' },
    { value: '60', label: '60歳前後' },
    { value: '65', label: '65歳前後' },
    { value: '70', label: '70歳前後' },
    { value: 'undecided', label: '未定' }
  ],
  visitParentsFrequency: [
    { value: '', label: '選択' },
    { value: 'none', label: 'ほぼなし' },
    { value: 'yearly_once', label: '年1回程度' },
    { value: 'yearly_2_3', label: '年2〜3回' },
    { value: 'quarterly', label: '年4回以上' },
    { value: 'na', label: '該当なし' }
  ],
  travelFrequency: [
    { value: '', label: '選択' },
    { value: 'none', label: 'ほぼなし' },
    { value: 'yearly_once', label: '年1回程度' },
    { value: 'yearly_2_3', label: '年2〜3回' },
    { value: 'more', label: '年4回以上' }
  ],
  futureGoals: [
    { value: '', label: '選択' },
    { value: 'travel_abroad', label: '海外旅行' },
    { value: 'house_purchase', label: 'マイホーム購入' },
    { value: 'early_retirement', label: '早期リタイア' },
    { value: 'children_education', label: '子供の教育' },
    { value: 'stable_life', label: '安定した老後' },
    { value: 'multiple', label: '複数・その他' }
  ]
} as const;

/** FP診断フォームの初期値 */
export const INITIAL_FP_FORM = {
  householdType: '',
  myBirthDate: '',
  spouseBirthDate: '',
  numberOfChildren: '',
  childBirthDates: [],
  dependentsOtherThanChildren: '',
  currentAnnualIncome: '',
  incomeOutlook: '',
  incomeSource: '',
  bonusFrequency: '',
  myEmployment: '',
  spouseEmployment: '',
  hasSeverance: '',
  pensionOutlook: '',
  housingType: '',
  loanRemaining: '',
  monthlyRepayment: '',
  loanRateType: '',
  loanInterestRate: '',
  monthlyRent: '',
  rentToOwnPlan: '',
  lifeInsurance: '',
  medicalInsurance: '',
  childrenEducation: '',
  educationSavingsStatus: '',
  carOwnership: '',
  largeExpensePlan: '',
  desiredRetirementAge: '',
  retirementMonthlyTarget: '',
  visitParentsFrequency: '',
  travelFrequency: '',
  futureGoals: '',
  otherNotes: ''
};
