import DashboardClient from "./dashboard-client";
import { chatGPTSignInPath, chatGPTSignOutPath, getChatGPTUser } from "./chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getChatGPTUser();
  return <DashboardClient user={user ? { displayName: user.displayName, email: user.email } : null} signInHref={chatGPTSignInPath("/")} signOutHref={chatGPTSignOutPath("/")} />;
}
