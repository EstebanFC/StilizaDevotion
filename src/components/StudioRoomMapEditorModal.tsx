"use client";

import React, { useState } from "react";
import {
  RoomLayoutCell,
  SpotConfig,
  StudioRoom,
} from "@/types/crm";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Flame,
  LayoutGrid,
  Mic,
  Plus,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

interface StudioRoomMapEditorModalProps {
  room: StudioRoom;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedRoom: {
    roomId: string;
    name: string;
    temperature: string;
    spots: SpotConfig[];
    layoutRows: RoomLayoutCell[][];
  }) => Promise<void>;
}

export function StudioRoomMapEditorModal({
  room,
  isOpen,
  onClose,
  onSave,
}: StudioRoomMapEditorModalProps) {
  // Cloned state for editing
  const [name, setName] = useState(room.name);
  const [temperature, setTemperature] = useState(room.temperature || "33°C Infrarrojo");

  // Initialize rows from room.layoutRows or create default from spots
  const [layoutRows, setLayoutRows] = useState<RoomLayoutCell[][]>(() => {
    if (room.layoutRows && room.layoutRows.length > 0) {
      return JSON.parse(JSON.stringify(room.layoutRows));
    }
    // Fallback: 1 row with all spots
    return [room.spots.map((s) => ({ kind: "spot", spotId: s.id }))];
  });

  const [isSaving, setIsSaving] = useState(false);
  const isHot = room.discipline === "hot_pilates";

  if (!isOpen) return null;

  // Move a cell within its row
  const moveCell = (rowIdx: number, cellIdx: number, direction: "left" | "right") => {
    setLayoutRows((prev) => {
      const newRows = prev.map((row) => [...row]);
      const targetIdx = direction === "left" ? cellIdx - 1 : cellIdx + 1;
      if (targetIdx < 0 || targetIdx >= newRows[rowIdx].length) return prev;
      const temp = newRows[rowIdx][cellIdx];
      newRows[rowIdx][cellIdx] = newRows[rowIdx][targetIdx];
      newRows[rowIdx][targetIdx] = temp;
      return newRows;
    });
  };

  // Invert the entire row order
  const invertRow = (rowIdx: number) => {
    setLayoutRows((prev) => {
      const newRows = prev.map((row) => [...row]);
      newRows[rowIdx].reverse();
      return newRows;
    });
  };

  // Change spotId of a cell
  const updateSpotId = (rowIdx: number, cellIdx: number, newId: string) => {
    setLayoutRows((prev) => {
      const newRows = prev.map((row) => [...row]);
      const cell = newRows[rowIdx][cellIdx];
      if (cell.kind === "spot") {
        newRows[rowIdx][cellIdx] = { ...cell, spotId: newId.trim() };
      }
      return newRows;
    });
  };

  // Delete a cell
  const removeCell = (rowIdx: number, cellIdx: number) => {
    setLayoutRows((prev) => {
      const newRows = prev.map((row) => [...row]);
      newRows[rowIdx].splice(cellIdx, 1);
      return newRows;
    });
  };

  // Add a new spot to a row
  const addSpotToRow = (rowIdx: number) => {
    setLayoutRows((prev) => {
      const newRows = prev.map((row) => [...row]);
      // Find highest existing spot number
      let maxNum = 0;
      prev.forEach((r) => {
        r.forEach((c) => {
          if (c.kind === "spot") {
            const parsed = parseInt(c.spotId, 10);
            if (!isNaN(parsed) && parsed > maxNum) maxNum = parsed;
          }
        });
      });
      const nextId = String(maxNum + 1);
      newRows[rowIdx].push({ kind: "spot", spotId: nextId });
      return newRows;
    });
  };

  // Add Coach to a row
  const addCoachToRow = (rowIdx: number) => {
    setLayoutRows((prev) => {
      const newRows = prev.map((row) => [...row]);
      newRows[rowIdx].push({ kind: "coach", label: "Coach" });
      return newRows;
    });
  };

  // Add a new empty row
  const addNewRow = () => {
    setLayoutRows((prev) => [...prev, []]);
  };

  // Remove a row
  const removeRow = (rowIdx: number) => {
    if (layoutRows.length <= 1) return;
    setLayoutRows((prev) => prev.filter((_, idx) => idx !== rowIdx));
  };

  // Renumber spots sequentially 1..N
  const renumberSequential = (order: "asc" | "desc") => {
    setLayoutRows((prev) => {
      let count = 0;
      // Count total spots
      prev.forEach((r) => r.forEach((c) => { if (c.kind === "spot") count++; }));
      let current = order === "asc" ? 1 : count;
      return prev.map((r) =>
        r.map((c) => {
          if (c.kind === "spot") {
            const id = String(current);
            current = order === "asc" ? current + 1 : current - 1;
            return { ...c, spotId: id };
          }
          return c;
        })
      );
    });
  };

  // Save handler
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Build updated spots list from all layout cells
      const updatedSpots: SpotConfig[] = [];
      const seenIds = new Set<string>();

      layoutRows.forEach((row, rowIdx) => {
        row.forEach((cell, colIdx) => {
          if (cell.kind === "spot") {
            const rawId = cell.spotId.trim() || `Lugar-${rowIdx + 1}-${colIdx + 1}`;
            // Avoid duplicate IDs
            let finalId = rawId;
            let counter = 2;
            while (seenIds.has(finalId)) {
              finalId = `${rawId}-${counter}`;
              counter++;
            }
            seenIds.add(finalId);

            // Inherit existing status/zone or assign defaults
            const existing = room.spots.find((s) => s.id === finalId);
            updatedSpots.push({
              id: finalId,
              label: existing?.label || `Lugar ${finalId}`,
              shortLabel: existing?.shortLabel || finalId,
              row: rowIdx + 1,
              col: colIdx + 1,
              zone:
                rowIdx === 0
                  ? "Frente al Espejo"
                  : rowIdx === layoutRows.length - 1
                  ? "Zona Posterior"
                  : "Fila Central",
              type: isHot ? "hot_mat" : "reformer_machine",
              status: existing?.status || "available",
            });
          }
        });
      });

      // Build updated temperature / description summary string
      let autoSummary = temperature;
      if (layoutRows.length >= 2) {
        const frontStr = layoutRows[0]
          .map((c) => (c.kind === "coach" ? "Coach" : c.spotId))
          .join(",");
        const backStr = layoutRows[1]
          .map((c) => (c.kind === "coach" ? "Coach" : c.spotId))
          .join(",");
        autoSummary = `${isHot ? "33°C Infrarrojo" : "Reformer"} · Frente: ${frontStr} | Atrás: ${backStr}`;
      }

      await onSave({
        roomId: room.id,
        name: name.trim() || room.name,
        temperature: autoSummary,
        spots: updatedSpots,
        layoutRows,
      });

      onClose();
    } catch (err) {
      console.error("Error guardando mapa de salón:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-4xl bg-white dark:bg-[#1C1824] border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl p-4 sm:p-6 my-auto text-stone-900 dark:text-stone-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[#7B6E86]/20 flex items-center justify-center text-[#7B6E86] dark:text-[#D2C483]">
              <LayoutGrid className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-[#7B6E86] dark:text-[#D2C483]">
                  Configuración de Salón
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isHot
                      ? "bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800"
                      : "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                  }`}
                >
                  {isHot ? "Hot Studio 33°C" : "Reformer Studio"}
                </span>
              </div>
              <h3 className="text-lg font-extrabold">{room.branchName} · Mapa Editable</h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 py-4 space-y-6 pr-1">
          {/* Metadata Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-stone-50 dark:bg-[#14101A] p-4 rounded-2xl border border-stone-200 dark:border-stone-800/80">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
                Nombre de la Sala
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#7B6E86]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
                Clima / Temperatura Infrarroja
              </label>
              <input
                type="text"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                placeholder="Ej. 33°C Infrarrojo"
                className="w-full rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#7B6E86]"
              />
            </div>
          </div>

          {/* Quick Presets Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-[#FAF7F2] dark:bg-[#231E2A] p-3 rounded-2xl border border-stone-200 dark:border-stone-800">
            <span className="text-xs font-bold text-stone-600 dark:text-stone-300">
              ⚡ Herramientas rápidas:
            </span>
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => renumberSequential("asc")}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 font-semibold hover:border-[#7B6E86] text-stone-700 dark:text-stone-200 transition"
              >
                1 → N (Ascendente)
              </button>
              <button
                type="button"
                onClick={() => renumberSequential("desc")}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 font-semibold hover:border-[#7B6E86] text-stone-700 dark:text-stone-200 transition"
              >
                N → 1 (Descendente)
              </button>
              <button
                type="button"
                onClick={addNewRow}
                className="px-2.5 py-1 rounded-lg bg-[#7B6E86]/20 border border-[#7B6E86]/40 text-[#7B6E86] dark:text-[#D2C483] font-bold hover:bg-[#7B6E86]/30 transition inline-flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar Fila
              </button>
            </div>
          </div>

          {/* Front Banner Indicator */}
          <div className="w-full text-center py-2 px-4 rounded-xl bg-stone-900 text-amber-200 text-xs font-extrabold tracking-widest uppercase border border-amber-500/30">
            🪞 Frente del Salón / Espejo (Vista de Izquierda a Derecha)
          </div>

          {/* Editable Rows */}
          <div className="space-y-6">
            {layoutRows.map((rowCells, rowIdx) => {
              const rowTitle =
                layoutRows.length === 1
                  ? "Fila Única"
                  : rowIdx === 0
                  ? "Fila 1 (Frente)"
                  : rowIdx === 1
                  ? "Fila 2 (Atrás)"
                  : `Fila ${rowIdx + 1}`;

              return (
                <div
                  key={rowIdx}
                  className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-[#16121C] p-3 sm:p-4 space-y-3"
                >
                  {/* Row Header with controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-stone-700 dark:text-stone-300">
                        {rowTitle}
                      </span>
                      <span className="text-[11px] text-stone-400">
                        ({rowCells.length} elementos)
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => invertRow(rowIdx)}
                        title="Invertir orden de esta fila"
                        className="px-2 py-1 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-[11px] font-bold text-stone-700 dark:text-stone-300 hover:border-[#7B6E86] transition inline-flex items-center gap-1"
                      >
                        <RotateCcw className="h-3 w-3" /> Invertir Fila
                      </button>
                      <button
                        type="button"
                        onClick={() => addSpotToRow(rowIdx)}
                        className="px-2 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold hover:bg-emerald-200 transition inline-flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" /> {isHot ? "Tapete" : "Reformer"}
                      </button>
                      <button
                        type="button"
                        onClick={() => addCoachToRow(rowIdx)}
                        className="px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300 text-[11px] font-bold hover:bg-amber-200 transition inline-flex items-center gap-1"
                      >
                        <Mic className="h-3 w-3" /> Coach
                      </button>
                      {layoutRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRow(rowIdx)}
                          title="Eliminar fila"
                          className="p-1 rounded-lg text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/40 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Row Cells Carousel / Grid */}
                  <div className="overflow-x-auto pb-2 scrollbar-thin">
                    <div className="flex items-stretch gap-2 min-w-max">
                      {rowCells.map((cell, cellIdx) => {
                        const isCoach = cell.kind === "coach";
                        return (
                          <div
                            key={cellIdx}
                            className={`w-28 sm:w-32 rounded-xl p-2.5 border-2 flex flex-col justify-between transition-all ${
                              isCoach
                                ? "bg-gradient-to-br from-stone-900 to-stone-950 border-amber-400/80 text-amber-200 shadow-sm"
                                : "bg-white dark:bg-[#1E1927] border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 shadow-sm"
                            }`}
                          >
                            {/* Top: Kind label and Delete */}
                            <div className="flex items-center justify-between gap-1 mb-2">
                              <span
                                className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                  isCoach
                                    ? "bg-amber-400 text-stone-950"
                                    : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300"
                                }`}
                              >
                                {isCoach ? "Coach" : `Lugar ${cellIdx + 1}`}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeCell(rowIdx, cellIdx)}
                                className="text-stone-400 hover:text-rose-500 transition p-0.5"
                                title="Eliminar este lugar"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            {/* Center: ID / Input */}
                            <div className="my-1 text-center">
                              {isCoach ? (
                                <div className="py-2">
                                  <Mic className="h-4 w-4 mx-auto text-amber-300 mb-1" />
                                  <span className="text-xs font-bold text-amber-200">
                                    COACH
                                  </span>
                                </div>
                              ) : (
                                <div>
                                  <label className="text-[10px] text-stone-400 block mb-0.5">
                                    Número / ID:
                                  </label>
                                  <input
                                    type="text"
                                    value={cell.spotId}
                                    onChange={(e) =>
                                      updateSpotId(rowIdx, cellIdx, e.target.value)
                                    }
                                    className="w-full text-center font-mono font-black text-sm bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg py-1 px-1.5 focus:outline-none focus:ring-2 focus:ring-[#7B6E86]"
                                  />
                                </div>
                              )}
                            </div>

                            {/* Bottom: Reorder arrows */}
                            <div className="flex items-center justify-between gap-1 mt-2 pt-1 border-t border-stone-100 dark:border-stone-800">
                              <button
                                type="button"
                                disabled={cellIdx === 0}
                                onClick={() => moveCell(rowIdx, cellIdx, "left")}
                                className="p-1 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-[#7B6E86] hover:text-white disabled:opacity-30 disabled:pointer-events-none transition"
                                title="Mover a la izquierda"
                              >
                                <ArrowLeft className="h-3 w-3" />
                              </button>
                              <span className="text-[10px] font-bold text-stone-400">
                                #{cellIdx + 1}
                              </span>
                              <button
                                type="button"
                                disabled={cellIdx === rowCells.length - 1}
                                onClick={() => moveCell(rowIdx, cellIdx, "right")}
                                className="p-1 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-[#7B6E86] hover:text-white disabled:opacity-30 disabled:pointer-events-none transition"
                                title="Mover a la derecha"
                              >
                                <ArrowRight className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3 shrink-0">
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Los cambios se reflejarán instantáneamente en el mapa en vivo, la tablet de Kiosco y el portal del alumno.
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-[#7B6E86] hover:bg-[#685B73] text-white text-xs font-black tracking-wide shadow-md flex items-center gap-1.5 transition active:scale-95"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5 text-[#D2C483]" />
                  <span>Guardar Distribución</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

