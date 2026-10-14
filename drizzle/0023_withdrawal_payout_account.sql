ALTER TABLE withdrawals ADD COLUMN payout_account_id INTEGER REFERENCES payout_accounts(id);
CREATE INDEX IF NOT EXISTS withdrawals_payout_account_idx ON withdrawals(payout_account_id, status);
