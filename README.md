# Emotion Games — 感情を、遊ぶ。

birdman studioのショート・ワンアイデア・ブラウザゲーム。SNSの投稿から **個別ゲームへ直接アクセス** できる設計です。

## 公開版
- https://play.birdman-studio.com/
- https://play.birdman-studio.com/kienaide/

## ローカル開発

```sh
npm install
npm run verify
npx serve dist
```

## 作品追加
追加量産は停止中。次の縦切り対象は [制作プレイブック](studio-playbook/README.md) と [依頼書テンプレート](studio-playbook/SLICE-BRIEF-TEMPLATE.md) で固有の体験と品質ゲートを定めてから着手する。技術QA、実機、初見の感情評価を混同しない。

## 独自ドメイン
公開URLは `https://play.birdman-studio.com/`。ビルド時の `PUBLIC_ORIGIN` と公開・共有URLの扱いは [デプロイ手順](docs/DEPLOYMENT.md) を参照。

## マルチエンドと結末図鑑
20作品にそれぞれ5つの結末（計100個）。通常のプレイ以外に、待機・連打・画面タップなどの特殊操作で隠し結末を発見できます。回収状態は端末内に保存し、トップと各ゲームで進捗表示します。詳細は [結末設計](docs/ENDINGS.md) を参照。

## 004｜きえないで。
「消えてほしくない」という感情を、約90秒の夜の旅にした縦持ち短編。風の予兆を読み、長押しで炎をかばい、凪いだら手を離して呼吸を戻す。道中の三つの記憶、四章の物語変化、環境音と反応音、5種類の結末を収録。初回は導入「最後の灯り」（約19秒・いつでもスキップ可）。終盤は「大突風を長押しで耐え、静寂で手をひらく」と窓が光で答える。結末ごとに専用の場面と音がある。

現行の振る舞いは [仕様書](docs/KIENAIDE-SPEC.md)、実装の責務と互換性は [設計書](docs/KIENAIDE-DESIGN.md) を正本とする。今後の変更では [文書更新ワークフロー](docs/DOCUMENTATION-WORKFLOW.md) に従い、影響する文書を同じPRで更新する。

- 構成: `assets/kienaide-core.js`（ルール・決定論的）／`kienaide-view.js`（描画）／`kienaide-audio.js`（音）／`assets/kienaide/paint/`（途中版の画風に統一した絵画レイヤー、`scripts/art/kienaide-paint.mjs` で原本から再生成。アート基準は `assets/kienaide-v3/`）
- QA: `?qa=1` は12倍速。`&seed=` `&speed=` `&t=`（開始秒）`&mem=`（記憶数）はQA・動画収録専用
- 検証: `npm test`、`node scripts/qa-kienaide-visual.mjs chromium|webkit`、`node scripts/capture-kienaide-clip.mjs`（12秒の縦動画）

## 制作方針：量産から縦切りへ
20本は感情とメカニクスを比べる実験候補として保持し、薄い共通ルールの追加量産は止めます。優先作を、物語・固有ループ・視聴覚演出・分岐・収集・再プレイまで通した短編として仕上げます。第一弾は「きえないで。」です。選定根拠と次候補は [縦切り計画](docs/VERTICAL_SLICE.md) を参照してください。

## 20本量産フェーズ（第1期・試作）
5〜20本目は4つの軽量ゲームエンジンを使い分け、全作品が独自の個別URL・タップ/長押し操作・5種類の結末・図鑑に対応します。**完成版ではなく、遊びの芯の検証用MVP**です。映像・アート・バランス調整は公開QA後の第2期に実施します。

| No. | タイトル | 感情 | 個別URL |
|---|---|---|---|
| 001 | ぎりぎり。 | 緊張 | https://play.birdman-studio.com/girigiri/ |
| 002 | あと1個。 | ハラハラ | https://play.birdman-studio.com/ato-hitotsu/ |
| 003 | みちゃだめ。 | 恐怖 | https://play.birdman-studio.com/micha-dame/ |
| 004 | きえないで。 | 切なさ | https://play.birdman-studio.com/kienaide/ |
| 005 | あと一瞬。 | 焦り | https://play.birdman-studio.com/ato-isshun/ |
| 006 | ひかりを追え。 | ワクワク | https://play.birdman-studio.com/hikari-oikake/ |
| 007 | 赤になる前に。 | スリル | https://play.birdman-studio.com/aka-no-mae/ |
| 008 | にじの橋。 | 期待 | https://play.birdman-studio.com/niji-no-hashi/ |
| 009 | ゆれないで。 | 緊張 | https://play.birdman-studio.com/yurenaide/ |
| 010 | とべるかな。 | 期待 | https://play.birdman-studio.com/tobo/ |
| 011 | こぼさないで。 | ヒヤヒヤ | https://play.birdman-studio.com/kobosanai/ |
| 012 | ふくらめ。 | ドキドキ | https://play.birdman-studio.com/fuusen/ |
| 013 | こころのおと。 | くせになる | https://play.birdman-studio.com/kokoro-no-oto/ |
| 014 | ひびき。 | 不安 | https://play.birdman-studio.com/hibiki/ |
| 015 | せーのっ。 | ワクワク | https://play.birdman-studio.com/se-no/ |
| 016 | ほしをつかめ。 | 高揚 | https://play.birdman-studio.com/hoshi-otoshi/ |
| 017 | かさをどうぞ。 | 温かさ | https://play.birdman-studio.com/kasa-o/ |
| 018 | さいごのひとつ。 | 葛藤 | https://play.birdman-studio.com/saigo-hitotsu/ |
| 019 | おくれない手紙。 | 切なさ | https://play.birdman-studio.com/tegami/ |
| 020 | おかえり。 | 感動 | https://play.birdman-studio.com/okaeri/ |

### QA とSNS素材
- CI：`npm test` → `npm run build` → `node scripts/check-build.mjs`
- Chromium：既存4本＋新規16本の操作・図鑑・保存・モバイル2サイズ検証
- GitHub Actions artifact：作品別プレイ録画（WebM、変換可能時MP4）・390pxスクリーンショット・結果画面
- DNSチェック完了・HTTPS・実機確認まではSNS投稿しない

## AI × 感情の実験モード

これは20本を同じ型で量産するだけのサービスではありません。異なるルールをAIで作り、操作で狙った感情が生じるかを実ユーザーで検証します。

- 既存001–004と新実験006/010/014/017：**固有の操作／判定を持つゲーム**
- 残り12本：共通ルールを使う**未差別化の試作**。固有ルールの実装とQAが次段階
- [仮説と測定・実験の限界](docs/RESEARCH.md)
- 調査用URL：`https://play.birdman-studio.com/?study=1` から作品を選ぶ（一般ユーザーには強制しない）
- 回答は端末内に保存。検証モードのトップでJSONを保存し、`npm run study:analyze -- path/to/emotion-games-study.json` で集計できる。外部自動送信はしない。『きえないで。』の手順と合格基準は [初見プレイテスト](docs/KIENAIDE-PLAYTEST.md) を参照。
