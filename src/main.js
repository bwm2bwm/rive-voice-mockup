import './style.css'
import { Rive } from '@rive-app/canvas'

let riveInputs = []
let bumpTrigger = null
let isAgentResponding = false

const inputName = (input) => String(input?.name ?? '').trim()

const findInput = (targetName) =>
  riveInputs.find((input) => inputName(input) === targetName) ?? null

const logMissingBumpTrigger = () => {
  console.warn(
    '[Rive] "bump" というトリガーが見つかりません。実際のインプット一覧:',
    riveInputs.map((input) => ({
      rawName: input?.name,
      trimmedName: inputName(input),
      type: input?.type,
      hasFire: typeof input?.fire === 'function',
    })),
  )
}

const fireJump = () => {
  bumpTrigger = findInput('bump')

  if (typeof bumpTrigger?.fire === 'function') {
    console.log('[Rive] jump/bump トリガー発火成功')
    bumpTrigger.fire()
  } else {
    logMissingBumpTrigger()
  }
}

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

// 既存の呼び出し口との互換用。引数は受け取るが、現在のRiveはbumpのみを発火する。
window.fireVehicleTriggerFromAI = function () {
  window.fireJumpFromAI()
}

function speakAgentDialogue() {
  console.log(
    '%cエージェントの声: 「ジャンプするよ！」',
    'color: #007bff; font-weight: bold; font-size: 14px;',
  )
}

const initializeStateMachine = () => {
  const stateMachineNames = r.stateMachineNames ?? []
  console.log('利用可能なステートマシン一覧:', stateMachineNames)

  const activeStateMachineName =
    stateMachineNames.find((name) => inputName({ name }) === 'bumpy') ?? stateMachineNames[0]

  if (!activeStateMachineName) {
    console.warn('[Rive] このRiveファイルにはステートマシンが見つかりません。')
    riveInputs = []
    return
  }

  console.log(`[Rive] 使用中のステートマシン: ${activeStateMachineName}`)

  riveInputs = r.stateMachineInputs(activeStateMachineName) ?? []
  console.log(`取得された "${activeStateMachineName}" の生インプット群:`, riveInputs)
  console.log(
    '整形後のインプット一覧:',
    riveInputs.map((input) => `${input?.name} -> "${inputName(input)}" (${input?.type})`),
  )

  bumpTrigger = findInput('bump')

  if (bumpTrigger) {
    console.log('ジャンプ用トリガーを取得しました:', bumpTrigger)
  } else {
    logMissingBumpTrigger()
  }
}

const r = new Rive({
  src: '/vehicles.riv',
  canvas: document.getElementById('canvas'),
  autoplay: true,
  stateMachines: 'bumpy',
  onLoad: () => {
    r.resizeDrawingSurfaceToCanvas()
    console.log('--- Rive Loaded Successfully (Local) ---')

    try {
      initializeStateMachine()
    } catch (error) {
      console.error('Rive読み込み後の解析中にエラーが発生しました:', error)
    }
  },
  onLoadError: (error) => {
    console.error('Riveファイルの読み込みに失敗しました:', error)
  },
})

document.getElementById('btn-jump')?.addEventListener('click', () => {
  window.fireJumpFromAI()
})
