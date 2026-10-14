# Deploy / 最初に確認すること

1. リポジトリ Settings → Pages → Build and deployment → Source: **GitHub Actions** を選択。
2. mainへのマージ後、Actionsの `Verify and deploy Emotion Games` の緑色を確認。
3. `https://b-w-hiroki.github.io/emotion-games/girigiri/` をiPhone SafariとXアプリのブラウザで確認。
4. GitHub PagesのCustom domainに `play.birdman-studio.com` を登録。DNS側で `play` のCNAMEを `b-w-hiroki.github.io` へ向ける。
5. HTTPS化を確認してからWorkflowのビルド時環境変数 `PUBLIC_ORIGIN: https://play.birdman-studio.com` を設定し、再デプロイ。`CNAME` は設定確定後にリポジトリへ追加する。
6. Xで個別ページのOGP画像が表示されることを確認した後、投稿。作品一覧のURLをSNSに貼らない。

**注意：** このリポジトリからDNS変更・Pages画面設定は自動実行されない。ドメイン登録前は標準github.io URLを使う。
