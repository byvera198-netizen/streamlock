const baseUrl = (process.argv[2] ?? process.env.STREAMLOCK_BASE_URL ?? "https://streamlock.profebyron.workers.dev").replace(/\/$/, "");

const checks = [
  {
    name: "portada",
    request: () => fetch(`${baseUrl}/`),
    expected: (response) => response.status === 200,
  },
  {
    name: "soporte WhatsApp visible",
    request: () => fetch(`${baseUrl}/`),
    expected: async (response) => {
      const html = await response.clone().text();
      return response.status === 200 && html.includes("support-whatsapp") && html.includes("593985280991");
    },
  },
  {
    name: "páginas legales públicas",
    request: () => Promise.all([fetch(`${baseUrl}/terms`), fetch(`${baseUrl}/privacy`), fetch(`${baseUrl}/refunds`)]),
    expected: async (responses) => {
      const html = await Promise.all(responses.map((response) => response.clone().text()));
      return responses.every((response) => response.status === 200) && html[0].includes("Términos") && html[1].includes("Privacidad") && html[2].includes("Reembolsos");
    },
  },
  {
    name: "perfil público",
    request: () => fetch(`${baseUrl}/profile`),
    expected: (response) => response.status === 200,
  },
  {
    name: "panel de administración público",
    request: () => fetch(`${baseUrl}/admin`),
    expected: (response) => response.status === 200,
  },
  {
    name: "vitrina pública del catálogo",
    request: () => fetch(`${baseUrl}/s/streamlock-demo`),
    expected: async (response) => response.status === 200 && (await response.clone().text()).includes("Productos disponibles"),
  },
  {
    name: "checkout público del producto demo",
    request: () => fetch(`${baseUrl}/checkout/1`),
    expected: async (response) => response.status === 200 && (await response.clone().text()).includes("COMPRA PROTEGIDA"),
  },
  {
    name: "referencias públicas de celulares",
    request: () => fetch(`${baseUrl}/mobile-reference`),
    expected: async (response) => { const html = await response.clone().text(); return response.status === 200 && html.includes("Modelos para tu catálogo móvil") && html.includes("Usar como borrador") && html.includes("reference="); },
  },
  {
    name: "prueba de acceso protegida",
    request: () => fetch(`${baseUrl}/access-test`, { redirect: "manual" }),
    expected: (response) => response.status === 302 && response.headers.get("location")?.includes("cloudflareaccess.com"),
  },
  {
    name: "puente de sesión rechaza token inválido",
    request: () => fetch(`${baseUrl}/api/access-session`, { method: "POST", body: new URLSearchParams({ token: "invalid", returnTo: "/" }) }),
    expected: (response) => response.status === 401,
  },
  {
    name: "cierre de sesión protegido",
    request: () => fetch(`${baseUrl}/signout-with-chatgpt?return_to=%2F`, { redirect: "manual" }),
    expected: (response) => response.status === 303 && response.headers.get("location") === "/",
  },
  {
    name: "salud D1/R2",
    request: () => fetch(`${baseUrl}/api/health`),
    expected: async (response) => {
      const payload = await response.clone().json();
      return response.status === 200 && payload.status === "ok" && payload.checks?.email === true;
    },
  },
  {
    name: "prueba de correo protegida",
    request: () => fetch(`${baseUrl}/api/admin/email-test`, { method: "POST" }),
    expected: (response) => response.status === 403,
  },
  {
    name: "OTP protegido",
    request: () => fetch(`${baseUrl}/api/profile/phone-verification/start`, { method: "POST" }),
    expected: (response) => response.status === 401,
  },
  {
    name: "cuentas bancarias públicas",
    request: () => fetch(`${baseUrl}/api/payments/bank-transfer`),
    expected: async (response) => response.status === 200 && (await response.clone().json()).accounts?.length > 0,
  },
  {
    name: "panel bancario protegido",
    request: () => fetch(`${baseUrl}/api/admin/bank-accounts`),
    expected: (response) => response.status === 403,
  },
  {
    name: "verificación de vitrinas protegida",
    request: () => fetch(`${baseUrl}/api/admin/stores`),
    expected: (response) => response.status === 403,
  },
  {
    name: "catálogo privado",
    request: () => fetch(`${baseUrl}/api/products`),
    expected: (response) => response.status === 401,
  },
  {
    name: "negocio privado",
    request: () => fetch(`${baseUrl}/api/stores`),
    expected: (response) => response.status === 401,
  },
  {
    name: "perfil API privado",
    request: () => fetch(`${baseUrl}/api/profile`),
    expected: (response) => response.status === 401,
  },
  {
    name: "órdenes privadas",
    request: () => fetch(`${baseUrl}/api/orders`),
    expected: (response) => response.status === 401,
  },
  {
    name: "balance vendedor privado",
    request: () => fetch(`${baseUrl}/api/seller/balance`),
    expected: (response) => response.status === 401,
  },
  {
    name: "edición de producto protegida",
    request: () => fetch(`${baseUrl}/api/products/1`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "Prueba" }) }),
    expected: (response) => response.status === 401,
  },
  {
    name: "registro de comprobante protegido",
    request: () => fetch(`${baseUrl}/api/payments/bank-transfer`, { method: "POST" }),
    expected: (response) => response.status === 401,
  },
  {
    name: "webhook firmado",
    request: () => fetch(`${baseUrl}/api/payments/webhook`, { method: "POST", body: "{}" }),
    expected: (response) => response.status === 401,
  },
  {
    name: "webhook de WhatsApp rechaza evento sin firma",
    request: () => fetch(`${baseUrl}/api/webhooks/whatsapp`, { method: "POST", body: JSON.stringify({ object: "whatsapp_business_account", entry: [] }) }),
    expected: (response) => response.status === 401,
  },
];

let failed = false;
console.log(`Smoke test: ${baseUrl}`);
for (const check of checks) {
  try {
    const response = await check.request();
    const passed = await check.expected(response);
    const status = Array.isArray(response) ? response.map((item) => item.status).join("/") : response.status;
    console.log(`${passed ? "PASS" : "FAIL"} ${check.name} (${status})`);
    if (!passed) failed = true;
  } catch (error) {
    failed = true;
    console.log(`FAIL ${check.name} (${error instanceof Error ? error.message : "error desconocido"})`);
  }
}

if (failed) process.exitCode = 1;
