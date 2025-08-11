# 🌸 かわいい減量ダッシュボード 🌸

かわいいデザインで楽しく体重管理ができるPWA（Progressive Web App）です。

## ✨ 特徴

- 🎀 パステルカラーでかわいいデザイン
- 📱 PWA対応でスマートフォンにインストール可能
- 📊 体重の変化をグラフで視覚化
- 💖 モチベーションを上げるかわいいメッセージ
- 🌙 オフラインでも使用可能
- 📝 体重記録の履歴管理
- 🎯 目標体重の設定と進捗追跡

## 🚀 使い方

### インストール方法

1. プロジェクトをダウンロードまたはクローン
2. ウェブサーバーで`index.html`を開く
3. ブラウザの「ホーム画面に追加」でPWAとしてインストール

### 基本的な使い方

1. **体重記録**: 「今日の体重」セクションで体重を入力し「記録する」ボタンをクリック
2. **目標設定**: 「目標設定」セクションで目標体重を設定
3. **グラフ確認**: 体重の変化をグラフで確認
4. **履歴閲覧**: 過去の記録を「記録履歴」で確認

## 📁 ファイル構成

```
kawaii-weight-app/
├── index.html          # メインページ
├── styles.css          # パステルカラーのスタイルシート
├── app.js              # アプリケーションロジック
├── db.js               # IndexedDBデータベース管理
├── manifest.json       # PWAマニフェスト
├── service-worker.js   # オフライン対応のService Worker
├── motivation.json     # モチベーションメッセージデータ
├── README.md           # このファイル
└── icons/              # アプリアイコン
    ├── icon-72.png
    ├── icon-96.png
    ├── icon-128.png
    ├── icon-144.png
    ├── icon-152.png
    ├── icon-192.png
    ├── icon-384.png
    └── icon-512.png
```

## 🛠️ 技術仕様

### 使用技術
- **HTML5**: セマンティックなマークアップ
- **CSS3**: フレックスボックス、グリッド、アニメーション
- **JavaScript (ES6+)**: モジュール、async/await、クラス
- **IndexedDB**: ローカルデータストレージ
- **Service Worker**: オフライン機能とキャッシュ
- **Canvas API**: グラフ描画

### PWA機能
- ✅ マニフェストファイル
- ✅ Service Worker
- ✅ オフライン対応
- ✅ インストール可能
- ✅ レスポンシブデザイン

### データ管理
- **体重データ**: IndexedDBに保存
- **目標設定**: ローカルストレージで永続化
- **モチベーションメッセージ**: JSONファイルから動的読み込み

## 🎨 デザインテーマ

### カラーパレット
- **プライマリピンク**: `#FFB6C1`
- **セカンダリピンク**: `#FFC0CB`
- **ライトピンク**: `#FFE4E1`
- **ミントグリーン**: `#F0FFF0`
- **ラベンダー**: `#E6E6FA`
- **ピーチ**: `#FFEFD5`
- **ベビーブルー**: `#E0F6FF`
- **ソフトイエロー**: `#FFFACD`

### UIコンポーネント
- 丸みを帯びたカード（border-radius: 20px）
- グラデーション背景
- かわいい絵文字アイコン
- ふわふわアニメーション
- パステルカラーの統一感

## 📱 対応ブラウザ

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

## 🔧 開発者向け情報

### ローカル開発環境のセットアップ

1. HTTPサーバーを起動（PWA機能のためHTTPSまたはlocalhostが必要）
```bash
# Python 3の場合
python -m http.server 8000

# Node.jsのlive-serverを使用
npx live-server
```

2. ブラウザで `http://localhost:8000` にアクセス

### データベース構造

#### weights テーブル
- `id`: 自動増分ID
- `weight`: 体重（数値）
- `date`: 記録日（YYYY-MM-DD形式）
- `timestamp`: タイムスタンプ

#### settings テーブル
- `key`: 設定キー
- `value`: 設定値

### 主要なクラスと関数

#### WeightDatabase クラス (db.js)
- `addWeight(weight, date)`: 体重記録の追加
- `getAllWeights()`: 全体重データの取得
- `getLatestWeight()`: 最新体重の取得
- `setSetting(key, value)`: 設定の保存
- `getSetting(key)`: 設定の取得

#### KawaiiWeightApp クラス (app.js)
- `addWeight()`: 体重記録の処理
- `setTarget()`: 目標体重の設定
- `updateChart()`: グラフの更新
- `updateStats()`: 統計情報の更新

## 🤝 カスタマイズ

### モチベーションメッセージの追加
`motivation.json`を編集してメッセージを追加できます：

```json
{
  "message": "新しいメッセージ ✨",
  "condition": "custom",
  "category": "motivation"
}
```

### スタイルのカスタマイズ
`styles.css`の`:root`セクションでカラーパレットを変更できます：

```css
:root {
    --primary-pink: #your-color;
    --secondary-pink: #your-color;
}
```

## 🐛 既知の問題

- 古いブラウザではService Worker機能が制限される場合があります
- iOSのSafariでは一部のPWA機能が制限されます

## 🔮 今後の予定機能

- [ ] データのエクスポート/インポート機能
- [ ] BMI計算と表示
- [ ] 週間/月間の統計レポート
- [ ] リマインダー通知
- [ ] 複数ユーザー対応
- [ ] クラウドバックアップ
- [ ] ソーシャル機能

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 🙏 謝辞

- 日本語フォントサポート
- PWAベストプラクティス
- IndexedDB APIドキュメント

---

🌺 毎日の記録で理想の自分に近づこう 🌺