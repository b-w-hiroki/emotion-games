# Emotion Games — GitHub Pages / 独自ドメイン公開

正式URL: `https://play.birdman-studio.com/`。X投稿には一覧ページではなく各ゲームの個別URLを記載する。

## 現在の状態と設定手順

1. `emotion-games` のGitHub Settings → Pages → Build and deploymentで **GitHub Actions** を選択する。
2. 同じ画面のCustom domainに `play.birdman-studio.com` を登録する（独自ドメインが使用可能になってから）。
3. ドメイン管理画面のDNSで `play` のCNAMEが **`b-w-hiroki.github.io`** を指すことを確認する。`/emotion-games` は含めない。
4. PagesのDNSチェック、HTTPS証明書、**Enforce HTTPS** を順に確認する。DNS反映には時間差がある。
5. mainへのマージで `Verify and deploy Emotion Games` が成功することを確認する。Workflowの`deploy`がskippedやfailureならPagesの公開設定を点検する。
6. 以下のURLがXアプリ内ブラウザとiPhone Safariでロード・タップ・結果表示・再プレイできることを実機で確認してからSNS投稿する。

- https://play.birdman-studio.com/
- https://play.birdman-studio.com/girigiri/
- https://play.birdman-studio.com/ato-hitotsu/
- https://play.birdman-studio.com/micha-dame/

## URL・SEO・共有

- GitHub Actionsの公開ジョブで`PUBLIC_ORIGIN=https://play.birdman-studio.com`を渡し、canonical / og:url / og:image を独自ドメインに統一する。
- OGPのリンク先URLや画像が正しく表示されることを本番URLで確認する。Xのキャッシュに古い情報が残る可能性にも注意。
- GitHub Actions公開方式ではリポジトリの `CNAME` ファイルは独自ドメイン設定として利用されない。GitHub Settings → PagesのCustom domain登録が必要。
- DNSやPagesの設定はGitHubリポジトリ内のコード変更だけでは完了しない。

## SNSに投稿する直前のゲート

- Pages公開、DNS反映、HTTPS、iPhone / Android / Xアプリ内ブラウザ、スマホ縦横画面、リザルト共有、OGP画像、投稿用動画を確認。
- SNS公開は準備が整った後に手動で実施する。現在、SNS投稿そのものは行っていない。

GitHub公式: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site
