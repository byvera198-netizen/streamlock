import ProfileClient from "./profile-client";
import { chatGPTSignInPath } from "../chatgpt-auth";

export const dynamic = "force-dynamic";

export default function ProfilePage() {
  return <ProfileClient signInHref={chatGPTSignInPath("/profile")} />;
}
