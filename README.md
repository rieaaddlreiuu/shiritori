# しりとり

Deno で作成した、ブラウザ上で遊べる日本語のしりとりゲームです。
入力された単語がしりとりのルールに従っているか、辞書に実在するかをサーバー側で判定します。

## 動作確認URL

- デプロイ先:
  [https://shiritori-fgb3ktbksjra.iise2xqyz.deno.net/](https://shiritori-fgb3ktbksjra.iise2xqyz.deno.net/)
- ローカル: [http://localhost:8000](http://localhost:8000)

## 実装した機能

### しりとりの判定

- 直前の単語の末尾と、次の単語の先頭がつながっているかを判定します。
- 同じ単語が既に使用されている場合はゲームオーバーにします。
- 「ん」で終わる単語が入力された場合はゲームオーバーにします。
- 「ゃ・ゅ・ょ」などの小書き文字に対応しています。例えば「しやくしょ →
  しょくいん」は正しいつながりとして判定します。
- 長音記号「ー」で終わる単語は、直前の文字とその母音のどちらからでもつなげられます。

### 単語の実在チェック

- JMdict（一般語）と JMnedict（固有名詞）の `kana[].text`
  から、約59万語の読みだけを `dictionary/words.txt` へ事前に抽出しています。
- サーバー起動時は巨大な元JSONを解析せず、約11.6MBの `words.txt` から検索用
  `Set` を作成します。
- 辞書にカタカナで登録された読みも、ひらがなに変換してから登録します。そのため、例えば辞書上の「ラーメン」を「らーめん」と入力できます。
- 検索に `Set.has()`
  を使うことで、入力のたびに辞書全体を走査しない構成にしています。
- 辞書に存在しない単語には、エラーコード `10002` とメッセージを JSON
  で返します。

### 履歴とリセット

- 使用した単語をサーバー側で履歴として保持し、新しい順に画面へ表示します。
- 履歴は詳細要素を開いたときだけ表示されます。
- リセットボタンで初期単語「しりとり」に戻し、ゲームを再開できます。
- Enter キーでも単語を送信できます。

## デザイン

- 入力欄、送信ボタン、リセットボタンを中央にまとめたシンプルな1カラム構成です。
- 入力欄は下線とフローティングラベルを用い、入力中であることが分かりやすいデザインにしています。
- ボタンは水色を基調とし、マウスオーバー時に色が変化します。
- ゲームオーバー時は入力欄と送信ボタンを非表示にし、現在の状態を明確に表示します。

## API

| メソッド | パス             | 説明                                         |
| -------- | ---------------- | -------------------------------------------- |
| `GET`    | `/shiritori`     | 現在の単語を取得                             |
| `POST`   | `/shiritori`     | `{"nextWord":"りんご"}` 形式で次の単語を送信 |
| `GET`    | `/wordHistories` | 単語履歴を JSON で取得                       |
| `DELETE` | `/wordHistories` | 単語履歴とゲーム状態をリセット               |

## ローカルでの実行方法

### 必要なもの

- Deno
- `dictionary/words.txt`

### 起動

```sh
deno run --allow-net --allow-read server.js
```

起動後、[http://localhost:8000](http://localhost:8000) をブラウザで開きます。

### 軽量辞書の再生成

元の JMdict/JMnedict JSON を更新した場合は、次のコマンドで `words.txt`
を再生成します。

```sh
deno run --allow-read --allow-write=./dictionary/words.txt build_dictionary.js
```

元JSONはGitとDeployの対象外です。`words.txt` だけがDeploy先に含まれます。

## 参考にしたWebサイト

- [Deno Docs: Writing an HTTP Server](https://docs.deno.com/runtime/fundamentals/http_server/)
  - `Deno.serve()` による HTTP サーバーと `serveDir()`
    による静的ファイル配信の実装で参考にしました。
- [Deno Docs: Deno.readTextFile](https://docs.deno.com/api/deno/~/Deno.readTextFile)
  - サーバー側で JSON 辞書ファイルを読み込む際に参考にしました。
- [scriptin/jmdict-simplified](https://github.com/scriptin/jmdict-simplified)
  - JMdict および JMnedict を扱いやすい JSON 形式で利用しました。

## AIの活用

OpenAI の Codex を以下の用途で使用しました。

- **実在チェック機能の実装**
  - JMdict と JMnedict の JSON
    構造を確認し、必要な読みだけを軽量辞書へ抽出して検索用 `Set`
    に登録する処理の実装に使用しました。
  - カタカナで登録された辞書の読みを、入力形式に合わせてひらがなへ正規化する処理の実装に使用しました。
  - 未登録語を検出し、HTTP 400 と JSON
    形式のエラーを返す処理の実装に使用しました。
- **Deno Deploy向けの辞書軽量化**
  - Deploy失敗の原因調査にAIを使用し、元の辞書ファイルが `.gitignore`
    の対象であることと、巨大なJSONの読み込みがDeploy先のメモリを大きく消費する問題を確認しました。
  - Deno Deploy
    CLIの認証状態と既存アプリをAIで確認し、同じslugでの再作成ではなく、既存の
    `shiritori` アプリを指定して更新するデプロイ方法を調査しました。
  - 合計約427MBの JMdict/JMnedict から、ひらがなの読み593,774語だけを抽出する
    `build_dictionary.js` の実装にAIを使用しました。
  - 生成した約11.6MBの `dictionary/words.txt`
    だけをDeploy対象とし、元JSONをDeploy対象外に保つ `.gitignore`
    の設定にAIを使用しました。
  - サーバー起動時に元JSONを解析する方式から、軽量辞書を直接 `Set`
    へ読み込む方式への変更にAIを使用しました。
- **全般的なデバッグ**
  - 小書き文字で終わる単語の比較範囲の誤りを調査し、「しやくしょ →
    しょくいん」が正しく判定されるよう修正するために使用しました。
  - 長音記号の判定、母音取得処理、入力エラー処理の確認と修正に使用しました。
  - `deno check`
    による構文確認と、代表的な入力例を使った動作確認に使用しました。

AI
が出力したコードはそのまま採用せず、実際の辞書データと入力例を用いて動作を確認しました。
