"use client";

import React, { useState, useEffect } from "react";
import {
  ClassSession,
  Client,
  CRMDatabaseState,
  DayOfWeek,
  ExternalAggregator,
  StudioBrand,
} from "@/types/crm";
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
  KeyRound,
  PartyPopper,
  Plus,
  QrCode,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  X,
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
  onUpdateClient: (data: {
    clientId: string;
    name: string;
    phone: string;
    email: string;
    homeBranchName: string;
    activePackageName: string;
    creditsRemaining: number;
    preferredSpot: string;
    medicalNotes: string;
  }) => Promise<void>;
  onDeleteClient: (clientId: string) => Promise<void>;
  onCreateSession: (data: {
    title: string;
    roomId: string;
    instructor: string;
    date: string;
    dayOfWeek?: DayOfWeek;
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
    dayOfWeek?: DayOfWeek;
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
  onUpdateBranchPin?: (
    branchId: string,
    pin: string
  ) => Promise<{ success: boolean; error?: string }>;
  onRechargeClient: (clientId: string, packageId: string) => Promise<void>;
  onToggleMaintenance: (roomId: string, spotId: string) => Promise<void>;
  onCancelBooking: (bookingId: string) => Promise<void>;
  onScanInKiosk: (qrToken: string) => void;
  onOpenClientChat: (clientId: string) => void;
  onResetDemo: () => Promise<void>;
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
}

export function AdminCRMDashboard({
  db,
  onCreateClient,
  onUpdateClient,
  onDeleteClient,
  onCreateSession,
  onUpdateSession,
  onDeleteSession,
  onCreatePromoEvent,
  onDeletePromoEvent,
  onCreateCoach,
  onCreateBranch,
  onUpdateBranchPin,
  onRechargeClient,
  onToggleMaintenance,
  onCancelBooking,
  onScanInKiosk,
  onOpenClientChat,
  onResetDemo,
  onSyncExternalBooking,
}: AdminCRMDashboardProps) {
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [dayFilter, setDayFilter] = useState<string>("Martes");
  const [blockFilter, setBlockFilter] = useState<"all" | "manana" | "tarde">("all");
  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    "ses-dezi-martes-1800"
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

  // Delete Session Confirmation Modal State
  const [sessionToDelete, setSessionToDelete] = useState<ClassSession | null>(
    null
  );
  const [isDeletingSession, setIsDeletingSession] = useState<boolean>(false);

  // Branch PIN edit state
  const [editingBranchPin, setEditingBranchPin] = useState<{
    branchId: string;
    branchName: string;
    currentPin: string;
  } | null>(null);
  const [newBranchPin, setNewBranchPin] = useState<string>("");
  const [isSavingPin, setIsSavingPin] = useState<boolean>(false);
  const [pinError, setPinError] = useState<string | null>(null);

  // Listener para cerrar modal de eliminación con tecla Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && sessionToDelete && !isDeletingSession) {
        setSessionToDelete(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sessionToDelete, isDeletingSession]);

  // Edit Client Inline Modal State (CRUD Alumnos)
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // New Client state
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("+52 ");
  const [newEmail, setNewEmail] = useState("");
  const [newPackageId, setNewPackageId] = useState(
    db.packages[1]?.id || "pkg-devotion-8"
  );
  const [newHomeBranch, setNewHomeBranch] = useState(
    db.branches[0]?.name || "Stiliza San Isidro"
  );
  const [newPreferredSpot, setNewPreferredSpot] = useState("3");
  const [newMedicalNotes, setNewMedicalNotes] = useState("");

  // New Session state
  const [sesTitle, setSesTitle] = useState("Sculpt & Core Reformer");
  const [sesRoomId, setSesRoomId] = useState(
    db.rooms[0]?.id || "room-reformer-a"
  );
  const [sesInstructor, setSesInstructor] = useState("Coach Daniela R.");
  const [sesDate, setSesDate] = useState("2026-10-20");
  const [sesDayOfWeek, setSesDayOfWeek] = useState<DayOfWeek>("Martes");
  const [sesTime, setSesTime] = useState("18:00");
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

  const filteredSessions = db.sessions.filter((s) => {
    if (branchFilter !== "all" && s.branchId !== branchFilter) return false;
    if (dayFilter !== "all" && (s.dayOfWeek || "Martes") !== dayFilter) return false;
    if (blockFilter !== "all") {
      const hourNum = parseInt(s.startTime.split(":")[0] || "18", 10);
      const computedBlock = s.timeBlock || (hourNum < 13 ? "manana" : "tarde");
      if (computedBlock !== blockFilter) return false;
    }
    return true;
  });

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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
              totalSpotsPerClass === 0
                ? 0
                : Math.max(1, brSessions.length) * totalSpotsPerClass;

            return (
              <button
                key={br.id}
                type="button"
                onClick={() =>
                  setBranchFilter(branchFilter === br.id ? "all" : br.id)
                }
                className={`rounded-2xl p-4 text-left border transition-all ${isSelected
                    ? "bg-stone-900 text-white border-amber-400 shadow-lg scale-[1.01]"
                    : "bg-[#FAF7F2] hover:bg-stone-100/80 text-stone-800 border-stone-200"
                  }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${br.brand === "Devotion"
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
                    {br.code && (
                      <span
                        className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] font-extrabold ${isSelected
                            ? "bg-amber-400 text-stone-950"
                            : "bg-stone-900 text-amber-200"
                          }`}
                      >
                        {br.code}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[11px] font-semibold ${isSelected ? "text-amber-300" : "text-stone-500"
                      }`}
                  >
                    {brSessions.length} clases/sem
                  </span>
                </div>

                <h3 className="font-extrabold text-sm mt-2">{br.name}</h3>
                <p
                  className={`text-[11px] truncate ${isSelected ? "text-stone-300" : "text-stone-500"
                    }`}
                >
                  {br.address}
                </p>

                <div className="mt-3 pt-2.5 border-t border-current/10 flex items-center justify-between text-xs">
                  <span>
                    <strong>{brBookings.length}</strong> reservaron
                  </span>
                  <span
                    className={`font-bold ${isSelected ? "text-emerald-300" : "text-emerald-700"
                      }`}
                  >
                    {Math.max(0, totalCapacity - brBookings.length)} disp.
                  </span>
                </div>

                {/* PIN Exclusivo del Kiosco de la Sucursal */}
                <div className="mt-2.5 pt-2 border-t border-current/10 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1 font-mono">
                    <KeyRound className="h-3 w-3 text-[#D2C483]" />
                    <span className="opacity-70 text-[10px]">PIN Kiosco:</span>
                    <span className="font-extrabold tracking-widest px-1.5 py-0.5 rounded bg-black/20 dark:bg-black/50 text-[#D2C483]">
                      {br.kioskPin || "123456"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingBranchPin({
                        branchId: br.id,
                        branchName: br.name,
                        currentPin: br.kioskPin || "123456",
                      });
                      setNewBranchPin(br.kioskPin || "123456");
                      setPinError(null);
                    }}
                    className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg bg-[#7B6E86]/20 hover:bg-[#7B6E86]/40 text-[#D2C483] border border-[#7B6E86]/30 transition"
                  >
                    <Edit3 className="h-2.5 w-2.5" /> Cambiar PIN
                  </button>
                </div>
              </button>
            );
          })}
        </div>

        {/* Modal de Cambio de PIN de Kiosco por Sucursal */}
        {editingBranchPin && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="change-pin-modal-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in"
            onClick={() => !isSavingPin && setEditingBranchPin(null)}
          >
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!/^\d{6}$/.test(newBranchPin.trim())) {
                  setPinError("El PIN debe tener exactamente 6 dígitos numéricos.");
                  return;
                }
                setIsSavingPin(true);
                setPinError(null);
                try {
                  if (onUpdateBranchPin) {
                    const res = await onUpdateBranchPin(
                      editingBranchPin.branchId,
                      newBranchPin.trim()
                    );
                    if (!res.success) {
                      setPinError(res.error || "No se pudo actualizar el PIN.");
                      return;
                    }
                  }
                  setEditingBranchPin(null);
                } finally {
                  setIsSavingPin(false);
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md rounded-3xl bg-[#1C1723] text-stone-100 border border-[#7B6E86]/40 shadow-2xl p-6 sm:p-7 space-y-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-[#7B6E86]/25 text-[#D2C483] border border-[#7B6E86]/40 flex items-center justify-center shrink-0">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <div>
                    <h3
                      id="change-pin-modal-title"
                      className="text-base font-extrabold text-white tracking-tight"
                    >
                      PIN de Kiosco: {editingBranchPin.branchName}
                    </h3>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Configura el PIN de 6 dígitos que utilizará el personal para activar las tablets en esta sucursal.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isSavingPin}
                  onClick={() => setEditingBranchPin(null)}
                  className="rounded-xl p-1.5 text-stone-400 hover:text-white hover:bg-white/10 transition"
                  aria-label="Cerrar modal"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-300">
                  Nuevo PIN (6 Dígitos Numéricos)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={6}
                    autoFocus
                    disabled={isSavingPin}
                    value={newBranchPin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setNewBranchPin(val);
                      setPinError(null);
                    }}
                    placeholder="Ej. 789012"
                    className="w-full rounded-2xl bg-black/60 border border-[#7B6E86]/40 px-4 py-3.5 text-center text-2xl font-mono font-bold tracking-[0.3em] text-[#D2C483] focus:outline-none focus:ring-2 focus:ring-[#D2C483]"
                  />
                </div>
                <p className="text-[11px] text-stone-400 text-center">
                  Solo se permiten dígitos del 0 al 9.
                </p>
              </div>

              {pinError && (
                <div
                  role="alert"
                  className="rounded-xl bg-rose-950/40 border border-rose-500/30 p-2.5 text-xs text-rose-300 flex items-center gap-2"
                >
                  <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isSavingPin}
                  onClick={() => setEditingBranchPin(null)}
                  className="rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs px-4 py-2.5 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingPin || newBranchPin.length !== 6}
                  className={`rounded-xl font-bold text-xs px-5 py-2.5 transition shadow-lg flex items-center gap-2 ${isSavingPin || newBranchPin.length !== 6
                      ? "bg-stone-700 text-stone-500 cursor-not-allowed"
                      : "bg-[#7B6E86] hover:bg-[#685B73] text-white shadow-[#7B6E86]/30"
                    }`}
                >
                  {isSavingPin ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#D2C483]" />
                      <span>Actualizar PIN</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
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
            Lugares #3 y #4 (Junto a Coach)
          </p>
          <p className="text-xs text-stone-300 mt-1">
            En Devotion Zibatá, Juriquilla y Campanario los lugares al centro
            junto al <strong>COACH</strong> se agotan primero.
          </p>
        </div>

        {/* Card 2: Alumna VIP vs El Fantasma de las Cancelaciones */}
        <div className="rounded-3xl bg-white dark:bg-[#1C1824] border border-stone-200/90 dark:border-stone-800 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">
              👻 Radar: Reina VIP vs Fantasma
            </span>
            <Ghost className="h-5 w-5 text-stone-600 dark:text-stone-400" />
          </div>
          <p className="text-xs text-stone-800 dark:text-stone-200 mt-2">
            👑 <strong>Obsesión Total:</strong>{" "}
            {vipClient ? `${vipClient.name} (${vipClient.totalAttended} clases sin fallar)` : "Sin alumnos registrados"}
          </p>
          <p className="text-xs text-rose-700 dark:text-rose-400 mt-1.5">
            👻 <strong>Alerta Fantasma:</strong>{" "}
            {ghostClient && ghostClient.noShowsCount ? `${ghostClient.name} acumula ${ghostClient.noShowsCount} no-shows` : "Sin incidencias registradas"}
          </p>
        </div>

        {/* Card 3: Alerta Hambre de Tokens (Upsell) */}
        <div className="rounded-3xl bg-white dark:bg-[#1C1824] border border-stone-200/90 dark:border-stone-800 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400">
              🚨 Alerta: Se quedan sin Tokens
            </span>
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-2xl font-extrabold text-stone-900 dark:text-stone-100 mt-1">
            {lowTokenClients.length} alumnas
          </p>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            {lowTokenClients.length > 0 ? (
              <>
                {lowTokenClients.map((c) => c.name.split(" ")[0]).join(", ")}{" "}
                tienen <strong>≤ 2 tokens</strong>. ¡Momento ideal para mandarles promo por WhatsApp!
              </>
            ) : (
              "Todas las alumnas activas cuentan con saldo disponible."
            )}
          </p>
        </div>

        {/* Card 4: Ranking Coaches Estrella */}
        <div className="rounded-3xl bg-white dark:bg-[#1C1824] border border-stone-200/90 dark:border-stone-800 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
              🌟 Top Coaches (Lleno Total)
            </span>
            <Award className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 space-y-1.5">
            {db.coaches.slice(0, 3).map((co, idx) => (
              <div
                key={co.id}
                className="flex items-center justify-between text-xs"
              >
                <span className="font-bold text-stone-800 dark:text-stone-200 truncate">
                  {idx + 1}. {co.name}
                </span>
                <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-extrabold px-2 py-0.5 text-[10px]">
                  {co.occupancyRate}% lleno
                </span>
              </div>
            ))}
            {db.coaches.length === 0 && (
              <p className="text-xs text-stone-400 dark:text-stone-500 py-1">
                Aún no hay coaches registrados.
              </p>
            )}
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
            + Nuevo Alumno(a)
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            if (
              window.confirm(
                "¿Estás seguro de que deseas reiniciar el sistema desde cero? Se borrarán todos los alumnos, coaches, clases y reservas."
              )
            ) {
              onResetDemo();
            }
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-stone-200/70 hover:bg-rose-100 hover:text-rose-800 text-stone-600 text-xs font-semibold px-3 py-2 transition"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Limpiar Todo (Empezar desde 0)
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
              dayOfWeek: sesDayOfWeek,
              startTime: sesTime,
              isSpecialClass: sesIsSpecial,
              specialBadge: sesIsSpecial ? sesBadge : undefined,
            });
            setActiveDrawer(null);
          }}
          className="rounded-3xl bg-white dark:bg-[#1C1824] border border-stone-300 dark:border-stone-700 p-6 shadow-md space-y-4"
        >
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Programar Nueva Clase en Horario de Sucursal (7am-10am o 6pm-8pm · Lunes a Domingo)
            </h3>
            <button
              type="button"
              onClick={() => setActiveDrawer(null)}
              className="text-xs font-semibold text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
            >
              Cerrar ✕
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <input
              type="text"
              required
              value={sesTitle}
              onChange={(e) => setSesTitle(e.target.value)}
              placeholder="Nombre de la clase"
              className="sm:col-span-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 px-3 py-2 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:bg-white dark:focus:bg-stone-950 focus:border-[#7B6E86] focus:ring-2 focus:ring-[#7B6E86]/20 outline-none"
            />
            <select
              value={sesRoomId}
              onChange={(e) => setSesRoomId(e.target.value)}
              className="rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 px-3 py-2 text-xs text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-950 focus:border-[#7B6E86] focus:ring-2 focus:ring-[#7B6E86]/20 outline-none"
            >
              {db.rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  [{r.brand}] {r.name}
                </option>
              ))}
            </select>
            <select
              value={sesDayOfWeek}
              onChange={(e) => setSesDayOfWeek(e.target.value as DayOfWeek)}
              className="rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 px-3 py-2 text-xs font-bold text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-950 focus:border-[#7B6E86] focus:ring-2 focus:ring-[#7B6E86]/20 outline-none"
            >
              {(
                [
                  "Lunes",
                  "Martes",
                  "Miércoles",
                  "Jueves",
                  "Viernes",
                  "Sábado",
                  "Domingo",
                ] as DayOfWeek[]
              ).map((day) => (
                <option key={day} value={day}>
                  Día: {day}
                </option>
              ))}
            </select>
            <select
              value={sesTime}
              onChange={(e) => setSesTime(e.target.value)}
              className="rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 px-3 py-2 text-xs font-mono font-bold text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-950 focus:border-[#7B6E86] focus:ring-2 focus:ring-[#7B6E86]/20 outline-none"
            >
              <optgroup label="Mañana Oficial (:15 AM)">
                <option value="06:15">06:15 AM</option>
                <option value="07:15">07:15 AM</option>
                <option value="08:15">08:15 AM</option>
                <option value="09:15">09:15 AM</option>
                <option value="10:15">10:15 AM</option>
              </optgroup>
              <optgroup label="Tarde/Noche Oficial (PM)">
                <option value="18:00">18:00 (06:00 PM)</option>
                <option value="19:00">19:00 (07:00 PM)</option>
                <option value="20:00">20:00 (08:00 PM)</option>
              </optgroup>
            </select>
            <select
              value={sesInstructor}
              onChange={(e) => setSesInstructor(e.target.value)}
              className="rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 px-3 py-2 text-xs text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-950 focus:border-[#7B6E86] focus:ring-2 focus:ring-[#7B6E86]/20 outline-none"
            >
              {db.coaches.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
              {db.coaches.length === 0 && (
                <option value="Coach Por Asignar">Coach Por Asignar</option>
              )}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-stone-700 dark:text-stone-300">
              <input
                type="checkbox"
                checked={sesIsSpecial}
                onChange={(e) => setSesIsSpecial(e.target.checked)}
              />
              ¿Es Clase Especial?
            </label>
            {sesIsSpecial && (
              <input
                type="text"
                value={sesBadge}
                onChange={(e) => setSesBadge(e.target.value)}
                placeholder="Etiqueta especial (ej. 🎧 DJ Live Set / 🕯️ Soundbath)"
                className="w-full sm:w-80 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 px-3 py-2 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:bg-white dark:focus:bg-stone-950 focus:border-[#7B6E86] focus:ring-2 focus:ring-[#7B6E86]/20 outline-none"
              />
            )}
          </div>
          <div>
            <button
              type="submit"
              className="rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-stone-800 dark:hover:bg-stone-700 text-[#D2C483] font-bold text-xs px-5 py-2.5 transition shadow-sm"
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
          className="rounded-3xl bg-white dark:bg-[#1C1824] border border-amber-300 dark:border-amber-700/60 p-6 shadow-md space-y-4"
        >
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Publicar Nuevo Evento Especial o Promo en las Tablets de Kiosco
            </h3>
            <button
              type="button"
              onClick={() => setActiveDrawer(null)}
              className="text-xs font-semibold text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
            >
              Cerrar ✕
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              required
              value={evTitle}
              onChange={(e) => setEvTitle(e.target.value)}
              placeholder="Título (ej. Masterclass Reformer & Brunch)"
              className="rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 px-3 py-2 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:bg-white dark:focus:bg-stone-950 focus:border-[#7B6E86] focus:ring-2 focus:ring-[#7B6E86]/20 outline-none"
            />
            <input
              type="text"
              value={evDate}
              onChange={(e) => setEvDate(e.target.value)}
              placeholder="Fecha/Hora (ej. Domingo 11:00 hrs)"
              className="rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 px-3 py-2 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:bg-white dark:focus:bg-stone-950 focus:border-[#7B6E86] focus:ring-2 focus:ring-[#7B6E86]/20 outline-none"
            />
            <select
              value={evBranchId}
              onChange={(e) => setEvBranchId(e.target.value)}
              className="rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 px-3 py-2 text-xs text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-950 focus:border-[#7B6E86] focus:ring-2 focus:ring-[#7B6E86]/20 outline-none"
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
              className="rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 px-3 py-2 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:bg-white dark:focus:bg-stone-950 focus:border-[#7B6E86] focus:ring-2 focus:ring-[#7B6E86]/20 outline-none"
            />
            <input
              type="text"
              value={evPrice}
              onChange={(e) => setEvPrice(e.target.value)}
              placeholder="Costo (ej. 2 Tokens o $450 MXN)"
              className="rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 px-3 py-2 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:bg-white dark:focus:bg-stone-950 focus:border-[#7B6E86] focus:ring-2 focus:ring-[#7B6E86]/20 outline-none"
            />
            <input
              type="text"
              value={evDesc}
              onChange={(e) => setEvDesc(e.target.value)}
              placeholder="Descripción breve para las alumnas..."
              className="rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 px-3 py-2 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:bg-white dark:focus:bg-stone-950 focus:border-[#7B6E86] focus:ring-2 focus:ring-[#7B6E86]/20 outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-extrabold text-xs px-5 py-2.5 transition shadow-sm"
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
          className="rounded-3xl bg-white dark:bg-[#1C1824] border border-stone-300 dark:border-stone-700 p-6 shadow-md space-y-4"
        >
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Agregar Nueva Coach al Equipo Stiliza &amp; Devotion
            </h3>
            <button
              type="button"
              onClick={() => setActiveDrawer(null)}
              className="text-xs font-semibold text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
            >
              Cerrar ✕
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              required
              value={coachName}
              onChange={(e) => setCoachName(e.target.value)}
              placeholder="Nombre (ej. Coach Mariana T.)"
              className="rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 px-3 py-2 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:bg-white dark:focus:bg-stone-950 focus:border-[#7B6E86] focus:ring-2 focus:ring-[#7B6E86]/20 outline-none"
            />
            <select
              value={coachSpecialty}
              onChange={(e) => setCoachSpecialty(e.target.value)}
              className="rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 px-3 py-2 text-xs text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-950 focus:border-[#7B6E86] focus:ring-2 focus:ring-[#7B6E86]/20 outline-none"
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
              className="rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 px-3 py-2 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:bg-white dark:focus:bg-stone-950 focus:border-[#7B6E86] focus:ring-2 focus:ring-[#7B6E86]/20 outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-stone-800 dark:hover:bg-stone-700 text-[#D2C483] font-bold text-xs px-5 py-2.5 transition shadow-sm"
          >
            Guardar Coach
          </button>
        </form>
      )}

      {/* DRAWER: Nuevo Alumno(a) */}
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
              homeBranchName: newHomeBranch,
            });
            setNewName("");
            setNewPhone("+52 ");
            setNewEmail("");
            setNewMedicalNotes("");
            setActiveDrawer(null);
          }}
          className="rounded-3xl bg-white dark:bg-[#1C1824] border border-stone-300 dark:border-stone-700 p-6 shadow-md space-y-4"
        >
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Dar de Alta Nuevo Alumno(a) · CRUD Clientes
            </h3>
            <button
              type="button"
              onClick={() => setActiveDrawer(null)}
              className="text-xs font-semibold text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
            >
              Cerrar ✕
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1">
                Nombre Completo *
              </label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nombre Completo (ej. Mariana Hernández)"
                className="w-full rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 px-3 py-2 text-xs font-semibold text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:bg-white dark:focus:bg-stone-950 focus:border-[#7B6E86] focus:ring-2 focus:ring-[#7B6E86]/20 outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1">
                WhatsApp *
              </label>
              <input
                type="text"
                required
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="WhatsApp (ej. +52 987 871 0684)"
                className="w-full rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 px-3 py-2 text-xs font-mono font-semibold text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:bg-white dark:focus:bg-stone-950 focus:border-[#7B6E86] focus:ring-2 focus:ring-[#7B6E86]/20 outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Correo electrónico"
                className="w-full rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 px-3 py-2 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:bg-white dark:focus:bg-stone-950 focus:border-[#7B6E86] focus:ring-2 focus:ring-[#7B6E86]/20 outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1">
                Sucursal Base
              </label>
              <select
                value={newHomeBranch}
                onChange={(e) => setNewHomeBranch(e.target.value)}
                className="w-full rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 px-3 py-2 text-xs font-semibold text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-950 focus:border-[#7B6E86] focus:ring-2 focus:ring-[#7B6E86]/20 outline-none"
              >
                {db.branches.map((b) => (
                  <option key={b.id} value={b.name}>
                    Sucursal Base: {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1">
                Paquete Inicial
              </label>
              <select
                value={newPackageId}
                onChange={(e) => setNewPackageId(e.target.value)}
                className="w-full rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 px-3 py-2 text-xs font-bold text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-950 focus:border-[#7B6E86] focus:ring-2 focus:ring-[#7B6E86]/20 outline-none"
              >
                <option value="none">Sin Paquete Activo (0 tokens)</option>
                {db.packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.credits} tokens)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1">
                Lugar Favorito &amp; Notas
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPreferredSpot}
                  onChange={(e) => setNewPreferredSpot(e.target.value)}
                  placeholder="Lugar fav (1-12)"
                  className="w-28 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 px-3 py-2 text-xs font-mono font-bold text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:bg-white dark:focus:bg-stone-950 focus:border-[#7B6E86] focus:ring-2 focus:ring-[#7B6E86]/20 outline-none"
                />
                <input
                  type="text"
                  value={newMedicalNotes}
                  onChange={(e) => setNewMedicalNotes(e.target.value)}
                  placeholder="Notas médicas u observaciones"
                  className="flex-1 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 px-3 py-2 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:bg-white dark:focus:bg-stone-950 focus:border-[#7B6E86] focus:ring-2 focus:ring-[#7B6E86]/20 outline-none"
                />
              </div>
            </div>
          </div>
          <button
            type="submit"
            className="rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-stone-800 dark:hover:bg-stone-700 text-[#D2C483] font-bold text-xs px-5 py-2.5 transition shadow-sm"
          >
            Guardar Alumno(a) en CRM y Supabase
          </button>
        </form>
      )}

      {/* =====================================================================
          4. CONTROL DE HORARIOS, RESERVAS POR CLASE Y EDICIÓN EN VIVO
         ===================================================================== */}
      <div className="rounded-3xl bg-white dark:bg-[#1C1824] border border-stone-200/90 dark:border-stone-800 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-stone-900 dark:text-stone-100">
              Horarios por Sucursal (Lunes a Domingo · 7:00 am – 10:00 am y 6:00 pm – 8:00 pm)
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Filtra por día de la semana o bloque horario (Mañana 7am-10am / Tarde 6pm-8pm). Haz clic en <strong>Modificar</strong> para ajustar clase, hora o coach.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro de Turno: Mañana (7am-10am) vs Tarde (6pm-8pm) */}
            <div className="inline-flex rounded-xl bg-stone-100 dark:bg-stone-900 p-1 border border-stone-200 dark:border-stone-800 text-xs">
              <button
                type="button"
                onClick={() => setBlockFilter("all")}
                className={`rounded-lg px-2.5 py-1 font-bold transition ${blockFilter === "all"
                    ? "bg-stone-900 text-amber-200 shadow-sm"
                    : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
                  }`}
              >
                Todos los turnos
              </button>
              <button
                type="button"
                onClick={() => setBlockFilter("manana")}
                className={`rounded-lg px-2.5 py-1 font-bold transition ${blockFilter === "manana"
                    ? "bg-amber-400 text-stone-950 shadow-sm"
                    : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
                  }`}
              >
                ☀️ Mañana (7am - 10am)
              </button>
              <button
                type="button"
                onClick={() => setBlockFilter("tarde")}
                className={`rounded-lg px-2.5 py-1 font-bold transition ${blockFilter === "tarde"
                    ? "bg-stone-900 text-amber-200 shadow-sm"
                    : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
                  }`}
              >
                🌙 Tarde (6pm - 8pm)
              </button>
            </div>
          </div>
        </div>

        {/* Pestañas de Días de la Semana (Lunes a Domingo) */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-stone-100 dark:border-stone-800 pb-3">
          <button
            type="button"
            onClick={() => setDayFilter("all")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${dayFilter === "all"
                ? "bg-stone-900 text-amber-200 shadow-sm"
                : "bg-stone-50 dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-800"
              }`}
          >
            Todos los días
          </button>
          {(
            [
              "Lunes",
              "Martes",
              "Miércoles",
              "Jueves",
              "Viernes",
              "Sábado",
              "Domingo",
            ] as DayOfWeek[]
          ).map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => setDayFilter(day)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${dayFilter === day
                  ? "bg-stone-900 text-amber-200 shadow-sm"
                  : "bg-stone-50 dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-800"
                }`}
            >
              {day}
            </button>
          ))}
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
                dayOfWeek: editingSession.dayOfWeek,
                roomId: editingSession.roomId,
                isSpecialClass: editingSession.isSpecialClass,
                specialBadge: editingSession.specialBadge,
              });
              setEditingSession(null);
            }}
            className="rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border-2 border-amber-400/80 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-stone-900 dark:text-stone-100">
                ✏️ Modificando Clase: {editingSession.title}
              </span>
              <button
                type="button"
                onClick={() => setEditingSession(null)}
                className="text-xs font-semibold text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
              >
                Cancelar ✕
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
              <input
                type="text"
                value={editingSession.title}
                onChange={(e) =>
                  setEditingSession({
                    ...editingSession,
                    title: e.target.value,
                  })
                }
                className="sm:col-span-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 px-3 py-2 text-xs font-bold text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#7B6E86]/20"
              />
              <select
                value={editingSession.dayOfWeek || "Martes"}
                onChange={(e) =>
                  setEditingSession({
                    ...editingSession,
                    dayOfWeek: e.target.value as DayOfWeek,
                  })
                }
                className="rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 px-3 py-2 text-xs font-bold text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#7B6E86]/20"
              >
                {(
                  [
                    "Lunes",
                    "Martes",
                    "Miércoles",
                    "Jueves",
                    "Viernes",
                    "Sábado",
                    "Domingo",
                  ] as DayOfWeek[]
                ).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <select
                value={editingSession.startTime}
                onChange={(e) =>
                  setEditingSession({
                    ...editingSession,
                    startTime: e.target.value,
                  })
                }
                className="rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 px-3 py-2 text-xs font-mono font-bold text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#7B6E86]/20"
              >
                <optgroup label="Mañana Oficial (:15 AM)">
                  <option value="06:15">06:15 AM</option>
                  <option value="07:15">07:15 AM</option>
                  <option value="08:15">08:15 AM</option>
                  <option value="09:15">09:15 AM</option>
                  <option value="10:15">10:15 AM</option>
                </optgroup>
                <optgroup label="Tarde Oficial (PM)">
                  <option value="18:00">18:00 (06:00 PM)</option>
                  <option value="19:00">19:00 (07:00 PM)</option>
                  <option value="20:00">20:00 (08:00 PM)</option>
                </optgroup>
              </select>
              <select
                value={editingSession.instructor}
                onChange={(e) =>
                  setEditingSession({
                    ...editingSession,
                    instructor: e.target.value,
                  })
                }
                className="rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 px-3 py-2 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#7B6E86]/20"
              >
                {db.coaches.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                value={editingSession.roomId}
                onChange={(e) =>
                  setEditingSession({
                    ...editingSession,
                    roomId: e.target.value,
                  })
                }
                className="rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 px-3 py-2 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#7B6E86]/20"
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
              className="rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-stone-800 dark:hover:bg-stone-700 text-[#D2C483] font-bold text-xs px-4 py-2 transition shadow-sm"
            >
              Guardar Cambios de Horario / Coach
            </button>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-stone-200 dark:border-stone-800 text-[11px] uppercase tracking-wider text-stone-500 dark:text-stone-400">
                <th className="py-2.5 px-3">Sucursal / Marca</th>
                <th className="py-2.5 px-3">Día &amp; Horario</th>
                <th className="py-2.5 px-3">Clase &amp; Salón</th>
                <th className="py-2.5 px-3">Coach</th>
                <th className="py-2.5 px-3">Reservaron / Disponibilidad</th>
                <th className="py-2.5 px-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
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
                const hourNum = parseInt(ses.startTime.split(":")[0] || "18", 10);
                const isMorning = (ses.timeBlock || (hourNum < 13 ? "manana" : "tarde")) === "manana";

                return (
                  <tr
                    key={ses.id}
                    onClick={() => setSelectedSessionId(ses.id)}
                    className={`cursor-pointer transition ${isSelected ? "bg-amber-50/90 dark:bg-amber-950/30" : "hover:bg-stone-50 dark:hover:bg-stone-800/40"
                      }`}
                  >
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${ses.brand === "Devotion"
                            ? "bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300"
                            : "bg-stone-900 text-amber-200"
                          }`}
                      >
                        {ses.brand}
                      </span>
                      <p className="font-semibold text-stone-800 dark:text-stone-200 mt-0.5">
                        {ses.branchName}
                      </p>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-stone-900 dark:text-stone-100">
                      <div className="flex items-center gap-1.5">
                        <span>{ses.startTime} hrs</span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[9px] font-sans font-bold ${isMorning
                              ? "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300"
                              : "bg-stone-200 text-stone-800 dark:bg-stone-800 dark:text-stone-300"
                            }`}
                        >
                          {isMorning ? "☀️ Mañana" : "🌙 Tarde"}
                        </span>
                      </div>
                      <span className="block text-[10px] font-sans font-semibold text-stone-500 dark:text-stone-400 mt-0.5">
                        {ses.dayOfWeek || "Martes"}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-stone-900 dark:text-stone-100">
                          {ses.title}
                        </span>
                        {ses.isSpecialClass && (
                          <span className="rounded-full bg-amber-200 text-stone-900 text-[10px] font-bold px-2 py-0.5">
                            {ses.specialBadge || "Especial"}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400">
                        {ses.roomName}
                      </p>
                    </td>
                    <td className="py-3 px-3 font-semibold text-stone-800 dark:text-stone-200">
                      {ses.instructor}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-stone-900 dark:bg-stone-800 text-white font-bold px-2.5 py-0.5 text-[11px]">
                          {sesBookings.length} / {capacity} reservaron
                        </span>
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                          ({available} libres)
                        </span>
                        {sesCheckedIn > 0 && (
                          <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full font-semibold border border-emerald-200 dark:border-emerald-800">
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
                        className="inline-flex items-center gap-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-semibold px-2.5 py-1.5 transition"
                      >
                        <Edit3 className="h-3 w-3" /> Modificar
                      </button>
                      <button
                        type="button"
                        onClick={() => setSessionToDelete(ses)}
                        title="Eliminar clase del calendario"
                        className="inline-flex items-center rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-rose-100 dark:hover:bg-rose-950 text-stone-500 hover:text-rose-700 dark:text-stone-400 dark:hover:text-rose-400 p-1.5 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredSessions.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-stone-400 dark:text-stone-500 text-xs">
                    No hay clases programadas para este filtro. Da clic en <strong>+ Agregar Clase</strong> para crear horarios.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Modal de Validación / Confirmación al Eliminar Clase */}
        {sessionToDelete && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-session-modal-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => !isDeletingSession && setSessionToDelete(null)}
          >
            <div
              className="relative w-full max-w-lg rounded-3xl bg-[#1C1613] text-stone-100 border border-amber-500/30 shadow-2xl overflow-hidden p-6 sm:p-7 space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3.5">
                  <div className="h-11 w-11 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3
                      id="delete-session-modal-title"
                      className="text-base sm:text-lg font-extrabold text-white tracking-tight"
                    >
                      ¿Confirmas eliminar esta clase?
                    </h3>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Esta acción removerá la sesión del calendario y del portal de reservas.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isDeletingSession}
                  onClick={() => setSessionToDelete(null)}
                  className="rounded-xl p-1.5 text-stone-400 hover:text-white hover:bg-white/10 transition"
                  aria-label="Cerrar modal"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Ficha Resumen de la Clase Seleccionada */}
              {(() => {
                const affectedBookings = db.bookings.filter(
                  (b) => b.sessionId === sessionToDelete.id
                );
                const room = db.rooms.find((r) => r.id === sessionToDelete.roomId);
                const branch = db.branches.find((br) => br.id === room?.branchId);

                return (
                  <div className="rounded-2xl bg-black/40 border border-white/10 p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-bold text-amber-200">
                        {sessionToDelete.title}
                      </span>
                      <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-white/10 text-stone-300 font-semibold">
                        {sessionToDelete.dayOfWeek} · {sessionToDelete.startTime} hrs
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs text-stone-300 pt-1">
                      <div>
                        <span className="text-stone-500 block text-[10px] uppercase font-bold tracking-wider">
                          Coach Asignado
                        </span>
                        <span className="font-semibold text-white">
                          {sessionToDelete.instructor}
                        </span>
                      </div>
                      <div>
                        <span className="text-stone-500 block text-[10px] uppercase font-bold tracking-wider">
                          Sala & Sucursal
                        </span>
                        <span className="font-semibold text-white truncate block">
                          {room?.name || sessionToDelete.roomName} · {branch?.name || "Sucursal"}
                        </span>
                      </div>
                    </div>

                    {/* Validación de Alumnas Inscritas en Vivo */}
                    {affectedBookings.length > 0 ? (
                      <div className="rounded-xl bg-amber-500/15 border border-amber-500/30 p-3 text-xs text-amber-200 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-amber-300">
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          <span>
                            {affectedBookings.length} {affectedBookings.length === 1 ? "alumna inscrita actualmente" : "alumnas inscritas actualmente"}
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-200/90 leading-relaxed">
                          Al eliminar esta clase, los lugares ocupados en el mapa se desocuparán y las reservas quedarán desvinculadas.
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span>No hay alumnas inscritas en esta clase actualmente (0 reservas activas).</span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Botones de Confirmación y Cancelación */}
              <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  disabled={isDeletingSession}
                  onClick={() => setSessionToDelete(null)}
                  className="w-full sm:w-auto rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs px-4 py-3 transition focus:outline-none focus:ring-2 focus:ring-white/20"
                >
                  Conservar Clase
                </button>
                <button
                  type="button"
                  disabled={isDeletingSession}
                  onClick={async () => {
                    if (!sessionToDelete) return;
                    setIsDeletingSession(true);
                    try {
                      await onDeleteSession(sessionToDelete.id);
                      if (selectedSessionId === sessionToDelete.id) {
                        const remaining = db.sessions.filter(
                          (s) => s.id !== sessionToDelete.id
                        );
                        if (remaining[0]) {
                          setSelectedSessionId(remaining[0].id);
                        }
                      }
                      setSessionToDelete(null);
                    } finally {
                      setIsDeletingSession(false);
                    }
                  }}
                  className="w-full sm:w-auto rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-extrabold text-xs px-5 py-3 transition shadow-lg shadow-rose-950/40 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-rose-400"
                >
                  {isDeletingSession ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Eliminando sesión...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Sí, Eliminar Definitivamente</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          5. MAPA EN VIVO DE LA CLASE SELECCIONADA + BITÁCORA QR
         ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 rounded-3xl bg-white dark:bg-[#1C1824] border border-stone-200/90 dark:border-stone-800 p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 dark:border-stone-800 pb-3">
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[#7B6E86] dark:text-[#D2C483]" />
              {activeSession ? (
                <>
                  Mapa de Máquinas / Tapetes en Vivo:{" "}
                  <span className="text-[#7B6E86] dark:text-[#D2C483] font-semibold">{activeSession.title}</span> ({activeSession.startTime} hrs)
                </>
              ) : (
                <>Mapa de Máquinas / Tapetes en Vivo</>
              )}
            </h3>
            {activeSession && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium">
                {activeSession.branchName}
              </span>
            )}
          </div>

          {activeSession && activeRoom ? (
            <StudioSpotMap
              room={activeRoom}
              session={activeSession}
              bookings={db.bookings}
              selectedSpotId={null}
              onSelectSpot={() => { }}
              isAdminView
              onToggleMaintenance={onToggleMaintenance}
            />
          ) : (
            <div className="py-12 px-6 text-center rounded-2xl bg-stone-50 dark:bg-stone-900/50 border border-dashed border-stone-200 dark:border-stone-800">
              <BarChart3 className="h-10 w-10 text-stone-400 dark:text-stone-500 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-bold text-stone-700 dark:text-stone-300">
                No hay ninguna clase seleccionada o programada
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-md mx-auto">
                Selecciona una clase en la tabla de horarios o crea una nueva con el botón "+ Agregar Clase" para visualizar la distribución de lugares y asistencia en tiempo real.
              </p>
            </div>
          )}
        </div>

        {/* Right 5 Cols: Active Bookings & QR Check-in Roster */}
        <div className="lg:col-span-5 rounded-3xl bg-white dark:bg-[#1C1824] border border-stone-200/90 dark:border-stone-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
            <div>
              <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
                Reservas &amp; Check-In QR ({activeBookings.length})
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {checkedInCount} adentro · {botBookingsCount} agendadas por Bot IA
              </p>
            </div>
            <QrCode className="h-5 w-5 text-amber-700 dark:text-[#D2C483]" />
          </div>

          <div className="space-y-3 max-h-[430px] overflow-y-auto pr-1">
            {activeBookings.map((bk) => {
              const isCheckedIn = bk.status === "asistio";
              const isHot = bk.discipline === "hot_pilates";

              return (
                <div
                  key={bk.id}
                  className="rounded-2xl border border-stone-200 dark:border-stone-800 p-3.5 hover:border-stone-300 dark:hover:border-stone-700 transition flex items-center justify-between gap-3 bg-stone-50/50 dark:bg-stone-900/50"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${isHot
                            ? "bg-orange-100 text-orange-900"
                            : "bg-stone-900 text-amber-200"
                          }`}
                      >
                        {bk.spotId}
                      </span>
                      <p className="font-bold text-xs text-stone-900 dark:text-stone-100 truncate">
                        {bk.clientName}
                      </p>
                      <span className="rounded-md bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-1.5 py-0.5 text-[10px] font-bold uppercase text-stone-600 dark:text-stone-400">
                        {bk.bookedVia === "whatsapp_bot"
                          ? "🤖 Bot IA"
                          : bk.bookedVia === "kiosk_tablet"
                            ? "📱 Kiosco"
                            : bk.bookedVia === "wellhub"
                              ? "🔴 Wellhub"
                              : bk.bookedVia === "totalpass"
                                ? "🟢 TotalPass"
                                : bk.bookedVia === "fitpass"
                                  ? "🔵 FitPass"
                                  : bk.bookedVia === "nessty"
                                    ? "🟣 Nessty"
                                    : "🌐 Web"}
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 truncate">
                      {bk.branchName} · {bk.sessionTitle} ({bk.startTime})
                    </p>
                    <p className="text-[10px] font-mono text-stone-400 dark:text-stone-500 mt-0.5">
                      {bk.checkedInKioskLabel
                        ? `✅ Escaneó en ${bk.checkedInKioskLabel}`
                        : `QR: ${bk.qrToken}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isCheckedIn ? (
                      <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2.5 py-1.5 text-[11px] font-bold border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        Asistió
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => onScanInKiosk(bk.qrToken)}
                          className="rounded-xl bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/50 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-200 font-bold text-[11px] px-2.5 py-1.5 transition"
                        >
                          Check-in QR
                        </button>
                        <button
                          type="button"
                          onClick={() => onCancelBooking(bk.id)}
                          className="rounded-xl bg-stone-100 hover:bg-rose-100 dark:bg-stone-800 dark:hover:bg-rose-950 text-stone-500 hover:text-rose-700 dark:text-stone-400 dark:hover:text-rose-400 p-1.5 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {activeBookings.length === 0 && (
              <div className="py-8 text-center text-stone-400 dark:text-stone-500 text-xs">
                No hay reservaciones registradas para esta sesión aún.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =====================================================================
          6. DIRECTORIO CRUD DE ALUMNOS / CLIENTES Y CONTROL DE TOKENS
         ===================================================================== */}
      <div className="rounded-3xl bg-white dark:bg-[#1C1824] border border-stone-200/90 dark:border-stone-800 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Users className="h-5 w-5 text-stone-700 dark:text-stone-300" />
              Directorio CRUD de Alumnos &amp; Control de Tokens ({db.clients.length})
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Crea, edita o elimina perfiles de alumnos (hombres y mujeres), ajusta sus tokens, lugar favorito, notas médicas y abre su chat de WhatsApp
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setActiveDrawer(
                  activeDrawer === "new_client" ? null : "new_client"
                )
              }
              className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-stone-800 dark:hover:bg-stone-700 text-[#D2C483] font-bold text-xs px-3.5 py-2 transition shadow-sm"
            >
              <UserPlus className="h-3.5 w-3.5" /> + Nuevo Alumno(a)
            </button>
            <div className="relative w-full sm:w-64">
              <Search className="h-4 w-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                placeholder="Buscar alumno(a) o WhatsApp..."
                className="w-full rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 pl-9 pr-3 py-2 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:bg-white dark:focus:bg-stone-950 focus:border-[#7B6E86] focus:ring-2 focus:ring-[#7B6E86]/20 outline-none"
              />
            </div>
          </div>
        </div>

        {/* FORMULARIO INLINE PARA EDITAR ALUMNO(A) (UPDATE DEL CRUD) */}
        {editingClient && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await onUpdateClient({
                clientId: editingClient.id,
                name: editingClient.name,
                phone: editingClient.phone,
                email: editingClient.email,
                homeBranchName: editingClient.homeBranchName || "Devotion Zibatá",
                activePackageName: editingClient.activePackageName,
                creditsRemaining: editingClient.creditsRemaining,
                preferredSpot: editingClient.preferredSpot || "3",
                medicalNotes: editingClient.medicalNotes || "",
              });
              setEditingClient(null);
            }}
            className="rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border-2 border-amber-400/80 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-stone-900 dark:text-stone-100">
                ✏️ Editando Alumno(a): {editingClient.name}
              </span>
              <button
                type="button"
                onClick={() => setEditingClient(null)}
                className="text-xs font-semibold text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
              >
                Cancelar ✕
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-stone-500 dark:text-stone-400 mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  value={editingClient.name}
                  onChange={(e) =>
                    setEditingClient({ ...editingClient, name: e.target.value })
                  }
                  className="w-full rounded-xl border border-stone-300 dark:border-stone-700 px-3 py-2 text-xs font-bold bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#7B6E86]/20"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-stone-500 dark:text-stone-400 mb-1">
                  Teléfono WhatsApp
                </label>
                <input
                  type="text"
                  required
                  value={editingClient.phone}
                  onChange={(e) =>
                    setEditingClient({ ...editingClient, phone: e.target.value })
                  }
                  className="w-full rounded-xl border border-stone-300 dark:border-stone-700 px-3 py-2 text-xs font-mono font-bold bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#7B6E86]/20"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-stone-500 dark:text-stone-400 mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="text"
                  value={editingClient.email}
                  onChange={(e) =>
                    setEditingClient({ ...editingClient, email: e.target.value })
                  }
                  className="w-full rounded-xl border border-stone-300 dark:border-stone-700 px-3 py-2 text-xs bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#7B6E86]/20"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-stone-500 dark:text-stone-400 mb-1">
                  Sucursal Base
                </label>
                <select
                  value={editingClient.homeBranchName || "Devotion Zibatá"}
                  onChange={(e) =>
                    setEditingClient({
                      ...editingClient,
                      homeBranchName: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-stone-300 dark:border-stone-700 px-3 py-2 text-xs bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#7B6E86]/20"
                >
                  {db.branches.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-stone-500 dark:text-stone-400 mb-1">
                  Paquete Activo
                </label>
                <input
                  type="text"
                  value={editingClient.activePackageName}
                  onChange={(e) =>
                    setEditingClient({
                      ...editingClient,
                      activePackageName: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-stone-300 dark:border-stone-700 px-3 py-2 text-xs bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#7B6E86]/20"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-stone-500 dark:text-stone-400 mb-1">
                  Tokens Disponibles
                </label>
                <input
                  type="number"
                  min={0}
                  value={editingClient.creditsRemaining}
                  onChange={(e) =>
                    setEditingClient({
                      ...editingClient,
                      creditsRemaining: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className="w-full rounded-xl border border-stone-300 dark:border-stone-700 px-3 py-2 text-xs font-extrabold bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#7B6E86]/20"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-stone-500 dark:text-stone-400 mb-1">
                  Lugar Favorito (1-12)
                </label>
                <input
                  type="text"
                  value={editingClient.preferredSpot || ""}
                  onChange={(e) =>
                    setEditingClient({
                      ...editingClient,
                      preferredSpot: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-stone-300 dark:border-stone-700 px-3 py-2 text-xs font-mono bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#7B6E86]/20"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-stone-500 dark:text-stone-400 mb-1">
                  Notas Médicas / Lesiones
                </label>
                <input
                  type="text"
                  value={editingClient.medicalNotes || ""}
                  onChange={(e) =>
                    setEditingClient({
                      ...editingClient,
                      medicalNotes: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-stone-300 dark:border-stone-700 px-3 py-2 text-xs bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#7B6E86]/20"
                />
              </div>
            </div>
            <button
              type="submit"
              className="rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-stone-800 dark:hover:bg-stone-700 text-[#D2C483] font-bold text-xs px-5 py-2 transition shadow-sm"
            >
              Guardar Cambios del Alumno(a)
            </button>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-stone-200 dark:border-stone-800 text-[11px] uppercase tracking-wider text-stone-500 dark:text-stone-400">
                <th className="py-3 px-3">Alumno(a)</th>
                <th className="py-3 px-3">Sucursal Base / WhatsApp</th>
                <th className="py-3 px-3">Paquete Activo</th>
                <th className="py-3 px-3">Tokens</th>
                <th className="py-3 px-3">Lugar Fav / Notas</th>
                <th className="py-3 px-3 text-right">Acciones CRUD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800 text-xs">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40 transition">
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-stone-900 dark:bg-stone-800 text-amber-200 font-bold text-xs flex items-center justify-center shrink-0">
                        {client.avatarInitials}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-stone-900 dark:text-stone-100">
                            {client.name}
                          </p>
                          {client.isUnregisteredLead && (
                            <span className="rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 text-[10px] font-bold px-2 py-0.5 border border-rose-200 dark:border-rose-800">
                              Sin cuenta
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-stone-400 dark:text-stone-500">
                          {client.totalAttended} asistencias ·{" "}
                          {client.noShowsCount || 0} faltas
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-3">
                    <p className="font-semibold text-stone-800 dark:text-stone-200">
                      {client.homeBranchName || "Devotion Zibatá"}
                    </p>
                    <p className="font-mono text-[11px] text-stone-500 dark:text-stone-400">
                      {client.phone}
                    </p>
                  </td>
                  <td className="py-3.5 px-3">
                    <p className="font-semibold text-stone-800 dark:text-stone-200">
                      {client.activePackageName}
                    </p>
                    <p className="text-[10px] text-stone-400 dark:text-stone-500">
                      Vence: {client.packageExpiresAt}
                    </p>
                  </td>
                  <td className="py-3.5 px-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${client.creditsRemaining > 2
                          ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                          : client.creditsRemaining > 0
                            ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                            : "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                        }`}
                    >
                      {client.creditsRemaining} tokens
                    </span>
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="font-mono font-bold text-amber-800 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/50 px-1.5 py-0.5 rounded">
                      {client.preferredSpot || "—"}
                    </span>
                    {client.medicalNotes && (
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 max-w-xs truncate">
                        {client.medicalNotes}
                      </p>
                    )}
                  </td>
                  <td className="py-3.5 px-3 text-right space-x-1.5">
                    <button
                      type="button"
                      onClick={() => setEditingClient(client)}
                      className="inline-flex items-center gap-1 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-semibold px-2.5 py-1.5 transition"
                    >
                      <Edit3 className="h-3 w-3" /> Editar
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onRechargeClient(client.id, "pkg-devotion-8")
                      }
                      className="inline-flex items-center gap-1 rounded-xl bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-semibold px-2.5 py-1.5 transition"
                    >
                      <Plus className="h-3 w-3" /> +8 Tokens
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenClientChat(client.id)}
                      className="inline-flex items-center gap-1 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-semibold px-2.5 py-1.5 transition"
                    >
                      <Bot className="h-3.5 w-3.5" /> Chat IA
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteClient(client.id)}
                      title="Eliminar alumno(a) del CRM y base de datos"
                      className="inline-flex items-center rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-rose-100 dark:hover:bg-rose-950 text-stone-500 dark:text-stone-400 hover:text-rose-700 dark:hover:text-rose-400 p-1.5 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-stone-400 dark:text-stone-500 text-xs">
                    No hay alumnos registrados aún. Haz clic en <strong>+ Nuevo Alumno(a)</strong> arriba para dar de alta al primero.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
