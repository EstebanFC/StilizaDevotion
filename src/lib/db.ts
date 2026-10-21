import fs from "fs";
import os from "os";
import path from "path";
import {
  AggregatorConnection,
  Booking,
  BookingSource,
  Branch,
  ChatMessage,
  ClassPackage,
  ClassSession,
  Client,
  Coach,
  CRMDatabaseState,
  ExternalAggregator,
  KioskCheckInResult,
  SpotConfig,
  StudioPromoEvent,
  StudioRoom,
} from "@/types/crm";

const DATA_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), "stiliza-data")
  : path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "crm-store-v3.json");

function buildReformerSpots(
  count: number,
  cols: number,
  prefix = "R"
): SpotConfig[] {
  const spots: SpotConfig[] = [];
  for (let i = 1; i <= count; i++) {
    const num = String(i).padStart(2, "0");
    const row = Math.floor((i - 1) / cols) + 1;
    const col = ((i - 1) % cols) + 1;
    const zone =
      row === 1
        ? "Frente al Espejo"
        : row === 2
        ? "Fila Central"
        : "Zona Posterior";
    spots.push({
      id: `${prefix}-${num}`,
      label: `Máquina Reformer #${num}`,
      shortLabel: `${prefix}${num}`,
      row,
      col,
      zone,
      type: "reformer_machine",
      status: "available",
    });
  }
  return spots;
}

function buildHotMatSpots(
  count: number,
  cols: number,
  prefix = "M"
): SpotConfig[] {
  const spots: SpotConfig[] = [];
  for (let i = 1; i <= count; i++) {
    const num = String(i).padStart(2, "0");
    const row = Math.floor((i - 1) / cols) + 1;
    const col = ((i - 1) % cols) + 1;
    const zone =
      row === 1
        ? "Frente al Espejo"
        : row === 2
        ? "Cerca de Paneles IR"
        : row === 3
        ? "Fila Central"
        : "Zona Posterior";
    spots.push({
      id: `${prefix}-${num}`,
      label: `Tapete Hot Mat #${num}`,
      shortLabel: `${prefix}${num}`,
      row,
      col,
      zone,
      type: "hot_mat",
      status: "available",
    });
  }
  return spots;
}

