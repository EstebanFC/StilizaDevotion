"use client";

import React from "react";
import { Booking, ClassSession, SpotConfig, StudioRoom } from "@/types/crm";
import {
  CheckCircle2,
  Flame,
  Lock,
  Sparkles,
  Star,
  UserCheck,
  Wrench,
} from "lucide-react";

interface StudioSpotMapProps {
  room: StudioRoom;
  session: ClassSession;
  bookings: Booking[];
  selectedSpotId: string | null;
  onSelectSpot: (spotId: string) => void;
  preferredSpotId?: string;
  isAdminView?: boolean;
  onToggleMaintenance?: (roomId: string, spotId: string) => void;
}

export function StudioSpotMap({
  room,
  session,
  bookings,
  selectedSpotId,
  onSelectSpot,
  preferredSpotId,
  isAdminView = false,
  onToggleMaintenance,
}: StudioSpotMapProps) {
  const sessionBookings = bookings.filter(
    (b) => b.sessionId === session.id && b.status !== "cancelada"
  );

  const bookingBySpot = new Map<string, Booking>();
  sessionBookings.forEach((b) => {
    bookingBySpot.set(b.spotId, b);
  });

  const isHot = room.discipline === "hot_pilates";

  const renderSpotCard = (spot: SpotConfig) => {
    const booking = bookingBySpot.get(spot.id);
    const isOccupied = Boolean(booking);
    const isCheckedIn = booking?.status === "asistio";
    const isSelected = selectedSpotId === spot.id;
    const isPreferred = preferredSpotId === spot.id;
    const isMaintenance = spot.status === "maintenance";

    const disabled = (isOccupied || isMaintenance) && !isAdminView;

    return (
      <div key={spot.id} className="relative group">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!isOccupied && !isMaintenance) {
              onSelectSpot(spot.id);
            } else if (isAdminView) {
              onSelectSpot(spot.id);
            }
          }}
          className={`w-full relative rounded-2xl p-3 transition-all duration-200 border text-left flex flex-col justify-between ${
            spot.type === "reformer_machine" ? "min-h-[126px]" : "min-h-[108px]"
          } ${
            isMaintenance
              ? "bg-stone-200/70 border-stone-300 text-stone-400 cursor-not-allowed opacity-75"
              : isSelected
              ? isHot
                ? "bg-gradient-to-br from-orange-600 to-amber-700 text-white border-orange-400 shadow-lg shadow-orange-900/20 scale-[1.02]"
                : "bg-gradient-to-br from-[#2A211C] to-[#46362C] text-white border-amber-400 shadow-lg shadow-stone-900/20 scale-[1.02]"
              : isOccupied
              ? isCheckedIn
                ? "bg-emerald-50 border-emerald-400/80 text-emerald-950"
                : "bg-stone-200/90 border-stone-300/90 text-stone-600"
              : "bg-white hover:bg-[#FAF6F0] border-stone-200/90 hover:border-amber-600/60 text-stone-800 shadow-sm hover:shadow"
          }`}
        >
          {/* Top Row: Spot ID + Badges */}
          <div className="flex items-center justify-between w-full gap-1">
            <span
              className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md ${
                isSelected
                  ? "bg-white/20 text-white"
                  : isCheckedIn
                  ? "bg-emerald-600 text-white"
                  : isOccupied
                  ? "bg-stone-300 text-stone-700"
                  : isHot
                  ? "bg-orange-100 text-orange-900"
                  : "bg-stone-100 text-stone-800"
              }`}
            >
              {spot.id}
            </span>

            <div className="flex items-center gap-1">
              {isPreferred && !isOccupied && (
                <span
                  title="Lugar favorito de la alumna"
                  className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800"
                >
                  <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-600" />
                  Fav
                </span>
              )}
              {isCheckedIn && (
                <span
                  title="Check-in QR escaneado en tablet"
                  className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800"
                >
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  En clase
                </span>
              )}
            </div>
          </div>

          {/* Visual Silhouette of Reformer Machine or Hot Pilates Mat */}
          <div className="my-2 flex items-center justify-center">
            {spot.type === "reformer_machine" ? (
              /* Reformer Carriage Visual */
              <div
                className={`w-full rounded-lg border px-2 py-1.5 flex items-center justify-between gap-1.5 ${
                  isSelected
                    ? "border-white/30 bg-white/10"
                    : isOccupied
                    ? "border-stone-300 bg-stone-100/70"
                    : "border-stone-200 bg-[#F7F3EE]"
                }`}
              >
                {/* Footbar + Springs */}
                <div className="flex items-center gap-1">
                  <div
                    className={`h-6 w-1 rounded-full ${
                      isSelected ? "bg-amber-300" : "bg-stone-400"
                    }`}
                  />
                  <div className="flex flex-col gap-0.5">
                    <div className="h-0.5 w-2.5 bg-amber-600/60 rounded" />
                    <div className="h-0.5 w-2.5 bg-red-600/60 rounded" />
                    <div className="h-0.5 w-2.5 bg-emerald-600/60 rounded" />
                  </div>
                </div>
                {/* Padded Carriage */}
                <div
                  className={`flex-1 h-6 rounded-md flex items-center justify-center text-[10px] font-medium ${
                    isSelected
                      ? "bg-white/20 text-amber-100"
                      : isOccupied
                      ? "bg-stone-300/70 text-stone-600"
                      : "bg-[#EAE0D5] text-stone-700"
                  }`}
                >
                  Reformer
                </div>
                {/* Headrest */}
                <div
                  className={`h-4 w-2 rounded-sm ${
                    isSelected ? "bg-amber-200" : "bg-stone-400/70"
                  }`}
                />
              </div>
            ) : (
              /* Hot Pilates Mat Visual */
              <div
                className={`w-full rounded-lg border-2 border-dashed px-2.5 py-2 flex items-center justify-between ${
                  isSelected
                    ? "border-orange-200/50 bg-white/15"
                    : isOccupied
                    ? "border-stone-300 bg-stone-100/70"
                    : "border-orange-300/70 bg-orange-50/50"
                }`}
              >
                <span className="text-[10px] font-medium tracking-wide uppercase opacity-80">
                  Hot Mat 38°
                </span>
                <Flame
                  className={`h-3.5 w-3.5 ${
                    isSelected
                      ? "text-amber-200"
                      : isOccupied
                      ? "text-stone-400"
                      : "text-orange-500"
                  }`}
                />
              </div>
            )}
          </div>

          {/* Bottom Row: Zone or Occupant */}
          <div className="flex items-center justify-between text-[11px]">
            {isMaintenance ? (
              <span className="inline-flex items-center gap-1 text-stone-500 font-medium">
                <Wrench className="h-3 w-3" /> Mantenimiento
              </span>
            ) : isOccupied && booking ? (
              <span className="inline-flex items-center gap-1 font-medium truncate">
                {isCheckedIn ? (
                  <UserCheck className="h-3 w-3 text-emerald-600 shrink-0" />
                ) : (
                  <Lock className="h-3 w-3 opacity-60 shrink-0" />
                )}
                <span className="truncate">
                  {isAdminView
                    ? booking.clientName.split(" ")[0] +
                      " " +
                      (booking.clientName.split(" ")[1]?.[0] || "") +
                      "."
                    : "Ocupado"}
                </span>
              </span>
            ) : (
              <span
                className={`truncate ${
                  isSelected ? "text-amber-100 font-medium" : "text-stone-500"
                }`}
              >
                {spot.zone}
              </span>
            )}

            {!isOccupied && !isMaintenance && (
              <span
                className={`text-[10px] font-semibold ${
                  isSelected ? "text-white" : "text-emerald-700"
                }`}
              >
                {isSelected ? "Elegido ✓" : "Libre"}
              </span>
            )}
          </div>
        </button>

        {/* Admin quick toggle maintenance button */}
        {isAdminView && onToggleMaintenance && !isOccupied && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleMaintenance(room.id, spot.id);
            }}
            title="Cambiar estado de mantenimiento"
            className="opacity-0 group-hover:opacity-100 transition absolute -top-2 -right-2 rounded-full bg-stone-800 text-white p-1.5 shadow-md hover:bg-stone-700"
          >
            <Wrench className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  };

  const occupiedCount = sessionBookings.length;
  const checkedInCount = sessionBookings.filter(
    (b) => b.status === "asistio"
  ).length;
  const freeCount =
    room.spots.filter((s) => s.status !== "maintenance").length - occupiedCount;

  return (
    <div className="rounded-3xl border border-stone-200/90 bg-[#FAF7F2] p-4 sm:p-6 shadow-sm">
      {/* Studio Room Header & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-200/80">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                isHot
                  ? "bg-orange-100 text-orange-800 border border-orange-200"
                  : "bg-stone-200/80 text-stone-800"
              }`}
            >
              {isHot ? (
                <>
                  <Flame className="h-3.5 w-3.5 text-orange-600" /> Hot Pilates
                  Mat
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 text-amber-700" /> Pilates
                  Reformer
                </>
              )}
            </span>
            <span className="text-xs text-stone-500 font-medium">
              {room.temperature}
            </span>
          </div>
          <h3 className="mt-1 text-lg font-bold text-stone-900">
            {room.name} — Mapa de{" "}
            {isHot ? "Tapetes (Mats)" : "Máquinas Reformer"}
          </h3>
        </div>

        {/* Status counters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 border border-stone-200 text-stone-700 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {freeCount} Libres
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 border border-stone-200 text-stone-700 font-medium">
            <span className="h-2 w-2 rounded-full bg-stone-400" />
            {occupiedCount} Reservados
          </span>
          {checkedInCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 border border-emerald-200 text-emerald-800 font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              {checkedInCount} con Check-in QR
            </span>
          )}
        </div>
      </div>

      {/* Front Mirror & Instructor Podium Indicator */}
      <div className="my-5">
        <div
          className={`w-full rounded-xl py-2.5 px-4 text-center text-xs font-semibold tracking-widest uppercase border ${
            isHot
              ? "bg-gradient-to-r from-orange-950/90 via-amber-900/90 to-orange-950/90 text-orange-100 border-orange-700/40"
              : "bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 text-amber-100 border-stone-700"
          } shadow-inner`}
        >
          🪞 Frente al Espejo Principal · Tarima de {session.instructor}{" "}
          {isHot ? "· 🔥 Paneles Infrarrojos 38.5°C" : ""}
        </div>
      </div>

      {/* Spot Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {room.spots.map((spot) => renderSpotCard(spot))}
      </div>
    </div>
  );
}
