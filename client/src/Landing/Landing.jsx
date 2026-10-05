import { lazy, Suspense, useRef, useMemo, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float } from '@react-three/drei'
import { useNavigate } from 'react-router-dom'
import * as THREE from 'three'
import {
  UtensilsCrossed, QrCode, Ticket, ShieldCheck,
  BarChart3, Zap, ChevronLeft, ChevronRight, CheckCircle2, ArrowRight,
  Clock, Sparkles, Monitor, Activity, Users, Layers, Shield,
  Plus, Minus, ShoppingBag, X, Calculator, HelpCircle, ChevronDown, Check, RefreshCw
} from 'lucide-react'
import FoodScene3DSection, { BiryaniItem, DosaItem, ParottaItem, NoodlesItem, VegRiceItem, TokenItem } from './FoodScene3D'
import receiptImg from '../assets/avatar_receipt.png'
import deliveryImg from '../assets/avatar_delivery.png'
import vendingImg from '../assets/vending machine.png'

const G      = '#16a34a'
const GDARK = '#14532d'
const GLIGHT= '#dcfce7'
const GMID  = '#86efac'
const GMUTE = '#4b7c5e'

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
}

const stagger = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.08 } },
}

const features = [
  { icon: QrCode,          title: 'Scan & Order',      desc: 'Students scan a QR code or open the web app to browse the live canteen menu instantly.' },
  { icon: Ticket,          title: 'Token Generation',  desc: 'Every paid order receives a unique FIFO token — zero confusion, zero duplicate serving.' },
  { icon: Zap,             title: 'Parallel Billing',  desc: 'Multiple students bill simultaneously across kiosks, eliminating the single-queue bottleneck.' },
  { icon: ShieldCheck,     title: 'Inventory Control', desc: 'Admin sets per-item quantity limits. Orders are auto-rejected when live stock runs out.' },
  { icon: BarChart3,       title: 'Live Monitoring',   desc: 'Canteen managers track item-wise sales, revenue stats, and total orders in real time.' },
  { icon: UtensilsCrossed, title: 'Counter Verify',    desc: 'Staff enter or scan the token to verify and mark orders as served in a single tap.' },
]

const steps = [
  {
    num: '01', role: 'Student', action: 'Scan QR / Open App',
    detail: 'Instant access to live menu without waiting in physical line.',
    previewTitle: 'Mobile QR Menu', previewDesc: 'Browse live inventory, view prices, and select items in real-time.'
  },
  {
    num: '02', role: 'Student', action: 'Pick Items & Pay',
    detail: 'Simulated multi-channel payment marks order as Paid instantly.',
    previewTitle: 'Parallel Kiosk Billing', previewDesc: 'Multiple billing streams process student checkouts concurrently.'
  },
  {
    num: '03', role: 'System', action: 'Token Issued',
    detail: 'Unique incremental FIFO token generated and pushed to live queue.',
    previewTitle: 'FIFO Token Dispatch', previewDesc: 'Digital token generated with unique ID and verification code.'
  },
  {
    num: '04', role: 'Counter Staff', action: 'Verify & Serve',
    detail: 'Staff verify token number on counter display and serve fresh food.',
    previewTitle: 'Instant Counter Verification', previewDesc: 'One-tap verification marks order as served and clears queue.'
  },
]

const stats = [
  { value: '< 2s',  label: 'Page Load',         subLabel: 'Lightning fast' },
  { value: '< 1s',  label: 'Order Processing',  subLabel: 'Realtime dispatch' },
  { value: '∞',     label: 'Parallel Billing',  subLabel: 'Zero queue choke' },
  { value: '100%',  label: 'Token Accuracy',    subLabel: 'FIFO verification' },
]

const menuDemoItems = [
  { id: 'b1', name: 'Special Chicken Biryani', price: 120, prep: '3 mins', cal: '550 kcal', tag: 'Bestseller' },
  { id: 'd1', name: 'Crispy Ghee Roast Dosa',  price: 50,  prep: '2 mins', cal: '320 kcal', tag: 'Popular' },
  { id: 'p1', name: 'Flaky Parotta Combo',     price: 45,  prep: '2 mins', cal: '410 kcal', tag: 'Fast Serve' },
  { id: 'n1', name: 'Schezwan Veg Noodles',    price: 80,  prep: '4 mins', cal: '460 kcal', tag: 'Hot & Spicy' },
  { id: 'r1', name: 'South Veg Fried Rice',    price: 70,  prep: '3 mins', cal: '380 kcal', tag: 'Healthy Choice' },
]

const faqs = [
  {
    q: 'How does parallel kiosk billing eliminate canteen queues?',
    a: 'Instead of standing in a single physical line waiting for one cashier, students scan QR codes or use multiple self-serve kiosks simultaneously. Orders are processed in parallel, issuing digital tokens instantly.'
  },
  {
    q: 'What happens when a food item goes out of stock?',
    a: 'Canteen managers set inventory limits in the Admin Panel. Once stock hits zero, the item automatically disables across all student views in real time, preventing over-ordering.'
  },
  {
    q: 'How do counter staff verify token orders?',
    a: 'Staff simply type or scan the student’s digital token number into their counter verification panel. The system displays order contents, verifies payment status, and marks it served with one tap.'
  },
  {
    q: 'Can students order without creating an account?',
    a: 'Yes! Bill4Food supports fast guest checkout for campus students. Tokens are linked directly to session receipts, making ordering friction-free.'
  }
]

/* ── Section Label ──────────────────────────────────────────── */
function SectionLabel({ children }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2.5, color: GMID,
      marginBottom: 8,
      padding: '4px 12px', borderRadius: 999,
      background: 'rgba(22, 163, 74, 0.12)', border: '1px solid rgba(134, 239, 172, 0.2)',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: G }} />
      {children}
    </div>
  )
}

