import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { products, stores } from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { createPublicProductCode } from "../../../product-code";

const referenceImage = {
  iphone16: "https://tweakers.net/i/5TbUDeRD64n_QAY1zjIATeMR3Rc%3D/fit-in/x800/filters%3Astrip_icc%28%29%3Astrip_exif%28%29/i/2006928484.jpeg?f=imagegallery",
  iphone16Pro: "https://cdn.cimri.io/image/1200x1200/apple-iphone-16-pro-128gb_917069349.jpg",
  iphone17: "https://youget.pt/245640-large_default/apple-iphone-17-63-256gb-verde-salvia.jpg",
  iphone17Pro: "https://static.swappa.com/images/cache/ea/cc/eacc0026acf927b54868504b1647d855.png",
  iphone17ProMax: "https://tienda.movistar.com.uy/off/img/20250916123453-Apple-iPhone-17-Pro-Max.png",
  iphone18Pro: "https://www.apple.com/newsroom/images/2026/09/apple-debuts-iphone-18-pro-and-iphone-18-pro-max/article/Apple-iPhone-18-Pro-2up-260909_inline.jpg.large_2x.jpg",
};

const catalog = [
  { title: "iPhone 16 128GB · Nuevo", model: "iPhone 16", storage: "128 GB", price: 947, condition: "new", imageUrl: referenceImage.iphone16, description: "Precio referencial Ecuador 2026. Nuevo; verificar sellado, IMEI, homologación, color y garantía antes de publicar. Chip A18, cámara Fusion de 48 MP, Camera Control y botón de acción." },
  { title: "iPhone 16 128GB · Open Box", model: "iPhone 16", storage: "128 GB", price: 697, condition: "used", imageUrl: referenceImage.iphone16, description: "Precio referencial Ecuador 2026. Open box; confirmar batería, IMEI, desbloqueo, accesorios y garantía de la unidad antes de publicar. No vender como nuevo." },
  { title: "iPhone 16 Pro 128GB · Open Box", model: "iPhone 16 Pro", storage: "128 GB", price: 897, condition: "used", imageUrl: referenceImage.iphone16Pro, description: "Precio referencial. Open box; confirmar batería, IMEI, pantalla, cámaras, accesorios y garantía. Chip A18 Pro, titanio y sistema Pro de cámaras." },
  { title: "iPhone 16 Pro Max 256GB · Open Box", model: "iPhone 16 Pro Max", storage: "256 GB", price: 997, condition: "used", imageUrl: referenceImage.iphone16Pro, description: "Precio referencial Ecuador 2026. Open box; confirmar batería, IMEI, desbloqueo, accesorios y garantía antes de publicar." },
  { title: "iPhone 17 256GB · Nuevo", model: "iPhone 17", storage: "256 GB", price: 1047, condition: "new", imageUrl: referenceImage.iphone17, description: "Precio referencial Ecuador 2026. Nuevo; verificar disponibilidad, sellado, IMEI, homologación, color y garantía. Chip A19, pantalla ProMotion y cámaras Dual Fusion de 48 MP." },
  { title: "iPhone 17 256GB · Open Box", model: "iPhone 17", storage: "256 GB", price: 917, condition: "used", imageUrl: referenceImage.iphone17, description: "Precio referencial Ecuador 2026. Open box; confirmar batería, IMEI, desbloqueo, accesorios y garantía. No vender como nuevo." },
  { title: "iPhone 17 Pro 256GB · Nuevo", model: "iPhone 17 Pro", storage: "256 GB", price: 1297, condition: "new", imageUrl: referenceImage.iphone17Pro, description: "Precio referencial Ecuador 2026. Nuevo; verificar stock, sellado, IMEI, homologación, color y garantía. Chip A19 Pro y sistema Pro de cámaras de 48 MP." },
  { title: "iPhone 17 Pro 256GB · Open Box", model: "iPhone 17 Pro", storage: "256 GB", price: 1197, condition: "used", imageUrl: referenceImage.iphone17Pro, description: "Precio referencial Ecuador 2026. Open box; confirmar batería, IMEI, desbloqueo, accesorios y garantía antes de publicar." },
  { title: "iPhone 17 Pro Max 256GB · Nuevo", model: "iPhone 17 Pro Max", storage: "256 GB", price: 1397, condition: "new", imageUrl: referenceImage.iphone17ProMax, description: "Precio referencial Ecuador 2026. Nuevo; verificar stock, sellado, IMEI, homologación, color y garantía. Pantalla de 6,9 pulgadas, chip A19 Pro y cámaras Pro Fusion." },
  { title: "iPhone 17 Pro Max 256GB · Open Box", model: "iPhone 17 Pro Max", storage: "256 GB", price: 1297, condition: "used", imageUrl: referenceImage.iphone17ProMax, description: "Precio referencial Ecuador 2026. Open box certificado según proveedor; confirmar batería, IMEI, desbloqueo, accesorios y garantía. No vender como nuevo." },
  { title: "iPhone 18 Pro 256GB · Nuevo", model: "iPhone 18 Pro", storage: "256 GB", price: 1497, condition: "new", imageUrl: referenceImage.iphone18Pro, description: "Precio referencial promocional observado en Ecuador. Verificar homologación, disponibilidad, precio final, IMEI, color y garantía antes de publicar. Chip A20 Pro y cámara Fusion Main de 48 MP." },
  { title: "iPhone 18 Pro Max 256GB · Nuevo", model: "iPhone 18 Pro Max", storage: "256 GB", price: 1747, condition: "new", imageUrl: referenceImage.iphone18Pro, description: "Precio referencial promocional observado en Ecuador. Verificar homologación, disponibilidad, precio final, IMEI, color y garantía antes de publicar. Imagen referencial de la familia iPhone 18 Pro." },
];

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Inicia sesión para cargar el catálogo." }, { status: 401 });
  const body = await request.json() as { storeId?: number };
  if (!body.storeId) return Response.json({ error: "Negocio inválido." }, { status: 400 });
  const db = getDb();
  const [store] = await db.select({ id: stores.id }).from(stores).where(and(eq(stores.id, body.storeId), eq(stores.ownerId, user.userId))).limit(1);
  if (!store) return Response.json({ error: "El negocio no pertenece a esta cuenta." }, { status: 403 });
  const titles = catalog.map(item => item.title);
  const existing = await db.select({ title: products.title }).from(products).where(eq(products.storeId, store.id));
  const existingTitles = new Set(existing.map(item => item.title));
  const pending = catalog.filter(item => !existingTitles.has(item.title));
  if (!pending.length) return Response.json({ created: 0, skipped: catalog.length, message: "El catálogo base de iPhone ya estaba cargado." });
  const inserted: Array<{ id: number; title: string; status: string }> = [];
  for (const item of pending) {
    const [row] = await db.insert(products).values({ storeId: store.id, title: item.title, description: item.description, category: "mobile", brand: "Apple", model: item.model, storage: item.storage, color: null, condition: item.condition, warrantyMonths: 0, priceCents: item.price * 100, stock: 20, status: "draft", imageUrl: item.imageUrl, saleMode: "store", expiresAt: null, publicCode: createPublicProductCode() }).returning({ id: products.id, title: products.title, status: products.status });
    if (row) inserted.push(row);
  }
  return Response.json({ created: inserted.length, skipped: catalog.length - inserted.length, products: inserted, message: "Catálogo base guardado como borrador. Verifica precio, foto, stock, IMEI y homologación antes de publicar." }, { status: 201 });
}
