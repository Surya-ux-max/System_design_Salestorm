import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, UtensilsCrossed, ClipboardList, LogOut, ChefHat, Wifi, WifiOff } from 'lucide-react'
import { G, GDARK, GMID, formatTime, getNow } from './adminData'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'menu',      label: 'Menu',       icon: UtensilsCrossed },
  { id: 'orders',    label: 'Orders',     icon: ClipboardList   },
]

export default function Sidebar({ active, setActive, onLogout, isWorkingDay, open }) {
  const [time, setTime] = useState(formatTime(getNow()))

  useEffect(() => {
    const t = setInterval(() => setTime(formatTime(getNow())), 30000)
    return () => clearInterval(t)
  }, [])

  const now = getNow()

  return (
    <motion.aside
      animate={{ width: open ? 230 : 68 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        flexShrink: 0, overflow: 'hidden',
        background: `linear-gradient(180deg, ${GDARK} 0%, #0f3320 100%)`,
        display: 'flex', flexDirection: 'column',
        padding: open ? '24px 14px' : '24px 10px',
        minHeight: '100vh',
        boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
        transition: 'padding 0.3s',
      }}>

      {/* logo */}
      <div style={{
        textAlign: 'center', marginBottom: 24,
        padding: open ? '14px 12px' : '10px 4px',
        background: 'rgba(255,255,255,0.06)', borderRadius: 16,
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: open ? 8 : 0 }}>
          <ChefHat size={open ? 34 : 26} color={GMID} />
        </div>
        <AnimatePresence>
          {open && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <div style={{ fontWeight: 900, fontSize: 20, color: '#fff', whiteSpace: 'nowrap' }}>
                Bill<span style={{ color: GMID }}>4</span>Food
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: GMID, letterSpacing: 2, marginTop: 2 }}>
                ADMIN PORTAL
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* live clock */}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ textAlign: 'center', marginBottom: 20, padding: '10px', background: 'rgba(255,255,255,0.04)', borderRadius: 12 }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: 1 }}>{time}</div>
            <div style={{ fontSize: 11, color: GMID, marginTop: 2 }}>
              {now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* nav */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {NAV.map(({ id, label, icon: Icon }) => (
          <motion.button key={id} onClick={() => setActive(id)}
            whileHover={{ x: open ? 4 : 0, scale: open ? 1 : 1.1 }}
            whileTap={{ scale: 0.95 }}
            title={!open ? label : ''}
            style={{
              display: 'flex', alignItems: 'center',
              gap: open ? 10 : 0,
              justifyContent: open ? 'flex-start' : 'center',
              padding: open ? '11px 14px' : '11px',
              borderRadius: 14, border: 'none',
              cursor: 'pointer', fontSize: 14, fontWeight: 700,
              background: active === id ? G : 'rgba(255,255,255,0.06)',
              color: active === id ? '#fff' : GMID,
              transition: 'background 0.2s',
              boxShadow: active === id ? '0 4px 14px #16a34a40' : 'none',
              whiteSpace: 'nowrap', overflow: 'hidden',
            }}>
            <Icon size={17} style={{ flexShrink: 0 }} />
            <AnimatePresence>
              {open && (
                <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
                  {label}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        ))}
      </div>

      <div style={{ flex: 1 }} />

      {/* canteen status */}
      <div style={{
        background: 'rgba(255,255,255,0.06)', borderRadius: 14,
        padding: open ? '12px 14px' : '10px',
        marginBottom: 12, overflow: 'hidden',
        display: 'flex', flexDirection: open ? 'column' : 'row',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <AnimatePresence>
          {open && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ fontSize: 11, color: GMID, fontWeight: 700, marginBottom: 6 }}>
              CANTEEN STATUS
            </motion.div>
          )}
        </AnimatePresence>
        <div style={{ display: 'flex', alignItems: 'center', gap: open ? 6 : 0 }}>
          {isWorkingDay
            ? <Wifi size={13} color="#4ade80" />
            : <WifiOff size={13} color="#f87171" />}
          <AnimatePresence>
            {open && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ fontSize: 13, color: '#fff', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {isWorkingDay ? 'Open · Serving Now' : 'Closed Today'}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* logout */}
      <motion.button onClick={onLogout}
        whileHover={{ x: open ? 4 : 0, scale: open ? 1 : 1.1 }}
        whileTap={{ scale: 0.95 }}
        title={!open ? 'Logout' : ''}
        style={{
          display: 'flex', alignItems: 'center',
          gap: open ? 10 : 0,
          justifyContent: open ? 'flex-start' : 'center',
          padding: open ? '11px 14px' : '11px',
          borderRadius: 14, border: 'none',
          cursor: 'pointer', fontSize: 14, fontWeight: 700,
          background: 'rgba(239,68,68,0.12)', color: '#fca5a5',
          whiteSpace: 'nowrap', overflow: 'hidden',
        }}>
        <LogOut size={16} style={{ flexShrink: 0 }} />
        <AnimatePresence>
          {open && (
            <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
              Logout
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </motion.aside>
  )
}
