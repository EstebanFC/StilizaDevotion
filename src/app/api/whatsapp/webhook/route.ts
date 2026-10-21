import { NextRequest, NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/db";
import {
  loadStateFromSupabase,
  saveStateToSupabase,
} from "@/lib/supabase-db";
import { processAIChatTurn } from "@/lib/ai-bot";
import { sendRealWhatsAppMessage } from "@/lib/whatsapp-sender";
import { Client } from "@/types/crm";

let lastWebhookDiagnostics: {
  receivedAt?: string;
  fromPhone?: string;
  textBody?: string;
  sendResult?: unknown;
} = {};

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

  const state = readDB();
  const runtimeToken = (
    state.aiSettings as unknown as { metaAccessToken?: string }
  )?.metaAccessToken;

  return NextResponse.json({
    status: "Stiliza Devotion WhatsApp AI Webhook Ready",
    verifyTokenExpected: expectedToken,
    hasEnvAccessToken: Boolean(process.env.WHATSAPP_ACCESS_TOKEN),
    hasRuntimeAccessToken: Boolean(runtimeToken),
    phoneNumberIdConfigured:
      process.env.WHATSAPP_PHONE_NUMBER_ID || "1414880558369692",
    lastWebhookDiagnostics,
  });
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let fromPhone = "";
    let textBody = "";
    let profileName = "";

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      fromPhone = String(formData.get("From") || "").replace("whatsapp:", "");
      textBody = String(formData.get("Body") || "");
    } else {
      const payload = await req.json();
      fromPhone = payload.from || "";
      textBody = payload.text || "";

      const changeValue = payload?.entry?.[0]?.changes?.[0]?.value;
      const metaMsg = changeValue?.messages?.[0];
      const metaContact = changeValue?.contacts?.[0];

      if (metaContact?.profile?.name) {
        profileName = String(metaContact.profile.name);
      }
      if (metaMsg) {
        fromPhone = metaMsg.from || "";
        textBody =
          metaMsg?.text?.body ||
          metaMsg?.button?.text ||
          metaMsg?.interactive?.button_reply?.title ||
          "";
      }
    }

    if (!textBody) {
      return NextResponse.json({ received: true, note: "Status or non-text event ignored" });
    }

    const state = await loadStateFromSupabase();
    const cleanDigits = fromPhone.replace(/\D/g, "").slice(-10);

    let client = state.clients.find(
      (c) => cleanDigits && c.phone.replace(/\D/g, "").endsWith(cleanDigits)
    );

    // Si escribe un número nuevo que no está en el CRM, lo registramos automáticamente con créditos de bienvenida
    if (!client && fromPhone) {
      const displayName = profileName || `Alumna WhatsApp (${cleanDigits})`;
      const newClient: Client = {
        id: `cli-wa-${Date.now()}`,
        name: displayName,
        phone: `+${fromPhone.replace(/\D/g, "")}`,
        email: "whatsapp@stilizadevotion.com",
        avatarInitials: displayName.slice(0, 2).toUpperCase(),
        activePackageName: "Devotion Pack 8 Clases",
        creditsRemaining: 8,
        creditsTotal: 8,
        packageExpiresAt: "2026-11-30",
        status: "activo",
        totalAttended: 0,
        preferredSpot: "R-04",
        joinedAt: new Date().toISOString().split("T")[0],
      };
      state.clients.unshift(newClient);
      writeDB(state);
      client = newClient;
    }

    if (!client) {
      client = state.clients[0];
    }

    const { state: updatedState, replyMessages } = processAIChatTurn({
      clientId: client.id,
      userText: textBody,
    });
    await saveStateToSupabase(updatedState);

    const targetPhone = fromPhone || client.phone;
    let lastSendResult: unknown = null;

    for (const reply of replyMessages) {
      lastSendResult = await sendRealWhatsAppMessage({
        toPhone: targetPhone,
        text: reply.text,
        booking: reply.bookingAttachment,
      });
    }

    lastWebhookDiagnostics = {
      receivedAt: new Date().toISOString(),
      fromPhone: targetPhone,
      textBody,
      sendResult: lastSendResult,
    };

    return NextResponse.json({
      received: true,
      clientMatched: client.name,
      repliesGenerated: replyMessages,
      sendResult: lastSendResult,
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
