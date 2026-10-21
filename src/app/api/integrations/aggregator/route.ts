import { NextRequest, NextResponse } from "next/server";
import { readDB, syncExternalAggregatorBooking } from "@/lib/db";
import { sendRealWhatsAppMessage } from "@/lib/whatsapp-sender";
import { ExternalAggregator } from "@/types/crm";

/**
 * Endpoint Universal de Sincronización (Channel Manager) para:
 * - Wellhub (Gympass Partner API Webhook)
 * - TotalPass (Partner Webhook)
 * - FitPass (Inbound Email Bridge / Webhook)
 * - Nessty (Inbound Email Bridge / Webhook)
 *
 * GET /api/integrations/aggregator -> Devuelve el inventario en tiempo real de lugares libres por clase
 * POST /api/integrations/aggregator -> Recibe una reserva externa, bloquea la máquina/tapete y recalcula cupos
 */
export async function GET() {
  const state = readDB();

  const inventoryFeed = state.sessions.map((s) => {
    const room = state.rooms.find((r) => r.id === s.roomId);
    const occupiedSpots = state.bookings
      .filter((b) => b.sessionId === s.id && b.status !== "cancelada")
      .map((b) => ({
        spotId: b.spotId,
        source: b.bookedVia,
      }));
    const occupiedSet = new Set(occupiedSpots.map((o) => o.spotId));
    const freeSpots =
      room?.spots
        .filter((sp) => !occupiedSet.has(sp.id) && sp.status !== "maintenance")
        .map((sp) => sp.id) || [];

    return {
      sessionId: s.id,
      branchName: s.branchName,
      brand: s.brand,
      title: s.title,
      discipline: s.discipline,
      date: s.date,
      startTime: s.startTime,
      totalCapacity: room?.spots.length || 12,
      occupiedCount: occupiedSpots.length,
      availableCount: freeSpots.length,
      isSoldOut: freeSpots.length === 0,
      freeSpotIds: freeSpots,
    };
  });

  return NextResponse.json({
    status: "Stiliza & Devotion Channel Manager Active",
    connectedPlatforms: ["Wellhub", "TotalPass", "FitPass", "Nessty"],
    inventoryFeed,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Detect platform from payload (Wellhub, TotalPass, FitPass, Nessty or email parser subject)
    const rawPlatform = String(
      body.platform || body.source || body.emailSubject || "wellhub"
    ).toLowerCase();

    let platform: ExternalAggregator = "wellhub";
    if (rawPlatform.includes("totalpass")) platform = "totalpass";
    else if (rawPlatform.includes("fitpass")) platform = "fitpass";
    else if (rawPlatform.includes("nessty")) platform = "nessty";
    else platform = "wellhub";

    const clientName = String(
      body.clientName || body.user?.name || "Alumna Externa"
    ).trim();
    const clientPhone = body.clientPhone || body.user?.phone || undefined;
    const sessionId = String(body.sessionId || "ses-3");
    const preferredSpotId = body.spotId || undefined;
    const externalReservationCode =
      body.externalReservationCode || body.reservation_id || undefined;

    const syncRes = syncExternalAggregatorBooking({
      platform,
      clientName,
      clientPhone,
      sessionId,
      preferredSpotId,
      externalReservationCode,
    });

    if (!syncRes.success) {
      return NextResponse.json(
        {
          success: false,
          error: syncRes.error,
          state: syncRes.state,
        },
        { status: 400 }
      );
    }

    if (syncRes.booking && clientPhone) {
      const latestMsg =
        syncRes.state.messages[syncRes.state.messages.length - 1];
      await sendRealWhatsAppMessage({
        toPhone: clientPhone,
        text:
          latestMsg?.text ||
          `Reserva sincronizada desde ${platform.toUpperCase()} en ${syncRes.booking.spotId}`,
        booking: syncRes.booking,
      });
    }

    return NextResponse.json({
      success: true,
      booking: syncRes.booking,
      channelSyncReport: syncRes.channelSyncReport,
      state: syncRes.state,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Error en Channel Manager",
      },
      { status: 500 }
    );
  }
}
