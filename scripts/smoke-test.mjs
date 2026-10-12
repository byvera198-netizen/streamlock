const baseUrl = (process.argv[2] ?? process.env.STREAMLOCK_BASE_URL ?? "https://streamlock.profebyron.workers.dev").replace(/\/$/, "");

const checks = [
  {
    name: "portada",
    request: () => fetch(`${baseUrl}/`),
    expected: (response) => response.status === 200,
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
