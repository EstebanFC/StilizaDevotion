import { NextRequest, NextResponse } from "next/server";
import {
  createBookingTransaction,
  getInitialSeedData,
  processKioskQRScan,
  readDB,
  writeDB,
} from "@/lib/db";
import { processAIChatTurn } from "@/lib/ai-bot";
import { sendRealWhatsAppMessage } from "@/lib/whatsapp-sender";
import { ClassSession, Client } from "@/types/crm";

export async function GET() {
  const state = readDB();
  return NextResponse.json(state);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "book_spot") {
      const { clientId, sessionId, spotId, bookedVia } = body;
      const res = createBookingTransaction({
        clientId,
        sessionId,
        spotId,
        bookedVia: bookedVia || "web_portal",
      });
      if (!res.success) {
        return NextResponse.json(
          { success: false, error: res.error, state: res.state },
          { status: 400 }
        );
      }

      if (res.booking) {
        const latestMsg = res.state.messages[res.state.messages.length - 1];
        await sendRealWhatsAppMessage({
          toPhone: res.booking.clientPhone,
          text:
            latestMsg?.text ||
            `Reserva confirmada en ${res.booking.sessionTitle} (${res.booking.startTime} hrs) · Lugar: ${res.booking.spotId}`,
          booking: res.booking,
        });
      }

      return NextResponse.json({
        success: true,
        booking: res.booking,
        state: res.state,
      });
    }

    if (action === "checkin_qr") {
      const { qrToken } = body;
      const { result, state } = processKioskQRScan(String(qrToken || ""));
      return NextResponse.json({
        success: result.success,
        result,
        state,
      });
    }

    if (action === "send_chat") {
      const { clientId, text } = body;
      const { state, replyMessages } = processAIChatTurn({
        clientId,
        userText: String(text || ""),
      });
      const client = state.clients.find((c) => c.id === clientId);
      if (client) {
        for (const reply of replyMessages) {
          await sendRealWhatsAppMessage({
            toPhone: client.phone,
            text: reply.text,
            booking: reply.bookingAttachment,
          });
        }
      }
      return NextResponse.json({
        success: true,
        replyMessages,
        state,
      });
    }

    if (action === "save_meta_credentials") {
      const { accessToken, phoneNumberId, testRecipientPhone } = body;
      const state = readDB();
      (
        state.aiSettings as unknown as {
          metaAccessToken?: string;
          metaPhoneNumberId?: string;
        }
      ).metaAccessToken = String(accessToken || "").trim();
      (
        state.aiSettings as unknown as {
          metaAccessToken?: string;
          metaPhoneNumberId?: string;
        }
      ).metaPhoneNumberId = String(
        phoneNumberId || "1414880558369692"
      ).trim();

      if (testRecipientPhone && state.clients[0]) {
        state.clients[0].phone = String(testRecipientPhone).trim();
      }
      writeDB(state);

      // Send an immediate test QR pass to the user's phone!
      const sampleBooking = state.bookings[0];
      const sendRes = await sendRealWhatsAppMessage({
        toPhone: testRecipientPhone || "+52 987 871 0684",
        text: "¡Hola! 🤍 Tu conexión de *Stiliza Devotion CRM + Concierge IA* con WhatsApp está activa. Aquí tienes un pase QR de prueba para escanear en la tablet del estudio:",
        booking: sampleBooking,
      });

      return NextResponse.json({
        success: sendRes.sent,
        sendRes,
        state,
      });
    }

    if (action === "add_credits") {
      const { clientId, packageId } = body;
      const state = readDB();
      const client = state.clients.find((c) => c.id === clientId);
      const pkg = state.packages.find((p) => p.id === packageId);
      if (!client || !pkg) {
        return NextResponse.json(
          { success: false, error: "Cliente o paquete no encontrado." },
          { status: 404 }
        );
      }

      client.activePackageName = pkg.name;
      client.creditsRemaining += pkg.credits;
      client.creditsTotal = Math.max(client.creditsTotal, client.creditsRemaining);
      client.status = "activo";

      const expDate = new Date();
      expDate.setDate(expDate.getDate() + pkg.validityDays);
      client.packageExpiresAt = expDate.toISOString().split("T")[0];

      const nowTime = new Date().toLocaleTimeString("es-MX", {
        hour: "2-digit",
        minute: "2-digit",
      });
      state.messages.push({
        id: `msg-pkg-${Date.now()}`,
        clientId: client.id,
        sender: "bot",
        text: `🎉 ¡Hola ${client.name.split(" ")[0]}! Se ha activado tu paquete **${pkg.name}** (+${pkg.credits} créditos). Ahora tienes **${client.creditsRemaining} clases disponibles**. ¿Qué clase agendamos hoy?`,
        timestamp: nowTime,
      });

      writeDB(state);
      return NextResponse.json({ success: true, state });
    }

    if (action === "create_client") {
      const { name, phone, email, packageId, preferredSpot, medicalNotes } = body;
      const state = readDB();
      const pkg =
        state.packages.find((p) => p.id === packageId) || state.packages[1];
      const parts = String(name || "Nueva Alumna")
        .trim()
        .split(" ");
      const initials =
        parts.length > 1
          ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
          : parts[0].slice(0, 2).toUpperCase();

      const newClient: Client = {
        id: `cli-${Date.now()}`,
        name: String(name).trim(),
        phone: String(phone || "+52 55 0000 0000").trim(),
        email: String(email || "alumna@stilizadevotion.com").trim(),
        avatarInitials: initials,
        activePackageName: pkg.name,
        creditsRemaining: pkg.credits,
        creditsTotal: pkg.credits,
        packageExpiresAt: "2026-11-30",
        status: "activo",
        totalAttended: 0,
        preferredSpot: preferredSpot || "R-02",
        medicalNotes: medicalNotes || "",
        joinedAt: new Date().toISOString().split("T")[0],
      };

      state.clients.unshift(newClient);
      state.messages.push({
        id: `msg-welcome-${Date.now()}`,
        clientId: newClient.id,
        sender: "bot",
        text: `¡Bienvenida a **Stiliza Devotion**, ${newClient.name.split(" ")[0]}! 🤍 Tu cuenta está activa con **${pkg.name}** (${pkg.credits} créditos). Escríbeme por aquí cuando quieras reservar tu máquina Reformer o tapete de Hot Pilates y te enviaré tu código QR de acceso.`,
        timestamp: "Ahora",
        suggestedSpots: [
          "Ver lugares Reformer 18:30",
          "Ver tapetes Hot Pilates 19:30",
        ],
      });

      writeDB(state);
      return NextResponse.json({ success: true, client: newClient, state });
    }

    if (action === "create_session") {
      const { title, roomId, instructor, date, startTime, level } = body;
      const state = readDB();
      const room =
        state.rooms.find((r) => r.id === roomId) || state.rooms[0];
      const parts = String(instructor || "Coach Stiliza").split(" ");
      const initials = parts
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

      const newSession: ClassSession = {
        id: `ses-${Date.now()}`,
        title: String(title || "Reformer Signature Session"),
        discipline: room.discipline,
        roomId: room.id,
        branchName: room.branchName,
        roomName: room.name,
        instructor: String(instructor || "Coach Daniela R."),
        instructorAvatar: initials || "CS",
        date: String(date || "2026-10-19"),
        startTime: String(startTime || "10:00"),
        durationMinutes: 50,
        level: level || "Todos los niveles",
        intensity: room.discipline === "hot_pilates" ? "Intensa 🔥" : "Alta",
      };

      state.sessions.push(newSession);
      writeDB(state);
      return NextResponse.json({ success: true, session: newSession, state });
    }

    if (action === "toggle_spot_maintenance") {
      const { roomId, spotId } = body;
      const state = readDB();
      const room = state.rooms.find((r) => r.id === roomId);
      const spot = room?.spots.find((s) => s.id === spotId);
      if (spot) {
        spot.status =
          spot.status === "maintenance" ? "available" : "maintenance";
        writeDB(state);
      }
      return NextResponse.json({ success: true, state });
    }

    if (action === "cancel_booking") {
      const { bookingId } = body;
      const state = readDB();
      const booking = state.bookings.find((b) => b.id === bookingId);
      if (booking && booking.status === "confirmada") {
        booking.status = "cancelada";
        const client = state.clients.find((c) => c.id === booking.clientId);
        if (client) {
          client.creditsRemaining += 1;
          client.status =
            client.creditsRemaining <= 2 ? "pocos_creditos" : "activo";
        }
        writeDB(state);
      }
      return NextResponse.json({ success: true, state });
    }

    if (action === "reset_demo") {
      const seed = getInitialSeedData();
      writeDB(seed);
      return NextResponse.json({ success: true, state: seed });
    }

    return NextResponse.json(
      { success: false, error: "Acción no soportada" },
      { status: 400 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Error interno",
      },
      { status: 500 }
    );
  }
}
