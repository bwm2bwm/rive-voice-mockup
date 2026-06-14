# キャラクター音声対話AIエージェント Webモックアップ仕様書

## 1. プロジェクト概要

### コンセプト

本プロジェクトは、画面を注視しなくても自然に会話できる「キャラクター音声対話AIエージェントサービス」のWebモックアップである。

ユーザーは、スマートフォン上のキャラクターと音声で対話する。キャラクターはRiveアニメーションによって軽量に描画され、AIの発話・感情・待機状態に応じて、表情や動き、口パク、相槌などを返す。

本モックアップでは、まずAI本体の実装より前に、以下の土台を検証する。

- Riveファイルをブラウザ上で安定表示する
- JavaScriptからRive State Machine Inputを操作する
- 将来のAI応答イベントからキャラクター演出を発火できる窓口を用意する
- 低スペック端末でも破綻しにくい演出設計を固める

### ターゲット

想定ターゲットはマス層向けスマートフォンである。

- iPhone 12〜14
- 数年前のミドルレンジAndroid
- RAM 4〜6GB程度
- 長時間利用、ながら作業、ハンズフリー利用を想定

高性能端末前提の3D表現や重いリアルタイム解析ではなく、軽量な2Dベクターアニメーションと最小限のローカル制御で「生きている感」を作る。

### 打破する4つの壁

本プロダクトの技術設計では、音声対話AIエージェントにおける以下の「4つの壁」を打破することを目的とする。

#### 1. 遅延の壁

STT、LLM、TTSを経由する音声AIでは、ユーザー発話からAI音声の再生開始までに待ち時間が発生する。

対策として、サーバー応答を待つ間にブラウザ側で即座に短い相槌モーション・相槌音声を返し、体感上の沈黙を減らす。

#### 2. コストの壁

音声AIは、STT、LLM、TTSを連続して利用するためAPIコストが膨らみやすい。

本設計では、LLMにGemini 2.5 Flash相当の高速・低コストモデルを想定し、TTSにはElevenLabs Flash等の低遅延モデルを想定する。ミドルユーザーの月間APIコストは約117円程度を目標とする。

#### 3. 発熱の壁

端末側で重い母音解析、3D描画、高頻度な音声解析を行うと、発熱やバッテリー消費につながる。

本設計では、描画はRiveによる軽量ベクターアニメーションに寄せ、リップシンクも音量値または再生中フラグに基づく簡易制御に絞る。

#### 4. 不気味の谷の壁

精密な顔アニメーションやリアルな口形状が不完全だと、かえって違和感を生みやすい。

本設計では、リアルな母音口形同期を目指さず、キャラクターらしい簡易口パク、体の微細な縦揺れ、LED明滅、リアクションモーションによって情緒的価値を作る。

## 2. システムアーキテクチャ・技術スタック

### 全体構成

```text
User Voice
  ↓
Browser Frontend
  - Microphone input
  - Rive character rendering
  - Local idle animation
  - Local backchannel animation/audio
  ↓ WebSocket / Streaming API
Backend
  - STT
  - LLM
  - Emotion / action code generation
  - TTS
  ↓ Streaming response
Browser Frontend
  - Audio playback
  - Rive state update
  - Lip-sync loop
  - Emotion animation
```

### フロントエンド

現在のモックアップは以下の構成で実装されている。

- Vite
- Vanilla JavaScript
- `@rive-app/canvas`
- HTML Canvas
- ローカルRiveファイル: `public/rive/wave-hear-and-talk.riv`

主要ファイル:

- `index.html`
  - `<canvas id="canvas" width="500" height="500"></canvas>` を配置
  - State Machine確認用の操作UIを配置
  - スマホ向けに、操作UI部分を `.control-scroll` でラップ
- `src/main.js`
  - Rive Runtimeの初期化
  - State Machine Inputの取得
  - Trigger発火
  - AI連携用グローバル関数の公開
- `src/style.css`
  - PCではCanvasと操作UIを横並びに配置
  - スマホではキャラクター領域を画面上部に固定し、操作UI部分のみを縦スクロール
  - iOS Safari向けに、スマホ時は `#app` を `position: fixed` + 縦Flexで構成

### バックエンド想定

本モックアップ時点ではバックエンドは未実装だが、将来的にはWebSocket等によるストリーミング接続を想定する。

想定パイプライン:

```text
STT → LLM → TTS
```

#### STT

