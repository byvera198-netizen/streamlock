const baseUrl = (process.argv[2] ?? process.env.STREAMLOCK_BASE_URL ?? "https://streamlock.profebyron.workers.dev").replace(/\/$/, "");

const checks = [
  {
    name: "portada",
    request: () => fetch(`${baseUrl}/`),
    expected: (response) => response.status === 200,
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
    name: "salud D1/R2",
    request: () => fetch(`${baseUrl}/api/health`),
    expected: async (response) => response.status === 200 && (await response.clone().json()).status === "ok",
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
];

let failed = false;
console.log(`Smoke test: ${baseUrl}`);
for (const check of checks) {
  try {
    const response = await check.request();
    const passed = await check.expected(response);
    console.log(`${passed ? "PASS" : "FAIL"} ${check.name} (${response.status})`);
    if (!passed) failed = true;
  } catch (error) {
    failed = true;
    console.log(`FAIL ${check.name} (${error instanceof Error ? error.message : "error desconocido"})`);
  }
}

if (failed) process.exitCode = 1;
