"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Booking } from "@/types/crm";
import {
  CheckCircle2,
  Clock,
  Flame,
  QrCode,
  Sparkles,
  ScanLine,
  Copy,
  Check,
} from "lucide-react";

interface QRCodePassCardProps {
  booking: Booking;
  compact?: boolean;
  onSimulateScan?: (qrToken: string) => void;
}

export function QRCodePassCard({
  booking,
  compact = false,
  onSimulateScan,
}: QRCodePassCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let mounted = true;
    QRCode.toDataURL(booking.qrToken, {
      width: compact ? 150 : 210,
      margin: 1,
      color: {
        dark: "#1B1512",
        light: "#FDFBF9",
      },
    })
      .then((url) => {
        if (mounted) setQrDataUrl(url);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [booking.qrToken, compact]);

  const isHot = booking.discipline === "hot_pilates";
  const isCheckedIn = booking.status === "asistio";

  const handleCopy = () => {
    navigator.clipboard.writeText(booking.qrToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border transition-all ${
        isCheckedIn
          ? "border-emerald-500/40 bg-gradient-to-br from-emerald-950/90 via-stone-900 to-stone-950 text-stone-100"
          : isHot
          ? "border-amber-500/30 bg-gradient-to-br from-[#2B1914] via-[#1E1411] to-[#150E0C] text-stone-100"
          : "border-stone-700/60 bg-gradient-to-br from-[#231D19] via-[#1B1613] to-[#120F0D] text-stone-100"
      } shadow-xl ${compact ? "p-3.5" : "p-5"}`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wider uppercase ${
              isHot
                ? "bg-orange-500/20 text-orange-300 border border-orange-400/30"
                : "bg-amber-200/15 text-amber-200 border border-amber-200/25"
            }`}
          >
            {isHot ? (
              <>
                <Flame className="h-3 w-3 text-orange-400" /> Hot Pilates 38°C
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3 text-amber-300" /> Pilates Reformer
              </>
            )}
          </span>
        </div>

        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
            isCheckedIn
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
              : "bg-white/10 text-stone-200"
          }`}
        >
          {isCheckedIn ? (
            <>
              <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Check-in OK
            </>
          ) : (
            <>
              <Clock className="h-3 w-3 text-amber-300" /> Pase Activo
            </>
          )}
        </span>
      </div>

      {/* Main Content */}
      <div
        className={`mt-3 flex ${
          compact ? "flex-col sm:flex-row" : "flex-col md:flex-row"
        } items-center gap-4`}
      >
        {/* QR Image Box */}
        <div className="relative shrink-0 rounded-xl bg-[#FDFBF9] p-2.5 shadow-inner border border-stone-200">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`QR ${booking.qrToken}`}
              className={compact ? "h-28 w-28" : "h-36 w-36"}
            />
          ) : (
            <div
              className={`flex items-center justify-center bg-stone-100 text-stone-400 ${
                compact ? "h-28 w-28" : "h-36 w-36"
              }`}
            >
              <QrCode className="h-8 w-8 animate-pulse" />
            </div>
          )}
          <div className="mt-1 text-center font-mono text-[10px] font-bold tracking-wider text-stone-800">
            {booking.qrToken}
          </div>
        </div>

        {/* Details */}
        <div className="flex-1 space-y-2 text-left w-full">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-stone-400">
              Alumna / Cliente
            </p>
            <p className="text-sm font-semibold text-white">
              {booking.clientName}
            </p>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-widest text-stone-400">
              Clase & Horario
            </p>
            <p className="text-sm font-medium text-amber-100">
              {booking.sessionTitle}
            </p>
            <p className="text-xs text-stone-300">
              {booking.date} ·{" "}
              <span className="font-semibold text-white">
                {booking.startTime} hrs
              </span>{" "}
              · {booking.instructor}
            </p>
          </div>

          {/* Highlighted Machine / Mat Spot */}
          <div className="rounded-xl bg-white/10 px-3 py-2 border border-white/10 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-stone-300">
                Lugar Asignado ({booking.roomName})
              </p>
              <p className="text-sm font-bold text-amber-300">
                {booking.spotId} — {booking.spotLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              title="Copiar token QR"
              className="rounded-lg bg-white/10 p-1.5 text-stone-200 hover:bg-white/20 transition"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          {onSimulateScan && !isCheckedIn && (
            <button
              type="button"
              onClick={() => onSimulateScan(booking.qrToken)}
              className="w-full mt-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-400/90 hover:bg-amber-300 text-stone-950 font-semibold text-xs py-2 px-3 transition shadow-sm"
            >
              <ScanLine className="h-3.5 w-3.5" />
              Probar Escaneo en Tablet Kiosco Ahora
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
