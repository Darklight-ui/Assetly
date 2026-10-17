import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { InstallPromptListener } from "@/components/install-prompt-listener";

export const metadata: Metadata = {
  title: "Assetly — Every Asset. Accounted For.",
  description:
    "Track office assets, condition, location, custody and history in one secure inventory.",
  applicationName: "Assetly",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Assetly",
    statusBarStyle: "black",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#080b12",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({children}:{children:React.ReactNode}){
  return (
    <html lang="en">
      <body>
        {children}
        <ServiceWorkerRegister />
        <InstallPromptListener />
      </body>
    </html>
  );
}
