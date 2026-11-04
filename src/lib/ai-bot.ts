import { createBookingTransaction, readDB, writeDB } from "@/lib/db";
import {
  ChatMessage,
  ClassSession,
  CRMDatabaseState,
  DayOfWeek,
} from "@/types/crm";

/**
 * Obtiene el día de la semana actual en horario de México.
 */
export function getCurrentDayOfWeekMX(): DayOfWeek {
  const days: DayOfWeek[] = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];
  const now = new Date();
  return days[now.getDay()] || "Martes";
}

/**
 * Genera las próximas 4 fechas a partir de hoy con etiquetas amigables en español.
 */
export function getUpcomingDays(count: number = 4): Array<{
  dateString: string;
  label: string;
  shortTitle: string;
  dayOfWeek: DayOfWeek;
}> {
  const result = [];
  const daysMap: DayOfWeek[] = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];
  const monthsMap = [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ];

  const now = new Date();
  for (let i = 0; i < count; i++) {
    const target = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    const dayName = daysMap[target.getDay()];
    const dateNum = target.getDate();
    const monthName = monthsMap[target.getMonth()];
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, "0");
    const dd = String(dateNum).padStart(2, "0");
    const dateString = `${yyyy}-${mm}-${dd}`;

    let prefix = "";
    if (i === 0) prefix = "Hoy · ";
    else if (i === 1) prefix = "Mañana · ";

    result.push({
      dateString,
      label: `${prefix}${dayName} ${dateNum} ${monthName}`,
      shortTitle: `${prefix ? prefix.replace(" · ", " ") : dayName} ${dateNum}`,
      dayOfWeek: dayName,
    });
  }
  return result;
}

/**
 * Detecta el día de la semana si el alumno lo menciona en texto libre.
 */
function detectDayOfWeekFromText(text: string): DayOfWeek | null {
  const lower = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (/\blunes\b/.test(lower)) return "Lunes";
  if (/\bmartes\b/.test(lower)) return "Martes";
  if (/\bmiercoles\b/.test(lower)) return "Miércoles";
  if (/\bjueves\b/.test(lower)) return "Jueves";
  if (/\bviernes\b/.test(lower)) return "Viernes";
  if (/\bsabado\b/.test(lower)) return "Sábado";
  if (/\bdomingo\b/.test(lower)) return "Domingo";
  if (/\bhoy\b/.test(lower)) return getCurrentDayOfWeekMX();
  if (
    /\bmanana\b/.test(lower) &&
    !/\bde la manana\b/.test(lower) &&
    !/\ben la manana\b/.test(lower)
  ) {
    const upcoming = getUpcomingDays(2);
    return upcoming[1]?.dayOfWeek || "Miércoles";
  }
  return null;
}

/**
 * Detecta la sucursal por siglas (STSI, STJU, STCA, DEZI, DEJU, DECA) o palabras clave.
 */
function detectBranchIdFromText(
  text: string,
  state: CRMDatabaseState
): string | null {
  const lower = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (/\bstsi\b/.test(lower)) return "br-stiliza-san-isidro";
  if (/\bstju\b/.test(lower)) return "br-stiliza-juriquilla";
  if (/\bstca\b/.test(lower)) return "br-stiliza-campanario";
  if (/\bdezi\b/.test(lower)) return "br-devotion-zibata";
  if (/\bdeju\b/.test(lower)) return "br-devotion-juriquilla";
  if (/\bdeca\b/.test(lower)) return "br-devotion-campanario";

  if (lower.includes("san isidro")) return "br-stiliza-san-isidro";
  if (lower.includes("zibata")) return "br-devotion-zibata";
  if (lower.includes("stiliza juriquilla")) return "br-stiliza-juriquilla";
  if (lower.includes("devotion juriquilla")) return "br-devotion-juriquilla";
  if (lower.includes("stiliza campanario")) return "br-stiliza-campanario";
  if (lower.includes("devotion campanario")) return "br-devotion-campanario";

  if (lower.includes("campanario")) return "br-devotion-campanario";

  if (lower.includes("juriquilla")) {
    if (lower.includes("stiliza") || lower.includes("reformer")) {
      return "br-stiliza-juriquilla";
    }
    return "br-devotion-juriquilla";
  }

  for (const br of state.branches) {
    const cleanBr = br.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (lower.includes(cleanBr)) return br.id;
  }

  return null;
}

