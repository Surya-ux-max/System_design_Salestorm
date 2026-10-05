import { motion } from 'framer-motion'
import { CalendarDays, CheckCircle, XCircle } from 'lucide-react'
import { G, GDARK, GLIGHT, GMID, GMUTE, ALL_DAYS, formatDate, getNow } from './adminData'

export default function WorkingDayPanel({ workingDays, onToggleDay }) {
  const today     = getNow().toLocaleDateString('en-IN', { weekday: 'long' })
  const isToday   = (day) => day === today
  const isWorking = (day) => workingDays.includes(day)

  const toggle = (day) => onToggleDay(day)

  const todayWorking = isWorking(today)

  return (
    <div style={{ background: '#fff', borderRadius: 20, padding: '20px 24px', border: `2px solid ${GMID}`, marginBottom: 28, boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <CalendarDays size={22} color={G} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: GDARK }}>Working Days</div>
            <div style={{ fontSize: 12, color: GMUTE }}>{formatDate(getNow())}</div>
          </div>
        </div>
        {/* today status badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 14px', borderRadius: 50,
          background: todayWorking ? GLIGHT : '#fee2e2',
          color: todayWorking ? G : '#dc2626',
          fontWeight: 700, fontSize: 12,
          border: `1.5px solid ${todayWorking ? GMID : '#fecaca'}`,
        }}>
          {todayWorking ? <CheckCircle size={13} /> : <XCircle size={13} />}
          Today is {todayWorking ? 'a Working Day' : 'a Holiday'}
        </div>
      </div>

      {/* day toggles */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {ALL_DAYS.map(day => {
          const working = isWorking(day)
          const current = isToday(day)
          return (
            <motion.button key={day} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => toggle(day)}
              style={{
                padding: '8px 16px', borderRadius: 50, border: `2px solid ${working ? G : '#e5e7eb'}`,
                background: working ? GLIGHT : '#f9fafb',
                color: working ? GDARK : '#9ca3af',
                fontWeight: 700, fontSize: 13, cursor: 'pointer',
                outline: current ? `3px solid ${G}` : 'none',
                outlineOffset: 2,
                position: 'relative',
              }}>
              {day.slice(0, 3)}
              {current && (
                <span style={{ position: 'absolute', top: -4, right: -4, width: 10, height: 10, borderRadius: '50%', background: G, border: '2px solid #fff' }} />
              )}
            </motion.button>
          )
        })}
      </div>
      <div style={{ fontSize: 11, color: GMUTE, marginTop: 10 }}>
        Green dot = today · Outlined = selected as working day
      </div>
    </div>
  )
}
