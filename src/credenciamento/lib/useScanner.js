import { useCallback, useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'

/* =====================================================================
   useScanner — abre a câmera traseira e lê QR Codes continuamente.
   ---------------------------------------------------------------------
   Usa getUserMedia + jsQR sobre um canvas oculto. Chama onDetect(text)
   uma vez por leitura; enquanto `paused` estiver true (ex.: mostrando o
   resultado), não dispara novas detecções.
   ===================================================================== */
export function useScanner({ onDetect, paused }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(0)
  const pausedRef = useRef(paused)
  const onDetectRef = useRef(onDetect)
  const lastRef = useRef({ text: '', at: 0 })

  const [status, setStatus] = useState('idle') // idle | starting | running | denied | error | insecure
  const [torchSupported, setTorchSupported] = useState(false)
  const [torchOn, setTorchOn] = useState(false)

  useEffect(() => {
    pausedRef.current = paused
  }, [paused])
  useEffect(() => {
    onDetectRef.current = onDetect
  }, [onDetect])

  const tick = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA && !pausedRef.current) {
      const w = video.videoWidth
      const h = video.videoHeight
      if (w && h) {
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        ctx.drawImage(video, 0, 0, w, h)
        const img = ctx.getImageData(0, 0, w, h)
        const code = jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' })
        if (code && code.data) {
          const now = Date.now()
          // evita disparar o mesmo código várias vezes seguidas
          if (code.data !== lastRef.current.text || now - lastRef.current.at > 2500) {
            lastRef.current = { text: code.data, at: now }
            onDetectRef.current?.(code.data)
          }
        }
      }
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus(window.isSecureContext ? 'error' : 'insecure')
      return
    }
    setStatus('starting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      const video = videoRef.current
      if (!video) return
      video.srcObject = stream
      await video.play().catch(() => {})
      setStatus('running')

      const track = stream.getVideoTracks()[0]
      const caps = track?.getCapabilities?.()
      setTorchSupported(!!caps?.torch)

      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(tick)
    } catch (err) {
      setStatus(err?.name === 'NotAllowedError' ? 'denied' : 'error')
    }
  }, [tick])

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    const stream = streamRef.current
    if (stream) stream.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setTorchOn(false)
  }, [])

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks?.()[0]
    if (!track) return
    const next = !torchOn
    try {
      await track.applyConstraints({ advanced: [{ torch: next }] })
      setTorchOn(next)
    } catch {
      /* dispositivo sem lanterna */
    }
  }, [torchOn])

  useEffect(() => {
    start()
    return stop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { videoRef, canvasRef, status, retry: start, torchSupported, torchOn, toggleTorch }
}
