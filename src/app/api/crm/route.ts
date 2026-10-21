import { NextRequest, NextResponse } from "next/server";
import {
  createBookingTransaction,
  getInitialSeedData,
  processKioskQRScan,
  readDB,
  writeDB,
} from "@/lib/db";
import {
  loadStateFromSupabase,
  saveStateToSupabase,
} from "@/lib/supabase-db";
import { processAIChatTurn } from "@/lib/ai-bot";
import { sendRealWhatsAppMessage } from "@/lib/whatsapp-sender";
import {
  Branch,
  ClassSession,
  Client,
  Coach,
  StudioPromoEvent,
} from "@/types/crm";

export async function GET() {
  const state = await loadStateFromSupabase();
  return NextResponse.json(state);
}

export async function POST(req: NextRequest) {
  try {
    await loadStateFromSupabase();
    const body = await req.json();
    const { action } = body;

    if (action === "book_spot") {
      const { clientId, sessionId, spotId, bookedVia } = body;
      const res = createBookingTransaction({
        clientId,
        sessionId,
        spotId,
        bookedVia: bookedVia || "kiosk_tablet",
      });
      if (!res.success) {
        return NextResponse.json(
          { success: false, error: res.error, state: res.state },
          { status: 400 }
        );
      }

      await saveStateToSupabase(res.state);

      if (res.booking) {
        const latestMsg = res.state.messages[res.state.messages.length - 1];
        await sendRealWhatsAppMessage({
          toPhone: res.booking.clientPhone,
          text:
            latestMsg?.text ||
            `Reserva confirmada en ${res.booking.sessionTitle} (${res.booking.startTime} hrs) · Lugar: #${res.booking.spotId}`,
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
      const { qrToken, kioskLabel } = body;
      const { result, state } = processKioskQRScan(
        String(qrToken || ""),
        kioskLabel
      );
      if (result.success) {
        await saveStateToSupabase(state);
      }
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
      await saveStateToSupabase(state);

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
        phoneNumberId || "1391915687338824"
      ).trim();

      if (testRecipientPhone && state.clients[0]) {
        state.clients[0].phone = String(testRecipientPhone).trim();
      }
      await saveStateToSupabase(state);

      const sampleBooking = state.bookings[0];
      const sendRes = await sendRealWhatsAppMessage({
        toPhone: testRecipientPhone || "+52 987 871 0684",
        text: "¡Hola! 🤍 Tu conexión de *Stiliza & Devotion CRM + Concierge IA* con WhatsApp y Supabase está activa. Aquí tienes un pase QR de prueba para escanear en la tablet del Kiosco:",
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
      client.creditsTotal = Math.max(
        client.creditsTotal,
        client.creditsRemaining
      );
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
        text: `🎉 ¡Hola ${client.name.split(" ")[0]}! Se ha activado tu paquete **${pkg.name}** (+${pkg.credits} tokens). Ahora tienes **${client.creditsRemaining} tokens disponibles**. ¿Qué clase agendamos hoy?`,
        timestamp: nowTime,
      });

      await saveStateToSupabase(state);
      return NextResponse.json({ success: true, state });
    }

    if (action === "create_client") {
      const {
        name,
        phone,
        email,
        packageId,
        preferredSpot,
        medicalNotes,
        homeBranchName,
      } = body;
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
        phone: String(phone || "+52 442 000 0000").trim(),
        email: String(email || "alumna@stilizadevotion.com").trim(),
        avatarInitials: initials,
        activePackageName: pkg.name,
        creditsRemaining: pkg.credits,
        creditsTotal: pkg.credits,
        packageExpiresAt: "2026-11-30",
        status: "activo",
        totalAttended: 0,
        noShowsCount: 0,
        preferredSpot: preferredSpot || "3",
        homeBranchName:
          homeBranchName || state.branches[0]?.name || "Devotion Zibatá",
        medicalNotes: medicalNotes || "",
        joinedAt: new Date().toISOString().split("T")[0],
      };

      state.clients.unshift(newClient);
      state.messages.push({
        id: `msg-welcome-${Date.now()}`,
        clientId: newClient.id,
        sender: "bot",
        text: `¡Bienvenida a **Stiliza & Devotion**, ${newClient.name.split(" ")[0]}! 🤍 Tu cuenta está activa con **${pkg.name}** (${pkg.credits} tokens).`,
        timestamp: "Ahora",
      });

      await saveStateToSupabase(state);
      return NextResponse.json({ success: true, client: newClient, state });
    }

    if (action === "create_session") {
      const {
        title,
        roomId,
        instructor,
        date,
        startTime,
        level,
        isSpecialClass,
        specialBadge,
      } = body;
      const state = readDB();
      const room = state.rooms.find((r) => r.id === roomId) || state.rooms[0];
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
        branchId: room.branchId,
        branchName: room.branchName,
        brand: room.brand,
        roomId: room.id,
        roomName: room.name,
        instructor: String(instructor || "Coach Daniela R."),
        instructorAvatar: initials || "CS",
        date: String(date || "2026-10-20"),
        startTime: String(startTime || "10:00"),
        durationMinutes: 50,
        level: level || "Todos los niveles",
        intensity: room.discipline === "hot_pilates" ? "Intensa 🔥" : "Alta",
        isSpecialClass: Boolean(isSpecialClass),
        specialBadge: specialBadge || undefined,
      };

      state.sessions.push(newSession);
      await saveStateToSupabase(state);
      return NextResponse.json({ success: true, session: newSession, state });
    }

    if (action === "update_session") {
      const {
        sessionId,
        title,
        instructor,
        startTime,
        date,
        roomId,
        isSpecialClass,
        specialBadge,
      } = body;
      const state = readDB();
      const ses = state.sessions.find((s) => s.id === sessionId);
      if (ses) {
        if (title !== undefined) ses.title = String(title);
        if (instructor !== undefined) ses.instructor = String(instructor);
        if (startTime !== undefined) ses.startTime = String(startTime);
        if (date !== undefined) ses.date = String(date);
        if (isSpecialClass !== undefined)
          ses.isSpecialClass = Boolean(isSpecialClass);
        if (specialBadge !== undefined) ses.specialBadge = specialBadge;

        if (roomId && roomId !== ses.roomId) {
          const room = state.rooms.find((r) => r.id === roomId);
          if (room) {
            ses.roomId = room.id;
            ses.roomName = room.name;
            ses.branchId = room.branchId;
            ses.branchName = room.branchName;
            ses.brand = room.brand;
            ses.discipline = room.discipline;
          }
        }
        await saveStateToSupabase(state);
      }
      return NextResponse.json({ success: true, state });
    }

    if (action === "delete_session") {
      const { sessionId } = body;
      const state = readDB();
      state.sessions = state.sessions.filter((s) => s.id !== sessionId);
      await saveStateToSupabase(state);
      return NextResponse.json({ success: true, state });
    }

    if (action === "create_promo_event") {
      const {
        title,
        description,
        type,
        dateLabel,
        highlightBadge,
        priceText,
        branchId,
      } = body;
      const state = readDB();
      const branch = state.branches.find((b) => b.id === branchId);
      const newEv: StudioPromoEvent = {
        id: `ev-${Date.now()}`,
        title: String(title || "Evento Especial Stiliza & Devotion"),
        description: String(description || ""),
        type: type || "evento",
        dateLabel: String(dateLabel || "Próximamente"),
        highlightBadge: String(highlightBadge || "✨ Nuevo"),
        priceText: String(priceText || "1 Token"),
        branchId: branch ? branch.id : "all",
        branchName: branch
          ? branch.name
          : "Todas las sucursales Stiliza & Devotion",
      };
      state.promosAndEvents.unshift(newEv);
      await saveStateToSupabase(state);
      return NextResponse.json({ success: true, state });
    }

    if (action === "delete_promo_event") {
      const { eventId } = body;
      const state = readDB();
      state.promosAndEvents = state.promosAndEvents.filter(
        (e) => e.id !== eventId
      );
      await saveStateToSupabase(state);
      return NextResponse.json({ success: true, state });
    }

    if (action === "create_coach") {
      const { name, specialty, vibeBadge } = body;
      const state = readDB();
      const parts = String(name || "Coach Nueva")
        .trim()
        .split(" ");
      const avatar = parts
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
      const newCoach: Coach = {
        id: `coach-${Date.now()}`,
        name: String(name).trim(),
        avatar: avatar || "CN",
        specialty: specialty || "ambas",
        occupancyRate: 92,
        vibeBadge: String(vibeBadge || "✨ Especialista Certificada"),
      };
      state.coaches.push(newCoach);
      await saveStateToSupabase(state);
      return NextResponse.json({ success: true, state });
    }

    if (action === "create_branch") {
      const { brand, name, address, kiosksCount } = body;
      const state = readDB();
      const newBr: Branch = {
        id: `br-${Date.now()}`,
        brand: brand === "Devotion" ? "Devotion" : "Stiliza",
        name: String(name).trim(),
        address: String(address || "Nueva Ubicación"),
        kiosksCount: Number(kiosksCount) || 1,
        monthlyRevenueMXN: 185000,
      };
      state.branches.push(newBr);
      await saveStateToSupabase(state);
      return NextResponse.json({ success: true, state });
    }

    if (action === "toggle_spot_maintenance") {
      const { roomId, spotId } = body;
      const state = readDB();
      const room = state.rooms.find((r) => r.id === roomId);
      const spot = room?.spots.find((s) => s.id === spotId);
      if (spot) {
        spot.status =
          spot.status === "maintenance" ? "available" : "maintenance";
        await saveStateToSupabase(state);
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
        await saveStateToSupabase(state);
      }
      return NextResponse.json({ success: true, state });
    }

    if (action === "reset_demo") {
      const seed = getInitialSeedData();
      writeDB(seed);
      await saveStateToSupabase(seed);
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