ユーザー音声をテキスト化する。

要件:

- 低遅延
- ストリーミング対応
- モバイル回線でも破綻しにくいこと

#### LLM

ユーザー発話に対する返答テキストを生成する。

想定:

- Gemini 2.5 Flash相当
- 高速・低コスト
- 応答文と同時に感情コードやアクションコードを返す

返却データ例:

```json
{
  "text": "それいいね。じゃあ一緒にやってみよう。",
  "emotion": "happy",
  "action": "jump",
  "voiceStyle": "cheerful"
}
```

#### TTS

LLMの応答文を音声化する。

想定:

- ElevenLabs Flash相当
- 低遅延
- ストリーミング再生対応
- キャラクター性のある声質

## 3. フロントエンド描画・演出仕様

### Rive採用理由

Riveを採用する理由は以下の通り。

- `.riv` 形式で軽量なベクターアニメーションを扱える
- Canvas上で高速に描画できる
- State Machineにより、JavaScriptから状態遷移やTriggerを制御できる
- 低スペック端末でも60fpsを狙いやすい
- キャラクター表現、UIモーション、簡易リアクションに向いている

本プロダクトでは、Live2Dや3Dモデルのような重い表現よりも、軽量で安定したキャラクター表現を優先する。

### Rive State Machine設計

Rive側には、以下のようなState Machine Inputを用意する想定。

```text
State Machine
  - idle loop
  - talking loop
  - listening loop
  - backchannel reaction
  - emotion reaction
```

Input例:

```text
isTalking: Boolean
isListening: Boolean
emotion: Number / Enum相当
bump: Trigger
happy: Trigger
sad: Trigger
surprised: Trigger
```

初期検証では、`public/vehicles.riv` に対して以下を使用していた。

```text
Rive file: public/vehicles.riv
State Machine: bumpy
Trigger: bump
```

2026-06-13時点では、音声対話エージェントの状態確認により適したRiveファイルへ差し替えている。

```text
Rive file: public/rive/wave-hear-and-talk.riv
State Machine: State Machine 1
```

確認済みInput:

```text
Talk     Boolean
Hear     Boolean
Check    Boolean
Look     Number
success  Trigger
fail     Trigger
```

確認済みAnimation:

```text
hands_down          one-shot
hands_hear_start    one-shot
hands_hear_stop     one-shot
hands_up            one-shot ※Animation名に末尾スペースあり
fail                one-shot ※Animation名に末尾スペースあり
wave                one-shot
success             one-shot
look_idle           one-shot
Talk                loop
Look_down_right     one-shot
Look_down_left      one-shot
idle                loop
```

注意:

過去の検証・想定では、ステートマシン名 `bouncing` や、Input名 `truck`、`jeep `、`sportscar ` が話題に上がっていた。また初期検証用の `vehicles.riv` では `bumpy` / `bump` を使用していた。現在の実装では `public/rive/wave-hear-and-talk.riv` の `State Machine 1` を使用する。

今後Riveファイルを差し替える場合は、ブラウザコンソールで `stateMachineNames` と `stateMachineInputs(...)` を確認し、仕様書と実装の名前を同期すること。

### 簡易口パク仕様

本プロダクトでは、負荷の高い母音解析ベースのリップシンクは行わない。

代わりに、以下のいずれかで簡易的に口パクを制御する。

#### 案A: 再生中フラグ方式

TTS音声が再生中であれば、Riveの `isTalking` を `true` にする。

```js
riveInputs.isTalking.value = audioIsPlaying
```

仕様:

- 音声再生開始時に口パクループON
- 音声再生終了時に口パクループOFF
- 口形の正確性よりも軽量性と安定性を優先

#### 案B: 音量しきい値方式

Web Audio API等で再生中音声の音量を取得し、音量が一定値を超えたときだけ口パクをONにする。

```js
const isMouthOpen = volume > threshold
```

仕様:

- 無音部分では口を閉じる
- 母音解析はしない
- 音量ベースのため端末負荷が低い

### 生きている感の演出

ユーザーが話していない間も、キャラクターが完全停止していると無機質に見える。

そのため、以下の常時ループ演出をRive側で実装する。

- 体全体の微細な縦揺れ
- 胸や装飾パーツのLED明滅
- 目線や表情の小さな変化
- 呼吸のようなゆっくりしたスケール変化

重要な方針:

