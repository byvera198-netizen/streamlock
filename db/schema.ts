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
  receivedAt: text("received_at"),
});
