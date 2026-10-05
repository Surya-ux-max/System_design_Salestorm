import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, MeshDistortMaterial, Environment, Text3D, Center } from '@react-three/drei'
import * as THREE from 'three'
import { motion } from 'framer-motion'

const G    = '#16a34a'
const GMID = '#86efac'

/* ── individual food shapes ─────────────────────────────────── */

/* Biryani bowl — sphere + flat disc */
export function BiryaniItem({ position }) {
  const bowl = useRef()
  const steam1 = useRef(), steam2 = useRef(), steam3 = useRef()
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (bowl.current) bowl.current.rotation.y = t * 0.4
    ;[steam1, steam2, steam3].forEach((s, i) => {
      if (s.current) {
        s.current.position.y = Math.sin(t * 1.5 + i) * 0.08 + 0.6 + i * 0.25
        s.current.material.opacity = 0.3 + Math.sin(t * 2 + i) * 0.15
      }
    })
  })
  return (
    <group position={position}>
      {/* bowl base */}
      <mesh ref={bowl} castShadow>
        <sphereGeometry args={[0.55, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
        <meshStandardMaterial color="#c2410c" roughness={0.4} metalness={0.1} />
      </mesh>
      {/* rice mound */}
      <mesh position={[0, 0.18, 0]} castShadow>
        <sphereGeometry args={[0.48, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
        <meshStandardMaterial color="#fef3c7" roughness={0.9} />
      </mesh>
      {/* steam puffs */}
      {[steam1, steam2, steam3].map((ref, i) => (
        <mesh key={i} ref={ref} position={[(i - 1) * 0.18, 0.6, 0]}>
          <sphereGeometry args={[0.07 - i * 0.01, 8, 8]} />
          <meshStandardMaterial color="#fff" transparent opacity={0.3} />
        </mesh>
      ))}
    </group>
  )
}

/* Dosa — thin curved disc */
export function DosaItem({ position }) {
  const mesh = useRef()
  useFrame(({ clock }) => {
    if (!mesh.current) return
    mesh.current.rotation.z = Math.sin(clock.getElapsedTime() * 0.6) * 0.15
    mesh.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.4) * 0.1
  })
  return (
    <group position={position}>
      <mesh ref={mesh} castShadow rotation={[0.3, 0, 0]}>
        <cylinderGeometry args={[0.7, 0.65, 0.06, 32]} />
        <meshStandardMaterial color="#d97706" roughness={0.8} />
      </mesh>
      {/* chutney dollop */}
      <mesh position={[0.1, 0.06, 0.1]} castShadow>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial color="#16a34a" roughness={0.6} />
      </mesh>
    </group>
  )
}

/* Parotta — layered disc stack */
export function ParottaItem({ position }) {
  const group = useRef()
  useFrame(({ clock }) => {
    if (!group.current) return
    group.current.rotation.y = clock.getElapsedTime() * 0.5
  })
  return (
    <group ref={group} position={position}>
      {[0, 0.07, 0.14].map((y, i) => (
        <mesh key={i} position={[0, y, 0]} castShadow>
          <cylinderGeometry args={[0.55 - i * 0.03, 0.58 - i * 0.03, 0.055, 32]} />
          <meshStandardMaterial color={i === 0 ? '#92400e' : i === 1 ? '#b45309' : '#d97706'} roughness={0.85} />
        </mesh>
      ))}
      {/* curry bowl */}
      <mesh position={[0.7, 0, 0]} castShadow>
        <sphereGeometry args={[0.22, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.65]} />
        <meshStandardMaterial color="#dc2626" roughness={0.5} />
      </mesh>
    </group>
  )
}

/* Idli — soft white dome */
export function IdliItem({ position }) {
  const group = useRef()
  useFrame(({ clock }) => {
    if (!group.current) return
    group.current.rotation.y = clock.getElapsedTime() * 0.35
  })
  return (
    <group ref={group} position={position}>
      {[[-0.35, 0], [0.35, 0], [0, 0.38]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0, z]} castShadow>
          <sphereGeometry args={[0.28, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          <meshStandardMaterial color="#f5f5f4" roughness={0.95} />
        </mesh>
      ))}
      {/* sambar pool */}
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.55, 32]} />
        <meshStandardMaterial color="#92400e" roughness={0.7} transparent opacity={0.85} />
      </mesh>
    </group>
  )
}

/* Noodles — torus knot shape */
export function NoodlesItem({ position }) {
  const mesh = useRef()
  useFrame(({ clock }) => {
    if (!mesh.current) return
    mesh.current.rotation.x = clock.getElapsedTime() * 0.3
    mesh.current.rotation.z = clock.getElapsedTime() * 0.2
  })
  return (
    <group position={position}>
      <mesh ref={mesh} castShadow>
        <torusKnotGeometry args={[0.38, 0.1, 128, 12, 2, 3]} />
        <meshStandardMaterial color="#fbbf24" roughness={0.6} metalness={0.05} />
      </mesh>
    </group>
  )
}

