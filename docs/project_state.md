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
- ローカルRiveファイル: `public/vehicles.riv`

主要ファイル:

- `index.html`
  - `<canvas id="canvas" width="500" height="500"></canvas>` を配置
  - 操作用の `ジャンプ` ボタンを配置
- `src/main.js`
  - Rive Runtimeの初期化
  - State Machine Inputの取得
  - Trigger発火
  - AI連携用グローバル関数の公開
- `src/style.css`
  - 画面中央にCanvasとボタンを配置
  - 最小限のモックアップUIスタイルを定義

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

現在の実装では、`public/vehicles.riv` に対して以下を使用している。

```text
Rive file: public/vehicles.riv
State Machine: bumpy
Trigger: bump
```

注意:

過去の検証・想定では、ステートマシン名 `bouncing` や、Input名 `truck`、`jeep `、`sportscar ` が話題に上がっていた。ただし、現在のリポジトリ内ドキュメントおよび実装確認時点では、実際に使用しているステートマシンは `bumpy`、Triggerは `bump` である。

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

現在は、Rive表示確認用の最小画面である。

- 画面中央にCanvasを表示
- Canvasサイズは `500 x 500`
- Canvas下に `ジャンプ` ボタンを配置
- ボタン押下でRive Triggerを発火

`index.html` の構成:

```html
<main id="app">
  <div class="rive-stage">
    <canvas id="canvas" width="500" height="500"></canvas>
    <div class="controls" aria-label="アニメーション操作">
      <button id="btn-jump" type="button">ジャンプ</button>
    </div>
  </div>
</main>
```

### Rive読み込み

現在のRive読み込み対象:

```js
const r = new Rive({
  src: '/vehicles.riv',
  canvas: document.getElementById('canvas'),
  autoplay: true,
  stateMachines: 'bumpy'
})
```

ローカルファイルを使う理由:

- 外部URLのRiveファイルでは `HTTP 403` が発生する可能性がある
- 外部ファイルは内容やState Machine名が変わる可能性がある
- モックアップの再現性を高めるため、`public/vehicles.riv` を固定して使う

### State Machine / Inputの確認

現在確認済みの構成:

```text
State Machine: bumpy
Input: bump
Input type: Trigger
```

起動後に以下をログ出力して、Riveファイルの中身を確認している。

- 利用可能なステートマシン一覧
- 使用中のステートマシン名
- 取得されたInput一覧
- trim後のInput名一覧
- Trigger取得成功または失敗ログ

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

### Trigger発火処理

現在のTrigger発火処理:

```js
const fireJump = () => {
  bumpTrigger = findInput('bump')

  if (typeof bumpTrigger?.fire === 'function') {
    console.log('[Rive] jump/bump トリガー発火成功')
    bumpTrigger.fire()
  } else {
    logMissingBumpTrigger()
  }
}
```

`bump` Triggerが見つからない場合は、Input一覧をログ出力して原因調査しやすくしている。

### AI連携用グローバル関数

将来の音声AI連携に備えて、現在は `window` に関数を公開している。

#### `window.fireJumpFromAI()`

現在の主API。

AI応答や音声イベントに合わせて、ジャンプアニメーションと仮の発話ログを発火する。

```js
window.fireJumpFromAI = function () {
  if (isAgentResponding) {
    console.log('[AI Agent] エージェントが発話中のため、リクエストをガードしました。')
    return
  }

  console.log('[AI Agent] AIの発話演出と連動してジャンプします。')
  isAgentResponding = true

  fireJump()
  speakAgentDialogue()

  setTimeout(() => {
    isAgentResponding = false
    console.log('[AI Agent] エージェントの発話演出が終了しました。')
  }, 2000)
}
```

役割:

- 外部イベントからRive演出を発火する入口
- 二重発火を防ぐ簡易ガード
- 将来のAI応答イベント連携の土台

#### `window.fireVehicleTriggerFromAI()`

過去の車種切り替え想定との互換用API。

現在は内部で `fireJumpFromAI()` を呼ぶ。

```js
window.fireVehicleTriggerFromAI = function () {
  window.fireJumpFromAI()
}
```

### 現在の確認済み動作

確認済み:

- `public/vehicles.riv` をVite経由で読み込める
- Rive Canvasがブラウザ上に表示される
- `bumpy` State Machineを起動できる
- `bump` Triggerを取得できる
- `ジャンプ` ボタン押下でアニメーションが発火する
- `window.fireJumpFromAI()` からも同じ演出を発火できる
- Input名比較では `.trim()` により末尾スペース混入に備えている

