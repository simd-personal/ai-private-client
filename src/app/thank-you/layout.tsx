import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Thank You | Private Client Property Desk",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ThankYouLayout({ children }: { children: ReactNode }) {
  return children;
}
