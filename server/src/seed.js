import { MenuItem, Settings, User } from './db.js'

const BASE = '/food_images'

const IMG = {
  biryani        : `${BASE}/Biriyani.jpeg`,
  chapati        : `${BASE}/Chapathi.jpeg`,
  chickenNoodles : `${BASE}/chicken noodles.jpeg`,
  chickenRice    : `${BASE}/Chicken RIce.jpeg`,
  fullMeals      : `${BASE}/Full Meals.jpeg`,
  parotta        : `${BASE}/parotta.jpeg`,
  vegNoodles     : `${BASE}/veg noodles.jpeg`,
  vegRice        : `${BASE}/Veg RIce.jpeg`,
}

const MENU_ITEMS = [
  { slot: 'breakfast', name: 'Full Meals',      price: 60, qty: 60, active: true,  img: IMG.fullMeals,      desc: 'Rice, sambar, rasam, 3 curries & papad', tag: 'Best Seller', tagColor: '#fbbf24' },
  { slot: 'breakfast', name: 'Chapati',         price: 25, qty: 80, active: true,  img: IMG.chapati,        desc: 'Soft wheat chapatis with curry',          tag: null,          tagColor: '' },
  { slot: 'breakfast', name: 'Veg Noodles',     price: 45, qty: 40, active: true,  img: IMG.vegNoodles,     desc: 'Stir-fried noodles with fresh veggies',   tag: null,          tagColor: '' },
  { slot: 'breakfast', name: 'Veg Rice',        price: 40, qty: 50, active: true,  img: IMG.vegRice,        desc: 'Flavourful vegetable fried rice',          tag: null,          tagColor: '' },
  { slot: 'lunch',     name: 'Full Meals',      price: 60, qty: 50, active: true,  img: IMG.fullMeals,      desc: 'Rice, sambar, rasam, 3 curries & papad', tag: 'Best Seller', tagColor: '#fbbf24' },
  { slot: 'lunch',     name: 'Chicken Biryani', price: 90, qty: 30, active: true,  img: IMG.biryani,        desc: 'Fragrant basmati with tender chicken',    tag: 'Spicy',       tagColor: '#ef4444' },
  { slot: 'lunch',     name: 'Chapati',         price: 25, qty: 80, active: true,  img: IMG.chapati,        desc: 'Soft wheat chapatis with curry',          tag: null,          tagColor: '' },
  { slot: 'lunch',     name: 'Chicken Rice',    price: 55, qty: 40, active: true,  img: IMG.chickenRice,    desc: 'Wok-tossed chicken fried rice',           tag: 'Fresh',       tagColor: '#f59e0b' },
  { slot: 'lunch',     name: 'Veg Rice',        price: 40, qty: 50, active: true,  img: IMG.vegRice,        desc: 'Flavourful vegetable fried rice',          tag: null,          tagColor: '' },
  { slot: 'dinner',    name: 'Parotta',         price: 40, qty: 60, active: true,  img: IMG.parotta,        desc: 'Flaky parotta with spicy salna',          tag: 'Popular',     tagColor: '#ea580c' },
  { slot: 'dinner',    name: 'Chicken Noodles', price: 60, qty: 40, active: true,  img: IMG.chickenNoodles, desc: 'Stir-fried noodles with chicken',         tag: 'Hot Pick',    tagColor: '#a855f7' },
  { slot: 'dinner',    name: 'Veg Noodles',     price: 45, qty: 50, active: true,  img: IMG.vegNoodles,     desc: 'Stir-fried noodles with fresh veggies',   tag: null,          tagColor: '' },
  { slot: 'dinner',    name: 'Chicken Rice',    price: 55, qty: 35, active: true,  img: IMG.chickenRice,    desc: 'Wok-tossed chicken fried rice',           tag: null,          tagColor: '' },
  { slot: 'dinner',    name: 'Chapati',         price: 25, qty: 60, active: true,  img: IMG.chapati,        desc: 'Soft wheat chapatis with curry',          tag: null,          tagColor: '' },
]

const DEFAULT_USERS = [
  {
    name:     'Canteen Admin',
    email:    'admin@sece.ac.in',
    password: 'admin@123',
    role:     'admin',
    phone:    '9000000001',
  },
  {
    name:     'Counter Staff 1',
    email:    'staff1@sece.ac.in',
    password: 'staff@123',
    role:     'staff',
    phone:    '9000000002',
  },
  {
    name:     'Counter Staff 2',
    email:    'staff2@sece.ac.in',
    password: 'staff@123',
    role:     'staff',
    phone:    '9000000003',
  },
]

export async function seedIfEmpty() {
  /* menu */
  const menuCount = await MenuItem.countDocuments()
  if (menuCount === 0) {
    await MenuItem.insertMany(MENU_ITEMS)
    console.log(`✅ Seeded ${MENU_ITEMS.length} menu items`)
  }

  /* users */
  const userCount = await User.countDocuments()
  if (userCount === 0) {
    for (const u of DEFAULT_USERS) {
      await User.createWithPassword(u)
    }
    console.log(`✅ Seeded ${DEFAULT_USERS.length} users`)
    console.log('   admin@sece.ac.in  / admin@123')
    console.log('   staff1@sece.ac.in / staff@123')
  }

  /* settings */
  await Settings.findOneAndUpdate(
    { _id: 'global' },
    {
      $setOnInsert: {
        workingDays:  ['Monday','Tuesday','Wednesday','Thursday','Friday'],
        slotOpen:     { breakfast: true, lunch: true, dinner: true },
        canteenName:  'SECE Canteen',
        upiId:        'surprakas14@okaxis',
      },
    },
    { upsert: true }
  )
  console.log('✅ Settings initialised')
}

export async function forceSeed() {
  await MenuItem.deleteMany({})
  await MenuItem.insertMany(MENU_ITEMS)
  console.log(`✅ Force-seeded ${MENU_ITEMS.length} menu items`)

  await User.deleteMany({})
  for (const u of DEFAULT_USERS) {
    await User.createWithPassword(u)
  }
  console.log(`✅ Force-seeded ${DEFAULT_USERS.length} users`)
}
