import { motion } from 'framer-motion'
import { ShoppingBag, UtensilsCrossed, IndianRupee, Clock, Trophy, BarChart3 } from 'lucide-react'
import { G, GDARK, GLIGHT, GMID, GMUTE, stagger, fadeUp } from './adminData'
import { safeImgUrl } from '../api'

const topItems = [
  { name: 'Full Meals',      orders: 10, img: '/food_images/Full Meals.jpeg'  },
  { name: 'Chicken Biryani', orders: 7,  img: '/food_images/Biriyani.jpeg'    },
  { name: 'Parotta',         orders: 5,  img: '/food_images/parotta.jpeg'     },
]

export default function DashboardTab({ orders, menu }) {
  const totalOrders   = orders.length
  const totalItems    = Object.values(menu).flat().length
  const revenue       = orders.reduce((s, o) => s + o.total, 0)
  const pendingTokens = orders.filter(o => o.status === 'Pending').length

  const cards = [
    { label: 'Total Orders',   value: totalOrders,   icon: ShoppingBag     },
    { label: 'Menu Items',     value: totalItems,    icon: UtensilsCrossed },
    { label: 'Revenue Today',  value: `₹${revenue}`, icon: IndianRupee     },
    { label: 'Pending Tokens', value: pendingTokens, icon: Clock           },
  ]

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <BarChart3 size={26} color={G} />
        <h2 style={{ fontWeight: 900, fontSize: 24, color: GDARK, margin: 0 }}>Dashboard</h2>
      </div>

      {/* stat cards — uniform style with left accent bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        {cards.map(({ label, value, icon: Icon }) => (
          <motion.div key={label} variants={fadeUp} whileHover={{ y: -4 }}
            style={{
              background: '#fff',
              borderRadius: 16,
              padding: '0',
              border: `1.5px solid ${GMID}`,
              boxShadow: '0 4px 20px rgba(22,163,74,0.08)',
              overflow: 'hidden',
              display: 'flex',
            }}>
            {/* left accent bar */}
            <div style={{ width: 5, background: `linear-gradient(180deg, ${G}, ${GMID})`, flexShrink: 0 }} />
            {/* content */}
            <div style={{ flex: 1, padding: '18px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
              {/* icon box */}
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: GLIGHT,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={22} color={G} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: GMUTE, fontWeight: 600, marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: GDARK, lineHeight: 1 }}>{value}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* top selling */}
      <motion.div variants={fadeUp}
        style={{ background: '#fff', borderRadius: 20, padding: '20px 22px', border: `1.5px solid ${GMID}`, boxShadow: '0 4px 20px rgba(22,163,74,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Trophy size={20} color="#fbbf24" />
          <h3 style={{ fontWeight: 800, fontSize: 16, color: GDARK, margin: 0 }}>Top Selling Today</h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {topItems.map(({ name, orders: cnt, img }, i) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontWeight: 900, fontSize: 15, color: ['#fbbf24','#9ca3af','#cd7c2f'][i], minWidth: 20 }}>#{i + 1}</span>
              <img src={safeImgUrl(img)} alt={name} style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: GDARK }}>{name}</div>
                <div style={{ height: 6, background: GLIGHT, borderRadius: 99, marginTop: 4, overflow: 'hidden' }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(cnt / 10) * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    style={{ height: '100%', background: G, borderRadius: 99 }} />
                </div>
              </div>
              <span style={{ fontWeight: 800, fontSize: 13, color: G }}>{cnt} orders</span>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
