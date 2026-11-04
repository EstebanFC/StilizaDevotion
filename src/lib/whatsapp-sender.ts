import QRCode from "qrcode";
import { Booking, CRMDatabaseState, Client } from "@/types/crm";
import { readDB } from "@/lib/db";

/**
 * Devuelve las variantes posibles de un número (especialmente útil en México donde
 * Meta a veces registra 521XXXXXXXXXX y otras veces 52XXXXXXXXXX).
 */
export function getPhoneCandidates(rawPhone: string): string[] {
  const digits = rawPhone.replace(/\D/g, "");
  const candidates = new Set<string>();

  if (digits) candidates.add(digits);

  // Si empieza con 521 y tiene 13 dígitos -> probar también sin el 1 (52 + 10 dígitos)
  if (digits.startsWith("521") && digits.length === 13) {
    candidates.add("52" + digits.slice(3));
  }
  // Si empieza con 52 y tiene 12 dígitos -> probar también con el 1 (521 + 10 dígitos)
  if (digits.startsWith("52") && !digits.startsWith("521") && digits.length === 12) {
    candidates.add("521" + digits.slice(2));
  }
  // Si tiene 10 dígitos -> probar 52 y 521
  if (digits.length === 10) {
    candidates.add("52" + digits);
    candidates.add("521" + digits);
  }

  return Array.from(candidates);
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
  overrideToken?: string;
  overridePhoneId?: string;
  interactiveType?: "button" | "list";
  interactiveTitle?: string;
  interactiveOptions?: Array<{
    id: string;
    title: string;
    description?: string;
  }>;
}): Promise<{ sent: boolean; provider?: string; error?: string; details?: unknown }> {
  const state = readDB();
  const publicBaseUrl = (
    process.env.PUBLIC_BASE_URL || "https://stilizadevotion.vercel.app"
  ).replace(/\/$/, "");
  const qrImageUrl = params.booking
    ? `${publicBaseUrl}/api/qr/${encodeURIComponent(params.booking.qrToken)}`
    : undefined;

  const runtimeToken = (
    params.overrideToken ||
    (state.aiSettings as unknown as { metaAccessToken?: string })?.metaAccessToken
  );
  const runtimePhoneId = (
    params.overridePhoneId ||
    (state.aiSettings as unknown as { metaPhoneNumberId?: string })?.metaPhoneNumberId
  );

  const metaToken = (
    runtimeToken ||
    process.env.WHATSAPP_ACCESS_TOKEN ||
    ""
  ).trim();
  const envPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  const metaPhoneId = (
    runtimePhoneId ||
    envPhoneId ||
    "1406671965864277"
  ).trim();

  if (!metaToken) {
    return {
      sent: false,
      provider: "Meta WhatsApp Cloud API",
      error:
        "Falta configurar WHATSAPP_ACCESS_TOKEN en las variables de entorno de Vercel.",
    };
  }

  const candidates = getPhoneCandidates(params.toPhone);
  let lastErrorData: unknown = null;
  let successfulRecipient: string | null = null;

  for (const recipient of candidates) {
    try {
      let bodyPayload: Record<string, unknown>;

      const hasOptions =
        params.interactiveOptions && params.interactiveOptions.length > 0;

      if (hasOptions) {
        const opts = params.interactiveOptions!;
        const useButton =
          params.interactiveType === "button" ||
          (opts.length <= 3 && params.interactiveType !== "list");

        if (useButton && opts.length <= 3) {
          bodyPayload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: recipient,
            type: "interactive",
            interactive: {
              type: "button",
              body: { text: params.text.replace(/\*\*/g, "*") },
              action: {
                buttons: opts.map((opt) => ({
                  type: "reply",
                  reply: {
                    id: opt.id.slice(0, 256),
                    title: opt.title.slice(0, 20),
                  },
                })),
              },
            },
          };
        } else {
          // Interactive List (hasta 10 opciones)
          bodyPayload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: recipient,
            type: "interactive",
            interactive: {
              type: "list",
              header: {
                type: "text",
                text: (params.interactiveTitle || "Stiliza & Devotion").slice(0, 60),
              },
              body: { text: params.text.replace(/\*\*/g, "*") },
              action: {
                button: "Ver Opciones",
                sections: [
                  {
                    title: (params.interactiveTitle || "Opciones").slice(0, 24),
                    rows: opts.slice(0, 10).map((opt) => ({
                      id: opt.id.slice(0, 200),
                      title: opt.title.slice(0, 24),
                      description: opt.description
                        ? opt.description.slice(0, 72)
                        : undefined,
                    })),
                  },
                ],
              },
            },
          };
        }
      } else {
        bodyPayload = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: recipient,
          type: "text",
          text: { body: params.text.replace(/\*\*/g, "*") },
        };
      }

      let textRes = await fetch(
        `https://graph.facebook.com/v22.0/${metaPhoneId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${metaToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(bodyPayload),
        }
      );

      let textData = await textRes.json();

      // Si falló el formato interactivo, intentar fallback inmediato a texto normal
      if (!textRes.ok && hasOptions) {
        const plainTextWithChoices =
          `${params.text.replace(/\*\*/g, "*")}\n\n` +
          params
            .interactiveOptions!.map(
              (o, idx) => `*${idx + 1}.* ${o.title}${o.description ? ` (${o.description})` : ""}`
            )
            .join("\n");

        textRes = await fetch(
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
              text: { body: plainTextWithChoices },
            }),
          }
        );
        textData = await textRes.json();
      }

      if (textRes.ok) {
        successfulRecipient = recipient;
        lastErrorData = textData;
        break;
      } else {
        lastErrorData = textData;
      }
    } catch (err) {
      lastErrorData = err instanceof Error ? err.message : "Fetch error";
    }
  }

  if (!successfulRecipient) {
    const errMsg =
      (lastErrorData as { error?: { message?: string } })?.error?.message ||
      "Error enviando mensaje en Meta Cloud API";
    return {
      sent: false,
      provider: "Meta WhatsApp Cloud API",
      error: errMsg,
      details: lastErrorData,
    };
  }

  // Si hay reserva adjunta, enviar también la imagen del código QR al mismo destinatario exitoso
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
            to: successfulRecipient,
            type: "image",
            image: {
              id: mediaId,
              caption: `🎟️ *PASE QR STILIZA DEVOTION*\n• Clase: ${params.booking.sessionTitle} (${params.booking.startTime} hrs)\n• Lugar asignado: *${params.booking.spotId}* (${params.booking.spotLabel})\n• Código: ${params.booking.qrToken}\n\n_Escanea este código QR en la tablet al llegar al estudio._`,
            },
          }),
        }
      );
    } else if (qrImageUrl) {
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
            to: successfulRecipient,
            type: "image",
            image: {
              link: qrImageUrl,
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
    details: lastErrorData,
  };
}
