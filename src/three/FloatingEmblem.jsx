import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'
import gsap from 'gsap'
import EmblemModel from './EmblemModel'
import { CAM_FOV, CAM_Z, WORLD_H } from './emblemKeyframes'

const GREEN = '#86c63c'
const GREEN_HI = '#a8e35d'

const lerp = (a, b, t) => a + (b - a) * t

/* Projeta um ponto da tela (px, relativo à viewport) para o mundo em z=0 */
function screenToWorld(sx, sy, vw, vh) {
  const ndcX = (sx / vw) * 2 - 1
  const ndcY = -((sy / vh) * 2 - 1)
  const worldW = WORLD_H * (vw / vh)
  return { x: (ndcX * worldW) / 2, y: (ndcY * WORLD_H) / 2 }
}

/* =====================================================================
   Cena: emblema parado no Hero + luzes + giro de 360° ao passar o mouse
   ===================================================================== */
function EmblemScene({ reduced }) {
  const outer = useRef(null)

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

  // Escala do emblema (só muda em resize; a posição segue o anchor a cada frame)
  const scaleRef = useRef(0)

  // Giro fluido de 360° ao passar o mouse sobre o emblema (Hero).
  // Detecção por geometria: comparamos o ponteiro com o retângulo real do
  // emblema (anchor), sem depender de empilhamento/pointer-events do DOM.
  useEffect(() => {
    if (reduced) return

    let spinning = false
    let inside = false

    const spin = () => {
      if (spinning || !outer.current) return
      spinning = true
      gsap.to(outer.current.rotation, {
        y: `+=${Math.PI * 2}`,
        duration: 1.4,
        ease: 'power2.inOut',
        onComplete: () => {
          spinning = false
        },
      })
    }

    const onMove = (e) => {
      const anchor = document.getElementById('emblem-anchor')
      if (!anchor) return
      const r = anchor.getBoundingClientRect()
      const over =
        e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom
      if (over && !inside) spin() // dispara ao ENTRAR na área do emblema
      inside = over
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [reduced])

  useFrame(() => {
    const g = outer.current
    if (!g) return
    const anchor = document.getElementById('emblem-anchor')
    if (!anchor) return

    // Segue a posição REAL do anchor a cada frame: o emblema pertence ao Hero
    // e sobe/sai da tela junto com ele ao rolar (não fica preso à viewport).
    const vw = window.innerWidth
    const vh = window.innerHeight
    const r = anchor.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    const w = screenToWorld(cx, cy, vw, vh)

    const targetScale = (r.height / vh) * WORLD_H
    // primeiro frame: assume a escala direto (evita "pop"); depois suaviza resize
    scaleRef.current = scaleRef.current === 0 ? targetScale : lerp(scaleRef.current, targetScale, 0.2)

    g.position.set(w.x, w.y, 0)
    g.scale.setScalar(scaleRef.current)
  })

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

  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 30, pointerEvents: 'none' }}>
      <Canvas
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, CAM_Z], fov: CAM_FOV }}
        style={{ pointerEvents: 'none' }}
      >
        <EmblemScene reduced={reduced} />
      </Canvas>
    </div>
  )
}
