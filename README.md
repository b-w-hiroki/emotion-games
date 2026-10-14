# Emotion Games — 感情を、遊ぶ。

birdman studioのショート・ワンアイデア・ブラウザゲーム。SNSの投稿から **個別ゲームへ直接アクセス** できる設計です。

## Preview (Pages有効化後)
- https://b-w-hiroki.github.io/emotion-games/
- https://b-w-hiroki.github.io/emotion-games/girigiri/
- https://b-w-hiroki.github.io/emotion-games/ato-hitotsu/
- https://b-w-hiroki.github.io/emotion-games/micha-dame/

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
