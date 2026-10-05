import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/* ── All food objects in ONE component, ONE useFrame ─────────── */
function FoodScene() {
  /* refs for each group */
  const r = {
    biryani:  useRef(),
    dosa:     useRef(),
    parotta:  useRef(),
    idli:     useRef(),
    noodle:   useRef(),
    rice:     useRef(),
    token:    useRef(),
    particles:useRef(),
  }

  /* single frame loop — no per-object useFrame */
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (r.biryani.current)  { r.biryani.current.rotation.y  = t * 0.3;  r.biryani.current.position.y  = -2.2 + Math.sin(t * 0.7) * 0.25 }
    if (r.dosa.current)     { r.dosa.current.rotation.z     = Math.sin(t * 0.5) * 0.12; r.dosa.current.position.y = 2.5 + Math.sin(t * 0.6 + 1) * 0.2 }
    if (r.parotta.current)  { r.parotta.current.rotation.y  = t * 0.35; r.parotta.current.position.y  = -2.5 + Math.sin(t * 0.8 + 2) * 0.22 }
    if (r.idli.current)     { r.idli.current.rotation.y     = t * 0.22; r.idli.current.position.y     = -2.2 + Math.sin(t * 0.65 + 3) * 0.2 }
    if (r.noodle.current)   { r.noodle.current.rotation.x   = t * 0.28; r.noodle.current.rotation.z = t * 0.18; r.noodle.current.position.y = 3.0 + Math.sin(t * 0.9) * 0.3 }
    if (r.rice.current)     { r.rice.current.rotation.y     = t * 0.2;  r.rice.current.position.y    = -3.0 + Math.sin(t * 0.75 + 1) * 0.22 }
    if (r.token.current)    { r.token.current.rotation.y    = t * 0.8;  r.token.current.rotation.x = Math.sin(t * 0.4) * 0.3; r.token.current.position.y = 0.5 + Math.sin(t * 1.1) * 0.28 }
    if (r.particles.current){ r.particles.current.rotation.y = t * 0.01 }
  })

  /* particle geometry — built once */
  const { pos, col } = useMemo(() => {
    const count = 80
    const pos = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)
    const palette = [
      new THREE.Color('#16a34a'),
      new THREE.Color('#86efac'),
      new THREE.Color('#fbbf24'),
      new THREE.Color('#dcfce7'),
    ]
    for (let i = 0; i < count; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 20
      pos[i * 3 + 1] = (Math.random() - 0.5) * 12
      pos[i * 3 + 2] = (Math.random() - 0.5) * 6
      const c = palette[i % palette.length]
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b
    }
    return { pos, col }
  }, [])

  return (
    <>
      {/* lights — minimal set */}
      <ambientLight intensity={1.4} />
      <directionalLight position={[5, 8, 6]}  intensity={2.5} color="#ffffff" />
      <directionalLight position={[-5, -4, 4]} intensity={1.2} color="#86efac" />

      {/* particles */}
      <points ref={r.particles}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[pos, 3]} />
          <bufferAttribute attach="attributes-color"    args={[col, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.08} vertexColors transparent opacity={0.85} sizeAttenuation />
      </points>

      {/* ── Biryani bowl — low poly ── */}
      <group ref={r.biryani} position={[-5.2, -2.2, 1.5]}>
        <mesh>
          <sphereGeometry args={[0.55, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
          <meshLambertMaterial color="#c2410c" />
        </mesh>
        <mesh position={[0, 0.16, 0]}>
          <sphereGeometry args={[0.46, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
          <meshLambertMaterial color="#fef3c7" />
        </mesh>
      </group>

      {/* ── Dosa — low poly ── */}
      <group ref={r.dosa} position={[5.0, 2.5, 1.2]} rotation={[0.25, 0, 0]}>
        <mesh>
          <cylinderGeometry args={[0.7, 0.65, 0.06, 16]} />
          <meshLambertMaterial color="#d97706" />
        </mesh>
        <mesh position={[0.1, 0.06, 0.1]}>
          <sphereGeometry args={[0.18, 8, 8]} />
          <meshLambertMaterial color="#16a34a" />
        </mesh>
      </group>

      {/* ── Parotta stack — low poly ── */}
      <group ref={r.parotta} position={[-4.6, -2.5, 1.5]}>
        {[0, 0.07, 0.14].map((y, i) => (
          <mesh key={i} position={[0, y, 0]}>
            <cylinderGeometry args={[0.52 - i * 0.02, 0.54 - i * 0.02, 0.055, 14]} />
            <meshLambertMaterial color={['#92400e','#b45309','#d97706'][i]} />
          </mesh>
        ))}
      </group>

      {/* ── Idli — low poly ── */}
      <group ref={r.idli} position={[4.4, -2.2, 1.2]}>
        {[[-0.3, 0], [0.3, 0], [0, 0.36]].map(([x, z], i) => (
          <mesh key={i} position={[x, 0, z]}>
            <sphereGeometry args={[0.26, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
            <meshLambertMaterial color="#f5f5f4" />
          </mesh>
        ))}
      </group>

      {/* ── Noodle torus knot — reduced segments ── */}
      <group ref={r.noodle} position={[0.8, 3.0, 0.5]}>
        <mesh>
          <torusKnotGeometry args={[0.38, 0.1, 64, 8, 2, 3]} />
          <meshLambertMaterial color="#fbbf24" />
        </mesh>
      </group>

      {/* ── Rice bowl — low poly ── */}
      <group ref={r.rice} position={[-1.5, -3.0, 1.5]}>
        <mesh>
          <sphereGeometry args={[0.5, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
          <meshLambertMaterial color="#1c1917" />
        </mesh>
        <mesh position={[0, 0.1, 0]}>
          <sphereGeometry args={[0.42, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
          <meshLambertMaterial color="#fef9c3" />
        </mesh>
      </group>

      {/* ── Token coin — low poly ── */}
      <group ref={r.token} position={[2.5, 0.5, 2.2]}>
        <mesh>
          <cylinderGeometry args={[0.46, 0.46, 0.08, 20]} />
          <meshLambertMaterial color="#16a34a" />
        </mesh>
        <mesh position={[0, 0.045, 0]}>
          <cylinderGeometry args={[0.38, 0.38, 0.01, 20]} />
          <meshLambertMaterial color="#86efac" />
        </mesh>
      </group>
    </>
  )
}

export default function FloatingFood3D() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
      <Canvas
        camera={{ position: [0, 0, 9], fov: 60 }}
        gl={{ antialias: false, powerPreference: 'high-performance', alpha: true }}
        frameloop="always"
        dpr={Math.min(window.devicePixelRatio, 1.5)}
      >
        <FoodScene />
      </Canvas>
    </div>
  )
}
