"use client";

import React, { useEffect, useState } from "react";
import { Booking, CRMDatabaseState, KioskCheckInResult } from "@/types/crm";
import { ClientBookingPortal } from "@/components/ClientBookingPortal";
import { WhatsAppAICenter } from "@/components/WhatsAppAICenter";
import { TabletKioskView } from "@/components/TabletKioskView";
import { AdminCRMDashboard } from "@/components/AdminCRMDashboard";
import { LoginGateway, SessionUser } from "@/components/LoginGateway";
import {
  Bot,
  CalendarCheck,
  Flame,
  LayoutDashboard,
  LogOut,
  QrCode,
  ShieldCheck,
  Sparkles,
  Tablet,
} from "lucide-react";

type AdminModule =
  | "admin_crm"
  | "whatsapp_ai"
  | "tablet_kiosk"
  | "client_portal";

export default function StilizaDevotionApp() {
  const [db, setDb] = useState<CRMDatabaseState | null>(null);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [activeAdminModule, setActiveAdminModule] =
    useState<AdminModule>("admin_crm");
  const [selectedClientId, setSelectedClientId] = useState<string>("cli-1");
  const [externalKioskToken, setExternalKioskToken] = useState<string | null>(
    null
  );

  const fetchDatabase = async () => {
    const res = await fetch("/api/crm");
    if (res.ok) {
      const data = await res.json();
      setDb(data);
    }
  };

  useEffect(() => {
    fetchDatabase();
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
        bookedVia:
          sessionUser?.role === "kiosco" ? "kiosk_tablet" : "web_portal",
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

  const handleSendWhatsAppMessage = async (clientId: string, text: string) => {
    const res = await fetch("/api/crm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "send_chat",
        clientId,
        text,
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
        kioskLabel: kioskLabel || sessionUser?.label || "Kiosco Principal",
      }),
    });
    const data = await res.json();
    if (data.state) setDb(data.state);
    return data.result as KioskCheckInResult;
  };

  const handleJumpToKioskWithToken = (qrToken: string) => {
    setExternalKioskToken(qrToken);
    setActiveAdminModule("tablet_kiosk");
  };

  if (!db) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#171311] text-white">
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-2xl bg-amber-400/20 text-amber-300 flex items-center justify-center mx-auto animate-pulse">
            <Sparkles className="h-6 w-6" />
          </div>
          <p className="text-sm font-bold text-stone-200">
            Cargando Studio OS · Stiliza Reformer & Devotion Hot Pilates...
          </p>
        </div>
      </div>
    );
  }

  // 1. Si no ha iniciado sesión, mostrar el Login (Kiosco #N por sucursal vs Admin)
  if (!sessionUser) {
    return (
      <LoginGateway
        branches={db.branches || []}
        onLogin={(user) => {
          setSessionUser(user);
          if (user.role === "admin") {
            setActiveAdminModule("admin_crm");
          }
        }}
      />
    );
  }

  // 2. Si inició sesión como KIOSCO (cualquier número N y sucursal de Stiliza o Devotion):
  //    Mostrar únicamente la experiencia aislada de Kiosco (Check-in QR, Horarios, Compra de Tokens, Eventos/Promos)
  if (sessionUser.role === "kiosco") {
    return (
      <div className="min-h-screen bg-[#120E0C] flex flex-col">
        <header className="border-b border-white/10 bg-[#171311] px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-400 text-stone-950 font-extrabold flex items-center justify-center text-sm">
              K#{sessionUser.kioskNumber}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-white">
                  {sessionUser.label}
                </span>
                <span className="rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 border border-emerald-500/30">
                  MODO KIOSCO BLOQUEADO
                </span>
              </div>
              <p className="text-[11px] text-stone-400">
                Check-In QR · Compra de Tokens · Próximos Horarios · Eventos y
                Promos
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSessionUser(null)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-stone-200 text-xs font-semibold px-3.5 py-2 border border-white/10 transition"
          >
            <LogOut className="h-3.5 w-3.5" />
            Cambiar Usuario / Salir de Kiosco
          </button>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
          <TabletKioskView
            db={db}
            kioskLabel={sessionUser.label}
            branchId={sessionUser.branchId}
            branchName={sessionUser.branchName}
            onScanQR={handleKioskQRScan}
            onBookSpot={handleBookSpot}
            onBuyPackage={handleBuyPackage}
            onCreateClientInKiosk={async (payload) => {
              const res = await fetch("/api/crm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "create_client", ...payload }),
              });
              const data = await res.json();
              if (data.state) setDb(data.state);
            }}
          />
        </main>
      </div>
    );
  }

  // 3. Si inició sesión como ADMIN: Mostrar la suite completa de Administración Multi-Sucursal
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-[#FAF7F2]/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-[#231D19] to-[#120E0C] text-amber-200 flex items-center justify-center shadow-sm border border-stone-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-extrabold tracking-tight text-stone-900">
                    STILIZA & DEVOTION · ADMIN OS
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-900">
                    <Sparkles className="h-2.5 w-2.5" /> Multi-Sucursal &{" "}
                    <Flame className="h-2.5 w-2.5 text-orange-600" /> Kioscos
                  </span>
                </div>
                <p className="text-xs text-stone-500">{sessionUser.label}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <nav className="flex flex-wrap items-center gap-1.5 bg-stone-200/75 p-1.5 rounded-2xl">
              <button
                type="button"
                onClick={() => setActiveAdminModule("admin_crm")}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                  activeAdminModule === "admin_crm"
                    ? "bg-stone-900 text-amber-200 shadow-sm"
                    : "text-stone-700 hover:bg-white/60"
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                1. Control Sucursales & Horarios
              </button>

              <button
                type="button"
                onClick={() => setActiveAdminModule("whatsapp_ai")}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                  activeAdminModule === "whatsapp_ai"
                    ? "bg-[#1A2E26] text-emerald-200 shadow-sm"
                    : "text-stone-700 hover:bg-white/60"
                }`}
              >
                <Bot className="h-4 w-4" />
                2. Bot IA WhatsApp + QR
              </button>

              <button
                type="button"
                onClick={() => setActiveAdminModule("tablet_kiosk")}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                  activeAdminModule === "tablet_kiosk"
                    ? "bg-amber-400 text-stone-950 shadow-sm"
                    : "text-stone-700 hover:bg-white/60"
                }`}
              >
                <Tablet className="h-4 w-4" />
                3. Vista Kiosco Tablet
              </button>

              <button
                type="button"
                onClick={() => setActiveAdminModule("client_portal")}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                  activeAdminModule === "client_portal"
                    ? "bg-stone-900 text-white shadow-sm"
                    : "text-stone-700 hover:bg-white/60"
                }`}
              >
                <CalendarCheck className="h-4 w-4" />
                4. Portal Web Alumnas
              </button>
            </nav>

            <button
              type="button"
              onClick={() => setSessionUser(null)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-bold px-3 py-2.5 transition"
            >
              <LogOut className="h-3.5 w-3.5" />
              Salir / Cambiar a Kiosco
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
            onCreateSession={async (payload) => {
              const res = await fetch("/api/crm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "create_session", ...payload }),
              });
              const data = await res.json();
              if (data.state) setDb(data.state);
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
              setActiveAdminModule("whatsapp_ai");
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
            onOpenWhatsAppChat={() => setActiveAdminModule("whatsapp_ai")}
            onSimulateScanInKiosk={handleJumpToKioskWithToken}
          />
        )}
      </main>

      <footer className="border-t border-stone-200/80 bg-[#FAF7F2] py-4 px-6 mt-12">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs text-stone-500">
          <div className="flex items-center gap-2">
            <QrCode className="h-4 w-4 text-amber-700" />
            <span>
              <strong>Stiliza & Devotion Studio OS:</strong> Control
              Multi-Sucursal, Kioscos Autónomos de Recepción y Bot IA WhatsApp.
            </span>
          </div>
          <span>v2.0 · Admin & Kiosco Mode</span>
        </div>
      </footer>
    </div>
  );
}