export function getInitialSeedData(): CRMDatabaseState {
  const today = "2026-10-19";
  const tomorrow = "2026-10-20";

  const branches: Branch[] = [
    {
      id: "br-stiliza-polanco",
      brand: "Stiliza",
      name: "Stiliza · Polanco Flagship",
      address: "Av. Pdte. Masaryk 410, Polanco",
      kiosksCount: 3,
      monthlyRevenueMXN: 348000,
    },
    {
      id: "br-devotion-roma",
      brand: "Devotion",
      name: "Devotion · Roma Norte Chamber",
      address: "Colima 180, Roma Norte",
      kiosksCount: 2,
      monthlyRevenueMXN: 295000,
    },
    {
      id: "br-stiliza-lomas",
      brand: "Stiliza",
      name: "Stiliza · Lomas Privé",
      address: "Monte Athos 215, Lomas de Chapultepec",
      kiosksCount: 2,
      monthlyRevenueMXN: 264000,
    },
    {
      id: "br-devotion-condesa",
      brand: "Devotion",
      name: "Devotion · Condesa Infrared Loft",
      address: "Av. Amsterdam 92, Hipódromo Condesa",
      kiosksCount: 2,
      monthlyRevenueMXN: 312000,
    },
  ];

  const coaches: Coach[] = [
    {
      id: "coach-1",
      name: "Coach Daniela R.",
      avatar: "DR",
      specialty: "reformer",
      occupancyRate: 98,
      vibeBadge: "✨ Reina del Core & Reformer",
    },
    {
      id: "coach-2",
      name: "Coach Paulina V.",
      avatar: "PV",
      specialty: "hot_pilates",
      occupancyRate: 95,
      vibeBadge: "🔥 Queen del Inferno 38°C",
    },
    {
      id: "coach-3",
      name: "Coach Alejandra M.",
      avatar: "AM",
      specialty: "reformer",
      occupancyRate: 93,
      vibeBadge: "⚡ Athletic Flow Master",
    },
    {
      id: "coach-4",
      name: "Coach Fernanda L.",
      avatar: "FL",
      specialty: "hot_pilates",
      occupancyRate: 96,
      vibeBadge: "🕯️ Candlelight & Detox Guru",
    },
    {
      id: "coach-5",
      name: "Coach Valentina S.",
      avatar: "VS",
      specialty: "ambas",
      occupancyRate: 91,
      vibeBadge: "🍑 Glute & Sculpt Specialist",
    },
  ];

  const promosAndEvents: StudioPromoEvent[] = [
    {
      id: "ev-1",
      title: "DJ Live Sunset Reformer + Matcha Bar",
      description:
        "Sesión especial de 60 min con DJ en vivo, iluminación ámbar y barra de Iced Matcha Ceremonial al terminar.",
      type: "clase_especial",
      dateLabel: "Viernes 20:00 hrs",
      highlightBadge: "🎧 DJ en Vivo",
      priceText: "1 Token de tu paquete",
      branchId: "br-stiliza-polanco",
      branchName: "Stiliza · Polanco Flagship",
    },
    {
      id: "ev-2",
      title: "Candlelight Soundbath & Hot Pilates 38°C",
      description:
        "40 min de Sculpt intenso con calor infrarrojo + 20 min de inmersión sonora con cuencos de cuarzo.",
      type: "evento",
      dateLabel: "Sábado 10:30 hrs",
      highlightBadge: "🕯️ Experiencia Sensorial",
      priceText: "1 Token · Cupo 16 tapetes",
      branchId: "br-devotion-roma",
      branchName: "Devotion · Roma Norte Chamber",
    },
    {
      id: "ev-3",
      title: "Promo Kiosco: +3 Tokens Gratis en Pack 16",
      description:
        "Recarga hoy directamente en esta tablet el paquete Sculpt & Burn 16 y recibe 19 tokens + calcetines antiderrapantes.",
      type: "promo",
      dateLabel: "Vigente toda la semana",
      highlightBadge: "🎁 +3 Tokens Gratis",
      priceText: "$4,200 MXN",
      branchId: "all",
      branchName: "Todas las sucursales Stiliza & Devotion",
    },
    {
      id: "ev-4",
      title: "Reto 21 Días: Sculpt & Sweat Challenge",
      description:
        "Completa 15 check-ins con tu código QR en 21 días y gana 5 tokens de regalo + kit de bienvenida.",
      type: "evento",
      dateLabel: "Inscripciones abiertas",
      highlightBadge: "🏆 Premio 5 Tokens",
      priceText: "Incluido en tu membresía",
      branchId: "all",
      branchName: "Todas las sucursales Stiliza & Devotion",
    },
  ];

  const rooms: StudioRoom[] = [
    {
      id: "room-reformer-a",
      branchId: "br-stiliza-polanco",
      branchName: "Stiliza · Polanco Flagship",
      brand: "Stiliza",
      name: "Salón Reformer Signature (Polanco)",
      discipline: "reformer",
      temperature: "21°C Climatizado · Iluminación Cálida",
      rows: 3,
      cols: 4,
      spots: buildReformerSpots(12, 4, "R"),
    },
    {
      id: "room-hot-b",
      branchId: "br-devotion-roma",
      branchName: "Devotion · Roma Norte Chamber",
      brand: "Devotion",
      name: "Hot Pilates Infrared Chamber (Roma)",
      discipline: "hot_pilates",
      temperature: "38.5°C Paneles Infrarrojos · 45% Humedad",
      rows: 4,
      cols: 4,
      spots: buildHotMatSpots(16, 4, "M"),
    },
    {
      id: "room-reformer-lomas",
      branchId: "br-stiliza-lomas",
      branchName: "Stiliza · Lomas Privé",
      brand: "Stiliza",
      name: "Reformer Privé Loft (Lomas)",
      discipline: "reformer",
      temperature: "21°C Climatizado · Vista Jardín",
      rows: 2,
      cols: 4,
      spots: buildReformerSpots(8, 4, "RL"),
    },
    {
      id: "room-hot-condesa",
      branchId: "br-devotion-condesa",
      branchName: "Devotion · Condesa Infrared Loft",
      brand: "Devotion",
      name: "Hot Mat Sanctuary 38°C (Condesa)",
      discipline: "hot_pilates",
      temperature: "38.5°C Infrarrojo · Aromaterapia Eucalipto",
      rows: 3,
      cols: 4,
      spots: buildHotMatSpots(12, 4, "MC"),
    },
  ];

  const packages: ClassPackage[] = [
    {
      id: "pkg-dropin",
      name: "Single Drop-In (1 Token)",
      credits: 1,
      priceMXN: 380,
      validityDays: 15,
      allowedDisciplines: ["reformer", "hot_pilates"],
      promoTag: "Acceso inmediato",
    },
    {
      id: "pkg-devotion-8",
      name: "Devotion & Stiliza 8 Tokens",
      credits: 8,
      priceMXN: 2450,
      validityDays: 30,
      allowedDisciplines: ["reformer", "hot_pilates"],
      badge: "Más Vendido",
      promoTag: "$306 por clase",
    },
    {
      id: "pkg-sculpt-16",
      name: "Sculpt & Burn 16 Tokens (+3 Gratis)",
      credits: 19,
      priceMXN: 4200,
      validityDays: 45,
      allowedDisciplines: ["reformer", "hot_pilates"],
      badge: "Promo Kiosco 🔥",
      promoTag: "Incluye 3 tokens de regalo",
    },
    {
      id: "pkg-unlimited",
      name: "Black Pass 30 Tokens (Multi-Sucursal)",
      credits: 30,
      priceMXN: 5400,
      validityDays: 30,
      allowedDisciplines: ["reformer", "hot_pilates"],
      badge: "VIP All-Access",
      promoTag: "Acceso prioritario a eventos",
    },
  ];

  const clients: Client[] = [
    {
      id: "cli-1",
      name: "Valeria Montemayor",
      phone: "+52 987 871 0684",
      email: "valeria.m@gmail.com",
      avatarInitials: "VM",
      activePackageName: "Sculpt & Burn 16 Tokens",
      creditsRemaining: 11,
      creditsTotal: 16,
      packageExpiresAt: "2026-11-25",
      status: "activo",
      totalAttended: 42,
      noShowsCount: 0,
      preferredSpot: "R-03",
      homeBranchName: "Stiliza · Polanco Flagship",
      medicalNotes: "Ninguna lesión. Prefiere resorte pesado en piernas.",
      joinedAt: "2025-08-14",
    },
    {
      id: "cli-2",
      name: "Camila Elizondo",
      phone: "+52 55 9102 3341",
      email: "camila.elizondo@outlook.com",
      avatarInitials: "CE",
      activePackageName: "Devotion & Stiliza 8 Tokens",
      creditsRemaining: 2,
      creditsTotal: 8,
      packageExpiresAt: "2026-10-29",
      status: "pocos_creditos",
      totalAttended: 19,
      noShowsCount: 1,
      preferredSpot: "M-06",
      homeBranchName: "Devotion · Roma Norte Chamber",
      medicalNotes: "Cuidado muñeca derecha en planchas.",
      joinedAt: "2026-01-10",
    },
    {
      id: "cli-3",
      name: "Sofía Villalobos",
      phone: "+52 55 7734 1289",
      email: "sofi.villalobos@icloud.com",
      avatarInitials: "SV",
      activePackageName: "Black Pass 30 Tokens",
      creditsRemaining: 24,
      creditsTotal: 30,
      packageExpiresAt: "2026-11-18",
      status: "activo",
      totalAttended: 86,
      noShowsCount: 0,
      preferredSpot: "R-01",
      homeBranchName: "Stiliza · Polanco Flagship",
      medicalNotes: "Alumna VIP embajadora.",
      joinedAt: "2025-03-02",
    },
    {
      id: "cli-4",
      name: "Mariana Garza",
      phone: "+52 81 2345 6780",
      email: "mariana.garza@gmail.com",
      avatarInitials: "MG",
      activePackageName: "Devotion & Stiliza 8 Tokens",
      creditsRemaining: 6,
      creditsTotal: 8,
      packageExpiresAt: "2026-11-15",
      status: "activo",
      totalAttended: 14,
      noShowsCount: 0,
      preferredSpot: "M-02",
      homeBranchName: "Devotion · Condesa Infrared Loft",
      joinedAt: "2026-05-20",
    },
    {
      id: "cli-5",
      name: "Diego Santillán",
      phone: "+52 55 6190 4422",
      email: "dsantillan@empresa.mx",
      avatarInitials: "DS",
      activePackageName: "Single Drop-In (1 Token)",
      creditsRemaining: 0,
      creditsTotal: 1,
      packageExpiresAt: "2026-10-20",
      status: "sin_creditos",
      totalAttended: 5,
      noShowsCount: 3,
      preferredSpot: "R-08",
      homeBranchName: "Stiliza · Lomas Privé",
      medicalNotes: "Tensión lumbar ocasional. Suele llegar 5 min tarde.",
      joinedAt: "2026-09-01",
    },
    {
      id: "cli-6",
      name: "Renata Altamirano",
      phone: "+52 55 3398 1120",
      email: "renata.alt@gmail.com",
      avatarInitials: "RA",
      activePackageName: "Sculpt & Burn 16 Tokens",
      creditsRemaining: 14,
      creditsTotal: 16,
      packageExpiresAt: "2026-11-30",
      status: "activo",
      totalAttended: 31,
      noShowsCount: 0,
      preferredSpot: "M-05",
      homeBranchName: "Devotion · Roma Norte Chamber",
      joinedAt: "2025-11-11",
    },
  ];

  const sessions: ClassSession[] = [
    {
      id: "ses-1",
      title: "Sculpt & Lengthen Reformer",
      discipline: "reformer",
      branchId: "br-stiliza-polanco",
      branchName: "Stiliza · Polanco Flagship",
      brand: "Stiliza",
      roomId: "room-reformer-a",
      roomName: "Salón Reformer Signature (Polanco)",
      instructor: "Coach Daniela R.",
      instructorAvatar: "DR",
      date: today,
      startTime: "07:00",
      durationMinutes: 50,
      level: "Todos los niveles",
      intensity: "Alta",
    },
    {
      id: "ses-2",
      title: "Inferno Hot Pilates 38°C · Glute & Core",
      discipline: "hot_pilates",
      branchId: "br-devotion-roma",
      branchName: "Devotion · Roma Norte Chamber",
      brand: "Devotion",
      roomId: "room-hot-b",
      roomName: "Hot Pilates Infrared Chamber (Roma)",
      instructor: "Coach Paulina V.",
      instructorAvatar: "PV",
      date: today,
      startTime: "08:30",
      durationMinutes: 50,
      level: "Todos los niveles",
      intensity: "Intensa 🔥",
    },
    {
      id: "ses-3",
      title: "Athletic Reformer Flow",
      discipline: "reformer",
      branchId: "br-stiliza-polanco",
      branchName: "Stiliza · Polanco Flagship",
      brand: "Stiliza",
      roomId: "room-reformer-a",
      roomName: "Salón Reformer Signature (Polanco)",
      instructor: "Coach Alejandra M.",
      instructorAvatar: "AM",
      date: today,
      startTime: "18:30",
      durationMinutes: 50,
      level: "Intermedio",
      intensity: "Alta",
    },
    {
      id: "ses-4",
      title: "Candlelight Hot Pilates Detox 38°C",
      discipline: "hot_pilates",
      branchId: "br-devotion-roma",
      branchName: "Devotion · Roma Norte Chamber",
      brand: "Devotion",
      roomId: "room-hot-b",
      roomName: "Hot Pilates Infrared Chamber (Roma)",
      instructor: "Coach Fernanda L.",
      instructorAvatar: "FL",
      date: today,
      startTime: "19:30",
      durationMinutes: 50,
      level: "Todos los niveles",
      intensity: "Intensa 🔥",
      isSpecialClass: true,
      specialBadge: "🕯️ Candlelight",
    },
    {
      id: "ses-5",
      title: "Lomas Privé Reformer Sculpt",
      discipline: "reformer",
      branchId: "br-stiliza-lomas",
      branchName: "Stiliza · Lomas Privé",
      brand: "Stiliza",
      roomId: "room-reformer-lomas",
      roomName: "Reformer Privé Loft (Lomas)",
      instructor: "Coach Valentina S.",
      instructorAvatar: "VS",
      date: today,
      startTime: "19:00",
      durationMinutes: 50,
      level: "Todos los niveles",
      intensity: "Alta",
    },
    {
      id: "ses-6",
      title: "Condesa Sweat & Burn 38°C",
      discipline: "hot_pilates",
      branchId: "br-devotion-condesa",
      branchName: "Devotion · Condesa Infrared Loft",
      brand: "Devotion",
      roomId: "room-hot-condesa",
      roomName: "Hot Mat Sanctuary 38°C (Condesa)",
      instructor: "Coach Paulina V.",
      instructorAvatar: "PV",
      date: tomorrow,
      startTime: "09:00",
      durationMinutes: 50,
      level: "Todos los niveles",
      intensity: "Intensa 🔥",
    },
  ];

  const bookings: Booking[] = [
    {
      id: "bk-101",
      qrToken: "SD-2026-R03-7741",
      clientId: "cli-1",
      clientName: "Valeria Montemayor",
      clientPhone: "+52 987 871 0684",
      sessionId: "ses-3",
      sessionTitle: "Athletic Reformer Flow",
      discipline: "reformer",
      branchId: "br-stiliza-polanco",
      branchName: "Stiliza · Polanco Flagship",
      roomName: "Salón Reformer Signature (Polanco)",
      instructor: "Coach Alejandra M.",
      date: today,
      startTime: "18:30",
      spotId: "R-03",
      spotLabel: "Máquina Reformer #03",
      status: "confirmada",
      bookedVia: "whatsapp_bot",
      whatsappSent: true,
      createdAt: "2026-10-19T11:20:00-06:00",
    },
    {
      id: "bk-102",
      qrToken: "SD-2026-R01-9920",
      clientId: "cli-3",
      clientName: "Sofía Villalobos",
      clientPhone: "+52 55 7734 1289",
      sessionId: "ses-3",
      sessionTitle: "Athletic Reformer Flow",
      discipline: "reformer",
      branchId: "br-stiliza-polanco",
      branchName: "Stiliza · Polanco Flagship",
      roomName: "Salón Reformer Signature (Polanco)",
      instructor: "Coach Alejandra M.",
      date: today,
      startTime: "18:30",
      spotId: "R-01",
      spotLabel: "Máquina Reformer #01",
      status: "asistio",
      bookedVia: "kiosk_tablet",
      whatsappSent: true,
      createdAt: "2026-10-19T09:15:00-06:00",
      checkedInAt: "2026-10-19T18:18:00-06:00",
      checkedInKioskLabel: "Kiosco #1 · Stiliza Polanco",
    },
    {
      id: "bk-103",
      qrToken: "SD-2026-M06-3318",
      clientId: "cli-2",
      clientName: "Camila Elizondo",
      clientPhone: "+52 55 9102 3341",
      sessionId: "ses-4",
      sessionTitle: "Candlelight Hot Pilates Detox 38°C",
      discipline: "hot_pilates",
      branchId: "br-devotion-roma",
      branchName: "Devotion · Roma Norte Chamber",
      roomName: "Hot Pilates Infrared Chamber (Roma)",
      instructor: "Coach Fernanda L.",
      date: today,
      startTime: "19:30",
      spotId: "M-06",
      spotLabel: "Tapete Hot Mat #06",
      status: "confirmada",
      bookedVia: "whatsapp_bot",
      whatsappSent: true,
      createdAt: "2026-10-19T13:05:00-06:00",
    },
    {
      id: "bk-104",
      qrToken: "SD-2026-M02-5512",
      clientId: "cli-4",
      clientName: "Mariana Garza",
      clientPhone: "+52 81 2345 6780",
      sessionId: "ses-4",
      sessionTitle: "Candlelight Hot Pilates Detox 38°C",
      discipline: "hot_pilates",
      branchId: "br-devotion-roma",
      branchName: "Devotion · Roma Norte Chamber",
      roomName: "Hot Pilates Infrared Chamber (Roma)",
      instructor: "Coach Fernanda L.",
      date: today,
      startTime: "19:30",
      spotId: "M-02",
      spotLabel: "Tapete Hot Mat #02",
      status: "confirmada",
      bookedVia: "web_portal",
      whatsappSent: true,
      createdAt: "2026-10-19T14:10:00-06:00",
    },
    {
      id: "bk-105",
      qrToken: "SD-2026-R07-4109",
      clientId: "cli-6",
      clientName: "Renata Altamirano",
      clientPhone: "+52 55 3398 1120",
      sessionId: "ses-3",
      sessionTitle: "Athletic Reformer Flow",
      discipline: "reformer",
      branchId: "br-stiliza-polanco",
      branchName: "Stiliza · Polanco Flagship",
      roomName: "Salón Reformer Signature (Polanco)",
      instructor: "Coach Alejandra M.",
      date: today,
      startTime: "18:30",
      spotId: "R-07",
      spotLabel: "Máquina Reformer #07",
      status: "confirmada",
      bookedVia: "whatsapp_bot",
      whatsappSent: true,
      createdAt: "2026-10-19T15:00:00-06:00",
    },
    {
      id: "bk-106",
      qrToken: "SD-2026-RL02-8821",
      clientId: "cli-3",
      clientName: "Sofía Villalobos",
      clientPhone: "+52 55 7734 1289",
      sessionId: "ses-5",
      sessionTitle: "Lomas Privé Reformer Sculpt",
      discipline: "reformer",
      branchId: "br-stiliza-lomas",
      branchName: "Stiliza · Lomas Privé",
      roomName: "Reformer Privé Loft (Lomas)",
      instructor: "Coach Valentina S.",
      instructorAvatar: "VS",
      date: today,
      startTime: "19:00",
      spotId: "RL-02",
      spotLabel: "Máquina Reformer #02",
      status: "confirmada",
      bookedVia: "kiosk_tablet",
      whatsappSent: true,
      createdAt: "2026-10-19T16:10:00-06:00",
    } as Booking,
  ];

  const messages: ChatMessage[] = [
    {
      id: "msg-1",
      clientId: "cli-1",
      sender: "client",
      text: "Hola! Quiero agendar hoy a las 18:30 en Pilates Reformer en la máquina R-03 porfa ✨",
      timestamp: "11:19 AM",
    },
    {
      id: "msg-2",
      clientId: "cli-1",
      sender: "bot",
      text: "¡Hola Valeria! 🤍 Tu lugar en **Athletic Reformer Flow** (18:30 hrs · Stiliza Polanco) en la **Máquina Reformer #03** ha quedado reservado.\n\nTe descontamos 1 token (te quedan **11 tokens** disponibles). Aquí tienes tu código QR de acceso para escanear en el Kiosco al llegar:",
      timestamp: "11:20 AM",
      bookingAttachment: bookings[0],
    },
    {
      id: "msg-3",
      clientId: "cli-2",
      sender: "client",
      text: "Hola Concierge, ¿qué tapetes tienes libres hoy a las 7:30pm para Hot Pilates en Devotion Roma?",
      timestamp: "01:04 PM",
    },
    {
      id: "msg-4",
      clientId: "cli-2",
      sender: "bot",
      text: "¡Hola Camila! 🔥 Para **Candlelight Hot Pilates Detox 38°C** hoy a las 19:30 hrs en Devotion Roma con Coach Fernanda L., te reservé tu tapete favorito **M-06**.\n\nPresenta este QR en el lector del Kiosco al entrar al estudio:",
      timestamp: "01:05 PM",
      bookingAttachment: bookings[2],
    },
  ];

  const aggregators: AggregatorConnection[] = [
    {
      id: "wellhub",
      name: "Wellhub",
      connectionType: "api_webhook",
      connected: true,
      autoBlockSpots: true,
      maxSpotsPerSession: 5,
      syncedBookingsToday: 4,
      lastSyncAt: "Hace 2 min",
      colorBadge: "bg-rose-500/20 text-rose-300 border-rose-400/30",
    },
    {
      id: "totalpass",
      name: "TotalPass",
      connectionType: "api_webhook",
      connected: true,
      autoBlockSpots: true,
      maxSpotsPerSession: 4,
      syncedBookingsToday: 3,
      lastSyncAt: "Hace 5 min",
      colorBadge: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
    },
    {
      id: "fitpass",
      name: "FitPass",
      connectionType: "inbound_email_bridge",
      connected: true,
      autoBlockSpots: true,
      maxSpotsPerSession: 4,
      syncedBookingsToday: 5,
      lastSyncAt: "Hace 1 min",
      colorBadge: "bg-sky-500/20 text-sky-300 border-sky-400/30",
    },
    {
      id: "nessty",
      name: "Nessty",
      connectionType: "inbound_email_bridge",
      connected: true,
      autoBlockSpots: true,
      maxSpotsPerSession: 4,
      syncedBookingsToday: 2,
      lastSyncAt: "Hace 8 min",
      colorBadge: "bg-purple-500/20 text-purple-300 border-purple-400/30",
    },
  ];

  return {
    branches,
    coaches,
    promosAndEvents,
    aggregators,
    rooms,
    packages,
    clients,
    sessions,
    bookings,
    messages,
    aiSettings: {
      botName: "Stiliza & Devotion Concierge IA",
      autoSendWhatsAppQR: true,
      reminderMinutesBefore: 120,
      cancellationWindowHours: 6,
      whatsappWebhookMode: "simulator_ready",
    },
  };
}

