import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MausamSetu | Autonomous Meteorological & Disaster Radar",
  description: "Hyper-local AI weather intelligence and tactical disaster response platform.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2306b6d4' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z'/><path d='M4 22h16'/><path d='M7 22v-3'/><path d='M17 22v-3'/></svg>",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#020b18] text-slate-100 antialiased overflow-hidden">
        {children}
      </body>
    </html>
  );
}