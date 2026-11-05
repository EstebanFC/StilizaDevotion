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
  DayOfWeek,
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
      const { clientId, text, senderMode } = body;
      const currentDb = await loadStateFromSupabase();
      const client = currentDb.clients.find((c) => c.id === clientId);

      if (!client) {
        return NextResponse.json(
          { success: false, error: "Cliente no encontrado" },
          { status: 404 }
        );
      }

      const activeToken = (
        currentDb.aiSettings as unknown as { metaAccessToken?: string }
      )?.metaAccessToken;
      const activePhoneId = (
        currentDb.aiSettings as unknown as { metaPhoneNumberId?: string }
      )?.metaPhoneNumberId;

      // Responder como Administrador / Staff Humano directamente al WhatsApp del alumno
      if (senderMode === "staff") {
        const nowTime = new Date().toLocaleTimeString("es-MX", {
          hour: "2-digit",
          minute: "2-digit",
        });

        const staffMsg = {
          id: `msg-${Date.now()}-staff`,
          clientId: client.id,
          sender: "staff" as const,
          text: String(text || "").trim(),
          timestamp: nowTime,
        };

        currentDb.messages.push(staffMsg);
        // Al responder como staff, mantenemos el bot en pausa para no interrumpir
        client.needsHumanSupport = true;
        await saveStateToSupabase(currentDb);

        // Envío del mensaje real a través de Meta WhatsApp Cloud API
        const sendRes = await sendRealWhatsAppMessage({
          toPhone: client.phone,
          text: staffMsg.text,
          overrideToken: activeToken,
          overridePhoneId: activePhoneId,
        });

        return NextResponse.json({
          success: true,
          state: currentDb,
          sendRes,
          staffMessage: staffMsg,
        });
      }

      // Modo cliente / bot IA tradicional
      const { state, replyMessages } = processAIChatTurn({
        clientId,
        userText: String(text || ""),
        currentState: currentDb,
      });
      await saveStateToSupabase(state);

      for (const reply of replyMessages) {
        await sendRealWhatsAppMessage({
          toPhone: client.phone,
          text: reply.text,
          booking: reply.bookingAttachment,
          overrideToken: activeToken,
          overridePhoneId: activePhoneId,
          interactiveType: reply.interactiveType,
          interactiveTitle: reply.interactiveTitle,
          interactiveOptions: reply.interactiveOptions,
        });
      }
      return NextResponse.json({
        success: true,
        replyMessages,
        state,
      });
    }

    if (action === "toggle_client_bot") {
      const { clientId, paused } = body;
      const currentDb = await loadStateFromSupabase();
      const client = currentDb.clients.find((c) => c.id === clientId);
      if (client) {
        client.needsHumanSupport =
          typeof paused === "boolean" ? paused : !client.needsHumanSupport;
        await saveStateToSupabase(currentDb);
      }
      return NextResponse.json({ success: true, state: currentDb });
    }

    if (action === "save_meta_credentials") {
      const { accessToken, phoneNumberId, testRecipientPhone } = body;
      const state = readDB();
      const cleanToken = String(
        accessToken || process.env.WHATSAPP_ACCESS_TOKEN || ""
      ).trim();
      const cleanPhoneId = String(
        phoneNumberId || "1406671965864277"
      ).trim();

      (
        state.aiSettings as unknown as {
          metaAccessToken?: string;
          metaPhoneNumberId?: string;
        }
      ).metaAccessToken = cleanToken;
      (
        state.aiSettings as unknown as {
          metaAccessToken?: string;
          metaPhoneNumberId?: string;
        }
      ).metaPhoneNumberId = cleanPhoneId;

      await saveStateToSupabase(state);

      // Intentar registrar/activar el número en Meta Cloud API (por si está en estatus "Pendiente" en WhatsApp Manager)
      if (cleanToken) {
        try {
          await fetch(
            `https://graph.facebook.com/v22.0/${cleanPhoneId}/register`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${cleanToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                pin: "123456",
              }),
            }
          );
        } catch {
          // Ignorar si ya estaba registrado
        }
      }

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

    if (action === "update_ai_settings") {
      const { settings } = body;
      const state = readDB();
      if (settings && typeof settings === "object") {
        state.aiSettings = {
          ...state.aiSettings,
          ...settings,
        };
        await saveStateToSupabase(state);
      }
      return NextResponse.json({ success: true, state });
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
      const isZeroPkg = packageId === "none";
      const pkg = isZeroPkg
        ? null
        : state.packages.find((p) => p.id === packageId) || state.packages[1];

      const cleanNameStr = String(name || "Nuevo Alumno(a)").trim();
      const parts = cleanNameStr.split(" ").filter(Boolean);
      const initials =
        parts.length > 1
          ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
          : cleanNameStr.slice(0, 2).toUpperCase();

      const rawPhone = String(phone || "+52 442 000 0000").trim();
      const cleanDigits = rawPhone.replace(/\D/g, "").slice(-10);

      // Si ya existía como visitante sin cuenta con ese teléfono, lo actualizamos en lugar de duplicar
      const existingIdx = state.clients.findIndex(
        (c) =>
          cleanDigits.length === 10 &&
          c.phone.replace(/\D/g, "").endsWith(cleanDigits)
      );

      const clientId =
        existingIdx >= 0 ? state.clients[existingIdx].id : `cli-${Date.now()}`;

      const newClient: Client = {
        id: clientId,
        name: cleanNameStr,
        phone: rawPhone,
        email: String(email || "alumno@stilizadevotion.com").trim(),
        avatarInitials: initials,
        activePackageName: pkg ? pkg.name : "Sin Paquete Activo (0 Tokens)",
        creditsRemaining: pkg ? pkg.credits : 0,
        creditsTotal: pkg ? pkg.credits : 0,
        packageExpiresAt: pkg ? "2026-11-30" : "—",
        status: pkg && pkg.credits > 0 ? "activo" : "sin_creditos",
        isUnregisteredLead: false,
        totalAttended:
          existingIdx >= 0 ? state.clients[existingIdx].totalAttended : 0,
        noShowsCount:
          existingIdx >= 0 ? state.clients[existingIdx].noShowsCount || 0 : 0,
        preferredSpot: preferredSpot || "3",
        homeBranchName:
          homeBranchName || state.branches[0]?.name || "Devotion Zibatá",
        medicalNotes: medicalNotes || "",
        joinedAt: new Date().toISOString().split("T")[0],
      };

      if (existingIdx >= 0) {
        state.clients[existingIdx] = newClient;
      } else {
        state.clients.unshift(newClient);
      }

      const welcomeText = pkg
        ? `¡Bienvenido(a) a **Stiliza & Devotion**, ${newClient.name.split(" ")[0]}! 🤍 Tu cuenta de alumno(a) está activa con **${pkg.name}** (**${pkg.credits} tokens disponibles**). Escríbeme estudio, horario y lugar para agendar tu clase.`
        : `¡Bienvenido(a) a **Stiliza & Devotion**, ${newClient.name.split(" ")[0]}! 🤍 Tu cuenta ha sido creada con éxito (0 tokens activos por el momento).`;

      state.messages.push({
        id: `msg-welcome-${Date.now()}`,
        clientId: newClient.id,
        sender: "bot",
        text: welcomeText,
        timestamp: "Ahora",
      });

      await saveStateToSupabase(state);
      return NextResponse.json({ success: true, client: newClient, state });
    }

    if (action === "update_client") {
      const {
        clientId,
        name,
        phone,
        email,
        homeBranchName,
        activePackageName,
        creditsRemaining,
        preferredSpot,
        medicalNotes,
      } = body;
      const state = readDB();
      const client = state.clients.find((c) => c.id === clientId);
      if (!client) {
        return NextResponse.json(
          { success: false, error: "Alumno(a) no encontrado." },
          { status: 404 }
        );
      }

      if (name !== undefined && String(name).trim()) {
        client.name = String(name).trim();
        const parts = client.name.split(" ").filter(Boolean);
        client.avatarInitials =
          parts.length > 1
            ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
            : client.name.slice(0, 2).toUpperCase();
      }
      if (phone !== undefined) client.phone = String(phone).trim();
      if (email !== undefined) client.email = String(email).trim();
      if (homeBranchName !== undefined)
        client.homeBranchName = String(homeBranchName).trim();
      if (activePackageName !== undefined)
        client.activePackageName = String(activePackageName).trim();
      if (creditsRemaining !== undefined) {
        const credits = Math.max(0, Number(creditsRemaining) || 0);
        client.creditsRemaining = credits;
        client.creditsTotal = Math.max(client.creditsTotal, credits);
        client.status =
          credits === 0
            ? "sin_creditos"
            : credits <= 2
            ? "pocos_creditos"
            : "activo";
      }
      if (preferredSpot !== undefined)
        client.preferredSpot = String(preferredSpot).trim();
      if (medicalNotes !== undefined)
        client.medicalNotes = String(medicalNotes).trim();
      client.isUnregisteredLead = false;

      await saveStateToSupabase(state);
      return NextResponse.json({ success: true, client, state });
    }

    if (action === "delete_client") {
      const { clientId, phoneDigits } = body;
      const state = readDB();
      const targetIds = new Set<string>();

      state.clients.forEach((c) => {
        if (c.id === clientId) targetIds.add(c.id);
        if (
          phoneDigits &&
          c.phone.replace(/\D/g, "").includes(String(phoneDigits))
        ) {
          targetIds.add(c.id);
        }
      });

      state.clients = state.clients.filter((c) => !targetIds.has(c.id));
      state.messages = state.messages.filter(
        (m) => !targetIds.has(m.clientId)
      );
      state.bookings = state.bookings.filter(
        (b) =>
          !targetIds.has(b.clientId) &&
          !(
            phoneDigits &&
            b.clientPhone.replace(/\D/g, "").includes(String(phoneDigits))
          )
      );

      await saveStateToSupabase(state);
      return NextResponse.json({ success: true, state });
    }

    if (action === "create_session") {
      const {
        title,
        roomId,
        instructor,
        date,
        dayOfWeek,
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

      const timeStr = String(startTime || "18:00");
      const hourNum = parseInt(timeStr.split(":")[0] || "18", 10);

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
        dayOfWeek: dayOfWeek || "Martes",
        timeBlock: hourNum < 13 ? "manana" : "tarde",
        startTime: timeStr,
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

    if (action === "create_sessions_batch") {
      const { batch } = body as {
        batch: Array<{
          title: string;
          branchId: string;
          dayOfWeek: DayOfWeek;
          startTime: string;
          instructor?: string;
          isSpecialClass?: boolean;
          specialBadge?: string;
        }>;
      };

      if (!Array.isArray(batch) || batch.length === 0) {
        return NextResponse.json(
          { success: false, error: "El lote de clases está vacío." },
          { status: 400 }
        );
      }

      const state = readDB();
      const createdSessions: ClassSession[] = [];
      const timestamp = Date.now();

      batch.forEach((item, index) => {
        const room =
          state.rooms.find((r) => r.branchId === item.branchId) ||
          state.rooms[0];
        const branch =
          state.branches.find((b) => b.id === item.branchId) ||
          state.branches[0];

        const timeStr = String(item.startTime || "07:15").trim();
        const hourNum = parseInt(timeStr.split(":")[0] || "7", 10);
        const timeBlock: "manana" | "tarde" = hourNum < 13 ? "manana" : "tarde";

        const instructor = item.instructor?.trim() || "Coach Por Asignar";
        const parts = instructor.split(" ");
        const initials = parts
          .map((p) => p[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();

        const timeSlug = timeStr.replace(":", "");
        const daySlug = (item.dayOfWeek || "martes")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");

        const branchCode = branch?.name.includes("San Isidro")
          ? "stsi"
          : branch?.name.includes("Stiliza Juriquilla")
          ? "stju"
          : branch?.name.includes("Stiliza Campanario")
          ? "stca"
          : branch?.name.includes("Zibatá")
          ? "dezi"
          : branch?.name.includes("Devotion Juriquilla")
          ? "deju"
          : "deca";

        const generatedId = `ses-${branchCode}-${daySlug}-${timeSlug}-${timestamp.toString().slice(-4)}${index}`;

        // Si ya existe una clase exactamente en la misma sucursal, día y hora, actualizarla en vez de duplicar
        const existingIdx = state.sessions.findIndex(
          (s) =>
            s.branchId === item.branchId &&
            s.dayOfWeek === item.dayOfWeek &&
            s.startTime === timeStr
        );

        const newSession: ClassSession = {
          id: existingIdx >= 0 ? state.sessions[existingIdx].id : generatedId,
          title:
            item.title ||
            `${
              room.brand === "Devotion" ? "HOT PILATES 38°C" : "REFORMER"
            } · ${branch?.name}`,
          discipline: room.discipline,
          branchId: item.branchId,
          branchName: branch?.name || room.branchName,
          brand: room.brand,
          roomId: room.id,
          roomName: room.name,
          instructor,
          instructorAvatar: initials || "CO",
          date: "2026-10-20",
          dayOfWeek: item.dayOfWeek,
          timeBlock,
          startTime: timeStr,
          durationMinutes: 50,
          level: "Todos los niveles",
          intensity: room.discipline === "hot_pilates" ? "Intensa 🔥" : "Alta",
          isSpecialClass: Boolean(item.isSpecialClass),
          specialBadge: item.specialBadge || undefined,
        };

        if (existingIdx >= 0) {
          state.sessions[existingIdx] = newSession;
        } else {
          state.sessions.push(newSession);
        }
        createdSessions.push(newSession);
      });

      await saveStateToSupabase(state);
      return NextResponse.json({
        success: true,
        count: createdSessions.length,
        state,
      });
    }

    if (action === "batch_update_sessions_coach") {
      const { sessionIds, instructor } = body as {
        sessionIds: string[];
        instructor: string;
      };
      const state = readDB();
      const parts = String(instructor || "Coach").split(" ");
      const initials = parts
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

      state.sessions.forEach((s) => {
        if (sessionIds.includes(s.id)) {
          s.instructor = instructor;
          s.instructorAvatar = initials;
        }
      });

      await saveStateToSupabase(state);
      return NextResponse.json({ success: true, state });
    }

    if (action === "batch_delete_sessions") {
      const { sessionIds } = body as { sessionIds: string[] };
      const state = readDB();
      state.sessions = state.sessions.filter((s) => !sessionIds.includes(s.id));
      await saveStateToSupabase(state);
      return NextResponse.json({ success: true, state });
    }

    if (action === "update_session") {
      const {
        sessionId,
        title,
        instructor,
        startTime,
        date,
        dayOfWeek,
        roomId,
        isSpecialClass,
        specialBadge,
      } = body;
      const state = readDB();
      const ses = state.sessions.find((s) => s.id === sessionId);
      if (ses) {
        if (title !== undefined) ses.title = String(title);
        if (instructor !== undefined) ses.instructor = String(instructor);
        if (startTime !== undefined) {
          ses.startTime = String(startTime);
          const hourNum = parseInt(ses.startTime.split(":")[0] || "18", 10);
          ses.timeBlock = hourNum < 13 ? "manana" : "tarde";
        }
        if (date !== undefined) ses.date = String(date);
        if (dayOfWeek !== undefined) ses.dayOfWeek = dayOfWeek;
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
        kioskPin: "123456",
      };
      state.branches.push(newBr);
      await saveStateToSupabase(state);
      return NextResponse.json({ success: true, state });
    }

    if (action === "update_branch_pin") {
      const { branchId, pin } = body;
      const cleanPin = String(pin || "").trim().slice(0, 6);
      if (!/^\d{6}$/.test(cleanPin)) {
        return NextResponse.json(
          {
            success: false,
            error: "El PIN del Kiosco debe contener exactamente 6 dígitos numéricos.",
          },
          { status: 400 }
        );
      }
      const state = readDB();
      const branch = state.branches.find((b) => b.id === branchId);
      if (!branch) {
        return NextResponse.json(
          { success: false, error: "Sucursal no encontrada" },
          { status: 404 }
        );
      }
      branch.kioskPin = cleanPin;
      await saveStateToSupabase(state);
      return NextResponse.json({ success: true, state, updatedBranch: branch });
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

    if (action === "clean_database" || action === "purge_mock_data") {
      const currentState = await loadStateFromSupabase();
      // Generar base oficial limpia preservando únicamente las 6 sucursales, salones y configuración
      const cleanState: typeof currentState = {
        ...currentState,
        clients: [],
        bookings: [],
        messages: [],
      };
      writeDB(cleanState);
      await saveStateToSupabase(cleanState);
      return NextResponse.json({
        success: true,
        message: "Base de datos limpiada con éxito. Solo se preservaron las 6 sucursales oficiales.",
        state: cleanState,
      });
    }

    if (action === "reset_to_zero" || action === "reset_demo") {
      const currentState = readDB();
      const seed = getInitialSeedData();
      if (currentState.aiSettings) {
        seed.aiSettings = {
          ...seed.aiSettings,
          ...currentState.aiSettings,
        };
      }
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
