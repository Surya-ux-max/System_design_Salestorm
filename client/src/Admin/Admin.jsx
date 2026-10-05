import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import Sidebar from './Sidebar'
import DashboardTab from './DashboardTab'
import MenuTab from './MenuTab'
import OrdersTab from './OrdersTab'
import WorkingDayPanel from './WorkingDayPanel'
import { MEAL_SLOTS, getNow, G, GDARK, GMID } from './adminData'
import { api } from '../api'

function defaultSlotStatus() {
  const status = {}
  MEAL_SLOTS.forEach((s) => {
    status[s.id] = true
  })
  return status
}

const emptyMenu = () => ({
  breakfast: [],
  lunch: [],
  dinner: [],
})

export default function Admin() {
  const [tab, setTab] = useState('dashboard')
  const [menu, setMenu] = useState(emptyMenu)
  const [slotStatus, setSlotStatus] = useState(defaultSlotStatus)
  const [orders, setOrders] = useState([])
  const [workingDays, setWorkingDays] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState(null)

  const loadAll = useCallback(async () => {
    setLoadError(null)
    try {
      const [menuData, settingsData, ordersData] = await Promise.all([
        api.getMenu(),
        api.getSettings(),
        api.getOrders(),
      ])
      setMenu({
        breakfast: menuData.breakfast || [],
        lunch: menuData.lunch || [],
        dinner: menuData.dinner || [],
      })
      setSlotStatus({
        breakfast: settingsData.slotOpen?.breakfast !== false,
        lunch: settingsData.slotOpen?.lunch !== false,
        dinner: settingsData.slotOpen?.dinner !== false,
      })
      setWorkingDays(settingsData.workingDays || [])
      setOrders(ordersData || [])
    } catch (e) {
      setLoadError(e.message || 'Failed to load')
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const onToggleDay = async (day) => {
    const next = workingDays.includes(day) ? workingDays.filter((d) => d !== day) : [...workingDays, day]
    await api.patchSettings({ workingDays: next })
    setWorkingDays(next)
  }

  const onToggleSlot = async (slotId) => {
    const next = { ...slotStatus, [slotId]: !slotStatus[slotId] }
    await api.patchSettings({ slotOpen: next })
    setSlotStatus(next)
  }

  const onToggleItem = async (slotId, itemId) => {
    const item = menu[slotId]?.find((i) => String(i.id) === String(itemId))
    if (!item) return
    await api.updateMenuItem(itemId, { active: !item.active })
    setMenu((prev) => ({
      ...prev,
      [slotId]: prev[slotId].map((i) =>
        String(i.id) === String(itemId) ? { ...i, active: !i.active } : i
      ),
    }))
  }

  const onRemove = async (slotId, itemId) => {
    await api.deleteMenuItem(itemId)
    setMenu((prev) => ({
      ...prev,
      [slotId]: prev[slotId].filter((i) => String(i.id) !== String(itemId)),
    }))
  }

  const onAddItem = async (slotId, item) => {
    const created = await api.createMenuItem({
      slot: slotId,
      name: item.name,
      price: item.price,
      qty: item.qty,
      active: item.active !== false,
      img: item.img || '',
    })
    setMenu((prev) => ({
      ...prev,
      [slotId]: [...prev[slotId], created],
    }))
  }

  const onServe = async (token) => {
    await api.patchOrder(token, { status: 'Served' })
    setOrders((prev) => prev.map((o) => (o.token === token ? { ...o, status: 'Served' } : o)))
  }

  const onCancelOrder = async (token) => {
    if (!window.confirm(`Cancel order ${token}? Any reserved or sold items will be returned to canteen stock.`)) return
    try {
      await api.cancelOrder(token, { reason: 'Staff cancelled order' })
      setOrders((prev) => prev.map((o) => (o.token === token ? { ...o, status: 'CANCELLED' } : o)))
    } catch (e) {
      window.alert(e.message || 'Could not cancel order')
    }
  }

  const today = getNow().toLocaleDateString('en-IN', { weekday: 'long' })
  const isWorkingDay = workingDays.includes(today)

  const renderTab = () => {
    switch (tab) {
      case 'dashboard':
        return <DashboardTab orders={orders} menu={menu} />
      case 'menu':
        return (
          <>
            <WorkingDayPanel workingDays={workingDays} onToggleDay={onToggleDay} />
            <MenuTab
              menu={menu}
              slotStatus={slotStatus}
              onToggleSlot={onToggleSlot}
              onToggleItem={onToggleItem}
              onRemove={onRemove}
              onAddItem={onAddItem}
            />
          </>
        )
      case 'orders':
        return <OrdersTab orders={orders} onServe={onServe} onCancel={onCancelOrder} />
      default:
        return null
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: '#f0fdf4',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        overflowX: 'hidden',
      }}
    >
      <Sidebar
        active={tab}
        setActive={setTab}
        onLogout={() => {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          window.location.href = '/'
        }}
        isWorkingDay={isWorkingDay}
        open={sidebarOpen}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '14px 28px',
            background: '#fff',
            borderBottom: `1px solid ${GMID}`,
            position: 'sticky',
            top: 0,
            zIndex: 30,
          }}
        >
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => setSidebarOpen((p) => !p)}
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              border: `1.5px solid ${GMID}`,
              background: sidebarOpen ? GDARK : '#fff',
              color: sidebarOpen ? '#fff' : GDARK,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </motion.button>

          <span style={{ fontWeight: 800, fontSize: 16, color: GDARK, textTransform: 'capitalize' }}>{tab}</span>
        </div>

        <main style={{ flex: 1, padding: '32px 36px', overflowY: 'auto' }}>
          {!ready && <p style={{ color: GDARK }}>Loading…</p>}
          {loadError && <p style={{ color: '#dc2626' }}>{loadError}</p>}
          {ready && !loadError && renderTab()}
        </main>
      </div>
    </div>
  )
}
