"use client";

import React, { useEffect, useRef, useState } from "react";
import { CRMDatabaseState } from "@/types/crm";
import { QRCodePassCard } from "@/components/QRCodePassCard";
import {
  Bot,
  CheckCheck,
  Flame,
  MessageSquare,
  Phone,
  Send,
  Sparkles,
  Webhook,
  Zap,
} from "lucide-react";

interface WhatsAppAICenterProps {
  db: CRMDatabaseState;
  selectedClientId: string;
  onSelectClient: (clientId: string) => void;
  onSendMessage: (clientId: string, text: string) => Promise<void>;
  onSimulateScanInKiosk: (qrToken: string) => void;
}

export function WhatsAppAICenter({
  db,
  selectedClientId,
  onSelectClient,
  onSendMessage,
  onSimulateScanInKiosk,
}: WhatsAppAICenterProps) {
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [showWebhookModal, setShowWebhookModal] = useState(true);
  const [metaTokenInput, setMetaTokenInput] = useState("");
  const [metaPhoneIdInput, setMetaPhoneIdInput] = useState("1414880558369692");
  const [recipientPhoneInput, setRecipientPhoneInput] =
    useState("+52 987 871 0684");
  const [metaTestStatus, setMetaTestStatus] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const activeClient =
    db.clients.find((c) => c.id === selectedClientId) || db.clients[0];

  const clientMessages = db.messages.filter(
    (m) => m.clientId === activeClient?.id
  );

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [clientMessages.length, activeClient?.id]);

  const handleSend = async (customText?: string) => {
    const textToSend = (customText ?? inputText).trim();
    if (!textToSend || !activeClient || sending) return;
    setSending(true);
    if (!customText) setInputText("");
    try {
      await onSendMessage(activeClient.id, textToSend);
    } finally {
      setSending(false);
    }
  };

  // Get quick free spots for Reformer (ses-3) and Hot Pilates (ses-4) so user can test 1-click booking via AI
  const refSession =
    db.sessions.find((s) => s.id === "ses-3") || db.sessions[0];
  const hotSession =
    db.sessions.find((s) => s.id === "ses-4") || db.sessions[1];

  const getFreeSpotsForSession = (sessionId: string, roomId: string) => {
    const room = db.rooms.find((r) => r.id === roomId);
    if (!room) return [];
    const taken = new Set(
      db.bookings
        .filter((b) => b.sessionId === sessionId && b.status !== "cancelada")
        .map((b) => b.spotId)
    );
    return room.spots.filter(
      (s) => !taken.has(s.id) && s.status !== "maintenance"
    );
  };

  const freeReformer = refSession
    ? getFreeSpotsForSession(refSession.id, refSession.roomId).slice(0, 4)
    : [];
  const freeHotMats = hotSession
    ? getFreeSpotsForSession(hotSession.id, hotSession.roomId).slice(0, 4)
    : [];

  return (
    <div className="space-y-4">
      {/* Top Banner explaining the AI Bot & WhatsApp QR Automation */}
      <div className="rounded-2xl bg-gradient-to-r from-[#1A2E26] via-[#1E352B] to-[#162720] text-emerald-50 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-md border border-emerald-800/40">
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-2xl bg-emerald-400/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
            <Bot className="h-6 w-6 text-emerald-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-200">
                <Zap className="h-3 w-3 text-emerald-300" /> Bot IA Concierge
                24/7 Activo
              </span>
              <span className="text-xs text-emerald-200/80">
                Envío automático de QR + Selección de Máquina/Tapete
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white mt-0.5">
              Centro Conversacional WhatsApp + Agendamiento con IA
            </h3>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowWebhookModal((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white px-3.5 py-2 border border-white/15 transition"
        >
          <Webhook className="h-4 w-4 text-emerald-300" />
          Configuración API / Webhook WhatsApp
        </button>
      </div>

      {showWebhookModal && (
        <div className="rounded-2xl bg-stone-900 text-stone-100 p-5 border border-stone-700 space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-amber-300 flex items-center gap-2">
              <Webhook className="h-4 w-4" /> Conectar tu Número de Prueba Meta
              WhatsApp Cloud API
            </h4>
            <button
              type="button"
              onClick={() => setShowWebhookModal(false)}
              className="text-stone-400 hover:text-white"
            >
              Cerrar ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-stone-300 font-semibold mb-1">
                Phone Number ID (Ya detectado de tu captura)
              </label>
              <input
                type="text"
                value={metaPhoneIdInput}
                onChange={(e) => setMetaPhoneIdInput(e.target.value)}
                className="w-full rounded-xl bg-black/50 border border-stone-700 px-3 py-2 text-xs text-emerald-300 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] text-stone-300 font-semibold mb-1">
                Tu Celular Destinatario
              </label>
              <input
                type="text"
                value={recipientPhoneInput}
                onChange={(e) => setRecipientPhoneInput(e.target.value)}
                className="w-full rounded-xl bg-black/50 border border-stone-700 px-3 py-2 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] text-amber-300 font-semibold mb-1">
                Token de Acceso (Cópialo de Meta con el icono 📋)
              </label>
              <input
                type="password"
                value={metaTokenInput}
                onChange={(e) => setMetaTokenInput(e.target.value)}
                placeholder="Pega aquí tu token EAAXwxnj81mQ..."
                className="w-full rounded-xl bg-black/50 border border-amber-400/50 px-3 py-2 text-xs text-white font-mono"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <p className="text-[11px] text-stone-400">
              Nota: Primero dale clic al botón azul{" "}
              <strong className="text-white">&quot;Enviar mensaje&quot;</strong>{" "}
              en tu pantalla de Meta y responde &quot;Hola&quot; desde tu
              WhatsApp para abrir la ventana de 24h de Meta.
            </p>
            <button
              type="button"
              onClick={async () => {
                setMetaTestStatus("Enviando pase QR a tu WhatsApp...");
                const res = await fetch("/api/crm", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    action: "save_meta_credentials",
                    accessToken: metaTokenInput,
                    phoneNumberId: metaPhoneIdInput,
                    testRecipientPhone: recipientPhoneInput,
                  }),
                });
                const data = await res.json();
                if (data.success) {
                  setMetaTestStatus(
                    "✅ ¡Enviado! Revisa tu WhatsApp (+52 987 871 0684): acabas de recibir el mensaje y la imagen PNG del código QR."
                  );
                } else {
                  setMetaTestStatus(
                    `⚠️ Respuesta de Meta: ${
                      data?.sendRes?.error || "Verifica haber copiado el token completo."
                    }`
                  );
                }
              }}
              className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs px-4 py-2.5 transition"
            >
              Guardar Token y Enviar QR Real a mi Celular
            </button>
          </div>

          {metaTestStatus && (
            <div className="rounded-xl bg-white/10 border border-white/15 p-3 text-xs text-amber-200">
              {metaTestStatus}
            </div>
          )}
        </div>
      )}

      {/* Main Split View: Left Conversations List | Right Active WhatsApp Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left 4 Cols: Client Threads */}
        <div className="lg:col-span-4 rounded-3xl bg-white border border-stone-200/90 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-stone-200 bg-[#FAF7F2]">
            <h4 className="font-bold text-sm text-stone-900 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-emerald-700" />
              Chats de Alumnas ({db.clients.length})
            </h4>
            <p className="text-xs text-stone-500 mt-0.5">
              Selecciona una alumna para simular o supervisar su chat con el Bot
              IA
            </p>
          </div>

          <div className="divide-y divide-stone-100 overflow-y-auto max-h-[560px]">
            {db.clients.map((client) => {
              const isSelected = client.id === activeClient?.id;
              const thread = db.messages.filter(
                (m) => m.clientId === client.id
              );
              const lastMsg = thread[thread.length - 1];

              return (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => onSelectClient(client.id)}
                  className={`w-full p-3.5 text-left transition flex items-start gap-3 ${
                    isSelected
                      ? "bg-[#F3EDE2] border-l-4 border-l-emerald-700"
                      : "hover:bg-stone-50"
                  }`}
                >
                  <div className="h-10 w-10 rounded-full bg-stone-800 text-amber-200 font-bold text-xs flex items-center justify-center shrink-0">
                    {client.avatarInitials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="font-bold text-xs text-stone-900 truncate">
                        {client.name}
                      </p>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          client.creditsRemaining > 2
                            ? "bg-emerald-100 text-emerald-800"
                            : client.creditsRemaining > 0
                            ? "bg-amber-100 text-amber-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {client.creditsRemaining} créd.
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5">
                      <Phone className="h-2.5 w-2.5" /> {client.phone}
                    </p>
                    {lastMsg && (
                      <p className="text-xs text-stone-600 truncate mt-1">
                        {lastMsg.sender === "bot" ? "🤖 " : ""}
                        {lastMsg.text.replace(/\*\*/g, "")}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right 8 Cols: WhatsApp Conversation Window */}
        <div className="lg:col-span-8 rounded-3xl border border-stone-200/90 bg-[#EFEAE2] shadow-sm overflow-hidden flex flex-col min-h-[600px]">
          {/* WhatsApp Chat Header */}
          <div className="bg-[#075E54] text-white px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white/15 flex items-center justify-center font-bold text-sm text-amber-200">
                {activeClient?.avatarInitials}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm">{activeClient?.name}</h4>
                  <span className="rounded-full bg-emerald-400/20 text-emerald-200 text-[10px] px-2 py-0.5 font-semibold">
                    {activeClient?.creditsRemaining} créditos activos
                  </span>
                </div>
                <p className="text-xs text-emerald-100/80">
                  {activeClient?.phone} · Atendida por{" "}
                  <strong>{db.aiSettings.botName}</strong>
                </p>
              </div>
            </div>

            <div className="text-right hidden sm:block">
              <span className="text-[11px] bg-black/20 px-2.5 py-1 rounded-full text-emerald-100">
                Favorito: {activeClient?.preferredSpot || "R-03"}
              </span>
            </div>
          </div>

          {/* Quick Interactive Spot Booking Bar inside Chat */}
          <div className="bg-[#F7F4EF] border-b border-stone-200 px-4 py-2.5 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-stone-600">
              Agendar rápido por chat:
            </span>
            {freeReformer.slice(0, 2).map((spot) => (
              <button
                key={spot.id}
                type="button"
                onClick={() =>
                  handleSend(
                    `Hola! Quiero agendar Reformer a las ${refSession.startTime} en la máquina ${spot.id}`
                  )
                }
                className="inline-flex items-center gap-1 rounded-full bg-stone-900 hover:bg-stone-800 text-amber-200 px-2.5 py-1 text-[11px] font-medium transition"
              >
                <Sparkles className="h-3 w-3" />
                Máquina {spot.id} ({refSession.startTime})
              </button>
            ))}
            {freeHotMats.slice(0, 2).map((spot) => (
              <button
                key={spot.id}
                type="button"
                onClick={() =>
                  handleSend(
                    `Hola! Quiero agendar Hot Pilates a las ${hotSession.startTime} en el tapete ${spot.id}`
                  )
                }
                className="inline-flex items-center gap-1 rounded-full bg-orange-700 hover:bg-orange-600 text-white px-2.5 py-1 text-[11px] font-medium transition"
              >
                <Flame className="h-3 w-3" />
                Tapete {spot.id} ({hotSession.startTime})
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleSend("¿Qué horarios y lugares tienen hoy?")}
              className="inline-flex items-center gap-1 rounded-full bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 px-2.5 py-1 text-[11px] font-medium transition"
            >
              Ver disponibilidad
            </button>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 p-4 sm:p-5 space-y-4 overflow-y-auto max-h-[430px]">
            {clientMessages.map((msg) => {
              const isClient = msg.sender === "client";
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    isClient ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-xl rounded-2xl px-4 py-3 shadow-sm ${
                      isClient
                        ? "bg-[#DCF8C6] text-stone-900 rounded-br-none"
                        : "bg-white text-stone-800 rounded-bl-none border border-stone-200/60"
                    }`}
                  >
                    {!isClient && (
                      <div className="flex items-center gap-1.5 mb-1 text-[11px] font-bold text-emerald-800">
                        <Bot className="h-3.5 w-3.5" />
                        {db.aiSettings.botName}
                      </div>
                    )}

                    <p className="text-xs sm:text-sm whitespace-pre-line leading-relaxed">
                      {msg.text.replace(/\*\*/g, "")}
                    </p>

                    {/* Attached QR Code Pass inside WhatsApp message! */}
                    {msg.bookingAttachment && (
                      <div className="mt-3">
                        <QRCodePassCard
                          booking={msg.bookingAttachment}
                          compact
                          onSimulateScan={onSimulateScanInKiosk}
                        />
                      </div>
                    )}

                    {/* Quick reply chips offered by the AI bot */}
                    {msg.suggestedSpots && msg.suggestedSpots.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {msg.suggestedSpots.map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => handleSend(chip)}
                            className="rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 font-semibold text-xs px-3 py-1.5 transition"
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="mt-1.5 flex items-center justify-end gap-1 text-[10px] text-stone-400">
                      <span>{msg.timestamp}</span>
                      <CheckCheck className="h-3.5 w-3.5 text-sky-500" />
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={chatBottomRef} />
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="bg-[#F0F0F0] p-3 flex items-center gap-2 border-t border-stone-300"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Escribe como ${activeClient?.name} (ej. "Quiero reservar la máquina R-05 hoy a las 18:30")...`}
              className="flex-1 rounded-full bg-white border border-stone-300 px-4 py-2.5 text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-emerald-600"
            />
            <button
              type="submit"
              disabled={sending}
              className="h-10 w-10 rounded-full bg-[#075E54] hover:bg-[#064e46] text-white flex items-center justify-center shrink-0 transition shadow"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
