/* Feedback tátil + sonoro para a portaria (confirma sem olhar a tela). */
let audioCtx = null
function ctx() {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (AC) audioCtx = new AC()
  }
  return audioCtx
}

function beep(freq, duration, when = 0) {
  const ac = ctx()
  if (!ac) return
  if (ac.state === 'suspended') ac.resume().catch(() => {})
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  const t0 = ac.currentTime + when
  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
  osc.connect(gain).connect(ac.destination)
  osc.start(t0)
  osc.stop(t0 + duration + 0.02)
}

const vibrate = (pattern) => {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* sem suporte */
  }
}

/** Sinaliza o resultado da validação. */
export function feedback(result) {
  if (result === 'approved') {
    vibrate(60)
    beep(880, 0.12)
    beep(1320, 0.12, 0.13) // dois tons subindo = aprovado
  } else {
    vibrate([90, 60, 90])
    beep(220, 0.28) // grave longo = negado
  }
}
