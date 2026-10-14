import ProfileClient from "./profile-client";
import { chatGPTSignInPath } from "../chatgpt-auth";

export const dynamic = "force-dynamic";

function ProfileSteps() {
  return <section className="profile-steps" aria-label="Proceso de activación del perfil"><div><span>01</span><b>Elige tu modalidad</b><small>Cliente, vendedor o ambos</small></div><div><span>02</span><b>Datos reales</b><small>Nombre, teléfono y dirección</small></div><div><span>03</span><b>Documento</b><small>Cédula o identificación oficial</small></div><div><span>04</span><b>Revisión y activación</b><small>Administración valida tu identidad</small></div></section>;
}

export default function ProfilePage() {
  return <><ProfileSteps /><ProfileClient signInHref={chatGPTSignInPath("/profile")} /></>;
}
