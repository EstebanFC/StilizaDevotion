"use client";

import React, { useEffect, useState } from "react";
import { Booking, CRMDatabaseState, KioskCheckInResult } from "@/types/crm";
import { ClientBookingPortal } from "@/components/ClientBookingPortal";
import { WhatsAppAICenter } from "@/components/WhatsAppAICenter";
import { TabletKioskView } from "@/components/TabletKioskView";
import { AdminCRMDashboard } from "@/components/AdminCRMDashboard";
import { AdminSettingsIntegrations } from "@/components/AdminSettingsIntegrations";
import { LoginGateway, SessionUser } from "@/components/LoginGateway";
import { ThemeToggleButton } from "@/context/ThemeContext";
import {
  Bot,
  CalendarCheck,
  Flame,
  LayoutDashboard,
  LogOut,
  QrCode,
  ShieldCheck,
  Sliders,
  Sparkles,
  Tablet,
} from "lucide-react";

type AdminModule =
  | "admin_crm"
  | "whatsapp_ai"
  | "tablet_kiosk"
  | "client_portal"
  | "settings";

/**
 * Ruta Exclusiva de Administración (/admin) -> https://stilizadevotion.vercel.app/admin
 * Completamente separada del Login y pantalla de Kiosco para que ninguna alumna
 * o usuario en las tablets de recepción pueda entrar accidentalmente a Admin.
 */
