"use client";

import React, { useState } from "react";
import {
  CRMDatabaseState,
  ExternalAggregator,
  StudioBrand,
} from "@/types/crm";
import { ChannelManagerPanel } from "@/components/ChannelManagerPanel";
import {
  Bot,
  CheckCircle2,
  Copy,
  ExternalLink,
  Flame,
  Globe,
  KeyRound,
  Layers,
  Lock,
  MessageSquare,
  Phone,
  Radio,
  Save,
  Send,
  Shield,
  ShieldCheck,
  Sliders,
  Sparkles,
  Webhook,
  Zap,
} from "lucide-react";

interface AdminSettingsIntegrationsProps {
  db: CRMDatabaseState;
  onUpdateBranchPin: (
    branchId: string,
    pin: string
  ) => Promise<{ success: boolean; error?: string }>;
  onSyncExternalBooking: (params: {
    platform: ExternalAggregator;
    clientName: string;
    sessionId: string;
  }) => Promise<{
    success: boolean;
    error?: string;
    spotAssigned?: string;
    remainingSlots?: number;
  }>;
  onSaveMetaCredentials: (params: {
    phoneNumberId: string;
    accessToken: string;
    testPhone?: string;
  }) => Promise<{ success: boolean; error?: string; messageId?: string }>;
  onUpdateAiSettings: (settings: {
    botName?: string;
    autoSendWhatsAppQR?: boolean;
    reminderMinutesBefore?: number;
    cancellationWindowHours?: number;
    whatsappWebhookMode?: "simulator_ready" | "meta_cloud_api" | "twilio";
  }) => Promise<void>;
}

