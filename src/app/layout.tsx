import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ClientErrorReporter } from "@/components/shared/client-error-reporter";
import { cn } from "@/lib/utils";

const fontSans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });
const fontHeading = Playfair_Display({ subsets: ["latin"], variable: "--font-heading" });

const description =
  "Create beautiful invitations, manage RSVPs, organize guests, and bring your event together in one elegant platform."

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    default: "Events Partner — Create Beautiful Events",
    template: "%s — Events Partner",
  },
  description,
  manifest: "/site.webmanifest",
  // favicon.ico, icon.png, and apple-icon.png in src/app/ are picked up automatically by
  // Next.js's file-convention metadata — no manual `icons` field needed here.
  openGraph: {
    title: "Events Partner",
    description,
    siteName: "Events Partner",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Events Partner",
    description,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn("h-full antialiased", fontSans.variable, fontHeading.variable)}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans">
        <Providers>{children}</Providers>
        <ClientErrorReporter />
      </body>
    </html>
  );
}
