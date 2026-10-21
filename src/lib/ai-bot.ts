import { createBookingTransaction, readDB, writeDB } from "@/lib/db";
import { ChatMessage, ClassSession, CRMDatabaseState } from "@/types/crm";

/**
 * Extrae la sucursal mencionada por el usuario en el texto.
 */
function detectBranchIdFromText(
  text: string,
  state: CRMDatabaseState
): string | null {
  const lower = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (lower.includes("san isidro")) return "br-stiliza-san-isidro";
  if (lower.includes("zibata")) return "br-devotion-zibata";
  if (lower.includes("stiliza juriquilla")) return "br-stiliza-juriquilla";
  if (lower.includes("devotion juriquilla")) return "br-devotion-juriquilla";
  if (lower.includes("stiliza campanario")) return "br-stiliza-campanario";
  if (lower.includes("devotion campanario")) return "br-devotion-campanario";

  // Si solo dice "campanario", por defecto usamos Devotion Campanario (ya que Stiliza Campanario tiene 0 lugares)
  if (lower.includes("campanario")) return "br-devotion-campanario";

  // Si solo dice "juriquilla": si menciona reformer/stiliza -> Stiliza Juriquilla, si menciona hot/devotion o general -> Devotion Juriquilla
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
 * Extrae el horario del mensaje (ej. "a las 6pm", "6 pm", "18:00", "7am", "a las 8 de la mañana")
 * y devuelve { startTime: "18:00", textWithoutTime: "..." } para que el número de la hora
 * NUNCA se confunda con el número de lugar/máquina.
 */
function extractTimeAndStrip(text: string): {
  startTime: string | null;
  textWithoutTime: string;
} {
  let working = text;
  let detectedTime: string | null = null;

  // 1. Formato explícito con am/pm o hrs: "a las 6pm", "6:30 pm", "7am", "18:00 hrs", "18:00"
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

  // 2. Formato 24h con dos puntos: "18:00", "07:00", "19:30"
  const timeRegex2 = /(?:a\s+las\s+)?\b([012]?\d):([0-5]\d)\b/i;
  const m2 = working.match(timeRegex2);
  if (m2) {
    let hour = Number(m2[1]);
    const mins = m2[2];
    // Si pone "6:00" y en los estudios solo hay 6pm (18:00) y 7am-10am:
    if (hour === 6) hour = 18;
    detectedTime = `${String(hour).padStart(2, "0")}:${mins}`;
    working = working.replace(m2[0], " ");
    return { startTime: detectedTime, textWithoutTime: working };
  }

  // 3. Formato "a las 6", "a las 7", "a las 8", "a las 9", "a las 10"
  const timeRegex3 = /\ba\s+las\s+(\d{1,2})\b/i;
  const m3 = working.match(timeRegex3);
  if (m3) {
    let hour = Number(m3[1]);
    // Horarios de sucursal: 7am a 10am y 6pm (18:00) a 8pm (20:00)
    if (hour === 6) hour = 18;
    detectedTime = `${String(hour).padStart(2, "0")}:00`;
    working = working.replace(m3[0], " ");
    return { startTime: detectedTime, textWithoutTime: working };
  }

  return { startTime: null, textWithoutTime: working };
}

/**
 * Extrae el número de lugar (1 al 12) del texto libre de horas.
 * Soporta: "en el 3", "el 3", "lugar 3", "máquina 3", "tapete 3", "#3", o simplemente "3".
 */
function extractSpotFromCleanText(cleanText: string): string | null {
  // 1. Con preposición o sustantivo: "en el 3", "lugar 4", "el 2", "la 5", "#3"
  const m1 = cleanText.match(
    /(?:en\s+el|en\s+la|lugar|m[aá]quina|tapete|reformer|mat|n[uú]mero|numero|#|\bel|\bla)\s*#?(\d{1,2})\b/i
  );
  if (m1) {
    const num = Number(m1[1]);
    if (num >= 1 && num <= 16) return String(num);
  }

  // 2. Código tipo R-03 o M-04
  const m2 = cleanText.match(/\b(?:RB|R|M)-?(\d{1,2})\b/i);
  if (m2) {
    return String(Number(m2[1]));
  }

  // 3. Si el mensaje completo es únicamente el número (ej. el usuario responde "3")
  const m3 = cleanText.trim().match(/^#?(\d{1,2})$/);
  if (m3) {
    const num = Number(m3[1]);
    if (num >= 1 && num <= 16) return String(num);
  }

  return null;
}

/**
 * Busca la sesión correspondiente a (branchId, startTime) o la crea dinámicamente
 * dentro de los horarios válidos de sucursal (07:00 a 10:00 y 18:00 a 20:00).
 */
function findOrEnsureSession(
  state: CRMDatabaseState,
  branchId: string,
  startTime: string
): ClassSession | null {
  const existing = state.sessions.find(
    (s) => s.branchId === branchId && s.startTime === startTime
  );
  if (existing) return existing;

  const branch = state.branches.find((b) => b.id === branchId);
  const room = state.rooms.find((r) => r.branchId === branchId);
  if (!branch || !room || room.spots.length === 0) return null;

  const defaultCoach =
    state.coaches.find((c) => c.specialty === room.discipline)?.name ||
    state.coaches[0]?.name ||
    "Coach Stiliza";

  const newSession: ClassSession = {
    id: `ses-${branchId}-${startTime.replace(":", "")}`,
    title:
      room.discipline === "hot_pilates"
        ? `Hot Pilates 38°C · ${branch.name.replace("Devotion ", "")}`
        : `Pilates Reformer · ${branch.name.replace("Stiliza ", "")}`,
    discipline: room.discipline,
    branchId: branch.id,
    branchName: branch.name,
    brand: branch.brand,
    roomId: room.id,
    roomName: room.name,
    instructor: defaultCoach,
    instructorAvatar: "CS",
    date: "2026-10-20",
    dayOfWeek: "Martes",
    startTime,
    durationMinutes: 50,
    level: "Todos los niveles",
    intensity: room.discipline === "hot_pilates" ? "Intensa 🔥" : "Alta",
  };

  state.sessions.push(newSession);
  writeDB(state);
  return newSession;
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
  const firstName = client.name.split(" ")[0];

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
          text: `Hola ${firstName}, por el momento no tienes una reserva pendiente de check-in. Dime en qué sucursal, horario (7am–10am o 6pm–8pm) y número de lugar quieres agendar hoy:`,
          timestamp: nowTime,
          suggestedSpots: [
            "Stiliza San Isidro a las 6pm en el 3",
            "Devotion Zibatá a las 7pm en el 4",
            "Devotion Juriquilla a las 8am en el 5",
          ],
        };
    state.messages.push(botReply);
    writeDB(state);
    return { state, replyMessages: [botReply] };
  }

  // 1. Extraer sucursal, hora y lugar del mensaje actual
  const detectedBranchId = detectBranchIdFromText(params.userText, state);
  const { startTime: detectedTime, textWithoutTime } = extractTimeAndStrip(
    params.userText
  );
  const detectedSpot = extractSpotFromCleanText(textWithoutTime);

  // Combinar con el borrador conversacional previo (para que no vuelva a preguntar lo que ya dijo la alumna)
  const draft = client.conversationDraft || {};
  const finalBranchId = detectedBranchId || draft.branchId;
  const finalTime = detectedTime || draft.startTime;
  const finalSpot = detectedSpot;

  client.conversationDraft = {
    branchId: finalBranchId,
    startTime: finalTime,
  };
  writeDB(state);

  // CASO A: ¡Ya tenemos Sucursal + Hora + Lugar! (Ej. "Stiliza San Isidro a las 6pm en el 3" o en pasos)
  if (finalBranchId && finalTime && finalSpot) {
    const targetSession = findOrEnsureSession(state, finalBranchId, finalTime);
    if (targetSession) {
      const tx = createBookingTransaction({
        clientId: client.id,
        sessionId: targetSession.id,
        spotId: finalSpot,
        bookedVia: "whatsapp_bot",
      });

      if (tx.success && tx.booking) {
        // Limpiar borrador al concretar la reserva
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
              (b) =>
                b.sessionId === targetSession.id && b.status !== "cancelada"
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
              ? `Para **${targetSession.branchName}** a las **${targetSession.startTime} hrs** tenemos disponibles los lugares: **${freeSpotsList.join(", ")}**.\n\nRespóndeme solo con el número de lugar que prefieras (ej. "${freeSpotsList[0]}"):`
              : `Todos los lugares de las ${targetSession.startTime} hrs están ocupados. ¿Qué otro horario (7am–10am o 6pm–8pm) prefieres?`
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
  }

  // CASO B: Tiene Sucursal y Lugar, pero no dijo la Hora (usamos la clase principal de esa sucursal o preguntamos solo la hora)
  if (finalBranchId && !finalTime && finalSpot) {
    const defaultSession = state.sessions.find(
      (s) => s.branchId === finalBranchId && s.roomId !== "room-stiliza-campanario"
    );
    if (defaultSession) {
      const tx = createBookingTransaction({
        clientId: client.id,
        sessionId: defaultSession.id,
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
      }
    }
  }

  // CASO C: Tiene Sucursal + Hora, solo falta el número de Lugar
  if (finalBranchId && finalTime && !finalSpot) {
    const targetSession = findOrEnsureSession(state, finalBranchId, finalTime);
    const room = state.rooms.find((r) => r.branchId === finalBranchId);
    if (!room || room.spots.length === 0) {
      const msg: ChatMessage = {
        id: `msg-${Date.now()}-bot`,
        clientId: client.id,
        sender: "bot",
        text: `Por el momento **Stiliza Campanario** aún no tiene lugares habilitados. ¿Te gustaría reservar en **Devotion Campanario**, **Stiliza San Isidro** o **Juriquilla**?`,
        timestamp: nowTime,
      };
      state.messages.push(msg);
      writeDB(state);
      return { state, replyMessages: [msg] };
    }

    const occupied = new Set(
      state.bookings
        .filter(
          (b) =>
            targetSession &&
            b.sessionId === targetSession.id &&
            b.status !== "cancelada"
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
      text: `✨ Perfecto, para **${room.branchName}** a las **${finalTime} hrs** tenemos disponibles los lugares: **${freeSpots.join(", ")}**.\n\nRespóndeme únicamente con el número de lugar que quieres (por ejemplo: **"en el ${freeSpots[0] || "1"}"**) y te envío tu código QR:`,
      timestamp: nowTime,
      suggestedSpots: freeSpots
        .slice(0, 5)
        .map((sp) => `${room.branchName} a las ${finalTime} en el ${sp}`),
    };
    state.messages.push(botReply);
    writeDB(state);
    return { state, replyMessages: [botReply] };
  }

  // CASO D: Tiene Sucursal, pero falta Hora y Lugar
  if (finalBranchId && !finalTime && !finalSpot) {
    const room = state.rooms.find((r) => r.branchId === finalBranchId);
    if (!room || room.spots.length === 0) {
      const msg: ChatMessage = {
        id: `msg-${Date.now()}-bot`,
        clientId: client.id,
        sender: "bot",
        text: `Por el momento **Stiliza Campanario** tiene 0 lugares activos. ¿En cuál otra sucursal te gustaría agendar?`,
        timestamp: nowTime,
      };
      state.messages.push(msg);
      writeDB(state);
      return { state, replyMessages: [msg] };
    }

    const botReply: ChatMessage = {
      id: `msg-${Date.now()}-bot`,
      clientId: client.id,
      sender: "bot",
      text: `🤍 Excelente, seleccionaste **${room.branchName}** (${room.spots.length} lugares disponibles: del 1 al ${room.spots.length}).\n\nNuestros horarios son:\n• **Mañana**: 7:00 am, 8:00 am, 9:00 am y 10:00 am\n• **Tarde/Noche**: 6:00 pm, 7:00 pm y 8:00 pm\n\n¿A qué hora y en qué número de lugar te reservo? (Ej. *"a las 6pm en el 3"*):`,
      timestamp: nowTime,
      suggestedSpots: [
        `${room.branchName} a las 7am en el 1`,
        `${room.branchName} a las 8am en el 2`,
        `${room.branchName} a las 6pm en el 3`,
        `${room.branchName} a las 7pm en el 4`,
      ],
    };
    state.messages.push(botReply);
    writeDB(state);
    return { state, replyMessages: [botReply] };
  }

  // CASO E: Saludo inicial o consulta general
  const botReply: ChatMessage = {
    id: `msg-${Date.now()}-bot`,
    clientId: client.id,
    sender: "bot",
    text: `¡Hola ${firstName}! Soy **Stiliza & Devotion Concierge IA** 🤍. Tienes **${client.creditsRemaining} tokens disponibles**.\n\nManejamos horarios de **Lunes a Domingo**:\n☀️ **Matutino**: 7:00 am, 8:00 am, 9:00 am y 10:00 am\n🌙 **Vespertino**: 6:00 pm, 7:00 pm y 8:00 pm\n\nSucursales activas:\n• **Stiliza San Isidro** (Lugares 1 al 5)\n• **Stiliza Juriquilla** (Lugares 1 al 8)\n• **Devotion Zibatá** (Lugares 1 al 12)\n• **Devotion Juriquilla** (Lugares 1 al 12)\n• **Devotion Campanario** (Lugares 1 al 12)\n\nEscríbeme sucursal, hora y lugar (ej. *"Stiliza San Isidro a las 6pm en el 3"*) y te envío tu código QR al instante:`,
    timestamp: nowTime,
    suggestedSpots: [
      "Stiliza San Isidro a las 6pm en el 3",
      "Devotion Zibatá a las 7pm en el 3",
      "Devotion Juriquilla a las 8am en el 4",
      "Stiliza Juriquilla a las 6pm en el 2",
    ],
  };

  state.messages.push(botReply);
  writeDB(state);
  return { state, replyMessages: [botReply] };
}
