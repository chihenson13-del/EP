import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/site"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Private areas, and guest-facing invitation/RSVP links, which are meant for invited people only.
        disallow: ["/dashboard", "/admin", "/api", "/checkout", "/print", "/preview", "/e/", "/rsvp/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