let memoryCache: CRMDatabaseState | null = null;

export function readDB(): CRMDatabaseState {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const seed = memoryCache || getInitialSeedData();
      memoryCache = seed;
      fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), "utf-8");
      return seed;
    }
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(raw) as CRMDatabaseState;
    memoryCache = parsed;
    return parsed;
  } catch {
    if (!memoryCache) {
      memoryCache = getInitialSeedData();
    }
    return memoryCache;
  }
}

export function writeDB(state: CRMDatabaseState): CRMDatabaseState {
  memoryCache = state;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch {
    // Fallback to memoryCache in read-only environments
  }
  return state;
}

export function createBookingTransaction(params: {
  clientId: string;
  sessionId: string;
  spotId: string;
  bookedVia: BookingSource;
  externalReservationCode?: string;
}): {
  success: boolean;
  error?: string;
  booking?: Booking;
  state: CRMDatabaseState;
} {
  const state = readDB();
  const client = state.clients.find((c) => c.id === params.clientId);
  if (!client) {
    return { success: false, error: "Cliente no encontrado en el CRM.", state };
  }

  const session = state.sessions.find((s) => s.id === params.sessionId);
  if (!session) {
    return { success: false, error: "La clase seleccionada no existe.", state };
  }

  const room = state.rooms.find((r) => r.id === session.roomId);
  if (!room) {
    return { success: false, error: "Salón no encontrado.", state };
  }

  const spot = room.spots.find(
    (s) =>
      s.id.toUpperCase() === params.spotId.toUpperCase() ||
      s.shortLabel.toUpperCase() === params.spotId.toUpperCase()
  );
  if (!spot) {
    return {
      success: false,
      error: `El lugar ${params.spotId} no existe en ${room.name}.`,
      state,
    };
  }

  if (spot.status === "maintenance") {
    return {
      success: false,
      error: `El lugar ${spot.id} está actualmente en mantenimiento.`,
      state,
    };
  }

  const existingSpotBooking = state.bookings.find(
    (b) =>
      b.sessionId === session.id &&
      b.spotId === spot.id &&
      b.status !== "cancelada"
  );
  if (existingSpotBooking) {
    return {
      success: false,
      error: `El lugar ${spot.id} (${spot.label}) ya está ocupado en esta clase por ${existingSpotBooking.clientName}.`,
      state,
    };
  }

  if (client.creditsRemaining <= 0) {
    return {
      success: false,
      error: `${client.name} no cuenta con tokens disponibles en su paquete actual (${client.activePackageName}). Puedes recargar tokens aquí mismo en el Kiosco.`,
      state,
    };
  }

  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const cleanSpotCode = spot.id.replace("-", "");
  const qrToken = `SD-2026-${cleanSpotCode}-${randomSuffix}`;

  const newBooking: Booking = {
    id: `bk-${Date.now()}`,
    qrToken,
    clientId: client.id,
    clientName: client.name,
    clientPhone: client.phone,
    sessionId: session.id,
    sessionTitle: session.title,
    discipline: session.discipline,
    branchId: session.branchId,
    branchName: session.branchName,
    roomName: session.roomName,
    instructor: session.instructor,
    date: session.date,
    startTime: session.startTime,
    spotId: spot.id,
    spotLabel: spot.label,
    status: "confirmada",
    bookedVia: params.bookedVia,
    whatsappSent: true,
    createdAt: new Date().toISOString(),
  };

  client.creditsRemaining = Math.max(0, client.creditsRemaining - 1);
  if (client.creditsRemaining === 0) {
    client.status = "sin_creditos";
  } else if (client.creditsRemaining <= 2) {
    client.status = "pocos_creditos";
  }

  state.bookings.unshift(newBooking);

  const nowTime = new Date().toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const waMsg: ChatMessage = {
    id: `msg-${Date.now()}-qr`,
    clientId: client.id,
    sender: "bot",
    text: `¡Listo, ${client.name.split(" ")[0]}! ✨ Reservé tu lugar en **${session.title}** (${session.startTime} hrs · ${session.branchName}) en **${spot.label}**.\n\nTe quedan **${client.creditsRemaining} tokens**. Escanea este código QR en el Kiosco al llegar al estudio:`,
    timestamp: nowTime,
    bookingAttachment: newBooking,
  };

  state.messages.push(waMsg);
  writeDB(state);

  return {
    success: true,
    booking: newBooking,
    state,
  };
}

