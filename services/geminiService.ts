
import { GoogleGenAI } from "@google/genai";
import { AppState, FPDiagnosisForm, DetailItem } from "../types";
import { FP_OPTIONS } from "../constants";

function sumDetails(items: DetailItem[]): number {
  return items.reduce((s, i) => s + (i.amount ?? 0), 0);
}

/** アプリ全体の収支・積立・資産情報をテキストでまとめる（FP診断用） */
function buildAppSummaryForFP(state: AppState): string {
  const records = [...state.records].sort((a, b) => (a.year * 12 + a.month) - (b.year * 12 + b.month));
  const recent = records.slice(-24); // 直近24ヶ月（最大）
  const n = recent.length;

  const lines: string[] = [];

  // 資産（直近）
  const latestRecord = records.length ? records[records.length - 1] : null;
  if (latestRecord) {
    const totalAssets = sumDetails(latestRecord.assets);
    lines.push(`・直近の資産合計: ${totalAssets.toLocaleString()}円`);
    const breakdown = latestRecord.assets.filter(a => (a.amount ?? 0) > 0).map(a => `${a.label}: ${(a.amount ?? 0).toLocaleString()}円`).join("、");
    lines.push(`・資産内訳: ${breakdown || "なし"}`);
  } else {
    lines.push("・直近の資産: データなし");
  }

  // 月次収入（平均・内訳）
  if (n > 0) {
    const incomeByLabel: Record<string, number> = {};
    let totalIncomeSum = 0;
    recent.forEach(r => {
      const monthIncome = sumDetails(r.incomeDetails);
      totalIncomeSum += monthIncome;
      r.incomeDetails.forEach(i => {
        const amt = i.amount ?? 0;
        incomeByLabel[i.label] = (incomeByLabel[i.label] ?? 0) + amt;
      });
    });
    const avgIncome = Math.round(totalIncomeSum / n);
    lines.push(`・月次収入の平均（直近${n}ヶ月）: ${avgIncome.toLocaleString()}円/月（年換算約${(avgIncome * 12 / 10000).toFixed(0)}万円）`);
    const incomeBreakdown = Object.entries(incomeByLabel)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([label, v]) => `${label}: 月平均${Math.round(v / n).toLocaleString()}円`)
      .join("、");
    if (incomeBreakdown) lines.push(`・収入内訳: ${incomeBreakdown}`);
  }

  // 月次支出（平均・内訳）
  if (n > 0) {
    const expenseByLabel: Record<string, number> = {};
    let totalExpenseSum = 0;
    recent.forEach(r => {
      const monthExpense = sumDetails(r.expenseDetails);
      totalExpenseSum += monthExpense;
      r.expenseDetails.forEach(i => {
        const amt = i.amount ?? 0;
        expenseByLabel[i.label] = (expenseByLabel[i.label] ?? 0) + amt;
      });
    });
    const avgExpense = Math.round(totalExpenseSum / n);
    lines.push(`・月次支出の平均（直近${n}ヶ月）: ${avgExpense.toLocaleString()}円/月`);
    const expenseBreakdown = Object.entries(expenseByLabel)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([label, v]) => `${label}: 月平均${Math.round(v / n).toLocaleString()}円`)
      .join("、");
    if (expenseBreakdown) lines.push(`・支出内訳: ${expenseBreakdown}`);
  }

  // 月次積立（平均・積立ている商品＝内訳）
  if (n > 0) {
    const savingsByLabel: Record<string, number> = {};
    let totalSavingsSum = 0;
    recent.forEach(r => {
      const monthSavings = sumDetails(r.savingsDetails);
      totalSavingsSum += monthSavings;
      r.savingsDetails.forEach(i => {
        const amt = i.amount ?? 0;
        savingsByLabel[i.label] = (savingsByLabel[i.label] ?? 0) + amt;
      });
    });
    const avgSavings = Math.round(totalSavingsSum / n);
    lines.push(`・月次積立の平均（直近${n}ヶ月）: ${avgSavings.toLocaleString()}円/月（積立ペース）`);
    const savingsBreakdown = Object.entries(savingsByLabel)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([label, v]) => `${label}: 月平均${Math.round(v / n).toLocaleString()}円`)
      .join("、");
    if (savingsBreakdown) lines.push(`・積立内訳（積立ている商品）: ${savingsBreakdown}`);
  }

  // 目的別貯蓄
  if (state.purposeSavings.length) {
    lines.push(`・目的別貯蓄の目標: ${state.purposeSavings.map(g => `${g.name} 目標${(g.targetAmount / 10000).toFixed(0)}万円（${g.targetYear}年${g.targetMonth}月）`).join("、")}`);
  } else {
    lines.push("・目的別貯蓄の目標: なし");
  }

  return lines.join("\n");
}

