import {
  createBookingTransaction,
  readDB,
  writeDB,
} from "@/lib/db";
import { ChatMessage, CRMDatabaseState } from "@/types/crm";

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

  // 1. Append client's message
  const clientMsg: ChatMessage = {
    id: `msg-${Date.now()}-usr`,
    clientId: client.id,
    sender: "client",
    text: params.userText,
    timestamp: nowTime,
  };
  state.messages.push(clientMsg);
  writeDB(state);

  const lower = params.userText.toLowerCase().trim();
  const firstName = client.name.split(" ")[0];

  // Check if message contains a spot code like R-01..R-12, RB-01..RB-08, M-01..M-16 or R01 / M01
  const spotMatch = params.userText.match(/\b(RB|R|M)-?(\d{1,2})\b/i);
  const wantsToBook =
    lower.includes("reservar") ||
    lower.includes("agendar") ||
    lower.includes("agenda") ||
    lower.includes("quiero la") ||
    lower.includes("quiero el") ||
    lower.includes("aparta") ||
    Boolean(spotMatch);

  if (spotMatch && wantsToBook) {
    const prefix = spotMatch[1].toUpperCase();
    const num = spotMatch[2].padStart(2, "0");
    const targetSpotId = `${prefix}-${num}`;

    // Determine which session matches the discipline & requested time
    const isHotMat = prefix === "M";
    const targetDiscipline = isHotMat ? "hot_pilates" : "reformer";

    // Check if user mentioned a specific time like 18:30, 19:30, 07:00, 08:30, 08:00, 09:00
    let matchedSession = state.sessions.find(
      (s) =>
        s.discipline === targetDiscipline &&
        (lower.includes(s.startTime) ||
          (s.startTime === "18:30" && (lower.includes("6:30") || lower.includes("tarde"))) ||
          (s.startTime === "19:30" && (lower.includes("7:30") || lower.includes("noche"))))
    );

    if (!matchedSession) {
      // Pick the primary upcoming session for that discipline
      matchedSession =
        state.sessions.find(
          (s) =>
            s.discipline === targetDiscipline &&
            (s.startTime === "18:30" || s.startTime === "19:30")
        ) || state.sessions.find((s) => s.discipline === targetDiscipline);
    }

    if (matchedSession) {
      const tx = createBookingTransaction({
        clientId: client.id,
        sessionId: matchedSession.id,
        spotId: targetSpotId,
        bookedVia: "whatsapp_bot",
      });

      if (tx.success && tx.booking) {
        const latestMsg = tx.state.messages[tx.state.messages.length - 1];
        return {
          state: tx.state,
          replyMessages: latestMsg ? [latestMsg] : [],
        };
      } else {
        // Spot was taken or client out of credits — suggest free spots in that session!
        state = tx.state;
        const room = state.rooms.find((r) => r.id === matchedSession!.roomId);
        const occupied = new Set(
          state.bookings
            .filter(
              (b) => b.sessionId === matchedSession!.id && b.status !== "cancelada"
            )
            .map((b) => b.spotId)
        );
        const freeSpots =
          room?.spots
            .filter((s) => !occupied.has(s.id) && s.status !== "maintenance")
            .slice(0, 5)
            .map((s) => `Reservar ${s.id}`) || [];

        const errReply: ChatMessage = {
          id: `msg-${Date.now()}-bot`,
          clientId: client.id,
          sender: "bot",
          text: `⚠️ ${tx.error}\n\n${
            freeSpots.length > 0
              ? `Para **${matchedSession.title}** (${matchedSession.startTime} hrs) tengo disponibles estos lugares. Toca uno para agendarlo al instante:`
              : `¿Te gustaría que te recargue un paquete de clases?`
          }`,
          timestamp: nowTime,
          suggestedSpots: freeSpots,
        };
        state.messages.push(errReply);
        writeDB(state);
        return { state, replyMessages: [errReply] };
      }
    }
  }

  // 2. Ask for QR / Existing pass
  if (lower.includes("qr") || lower.includes("código") || lower.includes("codigo") || lower.includes("pase")) {
    const activeBooking = state.bookings.find(
      (b) => b.clientId === client.id && b.status === "confirmada"
    );
    const botReply: ChatMessage = activeBooking
      ? {
          id: `msg-${Date.now()}-bot`,
          clientId: client.id,
          sender: "bot",
          text: `¡Claro, ${firstName}! Aquí tienes nuevamente tu código QR activo para **${activeBooking.sessionTitle}** (${activeBooking.startTime} hrs) en **${activeBooking.spotLabel}**. Solo acércalo al lector de la tablet al llegar al estudio:`,
          timestamp: nowTime,
          bookingAttachment: activeBooking,
        }
      : {
          id: `msg-${Date.now()}-bot`,
          clientId: client.id,
          sender: "bot",
          text: `Hola ${firstName}, por el momento no tienes una reserva pendiente de check-in. ¿Quieres agendar Pilates Reformer o Hot Pilates hoy?`,
          timestamp: nowTime,
          suggestedSpots: [
            "Ver lugares Reformer 18:30",
            "Ver tapetes Hot Pilates 19:30",
          ],
        };
    state.messages.push(botReply);
    writeDB(state);
    return { state, replyMessages: [botReply] };
  }

  // 3. Ask specifically about Hot Pilates or Mats
  if (lower.includes("hot") || lower.includes("tapete") || lower.includes("calor") || lower.includes("19:30")) {
    const hotSession =
      state.sessions.find((s) => s.id === "ses-4") ||
      state.sessions.find((s) => s.discipline === "hot_pilates")!;
    const room = state.rooms.find((r) => r.id === hotSession.roomId)!;
    const occupied = new Set(
      state.bookings
        .filter((b) => b.sessionId === hotSession.id && b.status !== "cancelada")
        .map((b) => b.spotId)
    );
    const availableSpots = room.spots.filter(
      (s) => !occupied.has(s.id) && s.status !== "maintenance"
    );

    const botReply: ChatMessage = {
      id: `msg-${Date.now()}-bot`,
      clientId: client.id,
      sender: "bot",
      text: `🔥 Para **${hotSession.title}** (${hotSession.startTime} hrs con ${hotSession.instructor} · 38.5°C Infrarrojo) quedan **${availableSpots.length} tapetes libres** de ${room.spots.length}.\n\nTapetes disponibles frente al espejo y paneles IR: **${availableSpots
        .slice(0, 6)
        .map((s) => s.id)
        .join(", ")}**.\n\n¿Cuál tapete te aparto y te envío tu QR por aquí?`,
      timestamp: nowTime,
      suggestedSpots: availableSpots.slice(0, 4).map((s) => `Reservar ${s.id} a las ${hotSession.startTime}`),
    };
    state.messages.push(botReply);
    writeDB(state);
    return { state, replyMessages: [botReply] };
  }

  // 4. Ask specifically about Reformer or Machines
  if (
    lower.includes("reformer") ||
    lower.includes("máquina") ||
    lower.includes("maquina") ||
    lower.includes("18:30") ||
    lower.includes("lugar")
  ) {
    const refSession =
      state.sessions.find((s) => s.id === "ses-3") ||
      state.sessions.find((s) => s.discipline === "reformer")!;
    const room = state.rooms.find((r) => r.id === refSession.roomId)!;
    const occupied = new Set(
      state.bookings
        .filter((b) => b.sessionId === refSession.id && b.status !== "cancelada")
        .map((b) => b.spotId)
    );
    const availableSpots = room.spots.filter(
      (s) => !occupied.has(s.id) && s.status !== "maintenance"
    );

    const botReply: ChatMessage = {
      id: `msg-${Date.now()}-bot`,
      clientId: client.id,
      sender: "bot",
      text: `✨ Para **${refSession.title}** (${refSession.startTime} hrs con ${refSession.instructor}) en ${room.name} tenemos **${availableSpots.length} máquinas Reformer disponibles**.\n\nMáquinas libres: **${availableSpots
        .slice(0, 6)
        .map((s) => `${s.id} (${s.zone})`)
        .join(", ")}**.\n\nEscribe o selecciona la máquina que prefieras para generarte tu QR de acceso:`,
      timestamp: nowTime,
      suggestedSpots: availableSpots.slice(0, 4).map((s) => `Reservar ${s.id} a las ${refSession.startTime}`),
    };
    state.messages.push(botReply);
    writeDB(state);
    return { state, replyMessages: [botReply] };
  }

  // 5. Credits / package inquiry
  if (lower.includes("crédito") || lower.includes("credito") || lower.includes("paquete") || lower.includes("clases me quedan")) {
    const botReply: ChatMessage = {
      id: `msg-${Date.now()}-bot`,
      clientId: client.id,
      sender: "bot",
      text: `🤍 Hola ${firstName}, tu paquete actual es **${client.activePackageName}**.\n• Créditos disponibles: **${client.creditsRemaining} de ${client.creditsTotal}**\n• Vigencia hasta: **${client.packageExpiresAt}**\n• Total de clases tomadas en Stiliza Devotion: **${client.totalAttended}**\n\n¿Deseas agendar una clase con tus créditos?`,
      timestamp: nowTime,
      suggestedSpots: [
        "Ver lugares Reformer 18:30",
        "Ver tapetes Hot Pilates 19:30",
      ],
    };
    state.messages.push(botReply);
    writeDB(state);
    return { state, replyMessages: [botReply] };
  }

  // 6. Default helpful concierge response showing today's schedule & quick spot booking
  const botReply: ChatMessage = {
    id: `msg-${Date.now()}-bot`,
    clientId: client.id,
    sender: "bot",
    text: `¡Hola ${firstName}! Soy **Stiliza Concierge IA** 🤍. Tienes **${client.creditsRemaining} créditos disponibles**${
      client.preferredSpot ? ` y sabemos que tu lugar favorito es **${client.preferredSpot}**` : ""
    }.\n\nEstas son nuestras próximas clases destacadas:\n• **18:30 hrs** — Athletic Reformer Flow (Coach Alejandra M.)\n• **19:30 hrs** — Candlelight Hot Pilates Detox 38°C (Coach Fernanda L.)\n• **Mañana 08:00 hrs** — Sunrise Reformer Core & Arms\n\nDime qué clase y número de máquina (` +
      "`R-01` a `R-12`" +
      `) o tapete (` +
      "`M-01` a `M-16`" +
      `) quieres, y te mando tu código QR al instante:`,
    timestamp: nowTime,
    suggestedSpots: [
      client.preferredSpot
        ? `Reservar mi favorito ${client.preferredSpot}`
        : "Reservar R-04 a las 18:30",
      "Ver lugares Reformer 18:30",
      "Ver tapetes Hot Pilates 19:30",
      "Reenviar mi código QR",
    ],
  };

  state.messages.push(botReply);
  writeDB(state);
  return { state, replyMessages: [botReply] };
}