export function processKioskQRScan(
  qrInput: string,
  kioskLabel?: string
): {
  result: KioskCheckInResult;
  state: CRMDatabaseState;
} {
  const state = readDB();
  const normalized = qrInput.trim().toUpperCase();

  let targetToken = normalized;
  try {
    if (qrInput.trim().startsWith("{")) {
      const parsed = JSON.parse(qrInput.trim());
      if (parsed.qrToken) targetToken = String(parsed.qrToken).toUpperCase();
    }
  } catch {
    // Plain text token
  }

  const booking = state.bookings.find(
    (b) =>
      b.qrToken.toUpperCase() === targetToken ||
      b.id.toUpperCase() === targetToken
  );

  if (!booking) {
    return {
      result: {
        success: false,
        message: `Código QR no reconocido (${targetToken}). Verifica que tu reserva esté activa.`,
      },
      state,
    };
  }

  const client = state.clients.find((c) => c.id === booking.clientId);

  if (booking.status === "cancelada") {
    return {
      result: {
        success: false,
        message: `Esta reserva fue cancelada previamente.`,
        booking,
        client,
      },
      state,
    };
  }

  if (booking.status === "asistio") {
    return {
      result: {
        success: true,
        alreadyCheckedIn: true,
        message: `¡Bienvenida de nuevo, ${booking.clientName}! Tu check-in ya estaba registrado. Pasa a ${booking.spotLabel}.`,
        booking,
        client,
      },
      state,
    };
  }

  booking.status = "asistio";
  booking.checkedInAt = new Date().toISOString();
  booking.checkedInKioskLabel = kioskLabel || "Kiosco Principal";
  if (client) {
    client.totalAttended += 1;
  }

  const nowTime = new Date().toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
  state.messages.push({
    id: `msg-checkin-${Date.now()}`,
    clientId: booking.clientId,
    sender: "bot",
    text: `✅ Check-in confirmado en ${booking.checkedInKioskLabel} (${nowTime}). ¡Disfruta tu clase **${booking.sessionTitle}** en **${booking.spotLabel}** con ${booking.instructor}! ✨`,
    timestamp: nowTime,
  });

  writeDB(state);

  return {
    result: {
      success: true,
      alreadyCheckedIn: false,
      message: `¡Bienvenida ${booking.clientName}! Pasa al ${booking.roomName} · Tu lugar asignado es ${booking.spotLabel} (${booking.spotId}).`,
      booking,
      client,
    },
    state,
  };
}

