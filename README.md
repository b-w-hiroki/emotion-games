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
4作品にそれぞれ5つの結末（計20個）。通常のプレイ以外に、待機・連打・画面タップなどの特殊操作で隠し結末を発見できます。回収状態は端末内に保存し、トップと各ゲームで進捗表示します。詳細は [結末設計](docs/ENDINGS.md) を参照。

## 004｜きえないで。
マッチ売りの少女などの童話が持つ「消えてほしくない」という感情をゲーム化したオリジナル短編。炎を風から守るため長押し。手を離すと風にさらされ、守り続けると酸素が不足する。5種類の結末（通常2・失敗2・隠し1）を収集。
