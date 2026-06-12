# プロジェクト状態

## 概要

このプロジェクトは、Riveアニメーションを使ったキャラクター音声対話AIエージェントのWebモックアップである。

現在は、音声AI本体の実装前段階として、Riveアニメーションをブラウザ上に表示し、外部イベントからアニメーションを発火できる土台を作っている。

## 技術構成

- Vite
- Vanilla JavaScript
- `@rive-app/canvas`
- ローカルRiveファイル: `public/vehicles.riv`

## 現在の実装

- `index.html`
  - `<canvas id="canvas" width="500" height="500"></canvas>` を配置。
  - Canvas下に `ジャンプ` ボタンを1つ配置。
- `src/main.js`
  - `@rive-app/canvas` の `Rive` を使用。
  - Riveファイルは `/vehicles.riv` から読み込み。
  - ステートマシンは `bumpy` を使用。
  - Triggerは `bump` を使用。
  - `bump.fire()` によりジャンプアニメーションを発火。
  - Input名の比較では `.trim()` を使い、末尾スペースに対応。
- `src/style.css`
  - 画面中央にCanvasとボタンを配置。
  - 背景は薄いグレー、Canvasは白背景で表示。

## 外部連携用API

将来の音声AIエージェント連携に備えて、ブラウザの `window` に以下を公開している。

```js
window.fireJumpFromAI()
```

現在の主API。AI応答や音声イベントに合わせてジャンプアニメーションを発火する。

```js
window.fireVehicleTriggerFromAI()
```

過去の車種切り替え想定との互換用。現在は内部で `fireJumpFromAI()` を呼ぶ。

## 方針変更の記録

当初は、Riveの `vehicles.riv` に以下のような車種切り替え用Triggerが存在すると想定していた。

- `truck`
- `jeep`
- `sportscar`

しかし、実際の `public/vehicles.riv` をブラウザコンソールで確認したところ、ステートマシンは `bumpy`、Inputは `bump` Triggerのみだった。

そのため、UIと実装方針を以下のように変更した。

- 変更前: `トラック` / `ジープ` / `スポーツカー` の3ボタンで車種切り替え。
- 変更後: `ジャンプ` の1ボタンで `bump` Triggerを発火。

この変更により、現在のRiveファイルの構造に合った、実際に動作するモックアップになっている。

## 既知の注意点

- 現在の `vehicles.riv` では車種切り替えはできない。
- 車種切り替えを実現するには、Riveファイル側に車種切り替え用のTriggerまたは数値Inputを追加する必要がある。
- 外部Rive URLは `HTTP 403` や内容差異の影響を受けるため、現時点ではローカルの `public/vehicles.riv` を使う。
- Rive Input名は末尾スペースを含む可能性があるため、今後も `.trim()` 比較を維持する。

## 現在の確認済み状態

- `npm run build` 成功。
- `http://127.0.0.1:5173/` で開発サーバー起動。
- 画面表示正常。
- `ジャンプ` ボタン押下でRiveアニメーションが発火する。
