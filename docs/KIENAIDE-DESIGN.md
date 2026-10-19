# 004「きえないで。」現行設計

最終照合: 2026-10-19。プレイヤー向けの振る舞いは [仕様書](./KIENAIDE-SPEC.md) を正本とする。本書は変更箇所とテストを判断するための責務・データ・不変条件を記す。

## 構成と依存方向

| 責務 | 正本・入口 | 変更時に確認するもの |
| --- | --- | --- |
| ゲーム状態・風・章・分岐・記憶・結末判定 | `assets/kienaide-core.js` | `tests/kienaide-core.test.mjs`、終盤・イベントの単体テスト |
| DOM、入力、時計、モーダル、保存、共有入口、描画との接続 | `assets/app.js` | `scripts/qa-kienaide-release.mjs`、結末・保存QA |
| Canvasレイヤー、絵画、雪・風・光、導入・結末演出 | `assets/kienaide-view.js` と `assets/style.css` | `scripts/qa-kienaide-visual.mjs`、画面比較 |
| 風・炎・呼吸・章・記憶・結末の生成音 | `assets/kienaide-audio.js` | `tests/kienaide-audio.test.mjs`、WebKit音声QA |
| 結末PNGの準備、共有・ダウンロード、失敗と周回競合 | `assets/kienaide-card.js` | `tests/kienaide-card.test.mjs`、`scripts/qa-kienaide-card.mjs` |
| 絵画原本とruntime WebP | `assets/kienaide/paint/src/`、`assets/kienaide/paint/manifest.json`、`scripts/art/kienaide-paint.mjs` | 画像デコード、ノイズ比較、四章・五結末キャプチャ |
| 静的サイトの組立と配信 | `scripts/build.mjs`、`.github/workflows/pages.yml` | `npm run verify`、公開URL |

`kienaide-core.js` はDOM・音・保存を知らない決定論的なルール層。`app.js` が入力をcoreへ渡し、返されたイベントをview/audio/DOM/計測へ配る。表示やサウンドを変更しても、結末判定の正本を別に作らない。

小風イベントの `lantern` は見た目の琥珀色と字幕だけでなく、発生中の風を0.2倍にする。`lull` の0.3倍や道の休息・自然の安全地帯とは独立した一時的な防風効果で、炎の温かさは従来どおり手放し中に加算する。近道選択中は窓の防風を適用せず、近道の風リスクを維持する。灯りの防風だけで第二章の自然の安全地帯を消費しない。イベント終了後は通常の風へ戻り、最終10秒の固定された風と窓の返事には介入しない。

## 状態と時刻

分岐時の `routeStartMeters` は選択直前の連続値を保存する。近道・休息で16mの加減算はせず、`journey` の82秒／98秒への変更によって以降の距離減少速度だけを変える。距離表示は選択直前・直後で同値となり、両ルートとも到着時に0mとなる。

coreの `create({seed})` が周回状態を作り、`step(state, elapsed, dt, {shield, wasShield})` が更新とイベント列を返す。主な状態は `flame`、`oxygen`、`wind`、`memories`、`memoryGot`、`mote`、`chapter`、`routeChoice`、`journey`、`finalePhase`、`gustShield`、`silenceRelease`、`replyLevel`、`ended`。初期値は灯り72、息100、距離100m、到着90秒。同じseedと入力列から同じ進行・結末を得る。小風イベントは各種類を一周に一度ずつseedで並べ替える。

`requestAnimationFrame` の経過は1フレーム最大0.035秒に制限する。休止ダイアログ、選択待ち、画面非表示、短い横向きでは `elapsed` とcore更新を止める。再開時には前フレーム時刻をリセットし、裏で経過した時間を加算しない。導入と結果演出はゲーム本編と別の時間管理を持つ。

道の選択は約28秒で `routeChoice='pending'` となる。`chooseRoute` は近道なら `journey=82`、風を8秒強化し、休息なら `journey=98`、息を最大28回復する。残距離は選択時に加減算しない。休息中の `restUntil` は選択後4秒間だけ風を弱め、息が満タンでも防風効果を残す。自然発生の `shelterUntil` と混同せず、休息中に自然の安全地帯を消費しない。`routeDistance` が表示距離を返す。最終10秒は `finalePhaseAt` に集約する。

第二章の自然の安全地帯は、弱風（`wind < 0.44`）中に指またはキーを意図して離した時だけ一度発火する。`releaseIntent` は通常のpointerup／keyupだけが渡し、pointercancel・フォーカス喪失・画面非表示による強制解除では渡さない。手放したままの待機、道の休息中、灯りイベントによる防風だけでも消費しない。かばっていて条件が揃うと主ボタンで軒先への手放しを促す。

