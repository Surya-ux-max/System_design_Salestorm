export const schemaSql = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'staff')),
  phone VARCHAR(50) DEFAULT '',
  active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMPTZ DEFAULT NULL,
  login_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS menu_items (
  id SERIAL PRIMARY KEY,
  slot VARCHAR(50) NOT NULL CHECK (slot IN ('breakfast', 'lunch', 'dinner')),
  name VARCHAR(255) NOT NULL,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  qty INT NOT NULL DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  img TEXT DEFAULT '',
  tag VARCHAR(100) DEFAULT NULL,
  tag_color VARCHAR(50) DEFAULT '',
  description TEXT DEFAULT '',
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  token VARCHAR(50) UNIQUE NOT NULL,
  slot VARCHAR(50) NOT NULL CHECK (slot IN ('breakfast', 'lunch', 'dinner')),
  items TEXT NOT NULL,
  lines JSONB NOT NULL DEFAULT '[]'::jsonb,
  total NUMERIC(10, 2) NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'Pending',
  payment_status VARCHAR(50) NOT NULL DEFAULT 'Unpaid',
  served_by INT REFERENCES users(id) ON DELETE SET NULL,
  served_at TIMESTAMPTZ DEFAULT NULL,
  payment_id INT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  order_id INT REFERENCES orders(id) ON DELETE CASCADE,
  token VARCHAR(50) NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  method VARCHAR(50) DEFAULT 'UPI',
  status VARCHAR(50) DEFAULT 'Initiated',
  upi_id VARCHAR(255) DEFAULT '',
  payer_upi_id VARCHAR(255) DEFAULT '',
  txn_ref VARCHAR(255) DEFAULT '',
  paid_at TIMESTAMPTZ DEFAULT NULL,
  fail_reason TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'global',
  working_days JSONB NOT NULL DEFAULT '["Monday","Tuesday","Wednesday","Thursday","Friday"]'::jsonb,
  slot_open JSONB NOT NULL DEFAULT '{"breakfast": true, "lunch": true, "dinner": true}'::jsonb,
  canteen_name VARCHAR(255) DEFAULT 'SECE Canteen',
  upi_id VARCHAR(255) DEFAULT 'surprakas14@okaxis',
  open_message VARCHAR(255) DEFAULT 'Open · Serving Now',
  close_message VARCHAR(255) DEFAULT 'Closed Today',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS counters (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'global',
  seq INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  role VARCHAR(50) DEFAULT '',
  action VARCHAR(100) NOT NULL,
  detail TEXT DEFAULT '',
  ip VARCHAR(100) DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menu_items_slot_active ON menu_items (slot, active);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_slot ON orders (slot);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments (order_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);
`