/* Veg Rice — bowl with colourful bits */
export function VegRiceItem({ position }) {
  const bowl = useRef()
  useFrame(({ clock }) => {
    if (!bowl.current) return
    bowl.current.rotation.y = clock.getElapsedTime() * 0.25
  })
  const bits = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      x: (Math.random() - 0.5) * 0.6,
      z: (Math.random() - 0.5) * 0.6,
      color: ['#16a34a','#dc2626','#f59e0b','#f97316'][i % 4],
      s: 0.04 + Math.random() * 0.04,
    }))
  }, [])
  return (
    <group ref={bowl} position={position}>
      <mesh castShadow>
        <sphereGeometry args={[0.52, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
        <meshStandardMaterial color="#1c1917" roughness={0.3} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.1, 0]} castShadow>
        <sphereGeometry args={[0.44, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
        <meshStandardMaterial color="#fef9c3" roughness={0.95} />
      </mesh>
      {bits.map((b, i) => (
        <mesh key={i} position={[b.x, 0.22, b.z]} castShadow>
          <sphereGeometry args={[b.s, 8, 8]} />
          <meshStandardMaterial color={b.color} roughness={0.7} />
        </mesh>
      ))}
    </group>
  )
}

/* Floating token */
export function TokenItem({ position }) {
  const mesh = useRef()
  useFrame(({ clock }) => {
    if (!mesh.current) return
    mesh.current.rotation.y = clock.getElapsedTime() * 0.8
    mesh.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.5) * 0.2
  })
  return (
    <group position={position}>
      <mesh ref={mesh} castShadow>
        <cylinderGeometry args={[0.45, 0.45, 0.08, 32]} />
        <meshStandardMaterial color="#16a34a" roughness={0.2} metalness={0.7} />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.38, 0.38, 0.01, 32]} />
        <meshStandardMaterial color="#86efac" roughness={0.1} metalness={0.9} />
      </mesh>
    </group>
  )
}

/* Ambient floating particles */
function FoodParticles() {
  const mesh = useRef()
  const { pos, col } = useMemo(() => {
    const count = 120
    const pos = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)
    const palette = [
      new THREE.Color('#16a34a'),
      new THREE.Color('#86efac'),
      new THREE.Color('#fbbf24'),
      new THREE.Color('#f97316'),
    ]
    for (let i = 0; i < count; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 22
      pos[i * 3 + 1] = (Math.random() - 0.5) * 14
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10
      const c = palette[i % palette.length]
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b
    }
    return { pos, col }
  }, [])
  useFrame(({ clock }) => {
    if (!mesh.current) return
    mesh.current.rotation.y = clock.getElapsedTime() * 0.015
  })
  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[pos, 3]} />
        <bufferAttribute attach="attributes-color"    args={[col, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.055} vertexColors transparent opacity={0.7} sizeAttenuation />
    </points>
  )
}

/* ── Full scene ─────────────────────────────────────────────── */
function FoodScene() {
  return (
    <>
      <ambientLight intensity={1.365} />
      <directionalLight position={[0, 10, 5]} intensity={1.68} color="#ffffff" castShadow />
      <pointLight position={[8, 8, 6]}   intensity={2.31} color="#ffffff" castShadow />
      <pointLight position={[-8, -4, 6]} intensity={1.47} color="#e6fcf0" />
      <pointLight position={[0, -6, 8]}  intensity={1.05} color="#fffde6" />

      <FoodParticles />

      <Float speed={1.4} rotationIntensity={0.6} floatIntensity={1.2}>
        <BiryaniItem position={[-4.5, 1.5, 0]} scale={[1.45, 1.45, 1.45]} />
      </Float>

      <Float speed={1.1} rotationIntensity={0.5} floatIntensity={1.0}>
        <DosaItem position={[4.2, 1.8, -1]} scale={[1.45, 1.45, 1.45]} />
      </Float>

      <Float speed={1.6} rotationIntensity={0.7} floatIntensity={1.4}>
        <ParottaItem position={[-3.0, -1.8, 1]} scale={[1.45, 1.45, 1.45]} />
      </Float>

      <Float speed={1.3} rotationIntensity={0.4} floatIntensity={0.9}>
        <IdliItem position={[3.5, -1.5, 0]} scale={[1.45, 1.45, 1.45]} />
      </Float>

      <Float speed={1.8} rotationIntensity={0.8} floatIntensity={1.6}>
        <NoodlesItem position={[0.5, 2.2, -2]} scale={[1.45, 1.45, 1.45]} />
      </Float>

      <Float speed={1.0} rotationIntensity={0.5} floatIntensity={1.1}>
        <VegRiceItem position={[-1.2, -2.2, 0]} scale={[1.45, 1.45, 1.45]} />
      </Float>

      <Float speed={2.0} rotationIntensity={1.0} floatIntensity={1.8}>
        <TokenItem position={[1.8, 0.2, 1]} scale={[1.45, 1.45, 1.45]} />
      </Float>
    </>
  )
}

/* ── Section export ─────────────────────────────────────────── */
export default function FoodScene3DSection() {
  return (
    <section style={{
      position: 'relative', height: 620, overflow: 'hidden',
      background: 'linear-gradient(180deg, #041009 0%, #0a2916 50%, #041009 100%)',
    }}>
      {/* canvas */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <Canvas camera={{ position: [0, 0, 8], fov: 60 }} shadows>
          <FoodScene />
        </Canvas>
      </div>

      {/* top fade */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(to bottom, #071a0f, transparent)', pointerEvents: 'none' }} />
      {/* bottom fade */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(to top, #071a0f, transparent)', pointerEvents: 'none' }} />

      {/* centre label */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 5, color: GMID, textTransform: 'uppercase', marginBottom: 10, opacity: 0.8 }}>
            SECE Canteen
          </div>
          <h2 style={{
            fontSize: 'clamp(1.8rem, 4vw, 3rem)', fontWeight: 900, lineHeight: 1.1,
            background: `linear-gradient(135deg, #ffffff 0%, ${GMID} 60%, ${G} 100%)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            margin: 0,
          }}>
            Your Favourite<br />Foods, Digitised.
          </h2>
          <p style={{ color: GMID, fontSize: 14, marginTop: 12, opacity: 0.6, letterSpacing: 1 }}>
            Biryani · Dosa · Parotta · Idli · Noodles & more
          </p>
        </motion.div>
      </div>
    </section>
  )
}