/* ── Navbar ─────────────────────────────────────────────────── */
function Navbar({ onLogin }) {
  return (
    <nav style={{
      position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)',
      width: 'calc(100% - 40px)', maxWidth: '1200px', zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 32px',
      background: 'rgba(4, 16, 9, 0.75)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRadius: '24px',
      border: '1px solid rgba(134, 239, 172, 0.25)',
      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(134, 239, 172, 0.1)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: 'linear-gradient(135deg, #16a34a, #14532d)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(22, 163, 74, 0.4)'
        }}>
          <UtensilsCrossed size={18} color="#ffffff" />
        </div>
        <span style={{ fontSize: 22, fontWeight: 900, color: '#ffffff', letterSpacing: '-0.75px', fontFamily: 'Outfit, sans-serif' }}>
          Bill<span style={{ color: GMID }}>4</span>Food
        </span>
      </div>

      <div style={{ display: 'flex', gap: 28, fontSize: 14, fontWeight: 600 }}>
        {[
          ['#demo', 'Live Simulator'],
          ['#calculator', 'ROI Calculator'],
          ['#features', 'Features'],
          ['#how', 'How It Works'],
          ['#faq', 'FAQ']
        ].map(([href, label]) => (
          <a key={href} href={href} style={{
            color: 'rgba(228, 251, 233, 0.8)',
            textDecoration: 'none',
            transition: 'color 0.2s ease',
          }}
          onMouseEnter={(e) => e.target.style.color = GMID}
          onMouseLeave={(e) => e.target.style.color = 'rgba(228, 251, 233, 0.8)'}
          >{label}</a>
        ))}
      </div>

      <motion.button onClick={onLogin} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
        style={{
          background: `linear-gradient(135deg, ${G}, #15803d)`, color: '#fff', fontWeight: 700, fontSize: 14,
          padding: '10px 24px', borderRadius: '14px', border: 'none', cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(22, 163, 74, 0.35)',
          display: 'inline-flex', alignItems: 'center', gap: 8
        }}>
        <span>Get Started</span>
        <ArrowRight size={16} />
      </motion.button>
    </nav>
  )
}

/* ── Hero 3D Scene Particles & Floating Models ──────────────── */
function HeroParticles({ count = 180 }) {
  const mesh = useRef()
  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const colors    = new Float32Array(count * 3)
    const c1 = new THREE.Color('#16a34a')
    const c2 = new THREE.Color('#86efac')
    const c3 = new THREE.Color('#dcfce7')
    const palette = [c1, c2, c3]
    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 18
      positions[i * 3 + 1] = (Math.random() - 0.5) * 12
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8
      const c = palette[Math.floor(Math.random() * palette.length)]
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b
    }
    return { positions, colors }
  }, [count])
  useFrame(({ clock }) => {
    if (!mesh.current) return
    mesh.current.rotation.y = clock.getElapsedTime() * 0.03
    mesh.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.015) * 0.06
  })
  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color"    args={[colors, 3]}    />
      </bufferGeometry>
      <pointsMaterial size={0.06} vertexColors transparent opacity={0.85} sizeAttenuation />
    </points>
  )
}

function HeroScene() {
  return (
    <>
      <ambientLight intensity={3.0} />
      <directionalLight position={[0, 10, 5]} intensity={3.8} />
      <pointLight position={[6, 6, 4]}  intensity={4.2} color="#ffffff" />
      <pointLight position={[-6, -4, 4]} intensity={2.8} color="#ffffff" />
      <HeroParticles count={220} />
      
      <Float speed={2.2} rotationIntensity={1.4} floatIntensity={1.8}>
        <BiryaniItem position={[-3.8, 1.8, -0.8]} scale={[1.35, 1.35, 1.35]} />
      </Float>
      
      <Float speed={1.8} rotationIntensity={1.2} floatIntensity={1.5}>
        <DosaItem position={[3.6, 2.0, -1.2]} scale={[1.30, 1.30, 1.30]} />
      </Float>

      <Float speed={2.0} rotationIntensity={1.3} floatIntensity={1.6}>
        <NoodlesItem position={[-3.4, -2.0, -0.8]} scale={[1.32, 1.32, 1.32]} />
      </Float>

      <Float speed={2.4} rotationIntensity={1.5} floatIntensity={2.0}>
        <ParottaItem position={[3.4, -1.8, -1.0]} scale={[1.35, 1.35, 1.35]} />
      </Float>

      <Float speed={1.5} rotationIntensity={0.9} floatIntensity={1.2}>
        <VegRiceItem position={[0, 3.2, -1.8]} scale={[1.25, 1.25, 1.25]} />
      </Float>

      <Float speed={2.6} rotationIntensity={1.6} floatIntensity={2.2}>
        <TokenItem position={[0, -3.2, -2.0]} scale={[1.35, 1.35, 1.35]} />
      </Float>
    </>
  )
}

