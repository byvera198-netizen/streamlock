ALTER TABLE user_profiles ADD COLUMN identity_document_key TEXT;
ALTER TABLE user_profiles ADD COLUMN identity_document_type TEXT;
ALTER TABLE user_profiles ADD COLUMN identity_document_submitted_at TEXT;

CREATE TABLE IF NOT EXISTS payout_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_type TEXT NOT NULL,
  account_holder_name TEXT NOT NULL,
  account_number_ciphertext TEXT NOT NULL,
  account_number_last4 TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_review',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS payout_accounts_owner_idx ON payout_accounts(owner_id, status);
