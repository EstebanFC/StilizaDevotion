import { createBookingTransaction, readDB, writeDB } from "@/lib/db";
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

  // Detect spot number (1..12) when user says "lugar 3", "máquina 4", "tapete 6", "#2", "Reservar lugar 3", etc.
  const spotMatch =
    params.userText.match(
      /(?:lugar|m[aá]quina|tapete|reformer|mat|#)\s*(\d{1,2})\b/i
    ) || params.userText.match(/\b(?:RB|R|M)-?(\d{1,2})\b/i);

  const wantsToBook =
    lower.includes("reservar") ||
    lower.includes("agendar") ||
    lower.includes("agenda") ||
    lower.includes("quiero") ||
    lower.includes("aparta") ||
    lower.includes("lugar") ||
    Boolean(spotMatch);

  // Detect branch mentioned
  let matchedSession = state.sessions.find((s) => {
    const brLower = s.branchName.toLowerCase();
    if (lower.includes("zibat") && brLower.includes("zibat")) return true;
    if (lower.includes("san isidro") && brLower.includes("san isidro"))
      return true;
    if (
      lower.includes("stiliza juriquilla") &&
      brLower.includes("stiliza juriquilla")
    )
      return true;
    if (
      lower.includes("devotion juriquilla") &&
      brLower.includes("devotion juriquilla")
    )
      return true;
    if (
      lower.includes("devotion campanario") &&
      brLower.includes("devotion campanario")
    )
      return true;
    if (lower.includes("juriquilla") && brLower.includes("juriquilla"))
      return true;
    if (lower.includes("campanario") && brLower.includes("devotion campanario"))
      return true;
    return false;
  });

  if (spotMatch && wantsToBook) {
    const targetSpotId = String(Number(spotMatch[1]));

    if (!matchedSession) {
      matchedSession =
        state.sessions.find(
          (s) => s.branchName === client.homeBranchName && s.roomId !== "room-stiliza-campanario"
        ) || state.sessions[0];
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
        state = tx.state;
        const room = state.rooms.find((r) => r.id === matchedSession!.roomId);
        const occupied = new Set(
          state.bookings
            .filter(
              (b) =>
                b.sessionId === matchedSession!.id && b.status !== "cancelada"
            )
            .map((b) => b.spotId)
        );
        const freeSpots =
          room?.spots
            .filter((s) => !occupied.has(s.id) && s.status !== "maintenance")
            .slice(0, 5)
            .map(
              (s) => `Reservar lugar ${s.id} en ${matchedSession!.branchName}`
            ) || [];

        const errReply: ChatMessage = {
          id: `msg-${Date.now()}-bot`,
          clientId: client.id,
          sender: "bot",
          text: `⚠️ ${tx.error}\n\n${
            freeSpots.length > 0
              ? `En **${matchedSession.branchName}** (${matchedSession.startTime} hrs) están libres estos lugares. Toca uno para reservarlo:`
              : `¿Deseas consultar otra sucursal?`
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

  // Ask for QR / Existing pass
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
          text: `Hola ${firstName}, por el momento no tienes una reserva pendiente de check-in. ¿En cuál de nuestras sucursales quieres agendar hoy?`,
          timestamp: nowTime,
          suggestedSpots: [
            "Reservar lugar 3 en Devotion Zibatá",
            "Reservar lugar 4 en Devotion Juriquilla",
            "Reservar lugar 2 en Stiliza San Isidro",
          ],
        };
    state.messages.push(botReply);
    writeDB(state);
    return { state, replyMessages: [botReply] };
  }

  // Default helpful response listing the 6 branches
  const botReply: ChatMessage = {
    id: `msg-${Date.now()}-bot`,
    clientId: client.id,
    sender: "bot",
    text: `¡Hola ${firstName}! Soy **Stiliza & Devotion Concierge IA** 🤍. Tienes **${client.creditsRemaining} tokens disponibles**.\n\nNuestras sucursales y horarios de hoy:\n• **Stiliza San Isidro** (18:00 hrs · 5 lugares en fila: 1 al 5)\n• **Stiliza Juriquilla** (18:30 hrs · 8 lugares en fila: 1 al 8)\n• **Devotion Zibatá** (18:30 hrs · 12 lugares, frente: 1,2,Coach,3,4,5)\n• **Devotion Juriquilla** (19:30 hrs · 12 lugares, frente: 6,5,4,Coach,3,2,1)\n• **Devotion Campanario** (19:00 hrs · 12 lugares, frente: 1,2,3,Coach,4,5,6)\n\nDime qué sucursal y qué número de lugar quieres, y te mando tu código QR al instante:`,
    timestamp: nowTime,
    suggestedSpots: [
      "Reservar lugar 3 en Devotion Zibatá",
      "Reservar lugar 5 en Devotion Juriquilla",
      "Reservar lugar 2 en Devotion Campanario",
      "Reservar lugar 4 en Stiliza Juriquilla",
    ],
  };

  state.messages.push(botReply);
  writeDB(state);
  return { state, replyMessages: [botReply] };
}
