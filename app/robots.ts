import type { MetadataRoute } from "next";
import { getPublicUrl } from "./public-url";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getPublicUrl();
  return {
    rules: [{ userAgent: "*", allow: ["/", "/s/"], disallow: ["/admin", "/api/", "/profile", "/orders", "/my-orders", "/checkout/"] }],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
