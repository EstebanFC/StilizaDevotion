"use client";

import React, { useState } from "react";
import {
  Booking,
  ClassSession,
  RoomLayoutCell,
  SpotConfig,
  StudioRoom,
} from "@/types/crm";
import {
  CheckCircle2,
  Flame,
  LayoutGrid,
  Lock,
  Mic,
  Settings,
  Sparkles,
  Star,
  UserCheck,
  Wrench,
} from "lucide-react";
import { StudioRoomMapEditorModal } from "@/components/StudioRoomMapEditorModal";

interface StudioSpotMapProps {
  room: StudioRoom;
  session: ClassSession;
  bookings: Booking[];
  selectedSpotId: string | null;
  onSelectSpot: (spotId: string) => void;
  preferredSpotId?: string;
  isAdminView?: boolean;
  onToggleMaintenance?: (roomId: string, spotId: string) => void;
  onUpdateRoomLayout?: (updatedRoom: {
    roomId: string;
    name: string;
    temperature: string;
    spots: SpotConfig[];
    layoutRows: RoomLayoutCell[][];
  }) => Promise<void>;
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
  onUpdateRoomLayout,
}: StudioSpotMapProps) {
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const sessionBookings = bookings.filter(
    (b) => b.sessionId === session.id && b.status !== "cancelada"
  );

  const bookingBySpot = new Map<string, Booking>();
  sessionBookings.forEach((b) => {
    bookingBySpot.set(b.spotId, b);
  });

  const spotById = new Map<string, SpotConfig>();
  room.spots.forEach((s) => {
    spotById.set(s.id, s);
  });

  const isHot = room.discipline === "hot_pilates";

  const renderCoachCell = (key: string) => (
    <div
      key={key}
      className={`rounded-2xl p-2 sm:p-2.5 border-2 flex flex-col items-center justify-center text-center min-h-[96px] sm:min-h-[108px] shadow-md transition-all ${
        isHot
          ? "bg-gradient-to-br from-orange-950 via-[#2B1610] to-stone-950 border-orange-400/70 text-orange-100"
          : "bg-gradient-to-br from-stone-900 to-stone-950 border-amber-400/70 text-amber-100"
      }`}
    >
      <div className="h-7 w-7 rounded-full bg-amber-400/20 border border-amber-300/40 flex items-center justify-center mb-1">
        <Mic className="h-3.5 w-3.5 text-amber-300" />
      </div>
      <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-amber-300">
        COACH
      </span>
      <span className="text-[9px] sm:text-[10px] text-stone-300 truncate max-w-full mt-0.5 px-1">
        {session.instructor}
      </span>
    </div>
  );

  const renderSpotCard = (spot: SpotConfig) => {
    const booking = bookingBySpot.get(spot.id);
    const isOccupied = Boolean(booking);
    const isCheckedIn = booking?.status === "asistio";
    const isSelected = selectedSpotId === spot.id;
    const isPreferred = preferredSpotId === spot.id;
    const isMaintenance = spot.status === "maintenance";

    const disabled = (isOccupied || isMaintenance) && !isAdminView;

    return (
      <div key={spot.id} className="relative group min-w-0">
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
          className={`w-full relative rounded-2xl p-2 sm:p-2.5 transition-all duration-200 border text-left flex flex-col justify-between min-h-[96px] sm:min-h-[108px] min-w-0 overflow-hidden ${
            isMaintenance
              ? "bg-stone-200/70 dark:bg-stone-900/50 border-stone-300 dark:border-stone-800 text-stone-400 cursor-not-allowed opacity-75"
              : isSelected
              ? isHot
                ? "bg-gradient-to-br from-orange-600 to-amber-700 text-white border-orange-400 shadow-lg scale-[1.02]"
                : "bg-gradient-to-br from-[#2A211C] to-[#46362C] text-white border-amber-400 shadow-lg scale-[1.02]"
              : isOccupied
              ? isCheckedIn
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400/80 dark:border-emerald-700 text-emerald-950 dark:text-emerald-200"
                : "bg-stone-200/90 dark:bg-stone-800/80 border-stone-300/90 dark:border-stone-700 text-stone-600 dark:text-stone-300"
              : "bg-white dark:bg-[#1E1927] hover:bg-[#FAF6F0] dark:hover:bg-[#251F30] border-stone-200/90 dark:border-stone-700/80 hover:border-amber-600/60 text-stone-800 dark:text-stone-100 shadow-sm hover:shadow"
          }`}
        >
          {/* Top Row: Big Spot Number + Badges */}
          <div className="flex items-center justify-between w-full gap-1 min-w-0">
            <span
              className={`font-mono text-xs sm:text-sm font-black px-1.5 sm:px-2 py-0.5 rounded-lg shrink-0 ${
                isSelected
                  ? "bg-white/25 text-white"
                  : isCheckedIn
                  ? "bg-emerald-600 text-white"
                  : isOccupied
                  ? "bg-stone-300 dark:bg-stone-700 text-stone-700 dark:text-stone-300"
                  : isHot
                  ? "bg-orange-100 dark:bg-orange-950/70 text-orange-900 dark:text-orange-200"
                  : "bg-stone-900 dark:bg-stone-800 text-amber-200"
              }`}
            >
              {spot.id}
            </span>

            <div className="flex items-center gap-0.5 shrink-0">
              {isPreferred && !isOccupied && (
                <span
                  title="Lugar favorito"
                  className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-950/60 p-1 text-[8px] font-bold text-amber-800 dark:text-amber-300"
                >
                  <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-600" />
                </span>
              )}
              {isCheckedIn && (
                <span
                  title="Check-in QR escaneado"
                  className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-950/60 p-1 text-[8px] font-bold text-emerald-800 dark:text-emerald-300"
                >
                  <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
                </span>
              )}
              {isOccupied &&
                booking &&
                ["wellhub", "totalpass", "fitpass", "nessty"].includes(
                  booking.bookedVia
                ) && (
                  <span
                    title={`Reservado desde ${booking.bookedVia.toUpperCase()}`}
                    className="inline-flex items-center rounded-full bg-stone-900 text-amber-300 px-1 py-0.2 text-[8px] font-extrabold uppercase"
                  >
                    {booking.bookedVia === "wellhub"
                      ? "WH"
                      : booking.bookedVia === "totalpass"
                      ? "TP"
                      : booking.bookedVia === "fitpass"
                      ? "FP"
                      : "NS"}
                  </span>
                )}
            </div>
          </div>

          {/* Visual Silhouette of Reformer Machine or Hot Pilates Mat */}
          <div className="my-1 flex items-center justify-center w-full min-w-0">
            {spot.type === "reformer_machine" ? (
              <div
                className={`w-full rounded-lg border px-1.5 py-1 flex items-center justify-between gap-1 min-w-0 ${
                  isSelected
                    ? "border-white/30 bg-white/10"
                    : isOccupied
                    ? "border-stone-300 dark:border-stone-700 bg-stone-100/70 dark:bg-stone-850"
                    : "border-stone-200 dark:border-stone-700 bg-[#F7F3EE] dark:bg-[#181420]"
                }`}
              >
                <div
                  className={`h-4 w-1 rounded-full shrink-0 ${
                    isSelected ? "bg-amber-300" : "bg-stone-400"
                  }`}
                />
                <div
                  className={`flex-1 h-4 rounded flex items-center justify-center text-[9px] font-semibold truncate ${
                    isSelected
                      ? "bg-white/20 text-amber-100"
                      : isOccupied
                      ? "bg-stone-300/70 dark:bg-stone-700 text-stone-600 dark:text-stone-300"
                      : "bg-[#EAE0D5] dark:bg-stone-800 text-stone-700 dark:text-stone-200"
                  }`}
                >
                  Lugar {spot.id}
                </div>
              </div>
            ) : (
              <div
                className={`w-full rounded-lg border-2 border-dashed px-1.5 py-1 flex items-center justify-between min-w-0 ${
                  isSelected
                    ? "border-orange-200/50 bg-white/15"
                    : isOccupied
                    ? "border-stone-300 dark:border-stone-700 bg-stone-100/70 dark:bg-stone-800"
                    : "border-orange-300/70 dark:border-orange-500/40 bg-orange-50/50 dark:bg-orange-950/20"
                }`}
              >
                <span className="text-[9px] font-bold tracking-wide truncate">
                  Lugar {spot.id}
                </span>
                <Flame
                  className={`h-3 w-3 shrink-0 ${
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
          <div className="flex items-center justify-between text-[9px] sm:text-[10px] w-full min-w-0">
            {isMaintenance ? (
              <span className="inline-flex items-center gap-0.5 text-stone-500 font-medium truncate">
                <Wrench className="h-2.5 w-2.5 shrink-0" /> Mantto.
              </span>
            ) : isOccupied && booking ? (
              <span className="inline-flex items-center gap-0.5 font-semibold truncate min-w-0">
                {isCheckedIn ? (
                  <UserCheck className="h-2.5 w-2.5 text-emerald-600 shrink-0" />
                ) : (
                  <Lock className="h-2.5 w-2.5 opacity-60 shrink-0" />
                )}
                <span className="truncate">
                  {isAdminView
                    ? booking.clientName.split(" ")[0]
                    : "Ocupado"}
                </span>
              </span>
            ) : (
              <span
                className={`truncate ${
                  isSelected
                    ? "text-amber-100 font-semibold"
                    : "text-stone-500 dark:text-stone-400"
                }`}
              >
                {spot.row === 1 ? "Enfrente" : "Atrás"}
              </span>
            )}

            {!isOccupied && !isMaintenance && (
              <span
                className={`text-[9px] sm:text-[10px] font-bold shrink-0 ${
                  isSelected
                    ? "text-white"
                    : "text-emerald-700 dark:text-emerald-400"
                }`}
              >
                {isSelected ? "✓" : "Libre"}
              </span>
            )}
          </div>
        </button>

        {isAdminView && onToggleMaintenance && !isOccupied && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleMaintenance(room.id, spot.id);
            }}
            title="Cambiar estado de mantenimiento"
            className="opacity-0 group-hover:opacity-100 transition absolute -top-1.5 -right-1.5 rounded-full bg-stone-800 text-white p-1 shadow-md hover:bg-stone-700 z-10"
          >
            <Wrench className="h-2.5 w-2.5" />
          </button>
        )}
      </div>
    );
  };

  const occupiedCount = sessionBookings.length;
  const checkedInCount = sessionBookings.filter(
    (b) => b.status === "asistio"
  ).length;
  const freeCount = Math.max(
    0,
    room.spots.filter((s) => s.status !== "maintenance").length - occupiedCount
  );

  // Construir filas visuales de izquierda a derecha
  const rowsToRender: RoomLayoutCell[][] =
    room.layoutRows && room.layoutRows.length > 0
      ? room.layoutRows
      : room.spots.length > 0
      ? [room.spots.map((s) => ({ kind: "spot" as const, spotId: s.id }))]
      : [];

  return (
    <div className="rounded-3xl border border-stone-200/90 dark:border-stone-800 bg-[#FAF7F2] dark:bg-[#15111B] p-3.5 sm:p-5 shadow-sm space-y-4">
      {/* Studio Room Header & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200/80 dark:border-stone-800">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                isHot
                  ? "bg-orange-100 dark:bg-orange-950/70 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800"
                  : "bg-stone-900 dark:bg-stone-800 text-amber-200"
              }`}
            >
              {isHot ? (
                <>
                  <Flame className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />{" "}
                  {room.branchName}
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />{" "}
                  {room.branchName}
                </>
              )}
            </span>
            <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">
              {room.temperature}
            </span>
          </div>
          <h3 className="mt-1 text-base sm:text-lg font-extrabold text-stone-900 dark:text-stone-100">
            {room.name} ({room.spots.length} lugares · Vista de Izquierda a
            Derecha)
          </h3>
        </div>

        {/* Status counters & Edit button */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-stone-800 px-2.5 py-1 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-semibold">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {freeCount} Libres
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-stone-800 px-2.5 py-1 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-semibold">
            <span className="h-2 w-2 rounded-full bg-stone-400" />
            {occupiedCount} Reservados
          </span>
          {checkedInCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              {checkedInCount} QR
            </span>
          )}

          {isAdminView && onUpdateRoomLayout && (
            <button
              type="button"
              onClick={() => setIsEditorOpen(true)}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#7B6E86] hover:bg-[#685B73] text-white font-bold text-xs shadow-sm transition active:scale-95"
              title="Personalizar distribución de tapetes y números"
            >
              <Settings className="h-3 w-3 text-[#D2C483]" />
              <span>Editar Salón</span>
            </button>
          )}
        </div>
      </div>

      {/* Front Mirror Banner */}
      <div>
        <div
          className={`w-full rounded-xl py-1.5 px-3 text-center text-xs font-bold tracking-widest uppercase border ${
            isHot
              ? "bg-gradient-to-r from-orange-950/90 via-amber-900/90 to-orange-950/90 text-orange-100 border-orange-700/40"
              : "bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 text-amber-100 border-stone-700"
          } shadow-inner`}
        >
          🪞 Frente del Salón (Izquierda → Derecha) · {session.instructor}
        </div>
      </div>

      {/* Empty state for Stiliza Campanario (0 lugares de momento) */}
      {room.spots.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-stone-300 dark:border-stone-800 bg-white/70 dark:bg-stone-900/40 p-8 text-center space-y-2">
          <Sparkles className="h-8 w-8 text-amber-600 mx-auto" />
          <h4 className="text-base font-extrabold text-stone-900 dark:text-stone-100">
            {room.branchName} · 0 lugares activos de momento
          </h4>
          <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto">
            Esta sucursal se encuentra registrada sin máquinas asignadas por
            ahora. En cuanto se habiliten los lugares aparecerán aquí de
            izquierda a derecha.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {rowsToRender.map((rowCells, rowIdx) => {
            const colCount = rowCells.length;
            return (
              <div key={rowIdx} className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 px-1">
                  <span>
                    {rowsToRender.length === 1
                      ? "Fila Única (Izquierda a Derecha)"
                      : rowIdx === 0
                      ? "Fila de Enfrente (Izquierda a Derecha)"
                      : "Fila de Atrás (Izquierda a Derecha)"}
                  </span>
                  <span className="font-mono">
                    {rowCells
                      .map((c) => (c.kind === "coach" ? "COACH" : c.spotId))
                      .join("  →  ")}
                  </span>
                </div>

                {/* Responsive Grid with minmax(0, 1fr) and overflow wrapper */}
                <div className="w-full overflow-x-auto pb-1 scrollbar-none">
                  <div
                    className="grid gap-2 sm:gap-2.5 min-w-[540px] sm:min-w-0"
                    style={{
                      gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
                    }}
                  >
                    {rowCells.map((cell, cellIdx) => {
                      if (cell.kind === "coach") {
                        return renderCoachCell(`coach-${rowIdx}-${cellIdx}`);
                      }
                      const spot = spotById.get(cell.spotId);
                      if (!spot) return null;
                      return renderSpotCard(spot);
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Room Layout Editor Modal */}
      {isEditorOpen && onUpdateRoomLayout && (
        <StudioRoomMapEditorModal
          room={room}
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          onSave={onUpdateRoomLayout}
        />
      )}
    </div>
  );
}
