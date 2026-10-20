"use client";

import React, { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Booking, CRMDatabaseState, KioskCheckInResult } from "@/types/crm";
import {
  Camera,
  CameraOff,
  CheckCircle2,
  Flame,
  Keyboard,
  QrCode,
  ScanLine,
  Sparkles,
  Volume2,
  XCircle,
  UserCheck,
  Clock,
} from "lucide-react";

interface TabletKioskViewProps {
  db: CRMDatabaseState;
  onScanQR: (qrToken: string) => Promise<KioskCheckInResult>;
  externalTriggeredToken?: string | null;
  onClearExternalToken?: () => void;
}

export function TabletKioskView({
  db,
  onScanQR,
  externalTriggeredToken,
  onClearExternalToken,
}: TabletKioskViewProps) {
  const [manualToken, setManualToken] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<KioskCheckInResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>("18:25");

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

  // Play a pleasant boutique studio chime using Web Audio API
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
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.14); // A5
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
      const res = await onScanQR(token.trim());
      setLastResult(res);
      playChime(res.success);
      setManualToken("");
    } finally {
      setIsProcessing(false);
      inputRef.current?.focus();
    }
  };

  // Handle external simulated scan from another tab/card
  useEffect(() => {
    if (externalTriggeredToken) {
      handleTriggerScan(externalTriggeredToken);
      onClearExternalToken?.();
    }
  }, [externalTriggeredToken]);

  // Camera QR scanning loop with jsQR
  useEffect(() => {
    let stream: MediaStream | null = null;
    let rafId: number | null = null;

    if (cameraActive) {
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
            "No se detectó cámara web o permiso denegado. Puedes usar el lector láser USB/Bluetooth o probar con los pases QR de abajo."
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
  }, [cameraActive]);

  const pendingBookings = db.bookings.filter((b) => b.status === "confirmada");
  const checkedInBookings = db.bookings.filter((b) => b.status === "asistio");

  return (
    <div className="rounded-3xl bg-gradient-to-br from-[#171311] via-[#211A16] to-[#120E0C] text-stone-100 p-5 sm:p-8 shadow-2xl border border-stone-800">
      {/* Kiosk Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-amber-400/15 border border-amber-300/30 flex items-center justify-center">
            <QrCode className="h-6 w-6 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300 border border-emerald-500/30">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                MODO KIOSCO TABLET ACTIVO
              </span>
              <span className="text-xs text-stone-400">
                Frontdesk Autónomo · Stiliza Devotion
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-0.5">
              Bienvenida a Stiliza Devotion — Escanea tu QR de WhatsApp
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs uppercase tracking-widest text-stone-400">
              Hora del Estudio
            </p>
            <p className="text-xl font-mono font-bold text-amber-200">
              {currentTime} hrs
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCameraActive((prev) => !prev)}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-semibold transition border ${
              cameraActive
                ? "bg-red-500/20 text-red-200 border-red-400/40 hover:bg-red-500/30"
                : "bg-white/10 text-stone-100 border-white/15 hover:bg-white/20"
            }`}
          >
            {cameraActive ? (
              <>
                <CameraOff className="h-4 w-4" /> Detener Cámara
              </>
            ) : (
              <>
                <Camera className="h-4 w-4 text-amber-300" /> Activar Cámara QR
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Kiosk Grid */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 cols: Scanner Viewport + Welcome Screen Feedback */}
        <div className="lg:col-span-7 space-y-5">
          {/* USB / Bluetooth Hardware QR Scanner Input + Camera Viewport */}
          <div className="rounded-2xl bg-black/40 border border-white/10 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-2 text-xs font-medium text-amber-200/90">
                <Keyboard className="h-4 w-4" />
                Lector Físico QR (USB/Bluetooth) o Captura Directa
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-stone-400">
                <Volume2 className="h-3.5 w-3.5" /> Sonido de recepción activo
              </span>
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
                placeholder="Acerca tu código QR al lector de la tablet (ej. SD-2026-R03-7741)..."
                className="flex-1 rounded-xl bg-white/10 border border-white/15 px-4 py-3 text-sm text-white placeholder:text-stone-400 focus:outline-none focus:border-amber-400 font-mono"
                autoFocus
              />
              <button
                type="submit"
                disabled={isProcessing}
                className="rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold px-5 py-3 text-sm transition inline-flex items-center gap-2 shrink-0"
              >
                <ScanLine className="h-4 w-4" />
                Validar QR
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

          {/* Kiosk Big Check-In Display Result */}
          {lastResult ? (
            <div
              className={`rounded-3xl p-6 border-2 transition-all ${
                lastResult.success
                  ? "bg-gradient-to-br from-emerald-950/90 via-[#152820] to-stone-950 border-emerald-400/60 shadow-lg shadow-emerald-950/50"
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
                        : "ACCESO AUTORIZADO · BIENVENIDA A CLASE"
                      : "CÓDIGO QR INVÁLIDO O NO ENCONTRADO"}
                  </span>
                  <h3 className="text-2xl font-bold text-white mt-1">
                    {lastResult.booking
                      ? `¡Hola, ${lastResult.booking.clientName}!`
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
                          Salón & Disciplina
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
                          Saldo de Paquete
                        </p>
                        <p className="text-xl font-bold text-emerald-300 mt-0.5">
                          {lastResult.client?.creditsRemaining ?? "—"} clases
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
                Pantalla de Espera en Recepción
              </h3>
              <p className="text-xs text-stone-400 max-w-md mx-auto mt-1">
                Cuando una alumna llegue al estudio y escanee el código QR que el
                Bot IA le envió por WhatsApp, aquí aparecerá su bienvenida con el
                número exacto de su Reformer o Tapete.
              </p>
            </div>
          )}
        </div>

        {/* Right 5 cols: Quick Simulator of Arriving Clients & Live Check-in Log */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-300" />
                  Alumnas por Llegar (Simular Escaneo QR)
                </h4>
                <p className="text-[11px] text-stone-400">
                  Haz clic en cualquier pase para simular que la alumna acerca su
                  celular al lector de la tablet:
                </p>
              </div>
              <span className="rounded-full bg-amber-400/20 text-amber-200 text-xs font-bold px-2.5 py-0.5">
                {pendingBookings.length} pendientes
              </span>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {pendingBookings.length === 0 ? (
                <p className="text-xs text-stone-400 py-4 text-center">
                  ¡Todas las reservas confirmadas ya hicieron check-in!
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
                        Token: {bk.qrToken}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleTriggerScan(bk.qrToken)}
                      className="shrink-0 rounded-xl bg-amber-400/90 hover:bg-amber-300 text-stone-950 font-bold text-xs px-3 py-2 inline-flex items-center gap-1.5 transition"
                    >
                      <QrCode className="h-3.5 w-3.5" />
                      Escanear
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Checked-in list */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                Asistencias Registradas Hoy ({checkedInBookings.length})
              </h4>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
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
                        {bk.sessionTitle} ({bk.startTime})
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-500/20 text-emerald-300 px-2 py-0.5 text-[10px] font-semibold">
                    En estudio ✓
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
