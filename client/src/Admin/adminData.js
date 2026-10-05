/* ── Theme ───────────────────────────────────────────────────── */
export const G      = '#16a34a'
export const GDARK  = '#14532d'
export const GLIGHT = '#dcfce7'
export const GMID   = '#86efac'
export const GMUTE  = '#4b7c5e'

/* ── Food image public paths (served from /public/food_images) ── */
export const IMG = {
  biryani        : '/food_images/Biriyani.jpeg',
  chapati        : '/food_images/Chapathi.jpeg',
  chickenNoodles : '/food_images/chicken noodles.jpeg',
  chickenRice    : '/food_images/Chicken RIce.jpeg',
  fullMeals      : '/food_images/Full Meals.jpeg',
  parotta        : '/food_images/parotta.jpeg',
  vegNoodles     : '/food_images/veg noodles.jpeg',
  vegRice        : '/food_images/Veg RIce.jpeg',
}

/* ── Framer variants ─────────────────────────────────────────── */
export const fadeUp  = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } } }
export const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } }

/* ── Meal slots ──────────────────────────────────────────────── */
export const MEAL_SLOTS = [
  { id: 'breakfast', label: 'Breakfast', start: '07:00', end: '10:00', color: GDARK, bg: GLIGHT, border: GMID },
  { id: 'lunch',     label: 'Lunch',     start: '11:00', end: '14:30', color: GDARK, bg: GLIGHT, border: GMID },
  { id: 'dinner',    label: 'Dinner',    start: '17:00', end: '20:00', color: GDARK, bg: GLIGHT, border: GMID },
]

/* ── Working days ────────────────────────────────────────────── */
export const ALL_DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

/* ── Default menu per slot ───────────────────────────────────── */
export const DEFAULT_MENU = {
  breakfast: [
    { id: 'b1', name: 'Full Meals',   price: 60, qty: 60, active: true,  img: IMG.fullMeals  },
    { id: 'b2', name: 'Chapati',      price: 25, qty: 50, active: true,  img: IMG.chapati    },
    { id: 'b3', name: 'Veg Noodles',  price: 45, qty: 40, active: false, img: IMG.vegNoodles },
    { id: 'b4', name: 'Veg Rice',     price: 40, qty: 30, active: true,  img: IMG.vegRice    },
  ],
  lunch: [
    { id: 'l1', name: 'Full Meals',      price: 60, qty: 50, active: true, img: IMG.fullMeals   },
    { id: 'l2', name: 'Chicken Biryani', price: 90, qty: 30, active: true, img: IMG.biryani     },
    { id: 'l3', name: 'Chapati',         price: 25, qty: 80, active: true, img: IMG.chapati     },
    { id: 'l4', name: 'Chicken Rice',    price: 55, qty: 20, active: true, img: IMG.chickenRice },
  ],
  dinner: [
    { id: 'd1', name: 'Parotta',         price: 40, qty: 60, active: true, img: IMG.parotta        },
    { id: 'd2', name: 'Chicken Noodles', price: 60, qty: 40, active: true, img: IMG.chickenNoodles },
    { id: 'd3', name: 'Veg Rice',        price: 40, qty: 50, active: true, img: IMG.vegRice        },
  ],
}

/* ── Sample orders ───────────────────────────────────────────── */
export const SAMPLE_ORDERS = [
  { token: 'T001', slot: 'breakfast', items: 'Full Meals x1',        total: 60,  status: 'Served',  time: '08:10 AM' },
  { token: 'T002', slot: 'lunch',     items: 'Chicken Biryani x1',   total: 90,  status: 'Pending', time: '12:07 PM' },
  { token: 'T003', slot: 'lunch',     items: 'Full Meals x1',        total: 60,  status: 'Pending', time: '12:09 PM' },
  { token: 'T004', slot: 'dinner',    items: 'Parotta x1',           total: 40,  status: 'Served',  time: '06:30 PM' },
  { token: 'T005', slot: 'lunch',     items: 'Chapati x2',           total: 50,  status: 'Pending', time: '12:14 PM' },
]

/* ── Helpers ─────────────────────────────────────────────────── */
export function getNow() {
  return new Date()
}

export function formatDate(d) {
  return d.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

export function formatTime(d) {
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

export function isSlotActive(slot) {
  const now = new Date()
  const [sh, sm] = slot.start.split(':').map(Number)
  const [eh, em] = slot.end.split(':').map(Number)
  const start = new Date(); start.setHours(sh, sm, 0)
  const end   = new Date(); end.setHours(eh, em, 0)
  return now >= start && now <= end
}
