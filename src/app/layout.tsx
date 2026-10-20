import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stiliza Devotion · Pilates Reformer & Hot Pilates CRM + Autonomous Frontdesk",
  description:
    "Sistema CRM, Agendamiento de Máquinas Reformer y Tapetes Hot Pilates, Bot IA en WhatsApp con envío de QR y Modo Kiosco Tablet.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-[#F6F2EC] text-[#1B1512]">
        {children}
      </body>
    </html>
  );
}