/* ── Hero Component ─────────────────────────────────────────── */
function Hero({ onLogin }) {
  const [tokenSim, setTokenSim] = useState(104)

  useEffect(() => {
    const timer = setInterval(() => {
      setTokenSim(prev => (prev > 199 ? 101 : prev + 1))
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  return (
    <section style={{
      position: 'relative',
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
      background: 'radial-gradient(circle at 50% 30%, #092615 0%, #041009 70%)',
    }}>
      {/* Three.js canvas — full background */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <Canvas camera={{ position: [0, 0, 7], fov: 62 }}>
          <HeroScene />
        </Canvas>
      </div>

      {/* dark gradient overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, rgba(4,16,9,0.70) 0%, rgba(4,16,9,0.45) 50%, rgba(4,16,9,0.85) 100%)',
        pointerEvents: 'none',
      }} />

      {/* Hero content */}
      <motion.div variants={stagger} initial="hidden" animate="show"
        style={{
          position: 'relative', zIndex: 2,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '160px 24px 56px', textAlign: 'center',
          maxWidth: 1020, margin: '0 auto',
        }}>

        {/* Institution Badge */}
        <motion.div variants={fadeUp} style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          padding: '10px 24px', borderRadius: 999,
          background: 'rgba(22, 163, 74, 0.18)', border: '1px solid rgba(134, 239, 172, 0.4)',
          color: GMID, fontSize: 14, fontWeight: 700, marginBottom: 24,
          boxShadow: '0 8px 28px rgba(22, 163, 74, 0.25)',
          backdropFilter: 'blur(12px)',
        }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: G, boxShadow: `0 0 14px ${G}` }} />
          <span>Sri Eshwar College of Engineering — Smart Kiosk System</span>
        </motion.div>

        {/* Main Headline */}
        <motion.h1 variants={fadeUp} style={{
          fontSize: 'clamp(3.2rem, 7vw, 5.4rem)', fontWeight: 900,
          lineHeight: 1.05, letterSpacing: '-2px',
          background: 'linear-gradient(135deg, #ffffff 40%, #86efac 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          color: '#ffffff',
          marginBottom: 24,
          fontFamily: 'Outfit, sans-serif'
        }}>
          Bill4Food <br />
          <span style={{ background: 'linear-gradient(135deg, #86efac 20%, #22c55e 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Smart Canteen Billing
          </span>
        </motion.h1>

        {/* Feature Pills */}
        <motion.div variants={fadeUp} style={{ marginBottom: 24, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12 }}>
          {[
            { icon: UtensilsCrossed, text: 'Order in Seconds' },
            { icon: Ticket,          text: 'Instant Token Issue' },
            { icon: Zap,             text: 'Parallel Kiosk Billing' },
            { icon: ShieldCheck,     text: 'Zero Stock Overflow' },
          ].map(({ icon: Icon, text }) => (
            <span key={text} style={{
              fontSize: 13, fontWeight: 600, padding: '7px 18px',
              borderRadius: 999, border: '1px solid rgba(134,239,172,0.25)',
              background: 'rgba(255,255,255,0.04)', color: GMID,
              display: 'inline-flex', alignItems: 'center', gap: 8,
              boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
              backdropFilter: 'blur(8px)',
            }}>
              <Icon size={15} color={GMID} />
              {text}
            </span>
          ))}
        </motion.div>

        {/* Subtitle */}
        <motion.p variants={fadeUp} style={{
          fontSize: 17, lineHeight: 1.7,
          color: 'rgba(228, 251, 233, 0.85)',
          maxWidth: 580, marginBottom: 36,
        }}>
          The fastest way to eat at SECE. Eliminate long queues, place instant parallel kiosk orders,
          and collect your meal with a verified digital token.
        </motion.p>

        {/* Actions & Simulated Token Floating Pill */}
        <motion.div variants={fadeUp} style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
          <motion.a href="#demo" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '14px 32px', borderRadius: 16, fontWeight: 700,
              background: `linear-gradient(135deg, ${G}, #15803d)`, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 16,
              textDecoration: 'none',
              boxShadow: '0 8px 28px rgba(22,163,74,0.4)',
            }}>
            <Sparkles size={18} />
            <span>Test Live Kiosk Demo</span>
          </motion.a>

          <motion.button onClick={onLogin} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '14px 28px', borderRadius: 16, fontWeight: 600, fontSize: 15,
              background: 'rgba(255,255,255,0.06)', cursor: 'pointer',
              color: '#fff', textDecoration: 'none',
              border: '1px solid rgba(134,239,172,0.25)',
              backdropFilter: 'blur(10px)',
            }}>
            <span>Portal Login</span>
            <ArrowRight size={18} />
          </motion.button>
        </motion.div>

        {/* Live Token Status Pill */}
        <motion.div variants={fadeUp} style={{
          marginTop: 36,
          display: 'inline-flex', alignItems: 'center', gap: 12,
          padding: '10px 20px', borderRadius: 16,
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(134, 239, 172, 0.18)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'rgba(22, 163, 74, 0.2)', border: '1px solid rgba(134, 239, 172, 0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Ticket size={16} color={GMID} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(228, 251, 233, 0.6)', fontWeight: 700 }}>Live Token Stream</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#ffffff' }}>
              Current Queue Token: <span style={{ color: GMID }}>Token #{tokenSim}</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  )
}

/* ── INTERACTIVE 1: Live Kiosk & Demo Token Simulator ───────── */
function LiveKioskSimulator() {
  const [cart, setCart] = useState({})
  const [generatedToken, setGeneratedToken] = useState(null)

  const updateQty = (id, delta) => {
    setCart(prev => {
      const current = prev[id] || 0
      const next = Math.max(0, current + delta)
      if (next === 0) {
        const copy = { ...prev }
        delete copy[id]
        return copy
      }
      return { ...prev, [id]: next }
    })
  }

  const cartTotal = useMemo(() => {
    return Object.entries(cart).reduce((sum, [id, qty]) => {
      const item = menuDemoItems.find(i => i.id === id)
      return sum + (item ? item.price * qty : 0)
    }, 0)
  }, [cart])

  const totalItemsCount = useMemo(() => {
    return Object.values(cart).reduce((a, b) => a + b, 0)
  }, [cart])

  const handleSimulateOrder = () => {
    if (totalItemsCount === 0) return
    const randomTokenNum = Math.floor(100 + Math.random() * 900)
    const tokenObj = {
      tokenNo: `A-${randomTokenNum}`,
      items: Object.entries(cart).map(([id, qty]) => {
        const item = menuDemoItems.find(i => i.id === id)
        return { name: item.name, qty, price: item.price }
      }),
      total: cartTotal,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
    setGeneratedToken(tokenObj)
  }

  return (
    <section id="demo" style={{ position: 'relative', padding: '96px 24px', background: '#041009' }}>
      <div style={{ maxWidth: 1150, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <SectionLabel>Interactive Kiosk Demo</SectionLabel>
          <h2 style={{
            fontSize: 'clamp(2.2rem, 4vw, 3.2rem)', fontWeight: 900,
            background: 'linear-gradient(135deg, #ffffff 40%, #86efac 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            margin: '12px 0 12px', fontFamily: 'Outfit, sans-serif'
          }}>
            Try Ordering Live In Seconds
          </h2>
          <p style={{ color: 'rgba(228, 251, 233, 0.75)', fontSize: 16, maxWidth: 540, margin: '0 auto' }}>
            Tap menu items below to build a test cart and click simulate order to experience instant token issuance.
          </p>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 32, alignItems: 'start'
        }}>
          {/* Menu Items Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {menuDemoItems.map(item => {
              const qty = cart[item.id] || 0
              return (
                <motion.div key={item.id} whileHover={{ x: 4 }} style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: qty > 0 ? '1px solid rgba(134, 239, 172, 0.5)' : '1px solid rgba(134, 239, 172, 0.15)',
                  borderRadius: 20, padding: '18px 24px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  boxShadow: qty > 0 ? '0 8px 24px rgba(22, 163, 74, 0.15)' : 'none',
                  transition: 'all 0.2s ease',
                  backdropFilter: 'blur(10px)',
                }}>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontWeight: 800, fontSize: 16, color: '#ffffff', fontFamily: 'Outfit, sans-serif' }}>{item.name}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'rgba(22, 163, 74, 0.2)', color: GMID }}>{item.tag}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'rgba(228, 251, 233, 0.65)', display: 'flex', gap: 14 }}>
                      <span>₹{item.price}</span>
                      <span>• Prep: {item.prep}</span>
                      <span>• {item.cal}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {qty > 0 && (
                      <button onClick={() => updateQty(item.id, -1)} style={{
                        width: 32, height: 32, borderRadius: 10, border: '1px solid rgba(134, 239, 172, 0.3)',
                        background: 'rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <Minus size={14} />
                      </button>
                    )}
                    <span style={{ fontWeight: 800, color: qty > 0 ? GMID : '#ffffff', minWidth: 20, textAlign: 'center', fontSize: 15 }}>{qty}</span>
                    <button onClick={() => updateQty(item.id, 1)} style={{
                      width: 32, height: 32, borderRadius: 10, border: 'none',
                      background: `linear-gradient(135deg, ${G}, #15803d)`, color: '#fff', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)'
                    }}>
                      <Plus size={14} />
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Cart & Token Generation Panel */}
          <div style={{
            background: 'linear-gradient(145deg, rgba(9, 38, 21, 0.9) 0%, rgba(4, 16, 9, 0.9) 100%)',
            borderRadius: 28, border: '1px solid rgba(134, 239, 172, 0.3)',
            padding: 28, boxShadow: '0 20px 48px rgba(0,0,0,0.4)', textAlign: 'left',
            backdropFilter: 'blur(16px)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid rgba(134, 239, 172, 0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ShoppingBag size={20} color={GMID} />
                <span style={{ fontWeight: 800, fontSize: 18, color: '#ffffff', fontFamily: 'Outfit, sans-serif' }}>Your Test Cart</span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 999, background: 'rgba(22, 163, 74, 0.2)', color: GMID }}>
                {totalItemsCount} items
              </span>
            </div>

            {totalItemsCount === 0 ? (
              <div style={{ padding: '36px 0', textAlign: 'center', color: 'rgba(228, 251, 233, 0.5)', fontSize: 14 }}>
                <UtensilsCrossed size={32} color={GMUTE} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                Tap items on the left to add them to your cart.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                {Object.entries(cart).map(([id, qty]) => {
                  const item = menuDemoItems.find(i => i.id === id)
                  return (
                    <div key={id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'rgba(228, 251, 233, 0.9)' }}>
                      <span>{item.name} × {qty}</span>
                      <span style={{ fontWeight: 700, color: '#ffffff' }}>₹{item.price * qty}</span>
                    </div>
                  )
                })}
                <div style={{ height: 1, background: 'rgba(134, 239, 172, 0.15)', margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 900, color: '#ffffff' }}>
                  <span>Total Amount</span>
                  <span style={{ color: GMID }}>₹{cartTotal}</span>
                </div>
              </div>
            )}

            <button onClick={handleSimulateOrder} disabled={totalItemsCount === 0} style={{
              width: '100%', padding: '16px', borderRadius: 16, border: 'none',
              background: totalItemsCount > 0 ? `linear-gradient(135deg, ${G}, #15803d)` : 'rgba(255,255,255,0.08)',
              color: totalItemsCount > 0 ? '#ffffff' : 'rgba(255,255,255,0.3)',
              fontWeight: 800, fontSize: 15, cursor: totalItemsCount > 0 ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              boxShadow: totalItemsCount > 0 ? '0 8px 24px rgba(22, 163, 74, 0.35)' : 'none',
              transition: 'all 0.2s ease',
            }}>
              <Ticket size={18} />
              <span>Simulate Instant Order</span>
            </button>
          </div>
        </div>
      </div>

      {/* Generated Token Popup Dialog */}
      <AnimatePresence>
        {generatedToken && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}>
            <motion.div initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: 20 }} style={{
              width: '100%', maxWidth: 420, background: '#05180d',
              border: '2px solid rgba(134, 239, 172, 0.4)', borderRadius: 28,
              padding: 32, textAlign: 'center', boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6)',
              position: 'relative'
            }}>
              <button onClick={() => setGeneratedToken(null)} style={{
                position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: GMID, cursor: 'pointer'
              }}>
                <X size={20} />
              </button>

              <div style={{
                width: 50, height: 50, borderRadius: 16, background: 'rgba(22, 163, 74, 0.2)',
                border: '1px solid rgba(134, 239, 172, 0.3)', margin: '0 auto 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <CheckCircle2 size={28} color={GMID} />
              </div>

              <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, color: GMID }}>Order Placed Successfully</span>
              <h3 style={{ fontSize: 36, fontWeight: 900, color: '#ffffff', margin: '8px 0 4px', fontFamily: 'Outfit, sans-serif' }}>{generatedToken.tokenNo}</h3>
              <p style={{ fontSize: 12, color: 'rgba(228, 251, 233, 0.6)', marginBottom: 20 }}>Issued at {generatedToken.time} • Counter 01</p>

              {/* Barcode Visualization */}
              <div style={{ background: '#ffffff', padding: '16px', borderRadius: 14, marginBottom: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ display: 'flex', gap: 4, height: 40, alignItems: 'center' }}>
                  {[4, 2, 6, 1, 3, 5, 2, 4, 1, 6, 3, 2, 5, 1, 4].map((h, i) => (
                    <div key={i} style={{ width: h > 3 ? 3 : 1.5, height: '100%', background: '#041009' }} />
                  ))}
                </div>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#041009', letterSpacing: 3 }}>SECE-VERIFY-{generatedToken.tokenNo}</span>
              </div>

              <div style={{ textAlign: 'left', background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 16, marginBottom: 24, fontSize: 13, border: '1px solid rgba(134,239,172,0.15)' }}>
                {generatedToken.items.map((it, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(228, 251, 233, 0.85)', marginBottom: 4 }}>
                    <span>{it.name} × {it.qty}</span>
                    <span style={{ fontWeight: 700 }}>₹{it.price * it.qty}</span>
                  </div>
                ))}
                <div style={{ height: 1, background: 'rgba(134, 239, 172, 0.15)', margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: '#ffffff' }}>
                  <span>Total Paid</span>
                  <span style={{ color: GMID }}>₹{generatedToken.total}</span>
                </div>
              </div>

              <button onClick={() => setGeneratedToken(null)} style={{
                width: '100%', padding: '12px', borderRadius: 14, border: 'none',
                background: `linear-gradient(135deg, ${G}, #15803d)`, color: '#ffffff',
                fontWeight: 800, cursor: 'pointer', fontSize: 14,
              }}>
                Close Demo Ticket
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

