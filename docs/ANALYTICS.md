# 作品別KPI（GA4）

公開サイトは GitHub Pages の静的配信。GA4 のウェブデータストリームの測定IDを設定すると、利用者が計測を許可した後にだけ Google タグを読み込む。IDが空ならタグ・同意バナーとも表示しない。`?qa=1` と `?study=1` は計測しない。既存の結末セーブや検証用アンケートはGAへ送らない。

## 有効化

1. Google Analytics の無料の標準プロパティで、`https://play.birdman-studio.com/` のウェブデータストリームを作る。Analytics 360、広告連携、BigQuery はこの実装に不要。
2. GitHub のリポジトリ変数 `GA4_MEASUREMENT_ID` に `G-` で始まる測定IDのみを設定する。APIシークレットや認証情報は入れない。次の main デプロイから有効になる。変数が空なら送信しない。
3. GA4 の「カスタム定義」でイベントスコープのディメンション `game_id`、`ending_id`、`level`、`chapter`、`outcome`、`route`、`miracle`、`fish_id` を必要に応じて登録する。004 の選択と記憶を分析する場合は `kind`、`choice`、`memory_id` も登録する。数値指標 `duration_ms`、`found_count`、`memories`、`score` などはカスタム指標として登録する。004の操作分析には `gust_shield`（突風をかばった秒数）と `silence_release`（静寂で手を離した秒数）をカスタム指標として登録する。登録前の値が標準レポートに遡って現れるとは見なさない。
4. 探索レポートで行に `game_id`、列またはフィルターに `event_name`、値にイベント数を置く。開始数=`game_start`、完了数=`game_complete`、端末ごとの新規結末発見数=`ending_discovered`。結末別は `ending_id` を行に追加する。『きえないで。』の経路・記憶数・奇跡は同作だけに絞って見る。
5. 実データを有効化したら、同意前・拒否後にGoogleへの通信がないこと、許可後に Realtime/DebugView で開始・完了・結末が見えることを確認する。ブラウザ内の送信確認とGA4側での受信確認は別のゲート。

## イベント契約

| 共通イベント | 意味 | 主な項目 |
| --- | --- | --- |
| `game_start` | プレイを実際に開始 | `game_id` |
| `game_complete` | 結果画面に到達 | `game_id`, `ending_id`, `outcome`, `duration_ms`, `score`, `found_count` |
| `ending_discovered` | 端末内で初めてその結末を解放 | `game_id`, `ending_id`, `found_count` |
| `game_retry` | 再挑戦操作 | `game_id` |
| `share_tap` | 共有操作 | `game_id`, `ending_id` |

『きえないで。』固有: `route_selected` の `route`、`decision_selected` の `kind`（`hearth` / `bridge`）と `choice`、`memory_collected` / `memory_missed` の `memory_id`（`scarf` / `table` / `promise`）と取得済みの `count`、`finale_window` の `level`。火の子が息を返した時は `companion_warmth`、トンネルの風よけを発見した時は `shelter_discovered`、弱い炎に窓の光が届いた時は `miracle_triggered` を各一周に一度だけ記録する。これらのイベントはプレイ開始後だけ送信し、自由入力や灯り・息の生値は送らない。プレイ中の到達点を `chapter_reached`（第二〜第四章、`chapter` は文字列の `2`〜`4`）、`finale_warning`、`finale_gust`、`finale_silence` で記録する。第一章の開始は `game_start`。明示的に戻った場合は `journey_exit` に `destination`（`home` または `title`）を添える。タブを閉じた場合などは検出しないため、全離脱数とは呼ばない。`game_complete` にも到達章 `chapter`（`1`〜`4`）を添える。

窓の返事 `finale_window` と結末 `game_complete` に `gust_shield`（最後の大突風でかばった累計秒数）と `silence_release`（直後の静寂で手を離した累計秒数）を小数第1位まで添える。最後の風より前に失敗した周回は両値が0秒となり、`finale_window` は発生しない。完了イベントには `memories`、`miracle`、`lowest_flame`、`route` も添える。両秒数を結末別に比べる時は `game_complete` を使い、窓の応答別に比べる時は `finale_window` を使う。いずれも同意後に開始したプレイだけを対象とする。

探索レポートで `game_id=kienaide` に絞り、`event_name` ごとのイベント数を `game_start` → `chapter_reached`（`chapter` 別）→ `finale_warning` → `finale_gust` → `finale_silence` → `finale_window` → `game_complete` の順に確認する。各周回で同じ到達点は1回だけ発火する。これは段階別の件数であり、匿名の周回IDを送らないため、複数周回をまたいだ個別プレイの厳密な転換率ではない。

GA4 探索「作品別KPI」の「004の選択と記憶」タブは、`game_id=kienaide` と `decision_selected|memory_missed` のイベント名で絞り、選択場面・選択肢・記憶ID別のイベント数を表示する。実データが入るまでは表が空のままになる。取り逃し数は記憶が消えた回数であり、個人別の失敗率ではない。
記憶の取得種類と、火の子・風よけ・奇跡の発生件数も `game_id=kienaide` と各イベント名で絞って確認できる。既存の探索タブは選択と取り逃しに限定されるため、表示対象に加える場合はGA4側のフィルターを更新する。

『チャーハン大回転』固有: 完了時の `rice_pct`、`mix_pct`、`doneness_pct`、`seasoning_pct`。『AINAN釣りバトル』固有: `fish_id`、`opening_hits`、`bad_reels`。釣りは最初の操作を開始と数え、放置だけの表示はプレイ回数に含めない。

この集計は許可したブラウザのイベント数であり、全訪問者数、実人数、全端末を横断した結末解放者数ではない。広告ブロッカーやオフライン時は欠測し得る。`found_count` はその端末の図鑑進捗で、全利用者のユニーク解放数ではない。氏名、メール、自由記述、アンケート回答、端末内の保存IDは送らない。