自然の安全地帯の終了時刻は `Math.min(time+3.5, CHAPTERS[2].at)` とし、第三章の橋へ防風を持ち越さない。発見イベントはappが物語文と音へつなぐ。viewは風の低下に追従する雪・風の描画を使い、画面を横切る矩形の色面は描かず、距離表示を保つ。音のキューはミュート設定に従う。

橋の `bridgeFrost` は0〜1の周回状態。第三章の強風中に無防備なら風量に比例して蓄積し、かばう間は速く減る。弱風でもゆっくり減るが、呼吸の回復と防風は引き続きプレイヤーの手放し／長押しで選ぶ。強風中の炎損失係数は `0.85 + bridgeFrost * 0.55` で、従来の一律0.62倍による橋の逆転した安全性を廃止する。第三章を出ると蓄積は0に戻す。viewの縁の霜とappの一時的な操作案内は同じ状態に従い、別の常設ゲージを作らない。

## 入力と結果の流れ

```text
pointer/Space/Enter ──> app.js ──> core.step() ──> event[] ──> view/audio/story
記憶ボタン・Canvas・M ──> collectCandleMemory() ──> core.collect()
分岐ボタン ──> core.chooseRoute()
coreのendイベント ──> app.js finish() ──> 図鑑保存・理由表示・card準備
```

記憶ボタンはmoteが現れた時だけCanvas上にDOMとして表示し、coreの記憶座標をviewの `toCss` で変換して画面内に収める。moteの `expiresAt` を基準にviewが8秒の残りを光の輪で示す。coreは表示中のmoteが未収集で消えた場合だけ `memory-lost` を一度発火し、appが短い物語文と音へ接続する。休止・分岐・結果時はボタンを隠す。Canvasの近接タップとMキーは同じ収集関数に流し、重複取得を防ぐ。背面操作はモーダル時の `inert` と入力ガードで遮断する。

終盤の順序は `approach → gust-warning → gust-active → silence → window-reply`。最後の突風は固定の強風、静寂以降は弱風。窓の応答は突風中のかばい時間と静寂中の手放し時間から一度決定する。炎／息の0判定が到着判定より先。到着時の `arrivalEnding` だけが生存3結末を選ぶ。

## 描画・素材・音

正式版は絵画レイヤーを描く。アート基準は `assets/kienaide-v3/` の町・旅人・炎の精。背景は各章のsky/far/mid/fore/lights、人物は炎なしの姿勢、炎・反射光・窓の応答を分離する。manifestと全必須画像の読込が成功するまでプレイ開始を許可しない。姿勢遷移は中間合成で不透明な重なりを維持し、性能が落ちれば描画解像度を適応的に下げる。静止した紙粒・雪・風・火粉はゲーム状態に追従し、動きを減らす設定では演出を抑える。

音はWeb Audioを最初のユーザー操作以降に初期化する。休止やバックグラウンドでは停止し、音非対応でもゲーム進行は続く。設定は端末内で保持。音声の正しさは単体テストと実ブラウザで分けて確認する。

## 保存・互換性・境界

| 保存キー | 内容 | 互換性ルール |
| --- | --- | --- |
| `emotion-endings-v1-kienaide` | 発見済みの結末ID | 既知IDへ絞り、重複除去して保持 |
| `kienaide-art-endings-v1` | 旧版の結末ID | 起動時に現在の図鑑へ統合。旧キーは消さない |
| `emotion-kienaide-intro-v1` | 導入を見た印 | 再挑戦で消さない |
| `emotion-kienaide-audio-v1` | ミュートと音量 | 再挑戦で消さない |

保存失敗時も周回内の発見は動く。結末カード準備は結果確定時に開始し、古い周回の非同期完了が新しい周回のUIを汚さない。共有URLから `qa`・`seed`・`speed`・`t`・`mem`・`vital` 等の検査用パラメーターを除く。QA用URLは通常プレイヤー向けの約束ではなく、公開URLへの共有に含めない。

## 変更と検証の対応

- ルール、数値、結末、分岐を変える: core単体テスト、5結末と両ルートのブラウザQA、仕様書の条件表を同じPRで更新する。
- 入力、画面、文言を変える: 360×640／390×844のChromium・WebKit、実クリック、スクリーンショット、仕様書の操作・表示を更新する。
- 素材、光、音を変える: 原本とmanifest、四章・五結末、音OFF／reduced-motion、設計書の素材・音の節を更新する。
- 保存、共有、公開を変える: 旧キー移行、再挑戦、カード失敗時、公開版操作を確認し、仕様・設計双方の互換性を更新する。

自動QAは実機iPhone Safariと人間の感情評価を代替しない。履歴資料の未チェック項目をそのまま現行欠陥とみなさず、コードとテストで再照合する。
