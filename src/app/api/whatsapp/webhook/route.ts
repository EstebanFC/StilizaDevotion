import { NextRequest, NextResponse } from "next/server";
import { readDB } from "@/lib/db";
import { processAIChatTurn } from "@/lib/ai-bot";
import { sendRealWhatsAppMessage } from "@/lib/whatsapp-sender";

/**
 * Webhook oficial compatible con Meta WhatsApp Cloud API y Twilio WhatsApp.
 * - GET: Verificación de hub.challenge de Meta Cloud API
 * - POST: Recepción de mensajes entrantes desde el celular personal del usuario
 *         (Soporta tanto JSON de Meta Cloud API como Form-Data de Twilio Sandbox)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expectedToken =
    process.env.WHATSAPP_VERIFY_TOKEN || "stiliza_devotion_verify_2026";

  if (mode === "subscribe" && token === expectedToken) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({
    status: "Stiliza Devotion WhatsApp AI Webhook Ready",
    verifyTokenExpected: expectedToken,
  });
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let fromPhone = "";
    let textBody = "";

    if (contentType.includes("application/x-www-form-urlencoded")) {
      // Twilio WhatsApp Sandbox format
      const formData = await req.formData();
      fromPhone = String(formData.get("From") || "").replace("whatsapp:", "");
      textBody = String(formData.get("Body") || "");
    } else {
      // Meta WhatsApp Cloud API or JSON format
      const payload = await req.json();
      fromPhone = payload.from || "";
      textBody = payload.text || "";

      const metaMsg =
        payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
      if (metaMsg) {
        fromPhone = metaMsg.from || "";
        textBody = metaMsg?.text?.body || "";
      }
    }

    if (!textBody) {
      return NextResponse.json({ received: true });
    }

    const state = readDB();
    const cleanDigits = fromPhone.replace(/\D/g, "").slice(-10);
    const client =
      state.clients.find(
        (c) =>
          cleanDigits &&
          c.phone.replace(/\D/g, "").endsWith(cleanDigits)
      ) || state.clients[0];

    const { replyMessages } = processAIChatTurn({
      clientId: client.id,
      userText: textBody,
    });

    // Send outbound reply + QR image back to the user's real WhatsApp phone!
    const targetPhone = fromPhone || client.phone;
    for (const reply of replyMessages) {
      await sendRealWhatsAppMessage({
        toPhone: targetPhone,
        text: reply.text,
        booking: reply.bookingAttachment,
      });
    }

    return NextResponse.json({
      received: true,
      clientMatched: client.name,
      repliesGenerated: replyMessages,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Webhook error",
      },
      { status: 500 }
    );
  }
}
