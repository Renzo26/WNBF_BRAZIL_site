import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer, useGLTF } from '@react-three/drei'
import * as THREE from 'three'

const GREEN = '#86c63c'
const GREEN_HI = '#a8e35d'

const TROPHY_URL = '/brand/trophy.glb'

/* -----------------------------------------------------------
   Progresso global de scroll (0 no topo, 1 no fim da página)
----------------------------------------------------------- */
function useScrollProgress() {
  const progress = useRef(0)
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      progress.current = max > 0 ? window.scrollY / max : 0
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])
  return progress
}

/* -----------------------------------------------------------
   Poeira verde flutuante
----------------------------------------------------------- */
function makeDust() {
  const s = 64
  const c = document.createElement('canvas')
  c.width = c.height = s
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  g.addColorStop(0, 'rgba(236,250,214,1)')
  g.addColorStop(0.35, 'rgba(134,198,60,0.55)')
  g.addColorStop(1, 'rgba(134,198,60,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, s, s)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function Dust({ count = 600 }) {
  const tex = useMemo(makeDust, [])
  const { geometry, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const speeds = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20
      positions[i * 3 + 1] = (Math.random() - 0.5) * 16
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10 - 2
      speeds[i] = 0.04 + Math.random() * 0.1
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return { geometry: g, speeds }
  }, [count])

  useFrame((_, delta) => {
    const pos = geometry.attributes.position.array
    const d = Math.min(delta, 0.05)
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 1] += speeds[i] * d * 1.6
      if (pos[i * 3 + 1] > 8) pos[i * 3 + 1] = -8
    }
    geometry.attributes.position.needsUpdate = true
  })

  return (
    <points geometry={geometry}>
      <pointsMaterial
        map={tex}
        size={0.12}
        sizeAttenuation
        transparent
        depthWrite={false}
        opacity={0.5}
        blending={THREE.AdditiveBlending}
        color={GREEN_HI}
      />
    </points>
  )
}

/* -----------------------------------------------------------
   Troféu WNBF — modelo .glb gerado no Blender
----------------------------------------------------------- */
function Trophy({ progress }) {
  const group = useRef()
  const { scene } = useGLTF(TROPHY_URL)

  const model = useMemo(() => {
    const clone = scene.clone(true)
    clone.traverse((o) => {
      if (o.isMesh && o.material) {
        o.castShadow = o.receiveShadow = false
        o.material.envMapIntensity = 1.5
        // emblema (textura com alpha): usa alpha-clip p/ não piscar (sem blend/sort)
        if (o.material.map) {
          o.material.transparent = false
          o.material.alphaTest = 0.5
          o.material.depthWrite = true
        }
      }
    })
    return clone
  }, [scene])

  useFrame((state) => {
    const p = progress.current
    const t = state.clock.elapsedTime
    const { x: mx, y: my } = state.pointer
    if (!group.current) return
    // gira com o scroll + balanço suave + leve influência do mouse
    group.current.rotation.y = Math.sin(t * 0.5) * 0.3 + mx * 0.28 + p * Math.PI * 2
    group.current.rotation.x = Math.sin(t * 0.4) * 0.05 + my * 0.14 - 0.02
    // hero: troféu à DIREITA (cos => +X no topo); depois faz zig-zag pela página
    const targetX = Math.cos(p * Math.PI * 2.2) * 3.0 + mx * 0.4
    const targetY = Math.sin(p * Math.PI * 3) * 1.25 + Math.sin(t * 0.6) * 0.1
    group.current.position.y += (targetY - group.current.position.y) * 0.06
    group.current.position.x += (targetX - group.current.position.x) * 0.06
  })

  return (
    <group ref={group} position={[3.0, 0.4, 0]}>
      {/* offset p/ centralizar o conjunto (escudo + base) na origem do grupo */}
      <primitive object={model} scale={0.56} position={[0, 0.35, 0]} />
    </group>
  )
}
useGLTF.preload(TROPHY_URL)

function Scene({ progress }) {
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 6, 4]} intensity={1.7} color={GREEN_HI} />
      <pointLight position={[-5, -3, 3]} intensity={28} color={GREEN} distance={16} />
      <pointLight position={[4, 4, 5]} intensity={16} color={'#ffffff'} distance={18} />

      <Suspense fallback={null}>
        <Trophy progress={progress} />
      </Suspense>
      <Dust />

      <Environment resolution={256}>
        <Lightformer form="rect" intensity={3} color={GREEN_HI} position={[4, 4, 4]} scale={[7, 7, 1]} />
        <Lightformer form="rect" intensity={2.4} color="#ffffff" position={[-5, 1, 3]} scale={[5, 9, 1]} />
        <Lightformer form="circle" intensity={2.2} color={GREEN} position={[0, -5, -3]} scale={7} />
      </Environment>
    </>
  )
}

export default function Background3D() {
  const progress = useScrollProgress()
  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none' }}>
      <Canvas
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        dpr={[1, 1.6]}
        camera={{ position: [0, 0, 7], fov: 42 }}
      >
        <Scene progress={progress} />
      </Canvas>
    </div>
  )
}
