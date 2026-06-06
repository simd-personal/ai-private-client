import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { Footer } from "@/components/layout/footer";
import { AttributionProvider } from "@/components/providers/attribution-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Private Client Property Desk | AI Strategy Room",
  description:
    "AI-powered planning and coordination for complex real estate decisions involving agents, wealth advisors, CPAs, attorneys, and lenders.",
  openGraph: {
    title: "Private Client Property Desk",
    description:
      "An AI private client strategy room for complex real estate planning and advisor coordination.",
  },
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? {
        verification: {
          google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
        },
      }
    : {}),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <AttributionProvider>
          <main className="flex-1">{children}</main>
          <Footer />
        </AttributionProvider>
      </body>
    </html>
  );
}
