import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

/* ── User ────────────────────────────────────────────────────── */
const userSchema = new mongoose.Schema(
  {
    name:         { type: String, required: true, trim: true },
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role:         { type: String, enum: ['admin', 'staff'], required: true },
    phone:        { type: String, default: '' },
    active:       { type: Boolean, default: true },
    lastLogin:    { type: Date, default: null },
    loginCount:   { type: Number, default: 0 },
  },
  { timestamps: true }
)

/* instance method — compare plain password */
userSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash)
}

/* static — hash + create */
userSchema.statics.createWithPassword = async function (data) {
  const salt = await bcrypt.genSalt(10)
  const passwordHash = await bcrypt.hash(data.password, salt)
  return this.create({ ...data, passwordHash })
}

/* never send passwordHash to client */
userSchema.methods.toClient = function () {
  const o = this.toObject()
  delete o.passwordHash
  return o
}

/* ── MenuItem ────────────────────────────────────────────────── */
const menuItemSchema = new mongoose.Schema(
  {
    slot:      { type: String, enum: ['breakfast', 'lunch', 'dinner'], required: true },
    name:      { type: String, required: true, trim: true },
    price:     { type: Number, required: true, min: 0 },
    qty:       { type: Number, required: true, min: 0, default: 0 },
    active:    { type: Boolean, default: true },
    img:       { type: String, default: '' },
    tag:       { type: String, default: null },
    tagColor:  { type: String, default: '' },
    desc:      { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
)

/* ── OrderLine ───────────────────────────────────────────────── */
const orderLineSchema = new mongoose.Schema({
  itemId:    { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
  name:      { type: String },
  qty:       { type: Number },
  unitPrice: { type: Number },
  lineTotal: { type: Number },
})

/* ── Payment ────────────────────────────────────────────────── */
const paymentSchema = new mongoose.Schema(
  {
    order:        { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    token:        { type: String, required: true },          // order token e.g. T001
    amount:       { type: Number, required: true, min: 0 },
    method:       { type: String, enum: ['UPI', 'Cash', 'Other'], default: 'UPI' },
    status:       { type: String, enum: ['Initiated', 'Paid', 'Failed'], default: 'Initiated' },
    upiId:        { type: String, default: '' },             // merchant UPI id
    payerUpiId:   { type: String, default: '' },             // payer UPI id (future)
    txnRef:       { type: String, default: '' },             // UPI transaction reference (future)
    paidAt:       { type: Date,   default: null },
    failReason:   { type: String, default: '' },
  },
  { timestamps: true }
)

/* ── Order ───────────────────────────────────────────────────── */
const orderSchema = new mongoose.Schema(
  {
    token:      { type: String, unique: true, required: true },
    slot:       { type: String, enum: ['breakfast', 'lunch', 'dinner'], required: true },
    items:      { type: String, required: true },          // summary string
    lines:      [orderLineSchema],                          // itemised lines
    total:      { type: Number, required: true, min: 0 },
    status:     { type: String, enum: ['Pending', 'Served'], default: 'Pending' },
    servedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    servedAt:   { type: Date, default: null },
    paymentRef: { type: String, default: '' },             // UPI txn ref (future)
    upiId:      { type: String, default: '' },             // payer UPI id (future)
    payment:    { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
    paymentStatus: { type: String, enum: ['Unpaid', 'Paid', 'Failed'], default: 'Unpaid' },
  },
  { timestamps: true }
)

/* ── Token Counter ───────────────────────────────────────────── */
const counterSchema = new mongoose.Schema({
  _id: { type: String, default: 'global' },
  seq: { type: Number, default: 0 },
})

/* ── Settings ────────────────────────────────────────────────── */
const settingsSchema = new mongoose.Schema({
  _id:         { type: String, default: 'global' },
  workingDays: { type: [String], default: ['Monday','Tuesday','Wednesday','Thursday','Friday'] },
  slotOpen: {
    breakfast: { type: Boolean, default: true },
    lunch:     { type: Boolean, default: true },
    dinner:    { type: Boolean, default: true },
  },
  canteenName:  { type: String, default: 'SECE Canteen' },
  upiId:        { type: String, default: 'surprakas14@okaxis' },
  openMessage:  { type: String, default: 'Open · Serving Now' },
  closeMessage: { type: String, default: 'Closed Today' },
})

/* ── Audit Log ───────────────────────────────────────────────── */
const auditLogSchema = new mongoose.Schema(
  {
    user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    role:    { type: String, default: '' },
    action:  { type: String, required: true },   // e.g. 'LOGIN', 'ADD_ITEM', 'SERVE_ORDER'
    detail:  { type: String, default: '' },
    ip:      { type: String, default: '' },
  },
  { timestamps: true }
)

/* ── Exports ─────────────────────────────────────────────────── */
export const User     = mongoose.model('User',     userSchema)
export const MenuItem = mongoose.model('MenuItem', menuItemSchema)
export const Order    = mongoose.model('Order',    orderSchema)
export const Payment  = mongoose.model('Payment',  paymentSchema)
export const Counter  = mongoose.model('Counter',  counterSchema)
export const Settings = mongoose.model('Settings', settingsSchema)
export const AuditLog = mongoose.model('AuditLog', auditLogSchema)

export async function connectDB(uri) {
  mongoose.set('strictQuery', true)
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8000,
    family: 4,
  })
  console.log('✅ MongoDB connected')
}
