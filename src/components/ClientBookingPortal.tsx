"use client";

import React, { useState } from "react";
import { CRMDatabaseState, Discipline } from "@/types/crm";
import { StudioSpotMap } from "@/components/StudioSpotMap";
import { QRCodePassCard } from "@/components/QRCodePassCard";
import {
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Flame,
  MessageSquare,
  QrCode,
  Sparkles,
  User,
} from "lucide-react";

interface ClientBookingPortalProps {
  db: CRMDatabaseState;
  activeClientId: string;
  onChangeClient: (clientId: string) => void;
  onBookSpot: (params: {
    clientId: string;
    sessionId: string;
    spotId: string;
  }) => Promise<{ success: boolean; error?: string }>;
  onBuyPackage: (clientId: string, packageId: string) => Promise<void>;
  onOpenWhatsAppChat: () => void;
  onSimulateScanInKiosk: (qrToken: string) => void;
}

export function ClientBookingPortal({
  db,
  activeClientId,
  onChangeClient,
  onBookSpot,
  onBuyPackage,
  onOpenWhatsAppChat,
  onSimulateScanInKiosk,
}: ClientBookingPortalProps) {
  const [disciplineFilter, setDisciplineFilter] = useState<
    "all" | Discipline
  >("all");
  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    db.sessions[2]?.id || db.sessions[0]?.id || ""
  );
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [bookingFeedback, setBookingFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [showPackagesModal, setShowPackagesModal] = useState(false);

  const client =
    db.clients.find((c) => c.id === activeClientId) || db.clients[0];

  const filteredSessions = db.sessions.filter((s) =>
    disciplineFilter === "all" ? true : s.discipline === disciplineFilter
  );

  const activeSession =
    db.sessions.find((s) => s.id === selectedSessionId) ||
    filteredSessions[0] ||
    db.sessions[0];

  const activeRoom =
    db.rooms.find((r) => r.id === activeSession?.roomId) || db.rooms[0];

  const clientBookings = db.bookings.filter(
    (b) => b.clientId === client?.id && b.status !== "cancelada"
  );

  const handleConfirmBooking = async () => {
    if (!client || !activeSession || !selectedSpotId) return;
    setIsBooking(true);
    setBookingFeedback(null);
    try {
      const res = await onBookSpot({
        clientId: client.id,
        sessionId: activeSession.id,
        spotId: selectedSpotId,
      });
      if (res.success) {
        setBookingFeedback({
          type: "success",
          text: `¡Reserva confirmada en ${selectedSpotId}! Tu código QR ya fue enviado a tu WhatsApp (${client.phone}) y aparece abajo en Mis Pases QR.`,
        });
        setSelectedSpotId(null);
      } else {
        setBookingFeedback({
          type: "error",
          text: res.error || "No se pudo completar la reserva.",
        });
      }
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Client Profile Bar & Credits Wallet */}
      <div className="rounded-3xl bg-white border border-stone-200/90 p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-stone-900 text-amber-200 font-bold text-base flex items-center justify-center">
              {client?.avatarInitials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold">
                  Vista de Alumna:
                </span>
                <select
                  value={client?.id}
                  onChange={(e) => {
                    onChangeClient(e.target.value);
                    setSelectedSpotId(null);
                    setBookingFeedback(null);
                  }}
                  className="rounded-xl bg-[#FAF7F2] border border-stone-300 px-3 py-1 text-sm font-bold text-stone-900 focus:outline-none focus:border-stone-700"
                >
                  {db.clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.creditsRemaining} créditos)
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-stone-500 mt-1">
                WhatsApp para envío de QR:{" "}
                <strong className="text-stone-700">{client?.phone}</strong> ·
                Paquete: <strong>{client?.activePackageName}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Credits Counter & Quick Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-2xl bg-[#FAF7F2] border border-stone-200 px-4 py-2 text-right">
            <p className="text-[10px] uppercase tracking-wider text-stone-500">
              Clases Disponibles
            </p>
            <p className="text-lg font-extrabold text-stone-900">
              {client?.creditsRemaining}{" "}
              <span className="text-xs font-normal text-stone-500">
                / {client?.creditsTotal} créditos
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowPackagesModal((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-900 font-semibold text-xs px-4 py-3 transition"
          >
            <CreditCard className="h-4 w-4 text-amber-700" />
            Comprar Paquete
          </button>

          <button
            type="button"
            onClick={onOpenWhatsAppChat}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#1A2E26] hover:bg-[#233d32] text-emerald-100 font-semibold text-xs px-4 py-3 transition shadow-sm"
          >
            <MessageSquare className="h-4 w-4 text-emerald-300" />
            Agendar por Chat IA / WhatsApp
          </button>
        </div>
      </div>

      {/* Optional Buy Packages Drawer */}
      {showPackagesModal && (
        <div className="rounded-3xl bg-gradient-to-br from-[#231D19] to-[#171311] text-white p-6 shadow-xl border border-stone-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-amber-200">
                Paquetes & Membresías Stiliza Devotion
              </h3>
              <p className="text-xs text-stone-300">
                Válidos para Pilates Reformer y Hot Pilates 38°C en todas las
                sucursales
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPackagesModal(false)}
              className="text-xs text-stone-400 hover:text-white"
            >
              Cerrar ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {db.packages.map((pkg) => (
              <div
                key={pkg.id}
                className="rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col justify-between"
              >
                <div>
                  {pkg.badge && (
                    <span className="inline-block rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-bold px-2.5 py-0.5 mb-2">
                      {pkg.badge}
                    </span>
                  )}
                  <h4 className="font-bold text-sm text-white">{pkg.name}</h4>
                  <p className="text-2xl font-extrabold text-amber-200 mt-2">
                    ${pkg.priceMXN.toLocaleString("es-MX")}{" "}
                    <span className="text-xs font-normal text-stone-400">
                      MXN
                    </span>
                  </p>
                  <p className="text-xs text-stone-300 mt-1">
                    Incluye <strong>{pkg.credits} clases</strong> · Vigencia{" "}
                    {pkg.validityDays} días
                  </p>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    await onBuyPackage(client.id, pkg.id);
                    setShowPackagesModal(false);
                    setBookingFeedback({
                      type: "success",
                      text: `¡Paquete ${pkg.name} acreditado a ${client.name}!`,
                    });
                  }}
                  className="mt-4 w-full rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs py-2.5 transition"
                >
                  Activar +{pkg.credits} Créditos
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Split: Left Schedule & Spot Selection | Right Client's Active QR Passes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Cols: Class Selector + Interactive Studio Map */}
        <div className="lg:col-span-8 space-y-5">
          {/* Discipline Filter Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-2xl bg-stone-200/80 p-1">
              <button
                type="button"
                onClick={() => setDisciplineFilter("all")}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                  disciplineFilter === "all"
                    ? "bg-white text-stone-900 shadow-sm"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Todas las Clases
              </button>
              <button
                type="button"
                onClick={() => setDisciplineFilter("reformer")}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
                  disciplineFilter === "reformer"
                    ? "bg-stone-900 text-amber-200 shadow-sm"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" /> Pilates Reformer
              </button>
              <button
                type="button"
                onClick={() => setDisciplineFilter("hot_pilates")}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
                  disciplineFilter === "hot_pilates"
                    ? "bg-orange-700 text-white shadow-sm"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <Flame className="h-3.5 w-3.5" /> Hot Pilates 38°C
              </button>
            </div>

            <span className="text-xs text-stone-500 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Selecciona horario y elige tu
              máquina o tapete
            </span>
          </div>

          {/* Horizontal Class Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filteredSessions.map((ses) => {
              const isSelected = ses.id === activeSession?.id;
              const isHot = ses.discipline === "hot_pilates";
              const room = db.rooms.find((r) => r.id === ses.roomId);
              const bookedCount = db.bookings.filter(
                (b) => b.sessionId === ses.id && b.status !== "cancelada"
              ).length;
              const totalSpots = room?.spots.length || 12;

              return (
                <button
                  key={ses.id}
                  type="button"
                  onClick={() => {
                    setSelectedSessionId(ses.id);
                    setSelectedSpotId(null);
                    setBookingFeedback(null);
                  }}
                  className={`rounded-2xl p-4 text-left border transition-all ${
                    isSelected
                      ? isHot
                        ? "bg-gradient-to-br from-[#2B1914] to-[#1A100D] text-white border-orange-500 shadow-md"
                        : "bg-gradient-to-br from-[#231D19] to-[#14110F] text-white border-amber-400 shadow-md"
                      : "bg-white hover:bg-[#FAF7F2] text-stone-800 border-stone-200/90"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-extrabold px-2 py-0.5 rounded-lg ${
                        isSelected
                          ? "bg-white/15 text-amber-200"
                          : isHot
                          ? "bg-orange-100 text-orange-800"
                          : "bg-stone-100 text-stone-800"
                      }`}
                    >
                      <Clock className="h-3 w-3" /> {ses.startTime} hrs
                    </span>
                    <span
                      className={`text-[10px] font-semibold ${
                        isSelected ? "text-stone-300" : "text-stone-500"
                      }`}
                    >
                      {ses.date === "2026-10-19" ? "Hoy" : "Mañana"}
                    </span>
                  </div>

                  <h4 className="font-bold text-sm mt-2 line-clamp-1">
                    {ses.title}
                  </h4>
                  <p
                    className={`text-xs mt-0.5 ${
                      isSelected ? "text-stone-300" : "text-stone-500"
                    }`}
                  >
                    {ses.instructor} · {ses.durationMinutes} min
                  </p>

                  <div className="mt-3 pt-2 border-t border-current/10 flex items-center justify-between text-[11px]">
                    <span>{ses.roomName}</span>
                    <span className="font-semibold">
                      {totalSpots - bookedCount} libres
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Interactive 2D Studio Map */}
          {activeSession && activeRoom && (
            <StudioSpotMap
              room={activeRoom}
              session={activeSession}
              bookings={db.bookings}
              selectedSpotId={selectedSpotId}
              onSelectSpot={(spotId) => {
                setSelectedSpotId(spotId);
                setBookingFeedback(null);
              }}
              preferredSpotId={client?.preferredSpot}
            />
          )}

          {/* Confirmation Sticky Bar when a Machine / Mat is selected */}
          {selectedSpotId && activeSession && (
            <div className="rounded-2xl bg-stone-900 text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl border border-amber-400/40">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-amber-300 font-bold">
                  Confirmación de Lugar & Envío de QR por WhatsApp
                </span>
                <h4 className="text-base font-bold mt-0.5">
                  {activeSession.title} ({activeSession.startTime} hrs) — Lugar{" "}
                  <span className="text-amber-300">{selectedSpotId}</span>
                </h4>
                <p className="text-xs text-stone-300">
                  Se descontará 1 crédito a <strong>{client?.name}</strong> y se
                  enviará el código QR a <strong>{client?.phone}</strong>.
                </p>
              </div>

              <button
                type="button"
                disabled={isBooking}
                onClick={handleConfirmBooking}
                className="shrink-0 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-extrabold text-xs sm:text-sm px-6 py-3.5 transition shadow-md inline-flex items-center justify-center gap-2"
              >
                <QrCode className="h-4 w-4" />
                {isBooking
                  ? "Generando QR..."
                  : `Confirmar ${selectedSpotId} y Enviar QR`}
              </button>
            </div>
          )}

          {bookingFeedback && (
            <div
              className={`rounded-2xl p-4 border text-xs sm:text-sm font-medium flex items-center gap-3 ${
                bookingFeedback.type === "success"
                  ? "bg-emerald-50 border-emerald-300 text-emerald-950"
                  : "bg-rose-50 border-rose-300 text-rose-950"
              }`}
            >
              <CheckCircle2
                className={`h-5 w-5 shrink-0 ${
                  bookingFeedback.type === "success"
                    ? "text-emerald-600"
                    : "text-rose-600"
                }`}
              />
              <span>{bookingFeedback.text}</span>
            </div>
          )}
        </div>

        {/* Right 4 Cols: Client's Active QR Passes */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-3xl bg-white border border-stone-200/90 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-base text-stone-900 flex items-center gap-2">
                  <QrCode className="h-4 w-4 text-amber-700" />
                  Mis Pases QR ({clientBookings.length})
                </h3>
                <p className="text-xs text-stone-500">
                  Códigos enviados a tu WhatsApp para escanear en la tablet del
                  estudio
                </p>
              </div>
              <User className="h-4 w-4 text-stone-400" />
            </div>

            <div className="space-y-4">
              {clientBookings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-stone-200 p-6 text-center text-xs text-stone-500">
                  No tienes reservas activas. Elige una máquina Reformer o
                  tapete de Hot Pilates en el mapa para generar tu QR.
                </div>
              ) : (
                clientBookings.map((bk) => (
                  <QRCodePassCard
                    key={bk.id}
                    booking={bk}
                    compact
                    onSimulateScan={onSimulateScanInKiosk}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
