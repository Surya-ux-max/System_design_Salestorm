export const schemaSql = `
-- Existing Core Tables
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
  status VARCHAR(50) NOT NULL DEFAULT 'CONFIRMED',
  payment_status VARCHAR(50) NOT NULL DEFAULT 'Unpaid',
  served_by INT REFERENCES users(id) ON DELETE SET NULL,
  served_at TIMESTAMPTZ DEFAULT NULL,
  payment_id INT DEFAULT NULL,
  reservation_id VARCHAR(64) DEFAULT NULL,
  idempotency_key VARCHAR(255) DEFAULT NULL,
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
  idempotency_key VARCHAR(255) DEFAULT NULL,
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

-- ==============================================================
-- SALESTORM HIGH-CONCURRENCY ARCHITECTURE EXTENSIONS
-- ==============================================================

-- 1. Dedicated Inventory Model
CREATE TABLE IF NOT EXISTS inventory (
  id SERIAL PRIMARY KEY,
  product_id INT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE UNIQUE,
  available_quantity INT NOT NULL CHECK (available_quantity >= 0),
  reserved_quantity INT NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  sold_quantity INT NOT NULL DEFAULT 0 CHECK (sold_quantity >= 0),
  version INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Inventory Reservations
CREATE TABLE IF NOT EXISTS inventory_reservations (
  id SERIAL PRIMARY KEY,
  reservation_id VARCHAR(64) UNIQUE NOT NULL,
  product_id INT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  order_id INT REFERENCES orders(id) ON DELETE SET NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  status VARCHAR(50) NOT NULL CHECK (status IN ('RESERVED', 'PAYMENT_PENDING', 'CONFIRMED', 'RELEASED', 'EXPIRED')),
  idempotency_key VARCHAR(255),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Idempotency Keys Registry
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  request_path VARCHAR(255) NOT NULL,
  request_params JSONB DEFAULT '{}'::jsonb,
  response_code INT,
  response_body JSONB,
  status VARCHAR(50) NOT NULL CHECK (status IN ('STARTED', 'COMPLETED', 'FAILED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Transactional Outbox for Reliable Event-Driven Messaging
CREATE TABLE IF NOT EXISTS outbox_events (
  id SERIAL PRIMARY KEY,
  event_id VARCHAR(64) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PUBLISHED', 'PROCESSED', 'FAILED', 'DEAD_LETTER')),
  retry_count INT NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Itemized Order Lines Relation
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INT REFERENCES menu_items(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  qty INT NOT NULL CHECK (qty > 0),
  unit_price NUMERIC(10, 2) NOT NULL,
  line_total NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safe Column Additions for Backward Compatibility
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'reservation_id') THEN
    ALTER TABLE orders ADD COLUMN reservation_id VARCHAR(64) DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'idempotency_key') THEN
    ALTER TABLE orders ADD COLUMN idempotency_key VARCHAR(255) DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'idempotency_key') THEN
    ALTER TABLE payments ADD COLUMN idempotency_key VARCHAR(255) DEFAULT NULL;
  END IF;
END $$;

-- Indexes for Speed & Lock Minimization
CREATE INDEX IF NOT EXISTS idx_menu_items_slot_active ON menu_items (slot, active);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_slot ON orders (slot);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments (order_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory (product_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status_expires ON inventory_reservations (status, expires_at);
CREATE INDEX IF NOT EXISTS idx_reservations_product_id ON inventory_reservations (product_id);
CREATE INDEX IF NOT EXISTS idx_idempotency_key ON idempotency_keys (key);
CREATE INDEX IF NOT EXISTS idx_outbox_status_retry ON outbox_events (status, retry_count);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);
`