function extractTimeAndStrip(text: string): {
  startTime: string | null;
  textWithoutTime: string;
} {
  let working = text;
  let detectedTime: string | null = null;

  const timeRegex1 =
    /(?:a\s+las\s+)?\b(\d{1,2})(?::(\d{2}))?\s*(am|a\.m\.|pm|p\.m\.|hrs|horas|de la ma[ñn]ana|de la tarde|de la noche)\b/i;
  const m1 = working.match(timeRegex1);
  if (m1) {
    let hour = Number(m1[1]);
    const mins = m1[2] || "00";
    const meridiem = m1[3].toLowerCase();

    if (
      (meridiem.startsWith("p") ||
        meridiem.includes("tarde") ||
        meridiem.includes("noche")) &&
      hour < 12
    ) {
      hour += 12;
    } else if (
      (meridiem.startsWith("a") || meridiem.includes("ma")) &&
      hour === 12
    ) {
      hour = 0;
    }

    detectedTime = `${String(hour).padStart(2, "0")}:${mins}`;
    working = working.replace(m1[0], " ");
    return { startTime: detectedTime, textWithoutTime: working };
  }

  const timeRegex2 = /(?:a\s+las\s+)?\b([012]?\d):([0-5]\d)\b/i;
  const m2 = working.match(timeRegex2);
  if (m2) {
    let hour = Number(m2[1]);
    const mins = m2[2];
    if (hour >= 1 && hour <= 5) hour += 12;
    detectedTime = `${String(hour).padStart(2, "0")}:${mins}`;
    working = working.replace(m2[0], " ");
    return { startTime: detectedTime, textWithoutTime: working };
  }

  const timeRegex3 = /(?:a\s+las\s+)\b([012]?\d)\b/i;
  const m3 = working.match(timeRegex3);
  if (m3) {
    let hour = Number(m3[1]);
    if (hour >= 1 && hour <= 5) hour += 12;
    else if (hour >= 6 && hour <= 9 && /tarde|noche/i.test(working)) hour += 12;
    detectedTime = `${String(hour).padStart(2, "0")}:00`;
    working = working.replace(m3[0], " ");
    return { startTime: detectedTime, textWithoutTime: working };
  }

  return { startTime: null, textWithoutTime: working };
}