- 常時再生する演出は軽量にする
- JavaScriptで毎フレーム制御しない
- Rive側のループアニメーションで完結させる
- 状態遷移用のTriggerやBooleanのみJavaScriptから操作する

### ローカル相槌仕様

音声対話AIでは、ユーザー発話後にサーバー応答待ちの沈黙が発生する。

この沈黙を体感させないため、ブラウザ側で即座に相槌を返す。

#### 目的

- サーバー処理待ちの無音感を減らす
- AIが聞いている感を演出する
- 実際の応答生成前に、軽いリアクションを返す

#### 想定演出

- 小さくうなずく
- 体が一瞬跳ねる
- LEDが短く光る
- 「うん」「なるほど」「へえ」などの短尺音声を再生する

#### 実装方針

- サーバー応答を待たず、ブラウザ内で即時実行
- 相槌音声はローカルにプリロード
- 相槌モーションはRive Triggerで発火
- 本命のTTS応答が始まったら、相槌演出を終了または上書きする

## 4. 現在の実装ステータスとデバッグ履歴

### 開発環境

現在の開発環境:

```text
Vite + Vanilla JavaScript + @rive-app/canvas
```

`package.json` の主要スクリプト:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

依存関係:

```json
{
  "@rive-app/canvas": "^2.38.0",
  "vite": "^8.0.12"
}
```

### 実装済みの画面

現在は、Rive表示とState Machine Input確認用のデバッグ画面である。

- 画面中央にCanvasを表示
- Canvasサイズは `500 x 500`
- PC横長画面ではCanvasと操作UIを横並び表示
- スマホ画面ではCanvasを上部に固定し、操作UIだけをスクロール可能にする
- Agent Stateプリセットを操作可能
- `Talk` / `Hear` / `Check` のBoolean Inputをトグル可能
- `Look` のNumber Inputをスライダーとボタンで操作可能
- `success` / `fail` Triggerを発火可能
- Rive読み込み後のInput一覧を画面上に表示

`index.html` の構成:

```html
<main id="app">
  <section class="stage-panel" aria-label="Riveプレビュー">
    <canvas id="canvas" width="500" height="500"></canvas>
    <p id="status" class="status" aria-live="polite">Loading Rive...</p>
  </section>

  <section class="control-panel" aria-label="State Machine操作">
    <div class="control-scroll">
      <!-- Agent States / Boolean Inputs / Look Number / Triggers / Loaded Inputs -->
    </div>
  </section>
</main>
```

### スマホ向けUIレイアウト

スマホでは、操作ボタンを下方向にスクロールしてもキャラクターが画面外へ流れないようにしている。

実装方針:

- `840px` 以下では `#app` を `position: fixed` にし、ビューポート全体をアプリ領域として固定する
- `#app` は縦方向のFlexレイアウトに切り替える
- `.stage-panel` は上部の固定領域として扱う
- `.control-panel` は残り高さを受け取る外枠にする
- `.control-scroll` だけに `overflow-y: scroll` を指定し、ボタン類とInput一覧をスクロール対象にする
- iOS Safari対策として `-webkit-overflow-scrolling: touch` と `touch-action: pan-y` を指定する
- セーフエリアを考慮し、上下paddingに `env(safe-area-inset-top)` / `env(safe-area-inset-bottom)` を使う

過去の中間案では、スマホ時にGridの2段目へ `.control-panel` を置き、その内側の `.control-scroll` を `height: 100%` でスクロールさせようとした。しかしiPhone 12 / Safariでは内側スクロール領域が期待通りに実高さを掴めず、ボタン類が表示範囲外でクリップされ、ページ全体のスクロールもできない状態になった。

最終的には、スマホ時のみGridを使わず `position: fixed` + Flexに切り替えることで、iPhone 12 / Safariでも操作UI部分のみスクロールできることを確認済み。

### Rive読み込み

現在のRive読み込み対象:

```js
const r = new Rive({
  src: '/rive/wave-hear-and-talk.riv',
  canvas: document.getElementById('canvas'),
  autoplay: true,
  stateMachines: 'State Machine 1'
})
```

ローカルファイルを使う理由:

- 外部URLのRiveファイルでは `HTTP 403` が発生する可能性がある
- 外部ファイルは内容やState Machine名が変わる可能性がある
- モックアップの再現性を高めるため、`public/rive/wave-hear-and-talk.riv` を固定して使う

### State Machine / Inputの確認

