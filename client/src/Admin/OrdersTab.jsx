import { useState } from 'react'
import { motion } from 'framer-motion'
import { ClipboardList, Clock } from 'lucide-react'
import { G, GDARK, GLIGHT, GMID, GMUTE, stagger, fadeUp, MEAL_SLOTS } from './adminData'

export default function OrdersTab({ orders, onServe }) {
  const [filter, setFilter] = useState('all')

  const serve = (token) => onServe(token)
  const filtered = filter === 'all' ? orders : orders.filter(o => o.slot === filter)
  const slotMeta = id => MEAL_SLOTS.find(s => s.id === id) || { color: GMUTE, label: id, bg: GLIGHT, border: GMID }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <ClipboardList size={26} color={G} />
        <h2 style={{ fontWeight: 900, fontSize: 24, color: GDARK, margin: 0 }}>Live Orders</h2>
      </div>

      {/* slot filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[{ id: 'all', label: 'All' }, ...MEAL_SLOTS].map(s => (
          <button key={s.id} onClick={() => setFilter(s.id)}
            style={{
              padding: '7px 18px', borderRadius: 50, cursor: 'pointer',
              border: `1.5px solid ${filter === s.id ? G : '#e5e7eb'}`,
              background: filter === s.id ? GLIGHT : '#fff',
              color: filter === s.id ? GDARK : GMUTE,
              fontWeight: 700, fontSize: 12,
            }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* orders list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.map(order => {
          const slot = slotMeta(order.slot)
          return (
            <motion.div key={order.token} variants={fadeUp} layout
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: '#fff', borderRadius: 18, padding: '0',
                border: `1.5px solid ${GMID}`,
                boxShadow: '0 2px 12px rgba(22,163,74,0.07)',
                overflow: 'hidden',
              }}>
              {/* left accent */}
              <div style={{ width: 5, alignSelf: 'stretch', background: G, flexShrink: 0 }} />

              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  {/* token badge */}
                  <div style={{
                    width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                    background: GLIGHT, border: `2px dashed ${G}`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: GMUTE, letterSpacing: 1 }}>TOKEN</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: G, lineHeight: 1 }}>{order.token}</div>
                  </div>

                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: GLIGHT, color: GDARK, display: 'inline-block', marginBottom: 4 }}>
                      {slot.label}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: GDARK }}>{order.items}</div>
                    <div style={{ fontSize: 12, color: GMUTE, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={11} /> {order.time}
                    </div>
                    <div style={{ fontSize: 13, color: G, fontWeight: 800, marginTop: 2 }}>₹{order.total}</div>
                  </div>
                </div>

                {/* action */}
                <div>
                  {order.status === 'Pending' && (
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={() => serve(order.token)}
                      style={{
                        padding: '9px 20px', borderRadius: 50, border: 'none',
                        background: `linear-gradient(135deg, ${G}, #15803d)`,
                        color: '#fff', fontWeight: 800, fontSize: 12, cursor: 'pointer',
                        boxShadow: '0 3px 10px #16a34a30',
                      }}>
                      Done
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: GMUTE, fontSize: 14 }}>No orders found.</div>
        )}
      </div>
    </motion.div>
  )
}
