"use client";

import React, { useEffect, useState } from "react";
import { CRMDatabaseState, KioskCheckInResult } from "@/types/crm";
import { ClientBookingPortal } from "@/components/ClientBookingPortal";
import { WhatsAppAICenter } from "@/components/WhatsAppAICenter";
import { TabletKioskView } from "@/components/TabletKioskView";
import { AdminCRMDashboard } from "@/components/AdminCRMDashboard";
import {
  Bot,
  CalendarCheck,
  Flame,
  LayoutDashboard,
  QrCode,
  Sparkles,
  Tablet,
} from "lucide-react";

type ActiveModule = "client_portal" | "whatsapp_ai" | "tablet_kiosk" | "admin_crm";

export default function StilizaDevotionApp() {
  const [db, setDb] = useState<CRMDatabaseState | null>(null);
  const [activeModule, setActiveModule] =
    useState<ActiveModule>("client_portal");
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
  }) => {
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
    return { success: Boolean(data.success), error: data.error };
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
    qrToken: string
  ): Promise<KioskCheckInResult> => {
    const res = await fetch("/api/crm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "checkin_qr",
        qrToken,
      }),
    });
    const data = await res.json();
    if (data.state) setDb(data.state);
    return data.result as KioskCheckInResult;
  };

  const handleJumpToKioskWithToken = (qrToken: string) => {
    setExternalKioskToken(qrToken);
    setActiveModule("tablet_kiosk");
  };

  if (!db) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F2EC]">
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-2xl bg-stone-900 text-amber-200 flex items-center justify-center mx-auto animate-pulse">
            <Sparkles className="h-6 w-6" />
          </div>
          <p className="text-sm font-bold text-stone-800">
            Cargando Stiliza Devotion CRM & Frontdesk Autónomo...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Luxury Studio Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-[#FAF7F2]/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Brand Logo */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-[#231D19] to-[#120E0C] text-amber-200 flex items-center justify-center shadow-sm border border-stone-700">
                <span className="font-serif text-lg font-bold tracking-tighter">
                  SD
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-extrabold tracking-tight text-stone-900">
                    STILIZA DEVOTION
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-900">
                    <Sparkles className="h-2.5 w-2.5" /> Reformer &{" "}
                    <Flame className="h-2.5 w-2.5 text-orange-600" /> Hot
                    Pilates
                  </span>
                </div>
                <p className="text-xs text-stone-500">
                  CRM & Frontdesk Autónomo · Pase QR por WhatsApp + Kiosco
                  Tablet
                </p>
              </div>
            </div>
          </div>

          {/* 4 Module Switcher Tabs */}
          <nav className="flex flex-wrap items-center gap-1.5 bg-stone-200/75 p-1.5 rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveModule("client_portal")}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                activeModule === "client_portal"
                  ? "bg-stone-900 text-amber-200 shadow-sm"
                  : "text-stone-700 hover:bg-white/60"
              }`}
            >
              <CalendarCheck className="h-4 w-4" />
              1. Portal Reservas & Mapa
            </button>

            <button
              type="button"
              onClick={() => setActiveModule("whatsapp_ai")}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                activeModule === "whatsapp_ai"
                  ? "bg-[#1A2E26] text-emerald-200 shadow-sm"
                  : "text-stone-700 hover:bg-white/60"
              }`}
            >
              <Bot className="h-4 w-4" />
              2. Bot IA WhatsApp + QR
            </button>

            <button
              type="button"
              onClick={() => setActiveModule("tablet_kiosk")}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                activeModule === "tablet_kiosk"
                  ? "bg-amber-400 text-stone-950 shadow-sm"
                  : "text-stone-700 hover:bg-white/60"
              }`}
            >
              <Tablet className="h-4 w-4" />
              3. Modo Kiosco Tablet (Lector QR)
            </button>

            <button
              type="button"
              onClick={() => setActiveModule("admin_crm")}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                activeModule === "admin_crm"
                  ? "bg-stone-900 text-white shadow-sm"
                  : "text-stone-700 hover:bg-white/60"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              4. Panel CRM / Admin
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeModule === "client_portal" && (
          <ClientBookingPortal
            db={db}
            activeClientId={selectedClientId}
            onChangeClient={setSelectedClientId}
            onBookSpot={handleBookSpot}
            onBuyPackage={handleBuyPackage}
            onOpenWhatsAppChat={() => setActiveModule("whatsapp_ai")}
            onSimulateScanInKiosk={handleJumpToKioskWithToken}
          />
        )}

        {activeModule === "whatsapp_ai" && (
          <WhatsAppAICenter
            db={db}
            selectedClientId={selectedClientId}
            onSelectClient={setSelectedClientId}
            onSendMessage={handleSendWhatsAppMessage}
            onSimulateScanInKiosk={handleJumpToKioskWithToken}
          />
        )}

        {activeModule === "tablet_kiosk" && (
          <TabletKioskView
            db={db}
            onScanQR={handleKioskQRScan}
            externalTriggeredToken={externalKioskToken}
            onClearExternalToken={() => setExternalKioskToken(null)}
          />
        )}

        {activeModule === "admin_crm" && (
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
              setActiveModule("whatsapp_ai");
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
      </main>

      {/* Subtle Footer with Workflow Summary */}
      <footer className="border-t border-stone-200/80 bg-[#FAF7F2] py-4 px-6 mt-12">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs text-stone-500">
          <div className="flex items-center gap-2">
            <QrCode className="h-4 w-4 text-amber-700" />
            <span>
              <strong>Flujo Cero-Frontdesk:</strong> 1) La alumna elige máquina
              Reformer o tapete Hot Pilates (Web o Chat IA) → 2) Recibe QR en
              WhatsApp → 3) Escanea su QR en la Tablet al llegar.
            </span>
          </div>
          <span>Stiliza Devotion · Studio OS v1.0</span>
        </div>
      </footer>
    </div>
  );
}
