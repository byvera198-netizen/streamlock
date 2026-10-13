declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    RECEIPTS: R2Bucket;
    PAYMENT_WEBHOOK_SECRET?: string;
    STREAMLOCK_ADMIN_EMAIL?: string;
    ACCESS_SESSION_SECRET?: string;
  }
}
