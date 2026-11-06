import type { Metadata } from "next";
import { Cinzel, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";

const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "DEVOTION HEAT ROOM & STILIZA · Inferno Hot Pilates 33°C & Reformer",
  description:
    "El primer Heat Room con calor infrarrojo a 33°C y Pilates Reformer de alta precisión en Querétaro (Zibatá, Juriquilla, Campanario, San Isidro). Agenda tu clase muestra.",
  icons: {
    icon: "/devotion-logo.png",
    apple: "/devotion-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`dark ${cinzel.variable} ${sans.variable}`}>
      <body className="min-h-screen bg-[var(--bg-page)] text-[var(--text-page)] transition-colors duration-200 font-sans antialiased selection:bg-[#7B6E86] selection:text-[#D2C483]">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
