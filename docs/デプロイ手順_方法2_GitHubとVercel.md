# デプロイ手順（方法2）— 素人でもわかる「GitHub＋Vercelの画面」で公開する

ターミナルの `vercel` コマンドがエラーになる人向けです。  
**GitHub にアプリを置いて、Vercel の画面から「デプロイ」ボタンで公開する**やり方です。番号の順にやってください。

---

## 全体の流れ（3つだけ）

| 順番 | やること | どこでやる |
|------|----------|------------|
| **A** | 家計簿アプリを GitHub に「上げる」（アップロードする） | ターミナル ＋ GitHub のサイト |
| **B** | Vercel にログインする | ブラウザ（Vercel のサイト） |
| **C** | Vercel で「GitHub のアプリをデプロイする」 | ブラウザ（Vercel のサイト） |

終わると **URL（例：https://kakeibo-app-xxx.vercel.app）** がもらえて、そのURLを開くと家計簿アプリが表示されます。

---

## 準備：必要なもの

- パソコン（いま家計簿アプリがあるもの）
- インターネット
- **GitHub のアカウント**（ない人は「A-0」で作る）
- **Vercel のアカウント**（「B」で作る）

---

## A. 家計簿アプリを GitHub に上げる

### A-0. GitHub のアカウントを作る（まだの人だけ）

1. ブラウザで **https://github.com** を開く。
2. 右上の **「Sign up」** を押す。
3. メール・パスワード・ユーザー名を入れて、**「Create account」** を押す。
4. 届いたメールの指示で認証する。
5. すでにアカウントがある人は、この A-0 はとばしてOK。

---

### A-1. GitHub の「入れ物」を1つ作る

GitHub 上に「家計簿アプリ用の入れ物（リポジトリ）」を1つ作ります。

1. **https://github.com** にログインする。
2. 画面右上の **「+」** を押す → **「New repository」** を選ぶ。
3. **Repository name** に **`kakeibo-app`** と入力する（そのままコピーしてOK）。
4. **Public** のままにする。
5. **「Create repository」** を押す。
6. 次の画面に「…or push an existing repository from the command line」と出る。**この画面を開いたまま**にしておく（あとでターミナルから送り込むため）。

---

### A-2. ターミナルで「家計簿アプリのフォルダ」に移動する

1. **ターミナル**を開く。  
   - Mac：Spotlight（虫眼鏡）で「ターミナル」と入力 → **ターミナル** を選ぶ。
2. 次のコマンドを **1行ずつ** 打って、Enter を押す。
   ```bash
   cd "/Users/daisukechiba/Documents/家計簿アプリ"
   ```
   - うまくいくと、行の先頭に `家計簿アプリ` のような表示が出る。
   - **パスが違う場合**：`cd ` まで打ったあと、Finder の「家計簿アプリ」フォルダをターミナルに**ドラッグ＆ドロップ**するとパスが入る。そのあと Enter。

---

### A-3. 家計簿アプリを GitHub に送る

次のコマンドを **上から順に、1行ずつ** 打って Enter を押す。

**① 全部のファイルを「送る準備」にする**
```bash
git add .
```

**② 「はじめての保存」という名前で記録する**
```bash
git commit -m "はじめての保存"
```
※ すでに commit 済みの場合は「nothing to commit」と出ることがある。その場合はそのまま次へ。

**③ メインの枝の名前を main にする**
```bash
git branch -M main
```

**④ GitHub の「入れ物」の住所を教える**

ここは **あなたの GitHub のユーザー名** に書き換える必要があります。

- GitHub の画面で、作ったリポジトリのページを開く。
- 緑色の **「Code」** ボタンを押す。
- 「HTTPS」のところに  
  `https://github.com/ユーザー名/kakeibo-app.git`  
  のような URL が出ている。その **ユーザー名** をメモする。

ターミナルで次のコマンドを打つ（**`あなたのGitHubのユーザー名`** のところを、メモしたユーザー名に変える）：
```bash
git remote add origin https://github.com/あなたのGitHubのユーザー名/kakeibo-app.git
```
※ すでに `origin` があるとエラーになる場合がある。そのときは  
`git remote remove origin` を打ってから、もう一度 `git remote add origin ...` を打つ。

**⑤ GitHub に送る**
```bash
git push -u origin main
```
- GitHub の **ユーザー名** と **パスワード** を聞かれたら入力する。
- パスワードの代わりに「Personal Access Token」を求められた場合は、GitHub の設定でトークンを作成して、それを入力する。

**⑥ 確認**

ブラウザで **https://github.com/あなたのユーザー名/kakeibo-app** を開く。  
家計簿アプリのファイル（`App.tsx` や `package.json` など）が並んでいれば **A は完了**です。

---

## B. Vercel にログインする

1. ブラウザで **https://vercel.com** を開く。
2. **「Sign Up」** を押す。
3. **「Continue with GitHub」** を選ぶ。
4. GitHub の画面で **「Authorize Vercel」** などを押して、「Vercel に GitHub を見る許可を与える」。
5. これで Vercel にログインした状態になる。

---

## C. Vercel で「GitHub の家計簿アプリ」をデプロイする

1. Vercel の画面（ダッシュボード）で、**「Add New…」** を押す。
2. **「Project」** を選ぶ。
3. **「Import Git Repository」** のところに、GitHub のリポジトリの一覧が出る。
4. 一覧から **「kakeibo-app」** を選んで、右側の **「Import」** を押す。
5. 次の画面で：
   - **Framework Preset** が **「Vite」** になっているか確認する（違う場合は **Vite** を選ぶ）。
   - ほかはそのままでOK。
6. **「Deploy」** を押す。
7. 数十秒〜1分ほど待つ。
8. **「Congratulations!」** や **「Your project has been deployed」** と出たら成功。
9. **「Visit」** というボタンが出る。それを押すと、**家計簿アプリが開く**。
10. ブラウザの**アドレス欄のURL**（例：`https://kakeibo-app-xxxx.vercel.app`）が、**あなたの家計簿アプリの住所**です。このURLをメモするか、自分にメールで送っておく。

---

## ここまでできたら

- **パソコン**でも**スマホ**でも、メモした **URL をブラウザで開けば**、同じ家計簿アプリが使えます。
- あとからコードを直したときは、もう一度 **A-3 の ① ② と ⑤**（`git add .` → `git commit -m "更新"` → `git push -u origin main`）を実行してから、Vercel のダッシュボードでそのプロジェクトを開くと、自動で再デプロイされることがあります（設定によっては「Redeploy」ボタンを押す場合もあります）。

---

## よくあるつまずき

| 症状 | 対処 |
|------|------|
| `git push` でパスワードを入れても拒否される | GitHub では「パスワード」の代わりに **Personal Access Token** を使うことがある。GitHub → Settings → Developer settings → Personal access tokens でトークンを作り、そのトークンをパスワードのところに入れる。 |
| 「remote origin already exists」と出る | すでに `origin` が登録されている。`git remote remove origin` を打ってから、もう一度 `git remote add origin https://github.com/ユーザー名/kakeibo-app.git` を打つ。 |
| Vercel の一覧に kakeibo-app が出ない | GitHub で「Authorize Vercel」を押したか確認。出ない場合は、Vercel の「Add New」→「Project」で、もう一度 GitHub の一覧を読み込み直す。 |

不明なところがあれば、どのステップ（A-○ や B、C）で止まったかと、画面やターミナルに表示されたメッセージをメモして、誰かに聞くと伝わりやすいです。