現在確認済みの構成:

```text
State Machine: State Machine 1
Inputs:
  Talk     Boolean
  Hear     Boolean
  Check    Boolean
  Look     Number
  success  Trigger
  fail     Trigger
```

起動後に以下をログ出力して、Riveファイルの中身を確認している。

- 利用可能なステートマシン一覧
- 使用中のステートマシン名
- 取得されたInput一覧
- trim後のInput名一覧
- Input操作の成功または失敗ログ

### Input名の空白問題への対策

RiveのInput名には、制作時のデータに起因して末尾スペースが混入する可能性がある。

例:

```text
"jeep "
"sportscar "
```

この場合、単純な文字列一致では検知できない。

```js
input.name === 'jeep'
```

上記は、実際のInput名が `"jeep "` の場合に `false` になる。

そのため、現在の `src/main.js` では比較時に `.trim()` を使う。

```js
const inputName = (input) => String(input?.name ?? '').trim()

const findInput = (targetName) =>
  riveInputs.find((input) => inputName(input) === targetName) ?? null
```

この方針は今後も維持する。

理由:

- Rive側のデータに意図しない空白が入っていても壊れにくい
- デバッグログで `rawName` と `trimmedName` の両方を確認できる
- Riveファイル差し替え時の調査が容易になる

### Input操作処理

現在は、Rive Inputを名前で取得し、型ごとに操作する汎用ヘルパーを使用している。

```js
const setBoolean = (name, value) => {
  const input = findInput(name)
  input.value = Boolean(value)
}

const setNumber = (name, value) => {
  const input = findInput(name)
  input.value = Number(value)
}

const fireTrigger = (name) => {
  const input = findInput(name)
  input.fire()
}
```

各ヘルパーでは、Inputが存在しない場合や型が一致しない場合にconsoleへ警告を出す。

### AI連携用グローバル関数

将来の音声AI連携に備えて、現在は `window` に関数を公開している。

#### `window.setAgentState(stateName)`

AIエージェントの状態プリセットを切り替える。

対応State:

- `idle`
- `listening`
- `thinking`
- `talking`
- `success`
- `fail`

```js
window.setAgentState('listening')
window.setAgentState('talking')
```

#### `window.handleAgentEvent(event)`

AI応答イベントを受け取り、Rive Inputへ反映する統一窓口。

```js
window.handleAgentEvent({
  state: 'talking',
  action: 'success',
  emotion: 'happy',
  look: 1
})
```

#### `window.riveDebug`

デバッグ用にInput操作関数を公開している。

```js
window.riveDebug = {
  inputs,
  findInput,
  setBoolean,
  setNumber,
  fireTrigger,
  setAgentState,
  handleAgentEvent
}
```

旧APIの `window.fireJumpFromAI()` と `window.fireVehicleTriggerFromAI()` は互換用に残し、現在はSuccess Flowのモック応答を実行する。

### 現在の確認済み動作

確認済み:

- `public/rive/wave-hear-and-talk.riv` をVite経由で読み込める
- Rive Canvasがブラウザ上に表示される
- `State Machine 1` を起動できる
- `Talk` / `Hear` / `Check` のBoolean Inputを操作できる
- `Look` のNumber Inputを操作できる
- `success` / `fail` Triggerを発火できる
- `window.setAgentState()` と `window.handleAgentEvent()` から状態を操作できる
- Input名比較では `.trim()` により末尾スペース混入に備えている
- iPhone 12 / Safariで、キャラクターを画面上部に表示したまま操作UI部分のみスクロールできる

### 既知の注意点

- 現在の `vehicles.riv` は旧検証用ファイルであり、アプリ上では使用していない
- `truck` / `jeep` / `sportscar` のTriggerは現行ファイルでは確認されていない
- `Look` のNumber値の意味と最適な値域は実機で追加確認が必要
- Animation名の `hands_up ` と `fail ` には末尾スペースが含まれる
- 現在の発話処理はコンソールログのみで、実際のTTS音声再生は未実装
- 実際のマイク入力、STT、LLM、TTS、WebSocket接続は未実装
- 口パク制御は現行Riveの `Talk` Booleanを使う想定

## 5. 今後の開発ロードマップ

### Step 1: `Look` Numberの値域確認

現在のUIでは、`Look` を `0` / `1` / `2` の範囲で操作できるようにしている。

