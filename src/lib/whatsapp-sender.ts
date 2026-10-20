import QRCode from "qrcode";
import { Booking, CRMDatabaseState, Client } from "@/types/crm";
import { readDB } from "@/lib/db";

/**
 * Normaliza números de México para Meta WhatsApp Cloud API:
 * Meta envía en webhooks "5219878710684", pero en la lista de números de prueba
 * espera "529878710684" (sin el "1" después de 52).
 */
export function normalizeWhatsAppRecipient(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, "");
  if (digits.startsWith("521") && digits.length === 13) {
    return "52" + digits.slice(3);
  }
  if (digits.length === 10) {
    return "52" + digits;
  }
  return digits;
}

/**
 * Sube el buffer PNG del código QR directamente a los servidores de Meta WhatsApp Cloud API
 * para que la imagen del QR llegue al celular sin depender de URLs públicas externas.
 */
async function uploadQRImageToMeta(params: {
  phoneNumberId: string;
  accessToken: string;
  qrToken: string;
}): Promise<string | null> {
  try {
    const pngBuffer = await QRCode.toBuffer(params.qrToken, {
      type: "png",
      width: 600,
      margin: 2,
      color: {
        dark: "#1B1512",
        light: "#FDFBF9",
      },
    });

    const formData = new FormData();
    formData.append("messaging_product", "whatsapp");
    const blob = new Blob([new Uint8Array(pngBuffer)], { type: "image/png" });
    formData.append("file", blob, `${params.qrToken}.png`);

    const res = await fetch(
      `https://graph.facebook.com/v22.0/${params.phoneNumberId}/media`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${params.accessToken}`,
        },
        body: formData,
      }
    );

    const data = await res.json();
    if (data && data.id) {
      return String(data.id);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Envía el mensaje de texto y, si existe una reserva, la imagen PNG del código QR
 * al WhatsApp real del usuario mediante Meta Cloud API.
 */
export async function sendRealWhatsAppMessage(params: {
  toPhone: string;
  text: string;
  booking?: Booking;
}): Promise<{ sent: boolean; provider?: string; error?: string; details?: unknown }> {
  const state = readDB();
  const runtimeToken = (
    state.aiSettings as unknown as { metaAccessToken?: string }
  )?.metaAccessToken;
  const runtimePhoneId = (
    state.aiSettings as unknown as { metaPhoneNumberId?: string }
  )?.metaPhoneNumberId;

  const metaToken = runtimeToken || process.env.WHATSAPP_ACCESS_TOKEN;
  const metaPhoneId =
    runtimePhoneId ||
    process.env.WHATSAPP_PHONE_NUMBER_ID ||
    "1414880558369692";

  const recipient = normalizeWhatsAppRecipient(params.toPhone);

  if (metaToken && metaPhoneId) {
    try {
      // 1. Send text message
      const textRes = await fetch(
        `https://graph.facebook.com/v22.0/${metaPhoneId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${metaToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: recipient,
            type: "text",
            text: { body: params.text.replace(/\*\*/g, "*") },
          }),
        }
      );

      const textData = await textRes.json();
      if (!textRes.ok) {
        return {
          sent: false,
          provider: "Meta WhatsApp Cloud API",
          error:
            textData?.error?.message ||
            "Error enviando mensaje en Meta Cloud API",
          details: textData,
        };
      }

      // 2. If there is a booking, upload the QR PNG directly to Meta & send the QR image!
      if (params.booking) {
        const mediaId = await uploadQRImageToMeta({
          phoneNumberId: metaPhoneId,
          accessToken: metaToken,
          qrToken: params.booking.qrToken,
        });

        if (mediaId) {
          await fetch(
            `https://graph.facebook.com/v22.0/${metaPhoneId}/messages`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${metaToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: recipient,
                type: "image",
                image: {
                  id: mediaId,
                  caption: `🎟️ *PASE QR STILIZA DEVOTION*\n• Clase: ${params.booking.sessionTitle} (${params.booking.startTime} hrs)\n• Lugar asignado: *${params.booking.spotId}* (${params.booking.spotLabel})\n• Código: ${params.booking.qrToken}\n\n_Escanea este código QR en la tablet al llegar al estudio._`,
                },
              }),
            }
          );
        }
      }

      return {
        sent: true,
        provider: "Meta WhatsApp Cloud API",
        details: textData,
      };
    } catch (err) {
      return {
        sent: false,
        provider: "Meta WhatsApp Cloud API",
        error: err instanceof Error ? err.message : "Error Meta API",
      };
    }
  }

  return { sent: false, provider: "local_simulator" };
}

export async function generateLLMConciergeResponse(params: {
  state: CRMDatabaseState;
  client: Client;
  userText: string;
}): Promise<string | null> {
  const { state, client, userText } = params;

  const scheduleSummary = state.sessions
    .map((s) => {
      const room = state.rooms.find((r) => r.id === s.roomId);
      const occupied = new Set(
        state.bookings
          .filter((b) => b.sessionId === s.id && b.status !== "cancelada")
          .map((b) => b.spotId)
      );
      const freeSpots =
        room?.spots
          .filter((sp) => !occupied.has(sp.id) && sp.status !== "maintenance")
          .map((sp) => sp.id)
          .join(", ") || "";
      return `- ID:${s.id} | ${s.title} (${s.discipline}) | ${s.date} ${s.startTime} hrs | Coach: ${s.instructor} | Lugares libres: [${freeSpots}]`;
    })
    .join("\n");

  const systemPrompt = `Eres "Stiliza Concierge IA", la recepcionista virtual por WhatsApp de los estudios de lujo "Stiliza Devotion" (Pilates Reformer y Hot Pilates 38°C).
Estás hablando con la alumna: ${client.name} (Créditos disponibles: ${client.creditsRemaining}, Lugar favorito: ${client.preferredSpot || "R-03"}).
Horarios y máquinas/tapetes libres en tiempo real:
${scheduleSummary}`;

  if (process.env.GEMINI_API_KEY) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: "user", parts: [{ text: userText }] }],
          }),
        }
      );
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
    } catch {
      // Fallback
    }
  }

  return null;
}
