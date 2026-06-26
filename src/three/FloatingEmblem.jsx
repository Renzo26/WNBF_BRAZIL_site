import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'
import EmblemModel from './EmblemModel'
import { CAM_FOV, CAM_Z, DESKTOP, EMBLEM_ASPECT, MOBILE, WORLD_H } from './emblemKeyframes'

const GREEN = '#86c63c'
const GREEN_HI = '#a8e35d'

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const smoothstep = (t) => t * t * (3 - 2 * t)
const lerp = (a, b, t) => a + (b - a) * t

// HUD de diagnóstico (troque para true para depurar a trajetória do emblema)
const DEBUG = false

/* Projeta um ponto da tela (px, relativo à viewport) para o mundo em z=0 */
function screenToWorld(sx, sy, vw, vh) {
  const ndcX = (sx / vw) * 2 - 1
  const ndcY = -((sy / vh) * 2 - 1)
  const worldW = WORLD_H * (vw / vh)
  return { x: (ndcX * worldW) / 2, y: (ndcY * WORLD_H) / 2 }
}

/* Converte posição normalizada (-1..1) em coordenada de mundo na "área segura",
   garantindo que o objeto (na sua escala) nunca ultrapasse a viewport em z=0. */
function normToWorld(nx, ny, scale, aspect) {
  const halfH = WORLD_H / 2
  const halfW = (WORLD_H * aspect) / 2
  const objHalfW = (scale * EMBLEM_ASPECT) / 2
  const objHalfH = scale / 2
  const safeX = Math.max(0, halfW - objHalfW - 0.15)
  const safeY = Math.max(0, halfH - objHalfH - 0.15)
  return { x: clamp(nx, -1, 1) * safeX, y: clamp(ny, -1, 1) * safeY }
}

/* =====================================================================
   Cena: emblema + luzes + animação dirigida pelo scroll
   ===================================================================== */
