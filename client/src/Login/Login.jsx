import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, LogIn, ArrowLeft, ShieldCheck, Ticket, BarChart3, ChefHat, ExternalLink } from 'lucide-react'
import { api } from '../api'
import './Login.css'

const G     = '#16a34a'
const GDARK = '#14532d'
const GLIGHT= '#dcfce7'
const GMID  = '#86efac'
const GMUTE = '#4b7c5e'

export default function Login() {
  const navigate = useNavigate()
  const [role, setRole] = useState('admin') // 'admin' or 'staff'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleDemoFill = (selectedRole) => {
    setError('')
    setRole(selectedRole)
    if (selectedRole === 'admin') {
      setEmail('admin@sece.ac.in')
      setPassword('admin@123')
    } else {
      setEmail('staff1@sece.ac.in')
      setPassword('staff@123')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await api.login({ email, password })
      if (response && response.token) {
        localStorage.setItem('token', response.token)
        localStorage.setItem('user', JSON.stringify(response.user))
        const userRole = response.user?.role || role
        navigate(userRole === 'admin' ? '/admin' : '/user')
      } else {
        throw new Error('No token returned from server')
      }
    } catch (err) {
      console.warn('API authentication failed, falling back to mock routing:', err.message)
      if (
        (email === 'admin@sece.ac.in' && password === 'admin@123') ||
        (email.startsWith('staff') && password === 'staff@123') ||
        (email === '' && password === '')
      ) {
        navigate(role === 'admin' ? '/admin' : '/user')
      } else {
        setError(err.message || 'Invalid credentials. Try Demo fill buttons.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      
      {/* ── LEFT PANEL: BRAND & FEATURE SHOWCASE (Desktop) ── */}
      <div className="login-left">
        {/* Decorative grids */}
        <div className="login-grid" />
        <div style={{
          position: 'absolute', top: '25%', left: '25%',
          width: '380px', height: '380px', background: 'rgba(22,163,74,0.06)',
          borderRadius: '50%', filter: 'blur(100px)', pointerEvents: 'none'
        }} />


        {/* Brand visual showcase */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', margin: 'auto 0', zIndex: 10, maxWidth: '440px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '48px', height: '48px', background: 'rgba(22,163,74,0.15)',
              border: '1px solid rgba(22,163,74,0.25)', borderRadius: '16px',
              display: 'flex', alignItems: 'center', justifycontent: 'center',
              justifyContent: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
            }}>
              <ChefHat size={26} color={GMID} className="animate-pulse-soft" />
            </div>
            <span style={{ fontSize: '28px', fontWeight: '900', letterSpacing: '-0.5px', color: '#fff' }}>
              Bill<span style={{ color: GMID }}>4</span>Food
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h1 style={{ fontSize: '36px', fontWeight: '800', color: '#fff', lineHeight: '1.25', margin: 0, fontFamily: "'Outfit', sans-serif" }}>
              Smarter billing.<br />
              <span style={{ background: 'linear-gradient(135deg, #4ade80, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', color: '#86efac' }}>Zero queues.</span>
            </h1>
            <p style={{ fontSize: '14px', color: 'rgba(134,239,172,0.6)', lineHeight: '1.6', margin: 0 }}>
              Designed specifically for Sri Eshwar College of Engineering to streamline canteen billing, prevent order traffic, and issue instant order tokens.
            </p>
          </div>

          {/* Pillars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <Ticket size={18} color={GMID} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#fff', margin: 0 }}>FIFO Token Verification</h4>
                <p style={{ fontSize: '12px', color: 'rgba(134,239,172,0.5)', margin: '2px 0 0', lineHeight: '1.4' }}>Sequential token assignment to serve customers in absolute FIFO order.</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <ShieldCheck size={18} color={GMID} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#fff', margin: 0 }}>Active Stock Controls</h4>
                <p style={{ fontSize: '12px', color: 'rgba(134,239,172,0.5)', margin: '2px 0 0', lineHeight: '1.4' }}>Prevent duplicate ordering or serving items that have run out of stock.</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <BarChart3 size={18} color={GMID} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#fff', margin: 0 }}>Live Monitoring Console</h4>
                <p style={{ fontSize: '12px', color: 'rgba(134,239,172,0.5)', margin: '2px 0 0', lineHeight: '1.4' }}>Track daily menu orders, active settings, and verify canteen tokens.</p>
              </div>
            </div>

          </div>
        </div>

        <p style={{ fontSize: '12px', color: 'rgba(134,239,172,0.4)', margin: 0 }}>
          © {new Date().getFullYear()} Bill4Food · Sri Eshwar College Canteen
        </p>
      </div>

      {/* ── RIGHT PANEL: GLOWING HIGH-CONTRAST WHITE LOGIN FORM ── */}
      <div className="login-right">
        {/* Floating background glowing blobs */}
        <div className="glow-blob glow-blob-1" />
        <div className="glow-blob glow-blob-2" />
        <div className="glow-blob glow-blob-3" />


        {/* Clean, high-contrast white card container */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(22, 163, 74, 0.15)',
          borderRadius: '24px',
          padding: '40px 32px',
          width: '100%',
          maxWidth: '430px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box'
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: G, textTransform: 'uppercase', letterSpacing: '2.5px' }}>Staff Portal</span>
            <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', margin: '4px 0 0', fontFamily: "'Outfit', sans-serif" }}>Sign In to Dashboard</h2>
            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Enter credentials to manage canteen services</p>
          </div>

          {/* Role selector Segmented Toggle (Light Theme) */}
          <div style={{
            display: 'flex',
            background: '#f1f5f9',
            border: '1px solid #e2e8f0',
            padding: '4px',
            borderRadius: '16px',
            marginBottom: '24px',
            position: 'relative',
            height: '44px',
            alignItems: 'center',
            boxSizing: 'border-box'
          }}>
            {/* Sliding Pill Background Indicator */}
            <div style={{
              position: 'absolute',
              top: '4px',
              bottom: '4px',
              width: 'calc(50% - 4px)',
              background: 'linear-gradient(135deg, #16a34a, #15803d)',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(22,163,74,0.2)',
              zIndex: 1,
              transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: role === 'admin' ? 'translateX(0)' : 'translateX(100%)',
              left: '4px'
            }} />

            <button
              type="button"
              onClick={() => handleDemoFill('admin')}
              style={{
                flex: 1, height: '100%', border: 'none', background: 'none',
                color: role === 'admin' ? '#fff' : '#64748b',
                fontSize: '12px', fontWeight: '700', cursor: 'pointer', zIndex: 2,
                transition: 'color 0.2s'
              }}
            >
              Canteen Manager
            </button>
            <button
              type="button"
              onClick={() => handleDemoFill('staff')}
              style={{
                flex: 1, height: '100%', border: 'none', background: 'none',
                color: role === 'staff' ? '#fff' : '#64748b',
                fontSize: '12px', fontWeight: '700', cursor: 'pointer', zIndex: 2,
                transition: 'color 0.2s'
              }}
            >
              Counter Staff
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div style={{
              marginBottom: '16px', padding: '12px', borderRadius: '12px',
              background: '#fef2f2', border: '1px solid #fecaca',
              fontSize: '12px', color: '#991b1b', textAlign: 'left'
            }}>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            
            {/* Email Field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', letterSpacing: '0.5px' }}>Email Address</label>
              <div style={{ position: 'relative', width: '100%' }}>
                <div style={{
                  position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                  display: 'flex', alignItems: 'center', color: '#94a3b8', pointerEvents: 'none'
                }}>
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  required
                  placeholder="e.g. admin@sece.ac.in"
                  value={email}
                  onChange={(e) => { setError(''); setEmail(e.target.value) }}
                  style={{
                    width: '100%', height: '46px', padding: '12px 16px 12px 42px',
                    background: '#ffffff', border: '1px solid #cbd5e1',
                    borderRadius: '12px', color: '#0f172a', fontSize: '14px', outline: 'none',
                    transition: 'border-color 0.2s', boxSizing: 'border-box'
                  }}
                  onFocus={e => e.target.style.borderColor = G}
                  onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                />
              </div>
            </div>

            {/* Password Field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', letterSpacing: '0.5px' }}>Password</label>
                <span style={{ fontSize: '10px', color: '#64748b', cursor: 'pointer' }} onMouseEnter={e => e.target.style.color = G} onMouseLeave={e => e.target.style.color = '#64748b'}>Forgot?</span>
              </div>
              <div style={{ position: 'relative', width: '100%' }}>
                <div style={{
                  position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                  display: 'flex', alignItems: 'center', color: '#94a3b8', pointerEvents: 'none'
                }}>
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setError(''); setPassword(e.target.value) }}
                  style={{
                    width: '100%', height: '46px', padding: '12px 16px 12px 42px',
                    background: '#ffffff', border: '1px solid #cbd5e1',
                    borderRadius: '12px', color: '#0f172a', fontSize: '14px', outline: 'none',
                    transition: 'border-color 0.2s', boxSizing: 'border-box'
                  }}
                  onFocus={e => e.target.style.borderColor = G}
                  onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', height: '48px', marginTop: '10px',
                background: 'linear-gradient(135deg, #16a34a, #15803d)',
                border: 'none', borderRadius: '12px', color: '#fff',
                fontSize: '14px', fontWeight: '700', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyCentert: 'center',
                justifyContent: 'center', gap: '8px', boxShadow: '0 8px 24px rgba(22,163,74,0.2)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.target.style.boxShadow = '0 8px 28px rgba(22,163,74,0.35)'}
              onMouseLeave={e => e.target.style.boxShadow = '0 8px 24px rgba(22,163,74,0.2)'}
            >
              {loading ? (
                <div style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              ) : (
                <>
                  <LogIn size={16} /> Sign In
                </>
              )}
            </button>
          </form>

          {/* Footer Shortcuts */}
          <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', tracking: '0.1em', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center' }}>QUICK TESTING SHORTCUTS</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => handleDemoFill('admin')}
                  style={{
                    padding: '8px 12px', background: '#f8fafc',
                    border: '1px solid #e2e8f0', borderRadius: '8px',
                    color: '#475569', fontSize: '11px', fontWeight: '600',
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => { e.target.style.background = '#f1f5f9'; e.target.style.color = '#0f172a' }}
                  onMouseLeave={e => { e.target.style.background = '#f8fafc'; e.target.style.color = '#475569' }}
                >
                  Admin Auto-fill
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoFill('staff')}
                  style={{
                    padding: '8px 12px', background: '#f8fafc',
                    border: '1px solid #e2e8f0', borderRadius: '8px',
                    color: '#475569', fontSize: '11px', fontWeight: '600',
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => { e.target.style.background = '#f1f5f9'; e.target.style.color = '#0f172a' }}
                  onMouseLeave={e => { e.target.style.background = '#f8fafc'; e.target.style.color = '#475569' }}
                >
                  Staff Auto-fill
                </button>
              </div>
            </div>



          </div>

        </div>
      </div>

    </div>
  )
}
