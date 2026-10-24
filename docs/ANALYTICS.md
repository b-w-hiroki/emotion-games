# 作品別KPI（GA4）

公開サイトは GitHub Pages の静的配信。GA4 のウェブデータストリームの測定IDを設定すると、利用者が計測を許可した後にだけ Google タグを読み込む。IDが空ならタグ・同意バナーとも表示しない。`?qa=1` と `?study=1` は計測しない。既存の結末セーブや検証用アンケートはGAへ送らない。

## 有効化

1. Google Analytics の無料の標準プロパティで、`https://play.birdman-studio.com/` のウェブデータストリームを作る。Analytics 360、広告連携、BigQuery はこの実装に不要。
2. GitHub のリポジトリ変数 `GA4_MEASUREMENT_ID` に `G-` で始まる測定IDのみを設定する。APIシークレットや認証情報は入れない。次の main デプロイから有効になる。変数が空なら送信しない。
3. GA4 の「カスタム定義」でイベントスコープのディメンション `game_id`、`ending_id`、`outcome`、`route`、`miracle`、`fish_id` を必要に応じて登録する。数値指標 `duration_ms`、`found_count`、`memories`、`score` などはカスタム指標として登録する。登録前の値が標準レポートに遡って現れるとは見なさない。
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

『きえないで。』固有: `route_selected` の `route`、`memory_collected` の `count`、`finale_window` の `level`。完了イベントには `memories`、`miracle`、`lowest_flame`、`route` を添える。

『チャーハン大回転』固有: 完了時の `rice_pct`、`mix_pct`、`doneness_pct`、`seasoning_pct`。『AINAN釣りバトル』固有: `fish_id`、`opening_hits`、`bad_reels`。釣りは最初の操作を開始と数え、放置だけの表示はプレイ回数に含めない。

この集計は許可したブラウザのイベント数であり、全訪問者数、実人数、全端末を横断した結末解放者数ではない。広告ブロッカーやオフライン時は欠測し得る。`found_count` はその端末の図鑑進捗で、全利用者のユニーク解放数ではない。氏名、メール、自由記述、アンケート回答、端末内の保存IDは送らない。
