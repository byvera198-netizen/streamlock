import type { MetadataRoute } from "next";

const baseUrl = "https://streamlock.profebyron.workers.dev";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/", "/s/"], disallow: ["/admin", "/api/", "/profile", "/orders", "/my-orders", "/checkout/"] }],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
