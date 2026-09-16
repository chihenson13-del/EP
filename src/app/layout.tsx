import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { cn } from "@/lib/utils";

const fontSans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });
const fontHeading = Playfair_Display({ subsets: ["latin"], variable: "--font-heading" });

export const metadata: Metadata = {
  title: {
    default: "Events Partner — Plan any event, beautifully",
    template: "%s — Events Partner",
  },
  description:
    "Events Partner is the all-in-one platform for invitations, RSVPs, guest management, seating, and event-day check-in — for any event, not just weddings.",
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
      </body>
    </html>
  );
}
