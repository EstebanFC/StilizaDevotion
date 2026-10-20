"use client";

import React, { useState } from "react";
import { ClassSession, CRMDatabaseState, StudioBrand } from "@/types/crm";
import { StudioSpotMap } from "@/components/StudioSpotMap";
import {
  AlertTriangle,
  Award,
  BarChart3,
  Bot,
  Building2,
  CalendarPlus,
  CheckCircle2,
  Crown,
  Edit3,
  Flame,
  Ghost,
  PartyPopper,
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
    homeBranchName?: string;
  }) => Promise<void>;
  onCreateSession: (data: {
    title: string;
    roomId: string;
    instructor: string;
    date: string;
    startTime: string;
    isSpecialClass?: boolean;
    specialBadge?: string;
  }) => Promise<void>;
  onUpdateSession: (data: {
    sessionId: string;
    title: string;
    instructor: string;
    startTime: string;
    date: string;
    roomId: string;
    isSpecialClass?: boolean;
    specialBadge?: string;
  }) => Promise<void>;
  onDeleteSession: (sessionId: string) => Promise<void>;
  onCreatePromoEvent: (data: {
    title: string;
    description: string;
    type: "evento" | "promo" | "clase_especial";
    dateLabel: string;
    highlightBadge: string;
    priceText: string;
    branchId: string;
  }) => Promise<void>;
  onDeletePromoEvent: (eventId: string) => Promise<void>;
  onCreateCoach: (data: {
    name: string;
    specialty: string;
    vibeBadge: string;
  }) => Promise<void>;
  onCreateBranch: (data: {
    brand: StudioBrand;
    name: string;
    address: string;
    kiosksCount: number;
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
  onUpdateSession,
  onDeleteSession,
  onCreatePromoEvent,
  onDeletePromoEvent,
  onCreateCoach,
  onCreateBranch,
  onRechargeClient,
  onToggleMaintenance,
  onCancelBooking,
  onScanInKiosk,
  onOpenClientChat,
  onResetDemo,
}: AdminCRMDashboardProps) {
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    db.sessions[2]?.id || db.sessions[0]?.id || ""
  );
  const [clientSearch, setClientSearch] = useState("");

  // Drawers
  const [activeDrawer, setActiveDrawer] = useState<
    | null
    | "new_client"
    | "new_session"
    | "new_promo"
    | "new_coach"
    | "new_branch"
  >(null);

  // Edit Session Inline Modal State
  const [editingSession, setEditingSession] = useState<ClassSession | null>(
    null
  );

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
  const [sesIsSpecial, setSesIsSpecial] = useState(false);
  const [sesBadge, setSesBadge] = useState("🎧 DJ Live Set");

  // New Promo/Event state
  const [evTitle, setEvTitle] = useState("");
  const [evDesc, setEvDesc] = useState("");
  const [evDate, setEvDate] = useState("Sábado 11:00 hrs");
  const [evBadge, setEvBadge] = useState("🔥 Evento Especial");
  const [evPrice, setEvPrice] = useState("1 Token");
  const [evBranchId, setEvBranchId] = useState("all");

  // New Coach state
  const [coachName, setCoachName] = useState("");
  const [coachSpecialty, setCoachSpecialty] = useState("reformer");
  const [coachVibe, setCoachVibe] = useState("✨ Reina del Pulso & Core");

  // New Branch state
  const [brBrand, setBrBrand] = useState<StudioBrand>("Stiliza");
  const [brName, setBrName] = useState("");
  const [brAddress, setBrAddress] = useState("");
  const [brKiosks, setBrKiosks] = useState(2);

  const filteredSessions = db.sessions.filter((s) =>
    branchFilter === "all" ? true : s.branchId === branchFilter
  );

  const activeBookings = db.bookings.filter(
    (b) =>
      b.status !== "cancelada" &&
      (branchFilter === "all" ? true : b.branchId === branchFilter)
  );
  const checkedInCount = activeBookings.filter(
    (b) => b.status === "asistio"
  ).length;
  const botBookingsCount = activeBookings.filter(
    (b) => b.bookedVia === "whatsapp_bot"
  ).length;

  const activeSession =
    filteredSessions.find((s) => s.id === selectedSessionId) ||
    filteredSessions[0] ||
    db.sessions[0];
  const activeRoom =
    db.rooms.find((r) => r.id === activeSession?.roomId) || db.rooms[0];

  const filteredClients = db.clients.filter(
    (c) =>
      c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.phone.includes(clientSearch) ||
      c.email.toLowerCase().includes(clientSearch.toLowerCase())
  );

  // Fun / Smart Admin Insights computations
  const lowTokenClients = db.clients.filter((c) => c.creditsRemaining <= 2);
  const vipClient = [...db.clients].sort(
    (a, b) => b.totalAttended - a.totalAttended
  )[0];
  const ghostClient = [...db.clients].sort(
    (a, b) => (b.noShowsCount || 0) - (a.noShowsCount || 0)
  )[0];

  return (
    <div className="space-y-6">
      {/* =====================================================================
          1. LISTA DE SUCURSALES (STILIZA & DEVOTION) + OCUPACIÓN POR SUCURSAL
         ===================================================================== */}
      <div className="rounded-3xl bg-white border border-stone-200/90 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-stone-900 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-amber-700" />
              Control Multi-Sucursal · Estudios Stiliza & Devotion (
              {db.branches.length})
            </h2>
            <p className="text-xs text-stone-500">
              Haz clic en cualquier sucursal para filtrar sus clases, reservas,
              disponibilidad de máquinas/tapetes y kioscos activos
            </p>
          </div>

          <div className="flex items-center gap-2">
            {branchFilter !== "all" && (
              <button
                type="button"
                onClick={() => setBranchFilter("all")}
                className="rounded-xl bg-stone-900 text-amber-200 text-xs font-bold px-3.5 py-2"
              >
                Ver Todas las Sucursales
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                setActiveDrawer(
                  activeDrawer === "new_branch" ? null : "new_branch"
                )
              }
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#FAF7F2] hover:bg-stone-100 border border-stone-300 text-stone-800 text-xs font-bold px-3.5 py-2 transition"
            >
              <Plus className="h-3.5 w-3.5" /> + Nueva Sucursal
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {db.branches.map((br) => {
            const isSelected = branchFilter === br.id;
            const brSessions = db.sessions.filter((s) => s.branchId === br.id);
            const brBookings = db.bookings.filter(
              (b) => b.branchId === br.id && b.status !== "cancelada"
            );
            const brRooms = db.rooms.filter((r) => r.branchId === br.id);
            const totalSpotsPerClass = brRooms.reduce(
              (acc, r) => acc + r.spots.length,
              0
            );
            const totalCapacity =
              Math.max(1, brSessions.length) * (totalSpotsPerClass || 12);

            return (
              <button
                key={br.id}
                type="button"
                onClick={() =>
                  setBranchFilter(branchFilter === br.id ? "all" : br.id)
                }
                className={`rounded-2xl p-4 text-left border transition-all ${
                  isSelected
                    ? "bg-stone-900 text-white border-amber-400 shadow-lg scale-[1.01]"
                    : "bg-[#FAF7F2] hover:bg-stone-100/80 text-stone-800 border-stone-200"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                      br.brand === "Devotion"
                        ? "bg-orange-500/20 text-orange-700 border border-orange-400/30"
                        : "bg-amber-500/20 text-amber-800 border border-amber-400/30"
                    } ${isSelected ? "!text-amber-200 !bg-white/15" : ""}`}
                  >
                    {br.brand === "Devotion" ? (
                      <Flame className="h-3 w-3" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    {br.brand}
                  </span>
                  <span
                    className={`text-[11px] font-semibold ${
                      isSelected ? "text-amber-300" : "text-stone-500"
                    }`}
                  >
                    {br.kiosksCount} Kioscos
                  </span>
                </div>

                <h3 className="font-extrabold text-sm mt-2">{br.name}</h3>
                <p
                  className={`text-[11px] truncate ${
                    isSelected ? "text-stone-300" : "text-stone-500"
                  }`}
                >
                  {br.address}
                </p>

                <div className="mt-3 pt-2.5 border-t border-current/10 flex items-center justify-between text-xs">
                  <span>
                    <strong>{brBookings.length}</strong> reservaron
                  </span>
                  <span
                    className={`font-bold ${
                      isSelected ? "text-emerald-300" : "text-emerald-700"
                    }`}
                  >
                    {Math.max(0, totalCapacity - brBookings.length)} disp.
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          2. "COSAS CHUSCAS" / RADAR DE INTELIGENCIA PARA ADMINISTRADORES
         ===================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: La Máquina / Tapete Más Peleado */}
        <div className="rounded-3xl bg-gradient-to-br from-[#231D19] to-[#15110E] text-white p-5 shadow-md border border-stone-800">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300">
              🔥 El Lugar Más Peleado
            </span>
            <Crown className="h-5 w-5 text-amber-400" />
          </div>
          <p className="text-xl font-extrabold text-white mt-2">
            Reformer R-03 & Mat M-06
          </p>
          <p className="text-xs text-stone-300 mt-1">
            Se agotan en promedio <strong>4 horas antes</strong> de cada clase.
            En cambio, <strong>R-12</strong> (esquina posterior) es la&nbsp;
            &quot;máquina tímida&quot;.
          </p>
        </div>

        {/* Card 2: Alumna VIP vs El Fantasma de las Cancelaciones */}
        <div className="rounded-3xl bg-white border border-stone-200/90 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
              👻 Radar: Reina VIP vs Fantasma
            </span>
            <Ghost className="h-5 w-5 text-stone-600" />
          </div>
          <p className="text-xs text-stone-800 mt-2">
            👑 <strong>Obsesión Total:</strong> {vipClient?.name} (
            <strong>{vipClient?.totalAttended} clases</strong> sin fallar).
          </p>
          <p className="text-xs text-rose-700 mt-1.5">
            👻 <strong>Alerta Fantasma:</strong> {ghostClient?.name} acumula{" "}
            <strong>{ghostClient?.noShowsCount || 3} no-shows</strong> y suele
            llegar 5 min tarde.
          </p>
        </div>

        {/* Card 3: Alerta Hambre de Tokens (Upsell) */}
        <div className="rounded-3xl bg-white border border-stone-200/90 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700">
              🚨 Alerta: Se quedan sin Tokens
            </span>
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <p className="text-2xl font-extrabold text-stone-900 mt-1">
            {lowTokenClients.length} alumnas
          </p>
          <p className="text-xs text-stone-500 mt-1">
            {lowTokenClients.map((c) => c.name.split(" ")[0]).join(", ")}{" "}
            tienen <strong>≤ 2 tokens</strong>. ¡Momento ideal para mandarles
            promo por WhatsApp!
          </p>
        </div>

        {/* Card 4: Ranking Coaches Estrella */}
        <div className="rounded-3xl bg-white border border-stone-200/90 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
              🌟 Top Coaches (Lleno Total)
            </span>
            <Award className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="mt-2 space-y-1.5">
            {db.coaches.slice(0, 3).map((co, idx) => (
              <div
                key={co.id}
                className="flex items-center justify-between text-xs"
              >
                <span className="font-bold text-stone-800 truncate">
                  {idx + 1}. {co.name}
                </span>
                <span className="rounded-full bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 text-[10px]">
                  {co.occupancyRate}% lleno
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* =====================================================================
          3. BARRA DE ACCIONES ADMINISTRATIVAS (AGREGAR CLASES, EVENTOS, COACHES)
         ===================================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FAF7F2] border border-stone-200 rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setActiveDrawer(
                activeDrawer === "new_session" ? null : "new_session"
              )
            }
            className="inline-flex items-center gap-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-200 font-bold text-xs px-4 py-2.5 transition"
          >
            <CalendarPlus className="h-4 w-4" />
            + Agregar Clase / Clase Especial
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveDrawer(activeDrawer === "new_promo" ? null : "new_promo")
            }
            className="inline-flex items-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs px-4 py-2.5 transition"
          >
            <PartyPopper className="h-4 w-4" />
            + Publicar Evento / Promo en Kioscos
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveDrawer(activeDrawer === "new_coach" ? null : "new_coach")
            }
            className="inline-flex items-center gap-2 rounded-xl bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 font-bold text-xs px-4 py-2.5 transition"
          >
            <Award className="h-4 w-4 text-emerald-700" />
            + Alta de Coach
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveDrawer(
                activeDrawer === "new_client" ? null : "new_client"
              )
            }
            className="inline-flex items-center gap-2 rounded-xl bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 font-bold text-xs px-4 py-2.5 transition"
          >
            <UserPlus className="h-4 w-4 text-amber-700" />
            + Nueva Alumna
          </button>
        </div>

        <button
          type="button"
          onClick={onResetDemo}
          className="inline-flex items-center gap-1.5 rounded-xl bg-stone-200/70 hover:bg-stone-200 text-stone-600 text-xs font-medium px-3 py-2 transition"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Restaurar Demo
        </button>
      </div>

      {/* DRAWER: Nueva Sucursal */}
      {activeDrawer === "new_branch" && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!brName.trim()) return;
            await onCreateBranch({
              brand: brBrand,
              name: brName,
              address: brAddress,
              kiosksCount: brKiosks,
            });
            setBrName("");
            setBrAddress("");
            setActiveDrawer(null);
          }}
          className="rounded-3xl bg-white border border-stone-300 p-6 shadow-md space-y-4"
        >
          <h3 className="text-base font-bold text-stone-900">
            Dar de Alta Nueva Sucursal (Stiliza o Devotion)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <select
              value={brBrand}
              onChange={(e) => setBrBrand(e.target.value as StudioBrand)}
              className="rounded-xl border border-stone-300 px-3 py-2 text-xs font-bold"
            >
              <option value="Stiliza">Marca: Stiliza Reformer</option>
              <option value="Devotion">Marca: Devotion Hot Pilates</option>
            </select>
            <input
              type="text"
              required
              value={brName}
              onChange={(e) => setBrName(e.target.value)}
              placeholder="Nombre (ej. Stiliza Pedregal)"
              className="rounded-xl border border-stone-300 px-3 py-2 text-xs"
            />
            <input
              type="text"
              required
              value={brAddress}
              onChange={(e) => setBrAddress(e.target.value)}
              placeholder="Dirección de la sucursal"
              className="rounded-xl border border-stone-300 px-3 py-2 text-xs"
            />
            <input
              type="number"
              min={1}
              value={brKiosks}
              onChange={(e) => setBrKiosks(Number(e.target.value) || 1)}
              placeholder="Nº de Kioscos"
              className="rounded-xl border border-stone-300 px-3 py-2 text-xs"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-stone-900 text-amber-200 font-bold text-xs px-5 py-2.5"
          >
            Guardar Sucursal
          </button>
        </form>
      )}

      {/* DRAWER: Nueva Clase / Clase Especial */}
      {activeDrawer === "new_session" && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!sesTitle.trim()) return;
            await onCreateSession({
              title: sesTitle,
              roomId: sesRoomId,
              instructor: sesInstructor,
              date: sesDate,
              startTime: sesTime,
              isSpecialClass: sesIsSpecial,
              specialBadge: sesIsSpecial ? sesBadge : undefined,
            });
            setActiveDrawer(null);
          }}
          className="rounded-3xl bg-white border border-stone-300 p-6 shadow-md space-y-4"
        >
          <h3 className="text-base font-bold text-stone-900">
            Programar Nueva Clase o Clase Especial en Sucursal
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <input
              type="text"
              required
              value={sesTitle}
              onChange={(e) => setSesTitle(e.target.value)}
              placeholder="Nombre de la clase"
              className="sm:col-span-2 rounded-xl border border-stone-300 px-3 py-2 text-xs"
            />
            <select
              value={sesRoomId}
              onChange={(e) => setSesRoomId(e.target.value)}
              className="rounded-xl border border-stone-300 px-3 py-2 text-xs"
            >
              {db.rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  [{r.brand}] {r.name}
                </option>
              ))}
            </select>
            <select
              value={sesInstructor}
              onChange={(e) => setSesInstructor(e.target.value)}
              className="rounded-xl border border-stone-300 px-3 py-2 text-xs"
            >
              {db.coaches.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={sesTime}
              onChange={(e) => setSesTime(e.target.value)}
              placeholder="Hora (ej. 20:00)"
              className="rounded-xl border border-stone-300 px-3 py-2 text-xs"
            />
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-stone-700">
              <input
                type="checkbox"
                checked={sesIsSpecial}
                onChange={(e) => setSesIsSpecial(e.target.checked)}
              />
              ¿Es Clase Especial?
            </label>
          </div>
          {sesIsSpecial && (
            <input
              type="text"
              value={sesBadge}
              onChange={(e) => setSesBadge(e.target.value)}
              placeholder="Etiqueta especial (ej. 🎧 DJ Live Set / 🕯️ Soundbath)"
              className="w-full sm:w-80 rounded-xl border border-amber-400 px-3 py-2 text-xs"
            />
          )}
          <div>
            <button
              type="submit"
              className="rounded-xl bg-stone-900 text-amber-200 font-bold text-xs px-5 py-2.5"
            >
              Publicar en Horarios y Kioscos
            </button>
          </div>
        </form>
      )}

      {/* DRAWER: Nuevo Evento / Promo para Kioscos */}
      {activeDrawer === "new_promo" && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!evTitle.trim()) return;
            await onCreatePromoEvent({
              title: evTitle,
              description: evDesc,
              type: "evento",
              dateLabel: evDate,
              highlightBadge: evBadge,
              priceText: evPrice,
              branchId: evBranchId,
            });
            setEvTitle("");
            setEvDesc("");
            setActiveDrawer(null);
          }}
          className="rounded-3xl bg-white border border-amber-300 p-6 shadow-md space-y-4"
        >
          <h3 className="text-base font-bold text-stone-900">
            Publicar Nuevo Evento Especial o Promo en las Tablets de Kiosco
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              required
              value={evTitle}
              onChange={(e) => setEvTitle(e.target.value)}
              placeholder="Título (ej. Masterclass Reformer & Brunch)"
              className="rounded-xl border border-stone-300 px-3 py-2 text-xs"
            />
            <input
              type="text"
              value={evDate}
              onChange={(e) => setEvDate(e.target.value)}
              placeholder="Fecha/Hora (ej. Domingo 11:00 hrs)"
              className="rounded-xl border border-stone-300 px-3 py-2 text-xs"
            />
            <select
              value={evBranchId}
              onChange={(e) => setEvBranchId(e.target.value)}
              className="rounded-xl border border-stone-300 px-3 py-2 text-xs"
            >
              <option value="all">Todas las sucursales Stiliza & Devotion</option>
              {db.branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={evBadge}
              onChange={(e) => setEvBadge(e.target.value)}
              placeholder="Badge (ej. 🥂 Brunch Incluido)"
              className="rounded-xl border border-stone-300 px-3 py-2 text-xs"
            />
            <input
              type="text"
              value={evPrice}
              onChange={(e) => setEvPrice(e.target.value)}
              placeholder="Costo (ej. 2 Tokens o $450 MXN)"
              className="rounded-xl border border-stone-300 px-3 py-2 text-xs"
            />
            <input
              type="text"
              value={evDesc}
              onChange={(e) => setEvDesc(e.target.value)}
              placeholder="Descripción breve para las alumnas..."
              className="rounded-xl border border-stone-300 px-3 py-2 text-xs"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-amber-400 text-stone-950 font-extrabold text-xs px-5 py-2.5"
          >
            Enviar Evento a Todos los Kioscos
          </button>
        </form>
      )}

      {/* DRAWER: Nueva Coach */}
      {activeDrawer === "new_coach" && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!coachName.trim()) return;
            await onCreateCoach({
              name: coachName,
              specialty: coachSpecialty,
              vibeBadge: coachVibe,
            });
            setCoachName("");
            setActiveDrawer(null);
          }}
          className="rounded-3xl bg-white border border-stone-300 p-6 shadow-md space-y-4"
        >
          <h3 className="text-base font-bold text-stone-900">
            Agregar Nueva Coach al Equipo Stiliza & Devotion
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              required
              value={coachName}
              onChange={(e) => setCoachName(e.target.value)}
              placeholder="Nombre (ej. Coach Mariana T.)"
              className="rounded-xl border border-stone-300 px-3 py-2 text-xs"
            />
            <select
              value={coachSpecialty}
              onChange={(e) => setCoachSpecialty(e.target.value)}
              className="rounded-xl border border-stone-300 px-3 py-2 text-xs"
            >
              <option value="reformer">Especialidad: Pilates Reformer</option>
              <option value="hot_pilates">Especialidad: Hot Pilates 38°C</option>
              <option value="ambas">Ambas Disciplinas</option>
            </select>
            <input
              type="text"
              value={coachVibe}
              onChange={(e) => setCoachVibe(e.target.value)}
              placeholder="Sello personal (ej. 🔥 Queen del Burn)"
              className="rounded-xl border border-stone-300 px-3 py-2 text-xs"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-stone-900 text-amber-200 font-bold text-xs px-5 py-2.5"
          >
            Guardar Coach
          </button>
        </form>
      )}

      {/* DRAWER: Nueva Alumna */}
      {activeDrawer === "new_client" && (
        <form
          onSubmit={async (e) => {
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
            setActiveDrawer(null);
          }}
          className="rounded-3xl bg-white border border-stone-300 p-6 shadow-md space-y-4"
        >
          <h3 className="text-base font-bold text-stone-900">
            Registrar Nueva Alumna + Paquete de Tokens
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nombre Completo"
              className="rounded-xl border border-stone-300 px-3 py-2 text-xs"
            />
            <input
              type="text"
              required
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="+52 55 ..."
              className="rounded-xl border border-stone-300 px-3 py-2 text-xs"
            />
            <select
              value={newPackageId}
              onChange={(e) => setNewPackageId(e.target.value)}
              className="rounded-xl border border-stone-300 px-3 py-2 text-xs"
            >
              {db.packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.credits} tokens)
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="rounded-xl bg-stone-900 text-amber-200 font-bold text-xs px-5 py-2.5"
          >
            Guardar Alumna
          </button>
        </form>
      )}

      {/* =====================================================================
          4. CONTROL DE HORARIOS, RESERVAS POR CLASE Y EDICIÓN EN VIVO
         ===================================================================== */}
      <div className="rounded-3xl bg-white border border-stone-200/90 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-extrabold text-stone-900">
              Horarios por Sucursal · Cuántas Personas Reservaron y Edición de
              Clases
            </h3>
            <p className="text-xs text-stone-500">
              Selecciona cualquier clase para ver su mapa de máquinas/tapetes
              abajo o haz clic en <strong>Modificar</strong> para cambiar hora,
              coach o salón
            </p>
          </div>
        </div>

        {editingSession && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await onUpdateSession({
                sessionId: editingSession.id,
                title: editingSession.title,
                instructor: editingSession.instructor,
                startTime: editingSession.startTime,
                date: editingSession.date,
                roomId: editingSession.roomId,
                isSpecialClass: editingSession.isSpecialClass,
                specialBadge: editingSession.specialBadge,
              });
              setEditingSession(null);
            }}
            className="rounded-2xl bg-[#FAF7F2] border-2 border-amber-400 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-stone-900">
                ✏️ Modificando Clase: {editingSession.title}
              </span>
              <button
                type="button"
                onClick={() => setEditingSession(null)}
                className="text-xs text-stone-500"
              >
                Cancelar ✕
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <input
                type="text"
                value={editingSession.title}
                onChange={(e) =>
                  setEditingSession({
                    ...editingSession,
                    title: e.target.value,
                  })
                }
                className="sm:col-span-2 rounded-xl border border-stone-300 px-3 py-2 text-xs font-bold"
              />
              <select
                value={editingSession.instructor}
                onChange={(e) =>
                  setEditingSession({
                    ...editingSession,
                    instructor: e.target.value,
                  })
                }
                className="rounded-xl border border-stone-300 px-3 py-2 text-xs"
              >
                {db.coaches.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={editingSession.startTime}
                onChange={(e) =>
                  setEditingSession({
                    ...editingSession,
                    startTime: e.target.value,
                  })
                }
                className="rounded-xl border border-stone-300 px-3 py-2 text-xs font-mono"
              />
              <select
                value={editingSession.roomId}
                onChange={(e) =>
                  setEditingSession({
                    ...editingSession,
                    roomId: e.target.value,
                  })
                }
                className="rounded-xl border border-stone-300 px-3 py-2 text-xs"
              >
                {db.rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="rounded-xl bg-stone-900 text-amber-200 font-bold text-xs px-4 py-2"
            >
              Guardar Cambios de Horario / Coach
            </button>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-stone-200 text-[11px] uppercase tracking-wider text-stone-400">
                <th className="py-2.5 px-3">Sucursal / Marca</th>
                <th className="py-2.5 px-3">Horario</th>
                <th className="py-2.5 px-3">Clase & Salón</th>
                <th className="py-2.5 px-3">Coach</th>
                <th className="py-2.5 px-3">Reservaron / Disponibilidad</th>
                <th className="py-2.5 px-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredSessions.map((ses) => {
                const room = db.rooms.find((r) => r.id === ses.roomId);
                const capacity = room?.spots.length || 12;
                const sesBookings = db.bookings.filter(
                  (b) => b.sessionId === ses.id && b.status !== "cancelada"
                );
                const sesCheckedIn = sesBookings.filter(
                  (b) => b.status === "asistio"
                ).length;
                const available = Math.max(0, capacity - sesBookings.length);
                const isSelected = activeSession?.id === ses.id;

                return (
                  <tr
                    key={ses.id}
                    onClick={() => setSelectedSessionId(ses.id)}
                    className={`cursor-pointer transition ${
                      isSelected ? "bg-amber-50/90" : "hover:bg-stone-50"
                    }`}
                  >
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          ses.brand === "Devotion"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-stone-900 text-amber-200"
                        }`}
                      >
                        {ses.brand}
                      </span>
                      <p className="font-semibold text-stone-800 mt-0.5">
                        {ses.branchName}
                      </p>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-stone-900">
                      {ses.startTime} hrs
                      <span className="block text-[10px] font-normal text-stone-400">
                        {ses.date === "2026-10-19" ? "Hoy" : "Mañana"}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-stone-900">
                          {ses.title}
                        </span>
                        {ses.isSpecialClass && (
                          <span className="rounded-full bg-amber-200 text-stone-900 text-[10px] font-bold px-2 py-0.5">
                            {ses.specialBadge || "Especial"}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-500">
                        {ses.roomName}
                      </p>
                    </td>
                    <td className="py-3 px-3 font-semibold text-stone-800">
                      {ses.instructor}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-stone-900 text-white font-bold px-2.5 py-0.5 text-[11px]">
                          {sesBookings.length} / {capacity} reservaron
                        </span>
                        <span className="text-emerald-700 font-bold">
                          ({available} libres)
                        </span>
                        {sesCheckedIn > 0 && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">
                            {sesCheckedIn} check-in
                          </span>
                        )}
                      </div>
                    </td>
                    <td
                      className="py-3 px-3 text-right space-x-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => setEditingSession(ses)}
                        className="inline-flex items-center gap-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold px-2.5 py-1.5"
                      >
                        <Edit3 className="h-3 w-3" /> Modificar
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteSession(ses.id)}
                        className="inline-flex items-center rounded-lg bg-stone-100 hover:bg-rose-100 text-stone-500 hover:text-rose-700 p-1.5"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* =====================================================================
          5. MAPA EN VIVO DE LA CLASE SELECCIONADA + BITÁCORA QR
         ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-amber-700" />
              Mapa de Máquinas / Tapetes en Vivo: {activeSession?.title} (
              {activeSession?.startTime} hrs)
            </h3>
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
                Reservas & Check-In QR ({activeBookings.length})
              </h3>
              <p className="text-xs text-stone-500">
                {checkedInCount} adentro · {botBookingsCount} agendadas por Bot
                IA
              </p>
            </div>
            <QrCode className="h-5 w-5 text-amber-700" />
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
                    </div>
                    <p className="text-xs text-stone-600 mt-1 truncate">
                      {bk.branchName} · {bk.sessionTitle} ({bk.startTime})
                    </p>
                    <p className="text-[10px] font-mono text-stone-400 mt-0.5">
                      {bk.checkedInKioskLabel
                        ? `✅ Escaneó en ${bk.checkedInKioskLabel}`
                        : `QR: ${bk.qrToken}`}
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
                          className="rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[11px] px-2.5 py-1.5 transition"
                        >
                          Check-in QR
                        </button>
                        <button
                          type="button"
                          onClick={() => onCancelBooking(bk.id)}
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

      {/* =====================================================================
          6. DIRECTORIO DE ALUMNAS Y CONTROL DE TOKENS
         ===================================================================== */}
      <div className="rounded-3xl bg-white border border-stone-200/90 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-stone-700" />
              Directorio CRM de Alumnas & Control de Tokens
            </h3>
            <p className="text-xs text-stone-500">
              Administra paquetes, lugar favorito, notas médicas y chat directo
              con el Bot de WhatsApp
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
                <th className="py-3 px-3">Sucursal Base / WhatsApp</th>
                <th className="py-3 px-3">Paquete Activo</th>
                <th className="py-3 px-3">Tokens</th>
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
                          {client.totalAttended} asistencias ·{" "}
                          {client.noShowsCount || 0} faltas
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-3">
                    <p className="font-semibold text-stone-800">
                      {client.homeBranchName || "Stiliza · Polanco"}
                    </p>
                    <p className="font-mono text-[11px] text-stone-500">
                      {client.phone}
                    </p>
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
                      {client.creditsRemaining} tokens
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
                      <Plus className="h-3 w-3" /> 8 Tokens
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenClientChat(client.id)}
                      className="inline-flex items-center gap-1 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-semibold px-2.5 py-1.5 transition"
                    >
                      <Bot className="h-3.5 w-3.5" /> Chat IA
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
