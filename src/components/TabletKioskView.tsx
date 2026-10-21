"use client";

import React, { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Booking, CRMDatabaseState, DayOfWeek, KioskCheckInResult } from "@/types/crm";
import { StudioSpotMap } from "@/components/StudioSpotMap";
import { QRCodePassCard } from "@/components/QRCodePassCard";
import {
  Calendar,
  Camera,
  CameraOff,
  CheckCircle2,
  Clock,
  CreditCard,
  Flame,
  Gift,
  Keyboard,
  PartyPopper,
  QrCode,
  ScanLine,
  Sparkles,
  UserCheck,
  UserPlus,
  Volume2,
  XCircle,
} from "lucide-react";

interface TabletKioskViewProps {
  db: CRMDatabaseState;
  kioskLabel: string;
  branchId?: string;
  branchName?: string;
  onScanQR: (
    qrToken: string,
    kioskLabel?: string
  ) => Promise<KioskCheckInResult>;
  onBookSpot: (params: {
    clientId: string;
    sessionId: string;
    spotId: string;
  }) => Promise<{ success: boolean; error?: string; booking?: Booking }>;
  onBuyPackage: (clientId: string, packageId: string) => Promise<void>;
  onCreateClientInKiosk?: (data: {
    name: string;
    phone: string;
    email: string;
    packageId: string;
    preferredSpot: string;
    homeBranchName: string;
  }) => Promise<void>;
  externalTriggeredToken?: string | null;
  onClearExternalToken?: () => void;
}

type KioskTab = "checkin" | "horarios" | "paquetes" | "eventos";

