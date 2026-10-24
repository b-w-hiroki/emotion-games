# チャーハンの画面レイヤー

`chahan/art.js` の `drawScene` は、奥から手前へ次の順で描く。

1. **場所の絵と光** — 屋台・列車・空中キッチンの背景に、それぞれの灯りと微細な動きを重ねる。
2. **作業台と火** — 鍋の下の暗い木目、散った米粒、鍋底に広がる熱の光を置く。
3. **鍋と食材** — `wok-v2.webp` に `rice-v2.webp` を重ねる。成功した鍋振りでは米の一部を鍋に残し、透明な `flight-v3.webp` を弧状に動かす。弱振りでは飛翔を出さず、こぼしでは外へ散る米を描く。
4. **手前の湯気と味付け** — 鍋の前に薄い湯気を通し、調味料を入れた瞬間だけ飛沫と反応を重ねる。

新しい飛翔素材の原画は `chahan/art/src/flight-v3.png` に保存。`node scripts/art/build-chahan-scenes.mjs` で配信用 WebP に変換する。アニメーションの確認には `node scripts/capture-chahan-toss.mjs`、画面と操作の確認には `node scripts/qa-chahan.mjs` を使う。動きを減らす設定では光や粒の位置を固定する。
