declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    RECEIPTS: R2Bucket;
    PAYMENT_WEBHOOK_SECRET?: string;
    STREAMLOCK_ADMIN_EMAIL?: string;
    ACCESS_SESSION_SECRET?: string;
    WHATSAPP_API_VERSION?: string;
    WHATSAPP_PHONE_NUMBER_ID?: string;
    WHATSAPP_ACCESS_TOKEN?: string;
    WHATSAPP_OTP_TEMPLATE_NAME?: string;
    WHATSAPP_OTP_TEMPLATE_LANGUAGE?: string;
    WHATSAPP_OTP_REQUIRED?: string;
    WHATSAPP_WEBHOOK_VERIFY_TOKEN?: string;
    WHATSAPP_APP_SECRET?: string;
  }
}
