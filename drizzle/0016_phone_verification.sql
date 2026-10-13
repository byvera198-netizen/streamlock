ALTER TABLE user_profiles ADD COLUMN phone_verification_code_hash TEXT;
ALTER TABLE user_profiles ADD COLUMN phone_verification_expires_at TEXT;
ALTER TABLE user_profiles ADD COLUMN phone_verification_last_sent_at TEXT;
ALTER TABLE user_profiles ADD COLUMN phone_verification_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN phone_verified_at TEXT;
