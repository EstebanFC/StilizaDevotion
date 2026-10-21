import { createBookingTransaction, readDB, writeDB } from "@/lib/db";
import {
  ChatMessage,
  ClassSession,
  CRMDatabaseState,
  DayOfWeek,
} from "@/types/crm";

/**
 * Obtiene el día de la semana actual en horario de México (o Martes por defecto).
 */
function getCurrentDayOfWeekMX(): DayOfWeek {
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

function getNextDayOfWeek(current: DayOfWeek): DayOfWeek {
  const order: DayOfWeek[] = [
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
    "Domingo",
  ];
  const idx = order.indexOf(current);
  return order[(idx + 1) % order.length];
}

/**
 * Extrae el día de la semana si la alumna lo menciona ("lunes", "martes", "miércoles", "hoy", "mañana", etc.)
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
    return getNextDayOfWeek(getCurrentDayOfWeekMX());
  }
  return null;
}

/**
 * Extrae la sucursal mencionada por nombre o por sus siglas oficiales (STSI, STJU, STCA, DEZI, DEJU, DECA).
 */
function detectBranchIdFromText(
  text: string,
  state: CRMDatabaseState
): string | null {
  const lower = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // Siglas oficiales
  if (/\bstsi\b/.test(lower)) return "br-stiliza-san-isidro";
  if (/\bstju\b/.test(lower)) return "br-stiliza-juriquilla";
  if (/\bstca\b/.test(lower)) return "br-stiliza-campanario";
  if (/\bdezi\b/.test(lower)) return "br-devotion-zibata";
  if (/\bdeju\b/.test(lower)) return "br-devotion-juriquilla";
  if (/\bdeca\b/.test(lower)) return "br-devotion-campanario";

  // Nombres completos o parciales
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

/**
 * Extrae el horario del mensaje (ej. "7:15am", "a las 6pm", "6 pm", "18:00", "7am", "a las 8:15")
 * y devuelve { startTime, textWithoutTime } para que el número de la hora NUNCA se confunda con el lugar.
 */
function extractTimeAndStrip(text: string): {
  startTime: string | null;
  textWithoutTime: string;
} {
  let working = text;
  let detectedTime: string | null = null;

  // 1. Formato con am/pm o hrs: "a las 7:15am", "6pm", "8:15 am", "18:00 hrs"
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

  // 2. Formato con dos puntos: "7:15", "08:15", "18:00", "6:15"
  const timeRegex2 = /(?:a\s+las\s+)?\b([012]?\d):([0-5]\d)\b/i;
  const m2 = working.match(timeRegex2);
  if (m2) {
    let hour = Number(m2[1]);
    const mins = m2[2];
    // Si pone "6:00" sin AM/PM, en la tarde es 18:00 (las de la mañana son 06:15)
    if (hour === 6 && mins === "00") hour = 18;
    if (hour === 7 && mins === "00") hour = 19;
    if (hour === 8 && mins === "00") hour = 20;
    detectedTime = `${String(hour).padStart(2, "0")}:${mins}`;
    working = working.replace(m2[0], " ");
    return { startTime: detectedTime, textWithoutTime: working };
  }

  // 3. Formato "a las 6", "a las 7", "a las 8", "a las 9", "a las 10"
  const timeRegex3 = /\ba\s+las\s+(\d{1,2})\b/i;
  const m3 = working.match(timeRegex3);
  if (m3) {
    let hour = Number(m3[1]);
    if (hour === 6) hour = 18;
    detectedTime = `${String(hour).padStart(2, "0")}:00`;
    working = working.replace(m3[0], " ");
    return { startTime: detectedTime, textWithoutTime: working };
  }

  return { startTime: null, textWithoutTime: working };
}

/**
 * Extrae el número de lugar (1 al 12) del texto libre de horas.
 */
function extractSpotFromCleanText(cleanText: string): string | null {
  const m1 = cleanText.match(
    /(?:en\s+el|en\s+la|lugar|m[aá]quina|tapete|reformer|mat|n[uú]mero|numero|#|\bel|\bla)\s*#?(\d{1,2})\b/i
  );
  if (m1) {
    const num = Number(m1[1]);
    if (num >= 1 && num <= 16) return String(num);
  }

  const m2 = cleanText.match(/\b(?:RB|R|M)-?(\d{1,2})\b/i);
  if (m2) {
    return String(Number(m2[1]));
  }

  const m3 = cleanText.trim().match(/^#?(\d{1,2})$/);
  if (m3) {
    const num = Number(m3[1]);
    if (num >= 1 && num <= 16) return String(num);
  }

  return null;
}

function format12h(startTime: string): string {
  const [hStr, mStr] = startTime.split(":");
  const h = Number(hStr);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, "0")}:${mStr} ${ampm}`;
}

/**
 * Busca la clase oficial en la sucursal y día indicados.
 * Si la alumna dijo "07:00" o "7am", pero la clase matutina oficial es "07:15", la empareja inteligentemente.
 */
function findOfficialSessionForBranchDayTime(
  state: CRMDatabaseState,
  branchId: string,
  dayOfWeek: DayOfWeek,
  requestedTime: string
): ClassSession | null {
  const daySessions = state.sessions.filter(
    (s) =>
      s.branchId === branchId &&
      (s.dayOfWeek || "Martes").toLowerCase() === dayOfWeek.toLowerCase()
  );

  // 1. Coincidencia exacta (ej. "18:00" o "07:15")
  const exact = daySessions.find((s) => s.startTime === requestedTime);
  if (exact) return exact;

  // 2. Si pidió hora cerrada en la mañana (ej. "06:00", "07:00", "08:00", "09:00", "10:00") y la clase es ":15"
  const reqHour = requestedTime.split(":")[0];
  const withQuarter = daySessions.find((s) => s.startTime === `${reqHour}:15`);
  if (withQuarter) return withQuarter;

  // 3. Si dijo "07:00" sin AM/PM pero quería "19:00" (7:00 PM) o viceversa
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

export function processAIChatTurn(params: {
  clientId: string;
  userText: string;
}): {
  state: CRMDatabaseState;
  replyMessages: ChatMessage[];
} {
  let state = readDB();
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

  const lower = params.userText.toLowerCase().trim();
  const firstName = client.name.replace(" (Sin Cuenta)", "").split(" ")[0];

  // FLUJO CUANDO EL USUARIO ESCRIBE SIN TENER UNA CUENTA REGISTRADA
  if (client.isUnregisteredLead) {
    // ¿Está enviando el comando "REGISTRARME Nombre Correo"?
    const regMatch = params.userText
      .trim()
      .match(/^(?:registrarme|registro|alta|crear cuenta)\s+(.+)$/i);
    if (regMatch) {
      const rest = regMatch[1].trim();
      const emailMatch = rest.match(/([^\s@]+@[^\s@]+\.[^\s@]+)/);
      const email = emailMatch ? emailMatch[1] : "alumno@stilizadevotion.com";
      const cleanName = rest
        .replace(emailMatch ? emailMatch[0] : "", "")
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

      const regReply: ChatMessage = {
        id: `msg-${Date.now()}-bot`,
        clientId: client.id,
        sender: "bot",
        text: `✅ ¡Listo, **${client.name}**! Hemos creado tu cuenta de alumno(a) en **Stiliza & Devotion** vinculada al número **${client.phone}** (${client.email}).\n\nActualmente tienes **0 tokens disponibles**. Para poder agendar tu lugar y recibir tu código QR:\n• Adquiere tu paquete de tokens en el **Kiosco** de tu sucursal\n• O solicita en Administración que activen tu paquete (**Single Drop-In 1 Token**, **8 Tokens**, **16 Tokens** o **Black Pass 30**).`,
        timestamp: nowTime,
      };
      state.messages.push(regReply);
      writeDB(state);
      return { state, replyMessages: [regReply] };
    }

    const unregisteredReply: ChatMessage = {
      id: `msg-${Date.now()}-bot`,
      clientId: client.id,
      sender: "bot",
      text: `¡Hola! 👋 Bienvenido(a) a **Stiliza & Devotion**.\n\nVemos que tu número (**${client.phone}**) **aún no tiene una cuenta de alumno(a) registrada** en nuestro sistema, por lo que todavía no podemos procesar reservas.\n\nPara crear tu cuenta tienes 2 opciones:\n1️⃣ **Por WhatsApp**: Respóndeme con la palabra **REGISTRARME** seguida de tu Nombre Completo y Correo (ejemplo: *REGISTRARME Esteban Flores esteban@correo.com*).\n2️⃣ **En Estudio / Admin**: Solicita tu alta en recepción o en el Kiosco de tu sucursal para activar tu cuenta y tus tokens.`,
      timestamp: nowTime,
      suggestedSpots: [
        "REGISTRARME Esteban Flores esteban@gmail.com",
      ],
    };
    state.messages.push(unregisteredReply);
    writeDB(state);
    return { state, replyMessages: [unregisteredReply] };
  }

  // Si pide su código QR activo
  if (
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
          text: `¡Claro, ${firstName}! Aquí tienes tu código QR activo para **${activeBooking.sessionTitle}** (${activeBooking.startTime} hrs · ${activeBooking.branchName}) en el **Lugar #${activeBooking.spotId}**. Escanéalo en el Kiosco al llegar:`,
          timestamp: nowTime,
          bookingAttachment: activeBooking,
        }
      : {
          id: `msg-${Date.now()}-bot`,
          clientId: client.id,
          sender: "bot",
          text: `Hola ${firstName}, por el momento no tienes una reserva pendiente de check-in. Dime en qué sucursal, día, horario y número de lugar quieres agendar:`,
          timestamp: nowTime,
          suggestedSpots: [
            "Stiliza San Isidro a las 6pm en el 3",
            "Devotion Zibatá a las 7:15am en el 4",
            "Devotion Juriquilla a las 8:15am en el 5",
          ],
        };
    state.messages.push(botReply);
    writeDB(state);
    return { state, replyMessages: [botReply] };
  }

  // Extraer Sucursal, Día, Hora y Lugar del mensaje
  const detectedBranchId = detectBranchIdFromText(params.userText, state);
  const detectedDay = detectDayOfWeekFromText(params.userText);
  const { startTime: detectedTime, textWithoutTime } = extractTimeAndStrip(
    params.userText
  );
  const detectedSpot = extractSpotFromCleanText(textWithoutTime);

  const draft = client.conversationDraft || {};
  const finalBranchId = detectedBranchId || draft.branchId;
  const finalDay: DayOfWeek =
    detectedDay || draft.dayOfWeek || getCurrentDayOfWeekMX();
  const finalTime = detectedTime || draft.startTime;
  const finalSpot = detectedSpot;

  client.conversationDraft = {
    branchId: finalBranchId,
    dayOfWeek: finalDay,
    startTime: finalTime,
  };
  writeDB(state);

  // CASO A: Tenemos Sucursal + Hora + Lugar
  if (finalBranchId && finalTime && finalSpot) {
    const targetSession = findOfficialSessionForBranchDayTime(
      state,
      finalBranchId,
      finalDay,
      finalTime
    );

    if (!targetSession) {
      const branch = state.branches.find((b) => b.id === finalBranchId);
      const daySessions = state.sessions.filter(
        (s) => s.branchId === finalBranchId && s.dayOfWeek === finalDay
      );
      const hoursList = daySessions
        .map(
          (s) =>
            `${format12h(s.startTime)} (${s.title.split(" · ")[0]})`
        )
        .join(", ");

      const noClassMsg: ChatMessage = {
        id: `msg-${Date.now()}-bot`,
        clientId: client.id,
        sender: "bot",
        text:
          daySessions.length > 0
            ? `En **${branch?.name}** los días **${finalDay}** no tenemos clase a las ${finalTime}. Los horarios oficiales de **${finalDay}** son:\n\n• ${hoursList}\n\n¿En cuál de estos horarios te reservo el **Lugar #${finalSpot}**?`
            : `En **${branch?.name}** no tenemos clases programadas los días **${finalDay}**. ¿Qué otro día de la semana u otra sucursal te gustaría reservar?`,
        timestamp: nowTime,
        suggestedSpots: daySessions
          .slice(0, 4)
          .map(
            (s) =>
              `${branch?.name} el ${finalDay} a las ${s.startTime} en el ${finalSpot}`
          ),
      };
      state.messages.push(noClassMsg);
      writeDB(state);
      return { state, replyMessages: [noClassMsg] };
    }

    const tx = createBookingTransaction({
      clientId: client.id,
      sessionId: targetSession.id,
      spotId: finalSpot,
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
      state = tx.state;
      const room = state.rooms.find((r) => r.id === targetSession.roomId);
      const occupied = new Set(
        state.bookings
          .filter(
            (b) => b.sessionId === targetSession.id && b.status !== "cancelada"
          )
          .map((b) => b.spotId)
      );
      const freeSpotsList =
        room?.spots
          .filter((s) => !occupied.has(s.id) && s.status !== "maintenance")
          .map((s) => s.id) || [];

      const errReply: ChatMessage = {
        id: `msg-${Date.now()}-bot`,
        clientId: client.id,
        sender: "bot",
        text: `⚠️ ${tx.error}\n\n${
          freeSpotsList.length > 0
            ? `Para **${targetSession.title}** (${finalDay} · ${format12h(targetSession.startTime)}) tenemos disponibles los lugares: **${freeSpotsList.join(", ")}**.\n\nRespóndeme solo con el número de lugar que prefieras (ej. "${freeSpotsList[0]}"):`
            : `Todos los lugares de esa clase están ocupados. ¿Qué otro horario prefieres?`
        }`,
        timestamp: nowTime,
        suggestedSpots: freeSpotsList
          .slice(0, 4)
          .map(
            (sp) =>
              `${targetSession.branchName} a las ${targetSession.startTime} en el ${sp}`
          ),
      };
      state.messages.push(errReply);
      writeDB(state);
      return { state, replyMessages: [errReply] };
    }
  }

  // CASO B: Tiene Sucursal + Hora, solo falta el número de Lugar
  if (finalBranchId && finalTime && !finalSpot) {
    const targetSession = findOfficialSessionForBranchDayTime(
      state,
      finalBranchId,
      finalDay,
      finalTime
    );
    const room = state.rooms.find((r) => r.branchId === finalBranchId);

    if (!room || room.spots.length === 0) {
      const msg: ChatMessage = {
        id: `msg-${Date.now()}-bot`,
        clientId: client.id,
        sender: "bot",
        text: `Por el momento **Stiliza Campanario (STCA)** aún no tiene lugares ni horarios activos. ¿Te gustaría reservar en **Devotion Campanario (DECA)**, **Stiliza San Isidro (STSI)** o **Juriquilla**?`,
        timestamp: nowTime,
      };
      state.messages.push(msg);
      writeDB(state);
      return { state, replyMessages: [msg] };
    }

    if (!targetSession) {
      const daySessions = state.sessions.filter(
        (s) => s.branchId === finalBranchId && s.dayOfWeek === finalDay
      );
      const hoursList = daySessions
        .map(
          (s) => `${format12h(s.startTime)} (${s.title.split(" · ")[0]})`
        )
        .join(", ");

      const msg: ChatMessage = {
        id: `msg-${Date.now()}-bot`,
        clientId: client.id,
        sender: "bot",
        text:
          daySessions.length > 0
            ? `En **${room.branchName}** el día **${finalDay}** no hay clase a las ${finalTime}. Los horarios disponibles para **${finalDay}** son:\n• ${hoursList}\n\nDime cuál horario y lugar prefieres:`
            : `En **${room.branchName}** no hay clases programadas en **${finalDay}**. ¿Qué otro día te gustaría agendar?`,
        timestamp: nowTime,
      };
      state.messages.push(msg);
      writeDB(state);
      return { state, replyMessages: [msg] };
    }

    // Actualizar el draft con la hora exacta oficial (ej. 07:15 si dijo 7am)
    client.conversationDraft = {
      branchId: finalBranchId,
      dayOfWeek: finalDay,
      startTime: targetSession.startTime,
    };

    const occupied = new Set(
      state.bookings
        .filter(
          (b) => b.sessionId === targetSession.id && b.status !== "cancelada"
        )
        .map((b) => b.spotId)
    );
    const freeSpots = room.spots
      .filter((s) => !occupied.has(s.id) && s.status !== "maintenance")
      .map((s) => s.id);

    const botReply: ChatMessage = {
      id: `msg-${Date.now()}-bot`,
      clientId: client.id,
      sender: "bot",
      text: `✨ Perfecto, para **${targetSession.title}** (**${finalDay} ${format12h(targetSession.startTime)}**) tenemos disponibles los lugares: **${freeSpots.join(", ")}**.\n\nRespóndeme únicamente con el número de lugar que quieres (por ejemplo: **"en el ${freeSpots[0] || "1"}"**) y te envío tu código QR:`,
      timestamp: nowTime,
      suggestedSpots: freeSpots
        .slice(0, 5)
        .map(
          (sp) =>
            `${room.branchName} a las ${targetSession.startTime} en el ${sp}`
        ),
    };
    state.messages.push(botReply);
    writeDB(state);
    return { state, replyMessages: [botReply] };
  }

  // CASO C: Tiene Sucursal, pero falta Hora (y quizá Lugar) -> le mostramos los horarios oficiales exactos de esa sucursal para ese día
  if (finalBranchId && !finalTime) {
    const room = state.rooms.find((r) => r.branchId === finalBranchId);
    if (!room || room.spots.length === 0) {
      const msg: ChatMessage = {
        id: `msg-${Date.now()}-bot`,
        clientId: client.id,
        sender: "bot",
        text: `Por el momento **Stiliza Campanario (STCA)** no tiene horarios ni lugares activos. ¿En cuál otra sucursal te gustaría agendar?`,
        timestamp: nowTime,
      };
      state.messages.push(msg);
      writeDB(state);
      return { state, replyMessages: [msg] };
    }

    const daySessions = state.sessions.filter(
      (s) => s.branchId === finalBranchId && s.dayOfWeek === finalDay
    );
    const scheduleBulletList =
      daySessions.length > 0
        ? daySessions
            .map(
              (s) =>
                `• **${format12h(s.startTime)}** — ${s.title.split(" · ")[0]}`
            )
            .join("\n")
        : "• Sin clases programadas este día";

    const botReply: ChatMessage = {
      id: `msg-${Date.now()}-bot`,
      clientId: client.id,
      sender: "bot",
      text: `🤍 Excelente, seleccionaste **${room.branchName}** (Lugares 1 al ${room.spots.length}).\n\nHorarios oficiales de **${finalDay}**:\n${scheduleBulletList}\n\n¿A qué hora y en qué número de lugar te reservo? (Ej. *"a las ${daySessions[0]?.startTime || "18:00"} en el ${finalSpot || "3"}"*):`,
      timestamp: nowTime,
      suggestedSpots: daySessions
        .slice(0, 4)
        .map(
          (s, idx) =>
            `${room.branchName} a las ${s.startTime} en el ${finalSpot || idx + 1}`
        ),
    };
    state.messages.push(botReply);
    writeDB(state);
    return { state, replyMessages: [botReply] };
  }

  // CASO D: Saludo inicial o consulta general
  const botReply: ChatMessage = {
    id: `msg-${Date.now()}-bot`,
    clientId: client.id,
    sender: "bot",
    text: `¡Hola ${firstName}! Soy **Stiliza & Devotion Concierge IA** 🤍. Tienes **${client.creditsRemaining} tokens disponibles**.\n\nNuestros estudios activos (**Lunes a Domingo**):\n• **Stiliza San Isidro (STSI)** · REFORMER (5 lugares)\n• **Stiliza Juriquilla (STJU)** · REFORMER (8 lugares)\n• **Devotion Zibatá (DEZI)** · FULL / LOWER / UPPER BODY (12 lugares)\n• **Devotion Juriquilla (DEJU)** · FULL / LOWER / UPPER / STRETCHING (12 lugares)\n• **Devotion Campanario (DECA)** · FULL / LOWER / UPPER BODY (12 lugares)\n\nEscríbeme el estudio, hora y lugar (ej. *"Stiliza San Isidro a las 6pm en el 3"* o *"DEZI a las 7:15am en el 4"*) y te envío tu código QR al instante:`,
    timestamp: nowTime,
    suggestedSpots: [
      "Stiliza San Isidro a las 6pm en el 3",
      "Devotion Zibatá a las 7:15am en el 3",
      "Devotion Juriquilla a las 8:15am en el 4",
      "Stiliza Juriquilla a las 6pm en el 2",
    ],
  };

  state.messages.push(botReply);
  writeDB(state);
  return { state, replyMessages: [botReply] };
}
