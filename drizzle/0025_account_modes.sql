ALTER TABLE user_profiles ADD COLUMN account_type TEXT NOT NULL DEFAULT 'buyer';
ALTER TABLE user_profiles ADD COLUMN active_mode TEXT NOT NULL DEFAULT 'buyer';
UPDATE user_profiles SET account_type = 'both', active_mode = 'seller'
WHERE user_id IN (SELECT owner_id FROM stores);
