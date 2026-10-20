"use client";

import React, { useState } from "react";
import { CRMDatabaseState } from "@/types/crm";
import { StudioSpotMap } from "@/components/StudioSpotMap";
import {
  BarChart3,
  Bot,
  CalendarPlus,
  CheckCircle2,
  CreditCard,
  Flame,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";

interface AdminCRMDashboardProps {
  db: CRMDatabaseState;
  onCreateClient: (data: {
    name: string;
    phone: string;
    email: string;
    packageId: string;
    preferredSpot: string;
    medicalNotes: string;
  }) => Promise<void>;
  onCreateSession: (data: {
    title: string;
    roomId: string;
    instructor: string;
    date: string;
    startTime: string;
  }) => Promise<void>;
  onRechargeClient: (clientId: string, packageId: string) => Promise<void>;
  onToggleMaintenance: (roomId: string, spotId: string) => Promise<void>;
  onCancelBooking: (bookingId: string) => Promise<void>;
  onScanInKiosk: (qrToken: string) => void;
  onOpenClientChat: (clientId: string) => void;
  onResetDemo: () => Promise<void>;
}

export function AdminCRMDashboard({
  db,
  onCreateClient,
  onCreateSession,
  onRechargeClient,
  onToggleMaintenance,
  onCancelBooking,
  onScanInKiosk,
  onOpenClientChat,
  onResetDemo,
}: AdminCRMDashboardProps) {
  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    db.sessions[2]?.id || db.sessions[0]?.id || ""
  );
  const [clientSearch, setClientSearch] = useState("");
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [showNewSessionForm, setShowNewSessionForm] = useState(false);

  // New Client state
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("+52 55 ");
  const [newEmail, setNewEmail] = useState("");
  const [newPackageId, setNewPackageId] = useState(
    db.packages[1]?.id || "pkg-devotion-8"
  );
  const [newPreferredSpot, setNewPreferredSpot] = useState("R-04");
  const [newMedicalNotes, setNewMedicalNotes] = useState("");

  // New Session state
  const [sesTitle, setSesTitle] = useState("Sculpt & Core Reformer");
  const [sesRoomId, setSesRoomId] = useState(
    db.rooms[0]?.id || "room-reformer-a"
  );
  const [sesInstructor, setSesInstructor] = useState("Coach Daniela R.");
  const [sesDate, setSesDate] = useState("2026-10-19");
  const [sesTime, setSesTime] = useState("20:30");

  const activeBookings = db.bookings.filter((b) => b.status !== "cancelada");
  const checkedInCount = activeBookings.filter(
    (b) => b.status === "asistio"
  ).length;
  const botBookingsCount = activeBookings.filter(
    (b) => b.bookedVia === "whatsapp_bot"
  ).length;

  const activeSession =
    db.sessions.find((s) => s.id === selectedSessionId) || db.sessions[0];
  const activeRoom =
    db.rooms.find((r) => r.id === activeSession?.roomId) || db.rooms[0];

  const filteredClients = db.clients.filter(
    (c) =>
      c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.phone.includes(clientSearch) ||
      c.email.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await onCreateClient({
      name: newName,
      phone: newPhone,
      email: newEmail,
      packageId: newPackageId,
      preferredSpot: newPreferredSpot,
      medicalNotes: newMedicalNotes,
    });
    setNewName("");
    setNewPhone("+52 55 ");
    setNewEmail("");
    setNewMedicalNotes("");
    setShowNewClientForm(false);
  };

  const handleAddSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sesTitle.trim()) return;
    await onCreateSession({
      title: sesTitle,
      roomId: sesRoomId,
      instructor: sesInstructor,
      date: sesDate,
      startTime: sesTime,
    });
    setShowNewSessionForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-3xl bg-white border border-stone-200/90 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
              Reservas & Pases QR
            </span>
            <QrCode className="h-5 w-5 text-amber-700" />
          </div>
          <p className="text-3xl font-extrabold text-stone-900 mt-2">
            {activeBookings.length}
          </p>
          <p className="text-xs text-stone-500 mt-1">
            100% con código QR enviado vía WhatsApp
          </p>
        </div>

        <div className="rounded-3xl bg-white border border-stone-200/90 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
              Check-In en Tablet Kiosco
            </span>
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="text-3xl font-extrabold text-emerald-700 mt-2">
            {checkedInCount}{" "}
            <span className="text-sm font-medium text-stone-400">
              / {activeBookings.length}
            </span>
          </p>
          <p className="text-xs text-stone-500 mt-1">
            Recepción autónoma sin personal de Frontdesk
          </p>
        </div>

        <div className="rounded-3xl bg-white border border-stone-200/90 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
              Agendadas por Bot IA
            </span>
            <Bot className="h-5 w-5 text-emerald-700" />
          </div>
          <p className="text-3xl font-extrabold text-stone-900 mt-2">
            {botBookingsCount}
          </p>
          <p className="text-xs text-stone-500 mt-1">
            Atendidas automáticamente en WhatsApp
          </p>
        </div>

        <div className="rounded-3xl bg-white border border-stone-200/90 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
              Alumnas Activas CRM
            </span>
            <Users className="h-5 w-5 text-stone-700" />
          </div>
          <p className="text-3xl font-extrabold text-stone-900 mt-2">
            {db.clients.length}
          </p>
          <p className="text-xs text-stone-500 mt-1">
            {db.clients.reduce((acc, c) => acc + c.creditsRemaining, 0)} clases
            pre-pagadas vigentes
          </p>
        </div>
      </div>

      {/* Action Buttons Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FAF7F2] border border-stone-200 rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setShowNewClientForm((prev) => !prev);
              setShowNewSessionForm(false);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-200 font-bold text-xs px-4 py-2.5 transition"
          >
            <UserPlus className="h-4 w-4" />
            + Nueva Alumna en CRM
          </button>

          <button
            type="button"
            onClick={() => {
              setShowNewSessionForm((prev) => !prev);
              setShowNewClientForm(false);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 font-bold text-xs px-4 py-2.5 transition"
          >
            <CalendarPlus className="h-4 w-4 text-amber-700" />
            + Programar Clase Reformer / Hot Pilates
          </button>
        </div>

        <button
          type="button"
          onClick={onResetDemo}
          className="inline-flex items-center gap-1.5 rounded-xl bg-stone-200/70 hover:bg-stone-200 text-stone-600 text-xs font-medium px-3 py-2 transition"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Restaurar Datos Demo
        </button>
      </div>

      {/* New Client Modal / Drawer */}
      {showNewClientForm && (
        <form
          onSubmit={handleAddClient}
          className="rounded-3xl bg-white border border-stone-300 p-6 shadow-md space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-stone-900">
              Registrar Nueva Alumna + Activar WhatsApp Concierge
            </h3>
            <button
              type="button"
              onClick={() => setShowNewClientForm(false)}
              className="text-xs text-stone-500"
            >
              Cancelar ✕
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Nombre Completo
              </label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ej. Paulina Villarreal"
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                WhatsApp (Para envío de QR)
              </label>
              <input
                type="text"
                required
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="+52 55 1234 5678"
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="paulina@email.com"
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Paquete Inicial
              </label>
              <select
                value={newPackageId}
                onChange={(e) => setNewPackageId(e.target.value)}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs"
              >
                {db.packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.credits} créditos - ${p.priceMXN})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Máquina / Tapete Favorito
              </label>
              <input
                type="text"
                value={newPreferredSpot}
                onChange={(e) => setNewPreferredSpot(e.target.value)}
                placeholder="R-04 o M-06"
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Notas Médicas / Lesiones
              </label>
              <input
                type="text"
                value={newMedicalNotes}
                onChange={(e) => setNewMedicalNotes(e.target.value)}
                placeholder="Ej. Cuidado rodilla izquierda"
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs"
              />
            </div>
          </div>
          <button
            type="submit"
            className="rounded-xl bg-stone-900 text-amber-200 font-bold text-xs px-5 py-2.5"
          >
            Guardar Alumna y Enviar Bienvenida WhatsApp
          </button>
        </form>
      )}

      {/* New Session Modal / Drawer */}
      {showNewSessionForm && (
        <form
          onSubmit={handleAddSession}
          className="rounded-3xl bg-white border border-stone-300 p-6 shadow-md space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-stone-900">
              Programar Nueva Clase en el Estudio
            </h3>
            <button
              type="button"
              onClick={() => setShowNewSessionForm(false)}
              className="text-xs text-stone-500"
            >
              Cancelar ✕
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Nombre de la Clase
              </label>
              <input
                type="text"
                required
                value={sesTitle}
                onChange={(e) => setSesTitle(e.target.value)}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Salón / Disciplina
              </label>
              <select
                value={sesRoomId}
                onChange={(e) => setSesRoomId(e.target.value)}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs"
              >
                {db.rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.spots.length} lugares)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Coach / Instructora
              </label>
              <input
                type="text"
                value={sesInstructor}
                onChange={(e) => setSesInstructor(e.target.value)}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Hora (HH:MM)
              </label>
              <input
                type="text"
                value={sesTime}
                onChange={(e) => setSesTime(e.target.value)}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs"
              />
            </div>
          </div>
          <button
            type="submit"
            className="rounded-xl bg-stone-900 text-amber-200 font-bold text-xs px-5 py-2.5"
          >
            Publicar Clase en Calendario y Bot IA
          </button>
        </form>
      )}

      {/* Live Room Map & Session Roster */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-amber-700" />
              Ocupación de Máquinas y Tapetes en Vivo (Vista Admin)
            </h3>
            <select
              value={activeSession?.id}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="rounded-xl bg-white border border-stone-300 px-3 py-1.5 text-xs font-bold text-stone-900"
            >
              {db.sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.date === "2026-10-19" ? "Hoy" : "Mañana"} {s.startTime} —{" "}
                  {s.title}
                </option>
              ))}
            </select>
          </div>

          {activeSession && activeRoom && (
            <StudioSpotMap
              room={activeRoom}
              session={activeSession}
              bookings={db.bookings}
              selectedSpotId={null}
              onSelectSpot={() => {}}
              isAdminView
              onToggleMaintenance={onToggleMaintenance}
            />
          )}
        </div>

        {/* Right 5 Cols: Active Bookings & QR Check-in Roster */}
        <div className="lg:col-span-5 rounded-3xl bg-white border border-stone-200/90 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <h3 className="font-bold text-base text-stone-900">
                Bitácora de Reservas & Códigos QR
              </h3>
              <p className="text-xs text-stone-500">
                Control de pases emitidos y lectura en Tablet Kiosco
              </p>
            </div>
            <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-700">
              {activeBookings.length} activas
            </span>
          </div>

          <div className="space-y-3 max-h-[430px] overflow-y-auto pr-1">
            {activeBookings.map((bk) => {
              const isCheckedIn = bk.status === "asistio";
              const isHot = bk.discipline === "hot_pilates";

              return (
                <div
                  key={bk.id}
                  className="rounded-2xl border border-stone-200 p-3.5 hover:border-stone-300 transition flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                          isHot
                            ? "bg-orange-100 text-orange-900"
                            : "bg-stone-900 text-amber-200"
                        }`}
                      >
                        {bk.spotId}
                      </span>
                      <p className="font-bold text-xs text-stone-900 truncate">
                        {bk.clientName}
                      </p>
                      <span className="text-[10px] text-stone-400">
                        ({bk.bookedVia === "whatsapp_bot" ? "🤖 Bot IA" : "🌐 Web"})
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 mt-1 truncate">
                      {bk.sessionTitle} · <strong>{bk.startTime} hrs</strong>
                    </p>
                    <p className="text-[10px] font-mono text-stone-400 mt-0.5">
                      QR: {bk.qrToken}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isCheckedIn ? (
                      <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-100 text-emerald-800 px-2.5 py-1.5 text-[11px] font-bold">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        Asistió
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => onScanInKiosk(bk.qrToken)}
                          title="Simular escaneo QR en Tablet"
                          className="rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[11px] px-2.5 py-1.5 transition"
                        >
                          Check-in QR
                        </button>
                        <button
                          type="button"
                          onClick={() => onCancelBooking(bk.id)}
                          title="Cancelar y reembolsar crédito"
                          className="rounded-xl bg-stone-100 hover:bg-rose-100 text-stone-500 hover:text-rose-700 p-1.5 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Clients CRM Directory Table */}
      <div className="rounded-3xl bg-white border border-stone-200/90 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h3 className="text-lg font-bold text-stone-900">
              Directorio CRM de Alumnas & Control de Membresías
            </h3>
            <p className="text-xs text-stone-500">
              Administra créditos, lugar favorito, notas médicas y conversación
              directa en WhatsApp
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="h-4 w-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              placeholder="Buscar alumna o WhatsApp..."
              className="w-full rounded-xl bg-[#FAF7F2] border border-stone-300 pl-9 pr-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-stone-700"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-stone-200 text-[11px] uppercase tracking-wider text-stone-400">
                <th className="py-3 px-3">Alumna</th>
                <th className="py-3 px-3">WhatsApp</th>
                <th className="py-3 px-3">Paquete Activo</th>
                <th className="py-3 px-3">Créditos</th>
                <th className="py-3 px-3">Lugar Fav / Notas</th>
                <th className="py-3 px-3 text-right">Acciones Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-xs">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-[#FAF7F2]/60">
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-stone-900 text-amber-200 font-bold text-xs flex items-center justify-center">
                        {client.avatarInitials}
                      </div>
                      <div>
                        <p className="font-bold text-stone-900">
                          {client.name}
                        </p>
                        <p className="text-[11px] text-stone-400">
                          {client.totalAttended} clases asistidas
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 font-mono text-stone-700">
                    {client.phone}
                  </td>
                  <td className="py-3.5 px-3">
                    <p className="font-semibold text-stone-800">
                      {client.activePackageName}
                    </p>
                    <p className="text-[10px] text-stone-400">
                      Vence: {client.packageExpiresAt}
                    </p>
                  </td>
                  <td className="py-3.5 px-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        client.creditsRemaining > 2
                          ? "bg-emerald-100 text-emerald-800"
                          : client.creditsRemaining > 0
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {client.creditsRemaining} / {client.creditsTotal}
                    </span>
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="font-mono font-bold text-amber-800 bg-amber-100/70 px-1.5 py-0.5 rounded">
                      {client.preferredSpot || "—"}
                    </span>
                    {client.medicalNotes && (
                      <p className="text-[11px] text-stone-500 mt-0.5 max-w-xs truncate">
                        {client.medicalNotes}
                      </p>
                    )}
                  </td>
                  <td className="py-3.5 px-3 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() =>
                        onRechargeClient(client.id, "pkg-devotion-8")
                      }
                      className="inline-flex items-center gap-1 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold px-2.5 py-1.5 transition"
                    >
                      <Plus className="h-3 w-3" /> 8 Créd.
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenClientChat(client.id)}
                      className="inline-flex items-center gap-1 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-semibold px-2.5 py-1.5 transition"
                    >
                      Chat WhatsApp IA
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
