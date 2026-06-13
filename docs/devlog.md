# 開発ログ

## 2026-06-13

### 実施内容

- 新しいRiveファイル `wave-hear-and-talk.riv` を `public/rive/` 配下で扱う方針に変更した。
- 旧サンプルの `vehicles.riv` / `bumpy` / `bump` 前提の実装から、音声対話エージェント向けの `State Machine 1` 前提の実装へ切り替えた。
- `src/main.js` をState Machine Input汎用操作型に変更した。
  - `Talk` / `Hear` / `Check` のBoolean Inputを操作可能にした。
  - `Look` のNumber Inputを操作可能にした。
  - `success` / `fail` のTriggerを発火可能にした。
  - Input名比較では引き続き `.trim()` を使い、意図しない空白に備える方針を維持した。
- `index.html` と `src/style.css` を、State Machine確認用UIへ変更した。
  - Agent Stateプリセットを追加した。
  - Boolean Inputトグルを追加した。
  - `Look` 用のスライダーと値ボタンを追加した。
  - Trigger発火ボタンを追加した。
  - 読み込み済みInput一覧を画面上に表示するテーブルを追加した。
- 将来のAI応答連携に備えて、以下のグローバルAPIを追加した。
  - `window.setAgentState(stateName)`
  - `window.handleAgentEvent(event)`
  - `window.riveDebug`
- 旧APIの `window.fireJumpFromAI()` と `window.fireVehicleTriggerFromAI()` は互換用として残し、現在はSuccess Flowのモック応答を実行する形にした。
- `docs/project_state.md` を、新しいRive構造と現在の開発ステータスに合わせて更新した。

### 調査で分かったこと

- `wave-hear-and-talk.riv` の確認済み構造は以下の通り。

```text
Artboard: Artboard
State Machine: State Machine 1

Inputs:
  Talk     Boolean
  Hear     Boolean
  Check    Boolean
  Look     Number
  success  Trigger
  fail     Trigger
```

- Animationは `idle` と `Talk` がloopで、それ以外はone-shotとして確認した。
- Animation名の `hands_up ` と `fail ` には末尾スペースが含まれていた。
- State Machine Input側の `fail` には末尾スペースはなかった。
- `Look` のNumber値の意味と最適な値域はRuntime解析だけでは判断できないため、実際の見た目で追加確認が必要。

### 現在の動作確認

- `npm run build` は成功。
- `public/rive/wave-hear-and-talk.riv` がVite経由で配信されることを確認した。
- ブラウザ上でState Machine確認UIが問題なく動作することを確認済み。

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