### 既知の注意点

- 現在の `vehicles.riv` は車種切り替え用ではない
- `truck` / `jeep` / `sportscar` のTriggerは現行ファイルでは確認されていない
- 車種切り替えを行うには、Riveファイル側に対応するInputを追加する必要がある
- 現在の発話処理はコンソールログのみで、実際のTTS音声再生は未実装
- 実際のマイク入力、STT、LLM、TTS、WebSocket接続は未実装
- 口パク制御用の `isTalking` InputはまだRiveファイル側・JS側ともに本実装されていない

## 5. 今後の開発ロードマップ

### Step 1: AIイベント連携用の統一窓口を作る

現在は `window.fireJumpFromAI()` のみが主な入口になっている。

次の段階では、AI応答データを受け取り、感情・発話・アクションをまとめて処理する関数を用意する。

案:

```js
window.handleAgentEvent = function (event) {
  const { text, emotion, action, audioUrl } = event

  setEmotion(emotion)
  fireAction(action)
  playVoice(audioUrl)
}
```

入力例:

```json
{
  "text": "それいいね。やってみよう。",
  "emotion": "happy",
  "action": "jump",
  "audioUrl": "/mock/voice/happy-001.mp3"
}
```

この関数を将来のWebSocket受信処理、テストボタン、デバッグコンソールから共通利用する。

### Step 2: Rive Inputの抽象化

現在は `bump` Triggerを直接探して発火している。

今後は、Rive Inputを名前で取得・操作するヘルパーを整備する。

例:

```js
const fireTrigger = (name) => {
  const input = findInput(name)

  if (typeof input?.fire === 'function') {
    input.fire()
  }
}

const setBoolean = (name, value) => {
  const input = findInput(name)

  if (input && 'value' in input) {
    input.value = value
  }
}
```

これにより、以下のような制御をしやすくする。

```js
fireTrigger('happy')
fireTrigger('backchannel')
setBoolean('isTalking', true)
setBoolean('isListening', false)
```

### Step 3: モック用AI応答データを追加する

バックエンド未接続のまま、フロント側でAI応答の見え方を検証する。

モックデータ例:

```js
const mockAgentEvents = [
  {
    text: 'こんにちは。今日は何をする？',
    emotion: 'neutral',
    action: 'idle',
    audioUrl: '/mock-audio/hello.mp3'
  },
  {
    text: 'いいね、それ楽しそう。',
    emotion: 'happy',
    action: 'jump',
    audioUrl: '/mock-audio/happy.mp3'
  }
]
```

検証したい項目:

- 感情ごとのアニメーション切り替え
- 音声再生と口パクの同期
- 連続イベント時のガード処理
- 相槌と本応答の競合制御

### Step 4: 簡易口パクの実装

TTS音声再生と連動して、Riveの口パクInputを制御する。

最初は再生中フラグ方式でよい。

```js
audio.addEventListener('play', () => {
  setBoolean('isTalking', true)
})

audio.addEventListener('ended', () => {
  setBoolean('isTalking', false)
})
```

次に、必要であれば音量しきい値方式へ拡張する。

### Step 5: ローカル相槌の実装

ユーザー発話終了直後またはサーバー送信直後に、短い相槌をローカルで返す。

想定関数:

```js
function playLocalBackchannel() {
  fireTrigger('backchannel')
  playLocalAudio('/audio/backchannel/un.mp3')
}
```

制御ルール:

- ユーザー発話終了後、一定確率または一定条件で相槌を再生
- サーバーから本応答が返ってきたら相槌を停止またはフェードアウト
- 同時に複数の相槌が鳴らないようにする

### Step 6: WebSocket接続の追加

バックエンドと接続し、AI応答イベントをストリーミングで受け取る。

想定イベント:

```json
{
  "type": "agent_response_start",
  "emotion": "happy",
  "action": "jump"
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

### Step 7: 実機検証

ターゲット端末で実機検証を行う。

確認項目:

- iPhone 12〜14でのfps
- 数年前のAndroidでのfps
- 長時間動作時の発熱
- 音声再生と口パクのズレ
- Riveアニメーションの読み込み時間
- WebSocket再接続時の復帰
- 低速回線での体感遅延

### Step 8: 本番用キャラクターRiveへの差し替え

現在の `vehicles.riv` は検証用ファイルである。

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

次の開発フェーズでは、`window.fireJumpFromAI()` を発展させ、AI応答データを受け取る統一窓口を実装する。その上で、感情コード、音声再生、口パク、相槌モーションを段階的に接続していく。
