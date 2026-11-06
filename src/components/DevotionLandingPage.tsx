"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CRMDatabaseState,
  Discipline,
  Branch,
  ClassSession,
  StudioPromoEvent,
} from "@/types/crm";
import { ThemeToggleButton, useTheme } from "@/context/ThemeContext";
import {
  ArrowRight,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  ExternalLink,
  Flame,
  Heart,
  HelpCircle,
  Instagram,
  Layers,
  LayoutGrid,
  Lock,
  MapPin,
  MessageCircle,
  Phone,
  Play,
  QrCode,
  ShieldCheck,
  Sparkles,
  Star,
  Tablet,
  Users,
  X,
  Zap,
} from "lucide-react";

interface DevotionLandingPageProps {
  initialDb?: CRMDatabaseState | null;
}

export function DevotionLandingPage({ initialDb }: DevotionLandingPageProps) {
  const { isDark } = useTheme();
  const [db, setDb] = useState<CRMDatabaseState | null>(initialDb || null);
  const [selectedDiscipline, setSelectedDiscipline] = useState<Discipline | "all">("all");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");
  const [selectedDay, setSelectedDay] = useState<string>("all");
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Modal de reserva rápida o selección de clase
  const [previewSession, setPreviewSession] = useState<ClassSession | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/crm", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setDb(data);
        }
      } catch (e) {
        console.error("Error loading CRM data on landing:", e);
      }
    }
    loadData();
  }, []);

  const branches = db?.branches || [];
  const sessions = db?.sessions || [];
  const packages = db?.packages || [];
  const coaches = db?.coaches || [];

  // Filtrado de horarios para el visor en vivo
  const filteredSessions = sessions.filter((s) => {
    const matchDiscipline =
      selectedDiscipline === "all" ? true : s.discipline === selectedDiscipline;
    const matchBranch =
      selectedBranchId === "all" ? true : s.branchId === selectedBranchId;
    const matchDay = selectedDay === "all" ? true : s.dayOfWeek === selectedDay;
    return matchDiscipline && matchBranch && matchDay;
  });

  // Generador de link de WhatsApp directo
  const buildWhatsAppLink = (customText?: string) => {
    const phone = "5214428182610";
    const msg = encodeURIComponent(
      customText ||
        "¡Hola! 👋 Me gustaría reservar mi clase muestra de Hot Pilates a 33°C en Devotion Heat Room."
    );
    return `https://wa.me/${phone}?text=${msg}`;
  };

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-page)] transition-colors duration-300 font-sans selection:bg-[#7B6E86] selection:text-[#D2C483]">
      {/* ─────────────────────────────────────────────────────────────────────────────
          1. TOP NOTIFICATION BAR: Promoción Exclusiva y WhatsApp Concierge
      ───────────────────────────────────────────────────────────────────────────── */}
      <aside
        aria-label="Anuncio promocional"
        className="w-full bg-[#1A1522] border-b border-[#7B6E86]/30 text-xs py-2 px-4 text-center font-medium text-[#EDE7DF] flex items-center justify-center gap-2 flex-wrap"
      >
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#7B6E86]/40 text-[#D2C483] text-[10px] font-bold border border-[#D2C483]/30">
          <Sparkles className="h-3 w-3" /> APERTURA Y CLASES MUESTRA
        </span>
        <span className="opacity-90">
          Vive la experiencia única en nuestros Heat Rooms a 33°C en Querétaro.
        </span>
        <a
          href={buildWhatsAppLink("Hola, quiero información sobre la promoción de clase muestra")}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#D2C483] hover:underline font-bold inline-flex items-center gap-1 ml-1"
        >
          <span>Agendar por WhatsApp</span>
          <ArrowRight className="h-3 w-3" />
        </a>
      </aside>

      {/* ─────────────────────────────────────────────────────────────────────────────
          2. HEADER PRINCIPAL / NAVEGACIÓN STICKY
      ───────────────────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#FAF8F5]/90 dark:bg-[#131017]/90 border-b border-[#7B6E86]/15 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* LOGO DEVOTION HEAT ROOM */}
          <Link href="/" className="flex items-center gap-3.5 group shrink-0">
            <div className="relative h-11 w-11 rounded-2xl overflow-hidden border border-[#D2C483]/40 shadow-sm bg-[#7B6E86] p-0.5 group-hover:scale-105 transition-transform duration-300">
              <Image
                src="/devotion-logo.png"
                alt="Logo Devotion Heat Room"
                width={88}
                height={88}
                className="w-full h-full object-cover rounded-xl"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-xl sm:text-2xl font-black tracking-wider text-[#241E2A] dark:text-[#F6F2EA] leading-none group-hover:text-[#7B6E86] dark:group-hover:text-[#D2C483] transition-colors">
                DEVOTION
              </span>
              <span className="text-[10px] sm:text-[11px] font-serif tracking-[0.25em] text-[#7B6E86] dark:text-[#D2C483] font-semibold mt-0.5 uppercase">
                HEAT ROOM · STILIZA
              </span>
            </div>
          </Link>

          {/* MENÚ DE ESCRITORIO */}
          <nav className="hidden lg:flex items-center gap-7 text-xs font-bold tracking-wide">
            <a
              href="#experiencia"
              className="text-stone-700 dark:text-stone-300 hover:text-[#7B6E86] dark:hover:text-[#D2C483] transition-colors"
            >
              Experiencia 33°C
            </a>
            <a
              href="#disciplinas"
              className="text-stone-700 dark:text-stone-300 hover:text-[#7B6E86] dark:hover:text-[#D2C483] transition-colors"
            >
              Disciplinas
            </a>
            <a
              href="#horarios"
              className="text-stone-700 dark:text-stone-300 hover:text-[#7B6E86] dark:hover:text-[#D2C483] transition-colors"
            >
              Horarios en Vivo
            </a>
            <a
              href="#sucursales"
              className="text-stone-700 dark:text-stone-300 hover:text-[#7B6E86] dark:hover:text-[#D2C483] transition-colors"
            >
              Sucursales (6)
            </a>
            <a
              href="#paquetes"
              className="text-stone-700 dark:text-stone-300 hover:text-[#7B6E86] dark:hover:text-[#D2C483] transition-colors"
            >
              Paquetes & Membresías
            </a>
            <a
              href="#faq"
              className="text-stone-700 dark:text-stone-300 hover:text-[#7B6E86] dark:hover:text-[#D2C483] transition-colors"
            >
              Preguntas
            </a>
          </nav>

          {/* ACCIONES Y BOTONES DE CONVERSIÓN */}
          <div className="flex items-center gap-3">
            <ThemeToggleButton />

            {/* Botón Principal CTA */}
            <a
              href={buildWhatsAppLink("Hola! Quiero reservar una clase muestra en Devotion")}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-2xl bg-[#7B6E86] hover:bg-[#685B73] active:scale-95 text-white font-bold text-xs tracking-wide shadow-md shadow-[#7B6E86]/25 border border-[#D2C483]/30 flex items-center gap-2 transition"
            >
              <Flame className="h-4 w-4 text-[#D2C483]" />
              <span className="hidden xs:inline">Reservar Clase</span>
              <span className="xs:hidden">Reservar</span>
            </a>

            {/* Botón Menú Móvil */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/10"
              aria-label="Abrir menú"
            >
              <LayoutGrid className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Menú Móvil desplegable */}
        {mobileMenuOpen && (
          <div className="lg:hidden px-4 pt-2 pb-5 bg-[#FAF8F5] dark:bg-[#16121C] border-b border-[#7B6E86]/20 space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs font-bold pt-2">
              <a
                href="#experiencia"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-xl bg-stone-100 dark:bg-stone-900 text-stone-800 dark:text-stone-200"
              >
                Experiencia 33°C
              </a>
              <a
                href="#disciplinas"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-xl bg-stone-100 dark:bg-stone-900 text-stone-800 dark:text-stone-200"
              >
                Disciplinas
              </a>
              <a
                href="#horarios"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-xl bg-stone-100 dark:bg-stone-900 text-stone-800 dark:text-stone-200"
              >
                Horarios en Vivo
              </a>
              <a
                href="#sucursales"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-xl bg-stone-100 dark:bg-stone-900 text-stone-800 dark:text-stone-200"
              >
                Sucursales
              </a>
              <a
                href="#paquetes"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-xl bg-stone-100 dark:bg-stone-900 text-stone-800 dark:text-stone-200"
              >
                Paquetes
              </a>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-xl bg-stone-100 dark:bg-stone-900 text-stone-800 dark:text-stone-200"
              >
                Preguntas
              </a>
            </div>
          </div>
        )}
      </header>

      {/* ─────────────────────────────────────────────────────────────────────────────
          3. HERO SECTION EDITORIAL & ELEGANTE (GROUNDED EN DEVOTION 33°C & STILIZA)
      ───────────────────────────────────────────────────────────────────────────── */}
      <section className="relative pt-12 pb-20 sm:pt-20 sm:pb-28 overflow-hidden">
        {/* Luces Ambientales con la paleta Mauve (#7B6E86) y Champagne (#D2C483) */}
        <div className="absolute top-1/4 -left-48 w-[500px] h-[500px] rounded-full bg-[#7B6E86]/20 dark:bg-[#7B6E86]/25 blur-[150px] pointer-events-none" />
        <div className="absolute top-1/3 -right-48 w-[500px] h-[500px] rounded-full bg-[#D2C483]/20 dark:bg-[#D2C483]/15 blur-[150px] pointer-events-none" />
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-orange-500/10 dark:bg-orange-600/10 blur-[130px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Columna Izquierda: Copy Editorial de Alto Impacto */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              {/* Eyebrow de Marca */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#7B6E86]/30 bg-[#7B6E86]/10 dark:bg-[#7B6E86]/20 text-[#7B6E86] dark:text-[#D2C483] text-xs font-bold tracking-wider uppercase backdrop-blur-md">
                <Flame className="h-3.5 w-3.5 text-orange-500" />
                <span>INFERNO HOT PILATES 33°C & REFORMER BOUTIQUE</span>
              </div>

              {/* Título Principal con Tipografía Cinzel */}
              <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#231D28] dark:text-white leading-[1.12]">
                ALGO ÚNICO ESTÁ EN QUERÉTARO.{" "}
                <span className="block mt-1 font-serif text-[#7B6E86] dark:text-[#D2C483] font-normal italic">
                  NO ES PARA TODOS.
                </span>
              </h1>

              {/* Subtítulo legible y descriptivo */}
              <p className="text-base sm:text-lg text-stone-600 dark:text-[#BFB5C9] max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
                El calor infrarrojo a <strong>33°C</strong> penetra profundamente en tus
                músculos para maximizar la quema calórica, acelerar la desintoxicación
                y tonificar tu core con <strong>cero impacto en tus articulaciones</strong>.
                Compleméntalo con la precisión de nuestras máquinas Reformer.
              </p>

              {/* CTA Group */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                <a
                  href={buildWhatsAppLink("Hola! Deseo agendar mi clase muestra a 33°C")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-[#7B6E86] hover:bg-[#685B73] text-white font-black text-sm tracking-wide shadow-xl shadow-[#7B6E86]/30 border border-[#D2C483]/40 flex items-center justify-center gap-2 transition active:scale-95"
                >
                  <Flame className="h-4 w-4 text-[#D2C483]" />
                  <span>Agendar Mi Clase Muestra</span>
                </a>

                <a
                  href="#horarios"
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white dark:bg-[#1E1927] hover:bg-stone-100 dark:hover:bg-[#282133] border border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200 font-bold text-sm tracking-wide shadow-sm flex items-center justify-center gap-2 transition"
                >
                  <Calendar className="h-4 w-4 text-[#7B6E86] dark:text-[#D2C483]" />
                  <span>Ver Horarios Disponibles</span>
                </a>
              </div>

              {/* Social Proof & Garantía de Alianzas */}
              <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-4 text-xs text-stone-500 dark:text-stone-400 font-medium border-t border-stone-200 dark:border-stone-800/80">
                <div className="flex items-center gap-1 text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-current" />
                  ))}
                  <span className="font-bold text-stone-900 dark:text-stone-100 ml-1">4.9/5</span>
                </div>
                <span>·</span>
                <span>+1,200 Alumnas Activas</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1 font-bold text-orange-500 dark:text-orange-400">
                  <Zap className="h-3.5 w-3.5" /> 750 Kcal Post-combustión
                </span>
                <span>·</span>
                <span className="inline-flex items-center gap-1 font-bold text-[#7B6E86] dark:text-[#D2C483]">
                  <Check className="h-3.5 w-3.5 text-emerald-500" /> Wellhub & TotalPass
                </span>
              </div>
            </div>

            {/* Columna Derecha: Galería Fotográfica Real del Estudio */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-3xl overflow-hidden border-2 border-[#7B6E86]/40 shadow-2xl bg-[#1C1824] aspect-[4/5] max-w-md mx-auto group">
                <Image
                  src="/devotion-studio-1.png"
                  alt="Equipo y Alumnas Devotion Heat Room Querétaro"
                  fill
                  className="object-cover object-center group-hover:scale-[1.02] transition-transform duration-500"
                  priority
                />

                {/* Overlay Gradiente Editorial suave en la base */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

                {/* Minimalist Glass Pill limpio y no sobrepuesto */}
                <div className="absolute bottom-3.5 left-3.5 right-3.5 p-3 rounded-2xl backdrop-blur-md bg-black/60 border border-white/15 text-white flex items-center justify-between gap-2 shadow-lg">
                  <div className="flex items-center gap-1.5">
                    <Flame className="h-4 w-4 text-orange-400 shrink-0" />
                    <span className="text-xs font-black tracking-wider text-[#D2C483] uppercase">
                      33°C Heat Room
                    </span>
                  </div>
                  <span className="text-[11px] text-stone-300 font-medium truncate">
                    Zibatá · Juriquilla · Campanario
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          4. SECCIÓN: LA CIENCIA DEL CALOR A 33°C (POR QUÉ 33°C Y NO MÁS)
      ───────────────────────────────────────────────────────────────────────────── */}
      <section id="experiencia" className="py-20 bg-stone-100/70 dark:bg-[#16121C] border-y border-stone-200 dark:border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
            <span className="text-xs font-black tracking-widest uppercase text-[#7B6E86] dark:text-[#D2C483]">
              Tecnología de Infrarrojo Lejano
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-extrabold tracking-tight">
              ¿Por qué exactamente 33°C en Devotion?
            </h2>
            <p className="text-sm sm:text-base text-stone-600 dark:text-stone-400">
              A diferencia de un sauna tradicional que calienta y asfixia el aire a temperaturas
              extremas, nuestros paneles infrarrojos calientan directamente el tejido biológico a una
              temperatura terapéutica y biomecánicamente óptima.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Pilar 1 */}
            <div className="rounded-3xl p-6 bg-white dark:bg-[#1C1824] border border-stone-200 dark:border-stone-800 shadow-sm space-y-3 hover:border-[#7B6E86] transition-colors">
              <div className="h-12 w-12 rounded-2xl bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold">
                <Flame className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-lg font-black text-stone-900 dark:text-stone-100">
                Penetración Muscular 4 cm
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                Las ondas infrarrojas lejanas penetran hasta 4 centímetros en el músculo y
                fascia, aumentando el flujo sanguíneo y la oxigenación celular sin fatigar tu respiración.
              </p>
            </div>

            {/* Pilar 2 */}
            <div className="rounded-3xl p-6 bg-white dark:bg-[#1C1824] border border-stone-200 dark:border-stone-800 shadow-sm space-y-3 hover:border-[#7B6E86] transition-colors">
              <div className="h-12 w-12 rounded-2xl bg-[#7B6E86]/20 text-[#7B6E86] dark:text-[#D2C483] flex items-center justify-center font-bold">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-lg font-black text-stone-900 dark:text-stone-100">
                Cero Impacto Articular
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                El calor a 33°C incrementa la elasticidad de los tendones y ligamentos en un 30%,
                permitiendo movimientos de contracción profunda sin riesgo de lesión articular.
              </p>
            </div>

            {/* Pilar 3 */}
            <div className="rounded-3xl p-6 bg-white dark:bg-[#1C1824] border border-stone-200 dark:border-stone-800 shadow-sm space-y-3 hover:border-[#7B6E86] transition-colors">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-lg font-black text-stone-900 dark:text-stone-100">
                Desintoxicación y Colágeno
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                La sudoración profunda activa la expulsión de toxinas acumuladas y estimula la
                producción natural de colágeno, logrando ese brillo cutáneo característico tras cada sesión.
              </p>
            </div>

            {/* Pilar 4 */}
            <div className="rounded-3xl p-6 bg-white dark:bg-[#1C1824] border border-stone-200 dark:border-stone-800 shadow-sm space-y-3 hover:border-[#7B6E86] transition-colors">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <Heart className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-lg font-black text-stone-900 dark:text-stone-100">
                Endorfinas y Sonoterapia
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                Finalizamos las sesiones con enfriamiento consciente y soundbaths con cuencos de
                cuarzo a la luz de las velas, reseteando tu sistema nervioso parasimpático.
              </p>
            </div>
          </div>

          {/* Galería Visual Real del Estudio */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-10">
            <div className="relative rounded-3xl overflow-hidden border border-[#7B6E86]/30 shadow-lg bg-[#1C1824] h-72 sm:h-80 group">
              <Image
                src="/devotion-studio-2.png"
                alt="Coach Paulina V. entrenando en Devotion Heat Room"
                fill
                className="object-cover object-top group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-4 right-4 p-3 rounded-2xl backdrop-blur-md bg-black/60 border border-white/15 text-white flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-[#D2C483] uppercase block">
                    Enfoque &amp; Precisión Isométrica
                  </span>
                  <span className="text-[11px] text-stone-300">
                    Activación del core profundo sin impacto articular
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#7B6E86] text-white text-[10px] font-bold shrink-0">
                  HOT PILATES
                </span>
              </div>
            </div>

            <div className="relative rounded-3xl overflow-hidden border border-[#7B6E86]/30 shadow-lg bg-[#1C1824] h-72 sm:h-80 group">
              <Image
                src="/devotion-studio-3.png"
                alt="Sudoración desintoxicante y efecto glow bajo calor infrarrojo a 33°C"
                fill
                className="object-cover object-top group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-4 right-4 p-3 rounded-2xl backdrop-blur-md bg-black/60 border border-white/15 text-white flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-[#D2C483] uppercase block">
                    Efecto Glow &amp; Detox Profundo
                  </span>
                  <span className="text-[11px] text-stone-300">
                    Eliminación de toxinas y estimulación de colágeno natural
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-orange-600 text-white text-[10px] font-bold shrink-0">
                  33°C INFRARROJO
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          5. SECCIÓN: DOS UNIVERSOS COMPLEMENTARIOS (DEVOTION VS STILIZA)
      ───────────────────────────────────────────────────────────────────────────── */}
      <section id="disciplinas" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-black tracking-widest uppercase text-[#7B6E86] dark:text-[#D2C483]">
              Elige tu entrenamiento
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-extrabold tracking-tight">
              Dos Disciplinas · Una Misma Membresía
            </h2>
            <p className="text-sm text-stone-600 dark:text-stone-400">
              Tus tokens son 100% universales. Puedes entrenar hoy en Reformer y mañana en Hot Pilates en cualquiera de nuestras 6 sedes.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Card 1: DEVOTION HEAT ROOM */}
            <div className="relative rounded-3xl overflow-hidden border-2 border-[#7B6E86]/50 bg-gradient-to-b from-[#FAF7F2] to-stone-100 dark:from-[#1E1927] dark:to-[#14101A] p-8 shadow-xl flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-800 text-xs font-black tracking-wider uppercase inline-flex items-center gap-1.5">
                    <Flame className="h-3.5 w-3.5" /> DEVOTION · 33°C INFRARROJO
                  </span>
                  <span className="text-xs font-mono font-bold text-stone-500">12 Tapetes / Sala</span>
                </div>

                <h3 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#231D28] dark:text-white">
                  Inferno Hot Pilates & Sculpt
                </h3>

                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                  Entrenamiento sobre mat en una sala climatizada a 33°C con calor infrarrojo lejano.
                  Combinamos principios de Pilates con intervalos de alta intensidad (HIIT) de bajo
                  impacto, mancuernas ligeras, bandas de resistencia y beats inmersivos.
                </p>

                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2 text-xs text-stone-700 dark:text-stone-300">
                    <Check className="h-4 w-4 text-[#D2C483]" />
                    <span><strong>Full Body Burn:</strong> Enfoque en glúteos, abdomen y postura.</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-stone-700 dark:text-stone-300">
                    <Check className="h-4 w-4 text-[#D2C483]" />
                    <span><strong>Candlelight Soundbath:</strong> Clases de fin de semana con cuencos de cuarzo.</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-stone-700 dark:text-stone-300">
                    <Check className="h-4 w-4 text-[#D2C483]" />
                    <span><strong>Sedes:</strong> Zibatá, Juriquilla y Campanario.</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-stone-500 block">Duración</span>
                  <span className="text-sm font-bold">50 Minutos</span>
                </div>
                <a
                  href={buildWhatsAppLink("Hola! Deseo apartar clase de Hot Pilates en Devotion")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-[#7B6E86] hover:bg-[#685B73] text-white font-bold text-xs shadow-md transition"
                >
                  Agendar en Devotion
                </a>
              </div>
            </div>

            {/* Card 2: STILIZA REFORMER */}
            <div className="relative rounded-3xl overflow-hidden border border-stone-300 dark:border-stone-800 bg-gradient-to-b from-white to-stone-50 dark:from-[#18141F] dark:to-[#110D16] p-8 shadow-lg flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 text-xs font-black tracking-wider uppercase inline-flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-[#7B6E86]" /> STILIZA · REFORMER BOUTIQUE
                  </span>
                  <span className="text-xs font-mono font-bold text-stone-500">5 a 8 Camas / Sala</span>
                </div>

                <h3 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#231D28] dark:text-white">
                  Pilates Reformer de Alta Precisión
                </h3>

                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                  Máquinas Reformer de última generación con resistencia calibrada por resortes.
                  Entrenamiento de resistencia isométrica, elongación miofascial y fortalecimiento
                  del core profundo en grupos reducidos con retroalimentación milimétrica del coach.
                </p>

                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2 text-xs text-stone-700 dark:text-stone-300">
                    <Check className="h-4 w-4 text-[#7B6E86]" />
                    <span><strong>Alineación Espinal:</strong> Corrección postural y fortalecimiento del suelo pélvico.</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-stone-700 dark:text-stone-300">
                    <Check className="h-4 w-4 text-[#7B6E86]" />
                    <span><strong>Reformer Athletic Flow:</strong> Ritmo dinámico coordinado con música.</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-stone-700 dark:text-stone-300">
                    <Check className="h-4 w-4 text-[#7B6E86]" />
                    <span><strong>Sedes:</strong> San Isidro, Juriquilla y Campanario.</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-stone-500 block">Duración</span>
                  <span className="text-sm font-bold">50 Minutos</span>
                </div>
                <a
                  href={buildWhatsAppLink("Hola! Deseo apartar clase de Reformer en Stiliza")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-stone-900 dark:bg-stone-800 hover:bg-stone-800 text-[#D2C483] font-bold text-xs shadow-md transition"
                >
                  Agendar en Stiliza
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          6. SECCIÓN: HORARIOS EN VIVO & DISPONIBILIDAD DE LUGARES
      ───────────────────────────────────────────────────────────────────────────── */}
      <section id="horarios" className="py-20 bg-stone-100/70 dark:bg-[#16121C] border-t border-stone-200 dark:border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-black tracking-widest uppercase text-[#7B6E86] dark:text-[#D2C483]">
                Parrilla en Tiempo Real
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-extrabold tracking-tight mt-1">
                Horarios y Disponibilidad de Lugares
              </h2>
              <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">
                Filtra por sucursal y día para consultar clases, cupos libres y entrenadores asignados.
              </p>
            </div>

            {/* Filtro de Disciplina */}
            <div className="inline-flex rounded-2xl bg-white dark:bg-[#1E1927] p-1 border border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setSelectedDiscipline("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  selectedDiscipline === "all"
                    ? "bg-[#7B6E86] text-white shadow-sm"
                    : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
                }`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setSelectedDiscipline("hot_pilates")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                  selectedDiscipline === "hot_pilates"
                    ? "bg-orange-600 text-white shadow-sm"
                    : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
                }`}
              >
                <Flame className="h-3 w-3" /> Devotion 33°C
              </button>
              <button
                type="button"
                onClick={() => setSelectedDiscipline("reformer")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                  selectedDiscipline === "reformer"
                    ? "bg-stone-900 text-[#D2C483] shadow-sm"
                    : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
                }`}
              >
                <Sparkles className="h-3 w-3" /> Stiliza Reformer
              </button>
            </div>
          </div>

          {/* Filtros de Sucursal & Día */}
          <div className="space-y-3">
            {/* Sucursales */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedBranchId("all")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
                  selectedBranchId === "all"
                    ? "bg-[#7B6E86] text-white border-[#7B6E86] shadow-sm"
                    : "bg-white dark:bg-[#1E1927] text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800 hover:border-[#7B6E86]"
                }`}
              >
                Todas las Sucursales
              </button>
              {branches.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedBranchId(b.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
                    selectedBranchId === b.id
                      ? "bg-[#7B6E86] text-white border-[#7B6E86] shadow-sm"
                      : "bg-white dark:bg-[#1E1927] text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800 hover:border-[#7B6E86]"
                  }`}
                >
                  [{b.brand.toUpperCase()}] {b.name}
                </button>
              ))}
            </div>

            {/* Días de la semana */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {["all", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDay(d)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition border ${
                    selectedDay === d
                      ? "bg-[#D2C483] text-stone-950 border-[#D2C483] font-bold shadow-sm"
                      : "bg-white/60 dark:bg-[#1A1622] text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-800 hover:text-stone-900"
                  }`}
                >
                  {d === "all" ? "Todos los días" : d}
                </button>
              ))}
            </div>
          </div>

          {/* Grilla de Clases Filtradas */}
          {filteredSessions.length === 0 ? (
            <div className="py-16 text-center rounded-3xl bg-white dark:bg-[#1C1824] border border-dashed border-stone-300 dark:border-stone-800">
              <Calendar className="h-10 w-10 text-stone-400 mx-auto mb-2 opacity-60" />
              <p className="text-sm font-bold text-stone-700 dark:text-stone-300">
                No hay clases programadas con los filtros seleccionados
              </p>
              <p className="text-xs text-stone-500 mt-1">
                Intenta seleccionar otro día o sucursal para ver la cartelera activa.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSessions.slice(0, 9).map((ses) => {
                const isHotSes = ses.discipline === "hot_pilates";
                const room = db?.rooms.find((r) => r.id === ses.roomId);
                const totalSpots = room?.spots.length || (isHotSes ? 12 : 8);
                const reservedCount =
                  db?.bookings.filter(
                    (b) => b.sessionId === ses.id && b.status !== "cancelada"
                  ).length || 0;
                const freeSpots = Math.max(0, totalSpots - reservedCount);

                return (
                  <div
                    key={ses.id}
                    className="rounded-2xl p-5 bg-white dark:bg-[#1C1824] border border-stone-200 dark:border-stone-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top: Hora y Badge de Disciplina */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-sm font-black font-mono text-[#7B6E86] dark:text-[#D2C483] flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {ses.startTime} · {ses.durationMinutes || 50} min
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isHotSes
                              ? "bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800"
                              : "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                          }`}
                        >
                          {isHotSes ? "Hot 33°C" : "Reformer"}
                        </span>
                      </div>

                      {/* Título y Sucursal */}
                      <h4 className="font-serif text-base font-extrabold text-stone-900 dark:text-stone-100 group-hover:text-[#7B6E86] dark:group-hover:text-[#D2C483] transition-colors">
                        {ses.title}
                      </h4>
                      <p className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span>{ses.branchName} · {ses.dayOfWeek}</span>
                      </p>

                      {/* Coach info */}
                      <div className="mt-3 flex items-center gap-2.5 pt-3 border-t border-stone-100 dark:border-stone-800/80">
                        <div className="h-8 w-8 rounded-full bg-[#7B6E86]/20 text-[#7B6E86] dark:text-[#D2C483] font-bold text-xs flex items-center justify-center border border-[#7B6E86]/30">
                          {ses.instructorAvatar || "CO"}
                        </div>
                        <div>
                          <span className="text-xs font-bold block">{ses.instructor}</span>
                          <span className="text-[10px] text-stone-400">Coach Oficial</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom: Cupos y CTA */}
                    <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        {freeSpots} de {totalSpots} libres
                      </span>

                      <a
                        href={buildWhatsAppLink(
                          `Hola! Deseo apartar lugar para la clase ${ses.title} en ${ses.branchName} a las ${ses.startTime}`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-[#7B6E86] hover:bg-[#685B73] text-white text-xs font-bold transition flex items-center gap-1 shadow-sm"
                      >
                        <span>Apartar</span>
                        <ArrowRight className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Banner Concierge WhatsApp para reservar cualquier clase */}
          <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-[#1E1927] via-[#2A2135] to-[#1E1927] text-white border border-[#7B6E86]/40 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1.5 text-center sm:text-left">
              <span className="text-xs font-black uppercase tracking-wider text-[#D2C483]">
                Concierge Digital en WhatsApp
              </span>
              <h3 className="font-serif text-xl sm:text-2xl font-bold">
                ¿Prefieres consultar y reservar directamente desde tu celular?
              </h3>
              <p className="text-xs sm:text-sm text-stone-300 max-w-xl">
                Nuestro bot te muestra horarios, disponibilidad de tapetes o máquinas, te envía tu código QR de acceso y resuelve tus dudas las 24 horas.
              </p>
            </div>

            <a
              href={buildWhatsAppLink("Hola! Deseo consultar horarios disponibles")}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3.5 rounded-2xl bg-[#D2C483] hover:bg-[#C2B472] text-stone-950 font-black text-xs tracking-wider uppercase shadow-lg shrink-0 flex items-center gap-2 transition active:scale-95"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Abrir WhatsApp Concierge</span>
            </a>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          7. SECCIÓN: NUESTRAS 6 SUCURSALES EN QUERÉTARO
      ───────────────────────────────────────────────────────────────────────────── */}
      <section id="sucursales" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-black tracking-widest uppercase text-[#7B6E86] dark:text-[#D2C483]">
              Presencia Exclusiva
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-extrabold tracking-tight">
              6 Estudios en Querétaro
            </h2>
            <p className="text-sm text-stone-600 dark:text-stone-400">
              Ubicaciones privilegiadas con estacionamiento, vestidores premium, toallas aromatizadas con eucalipto y amenidades completas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 1. Devotion Zibatá */}
            <div className="rounded-3xl p-6 bg-white dark:bg-[#1C1824] border-2 border-orange-400/40 shadow-sm space-y-4 hover:border-orange-500 transition">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/70 text-orange-800 dark:text-orange-300 text-xs font-bold inline-flex items-center gap-1">
                  <Flame className="h-3 w-3" /> Devotion Hot 33°C
                </span>
                <span className="text-xs font-bold text-stone-400">12 Tapetes</span>
              </div>
              <div>
                <h3 className="font-serif text-xl font-black">Devotion Zibatá</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                  Prolongación Paseo de las Pitahayas #1 A, Local Comercial 203, Condominio Xentric Anáhuac, El Marqués, Qro.
                </p>
              </div>
              <div className="pt-3 border-t border-stone-100 dark:border-stone-800 text-xs text-stone-500 flex items-center justify-between">
                <span>06:00 AM – 09:00 PM</span>
                <a
                  href="https://maps.google.com/?q=Xentric+Anahuac+Zibata"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#7B6E86] dark:text-[#D2C483] font-bold hover:underline inline-flex items-center gap-1"
                >
                  <span>Ver Mapa</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            {/* 2. Devotion Juriquilla */}
            <div className="rounded-3xl p-6 bg-white dark:bg-[#1C1824] border-2 border-orange-400/40 shadow-sm space-y-4 hover:border-orange-500 transition">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/70 text-orange-800 dark:text-orange-300 text-xs font-bold inline-flex items-center gap-1">
                  <Flame className="h-3 w-3" /> Devotion Hot 33°C
                </span>
                <span className="text-xs font-bold text-stone-400">12 Tapetes</span>
              </div>
              <div>
                <h3 className="font-serif text-xl font-black">Devotion Juriquilla</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                  Blvd. de las Ciencias #2069, Local 206, Plaza Santa Fe, Juriquilla, Querétaro.
                </p>
              </div>
              <div className="pt-3 border-t border-stone-100 dark:border-stone-800 text-xs text-stone-500 flex items-center justify-between">
                <span>06:00 AM – 09:00 PM</span>
                <a
                  href="https://maps.google.com/?q=Plaza+Santa+Fe+Juriquilla"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#7B6E86] dark:text-[#D2C483] font-bold hover:underline inline-flex items-center gap-1"
                >
                  <span>Ver Mapa</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            {/* 3. Devotion Campanario */}
            <div className="rounded-3xl p-6 bg-white dark:bg-[#1C1824] border-2 border-orange-400/40 shadow-sm space-y-4 hover:border-orange-500 transition">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/70 text-orange-800 dark:text-orange-300 text-xs font-bold inline-flex items-center gap-1">
                  <Flame className="h-3 w-3" /> Devotion Hot 33°C
                </span>
                <span className="text-xs font-bold text-stone-400">12 Tapetes</span>
              </div>
              <div>
                <h3 className="font-serif text-xl font-black">Devotion Campanario</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                  Campanario #1101, Local 302, La Purísima, Santiago de Querétaro, Qro.
                </p>
              </div>
              <div className="pt-3 border-t border-stone-100 dark:border-stone-800 text-xs text-stone-500 flex items-center justify-between">
                <span>06:00 AM – 09:00 PM</span>
                <a
                  href="https://maps.google.com/?q=Campanario+1101+Queretaro"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#7B6E86] dark:text-[#D2C483] font-bold hover:underline inline-flex items-center gap-1"
                >
                  <span>Ver Mapa</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            {/* 4. Stiliza San Isidro */}
            <div className="rounded-3xl p-6 bg-white dark:bg-[#1C1824] border border-stone-200 dark:border-stone-800 shadow-sm space-y-4 hover:border-[#7B6E86] transition">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 text-xs font-bold inline-flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Stiliza Reformer
                </span>
                <span className="text-xs font-bold text-stone-400">5 Máquinas</span>
              </div>
              <div>
                <h3 className="font-serif text-xl font-black">Stiliza San Isidro</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                  Av. San Isidro #88, Local 4, Juriquilla, Querétaro.
                </p>
              </div>
              <div className="pt-3 border-t border-stone-100 dark:border-stone-800 text-xs text-stone-500 flex items-center justify-between">
                <span>06:00 AM – 09:00 PM</span>
                <span className="text-stone-400">Reformer Boutique</span>
              </div>
            </div>

            {/* 5. Stiliza Juriquilla */}
            <div className="rounded-3xl p-6 bg-white dark:bg-[#1C1824] border border-stone-200 dark:border-stone-800 shadow-sm space-y-4 hover:border-[#7B6E86] transition">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 text-xs font-bold inline-flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Stiliza Reformer
                </span>
                <span className="text-xs font-bold text-stone-400">8 Máquinas</span>
              </div>
              <div>
                <h3 className="font-serif text-xl font-black">Stiliza Juriquilla</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                  Blvd. Universitario #540, Plaza Central, Juriquilla, Qro.
                </p>
              </div>
              <div className="pt-3 border-t border-stone-100 dark:border-stone-800 text-xs text-stone-500 flex items-center justify-between">
                <span>06:00 AM – 09:00 PM</span>
                <span className="text-stone-400">Reformer Boutique</span>
              </div>
            </div>

            {/* 6. Stiliza Campanario */}
            <div className="rounded-3xl p-6 bg-white dark:bg-[#1C1824] border border-stone-200 dark:border-stone-800 shadow-sm space-y-4 hover:border-[#7B6E86] transition">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 text-xs font-bold inline-flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Stiliza Reformer
                </span>
                <span className="text-xs font-bold text-amber-500 font-semibold">Próxima Apertura</span>
              </div>
              <div>
                <h3 className="font-serif text-xl font-black">Stiliza Campanario</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                  Hacienda Campanario #99, Local 12, Querétaro, Qro.
                </p>
              </div>
              <div className="pt-3 border-t border-stone-100 dark:border-stone-800 text-xs text-stone-500 flex items-center justify-between">
                <span>En Acondicionamiento</span>
                <span className="text-stone-400">Pre-venta Activa</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          8. SECCIÓN: MEMBRESÍAS & PAQUETES DE TOKENS TRANSPARENTES
      ───────────────────────────────────────────────────────────────────────────── */}
      <section id="paquetes" className="py-20 bg-stone-100/70 dark:bg-[#16121C] border-t border-stone-200 dark:border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-black tracking-widest uppercase text-[#7B6E86] dark:text-[#D2C483]">
              Inversión en tu Bienestar
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-extrabold tracking-tight">
              Paquetes de Tokens & Membresías
            </h2>
            <p className="text-sm text-stone-600 dark:text-stone-400">
              Sin letras chiquitas. Paga por clase o elige un paquete con precio preferencial.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {/* Paquete 1: Single Drop-In */}
            <div className="rounded-3xl p-6 bg-white dark:bg-[#1C1824] border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-stone-400">
                  Prueba de 1 Clase
                </span>
                <h3 className="font-serif text-xl font-bold">Single Drop-In</h3>
                <div className="pt-2">
                  <span className="text-3xl font-black font-mono">$350</span>
                  <span className="text-xs text-stone-400 font-medium"> MXN</span>
                </div>
                <p className="text-xs text-stone-500">
                  1 Token válido por 15 días en cualquier sucursal.
                </p>
              </div>

              <div className="space-y-2 pt-4 border-t border-stone-100 dark:border-stone-800 text-xs text-stone-600 dark:text-stone-400">
                <div className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-[#7B6E86]" />
                  <span>Acceso a Hot Pilates o Reformer</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-[#7B6E86]" />
                  <span>Toalla y lockers incluidos</span>
                </div>
              </div>

              <a
                href={buildWhatsAppLink("Hola! Deseo adquirir 1 Token Drop-In ($350 MXN)")}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-[#7B6E86] hover:text-white text-stone-800 dark:text-stone-200 text-center font-bold text-xs transition"
              >
                Comprar Token
              </a>
            </div>

            {/* Paquete 2: Sculpt & Flow 8 */}
            <div className="rounded-3xl p-6 bg-white dark:bg-[#1C1824] border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-stone-400">
                  2 Clases / Semana
                </span>
                <h3 className="font-serif text-xl font-bold">Sculpt & Flow</h3>
                <div className="pt-2">
                  <span className="text-3xl font-black font-mono">$2,400</span>
                  <span className="text-xs text-stone-400 font-medium"> MXN</span>
                </div>
                <p className="text-xs text-stone-500">
                  8 Tokens ($300/clase) · Vigencia 35 días.
                </p>
              </div>

              <div className="space-y-2 pt-4 border-t border-stone-100 dark:border-stone-800 text-xs text-stone-600 dark:text-stone-400">
                <div className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-[#7B6E86]" />
                  <span>Ideal para constancia y tono</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-[#7B6E86]" />
                  <span>Ahorras $400 contra precio suelto</span>
                </div>
              </div>

              <a
                href={buildWhatsAppLink("Hola! Deseo adquirir el paquete Sculpt & Flow (8 Tokens - $2,400 MXN)")}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-[#7B6E86] hover:text-white text-stone-800 dark:text-stone-200 text-center font-bold text-xs transition"
              >
                Elegir Pack 8
              </a>
            </div>

            {/* Paquete 3: Sculpt & Burn 16 (DESTACADO) */}
            <div className="rounded-3xl p-6 bg-gradient-to-b from-[#FAF7F2] to-amber-50/40 dark:from-[#231C2D] dark:to-[#17121F] border-2 border-[#D2C483] shadow-xl flex flex-col justify-between space-y-6 relative scale-[1.02]">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#D2C483] text-stone-950 text-[10px] font-black tracking-wider uppercase shadow-md">
                ★ MÁS POPULAR
              </div>

              <div className="space-y-3 pt-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#7B6E86] dark:text-[#D2C483]">
                  4 Clases / Semana
                </span>
                <h3 className="font-serif text-xl font-bold">Sculpt & Burn</h3>
                <div className="pt-2">
                  <span className="text-3xl font-black font-mono text-[#231D28] dark:text-white">$4,200</span>
                  <span className="text-xs text-stone-400 font-medium"> MXN</span>
                </div>
                <p className="text-xs text-stone-600 dark:text-stone-300 font-medium">
                  16 Tokens ($262/clase) · Vigencia 45 días.
                </p>
              </div>

              <div className="space-y-2 pt-4 border-t border-[#D2C483]/30 text-xs text-stone-700 dark:text-stone-300">
                <div className="flex items-center gap-1.5 font-semibold">
                  <Check className="h-4 w-4 text-[#D2C483]" />
                  <span>Ahorro máximo de $1,400 MXN</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-[#D2C483]" />
                  <span>Reserva prioritaria en horarios pico</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-[#D2C483]" />
                  <span>Acceso a clases con DJ y Soundbath</span>
                </div>
              </div>

              <a
                href={buildWhatsAppLink("Hola! Deseo adquirir el paquete más popular Sculpt & Burn (16 Tokens - $4,200 MXN)")}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 rounded-xl bg-[#7B6E86] hover:bg-[#685B73] text-white text-center font-black text-xs tracking-wider uppercase shadow-md transition"
              >
                Comprar Pack 16
              </a>
            </div>

            {/* Paquete 4: Black Pass */}
            <div className="rounded-3xl p-6 bg-white dark:bg-[#1C1824] border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-stone-400">
                  Pase Ilimitado
                </span>
                <h3 className="font-serif text-xl font-bold">Black Pass</h3>
                <div className="pt-2">
                  <span className="text-3xl font-black font-mono">$5,900</span>
                  <span className="text-xs text-stone-400 font-medium"> MXN</span>
                </div>
                <p className="text-xs text-stone-500">
                  30 Tokens · Vigencia 45 días.
                </p>
              </div>

              <div className="space-y-2 pt-4 border-t border-stone-100 dark:border-stone-800 text-xs text-stone-600 dark:text-stone-400">
                <div className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-[#7B6E86]" />
                  <span>Para devotas que entrenan a diario</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-[#7B6E86]" />
                  <span>Sin costo por cancelaciones tardías</span>
                </div>
              </div>

              <a
                href={buildWhatsAppLink("Hola! Deseo adquirir el Black Pass Ilimitado ($5,900 MXN)")}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-[#7B6E86] hover:text-white text-stone-800 dark:text-stone-200 text-center font-bold text-xs transition"
              >
                Elegir Black Pass
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          9. SECCIÓN: COACHES & COMUNIDAD DEVOTION
      ───────────────────────────────────────────────────────────────────────────── */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-black tracking-widest uppercase text-[#7B6E86] dark:text-[#D2C483]">
              Nuestras Entrenadoras
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-extrabold tracking-tight">
              Inspiración, Técnica & Energía
            </h2>
            <p className="text-sm text-stone-600 dark:text-stone-400">
              Coaches certificadas en biomecánica, acondicionamiento físico funcional y control postural.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {coaches.map((c) => (
              <div
                key={c.id}
                className="rounded-3xl p-5 bg-white dark:bg-[#1C1824] border border-stone-200 dark:border-stone-800 text-center space-y-3 hover:border-[#7B6E86] transition group"
              >
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-[#7B6E86] to-[#554960] text-[#D2C483] font-serif font-black text-2xl flex items-center justify-center mx-auto shadow-md border-2 border-[#D2C483]/30 group-hover:scale-105 transition-transform">
                  {c.avatar}
                </div>
                <div>
                  <h4 className="font-serif text-sm font-bold text-stone-900 dark:text-white">
                    {c.name}
                  </h4>
                  <p className="text-[10px] text-stone-400 mt-0.5 capitalize">
                    {c.specialty === "hot_pilates"
                      ? "Hot Pilates 33°C"
                      : c.specialty === "reformer"
                      ? "Pilates Reformer"
                      : "Reformer & Hot Pilates"}
                  </p>
                </div>
                <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
                  <span className="text-[10px] font-bold text-[#7B6E86] dark:text-[#D2C483] block truncate">
                    {c.vibeBadge}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          10. SECCIÓN: PREGUNTAS FRECUENTES (FAQ)
      ───────────────────────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-20 bg-stone-100/70 dark:bg-[#16121C] border-t border-stone-200 dark:border-stone-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-black tracking-widest uppercase text-[#7B6E86] dark:text-[#D2C483]">
              Resuelve tus Dudas
            </span>
            <h2 className="font-serif text-3xl font-extrabold tracking-tight">
              Preguntas Frecuentes
            </h2>
          </div>

          <div className="space-y-3">
            {[
              {
                q: "¿Qué debo llevar a mi primera clase en Devotion?",
                a: "Para Hot Pilates (33°C): Trae ropa deportiva cómoda, toalla de entrenamiento y termo con agua para hidratarte. Para Reformer: Es obligatorio el uso de calcetas con agarre antiderrapante (grip socks). Contamos con toallas y amenidades en sucursal.",
              },
              {
                q: "¿Qué tan caliente se siente la sala a 33°C?",
                a: "A 33°C el calor es suave, terapéutico y envolvente. A diferencia de un sauna tradicional, no te faltará el aire: los paneles infrarrojos calientan tu cuerpo desde adentro, promoviendo flexibilidad y sudoración desintoxicante sin sensación de asfixia.",
              },
              {
                q: "¿Puedo usar mis tokens en cualquiera de las 6 sucursales?",
                a: "¡Sí! Todos los paquetes de Stiliza & Devotion son universales y multisede. Puedes agendar indistintamente en Zibatá, Juriquilla, Campanario o San Isidro tanto en Hot Pilates como en Reformer.",
              },
              {
                q: "¿Cómo funciona el check-in al llegar al estudio?",
                a: "Al reservar una clase por WhatsApp o la web, recibes de inmediato un código QR en tu teléfono. Al llegar a la recepción, simplemente muestras tu código ante la cámara del Kiosco táctil y tu asistencia quedará registrada al instante.",
              },
              {
                q: "¿Cuál es la política de cancelaciones?",
                a: "Puedes cancelar o reagendar cualquier clase hasta 4 horas antes de su inicio sin penalización alguna; el token regresará a tu saldo automáticamente.",
              },
            ].map((faq, idx) => (
              <div
                key={idx}
                className="rounded-2xl bg-white dark:bg-[#1C1824] border border-stone-200 dark:border-stone-800 overflow-hidden shadow-sm transition"
              >
                <button
                  type="button"
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full p-5 text-left font-bold text-sm flex items-center justify-between gap-4"
                >
                  <span className="text-stone-900 dark:text-stone-100">{faq.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-stone-400 transition-transform ${
                      activeFaq === idx ? "rotate-180 text-[#7B6E86]" : ""
                    }`}
                  />
                </button>
                {activeFaq === idx && (
                  <div className="px-5 pb-5 text-xs text-stone-600 dark:text-stone-400 leading-relaxed border-t border-stone-100 dark:border-stone-800/80 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          11. FOOTER EDITORIAL DE LUJO
      ───────────────────────────────────────────────────────────────────────────── */}
      <footer className="bg-[#131017] text-[#EDE7DF] border-t border-[#7B6E86]/30 pt-16 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            {/* Columna Marca */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl overflow-hidden border border-[#D2C483]/40 bg-[#7B6E86] p-0.5">
                  <Image
                    src="/devotion-logo.png"
                    alt="Devotion Logo"
                    width={80}
                    height={80}
                    className="w-full h-full object-cover rounded-xl"
                  />
                </div>
                <div>
                  <span className="font-serif text-xl font-bold tracking-wider text-white block">
                    DEVOTION
                  </span>
                  <span className="text-[10px] font-serif tracking-[0.2em] text-[#D2C483] block uppercase">
                    HEAT ROOM · STILIZA
                  </span>
                </div>
              </div>

              <p className="text-xs text-stone-400 leading-relaxed max-w-sm">
                Pioneros en entrenamiento de calor infrarrojo a 33°C y Pilates Reformer de alta
                precisión en Querétaro. Transforma tu cuerpo y mente en un entorno boutique exclusivo.
              </p>

              <div className="flex items-center gap-3 pt-2">
                <a
                  href="https://www.instagram.com/devotion_heatroom/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#D2C483] transition"
                  aria-label="Instagram de Devotion"
                >
                  <Instagram className="h-4 w-4" />
                </a>
                <a
                  href={buildWhatsAppLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-emerald-400 transition"
                  aria-label="WhatsApp Concierge"
                >
                  <MessageCircle className="h-4 w-4" />
                </a>
              </div>
            </div>

            {/* Columna Disciplinas */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#D2C483]">
                Disciplinas
              </h4>
              <ul className="space-y-2 text-xs text-stone-400">
                <li>Hot Pilates 33°C</li>
                <li>Sculpt & Tone</li>
                <li>Candlelight Soundbath</li>
                <li>Reformer Athletic</li>
                <li>Core & Stretching</li>
              </ul>
            </div>

            {/* Columna Sucursales */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#D2C483]">
                Sedes Querétaro
              </h4>
              <ul className="space-y-2 text-xs text-stone-400">
                <li>Devotion Zibatá (Xentric)</li>
                <li>Devotion Juriquilla (Santa Fe)</li>
                <li>Devotion Campanario</li>
                <li>Stiliza San Isidro</li>
                <li>Stiliza Juriquilla</li>
                <li>Stiliza Campanario</li>
              </ul>
            </div>

            {/* Columna Horario & Atención */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#D2C483]">
                Atención &amp; Horarios
              </h4>
              <ul className="space-y-2 text-xs text-stone-400">
                <li>Lunes a Viernes: 06:00 a 21:00 hrs</li>
                <li>Sábados y Domingos: 08:00 a 14:00 hrs</li>
                <li>
                  <a
                    href="tel:+524427804461"
                    className="hover:text-[#D2C483] transition"
                  >
                    +52 442 780 4461
                  </a>
                </li>
                <li>
                  <Link href="/privacidad" className="hover:text-white transition">
                    Aviso de Privacidad
                  </Link>
                </li>
                <li className="pt-2 text-[11px] text-stone-500 font-mono">
                  Querétaro, Qro. · devotion-mx.com
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
            <p>© {new Date().getFullYear()} Devotion Heat Room & Stiliza Reformer. Todos los derechos reservados.</p>
            <p className="flex items-center gap-1 text-[#D2C483]">
              <span>Hecho con devoción para la comunidad de Querétaro.</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

