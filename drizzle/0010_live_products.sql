ALTER TABLE products ADD COLUMN sale_mode TEXT NOT NULL DEFAULT 'store';
ALTER TABLE products ADD COLUMN expires_at TEXT;
