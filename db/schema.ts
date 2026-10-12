import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const stores = sqliteTable("stores", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerId: text("owner_id").notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  socialNetwork: text("social_network").notNull(),
  status: text("status").notNull().default("pending_verification"),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
});

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  storeId: integer("store_id").notNull().references(() => stores.id),
  title: text("title").notNull(),
  priceCents: integer("price_cents").notNull(),
  stock: integer("stock").notNull().default(0),
  status: text("status").notNull().default("draft"),
  imageUrl: text("image_url"),
  saleMode: text("sale_mode").notNull().default("store"),
  expiresAt: text("expires_at"),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
});

export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  buyerId: text("buyer_id").notNull(),
  storeId: integer("store_id").notNull().references(() => stores.id),
  productId: integer("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull().default(1),
  unitPriceCents: integer("unit_price_cents").notNull(),
  subtotalCents: integer("subtotal_cents").notNull(),
  feeCents: integer("fee_cents").notNull(),
  totalCents: integer("total_cents").notNull(),
  status: text("status").notNull().default("payment_pending"),
  deliveryMethod: text("delivery_method").notNull().default("courier"),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
});

export const escrowLedger = sqliteTable("escrow_ledger", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").notNull().unique().references(() => orders.id),
  amountCents: integer("amount_cents").notNull(),
  feeCents: integer("fee_cents").notNull(),
  status: text("status").notNull().default("awaiting_payment"),
  heldAt: text("held_at"),
  releasedAt: text("released_at"),
});

export const deliveries = sqliteTable("deliveries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").notNull().unique().references(() => orders.id),
  method: text("method").notNull(),
  carrier: text("carrier"),
  trackingCode: text("tracking_code"),
  status: text("status").notNull().default("pending"),
  pickupPin: text("pickup_pin"),
  pickupPinExpiresAt: text("pickup_pin_expires_at"),
  deliveredAt: text("delivered_at"),
  receivedAt: text("received_at"),
});

export const bankTransferSubmissions = sqliteTable("bank_transfer_submissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").notNull().unique().references(() => orders.id),
  bank: text("bank").notNull(),
  reference: text("reference").notNull(),
  amountCents: integer("amount_cents").notNull(),
  receiptUrl: text("receipt_url"),
  status: text("status").notNull().default("pending_review"),
  submittedAt: text("submitted_at").notNull().default("CURRENT_TIMESTAMP"),
  reviewedAt: text("reviewed_at"),
});

export const disputes = sqliteTable("disputes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").notNull().unique().references(() => orders.id),
  openedBy: text("opened_by").notNull(),
  reason: text("reason").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("open"),
  resolution: text("resolution"),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
  resolvedAt: text("resolved_at"),
});

export const notifications = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  orderId: integer("order_id").references(() => orders.id),
  readAt: text("read_at"),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
});

export const notificationPreferences = sqliteTable("notification_preferences", {
  userId: text("user_id").primaryKey(),
  inApp: integer("in_app", { mode: "boolean" }).notNull().default(true),
  email: integer("email", { mode: "boolean" }).notNull().default(false),
  whatsapp: integer("whatsapp", { mode: "boolean" }).notNull().default(false),
  sms: integer("sms", { mode: "boolean" }).notNull().default(false),
  updatedAt: text("updated_at").notNull().default("CURRENT_TIMESTAMP"),
});

export const sellerBalances = sqliteTable("seller_balances", {
  ownerId: text("owner_id").primaryKey(),
  availableCents: integer("available_cents").notNull().default(0),
  totalEarnedCents: integer("total_earned_cents").notNull().default(0),
  updatedAt: text("updated_at").notNull().default("CURRENT_TIMESTAMP"),
});

export const balanceTransactions = sqliteTable("balance_transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerId: text("owner_id").notNull(),
  orderId: integer("order_id").references(() => orders.id),
  type: text("type").notNull(),
  amountCents: integer("amount_cents").notNull(),
  feeCents: integer("fee_cents").notNull().default(0),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
});

export const withdrawals = sqliteTable("withdrawals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerId: text("owner_id").notNull(),
  amountCents: integer("amount_cents").notNull(),
  method: text("method").notNull(),
  destination: text("destination").notNull(),
  status: text("status").notNull().default("pending_review"),
  reviewedAt: text("reviewed_at"),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
});