/**
 * Channel Manager / Sincronizador Bidireccional con Wellhub, TotalPass, FitPass y Nessty.
 * Cuando entra una reserva desde cualquiera de las 4 plataformas externas:
 * 1) Asigna automáticamente la siguiente máquina Reformer o tapete Hot Pilates libre (o el solicitado).
 * 2) Bloquea ese lugar en el mapa del salón.
 * 3) Recalcula el cupo restante de la clase y devuelve el inventario actualizado para
 *    bloquear/actualizar disponibilidad en las 4 plataformas y evitar sobrecupo.
 */
export function syncExternalAggregatorBooking(params: {
  platform: ExternalAggregator;
  clientName: string;
  clientPhone?: string;
  sessionId: string;
  preferredSpotId?: string;
  externalReservationCode?: string;
}): {
  success: boolean;
  error?: string;
  booking?: Booking;
  channelSyncReport?: {
    totalCapacity: number;
    totalOccupied: number;
    remainingSlotsPublishedToAllApps: number;
    platformsNotified: string[];
  };
  state: CRMDatabaseState;
} {
  const state = readDB();
  const session =
    state.sessions.find((s) => s.id === params.sessionId) || state.sessions[0];
  if (!session) {
    return { success: false, error: "Clase no encontrada.", state };
  }

  const room = state.rooms.find((r) => r.id === session.roomId);
  if (!room) {
    return { success: false, error: "Salón no encontrado.", state };
  }

  const occupiedSpotIds = new Set(
    state.bookings
      .filter((b) => b.sessionId === session.id && b.status !== "cancelada")
      .map((b) => b.spotId)
  );

  const freeSpots = room.spots.filter(
    (sp) => !occupiedSpotIds.has(sp.id) && sp.status !== "maintenance"
  );

  if (freeSpots.length === 0) {
    return {
      success: false,
      error: `Clase llena en ${room.name}. Los lugares ya están bloqueados en Wellhub, TotalPass, FitPass y Nessty.`,
      state,
    };
  }

  const chosenSpot =
    (params.preferredSpotId &&
      freeSpots.find(
        (s) => s.id.toUpperCase() === params.preferredSpotId!.toUpperCase()
      )) ||
    freeSpots[0];

  const platformUpper = params.platform.toUpperCase();
  const prefixCode =
    params.platform === "wellhub"
      ? "WH"
      : params.platform === "totalpass"
      ? "TP"
      : params.platform === "fitpass"
      ? "FP"
      : "NS";

  const extCode =
    params.externalReservationCode ||
    `${prefixCode}-${Math.floor(10000 + Math.random() * 90000)}`;

  // Buscar o crear perfil de la alumna que viene de la app externa
  let client = state.clients.find(
    (c) => c.name.toLowerCase() === params.clientName.trim().toLowerCase()
  );

  if (!client) {
    const parts = params.clientName.trim().split(" ");
    const initials =
      parts.length > 1
        ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        : parts[0].slice(0, 2).toUpperCase();

    client = {
      id: `cli-${params.platform}-${Date.now()}`,
      name: params.clientName.trim(),
      phone: params.clientPhone || "+52 55 8899 0011",
      email: `${params.platform}@alumna.mx`,
      avatarInitials: initials,
      activePackageName: `Membresía Externa (${platformUpper})`,
      creditsRemaining: 1,
      creditsTotal: 1,
      packageExpiresAt: "2026-12-31",
      status: "activo",
      totalAttended: 1,
      noShowsCount: 0,
      preferredSpot: chosenSpot.id,
      homeBranchName: session.branchName,
      joinedAt: new Date().toISOString().split("T")[0],
    };
    state.clients.unshift(client);
  } else if (client.creditsRemaining <= 0) {
    client.creditsRemaining = 1;
  }

  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const cleanSpotCode = chosenSpot.id.replace("-", "");
  const qrToken = `SD-${prefixCode}-${cleanSpotCode}-${randomSuffix}`;

  const newBooking: Booking = {
    id: `bk-${Date.now()}`,
    qrToken,
    clientId: client.id,
    clientName: client.name,
    clientPhone: client.phone,
    sessionId: session.id,
    sessionTitle: session.title,
    discipline: session.discipline,
    branchId: session.branchId,
    branchName: session.branchName,
    roomName: session.roomName,
    instructor: session.instructor,
    date: session.date,
    startTime: session.startTime,
    spotId: chosenSpot.id,
    spotLabel: chosenSpot.label,
    status: "confirmada",
    bookedVia: params.platform,
    externalReservationCode: extCode,
    whatsappSent: true,
    createdAt: new Date().toISOString(),
  };

  state.bookings.unshift(newBooking);

  // Actualizar contador del agregador
  const agg = state.aggregators?.find((a) => a.id === params.platform);
  if (agg) {
    agg.syncedBookingsToday += 1;
    agg.lastSyncAt = "Justo ahora";
  }

  const nowTime = new Date().toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
  state.messages.push({
    id: `msg-agg-${Date.now()}`,
    clientId: client.id,
    sender: "bot",
    text: `📲 **[Sincronización ${platformUpper} #${extCode}]** ¡Hola ${client.name.split(" ")[0]}! Recibimos tu reserva desde **${platformUpper}** para **${session.title}** (${session.startTime} hrs · ${session.branchName}).\n\nTe asignamos y bloqueamos automáticamente **${chosenSpot.label} (${chosenSpot.id})**. Escanea este código QR en el Kiosco al llegar al estudio:`,
    timestamp: nowTime,
    bookingAttachment: newBooking,
  });

  writeDB(state);

  const newTotalOccupied = occupiedSpotIds.size + 1;
  const remainingSlots = Math.max(0, room.spots.length - newTotalOccupied);

  return {
    success: true,
    booking: newBooking,
    channelSyncReport: {
      totalCapacity: room.spots.length,
      totalOccupied: newTotalOccupied,
      remainingSlotsPublishedToAllApps: remainingSlots,
      platformsNotified: ["Wellhub", "TotalPass", "FitPass", "Nessty"],
    },
    state,
  };
}