function EmblemScene({ reduced, hud }) {
  const outer = useRef(null)

  // Material único (opacidade animada por frame, sem re-render React)
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: GREEN,
        metalness: 0.35,
        roughness: 0.42,
        emissive: new THREE.Color('#2c5512'),
        emissiveIntensity: 0.5,
        transparent: true,
        side: THREE.DoubleSide,
        envMapIntensity: 1.2,
      }),
    [],
  )

  // Estado interpolado corrente (refs — nunca dispara render)
  const cur = useRef({ x: 0, y: 1.6, z: 0, scale: 1, rx: 0, ry: 0, rz: 0, opacity: 1 })
  const stops = useRef([]) // [{ y, state }] em coordenadas de documento
  const ready = useRef(false)

  // (Re)calcula as paradas a partir das seções reais do DOM
  useEffect(() => {
    const recompute = () => {
      const vw = window.innerWidth
      const vh = window.innerHeight
      const isMobile = window.matchMedia('(max-width: 767px)').matches
      const list = isMobile ? MOBILE : DESKTOP
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - vh)

      const next = []
      for (const kf of list) {
        const el = document.querySelector(kf.id)
        if (!el) continue

        if (kf.anchor) {
          const a = document.getElementById('emblem-anchor')
          if (!a) continue
          const r = a.getBoundingClientRect()
          // posição do emblema em coords de documento (independe do scroll atual)
          const cx = r.left + window.scrollX + r.width / 2
          const cy = r.top + window.scrollY + r.height / 2
          const w = screenToWorld(cx, cy, vw, vh)
          const scale = (r.height / vh) * WORLD_H
          next.push({ y: 0, state: { x: w.x, y: w.y, z: 0, scale, rx: 0, ry: 0, rz: 0, opacity: 1 } })
        } else {
          const r = el.getBoundingClientRect()
          const top = r.top + window.scrollY
          const yStop = clamp(top + el.offsetHeight / 2 - vh / 2, 0, maxScroll)
          // resolve posição normalizada → mundo (responsivo ao aspect/escala)
          const w = normToWorld(kf.nx, kf.ny, kf.scale, vw / vh)
          next.push({
            y: yStop,
            state: {
              x: w.x, y: w.y, z: kf.z, scale: kf.scale,
              rx: kf.rx, ry: kf.ry, rz: kf.rz, opacity: kf.opacity,
            },
          })
        }
      }
      next.sort((a, b) => a.y - b.y)
      stops.current = next

      // Posiciona imediatamente no estado do Hero ao calcular pela 1ª vez
      if (!ready.current && next.length) {
        Object.assign(cur.current, next[0].state)
        ready.current = true
      }
    }

    recompute()
    // Aguarda layout/imagens estabilizarem
    const raf = requestAnimationFrame(recompute)
    const t = setTimeout(recompute, 600)

    window.addEventListener('resize', recompute)
    window.addEventListener('orientationchange', recompute)
    window.addEventListener('load', recompute)
    const ro = new ResizeObserver(recompute)
    ro.observe(document.body)

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(t)
      window.removeEventListener('resize', recompute)
      window.removeEventListener('orientationchange', recompute)
      window.removeEventListener('load', recompute)
      ro.disconnect()
    }
  }, [])

  // Alvo a partir da posição de scroll atual (sincronizado, não por tempo)
  const targetFor = (scrollY) => {
    const s = stops.current
    if (!s.length) return cur.current
    if (scrollY <= s[0].y) return s[0].state
    if (scrollY >= s[s.length - 1].y) return s[s.length - 1].state
    for (let i = 0; i < s.length - 1; i++) {
      const a = s[i]
      const b = s[i + 1]
      if (scrollY >= a.y && scrollY <= b.y) {
        const t = smoothstep(clamp((scrollY - a.y) / Math.max(1, b.y - a.y), 0, 1))
        return {
          x: lerp(a.state.x, b.state.x, t),
          y: lerp(a.state.y, b.state.y, t),
          z: lerp(a.state.z, b.state.z, t),
          scale: lerp(a.state.scale, b.state.scale, t),
          rx: lerp(a.state.rx, b.state.rx, t),
          ry: lerp(a.state.ry, b.state.ry, t),
          rz: lerp(a.state.rz, b.state.rz, t),
          opacity: lerp(a.state.opacity, b.state.opacity, t),
        }
      }
    }
    return s[s.length - 1].state
  }

  useFrame((state) => {
    if (!outer.current || !stops.current.length) return
    const g = outer.current
    const c = cur.current
    const sy = window.scrollY
    const time = state.clock.elapsedTime

    // Sempre percorre as seções (sincronizado ao scroll). Em reduced-motion,
    // apenas desligamos a flutuação ociosa/rotação extra (movimento mais suave).
    const target = targetFor(sy)

    // Damping suave (estável mesmo em scroll rápido)
    const K = 0.12
    c.x = lerp(c.x, target.x, K)
    c.y = lerp(c.y, target.y, K)
    c.z = lerp(c.z, target.z, K)
    c.scale = lerp(c.scale, target.scale, K)
    c.rx = lerp(c.rx, target.rx, K)
    c.ry = lerp(c.ry, target.ry, K)
    c.rz = lerp(c.rz, target.rz, K)
    c.opacity = lerp(c.opacity, target.opacity, K)

    // Floating muito sutil (desligado em reduced-motion)
    const floatA = reduced ? 0 : 0.03
    const fy = Math.sin(time * 0.6) * floatA
    const fr = reduced ? 0 : Math.sin(time * 0.5) * 0.025

    g.position.set(c.x, c.y + fy, c.z)
    g.scale.setScalar(c.scale)
    g.rotation.set(c.rx + (reduced ? 0 : Math.sin(time * 0.4) * 0.015), c.ry + fr, c.rz)
    material.opacity = c.opacity

    if (DEBUG && hud?.current) {
      hud.current.textContent =
        `rm:${reduced ? 1 : 0} stops:${stops.current.length} sy:${Math.round(sy)} ` +
        `| x:${c.x.toFixed(2)} y:${c.y.toFixed(2)} z:${c.z.toFixed(2)} ` +
        `s:${c.scale.toFixed(2)} o:${c.opacity.toFixed(2)}`
    }
  })

  // Limpeza do material/geometria ao desmontar
  useEffect(() => () => material.dispose(), [material])

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 6, 5]} intensity={1.8} color={GREEN_HI} />
      <pointLight position={[-5, -2, 3]} intensity={20} color={GREEN} distance={16} />

      <group ref={outer}>
        <Suspense fallback={null}>
          <EmblemModel material={material} />
        </Suspense>
      </group>

      {/* Ambiente leve (sem HDR externo) para reflexos no metal */}
      <Environment resolution={128}>
        <Lightformer form="rect" intensity={3} color={GREEN_HI} position={[4, 4, 4]} scale={[6, 6, 1]} />
        <Lightformer form="rect" intensity={2} color="#ffffff" position={[-5, 1, 3]} scale={[5, 8, 1]} />
        <Lightformer form="circle" intensity={2.2} color={GREEN} position={[0, -4, -3]} scale={6} />
      </Environment>
    </>
  )
}

export default function FloatingEmblem() {
  const reduced = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )
  const hud = useRef(null)

  return (
    <>
      <div
        aria-hidden
        style={{ position: 'fixed', inset: 0, zIndex: 30, pointerEvents: 'none' }}
      >
        <Canvas
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          dpr={[1, 1.5]}
          camera={{ position: [0, 0, CAM_Z], fov: CAM_FOV }}
        >
          <EmblemScene reduced={reduced} hud={hud} />
        </Canvas>
      </div>

      {DEBUG && (
        <div
          ref={hud}
          style={{
            position: 'fixed',
            top: 8,
            left: 8,
            zIndex: 9999,
            pointerEvents: 'none',
            font: '12px ui-monospace, monospace',
            color: '#a8e35d',
            background: 'rgba(0,0,0,0.7)',
            padding: '4px 8px',
            borderRadius: 6,
            whiteSpace: 'nowrap',
          }}
        >
          (aguardando scroll…)
        </div>
      )}
    </>
  )
}
