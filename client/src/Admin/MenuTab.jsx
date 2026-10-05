import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  UtensilsCrossed, Plus, ToggleLeft, ToggleRight,
  Trash2, CheckCircle, Clock, Package, PowerOff, Power, X, ImagePlus,
} from 'lucide-react'
import { G, GDARK, GLIGHT, GMID, GMUTE, stagger, fadeUp, MEAL_SLOTS, isSlotActive } from './adminData'
import { safeImgUrl } from '../api'

/* ── Add Item Modal ──────────────────────────────────────────── */
function AddItemModal({ slotId, onAdd, onClose }) {
  const [form,    setForm]    = useState({ name: '', price: '', qty: '' })
  const [imgSrc,  setImgSrc]  = useState('')
  const [preview, setPreview] = useState('')
  const [loading, setLoading] = useState(false)
  const fileRef = useRef(null)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setImgSrc(ev.target.result)
      setPreview(ev.target.result)
    }
    reader.readAsDataURL(file)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.price || !form.qty) return
    setLoading(true)
    try {
      await onAdd(slotId, {
        name:   form.name,
        price:  Number(form.price),
        qty:    Number(form.qty),
        active: true,
        img:    imgSrc || '/food_images/Full Meals.jpeg',
      })
      onClose()
    } catch (err) {
      window.alert(err.message || 'Could not add item')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        style={{ background: '#fff', borderRadius: 20, padding: '28px', width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontWeight: 800, fontSize: 18, color: GDARK, margin: 0 }}>Add Menu Item</h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: GMUTE }}><X size={20} /></button>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* image upload */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: GMUTE, display: 'block', marginBottom: 6 }}>Food Image</label>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                width: '100%', height: 140, borderRadius: 12,
                border: `2px dashed ${preview ? G : GMID}`,
                background: preview ? 'transparent' : GLIGHT,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', overflow: 'hidden', position: 'relative',
              }}>
              {preview ? (
                <>
                  <img src={preview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.35)'; e.currentTarget.firstChild.style.opacity = 1 }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0)';    e.currentTarget.firstChild.style.opacity = 0 }}>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: 13, opacity: 0, transition: 'opacity 0.2s' }}>Change Image</span>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', color: GMUTE }}>
                  <ImagePlus size={28} style={{ marginBottom: 6 }} />
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Click to upload image</div>
                  <div style={{ fontSize: 11, marginTop: 2 }}>JPG, PNG, WEBP</div>
                </div>
              )}
            </div>
          </div>

          {/* text fields */}
          {[
            { label: 'Item Name', key: 'name',  type: 'text',   placeholder: 'e.g. Masala Dosa' },
            { label: 'Price (₹)', key: 'price', type: 'number', placeholder: 'e.g. 30'          },
            { label: 'Quantity',  key: 'qty',   type: 'number', placeholder: 'e.g. 50'          },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label style={{ fontSize: 12, fontWeight: 700, color: GMUTE, display: 'block', marginBottom: 4 }}>{label}</label>
              <input
                type={type} placeholder={placeholder} value={form[key]}
                onChange={e => set(key, e.target.value)}
                required
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${GMID}`, fontSize: 14, outline: 'none', boxSizing: 'border-box', color: GDARK }}
                onFocus={e => e.target.style.borderColor = G}
                onBlur={e  => e.target.style.borderColor = GMID}
              />
            </div>
          ))}

          <motion.button type="submit" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            disabled={loading}
            style={{ marginTop: 4, padding: '12px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${G}, #15803d)`, color: '#fff', fontWeight: 800, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Adding…' : 'Add Item'}
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  )
}