ただし、Rive RuntimeからはNumber Inputの意味や推奨値域までは取得できないため、ブラウザ上で実際の見た目を確認し、以下を決める必要がある。

- `0` / `1` / `2` がそれぞれ何を表すか
- 値域を `0〜2` の離散値に固定するか
- スライダーをより細かい値にする必要があるか

### Step 2: モック用AI応答データを追加する

バックエンド未接続のまま、フロント側でAI応答の見え方を検証する。

モックデータ例:

```js
const mockAgentEvents = [
  {
    text: 'こんにちは。今日は何をする？',
    emotion: 'neutral',
    state: 'talking',
    audioUrl: '/mock-audio/hello.mp3'
  },
  {
    text: 'いいね、それ楽しそう。',
    emotion: 'happy',
    action: 'success',
    audioUrl: '/mock-audio/happy.mp3'
  }
]
```

検証したい項目:

- 感情ごとのアニメーション切り替え
- 音声再生と口パクの同期
- 連続イベント時のガード処理
- 相槌と本応答の競合制御

### Step 3: 簡易口パクの実装

TTS音声再生と連動して、Riveの口パクInputを制御する。

最初は再生中フラグ方式でよい。

```js
audio.addEventListener('play', () => {
  window.handleAgentEvent({ isTalking: true })
})

audio.addEventListener('ended', () => {
  window.handleAgentEvent({ isTalking: false })
})
```

次に、必要であれば音量しきい値方式へ拡張する。

### Step 4: ローカル相槌の実装

ユーザー発話終了直後またはサーバー送信直後に、短い相槌をローカルで返す。

想定関数:

```js
function playLocalBackchannel() {
  window.handleAgentEvent({ state: 'listening' })
  playLocalAudio('/audio/backchannel/un.mp3')
}
```

制御ルール:

- ユーザー発話終了後、一定確率または一定条件で相槌を再生
- サーバーから本応答が返ってきたら相槌を停止またはフェードアウト
- 同時に複数の相槌が鳴らないようにする

### Step 5: WebSocket接続の追加

バックエンドと接続し、AI応答イベントをストリーミングで受け取る。

想定イベント:

```json
{
  "type": "agent_response_start",
  "emotion": "happy",
  "state": "talking",
  "action": "success"
}
```

```json
{
  "type": "tts_audio_chunk",
  "audio": "base64..."
}
```

```json
{
  "type": "agent_response_end"
}
```

フロント側では、イベント種別ごとにRiveと音声再生を同期する。

### Step 6: 実機検証

ターゲット端末で実機検証を行う。

確認項目:

- iPhone 12〜14でのfps
- 数年前のAndroidでのfps
- 長時間動作時の発熱
- 音声再生と口パクのズレ
- Riveアニメーションの読み込み時間
- WebSocket再接続時の復帰
- 低速回線での体感遅延

### Step 7: 本番用キャラクターRiveへの差し替え

現在の `wave-hear-and-talk.riv` は検証用ファイルである。

本番キャラクター用Riveでは、以下をRive側に用意する。

推奨State Machine Input:

```text
isIdle: Boolean
isListening: Boolean
isThinking: Boolean
isTalking: Boolean
backchannel: Trigger
jump: Trigger
happy: Trigger
sad: Trigger
surprised: Trigger
angry: Trigger
emotionLevel: Number
```

Rive制作時の注意:

- Input名に末尾スペースを入れない
- State Machine名を仕様書と一致させる
- JavaScript側で使うInput名を一覧化する
- アニメーションは軽量に保つ
- 常時ループはRive側に閉じ込める
- JSから毎フレーム細かく制御しない

## 開発方針まとめ

本モックアップの主目的は、AI音声対話エージェントの完成形をいきなり作ることではなく、以下の技術的リスクを小さく検証することである。

- RiveをWeb上で安定表示できるか
- JavaScriptからRive演出を確実に制御できるか
- AI応答イベントとキャラクター演出を同期できるか
- 低負荷な簡易口パクで十分な体験価値を作れるか
- サーバー遅延中の沈黙をローカル相槌で軽減できるか

現在は、Rive表示とTrigger発火の最小土台が完成している。

現在の開発フェーズでは、AI応答データを受け取る統一窓口として `window.handleAgentEvent()` と `window.setAgentState()` を用意済みである。次のフェーズでは、実際のTTS音声再生、簡易口パク、ローカル相槌、WebSocketイベントを段階的に接続していく。
