# Emotion Games — 感情を、遊ぶ。

birdman studioのショート・ワンアイデア・ブラウザゲーム。SNSの投稿から **個別ゲームへ直接アクセス** できる設計です。

## Preview (Pages有効化後)
- https://b-w-hiroki.github.io/emotion-games/
- https://b-w-hiroki.github.io/emotion-games/girigiri/
- https://b-w-hiroki.github.io/emotion-games/ato-hitotsu/
- https://b-w-hiroki.github.io/emotion-games/micha-dame/
- https://b-w-hiroki.github.io/emotion-games/kienaide/

## ローカル開発

```sh
npm install
npm run verify
npx serve dist
```

## 作品追加
`catalog.json` に作品を追加し、`assets/app.js` に体験を実装する。`npm run verify` → PR → CI → マージ → Pages公開。実機確認後にX投稿。

## 独自ドメイン
最終URLは `https://play.birdman-studio.com/` を予定。DNS設定が済む前の `PUBLIC_ORIGIN` の既定値は `https://b-w-hiroki.github.io/emotion-games`。変更方法は `docs/DEPLOYMENT.md` を参照。

## マルチエンドと結末図鑑
20作品にそれぞれ5つの結末（計100個）。通常のプレイ以外に、待機・連打・画面タップなどの特殊操作で隠し結末を発見できます。回収状態は端末内に保存し、トップと各ゲームで進捗表示します。詳細は [結末設計](docs/ENDINGS.md) を参照。

## 004｜きえないで。
マッチ売りの少女などの童話が持つ「消えてほしくない」という感情をゲーム化したオリジナル短編。炎を風から守るため長押し。手を離すと風にさらされ、守り続けると酸素が不足する。5種類の結末（通常2・失敗2・隠し1）を収集。

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