export function TabletKioskView({
  db,
  kioskLabel,
  branchId,
  branchName,
  onScanQR,
  onBookSpot,
  onBuyPackage,
  onCreateClientInKiosk,
  externalTriggeredToken,
  onClearExternalToken,
}: TabletKioskViewProps) {
  const [activeTab, setActiveTab] = useState<KioskTab>("checkin");
  const [manualToken, setManualToken] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<KioskCheckInResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>("18:25");

  // State for Horarios & Spot Booking on the Kiosk
  const [showAllBranchesSchedule, setShowAllBranchesSchedule] = useState(false);
  const [kioskDayFilter, setKioskDayFilter] = useState<DayOfWeek>("Martes");
  const [selectedClientId, setSelectedClientId] = useState<string>(
    db.clients[0]?.id || "cli-1"
  );
  const branchSessions = db.sessions.filter((s) => {
    const branchMatch =
      !branchId || showAllBranchesSchedule ? true : s.branchId === branchId;
    const dayMatch = (s.dayOfWeek || "Martes") === kioskDayFilter;
    return branchMatch && dayMatch;
  });
  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    branchSessions[0]?.id || db.sessions[0]?.id || ""
  );
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [kioskBookedPass, setKioskBookedPass] = useState<Booking | null>(null);
  const [kioskFeedback, setKioskFeedback] = useState<string | null>(null);

  // State for Token Purchase on the Kiosk
  const [purchaseSuccessMsg, setPurchaseSuccessMsg] = useState<string | null>(
    null
  );
  const [showNewAlumnaForm, setShowNewAlumnaForm] = useState(false);
  const [newAlumnaName, setNewAlumnaName] = useState("");
  const [newAlumnaPhone, setNewAlumnaPhone] = useState("+52 ");
  const [newAlumnaPkg, setNewAlumnaPkg] = useState("pkg-devotion-8");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const updateClock = () => {
      setCurrentTime(
        new Date().toLocaleTimeString("es-MX", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 15000);
    return () => clearInterval(timer);
  }, []);

  const playChime = (success: boolean) => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (success) {
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.14);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
        osc.start();
        osc.stop(ctx.currentTime + 0.55);
      } else {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(240, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch {
      // Ignore if audio context is blocked
    }
  };

  const handleTriggerScan = async (token: string) => {
    if (!token.trim() || isProcessing) return;
    setIsProcessing(true);
    try {
      const res = await onScanQR(token.trim(), kioskLabel);
      setLastResult(res);
      playChime(res.success);
      setManualToken("");
    } finally {
      setIsProcessing(false);
      inputRef.current?.focus();
    }
  };

  useEffect(() => {
    if (externalTriggeredToken) {
      setActiveTab("checkin");
      handleTriggerScan(externalTriggeredToken);
      onClearExternalToken?.();
    }
  }, [externalTriggeredToken]);

  // Camera QR scanning loop
  useEffect(() => {
    let stream: MediaStream | null = null;
    let rafId: number | null = null;

    if (cameraActive && activeTab === "checkin") {
      setCameraError(null);
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: "environment" } })
        .then((mediaStream) => {
          stream = mediaStream;
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
            videoRef.current.setAttribute("playsinline", "true");
            videoRef.current.play();
          }

          const tick = () => {
            if (
              videoRef.current &&
              canvasRef.current &&
              videoRef.current.readyState ===
                videoRef.current.HAVE_ENOUGH_DATA
            ) {
              const video = videoRef.current;
              const canvas = canvasRef.current;
              canvas.height = video.videoHeight;
              canvas.width = video.videoWidth;
              const ctx = canvas.getContext("2d");
              if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(
                  0,
                  0,
                  canvas.width,
                  canvas.height
                );
                const code = jsQR(
                  imageData.data,
                  imageData.width,
                  imageData.height,
                  {
                    inversionAttempts: "dontInvert",
                  }
                );
                if (code && code.data) {
                  handleTriggerScan(code.data);
                  setCameraActive(false);
                  return;
                }
              }
            }
            rafId = requestAnimationFrame(tick);
          };
          rafId = requestAnimationFrame(tick);
        })
        .catch(() => {
          setCameraError(
            "No se detectó cámara web o permiso denegado. Puedes usar el lector físico USB/Bluetooth o seleccionar tu pase abajo."
          );
          setCameraActive(false);
        });
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraActive, activeTab]);

  const pendingBookings = db.bookings.filter(
    (b) =>
      b.status === "confirmada" &&
      (!branchId || showAllBranchesSchedule || b.branchId === branchId)
  );
  const checkedInBookings = db.bookings.filter(
    (b) =>
      b.status === "asistio" &&
      (!branchId || showAllBranchesSchedule || b.branchId === branchId)
  );

  const activeSession =
    branchSessions.find((s) => s.id === selectedSessionId) ||
    branchSessions[0] ||
    db.sessions[0];
  const activeRoom =
    db.rooms.find((r) => r.id === activeSession?.roomId) || db.rooms[0];
  const activeClient =
    db.clients.find((c) => c.id === selectedClientId) || db.clients[0];

  const branchEvents = db.promosAndEvents.filter(
    (ev) => ev.branchId === "all" || !branchId || ev.branchId === branchId
  );

  return (
    <div className="rounded-3xl bg-gradient-to-br from-[#171311] via-[#211A16] to-[#120E0C] text-stone-100 p-5 sm:p-8 shadow-2xl border border-stone-800 space-y-6">
      {/* Kiosk Header & Navigation Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-amber-400/15 border border-amber-300/30 flex items-center justify-center shrink-0">
            <QrCode className="h-6 w-6 text-amber-300" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300 border border-emerald-500/30">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                {kioskLabel.toUpperCase()}
              </span>
              <span className="text-xs text-stone-400">
                Terminal Autónoma de Recepción · {currentTime} hrs
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-0.5">
              Bienvenida a {branchName || "Stiliza & Devotion"}
            </h2>
          </div>
        </div>

        {/* 4 Kiosk Sub-Modules */}
        <div className="flex flex-wrap items-center gap-2 bg-black/40 p-1.5 rounded-2xl border border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab("checkin")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === "checkin"
                ? "bg-amber-400 text-stone-950 shadow"
                : "text-stone-300 hover:bg-white/10"
            }`}
          >
            <ScanLine className="h-4 w-4" />
            1. Check-In QR
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("horarios")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === "horarios"
                ? "bg-amber-400 text-stone-950 shadow"
                : "text-stone-300 hover:bg-white/10"
            }`}
          >
            <Calendar className="h-4 w-4" />
            2. Próximos Horarios & Mapa
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("paquetes")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === "paquetes"
                ? "bg-amber-400 text-stone-950 shadow"
                : "text-stone-300 hover:bg-white/10"
            }`}
          >
            <CreditCard className="h-4 w-4" />
            3. Comprar Tokens / Paquetes
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("eventos")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === "eventos"
                ? "bg-amber-400 text-stone-950 shadow"
                : "text-stone-300 hover:bg-white/10"
            }`}
          >
            <PartyPopper className="h-4 w-4" />
            4. Eventos & Promos ({branchEvents.length})
          </button>
        </div>
      </div>

      {/* =====================================================================
          TAB 1: CHECK-IN CON LECTOR QR (ENTRADA A CLASES)
         ===================================================================== */}
      {activeTab === "checkin" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-5">
            <div className="rounded-2xl bg-black/40 border border-white/10 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <span className="inline-flex items-center gap-2 text-xs font-medium text-amber-200/90">
                  <Keyboard className="h-4 w-4" />
                  Escanea tu código QR de WhatsApp en el lector o cámara
                </span>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] text-stone-400">
                    <Volume2 className="h-3.5 w-3.5" /> Tono activo
                  </span>
                  <button
                    type="button"
                    onClick={() => setCameraActive((prev) => !prev)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition border ${
                      cameraActive
                        ? "bg-red-500/20 text-red-200 border-red-400/40"
                        : "bg-white/10 text-stone-100 border-white/15 hover:bg-white/20"
                    }`}
                  >
                    {cameraActive ? (
                      <>
                        <CameraOff className="h-3.5 w-3.5" /> Apagar Cámara
                      </>
                    ) : (
                      <>
                        <Camera className="h-3.5 w-3.5 text-amber-300" /> Usar
                        Cámara QR
                      </>
                    )}
                  </button>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleTriggerScan(manualToken);
                }}
                className="flex gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="Acerca tu QR al lector de la tablet (ej. SD-2026-R03-7741)..."
                  className="flex-1 rounded-xl bg-white/10 border border-white/15 px-4 py-3 text-sm text-white placeholder:text-stone-400 focus:outline-none focus:border-amber-400 font-mono"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold px-5 py-3 text-sm transition inline-flex items-center gap-2 shrink-0"
                >
                  <ScanLine className="h-4 w-4" />
                  Check-In
                </button>
              </form>

              {cameraError && (
                <p className="mt-3 text-xs text-amber-300 bg-amber-500/10 border border-amber-400/20 rounded-xl p-3">
                  {cameraError}
                </p>
              )}

              {cameraActive && (
                <div className="mt-4 relative overflow-hidden rounded-2xl border-2 border-amber-400/60 bg-black aspect-video max-h-64 mx-auto flex items-center justify-center">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    muted
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="absolute inset-8 border-2 border-dashed border-amber-300/80 rounded-2xl pointer-events-none flex items-center justify-center">
                    <span className="bg-black/70 text-amber-200 text-xs px-3 py-1 rounded-full">
                      Centra el código QR de tu WhatsApp aquí
                    </span>
                  </div>
                </div>
              )}
            </div>

            {lastResult ? (
              <div
                className={`rounded-3xl p-6 border-2 transition-all ${
                  lastResult.success
                    ? "bg-gradient-to-br from-emerald-950/90 via-[#152820] to-stone-950 border-emerald-400/60 shadow-lg"
                    : "bg-gradient-to-br from-rose-950/90 to-stone-950 border-rose-500/50"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 ${
                      lastResult.success
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40"
                        : "bg-rose-500/20 text-rose-300 border border-rose-400/40"
                    }`}
                  >
                    {lastResult.success ? (
                      <CheckCircle2 className="h-8 w-8" />
                    ) : (
                      <XCircle className="h-8 w-8" />
                    )}
                  </div>

                  <div className="flex-1">
                    <span className="text-xs uppercase tracking-widest font-semibold text-emerald-300">
                      {lastResult.success
                        ? lastResult.alreadyCheckedIn
                          ? "CHECK-IN YA REGISTRADO PREVIAMENTE"
                          : `ACCESO AUTORIZADO EN ${kioskLabel.toUpperCase()}`
                        : "CÓDIGO QR INVÁLIDO O NO ENCONTRADO"}
                    </span>
                    <h3 className="text-2xl font-bold text-white mt-1">
                      {lastResult.booking
                        ? `¡Bienvenida, ${lastResult.booking.clientName}!`
                        : "Verificación de Acceso"}
                    </h3>
                    <p className="text-sm text-stone-200 mt-1">
                      {lastResult.message}
                    </p>

                    {lastResult.booking && (
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="rounded-2xl bg-black/35 border border-white/10 p-3.5">
                          <p className="text-[10px] uppercase tracking-wider text-stone-400">
                            Tu Máquina / Tapete
                          </p>
                          <p className="text-xl font-extrabold text-amber-300 mt-0.5">
                            {lastResult.booking.spotId}
                          </p>
                          <p className="text-xs text-stone-300">
                            {lastResult.booking.spotLabel}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-black/35 border border-white/10 p-3.5">
                          <p className="text-[10px] uppercase tracking-wider text-stone-400">
                            Salón & Coach
                          </p>
                          <p className="text-sm font-bold text-white mt-0.5">
                            {lastResult.booking.roomName}
                          </p>
                          <p className="text-xs text-amber-200">
                            {lastResult.booking.startTime} hrs ·{" "}
                            {lastResult.booking.instructor}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-black/35 border border-white/10 p-3.5">
                          <p className="text-[10px] uppercase tracking-wider text-stone-400">
                            Tokens Restantes
                          </p>
                          <p className="text-xl font-bold text-emerald-300 mt-0.5">
                            {lastResult.client?.creditsRemaining ?? "—"} tokens
                          </p>
                          <p className="text-xs text-stone-300 truncate">
                            {lastResult.client?.activePackageName}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
                <ScanLine className="h-12 w-12 text-amber-300/70 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-white">
                  Lector QR Listo para Recibir Alumnas
                </h3>
                <p className="text-xs text-stone-400 max-w-md mx-auto mt-1">
                  Acerca el código QR de tu WhatsApp al lector de esta tablet
                  para ver tu máquina Reformer o tapete de Hot Pilates asignado.
                </p>
              </div>
            )}
          </div>

          {/* Right 5 cols: Arriving Clients in this branch */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-300" />
                    Alumnas por Entrar a Clase ({pendingBookings.length})
                  </h4>
                  <p className="text-[11px] text-stone-400">
                    Toca &quot;Escanear&quot; para registrar su entrada en este
                    Kiosco:
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAllBranchesSchedule((prev) => !prev)}
                  className="text-[10px] text-amber-300 underline"
                >
                  {showAllBranchesSchedule
                    ? "Solo esta sucursal"
                    : "Ver todas las sucursales"}
                </button>
              </div>

              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {pendingBookings.length === 0 ? (
                  <p className="text-xs text-stone-400 py-4 text-center">
                    Todas las alumnas de esta sucursal ya hicieron check-in.
                  </p>
                ) : (
                  pendingBookings.map((bk: Booking) => (
                    <div
                      key={bk.id}
                      className="flex items-center justify-between gap-3 rounded-xl bg-black/35 border border-white/10 p-3 hover:border-amber-400/40 transition"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-white truncate">
                            {bk.clientName}
                          </span>
                          <span className="rounded bg-amber-400/20 text-amber-300 font-mono text-[10px] px-1.5 py-0.5 font-bold">
                            {bk.spotId}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-300 truncate">
                          {bk.sessionTitle} ({bk.startTime} hrs)
                        </p>
                        <p className="text-[10px] font-mono text-stone-400">
                          {bk.branchName} · {bk.qrToken}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleTriggerScan(bk.qrToken)}
                        className="shrink-0 rounded-xl bg-amber-400/90 hover:bg-amber-300 text-stone-950 font-bold text-xs px-3 py-2 inline-flex items-center gap-1.5 transition"
                      >
                        <QrCode className="h-3.5 w-3.5" />
                        Check-In
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <h4 className="text-sm font-bold text-emerald-300 flex items-center gap-2 mb-2.5">
                <UserCheck className="h-4 w-4" />
                En Clase Ahora ({checkedInBookings.length})
              </h4>
              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {checkedInBookings.map((bk) => (
                  <div
                    key={bk.id}
                    className="flex items-center justify-between rounded-xl bg-emerald-950/30 border border-emerald-500/25 px-3 py-2 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      {bk.discipline === "hot_pilates" ? (
                        <Flame className="h-3.5 w-3.5 text-orange-400" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                      )}
                      <div>
                        <p className="font-semibold text-white">
                          {bk.clientName} ·{" "}
                          <span className="text-amber-300">{bk.spotId}</span>
                        </p>
                        <p className="text-[10px] text-stone-400">
                          {bk.checkedInKioskLabel || bk.branchName}
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-500/20 text-emerald-300 px-2 py-0.5 text-[10px] font-semibold">
                      Adentro ✓
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: PRÓXIMOS HORARIOS & RESERVA EN EL KIOSCO
         ===================================================================== */}
      {activeTab === "horarios" && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold text-amber-200">
                Selecciona tu perfil de Alumna:
              </span>
              <select
                value={activeClient?.id}
                onChange={(e) => {
                  setSelectedClientId(e.target.value);
                  setKioskBookedPass(null);
                  setKioskFeedback(null);
                }}
                className="rounded-xl bg-black/60 border border-white/20 px-3 py-2 text-xs font-bold text-white"
              >
                {db.clients.map((c) => (
                  <option key={c.id} value={c.id} className="bg-stone-900">
                    {c.name} ({c.creditsRemaining} tokens disponibles)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 text-xs text-stone-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAllBranchesSchedule}
                  onChange={(e) => setShowAllBranchesSchedule(e.target.checked)}
                  className="rounded"
                />
                Mostrar horarios de todas las sucursales Stiliza & Devotion
              </label>
            </div>
          </div>

          {/* Selector de Día (Lunes a Domingo) en Kiosco */}
          <div className="flex flex-wrap items-center gap-1.5">
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
                onClick={() => setKioskDayFilter(day)}
                className={`rounded-xl px-3.5 py-2 text-xs font-extrabold transition ${
                  kioskDayFilter === day
                    ? "bg-amber-400 text-stone-950 shadow-sm"
                    : "bg-white/5 hover:bg-white/10 text-stone-300 border border-white/10"
                }`}
              >
                {day}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {branchSessions.map((ses) => {
              const isSelected = ses.id === activeSession?.id;
              const room = db.rooms.find((r) => r.id === ses.roomId);
              const bookedCount = db.bookings.filter(
                (b) => b.sessionId === ses.id && b.status !== "cancelada"
              ).length;
              const freeSpots = (room?.spots.length || 12) - bookedCount;

              return (
                <button
                  key={ses.id}
                  type="button"
                  onClick={() => {
                    setSelectedSessionId(ses.id);
                    setSelectedSpotId(null);
                  }}
                  className={`rounded-2xl p-4 text-left border transition ${
                    isSelected
                      ? "bg-amber-400 text-stone-950 border-amber-300 shadow-lg"
                      : "bg-white/5 hover:bg-white/10 text-white border-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-xs font-extrabold px-2 py-0.5 rounded-lg ${
                        isSelected
                          ? "bg-stone-950 text-amber-300"
                          : "bg-white/15 text-amber-200"
                      }`}
                    >
                      {ses.startTime} hrs
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                      {ses.brand} · {ses.dayOfWeek || "Martes"}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm mt-2">{ses.title}</h4>
                  <p
                    className={`text-xs mt-0.5 ${
                      isSelected ? "text-stone-800" : "text-stone-400"
                    }`}
                  >
                    {ses.instructor} · {ses.branchName}
                  </p>
                  <div className="mt-2 pt-2 border-t border-current/15 flex items-center justify-between text-xs font-bold">
                    <span>
                      {ses.discipline === "hot_pilates"
                        ? "🔥 Hot Pilates 38°C"
                        : "✨ Reformer"}
                    </span>
                    <span>{freeSpots} lugares libres</span>
                  </div>
                </button>
              );
            })}
          </div>

          {activeSession && activeRoom && (
            <div className="text-stone-900">
              <StudioSpotMap
                room={activeRoom}
                session={activeSession}
                bookings={db.bookings}
                selectedSpotId={selectedSpotId}
                onSelectSpot={setSelectedSpotId}
                preferredSpotId={activeClient?.preferredSpot}
              />
            </div>
          )}

          {selectedSpotId && activeSession && activeClient && (
            <div className="rounded-2xl bg-amber-400 text-stone-950 p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
              <div>
                <p className="text-[10px] uppercase tracking-widest font-extrabold">
                  Reserva Directa en Kiosco (1 Token)
                </p>
                <h4 className="text-lg font-extrabold">
                  {activeSession.title} ({activeSession.startTime} hrs) — Lugar{" "}
                  {selectedSpotId}
                </h4>
                <p className="text-xs font-medium">
                  Alumna: <strong>{activeClient.name}</strong> (Saldo actual:{" "}
                  {activeClient.creditsRemaining} tokens)
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const res = await onBookSpot({
                    clientId: activeClient.id,
                    sessionId: activeSession.id,
                    spotId: selectedSpotId,
                  });
                  if (res.success && res.booking) {
                    setKioskBookedPass(res.booking);
                    setSelectedSpotId(null);
                    setKioskFeedback(
                      `✅ ¡Lugar ${res.booking.spotId} reservado! Se envió tu código QR por WhatsApp y también puedes hacer Check-in aquí mismo.`
                    );
                  } else {
                    setKioskFeedback(`⚠️ ${res.error}`);
                  }
                }}
                className="rounded-xl bg-stone-950 hover:bg-stone-800 text-amber-300 font-extrabold text-xs sm:text-sm px-6 py-3.5 transition shadow"
              >
                Confirmar {selectedSpotId} con 1 Token
              </button>
            </div>
          )}

          {kioskFeedback && (
            <div className="rounded-2xl bg-white/10 border border-amber-400/40 p-4 text-xs sm:text-sm text-amber-200">
              {kioskFeedback}
            </div>
          )}

          {kioskBookedPass && (
            <div className="max-w-lg mx-auto">
              <QRCodePassCard
                booking={kioskBookedPass}
                onSimulateScan={(token) => {
                  setActiveTab("checkin");
                  handleTriggerScan(token);
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 3: PAQUETES Y COMPRA DE TOKENS EN EL KIOSCO
         ===================================================================== */}
      {activeTab === "paquetes" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold text-amber-200">
                Alumna que compra tokens:
              </span>
              <select
                value={activeClient?.id}
                onChange={(e) => {
                  setSelectedClientId(e.target.value);
                  setPurchaseSuccessMsg(null);
                }}
                className="rounded-xl bg-black/60 border border-white/20 px-3 py-2 text-xs font-bold text-white"
              >
                {db.clients.map((c) => (
                  <option key={c.id} value={c.id} className="bg-stone-900">
                    {c.name} — Saldo actual: {c.creditsRemaining} tokens
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setShowNewAlumnaForm((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 border border-amber-300/40 text-amber-200 font-bold text-xs px-4 py-2 transition"
            >
              <UserPlus className="h-4 w-4" />
              ¿Eres nueva en Stiliza / Devotion? Regístrate aquí
            </button>
          </div>

          {showNewAlumnaForm && onCreateClientInKiosk && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newAlumnaName.trim()) return;
                await onCreateClientInKiosk({
                  name: newAlumnaName,
                  phone: newAlumnaPhone,
                  email: "kiosco@stilizadevotion.com",
                  packageId: newAlumnaPkg,
                  preferredSpot: "R-04",
                  homeBranchName: branchName || "Stiliza · Polanco Flagship",
                });
                setPurchaseSuccessMsg(
                  `🎉 ¡Bienvenida ${newAlumnaName}! Tu cuenta y tus tokens ya están activos.`
                );
                setNewAlumnaName("");
                setShowNewAlumnaForm(false);
              }}
              className="rounded-2xl bg-white/10 border border-amber-400/40 p-5 space-y-4"
            >
              <h4 className="font-bold text-sm text-amber-300">
                Registro Rápido de Nueva Alumna en Kiosco + Paquete Inicial
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  required
                  value={newAlumnaName}
                  onChange={(e) => setNewAlumnaName(e.target.value)}
                  placeholder="Tu Nombre Completo"
                  className="rounded-xl bg-black/50 border border-white/20 px-3 py-2.5 text-xs text-white"
                />
                <input
                  type="text"
                  required
                  value={newAlumnaPhone}
                  onChange={(e) => setNewAlumnaPhone(e.target.value)}
                  placeholder="Tu WhatsApp (+52 ...)"
                  className="rounded-xl bg-black/50 border border-white/20 px-3 py-2.5 text-xs text-white font-mono"
                />
                <select
                  value={newAlumnaPkg}
                  onChange={(e) => setNewAlumnaPkg(e.target.value)}
                  className="rounded-xl bg-black/50 border border-white/20 px-3 py-2.5 text-xs text-white"
                >
                  {db.packages.map((p) => (
                    <option key={p.id} value={p.id} className="bg-stone-900">
                      {p.name} (${p.priceMXN})
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="rounded-xl bg-amber-400 text-stone-950 font-extrabold text-xs px-5 py-2.5"
              >
                Crear Cuenta y Activar Tokens
              </button>
            </form>
          )}

          {purchaseSuccessMsg && (
            <div className="rounded-2xl bg-emerald-500/20 border border-emerald-400/50 p-4 text-sm font-bold text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              {purchaseSuccessMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {db.packages.map((pkg) => (
              <div
                key={pkg.id}
                className="rounded-3xl bg-white/5 border border-white/15 hover:border-amber-400/60 p-5 flex flex-col justify-between transition"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-extrabold px-2.5 py-0.5">
                      {pkg.badge || "Paquete Oficial"}
                    </span>
                    <span className="text-[11px] text-stone-400">
                      Vigencia {pkg.validityDays} días
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-white">
                    {pkg.name}
                  </h3>
                  <p className="text-3xl font-black text-amber-300 mt-3">
                    ${pkg.priceMXN.toLocaleString("es-MX")}{" "}
                    <span className="text-xs font-normal text-stone-400">
                      MXN
                    </span>
                  </p>
                  <p className="text-xs text-emerald-300 font-semibold mt-1">
                    +{pkg.credits} Tokens para Reformer & Hot Pilates
                  </p>
                  {pkg.promoTag && (
                    <p className="text-[11px] text-stone-400 mt-2">
                      ✨ {pkg.promoTag}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    if (!activeClient) return;
                    await onBuyPackage(activeClient.id, pkg.id);
                    playChime(true);
                    setPurchaseSuccessMsg(
                      `✅ ¡Compra exitosa en ${kioskLabel}! Se abonaron +${pkg.credits} tokens a ${activeClient.name}.`
                    );
                  }}
                  className="mt-5 w-full rounded-2xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-extrabold text-xs py-3 transition shadow-md"
                >
                  Comprar +{pkg.credits} Tokens Ahora
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: CARTELERA DE EVENTOS ESPECIALES, RETOS Y PROMOCIONES
         ===================================================================== */}
      {activeTab === "eventos" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Gift className="h-5 w-5 text-amber-300" />
                Próximos Eventos, Clases Especiales y Promociones
              </h3>
              <p className="text-xs text-stone-400">
                Experiencias exclusivas en las sucursales Stiliza Reformer y
                Devotion Hot Pilates
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {branchEvents.map((ev) => (
              <div
                key={ev.id}
                className="rounded-3xl bg-gradient-to-br from-white/10 to-white/[0.03] border border-white/15 p-5 flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full bg-amber-400/20 border border-amber-300/30 text-amber-200 text-[11px] font-bold px-3 py-0.5">
                      {ev.highlightBadge}
                    </span>
                    <span className="text-xs font-semibold text-emerald-300">
                      📅 {ev.dateLabel}
                    </span>
                  </div>
                  <h4 className="text-lg font-extrabold text-white mt-2.5">
                    {ev.title}
                  </h4>
                  <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                    {ev.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-stone-400">
                      Sucursal
                    </p>
                    <p className="text-xs font-bold text-amber-200">
                      {ev.branchName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider text-stone-400">
                      Acceso / Valor
                    </p>
                    <p className="text-xs font-extrabold text-white">
                      {ev.priceText}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
