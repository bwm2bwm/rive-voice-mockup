# 開発ログ

## 2026-06-12

### 実施内容

- ViteのVanilla JSテンプレートでプロジェクトを初期化した。
- `@rive-app/canvas` を導入し、RiveアニメーションをCanvasに表示する土台を作成した。
- Vite初期テンプレートの不要なサンプルコードを整理した。
  - `src/counter.js` を削除。
  - `index.html` をCanvas中心の構成に変更。
  - `src/main.js` をRive読み込み用に書き換え。
  - `src/style.css` を中央配置の最小スタイルに整理。
- 外部URLのRiveファイル読み込みを試したが、CDNや公開URLで `HTTP 403` やステートマシン不一致が発生したため、ローカルの `public/vehicles.riv` を読み込む方針に変更した。
- Riveファイル内のステートマシンとInputをコンソールログで調査した。
- 当初想定していた `truck` / `jeep` / `sportscar` Triggerは、現在の `vehicles.riv` には存在しないことを確認した。
- 実際に存在するステートマシンは `bumpy`、Triggerは `bump` であることを確認した。
- UIを3ボタンの車種切り替えから、1ボタンの `ジャンプ` に変更した。
- `ジャンプ` ボタン押下で `bump.fire()` が実行され、ジャンプアニメーションが表示されることを確認した。
- 将来の音声AIエージェント連携に備えて、以下のグローバル関数を用意した。
  - `window.fireJumpFromAI()`
  - `window.fireVehicleTriggerFromAI()` 互換用

### 調査で分かったこと

- Rive Runtimeでは、コード側で指定するステートマシン名と `.riv` ファイル内の実名が一致していないと、`State Machine with name ... not found` が発生する。
- `stateMachineInputs(...)` は、対象ステートマシンが正しく起動されていない場合やInputが存在しない場合、空配列になる。
- RiveのInput名には末尾スペースが含まれるケースがあるため、比較時は `.trim()` して扱う方針にした。
- 現在の `vehicles.riv` は車種切り替え用ではなく、`bump` Triggerによるリアクション制御用の構造だった。

### 現在の動作確認

- 開発サーバーは `http://127.0.0.1:5173/` で起動。
- `public/vehicles.riv` はVite経由で配信できている。
- `npm run build` は成功。
- ブラウザ上で `ジャンプ` ボタン押下により、Riveのジャンプアニメーションが発火することを確認済み。