/* ── Slot Section ────────────────────────────────────────────── */
function SlotSection({ slot, items, slotOpen, onToggleSlot, onToggleItem, onRemove, onAddItem }) {
  const [showModal, setShowModal] = useState(false)
  const autoActive = isSlotActive(slot)

  return (
    <motion.div variants={fadeUp}
      style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', border: `2px solid ${slotOpen ? slot.border : '#e5e7eb'}`, marginBottom: 24, boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>

      {/* slot header */}
      <div style={{ padding: '16px 20px', background: slotOpen ? slot.bg : '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <UtensilsCrossed size={20} color={slotOpen ? slot.color : '#9ca3af'} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: slotOpen ? slot.color : '#9ca3af' }}>{slot.label}</div>
            <div style={{ fontSize: 12, color: GMUTE, marginTop: 1 }}>
              <Clock size={11} style={{ display: 'inline', marginRight: 4 }} />
              {slot.start} – {slot.end}
              {autoActive && (
                <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: '#dcfce7', color: G }}>
                  ACTIVE NOW
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <motion.button type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => setShowModal(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 50, border: 'none', background: slotOpen ? slot.color : '#e5e7eb', color: slotOpen ? '#fff' : '#9ca3af', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
            <Plus size={13} /> Add
          </motion.button>

          <motion.button type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => onToggleSlot(slot.id)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 50, border: 'none', cursor: 'pointer', background: slotOpen ? '#fee2e2' : GLIGHT, color: slotOpen ? '#dc2626' : G, fontWeight: 700, fontSize: 12 }}>
            {slotOpen ? <><PowerOff size={13} /> Shut Down</> : <><Power size={13} /> Open</>}
          </motion.button>
        </div>
      </div>

      {/* items grid */}
      <AnimatePresence>
        {slotOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
              {items.map(item => (
                <motion.div key={item.id} layout
                  style={{ background: '#f9fafb', borderRadius: 14, overflow: 'hidden', border: `1.5px solid ${item.active ? slot.border : '#fecaca'}`, opacity: item.active ? 1 : 0.7 }}>
                  <div style={{ position: 'relative', height: 100 }}>
                    <img src={safeImgUrl(item.img)} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: item.active ? 'none' : 'grayscale(60%)' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.35), transparent)' }} />
                    <span style={{ position: 'absolute', top: 8, right: 8, fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 50, background: item.active ? '#dcfce7' : '#fee2e2', color: item.active ? G : '#dc2626', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      {item.active ? <><CheckCircle size={9} /> Active</> : <><Clock size={9} /> Off</>}
                    </span>
                  </div>
                  <div style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: GDARK }}>{item.name}</span>
                      <span style={{ fontWeight: 900, fontSize: 14, color: slot.color }}>₹{item.price}</span>
                    </div>
                    <div style={{ fontSize: 11, color: GMUTE, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Package size={11} /> {item.qty} left
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button type="button" onClick={() => onToggleItem(slot.id, item.id)}
                        style={{ flex: 1, padding: '6px', borderRadius: 8, border: 'none', background: item.active ? '#fee2e2' : GLIGHT, color: item.active ? '#dc2626' : G, fontWeight: 700, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                        {item.active ? <><ToggleRight size={13} /> Off</> : <><ToggleLeft size={13} /> On</>}
                      </button>
                      <button type="button" onClick={() => onRemove(slot.id, item.id)}
                        style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: '#fee2e2', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
              {items.length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '24px', color: GMUTE, fontSize: 14 }}>
                  No items yet. Click Add to create one.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!slotOpen && (
        <div style={{ padding: '14px 20px', textAlign: 'center', fontSize: 13, color: '#9ca3af', fontWeight: 600 }}>
          <PowerOff size={14} style={{ display: 'inline', marginRight: 6 }} />
          This meal slot is shut down. Students cannot order from this slot.
        </div>
      )}

      <AnimatePresence>
        {showModal && <AddItemModal slotId={slot.id} onAdd={onAddItem} onClose={() => setShowModal(false)} />}
      </AnimatePresence>
    </motion.div>
  )
}

/* ── MenuTab root ────────────────────────────────────────────── */
export default function MenuTab({ menu, slotStatus, onToggleSlot, onToggleItem, onRemove, onAddItem }) {
  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <UtensilsCrossed size={26} color={G} />
        <h2 style={{ fontWeight: 900, fontSize: 24, color: GDARK, margin: 0 }}>Menu Management</h2>
      </div>

      {MEAL_SLOTS.map(slot => (
        <SlotSection
          key={slot.id}
          slot={slot}
          items={menu[slot.id] || []}
          slotOpen={slotStatus[slot.id]}
          onToggleSlot={onToggleSlot}
          onToggleItem={onToggleItem}
          onRemove={onRemove}
          onAddItem={onAddItem}
        />
      ))}
    </motion.div>
  )
}