/* ── INTERACTIVE 2: Time & Queue Savings Calculator ─────────── */
function QueueSavingsCalculator() {
  const [studentsCount, setStudentsCount] = useState(1200)
  const [avgWaitMins, setAvgWaitMins] = useState(25)

  const hoursSavedPerDay = useMemo(() => {
    return Math.round((studentsCount * avgWaitMins * 0.82) / 60)
  }, [studentsCount, avgWaitMins])

  const queueReductionPct = 85
  const throughputBoost = 3.5

  return (
    <section id="calculator" style={{
      position: 'relative', padding: '96px 24px',
      background: 'linear-gradient(135deg, #05180d 0%, #041009 100%)',
      borderTop: '1px solid rgba(134, 239, 172, 0.15)',
      borderBottom: '1px solid rgba(134, 239, 172, 0.15)',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <SectionLabel>Admin ROI Calculator</SectionLabel>
          <h2 style={{
            fontSize: 'clamp(2.2rem, 4vw, 3.2rem)', fontWeight: 900,
            background: 'linear-gradient(135deg, #ffffff 40%, #86efac 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            margin: '12px 0 12px', fontFamily: 'Outfit, sans-serif'
          }}>
            Calculate Canteen Queue Savings
          </h2>
          <p style={{ color: 'rgba(228, 251, 233, 0.75)', fontSize: 16, maxWidth: 540, margin: '0 auto' }}>
            Adjust the sliders below to see how parallel kiosk billing saves hours of student wait time daily.
          </p>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 40, alignItems: 'center'
        }}>
          {/* Sliders Panel */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)', borderRadius: 28,
            border: '1px solid rgba(134, 239, 172, 0.2)', padding: 32,
            boxShadow: '0 16px 40px rgba(0,0,0,0.3)', backdropFilter: 'blur(12px)',
            textAlign: 'left',
          }}>
            {/* Slider 1 */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#ffffff' }}>Daily Student Crowd</span>
                <span style={{ fontSize: 16, fontWeight: 900, color: GMID }}>{studentsCount} Students</span>
              </div>
              <input type="range" min={100} max={5000} step={100} value={studentsCount}
                onChange={(e) => setStudentsCount(Number(e.target.value))}
                style={{
                  width: '100%', accentColor: G, height: 6, cursor: 'pointer', borderRadius: 4, background: 'rgba(255,255,255,0.1)'
                }} />
            </div>

            {/* Slider 2 */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#ffffff' }}>Current Peak Wait Time</span>
                <span style={{ fontSize: 16, fontWeight: 900, color: GMID }}>{avgWaitMins} Mins / Student</span>
              </div>
              <input type="range" min={5} max={45} step={1} value={avgWaitMins}
                onChange={(e) => setAvgWaitMins(Number(e.target.value))}
                style={{
                  width: '100%', accentColor: G, height: 6, cursor: 'pointer', borderRadius: 4, background: 'rgba(255,255,255,0.1)'
                }} />
            </div>
          </div>

          {/* Metric Outputs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(22, 163, 74, 0.15), rgba(4, 16, 9, 0.6))',
              border: '1px solid rgba(134, 239, 172, 0.3)', borderRadius: 24, padding: 24, textAlign: 'center'
            }}>
              <Clock size={28} color={GMID} style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: 36, fontWeight: 900, color: '#ffffff', fontFamily: 'Outfit, sans-serif' }}>{hoursSavedPerDay} hrs</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: GMID, textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>Saved Daily</div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, rgba(22, 163, 74, 0.15), rgba(4, 16, 9, 0.6))',
              border: '1px solid rgba(134, 239, 172, 0.3)', borderRadius: 24, padding: 24, textAlign: 'center'
            }}>
              <Zap size={28} color={GMID} style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: 36, fontWeight: 900, color: '#ffffff', fontFamily: 'Outfit, sans-serif' }}>{queueReductionPct}%</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: GMID, textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>Queue Reduction</div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, rgba(22, 163, 74, 0.15), rgba(4, 16, 9, 0.6))',
              border: '1px solid rgba(134, 239, 172, 0.3)', borderRadius: 24, padding: 24, textAlign: 'center', gridColumn: 'span 2'
            }}>
              <Activity size={28} color={GMID} style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: 32, fontWeight: 900, color: '#ffffff', fontFamily: 'Outfit, sans-serif' }}>{throughputBoost}x Faster Counter Serving</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: GMID, textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>Parallel Processing Efficiency</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── INTERACTIVE 3: 3D Food Spec Inspector ──────────────────── */
function Dish3DSpecViewer() {
  const [activeDish, setActiveDish] = useState(0)

  const dishSpecs = [
    { title: 'Chicken Biryani', prep: '< 3 mins', cal: '550 kcal', desc: 'Aromatic basmati rice cooked with authentic spices.' },
    { title: 'Crispy Ghee Dosa', prep: '< 2 mins', cal: '320 kcal', desc: 'Golden crispy crepe served with coconut chutney.' },
    { title: 'Parotta Combo',    prep: '< 2 mins', cal: '410 kcal', desc: 'Layered South Indian flatbread with spicy kurma.' },
    { title: 'Schezwan Noodles', prep: '< 4 mins', cal: '460 kcal', desc: 'Tossed wok noodles with bell peppers & spicy sauce.' },
    { title: 'Veg Fried Rice',   prep: '< 3 mins', cal: '380 kcal', desc: 'Garden fresh vegetables stir-fried with fragrant rice.' },
  ]

  const current = dishSpecs[activeDish]

  return (
    <section style={{ padding: '96px 24px', background: '#041009', position: 'relative' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <SectionLabel>3D Food Inspector</SectionLabel>
          <h2 style={{
            fontSize: 'clamp(2.2rem, 4vw, 3.2rem)', fontWeight: 900,
            background: 'linear-gradient(135deg, #ffffff 40%, #86efac 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            margin: '12px 0 12px', fontFamily: 'Outfit, sans-serif'
          }}>
            Inspect Canteen Specialties in 3D
          </h2>
        </div>

        {/* Dish Tabs */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 40 }}>
          {dishSpecs.map((item, idx) => (
            <button key={item.title} onClick={() => setActiveDish(idx)} style={{
              padding: '10px 20px', borderRadius: 999, border: activeDish === idx ? '1px solid rgba(134, 239, 172, 0.5)' : '1px solid rgba(134, 239, 172, 0.15)',
              background: activeDish === idx ? 'rgba(22, 163, 74, 0.2)' : 'rgba(255,255,255,0.03)',
              color: activeDish === idx ? GMID : 'rgba(228, 251, 233, 0.7)',
              fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s ease',
            }}>
              {item.title}
            </button>
          ))}
        </div>

        {/* 3D Model Display Card */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)', borderRadius: 32,
          border: '1px solid rgba(134, 239, 172, 0.2)', padding: 40,
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 32, alignItems: 'center', boxShadow: '0 20px 48px rgba(0,0,0,0.3)',
        }}>
          <div style={{ height: 340, position: 'relative' }}>
            <Canvas camera={{ position: [0, 0, 3.5], fov: 45 }}>
              <ambientLight intensity={2.2} />
              <directionalLight position={[0, 5, 2]} intensity={2.0} />
              <Float speed={1.8} rotationIntensity={0.8} floatIntensity={1.2}>
                {activeDish === 0 && <BiryaniItem position={[0, 0, 0]} scale={[1.45, 1.45, 1.45]} />}
                {activeDish === 1 && <DosaItem position={[0, 0, 0]} scale={[1.45, 1.45, 1.45]} />}
                {activeDish === 2 && <ParottaItem position={[0, 0, 0]} scale={[1.45, 1.45, 1.45]} />}
                {activeDish === 3 && <NoodlesItem position={[0, 0, 0]} scale={[1.45, 1.45, 1.45]} />}
                {activeDish === 4 && <VegRiceItem position={[0, 0, 0]} scale={[1.45, 1.45, 1.45]} />}
              </Float>
            </Canvas>
          </div>

          <div style={{ textAlign: 'left' }}>
            <h3 style={{ fontSize: 28, fontWeight: 900, color: '#ffffff', marginBottom: 12, fontFamily: 'Outfit, sans-serif' }}>{current.title}</h3>
            <p style={{ fontSize: 15, color: 'rgba(228, 251, 233, 0.75)', lineHeight: 1.6, marginBottom: 24 }}>{current.desc}</p>
            <div style={{ display: 'flex', gap: 20 }}>
              <div style={{ background: 'rgba(22, 163, 74, 0.15)', borderRadius: 14, padding: '12px 20px', border: '1px solid rgba(134,239,172,0.2)' }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', color: GMID, fontWeight: 800 }}>Prep Speed</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#ffffff' }}>{current.prep}</div>
              </div>
              <div style={{ background: 'rgba(22, 163, 74, 0.15)', borderRadius: 14, padding: '12px 20px', border: '1px solid rgba(134,239,172,0.2)' }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', color: GMID, fontWeight: 800 }}>Est. Energy</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#ffffff' }}>{current.cal}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Features Carousel ──────────────────────────────────────── */
function Features() {
  const scrollRef = useRef(null)

  const scroll = (direction) => {
    if (scrollRef.current) {
      const { scrollLeft } = scrollRef.current
      const offset = direction === 'left' ? -360 : 360
      scrollRef.current.scrollTo({ left: scrollLeft + offset, behavior: 'smooth' })
    }
  }

  return (
    <section id="features" style={{ position: 'relative', padding: '96px 24px', background: '#041009', overflow: 'hidden' }}>
      <div style={{ position: 'relative', maxWidth: 1150, margin: '0 auto', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ textAlign: 'left' }}>
            <SectionLabel>Core Capabilities</SectionLabel>
            <h2 style={{
              fontSize: 'clamp(2.2rem, 4vw, 3rem)', fontWeight: 900,
              background: 'linear-gradient(135deg, #ffffff 40%, #86efac 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              color: '#ffffff',
              margin: '8px 0 0', letterSpacing: '-0.75px',
              fontFamily: 'Outfit, sans-serif'
            }}>
              Engineered for Canteen Efficiency
            </h2>
          </div>
          {/* Scroll Navigation Buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => scroll('left')} style={{
              width: '46px', height: '46px', borderRadius: '14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(134,239,172,0.2)',
              color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', outline: 'none'
            }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}>
              <ChevronLeft size={22} color={GMID} />
            </button>
            <button onClick={() => scroll('right')} style={{
              width: '46px', height: '46px', borderRadius: '14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(134,239,172,0.2)',
              color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', outline: 'none'
            }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}>
              <ChevronRight size={22} color={GMID} />
            </button>
          </div>
        </div>

        {/* Carousel Wrapper */}
        <div 
          ref={scrollRef}
          style={{
            display: 'flex',
            gap: '24px',
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            paddingBottom: '24px',
          }}
          className="hide-scrollbar"
        >
          {features.map(({ icon: Icon, title, desc }) => (
            <motion.div
              key={title}
              whileHover={{ y: -6, borderColor: 'rgba(134, 239, 172, 0.4)', background: 'rgba(255, 255, 255, 0.05)' }}
              style={{
                flex: '0 0 330px',
                scrollSnapAlign: 'start',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '24px',
                padding: '28px',
                border: '1px solid rgba(134, 239, 172, 0.18)',
                boxShadow: '0 12px 36px rgba(0,0,0,0.3)',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                backdropFilter: 'blur(10px)',
                transition: 'border-color 0.3s ease, background 0.3s ease',
              }}
            >
              <div>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '14px', marginBottom: '20px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(22, 163, 74, 0.18)', border: '1px solid rgba(134, 239, 172, 0.3)',
                  boxShadow: '0 4px 14px rgba(22, 163, 74, 0.2)'
                }}>
                  <Icon size={22} color={GMID} />
                </div>
                <h3 style={{ fontWeight: 800, fontSize: '18px', color: '#ffffff', marginBottom: '8px', letterSpacing: '-0.3px', fontFamily: 'Outfit, sans-serif' }}>{title}</h3>
                <p style={{ fontSize: '14px', color: 'rgba(228, 251, 233, 0.7)', lineHeight: '1.65' }}>{desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Stats ──────────────────────────────────────────────────── */
function Stats() {
  return (
    <section id="stats" style={{
      padding: '80px 24px',
      background: 'linear-gradient(135deg, #041009 0%, #092816 100%)',
      borderTop: '1px solid rgba(134, 239, 172, 0.15)',
      borderBottom: '1px solid rgba(134, 239, 172, 0.15)',
    }}>
      <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
        style={{
          maxWidth: 1100, margin: '0 auto',
          background: 'rgba(255, 255, 255, 0.02)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '36px',
          border: '1px solid rgba(134, 239, 172, 0.18)',
          padding: '48px 36px',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 32,
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
        }}>
        {stats.map(({ value, label, subLabel }) => (
          <motion.div key={label} variants={fadeUp} style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 'clamp(2.4rem, 5vw, 3.6rem)', fontWeight: 900,
              color: '#ffffff',
              letterSpacing: '-1px',
              textShadow: '0 4px 24px rgba(134, 239, 172, 0.4)',
              fontFamily: 'Outfit, sans-serif'
            }}>{value}</div>
            <div style={{
              fontSize: 13,
              marginTop: 6,
              fontWeight: 800,
              color: GMID,
              letterSpacing: '0.5px',
            }}>{label}</div>
            <div style={{
              fontSize: 11,
              marginTop: 4,
              fontWeight: 500,
              color: 'rgba(228, 251, 233, 0.5)',
            }}>{subLabel}</div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}

/* ── INTERACTIVE 4: Interactive Flow Tabber ─────────────────── */
function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0)

  return (
    <section id="how" style={{ position: 'relative', padding: '104px 24px', background: 'linear-gradient(180deg, #041009 0%, #05180d 100%)', overflow: 'hidden' }}>
      <div style={{ position: 'relative', maxWidth: 1100, margin: '0 auto', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <SectionLabel>Interactive Workflow</SectionLabel>
          <h2 style={{
            fontSize: 'clamp(2.2rem, 4.5vw, 3.2rem)', fontWeight: 900,
            background: 'linear-gradient(135deg, #ffffff 40%, #86efac 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            margin: '12px 0 0', fontFamily: 'Outfit, sans-serif'
          }}>
            Click Steps To Explore The System Flow
          </h2>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 40, alignItems: 'center'
        }}>
          {/* Step Timeline Selection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {steps.map((st, idx) => {
              const isSelected = activeStep === idx
              return (
                <motion.div key={st.num} onClick={() => setActiveStep(idx)}
                  whileHover={{ x: 6 }} style={{
                    padding: 24, borderRadius: 24, cursor: 'pointer',
                    background: isSelected ? 'rgba(22, 163, 74, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                    border: isSelected ? '1px solid rgba(134, 239, 172, 0.5)' : '1px solid rgba(134, 239, 172, 0.15)',
                    display: 'flex', gap: 20, alignItems: 'center', textAlign: 'left',
                    boxShadow: isSelected ? '0 12px 32px rgba(22, 163, 74, 0.2)' : 'none',
                    transition: 'all 0.25s ease'
                  }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 16, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 900, fontSize: 16,
                    background: isSelected ? G : 'rgba(255,255,255,0.05)',
                    color: isSelected ? '#ffffff' : GMID,
                    fontFamily: 'Outfit, sans-serif'
                  }}>
                    {st.num}
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, color: GMID }}>{st.role}</div>
                    <h3 style={{ fontSize: 18, fontWeight: 800, color: '#ffffff', margin: '2px 0 4px', fontFamily: 'Outfit, sans-serif' }}>{st.action}</h3>
                    <p style={{ fontSize: 13, color: 'rgba(228, 251, 233, 0.7)', margin: 0 }}>{st.detail}</p>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Dynamic Stage Preview Card */}
          <motion.div key={activeStep} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{
            background: 'linear-gradient(145deg, rgba(9, 38, 21, 0.95), rgba(4, 16, 9, 0.95))',
            borderRadius: 32, border: '2px solid rgba(134, 239, 172, 0.35)',
            padding: 36, textAlign: 'left', boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
          }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 14px', borderRadius: 999, background: 'rgba(22, 163, 74, 0.2)',
              color: GMID, fontSize: 12, fontWeight: 800, marginBottom: 20
            }}>
              <Monitor size={14} />
              <span>Step {steps[activeStep].num} Interactive View</span>
            </div>

            <h3 style={{ fontSize: 26, fontWeight: 900, color: '#ffffff', marginBottom: 10, fontFamily: 'Outfit, sans-serif' }}>
              {steps[activeStep].previewTitle}
            </h3>
            <p style={{ fontSize: 15, color: 'rgba(228, 251, 233, 0.8)', lineHeight: 1.6, marginBottom: 28 }}>
              {steps[activeStep].previewDesc}
            </p>

            <div style={{
              background: 'rgba(0, 0, 0, 0.5)', borderRadius: 20, padding: 24,
              border: '1px solid rgba(134, 239, 172, 0.2)', display: 'flex', flexDirection: 'column', gap: 12
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: GMID }}>System Status</span>
                <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: G, color: '#fff' }}>ACTIVE</span>
              </div>
              <div style={{ fontSize: 14, color: '#ffffff', fontWeight: 600 }}>
                {activeStep === 0 && "QR Code scanned • Menu loaded in 0.4s"}
                {activeStep === 1 && "Payment Gateway simulation verified • Paid status logged"}
                {activeStep === 2 && "FIFO Queue updated • Token #A-108 generated"}
                {activeStep === 3 && "Staff token entry verified • Order marked as SERVED"}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ── Brand Showcase (Billing & Packaging) ───────────────────── */
function BrandShowcase() {
  return (
    <section id="branding" style={{ position: 'relative', padding: '104px 24px', background: '#05180d', overflow: 'hidden' }}>
      <div style={{ position: 'relative', maxWidth: 1150, margin: '0 auto', zIndex: 1, textAlign: 'center' }}>
        <SectionLabel>Eco Packaging & Billing</SectionLabel>

        <motion.h2 variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
          style={{
            fontSize: 'clamp(2.2rem, 4vw, 3.2rem)', fontWeight: 900,
            background: 'linear-gradient(135deg, #ffffff 40%, #86efac 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            margin: '12px 0 12px', fontFamily: 'Outfit, sans-serif'
          }}>
          Smart Billing. Sustainable Experience.
        </motion.h2>

        <motion.p variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
          style={{ color: 'rgba(228, 251, 233, 0.75)', fontSize: 16, maxWidth: 560, margin: '0 auto 60px', lineHeight: 1.65 }}>
          Every order triggers digital receipts and eco-friendly packaging for seamless counter pickup.
        </motion.p>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '36px', justifyItems: 'center', alignItems: 'stretch',
        }}>
          {/* Card 1: Receipt */}
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            whileHover={{ y: -8, scale: 1.02, borderColor: 'rgba(134, 239, 172, 0.4)' }}
            style={{
              position: 'relative', width: '100%', maxWidth: '340px', height: '390px',
              background: 'rgba(255, 255, 255, 0.03)', borderRadius: '28px',
              border: '1px solid rgba(134, 239, 172, 0.2)', padding: '24px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 20px 48px rgba(0,0,0,0.3)', backdropFilter: 'blur(12px)',
              transition: 'all 0.3s ease'
            }}>
            <img src={receiptImg} alt="Bill4Food Digital Receipt" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '18px' }} />
          </motion.div>

          {/* Card 2: Brown Paper Bag */}
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            whileHover={{ y: -8, scale: 1.02, borderColor: 'rgba(134, 239, 172, 0.4)' }}
            style={{
              position: 'relative', width: '100%', maxWidth: '340px', height: '390px',
              background: 'rgba(255, 255, 255, 0.03)', borderRadius: '28px',
              border: '1px solid rgba(134, 239, 172, 0.2)', padding: '24px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 20px 48px rgba(0,0,0,0.3)', backdropFilter: 'blur(12px)',
              transition: 'all 0.3s ease'
            }}>
            <img src={deliveryImg} alt="Bill4Food Eco Packaging" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '18px' }} />
          </motion.div>

          {/* Card 3: Smart Vending Machine */}
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            whileHover={{ y: -8, scale: 1.02, borderColor: 'rgba(134, 239, 172, 0.4)' }}
            style={{
              position: 'relative', width: '100%', maxWidth: '340px', height: '390px',
              background: 'rgba(255, 255, 255, 0.03)', borderRadius: '28px',
              border: '1px solid rgba(134, 239, 172, 0.2)', padding: '24px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 20px 48px rgba(0,0,0,0.3)', backdropFilter: 'blur(12px)',
              transition: 'all 0.3s ease'
            }}>
            <img src={vendingImg} alt="Bill4Food Kiosk Kiosk" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '18px' }} />
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ── INTERACTIVE 5: FAQ Accordion ───────────────────────────── */
function FAQAccordion() {
  const [openIdx, setOpenIdx] = useState(0)

  return (
    <section id="faq" style={{ padding: '96px 24px', background: '#041009', position: 'relative' }}>
      <div style={{ maxWidth: 840, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <SectionLabel>Got Questions?</SectionLabel>
          <h2 style={{
            fontSize: 'clamp(2.2rem, 4vw, 3.2rem)', fontWeight: 900,
            background: 'linear-gradient(135deg, #ffffff 40%, #86efac 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            margin: '12px 0 12px', fontFamily: 'Outfit, sans-serif'
          }}>
            Frequently Asked Questions
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx
            return (
              <div key={idx} style={{
                background: 'rgba(255, 255, 255, 0.03)', borderRadius: 20,
                border: isOpen ? '1px solid rgba(134, 239, 172, 0.4)' : '1px solid rgba(134, 239, 172, 0.15)',
                overflow: 'hidden', transition: 'border-color 0.2s ease',
              }}>
                <button onClick={() => setOpenIdx(isOpen ? null : idx)} style={{
                  width: '100%', padding: '20px 24px', border: 'none', background: 'none',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  cursor: 'pointer', textAlign: 'left', outline: 'none'
                }}>
                  <span style={{ fontSize: 17, fontWeight: 800, color: '#ffffff', fontFamily: 'Outfit, sans-serif' }}>{faq.q}</span>
                  <ChevronDown size={20} color={GMID} style={{
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease'
                  }} />
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                      <div style={{ padding: '0 24px 24px', color: 'rgba(228, 251, 233, 0.75)', fontSize: 15, lineHeight: 1.65, borderTop: '1px solid rgba(134, 239, 172, 0.1)' }}>
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ── CTA Banner ─────────────────────────────────────────────── */
function CTA({ onLogin }) {
  return (
    <section style={{ position: 'relative', padding: '96px 24px', background: '#041009', overflow: 'hidden' }}>
      <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
        style={{
          position: 'relative', maxWidth: 920, margin: '0 auto',
          background: 'linear-gradient(135deg, rgba(22, 163, 74, 0.12) 0%, rgba(4, 16, 9, 0.8) 100%)',
          borderRadius: '36px', padding: '64px 36px',
          border: '1px solid rgba(134, 239, 172, 0.3)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.4), 0 0 30px rgba(22, 163, 74, 0.15)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
          backdropFilter: 'blur(16px)', zIndex: 1,
        }}>
        
        <SectionLabel>Ready to Upgrade?</SectionLabel>
        
        <motion.h2 variants={fadeUp} style={{
          fontSize: 'clamp(2.2rem, 5vw, 3.4rem)', fontWeight: 900,
          background: 'linear-gradient(135deg, #ffffff 40%, #86efac 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          lineHeight: 1.12, letterSpacing: '-0.75px', maxWidth: 540,
          margin: '12px 0 16px', fontFamily: 'Outfit, sans-serif'
        }}>
          Ready to Go <span style={{ background: 'linear-gradient(135deg, #86efac 30%, #22c55e 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Queue-Free</span>?
        </motion.h2>

        <motion.p variants={fadeUp} style={{ marginBottom: 36, fontSize: 16, color: 'rgba(228, 251, 233, 0.85)', lineHeight: 1.7, maxWidth: 480 }}>
          Bill4Food is purpose-built for Sri Eshwar College of Engineering — fast, lightweight, and completely parallel.
        </motion.p>

        <motion.div variants={fadeUp}>
          <motion.button onClick={onLogin} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '16px 40px', borderRadius: 16, fontWeight: 700,
              background: `linear-gradient(135deg, ${G}, #15803d)`, color: '#fff', border: 'none', fontSize: 16, cursor: 'pointer',
              boxShadow: '0 8px 28px rgba(22, 163, 74, 0.4)',
            }}>
            <CheckCircle2 size={20} />
            <span>Launch App Now</span>
          </motion.button>
        </motion.div>
      </motion.div>
    </section>
  )
}

/* ── Footer ─────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer style={{
      padding: '60px 24px 48px', background: '#030a05',
      borderTop: '1px solid rgba(134, 239, 172, 0.12)', color: GMID, fontSize: 14,
    }}>
      <div style={{ maxWidth: 1050, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'linear-gradient(135deg, #16a34a, #14532d)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <UtensilsCrossed size={16} color="#ffffff" />
          </div>
          <div style={{ fontWeight: 900, fontSize: 22, color: '#fff', letterSpacing: '-0.5px', fontFamily: 'Outfit, sans-serif' }}>
            Bill<span style={{ color: GMID }}>4</span>Food
          </div>
        </div>
        <p style={{ color: 'rgba(228, 251, 233, 0.75)', maxWidth: 540, lineHeight: 1.6, textAlign: 'center' }}>
          Built for Sri Eshwar College of Engineering — Next-Gen Parallel Canteen Kiosk & Billing System
        </p>
        <div style={{ width: '100%', maxWidth: 450, height: 1, background: 'rgba(134, 239, 172, 0.12)', margin: '8px 0' }} />
        <p style={{ opacity: 0.5, fontSize: 12 }}>© {new Date().getFullYear()} Bill4Food. All rights reserved.</p>
      </div>
    </footer>
  )
}

/* ── Root Landing Component ─────────────────────────────────── */
export default function Landing() {
  const navigate = useNavigate()
  return (
    <div style={{ minHeight: '100vh', background: '#041009', color: GDARK, overflowX: 'hidden', position: 'relative' }}>
      <Navbar onLogin={() => navigate('/login')} />
      <Hero   onLogin={() => navigate('/login')} />
      <LiveKioskSimulator />
      <Dish3DSpecViewer />
      <QueueSavingsCalculator />
      <FoodScene3DSection />
      <Features />
      <Stats />
      <HowItWorks />
      <BrandShowcase />
      <FAQAccordion />
      <CTA    onLogin={() => navigate('/login')} />
      <Footer />
    </div>
  )
}
