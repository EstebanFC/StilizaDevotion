import { NextRequest, NextResponse } from "next/server";
import {
  loadStateFromSupabase,
  saveStateToSupabase,
} from "@/lib/supabase-db";
import { processAIChatTurn } from "@/lib/ai-bot";
import { sendRealWhatsAppMessage } from "@/lib/whatsapp-sender";
import { Client } from "@/types/crm";

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

  const state = await loadStateFromSupabase();
  const aiMeta = state.aiSettings as unknown as {
    metaAccessToken?: string;
    metaPhoneNumberId?: string;
    lastWebhookDiagnostics?: unknown;
  };

  return NextResponse.json({
    status: "Stiliza & Devotion WhatsApp AI Webhook Ready (Supabase Synced)",
    dedicatedWhatsAppNumber: "+52 1 446 403 0535",
    verifyTokenExpected: expectedToken,
    hasEnvAccessToken: Boolean(process.env.WHATSAPP_ACCESS_TOKEN),
    hasSupabaseAccessToken: Boolean(aiMeta?.metaAccessToken),
    phoneNumberIdConfigured:
      aiMeta?.metaPhoneNumberId ||
      (process.env.WHATSAPP_PHONE_NUMBER_ID === "1414880558369692"
        ? "1391915687338824"
        : process.env.WHATSAPP_PHONE_NUMBER_ID) ||
      "1391915687338824",
    lastWebhookDiagnostics: aiMeta?.lastWebhookDiagnostics || null,
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
      return NextResponse.json({
        received: true,
        note: "Status or non-text event ignored",
      });
    }

    const state = await loadStateFromSupabase();
    const cleanDigits = fromPhone.replace(/\D/g, "").slice(-10);

    let client = state.clients.find(
      (c) => cleanDigits && c.phone.replace(/\D/g, "").endsWith(cleanDigits)
    );

    if (!client && fromPhone) {
      const displayName = profileName
        ? `${profileName} (Sin Cuenta)`
        : `Visitante WhatsApp (${cleanDigits})`;
      const newClient: Client = {
        id: `cli-wa-${Date.now()}`,
        name: displayName,
        phone: `+${fromPhone.replace(/\D/g, "")}`,
        email: "sin-registrar@whatsapp.mx",
        avatarInitials: (profileName || "WA").slice(0, 2).toUpperCase(),
        activePackageName: "Sin Cuenta Registrada",
        creditsRemaining: 0,
        creditsTotal: 0,
        packageExpiresAt: "—",
        status: "sin_creditos",
        isUnregisteredLead: true,
        totalAttended: 0,
        preferredSpot: "—",
        homeBranchName: "Por definir",
        joinedAt: new Date().toISOString().split("T")[0],
      };
      state.clients.unshift(newClient);
      await saveStateToSupabase(state);
      client = newClient;
    }

    if (!client) {
      client = state.clients[0];
    }

    const { state: updatedState, replyMessages } = processAIChatTurn({
      clientId: client.id,
      userText: textBody,
    });

    const targetPhone = fromPhone || client.phone;
    let lastSendResult: unknown = null;

    for (const reply of replyMessages) {
      lastSendResult = await sendRealWhatsAppMessage({
        toPhone: targetPhone,
        text: reply.text,
        booking: reply.bookingAttachment,
      });
    }

    (
      updatedState.aiSettings as unknown as {
        lastWebhookDiagnostics?: unknown;
      }
    ).lastWebhookDiagnostics = {
      receivedAt: new Date().toISOString(),
      fromPhone: targetPhone,
      textBody,
      sendResult: lastSendResult,
    };

    await saveStateToSupabase(updatedState);

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
