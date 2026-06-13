import './style.css'
import { Rive, StateMachineInputType } from '@rive-app/canvas'

const RIVE_SOURCE = '/rive/wave-hear-and-talk.riv'
const PREFERRED_STATE_MACHINE = 'State Machine 1'

let riveInputs = []
let activeStateMachineName = ''
let isAgentResponding = false

const $ = (selector) => document.querySelector(selector)
const $$ = (selector) => Array.from(document.querySelectorAll(selector))

const inputName = (input) => String(input?.name ?? '').trim()

const inputTypeName = (input) => {
  if (input?.type === StateMachineInputType.Boolean) return 'Boolean'
  if (input?.type === StateMachineInputType.Number) return 'Number'
  if (input?.type === StateMachineInputType.Trigger) return 'Trigger'
  return `Unknown (${input?.type ?? 'n/a'})`
}

const inputValue = (input) => {
  if (input?.type === StateMachineInputType.Trigger) return '-'
  return String(input?.value ?? '')
}

const findInput = (targetName) =>
  riveInputs.find((input) => inputName(input) === targetName) ?? null

const refreshInputTable = () => {
  const tableBody = $('#input-list')
  if (!tableBody) return

  tableBody.innerHTML = riveInputs
    .map(
      (input) => `
        <tr>
          <td>${input?.name ?? ''}</td>
          <td>${inputName(input)}</td>
          <td>${inputTypeName(input)}</td>
          <td>${inputValue(input)}</td>
        </tr>
      `,
    )
    .join('')
}

const setStatus = (message) => {
  const status = $('#status')
  if (status) status.textContent = message
}

const syncControlState = () => {
  for (const control of $$('[data-boolean]')) {
    const input = findInput(control.dataset.boolean)
    control.checked = Boolean(input?.value)
  }

  const lookInput = findInput('Look')
  const lookSlider = $('#look-slider')
  const lookValue = $('#look-value')

  if (lookSlider && lookInput) {
    lookSlider.value = Number(lookInput.value)
  }

  if (lookValue && lookInput) {
    lookValue.textContent = String(lookInput.value)
  }

  refreshInputTable()
}

const logInputs = () => {
  console.log(
    '整形後のインプット一覧:',
    riveInputs.map((input) => ({
      rawName: input?.name,
      trimmedName: inputName(input),
      type: inputTypeName(input),
      value: inputValue(input),
      hasFire: typeof input?.fire === 'function',
    })),
  )
}

const warnMissingInput = (name) => {
  console.warn(`[Rive] "${name}" というInputが見つかりません。実際のInput一覧:`, riveInputs)
}

const setBoolean = (name, value) => {
  const input = findInput(name)

  if (!input) {
    warnMissingInput(name)
    return false
  }

  if (input.type !== StateMachineInputType.Boolean) {
    console.warn(`[Rive] "${name}" はBooleanではありません。type=${inputTypeName(input)}`)
    return false
  }

  input.value = Boolean(value)
  console.log(`[Rive] Boolean "${name}" = ${input.value}`)
  syncControlState()
  return true
}

const setNumber = (name, value) => {
  const input = findInput(name)
  const numericValue = Number(value)

  if (!input) {
    warnMissingInput(name)
    return false
  }

  if (input.type !== StateMachineInputType.Number) {
    console.warn(`[Rive] "${name}" はNumberではありません。type=${inputTypeName(input)}`)
    return false
  }

  if (Number.isNaN(numericValue)) {
    console.warn(`[Rive] "${name}" に数値ではない値が渡されました:`, value)
    return false
  }

  input.value = numericValue
  console.log(`[Rive] Number "${name}" = ${input.value}`)
  syncControlState()
  return true
}

const fireTrigger = (name) => {
  const input = findInput(name)

  if (!input) {
    warnMissingInput(name)
    return false
  }

  if (input.type !== StateMachineInputType.Trigger || typeof input.fire !== 'function') {
    console.warn(`[Rive] "${name}" はTriggerではありません。type=${inputTypeName(input)}`)
    return false
  }

  input.fire()
  console.log(`[Rive] Trigger "${name}" fired`)
  refreshInputTable()
  return true
}

const resetBooleans = () => {
  setBoolean('Talk', false)
  setBoolean('Hear', false)
  setBoolean('Check', false)
}

const setAgentState = (stateName) => {
  const state = String(stateName ?? '').trim()

  resetBooleans()

  switch (state) {
    case 'idle':
      setStatus('Agent state: idle')
      break
    case 'listening':
      setBoolean('Hear', true)
      setStatus('Agent state: listening')
      break
    case 'thinking':
      setBoolean('Check', true)
      setStatus('Agent state: thinking')
      break
    case 'talking':
      setBoolean('Talk', true)
      setStatus('Agent state: talking')
      break
    case 'success':
      fireTrigger('success')
      setStatus('Agent state: success')
      break
    case 'fail':
      fireTrigger('fail')
      setStatus('Agent state: fail')
      break
    default:
      console.warn(`[AI Agent] 未定義のstateです: ${state}`)
      setStatus(`Unknown state: ${state}`)
      return false
  }

  syncControlState()
  return true
}

