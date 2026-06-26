import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Float, Lightformer, MeshDistortMaterial } from '@react-three/drei'
import * as THREE from 'three'

const GREEN = '#86c63c'
const GREEN_HI = '#a8e35d'
const STEEL = '#1c3a5e' // metal escuro azulado (navy) que reflete o verde

/* Poeira dourada gerada como sprite radial */
function makeDust() {
  const s = 64
  const c = document.createElement('canvas')
  c.width = c.height = s
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  g.addColorStop(0, 'rgba(236,250,214,1)')
  g.addColorStop(0.3, 'rgba(134,198,60,0.6)')
  g.addColorStop(1, 'rgba(134,198,60,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, s, s)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function Dust({ count = 700 }) {
  const tex = useMemo(makeDust, [])
  const ref = useRef()
  const { geometry, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const speeds = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const r = 3 + Math.random() * 6
      const a = Math.random() * Math.PI * 2
      positions[i * 3] = Math.cos(a) * r
      positions[i * 3 + 1] = (Math.random() - 0.5) * 12
      positions[i * 3 + 2] = Math.sin(a) * r - 2
      speeds[i] = 0.05 + Math.random() * 0.12
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return { geometry: g, speeds }
  }, [count])

  useFrame((_, delta) => {
    const pos = geometry.attributes.position.array
    const d = Math.min(delta, 0.05)
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 1] += speeds[i] * d * 2
      if (pos[i * 3 + 1] > 6) pos[i * 3 + 1] = -6
    }
    geometry.attributes.position.needsUpdate = true
    if (ref.current) ref.current.rotation.y += delta * 0.02
  })

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial
        map={tex}
        size={0.14}
        sizeAttenuation
        transparent
        depthWrite={false}
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        color={GREEN_HI}
      />
    </points>
  )
}

/* Núcleo metálico (navy) que reflete a energia verde */
function GoldCore() {
  const group = useRef()
  useFrame((state) => {
    const { x, y } = state.pointer
    if (group.current) {
      group.current.rotation.y += (x * 0.5 - group.current.rotation.y) * 0.04
      group.current.rotation.x += (-y * 0.3 - group.current.rotation.x) * 0.04
    }
  })
  return (
    <group ref={group}>
      <Float speed={1.4} rotationIntensity={0.6} floatIntensity={0.9}>
        <mesh scale={1.55}>
          <icosahedronGeometry args={[1, 24]} />
          <MeshDistortMaterial
            color={STEEL}
            metalness={1}
            roughness={0.16}
            distort={0.4}
            speed={1.6}
            envMapIntensity={1.6}
          />
        </mesh>
      </Float>
    </group>
  )
}

/* Câmera com leve parallax */
function CameraRig() {
  useFrame((state) => {
    const { x, y } = state.pointer
    state.camera.position.x += (x * 0.6 - state.camera.position.x) * 0.03
    state.camera.position.y += (y * 0.4 - state.camera.position.y) * 0.03
    state.camera.lookAt(0, 0, 0)
  })
  return null
}

export default function LiquidGold() {
  return (
    <Canvas
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 6], fov: 40 }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 6, 4]} intensity={1.8} color={GREEN_HI} />
      <pointLight position={[-4, -2, 2]} intensity={20} color={GREEN} distance={12} />

      <GoldCore />
      <Dust />
      <CameraRig />

      {/* Ambiente montado com luzes verdes/brancas — reflexos no metal, sem HDR externo */}
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={3.2} color={GREEN_HI} position={[3, 3, 4]} scale={[6, 6, 1]} />
        <Lightformer form="rect" intensity={2} color="#ffffff" position={[-4, 1, 3]} scale={[5, 8, 1]} />
        <Lightformer form="circle" intensity={2.6} color={GREEN} position={[0, -4, -3]} scale={6} />
        <Lightformer form="ring" intensity={1.8} color={GREEN_HI} position={[-2, 4, -4]} scale={4} />
      </Environment>
    </Canvas>
  )
}
