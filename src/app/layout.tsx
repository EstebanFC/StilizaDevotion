import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";

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
    <html lang="es" className="dark">
      <body className="min-h-screen bg-[var(--bg-page)] text-[var(--text-page)] transition-colors duration-200">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
