function safeReturnPath(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

/**
 * The public site uses Cloudflare Access for interactive sign-in.  Keep this
 * compatibility route because the UI also runs inside the ChatGPT host,
 * where the same link name is used for both authentication environments.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnTo = safeReturnPath(url.searchParams.get("return_to"));
  const accessUrl = new URL("/access-test", request.url);
  accessUrl.searchParams.set("return_to", returnTo);

  return Response.redirect(accessUrl, 303);
}