const handleAgentEvent = (event = {}) => {
  const { state, action, isTalking, isListening, isThinking, look, emotion } = event

  if (state) {
    setAgentState(state)
  }

  if (typeof isTalking === 'boolean') {
    setBoolean('Talk', isTalking)
  }

  if (typeof isListening === 'boolean') {
    setBoolean('Hear', isListening)
  }

  if (typeof isThinking === 'boolean') {
    setBoolean('Check', isThinking)
  }

  if (look !== undefined) {
    setNumber('Look', look)
  }

  if (action === 'success' || emotion === 'happy') {
    fireTrigger('success')
  }

  if (action === 'fail' || emotion === 'sad') {
    fireTrigger('fail')
  }

  console.log('[AI Agent] handleAgentEvent:', event)
  syncControlState()
}

const runMockResponse = (result) => {
  if (isAgentResponding) {
    console.log('[AI Agent] エージェントが応答中のため、モック応答をガードしました。')
    return
  }

  isAgentResponding = true
  handleAgentEvent({ state: 'thinking' })

  setTimeout(() => {
    handleAgentEvent({ state: 'talking', action: result })
  }, 600)

  setTimeout(() => {
    setAgentState('idle')
    isAgentResponding = false
  }, 2600)
}

const initializeStateMachine = (rive) => {
  const stateMachineNames = rive.stateMachineNames ?? []
  console.log('利用可能なステートマシン一覧:', stateMachineNames)

  activeStateMachineName =
    stateMachineNames.find((name) => inputName({ name }) === PREFERRED_STATE_MACHINE) ??
    stateMachineNames[0] ??
    ''

  if (!activeStateMachineName) {
    console.warn('[Rive] このRiveファイルにはステートマシンが見つかりません。')
    riveInputs = []
    setStatus('No state machine found')
    refreshInputTable()
    return
  }

  riveInputs = rive.stateMachineInputs(activeStateMachineName) ?? []
  console.log(`[Rive] 使用中のステートマシン: ${activeStateMachineName}`)
  console.log(`取得された "${activeStateMachineName}" の生インプット群:`, riveInputs)
  logInputs()

  const stateMachineLabel = $('#state-machine-name')
  if (stateMachineLabel) stateMachineLabel.textContent = activeStateMachineName

  setStatus('Rive loaded')
  syncControlState()
}

const setupControls = () => {
  for (const control of $$('[data-boolean]')) {
    control.addEventListener('change', () => {
      setBoolean(control.dataset.boolean, control.checked)
    })
  }

  for (const button of $$('[data-trigger]')) {
    button.addEventListener('click', () => {
      fireTrigger(button.dataset.trigger)
    })
  }

  for (const button of $$('[data-state]')) {
    button.addEventListener('click', () => {
      setAgentState(button.dataset.state)
    })
  }

  for (const button of $$('[data-look]')) {
    button.addEventListener('click', () => {
      setNumber('Look', button.dataset.look)
    })
  }

  $('#look-slider')?.addEventListener('input', (event) => {
    setNumber('Look', event.target.value)
  })

  $('#mock-success')?.addEventListener('click', () => {
    runMockResponse('success')
  })

  $('#mock-fail')?.addEventListener('click', () => {
    runMockResponse('fail')
  })

  $('#reset')?.addEventListener('click', () => {
    setAgentState('idle')
    setNumber('Look', 0)
  })
}

const r = new Rive({
  src: RIVE_SOURCE,
  canvas: document.getElementById('canvas'),
  autoplay: true,
  stateMachines: PREFERRED_STATE_MACHINE,
  onLoad: () => {
    r.resizeDrawingSurfaceToCanvas()
    console.log('--- Rive Loaded Successfully ---')

    try {
      initializeStateMachine(r)
    } catch (error) {
      console.error('Rive読み込み後の解析中にエラーが発生しました:', error)
      setStatus('Rive initialization failed')
    }
  },
  onLoadError: (error) => {
    console.error('Riveファイルの読み込みに失敗しました:', error)
    setStatus('Rive load failed')
  },
})

setupControls()

window.setAgentState = setAgentState
window.handleAgentEvent = handleAgentEvent
window.riveDebug = {
  get inputs() {
    return riveInputs
  },
  findInput,
  setBoolean,
  setNumber,
  fireTrigger,
  setAgentState,
  handleAgentEvent,
}

// 旧モック用APIとの互換。新Riveではtalking状態の短いモック応答として扱う。
window.fireJumpFromAI = function () {
  runMockResponse('success')
}

window.fireVehicleTriggerFromAI = function () {
  window.fireJumpFromAI()
}