const ENV_API_KEY =
  (process.env as any)?.GEMINI_API_KEY ??
  (process.env as any)?.API_KEY;

type GeminiErrorPayload =
  | {
      error?: {
        code?: number;
        message?: string;
        status?: string;
        details?: any[];
      };
    }
  | undefined;

function getStoredGeminiApiKey(): string | undefined {
  try {
    const v = localStorage.getItem("GEMINI_API_KEY");
    return v ? v : undefined;
  } catch {
    return undefined;
  }
}

function normalizeGeminiApiKey(input: string | undefined): string | undefined {
  if (!input) return undefined;

  // 改行/スペース混入（コピー時によくある）を除去
  let key = input.replace(/\s+/g, "").trim();

  // 例: GEMINI_API_KEY=xxxx を丸ごと貼った場合
  const eqIdx = key.lastIndexOf("=");
  if (eqIdx !== -1 && /^[A-Z0-9_]+=/i.test(key)) {
    key = key.slice(eqIdx + 1);
  }

  // 例: "xxxx" や 'xxxx'
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }

  return key || undefined;
}

function getStoredGeminiModel(): string | undefined {
  try {
    const v = localStorage.getItem("GEMINI_MODEL");
    return v ? v : undefined;
  } catch {
    return undefined;
  }
}

function extractGeminiErrorPayload(err: unknown): GeminiErrorPayload {
  const msg =
    typeof err === "string"
      ? err
      : err && typeof err === "object" && "message" in err && typeof (err as any).message === "string"
        ? (err as any).message
        : undefined;

  if (!msg) return undefined;

  // 例: 'ApiError: {"error":{...}}' のような形式から JSON を抜く
  const firstBrace = msg.indexOf("{");
  const lastBrace = msg.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return undefined;

  const jsonStr = msg.slice(firstBrace, lastBrace + 1);
  try {
    return JSON.parse(jsonStr) as GeminiErrorPayload;
  } catch {
    return undefined;
  }
}

function extractRetrySeconds(payload: GeminiErrorPayload): number | undefined {
  const retryInfo = payload?.error?.details?.find((d) => d?.["@type"]?.includes("RetryInfo"));
  const retryDelay: string | undefined = retryInfo?.retryDelay;
  if (!retryDelay) return undefined;
  // "34s" 形式
  const m = /^(\d+)(?:\.\d+)?s$/.exec(retryDelay);
  if (!m) return undefined;
  return Number(m[1]);
}

