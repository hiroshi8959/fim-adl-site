# 運動FIM ADL予後予測サイト

入院時と2回目カンファレンス時の運動FIMから、退院予定日の運動FIMとADL項目別の到達確率を推定する静的サイトです。

## 公開方法

GitHub Pagesで公開する場合:

1. このフォルダをGitHubリポジトリにアップロードします。
2. GitHubのリポジトリ画面で `Settings` → `Pages` を開きます。
3. `Build and deployment` の `Source` を `Deploy from a branch` にします。
4. `Branch` を `main`、フォルダを `/ (root)` にして保存します。

数分後にGitHub PagesのURLが発行されます。

## 注意

- 入力値はブラウザ内で計算され、外部送信されません。
- 本ツールは臨床判断を補助する試作です。
- 検索避けのため `noindex` を設定していますが、URLを知っている人はアクセスできます。
