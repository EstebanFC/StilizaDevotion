import fs from "fs";
import os from "os";
import path from "path";
import {
  Booking,
  ChatMessage,
  ClassPackage,
  ClassSession,
  Client,
  CRMDatabaseState,
  KioskCheckInResult,
  SpotConfig,
  StudioRoom,
} from "@/types/crm";

const DATA_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), "stiliza-data")
  : path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "crm-store.json");

function buildReformerSpots(count: number, cols: number, prefix = "R"): SpotConfig[] {
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

function buildHotMatSpots(count: number, cols: number, prefix = "M"): SpotConfig[] {
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

  const rooms: StudioRoom[] = [
    {
      id: "room-reformer-a",
      branchName: "Stiliza Devotion · Studio Principal",
      name: "Salón Reformer Signature",
      discipline: "reformer",
      temperature: "21°C Climatizado · Iluminación Cálida",
      rows: 3,
      cols: 4,
      spots: buildReformerSpots(12, 4, "R"),
    },
    {
      id: "room-hot-b",
      branchName: "Stiliza Devotion · Studio Principal",
      name: "Hot Pilates Infrared Chamber",
      discipline: "hot_pilates",
      temperature: "38.5°C Paneles Infrarrojos · 45% Humedad",
      rows: 4,
      cols: 4,
      spots: buildHotMatSpots(16, 4, "M"),
    },
    {
      id: "room-reformer-norte",
      branchName: "Stiliza Devotion · Sucursal Boutique",
      name: "Reformer Privé Loft",
      discipline: "reformer",
      temperature: "21°C Climatizado · Vista Jardín",
      rows: 2,
      cols: 4,
      spots: buildReformerSpots(8, 4, "RB"),
    },
  ];

  const packages: ClassPackage[] = [
    {
      id: "pkg-dropin",
      name: "Single Drop-In (1 Clase)",
      credits: 1,
      priceMXN: 380,
      validityDays: 15,
      allowedDisciplines: ["reformer", "hot_pilates"],
    },
    {
      id: "pkg-devotion-8",
      name: "Devotion Pack 8 Clases",
      credits: 8,
      priceMXN: 2450,
      validityDays: 30,
      allowedDisciplines: ["reformer", "hot_pilates"],
      badge: "Popular",
    },
    {
      id: "pkg-sculpt-16",
      name: "Sculpt & Burn 16 Clases",
      credits: 16,
      priceMXN: 4200,
      validityDays: 45,
      allowedDisciplines: ["reformer", "hot_pilates"],
      badge: "Mejor Valor",
    },
    {
      id: "pkg-unlimited",
      name: "Devotion Black Unlimited (Mensual)",
      credits: 30,
      priceMXN: 5400,
      validityDays: 30,
      allowedDisciplines: ["reformer", "hot_pilates"],
      badge: "VIP",
    },
  ];

  const clients: Client[] = [
    {
      id: "cli-1",
      name: "Valeria Montemayor (Tu WhatsApp de Prueba)",
      phone: "+52 987 871 0684",
      email: "valeria.m@gmail.com",
      avatarInitials: "VM",
      activePackageName: "Sculpt & Burn 16 Clases",
      creditsRemaining: 11,
      creditsTotal: 16,
      packageExpiresAt: "2026-11-25",
      status: "activo",
      totalAttended: 42,
      preferredSpot: "R-03",
      medicalNotes: "Ninguna lesión. Prefiere resorte pesado en piernas.",
      joinedAt: "2025-08-14",
    },
    {
      id: "cli-2",
      name: "Camila Elizondo",
      phone: "+52 55 9102 3341",
      email: "camila.elizondo@outlook.com",
      avatarInitials: "CE",
      activePackageName: "Devotion Pack 8 Clases",
      creditsRemaining: 2,
      creditsTotal: 8,
      packageExpiresAt: "2026-10-29",
      status: "pocos_creditos",
      totalAttended: 19,
      preferredSpot: "M-06",
      medicalNotes: "Cuidado muñeca derecha en planchas.",
      joinedAt: "2026-01-10",
    },
    {
      id: "cli-3",
      name: "Sofía Villalobos",
      phone: "+52 55 7734 1289",
      email: "sofi.villalobos@icloud.com",
      avatarInitials: "SV",
      activePackageName: "Devotion Black Unlimited (Mensual)",
      creditsRemaining: 24,
      creditsTotal: 30,
      packageExpiresAt: "2026-11-18",
      status: "activo",
      totalAttended: 86,
      preferredSpot: "R-01",
      medicalNotes: "Alumna avanzada.",
      joinedAt: "2025-03-02",
    },
    {
      id: "cli-4",
      name: "Mariana Garza",
      phone: "+52 81 2345 6780",
      email: "mariana.garza@gmail.com",
      avatarInitials: "MG",
      activePackageName: "Devotion Pack 8 Clases",
      creditsRemaining: 6,
      creditsTotal: 8,
      packageExpiresAt: "2026-11-15",
      status: "activo",
      totalAttended: 14,
      preferredSpot: "M-02",
      joinedAt: "2026-05-20",
    },
    {
      id: "cli-5",
      name: "Diego Santillán",
      phone: "+52 55 6190 4422",
      email: "dsantillan@empresa.mx",
      avatarInitials: "DS",
      activePackageName: "Single Drop-In (1 Clase)",
      creditsRemaining: 0,
      creditsTotal: 1,
      packageExpiresAt: "2026-10-20",
      status: "sin_creditos",
      totalAttended: 5,
      preferredSpot: "R-08",
      medicalNotes: "Tensión lumbar ocasional.",
      joinedAt: "2026-09-01",
    },
    {
      id: "cli-6",
      name: "Renata Altamirano",
      phone: "+52 55 3398 1120",
      email: "renata.alt@gmail.com",
      avatarInitials: "RA",
      activePackageName: "Sculpt & Burn 16 Clases",
      creditsRemaining: 14,
      creditsTotal: 16,
      packageExpiresAt: "2026-11-30",
      status: "activo",
      totalAttended: 31,
      preferredSpot: "M-05",
      joinedAt: "2025-11-11",
    },
  ];

  const sessions: ClassSession[] = [
    {
      id: "ses-1",
      title: "Sculpt & Lengthen Reformer",
      discipline: "reformer",
      roomId: "room-reformer-a",
      branchName: "Stiliza Devotion · Studio Principal",
      roomName: "Salón Reformer Signature",
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
      roomId: "room-hot-b",
      branchName: "Stiliza Devotion · Studio Principal",
      roomName: "Hot Pilates Infrared Chamber",
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
      roomId: "room-reformer-a",
      branchName: "Stiliza Devotion · Studio Principal",
      roomName: "Salón Reformer Signature",
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
      roomId: "room-hot-b",
      branchName: "Stiliza Devotion · Studio Principal",
      roomName: "Hot Pilates Infrared Chamber",
      instructor: "Coach Fernanda L.",
      instructorAvatar: "FL",
      date: today,
      startTime: "19:30",
      durationMinutes: 50,
      level: "Todos los niveles",
      intensity: "Intensa 🔥",
    },
    {
      id: "ses-5",
      title: "Sunrise Reformer Core & Arms",
      discipline: "reformer",
      roomId: "room-reformer-a",
      branchName: "Stiliza Devotion · Studio Principal",
      roomName: "Salón Reformer Signature",
      instructor: "Coach Daniela R.",
      instructorAvatar: "DR",
      date: tomorrow,
      startTime: "08:00",
      durationMinutes: 50,
      level: "Todos los niveles",
      intensity: "Alta",
    },
    {
      id: "ses-6",
      title: "Hot Mat Sculpt & Sweat 38°C",
      discipline: "hot_pilates",
      roomId: "room-hot-b",
      branchName: "Stiliza Devotion · Studio Principal",
      roomName: "Hot Pilates Infrared Chamber",
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
      branchName: "Stiliza Devotion · Studio Principal",
      roomName: "Salón Reformer Signature",
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
      branchName: "Stiliza Devotion · Studio Principal",
      roomName: "Salón Reformer Signature",
      instructor: "Coach Alejandra M.",
      date: today,
      startTime: "18:30",
      spotId: "R-01",
      spotLabel: "Máquina Reformer #01",
      status: "asistio",
      bookedVia: "web_portal",
      whatsappSent: true,
      createdAt: "2026-10-19T09:15:00-06:00",
      checkedInAt: "2026-10-19T18:18:00-06:00",
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
      branchName: "Stiliza Devotion · Studio Principal",
      roomName: "Hot Pilates Infrared Chamber",
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
      branchName: "Stiliza Devotion · Studio Principal",
      roomName: "Hot Pilates Infrared Chamber",
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
      branchName: "Stiliza Devotion · Studio Principal",
      roomName: "Salón Reformer Signature",
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
      text: "¡Hola Valeria! 🤍 Tu lugar en **Athletic Reformer Flow** (18:30 hrs) en la **Máquina Reformer #03** (Frente al Espejo) ha quedado reservado.\n\nTe descontamos 1 crédito (te quedan **11 clases** disponibles). Aquí tienes tu código QR de acceso para escanear en la tablet de recepción al llegar:",
      timestamp: "11:20 AM",
      bookingAttachment: bookings[0],
    },
    {
      id: "msg-3",
      clientId: "cli-2",
      sender: "client",
      text: "Hola Concierge, ¿qué tapetes tienes libres hoy a las 7:30pm para Hot Pilates?",
      timestamp: "01:04 PM",
    },
    {
      id: "msg-4",
      clientId: "cli-2",
      sender: "bot",
      text: "¡Hola Camila! 🔥 Para **Candlelight Hot Pilates Detox 38°C** hoy a las 19:30 hrs con Coach Fernanda L., te reservé tu tapete favorito **M-06** (Cerca de Paneles IR).\n\nPresenta este QR en el lector de la tablet al entrar al estudio:",
      timestamp: "01:05 PM",
      bookingAttachment: bookings[2],
    },
  ];

  return {
    rooms,
    packages,
    clients,
    sessions,
    bookings,
    messages,
    aiSettings: {
      botName: "Stiliza Concierge IA",
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
  bookedVia: "whatsapp_bot" | "web_portal" | "crm_admin";
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

  // Check if spot is already booked in this session
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

  // Check if client has credits
  if (client.creditsRemaining <= 0) {
    return {
      success: false,
      error: `${client.name} no cuenta con créditos disponibles en su paquete actual (${client.activePackageName}).`,
      state,
    };
  }

  // Generate unique QR token
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

  // Deduct 1 credit
  client.creditsRemaining = Math.max(0, client.creditsRemaining - 1);
  if (client.creditsRemaining === 0) {
    client.status = "sin_creditos";
  } else if (client.creditsRemaining <= 2) {
    client.status = "pocos_creditos";
  }

  state.bookings.unshift(newBooking);

  // Also record automated WhatsApp message with QR code!
  const nowTime = new Date().toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const waMsg: ChatMessage = {
    id: `msg-${Date.now()}-qr`,
    clientId: client.id,
    sender: "bot",
    text:
      params.bookedVia === "whatsapp_bot"
        ? `¡Listo, ${client.name.split(" ")[0]}! ✨ Reservé tu lugar en **${session.title}** (${session.startTime} hrs) en **${spot.label}** (${spot.zone}).\n\nTe quedan **${client.creditsRemaining} créditos**. Escanea este código QR en la tablet de la entrada al llegar al estudio:`
        : `¡Hola ${client.name.split(" ")[0]}! 🤍 Confirmamos tu reserva para **${session.title}** (${session.startTime} hrs) en **${spot.label}**.\n\nAquí tienes tu pase QR automático vía WhatsApp. Escanéalo en la tablet de nuestro Frontdesk autónomo al llegar:`,
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

export function processKioskQRScan(qrInput: string): {
  result: KioskCheckInResult;
  state: CRMDatabaseState;
} {
  const state = readDB();
  const normalized = qrInput.trim().toUpperCase();

  // Support scanning the exact token OR JSON payload containing qrToken OR booking ID
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
  if (client) {
    client.totalAttended += 1;
  }

  // Send WhatsApp confirmation of arrival
  const nowTime = new Date().toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
  state.messages.push({
    id: `msg-checkin-${Date.now()}`,
    clientId: booking.clientId,
    sender: "bot",
    text: `✅ Check-in confirmado en la Tablet del Estudio (${nowTime}). ¡Disfruta tu clase **${booking.sessionTitle}** en **${booking.spotLabel}** con ${booking.instructor}! ✨`,
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
