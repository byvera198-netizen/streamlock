export default function AdminOverview() {
  const sections = [
    ["payment-reviews", "Comprobantes", "Revisar depósitos y confirmar órdenes"],
    ["bank-receiving", "Cuentas receptoras", "Administrar cuentas donde depositan compradores"],
    ["identity-reviews", "Identidad", "Revisar perfiles y documentos KYC"],
    ["payout-reviews", "Retiros", "Autorizar cuentas bancarias de vendedores"],
    ["store-reviews", "Vitrinas", "Aprobar negocios y catálogos"],
    ["disputes", "Disputas", "Mediar reclamos y fondos retenidos"],
    ["deliveries", "Entregas", "Confirmar courier y entregas presenciales"],
    ["withdrawals", "Pagos", "Gestionar solicitudes, historial y auditoría"],
    ["integrations", "Integraciones", "WhatsApp y métodos de pago"],
    ["demo-data", "Datos DEMO", "Crear y eliminar escenarios de prueba"],
  ];
  return <section className="admin-overview"><p className="kicker">CONTROL CENTRAL · STREAMLOCK</p><h1>Centro administrativo</h1><p className="admin-lead">Operaciones, identidad, tesorería, mediación e integraciones en una sola vista. La información sensible aparece únicamente después de una acción administrativa autorizada.</p><nav className="admin-overview-nav" aria-label="Secciones administrativas">{sections.map(([id, label, description]) => <a key={id} href={`#${id}`}><b>{label}</b><small>{description}</small></a>)}</nav><div className="admin-security-banner"><b>Protección activa</b><span>Documentos KYC en R2 privado · cuentas de retiro cifradas · acciones sensibles auditadas.</span></div></section>;
}
