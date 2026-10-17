import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Assetly — Every Asset. Accounted For.", description: "Track office assets, condition, location, custody and history in one secure inventory." };
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
