CREATE TABLE IF NOT EXISTS bank_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  bank_name TEXT NOT NULL,
  account_type TEXT NOT NULL,
  account_number TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO bank_accounts (slug, bank_name, account_type, account_number)
VALUES
  ('pichincha', 'Banco Pichincha', 'Cuenta de ahorro', '2210107606'),
  ('internacional', 'Banco Internacional', 'Cuenta de ahorros', '1950703151'),
  ('guayaquil', 'Banco Guayaquil', 'Cuenta de ahorro', '0061962064');