function formatGeminiError(err: unknown): string {
  const payload = extractGeminiErrorPayload(err);
  const code = payload?.error?.code;
  const status = payload?.error?.status;
  const message = payload?.error?.message;

  // よくあるケースを日本語で分岐
  if (status === "RESOURCE_EXHAUSTED" || code === 429) {
    const retrySec = extractRetrySeconds(payload);
    const retryText = retrySec ? `（約${retrySec}秒後に再試行できます）` : "";
    return [
      "Gemini API の利用上限（クォータ）に達しました。",
      retryText,
      "プラン/課金/クォータ設定をご確認ください。",
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (status === "INVALID_ARGUMENT" || code === 400) {
    // APIキー不正 / モデル名不正 / パラメータ不正など
    if (message?.toLowerCase().includes("api key")) {
      return "Gemini APIキーが無効です。設定タブの APIキーを確認して保存し直してください。（`GEMINI_API_KEY=...` を丸ごと貼っていないか、余計な空白/改行/引用符がないかも確認）";
    }
    if (message?.toLowerCase().includes("model")) {
      return "モデル名が無効です。設定タブの「モデル」を見直してください。（例: gemini-2.0-flash）";
    }
    return "リクエストが不正として拒否されました。APIキー/モデル名/入力内容をご確認ください。";
  }

  if (status === "PERMISSION_DENIED" || code === 403) {
    return "権限エラーで Gemini を呼び出せませんでした。APIキーの制限（HTTPリファラ制限等）やプロジェクト設定をご確認ください。";
  }

  // フォールバック: 可能なら Gemini のメッセージを併記
  const detail = message ? `（詳細: ${message}）` : "";
  return `申し訳ありません。現在アドバイスを生成できません。${detail}`;
}

export const analyzeFinance = async (state: AppState) => {
  const apiKey = normalizeGeminiApiKey(getStoredGeminiApiKey() ?? ENV_API_KEY);
  if (!apiKey || apiKey === "PLACEHOLDER_API_KEY") {
    return "Gemini APIキーが未設定です。設定タブで「Gemini APIキー」を保存してから、もう一度お試しください。";
  }

  const model = getStoredGeminiModel() ?? "gemini-2.0-flash";

  const latestRecord = state.records.length
    ? [...state.records].sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month))[0]
    : null;
  const totalAssets = latestRecord ? latestRecord.assets.reduce((s, a) => s + (a.amount ?? 0), 0) : 0;
  const assetLabels = latestRecord
    ? latestRecord.assets.filter(a => (a.amount ?? 0) > 0).map(a => `${a.label}: ${(a.amount ?? 0).toLocaleString()}円`).join("、")
    : "データなし";
  const recentMonths = state.records.length
    ? [...state.records].sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month)).slice(0, 6)
    : [];

  const prompt = `
あなたはプロのファイナンシャルプランナー（CFP®級）です。
役割: **短いスパン（数ヶ月〜1年）で取りうる推奨アクション**を、国内外の資産運用・家計にまつわる**最新のニュースや制度動向**も参照しながら提案してください。

【クライアントの資産・収支の概要】
- 直近の資産合計: ${totalAssets.toLocaleString()}円
- 資産内訳: ${assetLabels}
- 直近の月次データ（収入・支出・積立）: ${JSON.stringify(recentMonths.map(r => ({ 年月: `${r.year}/${r.month}`, 収入: r.incomeDetails.reduce((s, i) => s + (i.amount ?? 0), 0), 支出: r.expenseDetails.reduce((s, i) => s + (i.amount ?? 0), 0), 積立: r.savingsDetails.reduce((s, i) => s + (i.amount ?? 0), 0) })))}
- 目的別貯蓄の目標: ${state.purposeSavings.length ? state.purposeSavings.map(g => `${g.name} 目標${(g.targetAmount / 10000).toFixed(0)}万円`).join("、") : "なし"}

【指示】
1. **最新情報の参照**: 日本・海外の資産運用、税制、社会保障（年金・医療・高額療養費制度など）、金融商品、景気・金利・為替などに関する**直近のニュースや制度改正の動き**を検索し、必要に応じて参照してください。例: 高額療養費制度の見直しが報じられていれば、民間医療保険の検討を促すなど、ニュースに紐づけた提案をしてください。
2. **短いスパンの推奨アクション**: FP診断は中長期のライフプラン向けなので、ここでは「これから数ヶ月〜1年でやるとよいこと」に絞ってください。具体的なアクション（例: 今月からNISAの積立額を見直す、〇月までに医療保険の見直しを検討する、など）を2〜4個、簡潔に挙げてください。
3. **多角的な視点**: 資産配分・節税・保険・住宅ローン・教育費・老後資金・キャッシュフローなど、プロのFPとして多様な角度から触れ、そのうち特に「今のニュース・制度と結びついている点」を明示してください。
4. **文体**: 日本語。箇条書きと短文を中心に、読みやすくまとめてください。参照したニュースや制度がある場合は、その旨を一言添えてください（例: 「高額療養費制度の見直し議論を踏まえ、民間医療保険の見直しを検討してもよいかもしれません」）。
`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
    return response.text || "Gemini からテキストの応答が返りませんでした。";
  } catch (error) {
    console.error("AI Analysis failed", error);
    return formatGeminiError(error);
  }
};

