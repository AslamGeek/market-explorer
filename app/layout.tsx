import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Location Intelligence Explorer", description: "Explore your local competitive landscape before opening a business.", icons: { icon: "/favicon.svg" } };
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) { return <html lang="en"><body>{children}</body></html>; }
