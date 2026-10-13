import LegalPage from "../components/legal-page";

export default function TermsPage() {
  return <LegalPage eyebrow="STREAMLOCK · TÉRMINOS" title="Reglas claras para comprar y vender." intro="Estas condiciones describen el funcionamiento inicial de StreamLock para vitrinas, pedidos y transferencias bancarias." sections={[
    { title: "1. Uso de la plataforma", body: ["StreamLock facilita la publicación de productos, la creación de órdenes y la coordinación de entregas entre compradores y vendedores. Cada usuario debe proporcionar información verdadera y mantenerla actualizada.", "El usuario es responsable de proteger su sesión y de no compartir códigos, comprobantes o datos de acceso con terceros."] },
    { title: "2. Productos y publicaciones", body: ["El vendedor responde por la existencia, autenticidad, condición, precio, stock, garantía y descripción de sus productos. No se deben publicar productos prohibidos, falsificados o de procedencia ilícita.", "StreamLock puede ocultar una publicación o una vitrina cuando exista información incompleta, riesgo de fraude o incumplimiento de estas reglas."] },
    { title: "3. Pagos y entrega protegida", body: ["En la modalidad vigente, el comprador realiza una transferencia o depósito a una cuenta registrada y carga el comprobante en la orden. La orden permanece pendiente hasta la revisión administrativa del comprobante.", "El vendedor no debe despachar antes de que la plataforma confirme el pago. La liberación operativa del saldo depende de la entrega confirmada, la validación presencial o el cierre de una disputa."] },
    { title: "4. Disputas y limitaciones", body: ["Las discrepancias deben abrirse desde la orden con una descripción y evidencia suficiente. StreamLock revisará la información disponible y registrará una resolución operativa.", "Estos términos son una versión inicial y no sustituyen asesoría legal, contratos comerciales ni las obligaciones que correspondan por normativa ecuatoriana."] },
  ]} />;
}
