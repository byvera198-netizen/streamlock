ALTER TABLE products ADD COLUMN public_code TEXT;
UPDATE products SET public_code = 'SL-' || printf('%06d', id) WHERE public_code IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS products_public_code_unique ON products(public_code);

ALTER TABLE orders ADD COLUMN confirmed_at TEXT;
UPDATE orders
SET confirmed_at = created_at
WHERE status IN ('payment_held', 'shipped', 'ready_for_pickup', 'completed', 'refunded');