function extractSpotFromCleanText(text: string): string | null {
  const m = text.match(
    /(?:lugar|máquina|maquina|tapete|mat|cama|reformer|en el|el)\s*#?\s*(\d{1,2})\b/i
  );
  if (m) {
    const num = Number(m[1]);
    if (num >= 1 && num <= 16) return String(num);
  }

  const isolated = text.match(/(?:^|\s)#?(\d{1,2})(?:\s|$)/);
  if (isolated) {
    const num = Number(isolated[1]);
    if (num >= 1 && num <= 16) return String(num);
  }

  return null;
}

function format12h(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function findOfficialSessionForBranchDayTime(
  state: CRMDatabaseState,
  branchId: string,
  day: DayOfWeek,
  reqTime: string
): ClassSession | null {
  const daySessions = state.sessions.filter(
    (s) => s.branchId === branchId && (s.dayOfWeek === day || !s.dayOfWeek)
  );

  const exact = daySessions.find((s) => s.startTime === reqTime);
  if (exact) return exact;

  const [reqHour] = reqTime.split(":");
  const withQuarter = daySessions.find(
    (s) => s.startTime.startsWith(reqHour) && s.startTime.endsWith(":15")
  );
  if (withQuarter) return withQuarter;

  const hourNum = Number(reqHour);
  if (hourNum >= 6 && hourNum <= 10) {
    const pmHour = String(hourNum + 12).padStart(2, "0");
    const pmMatch = daySessions.find((s) => s.startTime.startsWith(pmHour));
    if (pmMatch) return pmMatch;
  } else if (hourNum >= 18 && hourNum <= 20) {
    const amHour = String(hourNum - 12).padStart(2, "0");
    const amMatch = daySessions.find((s) => s.startTime.startsWith(amHour));
    if (amMatch) return amMatch;
  }

  return null;
}

/**
 * Menús y Opciones Interactivas
 */
const UNREGISTERED_MENU_OPTIONS = [
  {
    id: "opt_register",
    title: "✍️ Registrarme",
    description: "Crear mi cuenta de alumno(a)",
  },
  {
    id: "opt_promos",
    title: "🎁 Promos y Paquetes",
    description: "Precios y paquetes de tokens",
  },
  {
    id: "opt_about",
    title: "✨ ¿Quiénes somos?",
    description: "Reformer y Hot Pilates 38°C",
  },
  {
    id: "opt_branches",
    title: "📍 Ver Sucursales",
    description: "Direcciones de nuestros 6 estudios",
  },
  {
    id: "opt_support",
    title: "👤 Hablar con Soporte",
    description: "Atención humana de recepción",
  },
];

function getRegisteredMenuOptions(credits: number) {
  return [
    {
      id: "opt_book",
      title: "🗓️ Reservar Clase",
      description: "Elige sucursal, fecha y lugar",
    },
    {
      id: "opt_credits",
      title: "💳 Mis Tokens y Recargas",
      description: `Tienes ${credits} tokens disponibles`,
    },
    {
      id: "opt_promos",
      title: "🎁 Promos y Eventos",
      description: "DJ sets, soundbaths y masterclasses",
    },
    {
      id: "opt_my_qr",
      title: "📋 Ver mi Pase QR",
      description: "Tu código para entrar en Kiosco",
    },
    {
      id: "opt_support",
      title: "👤 Hablar con Soporte",
      description: "Atención humana de recepción",
    },
  ];
}

/**
 * Procesa cada mensaje de chat entrante (desde WhatsApp real o simulador)
 * y devuelve el nuevo estado y los mensajes generados con opciones interactivas.
 */
export function processAIChatTurn(params: {
  clientId: string;
  userText: string;
  currentState?: CRMDatabaseState;
}): {
  state: CRMDatabaseState;
  replyMessages: ChatMessage[];
  adminAlertMessage?: {
    adminPhone: string;
    text: string;
  };
} {
  let state = params.currentState || readDB();
  const client = state.clients.find((c) => c.id === params.clientId);
  if (!client) {
    return { state, replyMessages: [] };
  }

  const nowTime = new Date().toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const clientMsg: ChatMessage = {
    id: `msg-${Date.now()}-usr`,
    clientId: client.id,
    sender: "client",
    text: params.userText,
    timestamp: nowTime,
  };
  state.messages.push(clientMsg);

  const cleanInput = params.userText.trim();
  const lower = cleanInput.toLowerCase();
  const firstName = client.name.replace(" (Sin Cuenta)", "").split(" ")[0];

  const draft = client.conversationDraft || {};

  // =========================================================================
  // 1. ATENCIÓN HUMANA / SOPORTE ACTIVO
  // =========================================================================
  if (
    cleanInput === "opt_support" ||
    /hablar con personal|hablar con admin|soporte|recepcion|recepción|asesor|humano/i.test(
      lower
    )
  ) {
    client.needsHumanSupport = true;
    client.conversationDraft = {};
    writeDB(state);

    const supportMsg: ChatMessage = {
      id: `msg-${Date.now()}-bot`,
      clientId: client.id,
      sender: "bot",
      text: `🤍 ¡Listo, **${firstName}**! Hemos notificado al equipo de recepción y administración de **Stiliza & Devotion**.\n\nUn asesor humano continuará tu conversación directamente por aquí en breve. Mientras tanto, tu bot ha quedado en pausa para no interrumpir tu atención personalizada.`,
      timestamp: nowTime,
      interactiveType: "button",
      interactiveTitle: "Atención Humana Solicitada",
      interactiveOptions: [
        {
          id: "opt_resume_bot",
          title: "🔄 Reanudar Bot IA",
          description: "Volver a activar el asistente virtual",
        },
      ],
    };
    state.messages.push(supportMsg);
    writeDB(state);

    return {
      state,
      replyMessages: [supportMsg],
      adminAlertMessage: {
        adminPhone: "+529878710684",
        text: `🚨 *ALERTA CRM STILIZA & DEVOTION*\n\nEl alumno(a) *${client.name}* (${client.phone}) ha solicitado hablar con un asesor humano en WhatsApp.\n\nPuedes atender su conversación en el panel Admin o responderle directamente.`,
      },
    };
  }

  // Reanudar Bot si estaba en pausa
  if (cleanInput === "opt_resume_bot" || lower === "reanudar bot" || lower === "menu") {
    client.needsHumanSupport = false;
  }

  // Si tiene atención humana activa y no pide el menú o reanudar, no responder como bot
  if (client.needsHumanSupport) {
    writeDB(state);
    return { state, replyMessages: [] };
  }

  // =========================================================================
  // 2. CLIENTE SIN REGISTRO (LEAD NUEVO)
  // =========================================================================
  if (client.isUnregisteredLead) {
    // Si seleccionó o escribió "Registrarme"
    if (
      cleanInput === "opt_register" ||
      draft.step === "awaiting_registration" ||
      /^(?:registrarme|registro|alta|crear cuenta)/i.test(lower)
    ) {
      // ¿Envió Nombre y Correo?
      const emailMatch = cleanInput.match(/([^\s@]+@[^\s@]+\.[^\s@]+)/i);
      const regWords = cleanInput
        .replace(/^(?:registrarme|registro|alta|crear cuenta)\s*/i, "")
        .trim();

      if (emailMatch && regWords.length > 5) {
        const email = emailMatch[1];
        const cleanName = regWords
          .replace(emailMatch[0], "")
          .replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, "")
          .trim();
        const finalName =
          cleanName || client.name.replace(" (Sin Cuenta)", "").trim();
        const parts = finalName.split(" ").filter(Boolean);
        const initials =
          parts.length > 1
            ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
            : finalName.slice(0, 2).toUpperCase();

        client.name = finalName;
        client.email = email;
        client.avatarInitials = initials;
        client.isUnregisteredLead = false;
        client.activePackageName = "Cuenta Nueva (Sin Paquete Activo)";
        client.creditsRemaining = 0;
        client.creditsTotal = 0;
        client.status = "sin_creditos";
        client.conversationDraft = {};
        writeDB(state);

        const welcomeRegisteredMsg: ChatMessage = {
          id: `msg-${Date.now()}-bot`,
          clientId: client.id,
          sender: "bot",
          text: `✅ ¡Cuenta creada con éxito, **${client.name}**!\n\nTu perfil ha quedado vinculado a tu WhatsApp (**${client.phone}**) con el correo **${client.email}**.\n\nActualmente tienes **0 tokens disponibles**. Para poder reservar tu lugar y recibir tu código QR:\n• Adquiere tu paquete de tokens en el **Kiosco** de tu sucursal\n• O solicita en Administración que activen tu paquete (**Single Drop-In 1 Token**, **8 Tokens**, **16 Tokens** o **Black Pass 30**).\n\n¿Qué te gustaría consultar ahora?`,
          timestamp: nowTime,
          interactiveType: "list",
          interactiveTitle: "Menú Principal",
          interactiveOptions: getRegisteredMenuOptions(0),
        };
        state.messages.push(welcomeRegisteredMsg);
        writeDB(state);
        return { state, replyMessages: [welcomeRegisteredMsg] };
      }

      // Si solo pulsó el botón pero no ha enviado nombre y correo
      client.conversationDraft = { step: "awaiting_registration" };
      writeDB(state);

      const askDataMsg: ChatMessage = {
        id: `msg-${Date.now()}-bot`,
        clientId: client.id,
        sender: "bot",
        text: `✍️ **Registro en Stiliza & Devotion**\n\nPara darte de alta de inmediato y poder gestionar tus reservas, por favor respóndeme con tu **Nombre Completo** y tu **Correo Electrónico** en un solo mensaje.\n\nEjemplo:\n👉 *Rubi Ortiz rubiortiz@correo.com*`,
        timestamp: nowTime,
        suggestedSpots: [`${firstName} mi_correo@gmail.com`],
      };
      state.messages.push(askDataMsg);
      writeDB(state);
      return { state, replyMessages: [askDataMsg] };
    }

    // Promos para No Registrados
    if (cleanInput === "opt_promos" || /promos?|paquetes?|precios?|tokens?/i.test(lower)) {
      const promosMsg: ChatMessage = {
        id: `msg-${Date.now()}-bot`,
        clientId: client.id,
        sender: "bot",
        text: `🎁 **Paquetes y Membresías Stiliza & Devotion**:\n\n• **Single Drop-In (1 Token)**: $350 MXN (Vigencia 15 días)\n• **Sculpt & Flow (8 Tokens)**: $2,400 MXN ($300/clase)\n• **Sculpt & Burn (16 Tokens)**: $4,200 MXN ($262/clase · ¡Más Popular!)\n• **Black Pass Ilimitado (30 Tokens)**: $5,900 MXN\n\n✨ *Todos los paquetes son válidos en nuestras 6 sucursales de Reformer y Hot Pilates 38°C.*\n\nRegístrate ahora para adquirir tu paquete en Kiosco o recepción:`,
        timestamp: nowTime,
        interactiveType: "button",
        interactiveTitle: "Paquetes Stiliza & Devotion",
        interactiveOptions: [
          {
            id: "opt_register",
            title: "✍️ Registrarme",
            description: "Crear cuenta de alumno",
          },
          {
            id: "opt_about",
            title: "✨ ¿Quiénes somos?",
            description: "Concepto del estudio",
          },
          {
            id: "opt_support",
            title: "👤 Hablar con Soporte",
            description: "Atención humana",
          },
        ],
      };
      state.messages.push(promosMsg);
      writeDB(state);
      return { state, replyMessages: [promosMsg] };
    }

    // ¿Quiénes somos?
    if (cleanInput === "opt_about" || /quienes somos|quiénes somos|concepto|estudio/i.test(lower)) {
      const aboutMsg: ChatMessage = {
        id: `msg-${Date.now()}-bot`,
        clientId: client.id,
        sender: "bot",
        text: `✨ **Bienvenido(a) al universo Stiliza & Devotion**:\n\n• **Stiliza (Pilates Reformer)**: Entrenamientos de alta intensidad y bajo impacto sobre máquinas Reformer de última generación. Core profundo, alineación postural y tono muscular con música envolvente.\n\n• **Devotion (Inferno Hot Pilates 38°C)**: Sesiones a 38°C con calor infrarrojo lejano. Estimula colágeno, desintoxica el cuerpo y maximiza la quema calórica con impacto cero en articulaciones.\n\n🎒 **¿Qué llevar a tu clase?** Calcetas con agarre antiderrapante (obligatorias en Reformer), toalla, termo de agua y ropa deportiva cómoda.`,
        timestamp: nowTime,
        interactiveType: "button",
        interactiveTitle: "Conoce el Estudio",
        interactiveOptions: [
          {
            id: "opt_register",
            title: "✍️ Registrarme",
            description: "Crear mi cuenta",
          },
          {
            id: "opt_branches",
            title: "📍 Ver Sucursales",
            description: "Nuestras 6 ubicaciones",
          },
          {
            id: "opt_support",
            title: "👤 Hablar con Soporte",
            description: "Atención humana",
          },
        ],
      };
      state.messages.push(aboutMsg);
      writeDB(state);
      return { state, replyMessages: [aboutMsg] };
    }

    // Ver Sucursales
    if (cleanInput === "opt_branches" || /sucursales?|ubicaciones?|donde estan/i.test(lower)) {
      const branchesMsg: ChatMessage = {
        id: `msg-${Date.now()}-bot`,
        clientId: client.id,
        sender: "bot",
        text: `📍 **Nuestras 6 Sucursales Oficiales**:\n\n1️⃣ **Stiliza San Isidro (STSI)** · Reformer (5 lugares en fila)\n2️⃣ **Stiliza Juriquilla (STJU)** · Reformer (8 lugares en fila)\n3️⃣ **Stiliza Campanario (STCA)** · Reformer Boutique\n4️⃣ **Devotion Zibatá (DEZI)** · Hot Studio 38°C (12 tapetes)\n5️⃣ **Devotion Juriquilla (DEJU)** · Hot Studio 38°C (12 tapetes)\n6️⃣ **Devotion Campanario (DECA)** · Hot Studio 38°C (12 tapetes)\n\n¿Deseas registrarte para reservar tu lugar?`,
        timestamp: nowTime,
        interactiveType: "button",
        interactiveTitle: "Nuestras Sucursales",
        interactiveOptions: [
          {
            id: "opt_register",
            title: "✍️ Registrarme",
            description: "Crear mi cuenta",
          },
          {
            id: "opt_promos",
            title: "🎁 Ver Promos",
            description: "Precios y paquetes",
          },
          {
            id: "opt_support",
            title: "👤 Hablar con Soporte",
            description: "Atención humana",
          },
        ],
      };
      state.messages.push(branchesMsg);
      writeDB(state);
      return { state, replyMessages: [branchesMsg] };
    }

    // Menú Principal de No Registrado por defecto
    const unregMenuMsg: ChatMessage = {
      id: `msg-${Date.now()}-bot`,
      clientId: client.id,
      sender: "bot",
      text: `¡Hola! 👋 Te damos la bienvenida a **Stiliza & Devotion**.\n\nVemos que tu número (**${client.phone}**) aún no tiene una cuenta registrada en nuestro sistema.\n\nPara poder reservar tu máquina Reformer o tapete de Hot Pilates 38°C, por favor selecciona una opción:`,
      timestamp: nowTime,
      interactiveType: "list",
      interactiveTitle: "Menú Stiliza & Devotion",
      interactiveOptions: UNREGISTERED_MENU_OPTIONS,
      suggestedSpots: ["✍️ Registrarme", "🎁 Promos y Paquetes", "✨ ¿Quiénes somos?"],
    };
    state.messages.push(unregMenuMsg);
    writeDB(state);
    return { state, replyMessages: [unregMenuMsg] };
  }

  // =========================================================================
  // 3. CLIENTE REGISTRADO: ACCIONES RÁPIDAS (QR, CRÉDITOS, PROMOS)
  // =========================================================================

  // A) Ver Pase QR Activo
  if (
    cleanInput === "opt_my_qr" ||
    lower.includes("qr") ||
    lower.includes("código") ||
    lower.includes("codigo") ||
    lower.includes("pase")
  ) {
    const activeBooking = state.bookings.find(
      (b) => b.clientId === client.id && b.status === "confirmada"
    );
    const botReply: ChatMessage = activeBooking
      ? {
        id: `msg-${Date.now()}-bot`,
        clientId: client.id,
        sender: "bot",
        text: `¡Claro, **${firstName}**! Aquí tienes tu código QR activo para **${activeBooking.sessionTitle}** (${activeBooking.startTime} hrs · ${activeBooking.branchName}) en el **Lugar #${activeBooking.spotId} (${activeBooking.spotLabel})**.\n\nEscanéalo en el Kiosco al llegar al estudio:`,
        timestamp: nowTime,
        bookingAttachment: activeBooking,
      }
      : {
        id: `msg-${Date.now()}-bot`,
        clientId: client.id,
        sender: "bot",
        text: `Hola **${firstName}**, actualmente no tienes ninguna clase pendiente de check-in.\n\n¿Deseas reservar tu lugar ahora? Tienes **${client.creditsRemaining} tokens** disponibles.`,
        timestamp: nowTime,
        interactiveType: "button",
        interactiveTitle: "Mis Reservas",
        interactiveOptions: [
          {
            id: "opt_book",
            title: "🗓️ Reservar Clase",
            description: "Elegir sucursal y horario",
          },
          {
            id: "opt_credits",
            title: "💳 Mis Tokens",
            description: "Ver saldo y recargas",
          },
          {
            id: "opt_support",
            title: "👤 Hablar con Soporte",
            description: "Atención humana",
          },
        ],
      };
    state.messages.push(botReply);
    writeDB(state);
    return { state, replyMessages: [botReply] };
  }

  // B) Mis Créditos y Recargas
  if (
    cleanInput === "opt_credits" ||
    lower.includes("tokens") ||
    lower.includes("creditos") ||
    lower.includes("créditos") ||
    lower.includes("paquete")
  ) {
    const creditsMsg: ChatMessage = {
      id: `msg-${Date.now()}-bot`,
      clientId: client.id,
      sender: "bot",
      text: `💳 **Estado de tu Cuenta** · Stiliza & Devotion\n\n• Alumno(a): **${client.name}**\n• Tokens activos: **${client.creditsRemaining} tokens**\n• Paquete: **${client.activePackageName}**\n\n${client.creditsRemaining > 0
        ? `¡Tienes saldo suficiente para agendar tu próxima clase!`
        : `Actualmente no tienes tokens para reservar. Puedes recargar tu paquete en el **Kiosco** de tu sucursal o solicitar transferencia en Administración.`
        }`,
      timestamp: nowTime,
      interactiveType: "button",
      interactiveTitle: "Tokens y Membresías",
      interactiveOptions: [
        {
          id: "opt_book",
          title: "🗓️ Reservar Clase",
          description: "Usar mis tokens",
        },
        {
          id: "opt_promos",
          title: "🎁 Ver Paquetes",
          description: "Precios y recargas",
        },
        {
          id: "opt_support",
          title: "👤 Hablar con Soporte",
          description: "Atención humana",
        },
      ],
    };
    state.messages.push(creditsMsg);
    writeDB(state);
    return { state, replyMessages: [creditsMsg] };
  }

  // C) Promociones y Eventos
  if (cleanInput === "opt_promos" || lower.includes("promo") || lower.includes("evento")) {
    const promosMsg: ChatMessage = {
      id: `msg-${Date.now()}-bot`,
      clientId: client.id,
      sender: "bot",
      text: `🎁 **Promos y Clases Especiales Esta Semana**:\n\n🎧 **DJ Live Sunset Reformer** · Juriquilla (Viernes 19:30 hrs · 1 Token)\n🕯️ **Candlelight Soundbath & Hot Pilates 38°C** · Campanario (Sábado 10:30 hrs · 1 Token)\n🎁 **Promo Kiosco**: Recarga Pack 16 y recibe **+3 Tokens Gratis** (19 tokens en total).\n\n¿Quieres apartar tu lugar para alguna de nuestras clases?`,
      timestamp: nowTime,
      interactiveType: "button",
      interactiveTitle: "Promos y Eventos",
      interactiveOptions: [
        {
          id: "opt_book",
          title: "🗓️ Reservar Clase",
          description: "Elegir sucursal",
        },
        {
          id: "opt_credits",
          title: "💳 Mis Tokens",
          description: "Consultar saldo",
        },
        {
          id: "opt_support",
          title: "👤 Hablar con Soporte",
          description: "Atención humana",
        },
      ],
    };
    state.messages.push(promosMsg);
    writeDB(state);
    return { state, replyMessages: [promosMsg] };
  }

  // =========================================================================
  // 4. FLUJO GUIADO DE RESERVACIÓN PASO A PASO (ENRUTADOR POR ESTADO)
  // =========================================================================

  // Reiniciar flujo si el usuario escribe cancelar o reiniciar
  if (lower === "cancelar" || lower === "reiniciar" || lower === "volver al menu" || lower === "inicio") {
    client.conversationDraft = {};
    writeDB(state);
  }

  // PASO 5: Se seleccionó un Lugar -> Confirmar Reserva y Enviar QR
  let selectedSpotId: string | null = null;
  if (cleanInput.startsWith("spot_")) {
    selectedSpotId = cleanInput.replace("spot_", "");
  } else if (draft.step === "select_spot") {
    selectedSpotId = extractSpotFromCleanText(cleanInput);
  }

  if (selectedSpotId && draft.sessionId) {
    const session = state.sessions.find((s) => s.id === draft.sessionId);
    if (!session) {
      client.conversationDraft = {};
      writeDB(state);
      return { state, replyMessages: [] };
    }

    // Verificar si el cliente tiene tokens
    if (client.creditsRemaining <= 0) {
      const noCreditsMsg: ChatMessage = {
        id: `msg-${Date.now()}-bot`,
        clientId: client.id,
        sender: "bot",
        text: `⚠️ ¡Casi listo, **${firstName}**!\n\nSeleccionaste **${session.title}** (${format12h(
          session.startTime
        )}) en el **Lugar #${selectedSpotId}**, pero actualmente cuentas con **0 tokens disponibles**.\n\nPara completar tu reserva, adquiere un paquete de tokens en el **Kiosco** de tu sucursal o solicita tu recarga con recepción:`,
        timestamp: nowTime,
        interactiveType: "button",
        interactiveTitle: "Recargar Tokens",
        interactiveOptions: [
          {
            id: "opt_promos",
            title: "🎁 Ver Paquetes",
            description: "Precios y opciones",
          },
          {
            id: "opt_support",
            title: "👤 Hablar con Soporte",
            description: "Atención humana",
          },
        ],
      };
      state.messages.push(noCreditsMsg);
      writeDB(state);
      return { state, replyMessages: [noCreditsMsg] };
    }

    const tx = createBookingTransaction({
      clientId: client.id,
      sessionId: session.id,
      spotId: selectedSpotId,
      bookedVia: "whatsapp_bot",
    });

    if (tx.success && tx.booking) {
      const updatedClient = tx.state.clients.find((c) => c.id === client.id);
      if (updatedClient) {
        updatedClient.conversationDraft = {};
        writeDB(tx.state);
      }
      const latestMsg = tx.state.messages[tx.state.messages.length - 1];
      return {
        state: tx.state,
        replyMessages: latestMsg ? [latestMsg] : [],
      };
    } else {
      const errReply: ChatMessage = {
        id: `msg-${Date.now()}-bot`,
        clientId: client.id,
        sender: "bot",
        text: `⚠️ No se pudo reservar el lugar #${selectedSpotId}: ${tx.error}.\n\nPor favor intenta seleccionando otro lugar o escribe *menu* para reiniciar.`,
        timestamp: nowTime,
      };
      tx.state.messages.push(errReply);
      writeDB(tx.state);
      return { state: tx.state, replyMessages: [errReply] };
    }
  }

  // PASO 4: Se seleccionó una Sesión -> Elegir Lugar (Máquina / Tapete)
  let selectedSessionId: string | null = null;
  if (cleanInput.startsWith("session_")) {
    selectedSessionId = cleanInput.replace("session_", "");
  } else if (draft.step === "select_session") {
    const { startTime } = extractTimeAndStrip(cleanInput);
    if (startTime && draft.branchId && draft.dayOfWeek) {
      const match = findOfficialSessionForBranchDayTime(
        state,
        draft.branchId,
        draft.dayOfWeek,
        startTime
      );
      if (match) selectedSessionId = match.id;
    }
  }

  if (selectedSessionId) {
    const targetSession = state.sessions.find(
      (s) => s.id === selectedSessionId
    );
    if (targetSession) {
      const room = state.rooms.find((r) => r.id === targetSession.roomId);
      const occupied = new Set(
        state.bookings
          .filter(
            (b) =>
              b.sessionId === targetSession.id &&
              (b.date === draft.targetDate || !b.date) &&
              b.status !== "cancelada"
          )
          .map((b) => b.spotId)
      );

      const freeSpots =
        room?.spots.filter(
          (s) => !occupied.has(s.id) && s.status !== "maintenance"
        ) || [];

      if (freeSpots.length === 0) {
        const fullMsg: ChatMessage = {
          id: `msg-${Date.now()}-bot`,
          clientId: client.id,
          sender: "bot",
          text: `⚠️ La clase de **${targetSession.title}** (${format12h(
            targetSession.startTime
          )}) está **totalmente llena**.\n\nPor favor elige otro horario para esa sucursal:`,
          timestamp: nowTime,
        };
        state.messages.push(fullMsg);
        writeDB(state);
        return { state, replyMessages: [fullMsg] };
      }

      client.conversationDraft = {
        ...draft,
        sessionId: targetSession.id,
        startTime: targetSession.startTime,
        step: "select_spot",
      };
      writeDB(state);

      const spotOptions = freeSpots.slice(0, 10).map((sp) => ({
        id: `spot_${sp.id}`,
        title: `Lugar #${sp.id} (${sp.shortLabel})`.slice(0, 24),
        description: sp.zone || sp.label || `Lugar #${sp.id}`,
      }));

      const spotListMsg: ChatMessage = {
        id: `msg-${Date.now()}-bot`,
        clientId: client.id,
        sender: "bot",
        text: `🗓️ **Paso 4 de 4 · Elige tu Lugar**\n\nClase: **${targetSession.title}**\nHorario: **${format12h(
          targetSession.startTime
        )}** (${targetSession.instructor})\n\nSelecciona tu ${
          targetSession.discipline === "reformer" ? "máquina Reformer" : "tapete Hot Pilates"
        }:`,
        timestamp: nowTime,
        interactiveType: "list",
        interactiveTitle: "Lugares Disponibles",
        interactiveOptions: spotOptions,
        suggestedSpots: freeSpots.slice(0, 4).map((sp) => `Lugar #${sp.id}`),
      };
      state.messages.push(spotListMsg);
      writeDB(state);
      return { state, replyMessages: [spotListMsg] };
    }
  }

  // PASO 3: Se seleccionó un Día -> Elegir Clase y Horario
  let selectedDateString: string | null = null;
  let selectedDayOfWeek: DayOfWeek | null = null;

  if (cleanInput.startsWith("date_")) {
    const parts = cleanInput.split("_");
    selectedDateString = parts[1] || null;
    selectedDayOfWeek = (parts[2] as DayOfWeek) || null;
  } else if (draft.step === "select_date") {
    selectedDayOfWeek = detectDayOfWeekFromText(cleanInput);
    if (selectedDayOfWeek) {
      const upcoming = getUpcomingDays(4);
      const match = upcoming.find((u) => u.dayOfWeek === selectedDayOfWeek);
      selectedDateString = match ? match.dateString : null;
    }
  }

  if (selectedDayOfWeek && draft.branchId) {
    const branch = state.branches.find((b) => b.id === draft.branchId);
    const daySessions = state.sessions.filter(
      (s) =>
        s.branchId === draft.branchId &&
        (s.dayOfWeek === selectedDayOfWeek || !s.dayOfWeek)
    );

    if (daySessions.length === 0) {
      const noClassesMsg: ChatMessage = {
        id: `msg-${Date.now()}-bot`,
        clientId: client.id,
        sender: "bot",
        text: `En **${branch?.name}** no tenemos clases programadas para el **${selectedDayOfWeek}**.\n\nPor favor elige otro día para ver los horarios disponibles:`,
        timestamp: nowTime,
        interactiveType: "list",
        interactiveTitle: "Elegir Otro Día",
        interactiveOptions: getUpcomingDays(4).map((d) => ({
          id: `date_${d.dateString}_${d.dayOfWeek}`,
          title: d.shortTitle.slice(0, 24),
          description: `Ver clases de ${d.dayOfWeek}`,
        })),
      };
      state.messages.push(noClassesMsg);
      writeDB(state);
      return { state, replyMessages: [noClassesMsg] };
    }

    client.conversationDraft = {
      ...draft,
      dayOfWeek: selectedDayOfWeek,
      targetDate: selectedDateString || undefined,
      step: "select_session",
    };
    writeDB(state);

    // Calcular cupos libres para cada sesión
    const sessionOptions = daySessions.slice(0, 10).map((ses) => {
      const room = state.rooms.find((r) => r.id === ses.roomId);
      const occupied = new Set(
        state.bookings
          .filter(
            (b) =>
              b.sessionId === ses.id &&
              (b.date === selectedDateString || !b.date) &&
              b.status !== "cancelada"
          )
          .map((b) => b.spotId)
      );
      const freeCount = room
        ? room.spots.filter(
            (s) => !occupied.has(s.id) && s.status !== "maintenance"
          ).length
        : 0;

      return {
        id: `session_${ses.id}`,
        title: `${ses.startTime} · ${ses.title}`.slice(0, 24),
        description: `${ses.instructor} · ${freeCount} lugares disponibles`,
      };
    });

    const classListMsg: ChatMessage = {
      id: `msg-${Date.now()}-bot`,
      clientId: client.id,
      sender: "bot",
      text: `🗓️ **Paso 3 de 4 · Selecciona tu Horario**\n\nClases en **${branch?.name}** para el **${selectedDayOfWeek}**:\n\nElige la clase y hora que mejor te acomode:`,
      timestamp: nowTime,
      interactiveType: "list",
      interactiveTitle: "Horarios Disponibles",
      interactiveOptions: sessionOptions,
    };
    state.messages.push(classListMsg);
    writeDB(state);
    return { state, replyMessages: [classListMsg] };
  }

  // PASO 2: Se seleccionó una Sucursal -> Elegir Fecha / Calendario
  let matchedBranchId: string | null = null;
  if (cleanInput.startsWith("branch_")) {
    matchedBranchId = cleanInput.replace("branch_", "");
  } else if (draft.step === "select_branch") {
    matchedBranchId = detectBranchIdFromText(cleanInput, state);
  }

  if (matchedBranchId) {
    const branch = state.branches.find((b) => b.id === matchedBranchId);
    if (branch) {
      const upcoming = getUpcomingDays(4);
      client.conversationDraft = {
        branchId: branch.id,
        branchName: branch.name,
        step: "select_date",
      };
      writeDB(state);

      const dateListMsg: ChatMessage = {
        id: `msg-${Date.now()}-bot`,
        clientId: client.id,
        sender: "bot",
        text: `🗓️ **Paso 2 de 4 · Selecciona el Día**\n\nHas elegido **${branch.name}** (${
          branch.brand === "Devotion" ? "Hot Pilates 38°C" : "Reformer"
        }).\n\n¿Para qué día te gustaría reservar tu clase?`,
        timestamp: nowTime,
        interactiveType: "list",
        interactiveTitle: "Calendario de Días",
        interactiveOptions: upcoming.map((d) => ({
          id: `date_${d.dateString}_${d.dayOfWeek}`,
          title: d.shortTitle.slice(0, 24),
          description: `Clases de ${d.dayOfWeek} en ${branch.name}`,
        })),
        suggestedSpots: upcoming.map((d) => d.shortTitle),
      };
      state.messages.push(dateListMsg);
      writeDB(state);
      return { state, replyMessages: [dateListMsg] };
    }
  }

  // PASO 1: Iniciar Reservación -> Elegir Sucursal
  if (
    cleanInput === "opt_book" ||
    (!draft.step && (lower.includes("reservar") || lower.includes("agendar")))
  ) {
    client.conversationDraft = { step: "select_branch" };
    writeDB(state);

    const activeBranches = state.branches.filter(
      (b) => b.id !== "br-stiliza-campanario" // STCA aún sin lugares
    );

    const branchListMsg: ChatMessage = {
      id: `msg-${Date.now()}-bot`,
      clientId: client.id,
      sender: "bot",
      text: `🗓️ **Paso 1 de 4 · Selecciona tu Estudio**\n\n¿En cuál de nuestras sucursales deseas agendar tu clase?`,
      timestamp: nowTime,
      interactiveType: "list",
      interactiveTitle: "Sucursales Disponibles",
      interactiveOptions: activeBranches.map((b) => ({
        id: `branch_${b.id}`,
        title: b.name.slice(0, 24),
        description:
          b.brand === "Devotion"
            ? "Hot Pilates Infrarrojo 38°C"
            : "Pilates Reformer Boutique",
      })),
      suggestedSpots: [
        "Stiliza San Isidro",
        "Stiliza Juriquilla",
        "Devotion Zibatá",
        "Devotion Juriquilla",
      ],
    };
    state.messages.push(branchListMsg);
    writeDB(state);
    return { state, replyMessages: [branchListMsg] };
  }

  // =========================================================================
  // 5. MENÚ PRINCIPAL POR DEFECTO PARA USUARIOS REGISTRADOS
  // =========================================================================
  const regMenuMsg: ChatMessage = {
    id: `msg-${Date.now()}-bot`,
    clientId: client.id,
    sender: "bot",
    text: `¡Hola, **${firstName}**! ✨ Te damos la bienvenida a tu centro de reservaciones de **Stiliza & Devotion**.\n\nActualmente tienes **${client.creditsRemaining} tokens disponibles**.\n\n¿En qué podemos ayudarte hoy?`,
    timestamp: nowTime,
    interactiveType: "list",
    interactiveTitle: "Menú Principal",
    interactiveOptions: getRegisteredMenuOptions(client.creditsRemaining),
    suggestedSpots: [
      "🗓️ Reservar Clase",
      "💳 Mis Tokens y Recargas",
      "📋 Ver mi Pase QR",
      "👤 Hablar con Soporte",
    ],
  };
  state.messages.push(regMenuMsg);
  writeDB(state);
  return { state, replyMessages: [regMenuMsg] };
}
