PRAGMA foreign_keys=OFF;

CREATE TABLE notifications_fixed (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  order_id INTEGER REFERENCES orders(id),
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO notifications_fixed (id, user_id, type, title, message, order_id, read_at, created_at)
SELECT id, user_id, type, title, message, order_id, read_at,
  CASE WHEN created_at = 'CURRENT_TIMESTAMP' OR created_at IS NULL THEN CURRENT_TIMESTAMP ELSE created_at END
FROM notifications;

DROP TABLE notifications;
ALTER TABLE notifications_fixed RENAME TO notifications;

PRAGMA foreign_keys=ON;