/** 会話1ターン（追加質問のやりとり用） */
export interface FPDiagnosisTurn {
  role: 'user' | 'assistant';
  content: string;
}

/** FP診断: 質問回答と家計データから資産形成の診断を行う。会話履歴を渡すと追加質問への回答後に診断を出力する */
export const analyzeFPDiagnosis = async (
  state: AppState,
  form: FPDiagnosisForm,
  conversationHistory?: FPDiagnosisTurn[]
) => {
  const apiKey = normalizeGeminiApiKey(getStoredGeminiApiKey() ?? ENV_API_KEY);
  if (!apiKey || apiKey === "PLACEHOLDER_API_KEY") {
    return "Gemini APIキーが未設定です。設定タブで「Gemini APIキー」を保存してから、もう一度お試しください。";
  }

  const model = getStoredGeminiModel() ?? "gemini-2.0-flash";

  const appSummary = buildAppSummaryForFP(state);

  const lbl = (opts: readonly { value: string; label: string }[], v: string) => (v && opts.find(o => o.value === v)?.label) || "未回答";

  const ageFromBirthDate = (birthDate: string): number | undefined => {
    if (!birthDate || birthDate.length < 4) return undefined;
    const d = new Date(birthDate);
    if (Number.isNaN(d.getTime())) return undefined;
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1;
    return age >= 0 ? age : undefined;
  };
  const fmtBirth = (birth: string) => {
    if (!birth) return "未回答";
    const age = ageFromBirthDate(birth);
    return age != null ? `${birth}（現在${age}歳）` : birth;
  };

  const formLines = [
    "【世帯・家族】",
    `世帯形態: ${lbl(FP_OPTIONS.householdType, form.householdType)}`,
    `ご本人の生年月日: ${fmtBirth(form.myBirthDate)}`,
    `配偶者の生年月日: ${fmtBirth(form.spouseBirthDate)}`,
    `お子様: ${lbl(FP_OPTIONS.numberOfChildren, form.numberOfChildren)}${(form.childBirthDates && form.childBirthDates.length > 0) ? form.childBirthDates.filter(Boolean).map((b, i) => `、お子様${i + 1}: ${fmtBirth(b)}`).join("") : ""}`,
    `扶養親族（父母等）: ${lbl(FP_OPTIONS.yesNo, form.dependentsOtherThanChildren)}`,
    "",
    "【収入】",
    `世帯年収（現在）: ${form.currentAnnualIncome ? form.currentAnnualIncome + "万円" : "未回答"}`,
    `年収の見通し: ${lbl(FP_OPTIONS.incomeOutlook, form.incomeOutlook)}`,
    `収入源: ${lbl(FP_OPTIONS.incomeSource, form.incomeSource)}、賞与: ${lbl(FP_OPTIONS.bonusFrequency, form.bonusFrequency)}`,
    "",
    "【就労・雇用】",
    `勤務形態: 本人${lbl(FP_OPTIONS.employment, form.myEmployment)}、配偶者${lbl(FP_OPTIONS.employment, form.spouseEmployment)}`,
    `退職金制度: ${lbl(FP_OPTIONS.yesNo, form.hasSeverance)}、公的年金見込み: ${lbl(FP_OPTIONS.pensionOutlook, form.pensionOutlook)}`,
    "",
    "【住居】",
    `形態: ${lbl(FP_OPTIONS.housingType, form.housingType)}`,
    ...((form.housingType === "owned_house" || form.housingType === "owned_condo") ? [
      `ローン残高: ${form.loanRemaining ? form.loanRemaining + "万円" : "未回答"}、月返済: ${form.monthlyRepayment ? form.monthlyRepayment + "円" : "未回答"}`,
      `金利: ${lbl(FP_OPTIONS.loanRateType, form.loanRateType)} ${form.loanInterestRate ? form.loanInterestRate + "%" : ""}`
    ] : []),
    ...(form.housingType === "rent" ? [
      `月額家賃: ${form.monthlyRent ? form.monthlyRent + "円" : "未回答"}、購入予定: ${lbl(FP_OPTIONS.rentToOwnPlan, form.rentToOwnPlan)}`
    ] : []),
    "",
    "【保障・保険】",
    `生命保険: ${lbl(FP_OPTIONS.lifeInsurance, form.lifeInsurance)}、医療・がん: ${lbl(FP_OPTIONS.medicalInsurance, form.medicalInsurance)}`,
    "",
    "【教育】",
    `教育方針: ${lbl(FP_OPTIONS.childrenEducation, form.childrenEducation)}、準備状況: ${lbl(FP_OPTIONS.educationSavingsStatus, form.educationSavingsStatus)}`,
    "",
    "【車・大型支出】",
    `車: ${lbl(FP_OPTIONS.carOwnership, form.carOwnership)}、5年以内の大型支出: ${lbl(FP_OPTIONS.largeExpensePlan, form.largeExpensePlan)}`,
    "",
    "【老後・リタイア】",
    `希望退職: ${lbl(FP_OPTIONS.desiredRetirementAge, form.desiredRetirementAge)}、老後月額目標: ${form.retirementMonthlyTarget ? form.retirementMonthlyTarget + "円" : "未回答"}`,
    "",
    "【ライフイベント】",
    `帰省: ${lbl(FP_OPTIONS.visitParentsFrequency, form.visitParentsFrequency)}、旅行: ${lbl(FP_OPTIONS.travelFrequency, form.travelFrequency)}、将来の希望: ${lbl(FP_OPTIONS.futureGoals, form.futureGoals)}`,
    "",
    "【その他・補足】",
    form.otherNotes || "（なし）"
  ];

  const isFollowUp = conversationHistory && conversationHistory.length > 0;

  const prompt = isFollowUp
    ? `
あなたはトップクラスのファイナンシャルプランナー（CFP®など）です。
あなたが追加で質問し、クライアントが回答しました。以下に「初回のヒアリング回答」「アプリデータ」「会話履歴」をまとめます。これで情報が揃ったので、診断結果を出力してください。

【クライアントの初回ヒアリング回答】
${formLines.join("\n")}

【アプリ全体の情報】
${appSummary}

【会話履歴（あなたの追加質問 → クライアントの回答）】
${conversationHistory!.map(t => (t.role === 'assistant' ? 'FP: ' : 'クライアント: ') + t.content).join("\n\n")}

【指示】
必ず1行目に「【診断結果】」とだけ書いて改行し、2行目以降に診断内容を書いてください。追加の質問はせず、診断のみ出力してください。
1. 総合所見（資産形成に問題ないか、リスクはないか）
2. 世帯・収入・住居・教育・老後などに照らした資金計画の妥当性
3. 具体的な改善提案（あれば2〜3点）
4. 持ち家・教育・保険・イベントなどで気をつけるべき点
専門家らしく、根拠を簡潔に示しつつ、読みやすい文章でまとめてください。箇条書きと短文を活用してください。
`
    : `
あなたはトップクラスのファイナンシャルプランナー（CFP®など）です。
以下の「クライアントヒアリング項目への回答」と「アプリに登録されている資産・収支の概要」をもとに、資産形成の診断を行います。

【重要】まず、診断に必要な情報が十分かどうか判断してください。

・情報が十分で、このまま診断できる場合：
  1行目に「【診断結果】」とだけ書いて改行し、2行目以降に診断内容を書いてください。

・情報が足りないと判断した場合（不明点・確認したいことがある場合）：
  1行目に「【追加質問】」とだけ書いて改行し、2行目以降に番号付きで1〜3個の質問を書いてください。診断は書かず、質問だけにしてください。例：「1. 住宅ローンは残り何年程度の予定でしょうか？」

${formLines.join("\n")}

【アプリ全体の情報（他タブの資産・収支・積立データ）】
${appSummary}

【診断結果を書く場合の内容】
1. 総合所見（資産形成に問題ないか、リスクはないか）
2. 世帯・収入・住居・教育・老後などに照らした資金計画の妥当性
3. 具体的な改善提案（あれば2〜3点）
4. 持ち家・教育・保険・イベントなどで気をつけるべき点
専門家らしく、根拠を簡潔に示しつつ、読みやすい文章でまとめてください。箇条書きと短文を活用してください。
`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    return response.text || "Gemini から診断結果が返りませんでした。";
  } catch (error) {
    console.error("FP Diagnosis failed", error);
    return formatGeminiError(error);
  }
};