export default function AdminOnlyPortalPage() {
  const [db, setDb] = useState<CRMDatabaseState | null>(null);
  const [adminUser, setAdminUser] = useState<SessionUser | null>(null);
  const [activeAdminModule, setActiveAdminModule] =
    useState<AdminModule>("admin_crm");
  const [selectedClientId, setSelectedClientId] = useState<string>("cli-1");
  const [externalKioskToken, setExternalKioskToken] = useState<string | null>(
    null
  );

  // Restaurar sesión de Administrador con validación criptográfica anti-manipulación
  useEffect(() => {
    async function restoreSession() {
      try {
        const savedUser = localStorage.getItem("sd_admin_session_v1");
        if (savedUser) {
          const parsed = JSON.parse(savedUser) as SessionUser;
          if (parsed && parsed.role === "admin") {
            // Si tiene token criptográfico, verificarlo contra el servidor
            if (parsed.token) {
              const res = await fetch("/api/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "verify_token",
                  token: parsed.token,
                }),
              });
              const data = await res.json();
              if (res.ok && data.valid) {
                setAdminUser({ ...parsed, ...data.user });
              } else {
                // Token alterado o expirado: purgar por seguridad
                localStorage.removeItem("sd_admin_session_v1");
                setAdminUser(null);
              }
            } else {
              setAdminUser(parsed);
            }
          }
        }
        const savedTab = localStorage.getItem("sd_admin_module_v1") as AdminModule | null;
        if (savedTab) {
          setActiveAdminModule(savedTab);
        }
      } catch {
        // En caso de error de parseo o manipulación maliciosa, purgar
        localStorage.removeItem("sd_admin_session_v1");
        setAdminUser(null);
      }
    }

    restoreSession();
  }, []);

  const handleSetAdminUser = (user: SessionUser | null) => {
    setAdminUser(user);
    try {
      if (user) {
        localStorage.setItem("sd_admin_session_v1", JSON.stringify(user));
      } else {
        localStorage.removeItem("sd_admin_session_v1");
      }
    } catch {
      // Ignorar errores de localStorage
    }
  };

  const handleChangeAdminModule = (mod: AdminModule) => {
    setActiveAdminModule(mod);
    try {
      localStorage.setItem("sd_admin_module_v1", mod);
    } catch {
      // Ignorar
    }
  };

  const fetchDatabase = async () => {
    try {
      const res = await fetch("/api/crm", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setDb(data);
      }
    } catch {
      // Ignorar error transitorio de red
    }
  };

  // Carga inicial + Polling automático cada 3 segundos para actualizar conversaciones de WhatsApp y reservas en tiempo real
  useEffect(() => {
    fetchDatabase();
    const interval = setInterval(() => {
      fetchDatabase();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleBookSpot = async (params: {
    clientId: string;
    sessionId: string;
    spotId: string;
  }): Promise<{ success: boolean; error?: string; booking?: Booking }> => {
    const res = await fetch("/api/crm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "book_spot",
        ...params,
        bookedVia: "web_portal",
      }),
    });
    const data = await res.json();
    if (data.state) setDb(data.state);
    return {
      success: Boolean(data.success),
      error: data.error,
      booking: data.booking,
    };
  };

  const handleBuyPackage = async (clientId: string, packageId: string) => {
    const res = await fetch("/api/crm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add_credits",
        clientId,
        packageId,
      }),
    });
    const data = await res.json();
    if (data.state) setDb(data.state);
  };

  const handleSendWhatsAppMessage = async (
    clientId: string,
    text: string,
    senderMode?: "staff" | "client"
  ) => {
    const res = await fetch("/api/crm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "send_chat",
        clientId,
        text,
        senderMode: senderMode || "client",
      }),
    });
    const data = await res.json();
    if (data.state) setDb(data.state);
  };

  const handleKioskQRScan = async (
    qrToken: string,
    kioskLabel?: string
  ): Promise<KioskCheckInResult> => {
    const res = await fetch("/api/crm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "checkin_qr",
        qrToken,
        kioskLabel: kioskLabel || "Kiosco Supervisor (Admin)",
      }),
    });
    const data = await res.json();
    if (data.state) setDb(data.state);
    return data.result as KioskCheckInResult;
  };

  const handleJumpToKioskWithToken = (qrToken: string) => {
    setExternalKioskToken(qrToken);
    handleChangeAdminModule("tablet_kiosk");
  };

  if (!db) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#171311] text-white">
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-2xl bg-amber-400/20 text-amber-300 flex items-center justify-center mx-auto animate-pulse">
            <Sparkles className="h-6 w-6" />
          </div>
          <p className="text-sm font-bold text-stone-200">
            Cargando Portal de Administración · Stiliza & Devotion...
          </p>
        </div>
      </div>
    );
  }

  if (!adminUser) {
    return (
      <LoginGateway
        mode="admin_only"
        branches={db.branches || []}
        onLogin={(user) => handleSetAdminUser(user)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-page)] flex flex-col transition-colors duration-200">
      <header className="sticky top-0 z-30 border-b border-[#7B6E86]/20 bg-[var(--bg-surface)] backdrop-blur-md shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-[#7B6E86] text-[#D2C483] flex items-center justify-center shadow-sm border border-[#7B6E86]/40 shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
                    STILIZA &amp; DEVOTION
                  </h1>
                  <span className="text-xs font-semibold text-[#7B6E86] dark:text-[#D2C483]">
                    Admin OS
                  </span>
                  <span className="text-stone-300 dark:text-stone-700 hidden sm:inline">·</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-600 dark:text-stone-400">
                    6 Sucursales
                  </span>
                  <span className="text-stone-300 dark:text-stone-700 hidden sm:inline">·</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    En Vivo
                  </span>
                </div>
                <p className="text-xs text-stone-500 dark:text-[#A89E96] mt-0.5">{adminUser.label}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <nav className="flex flex-wrap items-center gap-1.5 bg-stone-200/60 dark:bg-black/40 p-1.5 rounded-2xl border border-[#7B6E86]/15">
              <button
                type="button"
                onClick={() => handleChangeAdminModule("admin_crm")}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ${
                  activeAdminModule === "admin_crm"
                    ? "bg-[#7B6E86] text-white shadow-sm"
                    : "text-stone-700 dark:text-stone-300 hover:bg-white/60 dark:hover:bg-white/10"
                }`}
              >
                <LayoutDashboard className="h-4 w-4 text-[#D2C483]" />
                1. Control Horarios &amp; Alumnos
              </button>

              <button
                type="button"
                onClick={() => handleChangeAdminModule("whatsapp_ai")}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ${
                  activeAdminModule === "whatsapp_ai"
                    ? "bg-[#7B6E86] text-white shadow-sm"
                    : "text-stone-700 dark:text-stone-300 hover:bg-white/60 dark:hover:bg-white/10"
                }`}
              >
                <Bot className="h-4 w-4 text-[#D2C483]" />
                2. Bot WhatsApp + QR
              </button>

              <button
                type="button"
                onClick={() => handleChangeAdminModule("tablet_kiosk")}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ${
                  activeAdminModule === "tablet_kiosk"
                    ? "bg-[#7B6E86] text-white shadow-sm"
                    : "text-stone-700 dark:text-stone-300 hover:bg-white/60 dark:hover:bg-white/10"
                }`}
              >
                <Tablet className="h-4 w-4 text-[#D2C483]" />
                3. Simulador Kiosco
              </button>

              <button
                type="button"
                onClick={() => handleChangeAdminModule("client_portal")}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ${
                  activeAdminModule === "client_portal"
                    ? "bg-[#7B6E86] text-white shadow-sm"
                    : "text-stone-700 dark:text-stone-300 hover:bg-white/60 dark:hover:bg-white/10"
                }`}
              >
                <CalendarCheck className="h-4 w-4 text-[#D2C483]" />
                4. Portal Alumnos
              </button>

              <button
                type="button"
                onClick={() => handleChangeAdminModule("settings")}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ${
                  activeAdminModule === "settings"
                    ? "bg-[#7B6E86] text-white shadow-sm"
                    : "text-stone-700 dark:text-stone-300 hover:bg-white/60 dark:hover:bg-white/10"
                }`}
              >
                <Sliders className="h-4 w-4 text-[#D2C483]" />
                5. Configuración &amp; Integraciones
              </button>
            </nav>

            <ThemeToggleButton />

            <button
              type="button"
              onClick={() => handleSetAdminUser(null)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-stone-200 dark:bg-white/10 hover:bg-stone-300 dark:hover:bg-white/20 text-stone-800 dark:text-stone-200 text-xs font-bold px-3 py-2.5 transition border border-[#7B6E86]/20"
            >
              <LogOut className="h-3.5 w-3.5" />
              Cerrar Sesión Admin
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeAdminModule === "admin_crm" && (
          <AdminCRMDashboard
            db={db}
            onCreateClient={async (payload) => {
              const res = await fetch("/api/crm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "create_client", ...payload }),
              });
              const data = await res.json();
              if (data.state) setDb(data.state);
            }}
            onUpdateClient={async (payload) => {
              const res = await fetch("/api/crm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "update_client", ...payload }),
              });
              const data = await res.json();
              if (data.state) setDb(data.state);
            }}
            onDeleteClient={async (clientId) => {
              const res = await fetch("/api/crm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "delete_client", clientId }),
              });
              const data = await res.json();
              if (data.state) setDb(data.state);
            }}
            onCreateSession={async (payload) => {
              const res = await fetch("/api/crm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "create_session", ...payload }),
              });
              const data = await res.json();
              if (data.state) setDb(data.state);
            }}
            onCreateSessionsBatch={async (batch) => {
              const res = await fetch("/api/crm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "create_sessions_batch", batch }),
              });
              const data = await res.json();
              if (data.state) setDb(data.state);
              return {
                success: Boolean(data.success),
                count: data.count,
                error: data.error,
              };
            }}
            onBatchUpdateCoach={async (sessionIds, instructor) => {
              const res = await fetch("/api/crm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "batch_update_sessions_coach",
                  sessionIds,
                  instructor,
                }),
              });
              const data = await res.json();
              if (data.state) setDb(data.state);
              return { success: Boolean(data.success), error: data.error };
            }}
            onBatchDeleteSessions={async (sessionIds) => {
              const res = await fetch("/api/crm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "batch_delete_sessions",
                  sessionIds,
                }),
              });
              const data = await res.json();
              if (data.state) setDb(data.state);
              return { success: Boolean(data.success), error: data.error };
            }}
            onUpdateSession={async (payload) => {
              const res = await fetch("/api/crm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "update_session", ...payload }),
              });
              const data = await res.json();
              if (data.state) setDb(data.state);
            }}
            onDeleteSession={async (sessionId) => {
              const res = await fetch("/api/crm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "delete_session", sessionId }),
              });
              const data = await res.json();
              if (data.state) setDb(data.state);
            }}
            onCreatePromoEvent={async (payload) => {
              const res = await fetch("/api/crm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "create_promo_event",
                  ...payload,
                }),
              });
              const data = await res.json();
              if (data.state) setDb(data.state);
            }}
            onDeletePromoEvent={async (eventId) => {
              const res = await fetch("/api/crm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "delete_promo_event",
                  eventId,
                }),
              });
              const data = await res.json();
              if (data.state) setDb(data.state);
            }}
            onCreateCoach={async (payload) => {
              const res = await fetch("/api/crm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "create_coach", ...payload }),
              });
              const data = await res.json();
              if (data.state) setDb(data.state);
            }}
            onCreateBranch={async (payload) => {
              const res = await fetch("/api/crm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "create_branch", ...payload }),
              });
              const data = await res.json();
              if (data.state) setDb(data.state);
            }}
            onUpdateBranchPin={async (branchId, pin) => {
              const res = await fetch("/api/crm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "update_branch_pin",
                  branchId,
                  pin,
                }),
              });
              const data = await res.json();
              if (data.state) setDb(data.state);
              return { success: Boolean(data.success), error: data.error };
            }}
            onRechargeClient={handleBuyPackage}
            onToggleMaintenance={async (roomId, spotId) => {
              const res = await fetch("/api/crm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "toggle_spot_maintenance",
                  roomId,
                  spotId,
                }),
              });
              const data = await res.json();
              if (data.state) setDb(data.state);
            }}
            onCancelBooking={async (bookingId) => {
              const res = await fetch("/api/crm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "cancel_booking",
                  bookingId,
                }),
              });
              const data = await res.json();
              if (data.state) setDb(data.state);
            }}
            onScanInKiosk={handleJumpToKioskWithToken}
            onOpenClientChat={(clientId) => {
              setSelectedClientId(clientId);
              handleChangeAdminModule("whatsapp_ai");
            }}
            onResetDemo={async () => {
              const res = await fetch("/api/crm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "reset_demo" }),
              });
              const data = await res.json();
              if (data.state) setDb(data.state);
            }}
            onSyncExternalBooking={async (payload) => {
              const res = await fetch("/api/integrations/aggregator", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
              const data = await res.json();
              if (data.state) setDb(data.state);
              return {
                success: Boolean(data.success),
                error: data.error,
                spotAssigned: data?.booking?.spotId,
                remainingSlots:
                  data?.channelSyncReport?.remainingSlotsPublishedToAllApps,
              };
            }}
          />
        )}

        {activeAdminModule === "whatsapp_ai" && (
          <WhatsAppAICenter
            db={db}
            selectedClientId={selectedClientId}
            onSelectClient={setSelectedClientId}
            onSendMessage={handleSendWhatsAppMessage}
            onSimulateScanInKiosk={handleJumpToKioskWithToken}
          />
        )}

        {activeAdminModule === "tablet_kiosk" && (
          <TabletKioskView
            db={db}
            kioskLabel="Kiosco Supervisor (Vista Admin)"
            onScanQR={handleKioskQRScan}
            onBookSpot={handleBookSpot}
            onBuyPackage={handleBuyPackage}
            externalTriggeredToken={externalKioskToken}
            onClearExternalToken={() => setExternalKioskToken(null)}
          />
        )}

        {activeAdminModule === "client_portal" && (
          <ClientBookingPortal
            db={db}
            activeClientId={selectedClientId}
            onChangeClient={setSelectedClientId}
            onBookSpot={handleBookSpot}
            onBuyPackage={handleBuyPackage}
            onOpenWhatsAppChat={() => handleChangeAdminModule("whatsapp_ai")}
            onSimulateScanInKiosk={handleJumpToKioskWithToken}
          />
        )}

        {activeAdminModule === "settings" && (
          <AdminSettingsIntegrations
            db={db}
            onUpdateBranchPin={async (branchId, pin) => {
              const res = await fetch("/api/crm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "update_branch_pin",
                  branchId,
                  pin,
                }),
              });
              const data = await res.json();
              if (data.state) setDb(data.state);
              return { success: Boolean(data.success), error: data.error };
            }}
            onSyncExternalBooking={async (payload) => {
              const res = await fetch("/api/integrations/aggregator", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
              const data = await res.json();
              if (data.state) setDb(data.state);
              return {
                success: Boolean(data.success),
                error: data.error,
                spotAssigned: data?.booking?.spotId,
                remainingSlots:
                  data?.channelSyncReport?.remainingSlotsPublishedToAllApps,
              };
            }}
            onSaveMetaCredentials={async (payload) => {
              const res = await fetch("/api/crm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "save_meta_credentials",
                  phoneNumberId: payload.phoneNumberId,
                  accessToken: payload.accessToken,
                  testRecipientPhone: payload.testPhone,
                }),
              });
              const data = await res.json();
              if (data.state) setDb(data.state);
              return {
                success: Boolean(data.success),
                error: data.error || (data.sendRes && data.sendRes.error),
                messageId: data?.sendRes?.messageId,
              };
            }}
            onUpdateAiSettings={async (settings) => {
              const res = await fetch("/api/crm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "update_ai_settings",
                  settings,
                }),
              });
              const data = await res.json();
              if (data.state) setDb(data.state);
            }}
            onCleanDatabase={async () => {
              const res = await fetch("/api/crm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "clean_database" }),
              });
              const data = await res.json();
              if (data.state) setDb(data.state);
              return {
                success: Boolean(data.success),
                error: data.error,
                message: data.message,
              };
            }}
          />
        )}
      </main>

      <footer className="border-t border-stone-200/80 bg-[#FAF7F2] py-4 px-6 mt-12">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs text-stone-500">
          <div className="flex items-center gap-2">
            <QrCode className="h-4 w-4 text-amber-700" />
            <span>
              <strong>Stiliza & Devotion Studio OS:</strong> Portal Exclusivo de
              Administración (/admin).
            </span>
          </div>
          <span>v2.1 · Rutas Separadas Kiosco vs Admin</span>
        </div>
      </footer>
    </div>
  );
}
