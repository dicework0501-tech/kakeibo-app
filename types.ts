
export interface DetailItem {
  id: string;
  label: string;
  amount: number;
  subItems?: DetailItem[];
}

export interface MonthlyRecord {
  id: string;
  year: number;
  month: number;
  incomeDetails: DetailItem[];
  expenseDetails: DetailItem[];
  savingsDetails: DetailItem[];
  assets: DetailItem[];
  updatedAt: string;
}

export interface CloudSettings {
  supabaseUrl: string;
  supabaseKey: string;
  householdId: string;
  enabled: boolean;
}

/** 目的別貯蓄（老後資金・教育資金など） */
export interface PurposeSavingsGoal {
  id: string;
  name: string;
  /** この目的に充てる資産（資産額の DetailItem.id） */
  assetIds: string[];
  targetAmount: number;
  targetYear: number;
  targetMonth: number;
  /** 想定年率（0.03 = 3%）。未設定は0扱い。後方互換用 */
  annualRate?: number;
  /** 資産・内訳ごとの想定年率。キーはラベル（親のみなら "投資信託"、内訳なら "投資信託/内訳名"） */
  assetRates?: Record<string, number>;
}

/** FP診断の質問回答（プロFPヒアリング想定・選択式中心） */
export interface FPDiagnosisForm {
  // --- 世帯・家族 ---
  /** 世帯形態 */
  householdType: string;
  /** ご本人の生年月日（YYYY-MM-DD） */
  myBirthDate: string;
  /** 配偶者の生年月日（YYYY-MM-DD）。いない場合は空 */
  spouseBirthDate: string;
  /** お子様の人数 */
  numberOfChildren: string;
  /** お子様の生年月日（YYYY-MM-DD）の配列。1人目・2人目・3人目…の順 */
  childBirthDates: string[];
  /** 扶養している親族（父母等） */
  dependentsOtherThanChildren: string;

  // --- 収入 ---
  /** 世帯年収（現在・万円） */
  currentAnnualIncome: string;
  /** 世帯年収の見通し */
  incomeOutlook: string;
  /** 主な収入源 */
  incomeSource: string;
  /** 賞与 */
  bonusFrequency: string;

  // --- 就労・雇用 ---
  /** ご本人の勤務形態 */
  myEmployment: string;
  /** 配偶者の勤務形態 */
  spouseEmployment: string;
  /** 退職金制度の有無 */
  hasSeverance: string;
  /** 公的年金の見込み（夫婦合計・月額イメージ） */
  pensionOutlook: string;

  // --- 住居 ---
  /** 住居の形態 */
  housingType: string;
  /** 持ち家: ローン残高（万円） */
  loanRemaining: string;
  /** 持ち家: 月返済額（円） */
  monthlyRepayment: string;
  /** 持ち家: 金利タイプ */
  loanRateType: string;
  /** 持ち家: 金利（%） */
  loanInterestRate: string;
  /** 賃貸: 月額家賃（円） */
  monthlyRent: string;
  /** 賃貸: 将来的な購入予定 */
  rentToOwnPlan: string;

  // --- 保障・保険 ---
  /** 生命保険の有無・役割 */
  lifeInsurance: string;
  /** 医療・がん保険 */
  medicalInsurance: string;

  // --- 教育 ---
  /** お子様の教育方針（進学想定） */
  childrenEducation: string;
  /** 教育資金の準備状況 */
  educationSavingsStatus: string;

  // --- 車・大型支出 ---
  /** 車の保有・予定 */
  carOwnership: string;
  /** 今後5年以内に予定している大型支出（複数選択想定は1項目で） */
  largeExpensePlan: string;

  // --- 老後・リタイア ---
  /** 希望退職時期（年代） */
  desiredRetirementAge: string;
  /** 老後資金の目標（月額イメージ・円） */
  retirementMonthlyTarget: string;

  // --- ライフイベント・その他 ---
  /** 帰省の頻度 */
  visitParentsFrequency: string;
  /** 旅行・レジャーの年間頻度 */
  travelFrequency: string;
  /** 将来やりたいこと（選択式） */
  futureGoals: string;
  /** その他・補足（自由記述・最小限） */
  otherNotes: string;
}

export interface AppState {
  records: MonthlyRecord[];
  purposeSavings: PurposeSavingsGoal[];
  fpDiagnosisForm: FPDiagnosisForm;
  categoryTemplate: {
    income: string[];
    expense: string[];
    savings: string[];
    assets: string[];
  };
  cloudSettings?: CloudSettings;
}