export function AdminSettingsIntegrations({
  db,
  onUpdateBranchPin,
  onSyncExternalBooking,
  onSaveMetaCredentials,
  onUpdateAiSettings,
}: AdminSettingsIntegrationsProps) {
  const [activeSubTab, setActiveSubTab] = useState<
    "whatsapp" | "channel_manager" | "branch_pins" | "bot_rules"
  >("whatsapp");

  // Meta WhatsApp credentials state
  const currentPhoneId =
    (db.aiSettings as unknown as { metaPhoneNumberId?: string })
      ?.metaPhoneNumberId || "1406671965864277";
  const currentToken =
    (db.aiSettings as unknown as { metaAccessToken?: string })
      ?.metaAccessToken || "";

  const [metaPhoneId, setMetaPhoneId] = useState(currentPhoneId);
  const [metaToken, setMetaToken] = useState(currentToken);
  const [testPhone, setTestPhone] = useState("+52 987 871 0684");
  const [isSavingMeta, setIsSavingMeta] = useState(false);
  const [metaSaveStatus, setMetaSaveStatus] = useState<{
    success?: boolean;
    msg?: string;
  } | null>(null);

  // Copied alert states
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Branch PIN edit state
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [newPinValue, setNewPinValue] = useState("");
  const [pinStatus, setPinStatus] = useState<string | null>(null);

  const handleSavePin = async (branchId: string) => {
    if (!newPinValue || newPinValue.length !== 6) {
      setPinStatus("El PIN debe ser de 6 dígitos numéricos.");
      return;
    }
    const res = await onUpdateBranchPin(branchId, newPinValue);
    if (res.success) {
      setPinStatus("¡PIN actualizado con éxito!");
      setEditingBranchId(null);
      setNewPinValue("");
      setTimeout(() => setPinStatus(null), 3000);
    } else {
      setPinStatus(res.error || "Error al actualizar PIN.");
    }
  };

  // AI Bot Settings state
  const [botName, setBotName] = useState(
    db.aiSettings?.botName || "Stiliza & Devotion Concierge IA"
  );
  const [autoSendQR, setAutoSendQR] = useState(
    db.aiSettings?.autoSendWhatsAppQR ?? true
  );
  const [reminderMin, setReminderMin] = useState(
    db.aiSettings?.reminderMinutesBefore || 120
  );
  const [cancelHours, setCancelHours] = useState(
    db.aiSettings?.cancellationWindowHours || 6
  );
  const [isSavingBot, setIsSavingBot] = useState(false);
  const [botSaveMsg, setBotSaveMsg] = useState<string | null>(null);

  const handleSaveBotSettings = async () => {
    setIsSavingBot(true);
    setBotSaveMsg(null);
    try {
      await onUpdateAiSettings({
        botName,
        autoSendWhatsAppQR: autoSendQR,
        reminderMinutesBefore: Number(reminderMin),
        cancellationWindowHours: Number(cancelHours),
      });
      setBotSaveMsg("Configuración de Concierge IA guardada correctamente.");
      setTimeout(() => setBotSaveMsg(null), 3500);
    } catch {
      setBotSaveMsg("Error al guardar configuración.");
    } finally {
      setIsSavingBot(false);
    }
  };

  const handleSaveAndTestMeta = async () => {
    setIsSavingMeta(true);
    setMetaSaveStatus(null);
    try {
      const res = await onSaveMetaCredentials({
        phoneNumberId: metaPhoneId.trim(),
        accessToken: metaToken.trim(),
        testPhone: testPhone.trim(),
      });
      if (res.success) {
        setMetaSaveStatus({
          success: true,
          msg: `¡Credenciales guardadas y mensaje de prueba enviado con éxito a ${testPhone}!`,
        });
      } else {
        setMetaSaveStatus({
          success: false,
          msg: res.error || "No se pudo verificar el token de Meta.",
        });
      }
    } catch (err: unknown) {
      const error = err as Error;
      setMetaSaveStatus({
        success: false,
        msg: error.message || "Error al conectar con Meta WhatsApp API.",
      });
    } finally {
      setIsSavingMeta(false);
    }
  };

  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/whatsapp/webhook`
      : "https://stilizadevotion.vercel.app/api/whatsapp/webhook";
  const verifyToken = "stiliza_devotion_verify_2026";

  return (
    <div className="space-y-6">
      {/* Header de la Sección de Configuración */}
      <div className="rounded-3xl bg-white dark:bg-[#1C1824] border border-stone-200/90 dark:border-stone-800 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-[#7B6E86]/15 dark:bg-[#7B6E86]/30 text-[#7B6E86] dark:text-[#D2C483] border border-[#7B6E86]/30 flex items-center justify-center">
              <Sliders className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">
                Centro de Configuración & Integraciones
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Administra tus credenciales de Meta WhatsApp Cloud API, sincronización con Wellhub / Fitpass y PINs de seguridad.
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 px-3 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Conexión Supabase & Vercel Activa
          </div>
        </div>

        {/* Sub-pestañas de Configuración */}
        <div className="flex flex-wrap items-center gap-2 mt-6 pt-5 border-t border-stone-100 dark:border-stone-800">
          <button
            type="button"
            onClick={() => setActiveSubTab("whatsapp")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeSubTab === "whatsapp"
                ? "bg-[#7B6E86] text-white shadow-sm"
                : "bg-stone-100 dark:bg-stone-900 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            Meta WhatsApp Cloud API
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("channel_manager")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeSubTab === "channel_manager"
                ? "bg-[#7B6E86] text-white shadow-sm"
                : "bg-stone-100 dark:bg-stone-900 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800"
            }`}
          >
            <Layers className="h-4 w-4" />
            Channel Manager (Wellhub, Fitpass, Totalpass)
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("branch_pins")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeSubTab === "branch_pins"
                ? "bg-[#7B6E86] text-white shadow-sm"
                : "bg-stone-100 dark:bg-stone-900 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800"
            }`}
          >
            <KeyRound className="h-4 w-4" />
            PINs Kiosco por Sucursal
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("bot_rules")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeSubTab === "bot_rules"
                ? "bg-[#7B6E86] text-white shadow-sm"
                : "bg-stone-100 dark:bg-stone-900 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800"
            }`}
          >
            <Bot className="h-4 w-4" />
            Comportamiento Bot Concierge
          </button>
        </div>
      </div>

      {/* =========================================================================
          SUB-TAB 1: META WHATSAPP CLOUD API CONFIGURATION
         ========================================================================= */}
      {activeSubTab === "whatsapp" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Card de Webhook Info */}
          <div className="rounded-3xl bg-stone-900 text-white p-6 shadow-md border border-stone-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                  <Webhook className="h-3.5 w-3.5" /> Webhook Oficial de Meta
                </span>
                <h3 className="text-base font-bold text-white mt-1">
                  Datos de Suscripción para Meta for Developers
                </h3>
              </div>
              <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full font-semibold">
                Suscrito a eventos: messages
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5 bg-black/40 rounded-2xl p-4 border border-white/10">
                <p className="text-stone-400 font-semibold">URL de Devolución de Llamada (Webhook):</p>
                <div className="flex items-center justify-between gap-2">
                  <code className="text-emerald-300 font-mono text-[11px] break-all select-all">
                    {webhookUrl}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopy(webhookUrl, "webhook")}
                    className="shrink-0 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-stone-200 transition"
                    title="Copiar Webhook URL"
                  >
                    {copiedKey === "webhook" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 bg-black/40 rounded-2xl p-4 border border-white/10">
                <p className="text-stone-400 font-semibold">Identificador de Verificación (Verify Token):</p>
                <div className="flex items-center justify-between gap-2">
                  <code className="text-emerald-300 font-mono text-[11px] select-all">
                    {verifyToken}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopy(verifyToken, "token")}
                    className="shrink-0 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-stone-200 transition"
                    title="Copiar Verify Token"
                  >
                    {copiedKey === "token" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Formulario de Credenciales de Meta */}
          <div className="rounded-3xl bg-white dark:bg-[#1C1824] border border-stone-200/90 dark:border-stone-800 p-6 shadow-sm space-y-5">
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-[#7B6E86] dark:text-[#D2C483]" />
                Credenciales de Acceso Meta Cloud API
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                Ingresa el Identificador de número de teléfono y el Token de Acceso que te da Meta en el portal de WhatsApp Cloud API.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                  Phone Number ID (Identificador de Teléfono)
                </label>
                <input
                  type="text"
                  value={metaPhoneId}
                  onChange={(e) => setMetaPhoneId(e.target.value)}
                  placeholder="ej. 1406671965864277"
                  className="w-full rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 px-3.5 py-2.5 text-xs font-mono text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:bg-white dark:focus:bg-stone-950 focus:border-[#7B6E86] focus:ring-2 focus:ring-[#7B6E86]/20 outline-none"
                />
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                  Número oficial registrado: <strong>+52 1 442 818 2610</strong>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                  Teléfono de Prueba para Enviar QR Real
                </label>
                <input
                  type="text"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="+52 987 871 0684"
                  className="w-full rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 px-3.5 py-2.5 text-xs font-mono text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:bg-white dark:focus:bg-stone-950 focus:border-[#7B6E86] focus:ring-2 focus:ring-[#7B6E86]/20 outline-none"
                />
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                  Tu número de WhatsApp donde recibirás la confirmación inmediata.
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                  Token de Acceso de Meta (Bearer Token)
                </label>
                <textarea
                  rows={3}
                  value={metaToken}
                  onChange={(e) => setMetaToken(e.target.value)}
                  placeholder="EAAZAVasZBwbVABS..."
                  className="w-full rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 p-3 text-xs font-mono text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:bg-white dark:focus:bg-stone-950 focus:border-[#7B6E86] focus:ring-2 focus:ring-[#7B6E86]/20 outline-none"
                />
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                  Pega aquí el Token temporal de 24h o el Token de Sistema Permanente de tu App de Meta Developers.
                </p>
              </div>
            </div>

            {metaSaveStatus && (
              <div
                className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
                  metaSaveStatus.success
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                    : "bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300"
                }`}
              >
                {metaSaveStatus.success ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Shield className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                )}
                <span>{metaSaveStatus.msg}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={handleSaveAndTestMeta}
                disabled={isSavingMeta}
                className="inline-flex items-center gap-2 rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-stone-800 dark:hover:bg-stone-700 text-[#D2C483] font-bold text-xs px-5 py-2.5 transition shadow-sm disabled:opacity-50"
              >
                {isSavingMeta ? (
                  <>
                    <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Conectando con Meta & Enviando QR...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Guardar Credenciales & Enviar Prueba Real</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 2: CHANNEL MANAGER / AGREGADORES
         ========================================================================= */}
      {activeSubTab === "channel_manager" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <ChannelManagerPanel
            db={db}
            selectedSessionId={db.sessions[0]?.id || ""}
            onSyncExternalBooking={onSyncExternalBooking}
          />
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 3: PINs DE KIOSCO POR SUCURSAL
         ========================================================================= */}
      {activeSubTab === "branch_pins" && (
        <div className="rounded-3xl bg-white dark:bg-[#1C1824] border border-stone-200/90 dark:border-stone-800 p-6 shadow-sm space-y-5 animate-in fade-in duration-200">
          <div>
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-[#7B6E86] dark:text-[#D2C483]" />
              Control de PINs de Acceso para Tablets y Kioscos
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              Cada una de las 6 sucursales cuenta con un PIN oficial de 6 dígitos que se utiliza en la tablet del Kiosco para autorizar check-ins y bloqueos de mantenimiento.
            </p>
          </div>

          {pinStatus && (
            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-semibold">
              {pinStatus}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {db.branches.map((br) => {
              const isDevotion = br.brand === "Devotion";
              const isEditing = editingBranchId === br.id;

              return (
                <div
                  key={br.id}
                  className="rounded-2xl border border-stone-200/90 dark:border-stone-800 p-4.5 bg-stone-50/50 dark:bg-stone-900/50 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        isDevotion
                          ? "bg-orange-100 dark:bg-orange-950/50 text-orange-800 dark:text-orange-300"
                          : "bg-stone-900 text-amber-200"
                      }`}
                    >
                      {br.brand} ({br.code})
                    </span>
                    <span className="text-xs font-mono font-bold text-stone-500">
                      PIN Kiosco
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                      {br.name}
                    </h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400 truncate mt-0.5">
                      {br.address}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between">
                    {isEditing ? (
                      <div className="flex items-center gap-2 w-full">
                        <input
                          type="text"
                          maxLength={6}
                          value={newPinValue}
                          onChange={(e) =>
                            setNewPinValue(
                              e.target.value.replace(/\D/g, "").slice(0, 6)
                            )
                          }
                          placeholder="6 dígitos"
                          className="w-24 rounded-lg bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 px-2 py-1 text-xs font-mono font-bold text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-[#7B6E86]"
                        />
                        <button
                          type="button"
                          onClick={() => handleSavePin(br.id)}
                          className="px-2.5 py-1 rounded-lg bg-stone-900 dark:bg-stone-800 text-amber-200 font-bold text-xs"
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingBranchId(null)}
                          className="text-xs text-stone-500"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <>
                        <code className="text-sm font-mono font-extrabold text-[#7B6E86] dark:text-[#D2C483] tracking-widest">
                          {br.kioskPin || "111222"}
                        </code>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingBranchId(br.id);
                            setNewPinValue(br.kioskPin || "");
                          }}
                          className="text-xs font-bold text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 underline"
                        >
                          Cambiar PIN
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 4: REGLAS Y COMPORTAMIENTO DEL BOT CONCIERGE
         ========================================================================= */}
      {activeSubTab === "bot_rules" && (
        <div className="rounded-3xl bg-white dark:bg-[#1C1824] border border-stone-200/90 dark:border-stone-800 p-6 shadow-sm space-y-5 animate-in fade-in duration-200">
          <div>
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Bot className="h-5 w-5 text-[#7B6E86] dark:text-[#D2C483]" />
              Parámetros de Automatización del Concierge IA
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              Ajusta las políticas operativas del bot al interactuar con las alumnas por WhatsApp.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                Nombre del Concierge IA
              </label>
              <input
                type="text"
                value={botName}
                onChange={(e) => setBotName(e.target.value)}
                className="w-full rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 px-3.5 py-2.5 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#7B6E86]/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                Ventana de Cancelación Oportuna (Horas antes)
              </label>
              <input
                type="number"
                min={1}
                max={48}
                value={cancelHours}
                onChange={(e) => setCancelHours(Number(e.target.value) || 6)}
                className="w-full rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 px-3.5 py-2.5 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#7B6E86]/20"
              />
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                Tiempo límite para que el bot regrese el token si la alumna cancela su lugar.
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className="flex items-center gap-3 p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSendQR}
                  onChange={(e) => setAutoSendQR(e.target.checked)}
                  className="h-4 w-4 rounded text-[#7B6E86] focus:ring-[#7B6E86]"
                />
                <div>
                  <span className="text-xs font-bold text-stone-900 dark:text-stone-100 block">
                    Enviar Pase QR automáticamente al confirmar reserva por WhatsApp
                  </span>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400 block mt-0.5">
                    Genera la imagen PNG del código QR y la entrega directamente en el chat para check-in en Kiosco.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {botSaveMsg && (
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
              {botSaveMsg}
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-stone-100 dark:border-stone-800">
            <button
              type="button"
              onClick={handleSaveBotSettings}
              disabled={isSavingBot}
              className="inline-flex items-center gap-2 rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-stone-800 dark:hover:bg-stone-700 text-[#D2C483] font-bold text-xs px-5 py-2.5 transition"
            >
              <Save className="h-4 w-4" />
              <span>Guardar Reglas del Bot</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
