"use client";

import React, { useState } from "react";
import { Branch, StudioBrand } from "@/types/crm";
import {
  Building2,
  Flame,
  KeyRound,
  Lock,
  ShieldCheck,
  Sparkles,
  Tablet,
} from "lucide-react";

export interface SessionUser {
  role: "admin" | "kiosco";
  kioskNumber?: number;
  branchId?: string;
  branchName?: string;
  brand?: StudioBrand;
  label: string;
}

interface LoginGatewayProps {
  mode: "kiosco_only" | "admin_only";
  branches: Branch[];
  onLogin: (user: SessionUser) => void;
}

export function LoginGateway({
  mode,
  branches,
  onLogin,
}: LoginGatewayProps) {
  // Kiosco Login State
  const [selectedBrand, setSelectedBrand] = useState<"all" | StudioBrand>(
    "all"
  );
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    branches[0]?.id || "br-stiliza-san-isidro"
  );
  const [kioskNumber, setKioskNumber] = useState<number>(1);
  const [kioskPin, setKioskPin] = useState<string>("1234");

  // Admin Login State
  const [adminUser, setAdminUser] = useState<string>("admin");
  const [adminPin, setAdminPin] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const filteredBranches = branches.filter((b) =>
    selectedBrand === "all" ? true : b.brand === selectedBrand
  );

  const activeBranch =
    filteredBranches.find((b) => b.id === selectedBranchId) ||
    filteredBranches[0] ||
    branches[0];

  const handleKioskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (kioskPin.trim() !== "1234") {
      setErrorMsg("PIN de Kiosco incorrecto.");
      return;
    }
    if (!activeBranch) return;
    const cleanNum = Math.max(1, Number(kioskNumber) || 1);
    onLogin({
      role: "kiosco",
      kioskNumber: cleanNum,
      branchId: activeBranch.id,
      branchName: activeBranch.name,
      brand: activeBranch.brand,
      label: `Kiosco #${cleanNum} · ${activeBranch.name}`,
    });
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPin.trim() !== "2026" && adminPin.trim() !== "1234") {
      setErrorMsg("Contraseña / PIN de Administrador incorrecto.");
      return;
    }
    onLogin({
      role: "admin",
      label: "Administrador General · Stiliza & Devotion",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#171311] via-[#221B17] to-[#110E0C] text-stone-100 flex flex-col justify-center items-center p-4 sm:p-6">
      {/* Brand Header */}
      <div className="text-center mb-7 space-y-2 max-w-xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-4 py-1 text-xs font-semibold text-amber-200">
          <Sparkles className="h-3.5 w-3.5 text-amber-300" /> STILIZA REFORMER
          <span className="opacity-40">×</span>
          <Flame className="h-3.5 w-3.5 text-orange-400" /> DEVOTION HOT PILATES
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          {mode === "kiosco_only"
            ? "Terminal de Kiosco · Recepción"
            : "Portal Exclusivo de Administración"}
        </h1>
        <p className="text-xs sm:text-sm text-stone-400">
          {mode === "kiosco_only"
            ? "Configura la sucursal y número de esta tablet para iniciar el modo Kiosco bloqueado para alumnas."
            : "Acceso restringido únicamente para dirección y administración de sucursales."}
        </p>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-lg rounded-3xl bg-[#241D19]/90 border border-white/10 shadow-2xl overflow-hidden backdrop-blur-md">
        <div className="p-4 bg-black/40 border-b border-white/10 flex items-center justify-center gap-2">
          {mode === "kiosco_only" ? (
            <span className="inline-flex items-center gap-2 text-xs sm:text-sm font-extrabold text-amber-300">
              <Tablet className="h-4 w-4" />
              CONFIGURACIÓN DE TERMINAL KIOSCO
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 text-xs sm:text-sm font-extrabold text-white">
              <ShieldCheck className="h-4 w-4 text-amber-300" />
              LOGIN ADMINISTRADOR GENERAL
            </span>
          )}
        </div>

        <div className="p-6 sm:p-8">
          {mode === "kiosco_only" ? (
            <form onSubmit={handleKioskSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">
                  1. Filtrar por Marca de Estudio
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedBrand("all")}
                    className={`rounded-xl py-2 text-xs font-bold border transition ${
                      selectedBrand === "all"
                        ? "bg-white/15 border-amber-300 text-white"
                        : "border-white/10 text-stone-400 hover:text-white"
                    }`}
                  >
                    Todas (6)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBrand("Stiliza");
                      const first = branches.find((b) => b.brand === "Stiliza");
                      if (first) setSelectedBranchId(first.id);
                    }}
                    className={`rounded-xl py-2 text-xs font-bold border transition inline-flex items-center justify-center gap-1 ${
                      selectedBrand === "Stiliza"
                        ? "bg-amber-400/20 border-amber-300 text-amber-200"
                        : "border-white/10 text-stone-400 hover:text-white"
                    }`}
                  >
                    <Sparkles className="h-3 w-3" /> Stiliza
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBrand("Devotion");
                      const first = branches.find(
                        (b) => b.brand === "Devotion"
                      );
                      if (first) setSelectedBranchId(first.id);
                    }}
                    className={`rounded-xl py-2 text-xs font-bold border transition inline-flex items-center justify-center gap-1 ${
                      selectedBrand === "Devotion"
                        ? "bg-orange-500/20 border-orange-400 text-orange-200"
                        : "border-white/10 text-stone-400 hover:text-white"
                    }`}
                  >
                    <Flame className="h-3 w-3" /> Devotion
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1.5">
                  2. Selecciona la Sucursal del Kiosco
                </label>
                <div className="relative">
                  <Building2 className="h-4 w-4 text-amber-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <select
                    value={activeBranch?.id}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="w-full rounded-xl bg-black/50 border border-white/15 pl-10 pr-4 py-3 text-sm font-semibold text-white focus:outline-none focus:border-amber-400"
                  >
                    {filteredBranches.map((br) => (
                      <option
                        key={br.id}
                        value={br.id}
                        className="bg-stone-900"
                      >
                        [{br.brand.toUpperCase()}] {br.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1.5">
                    3. Número de Kiosco (1..N)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={kioskNumber}
                    onChange={(e) =>
                      setKioskNumber(Math.max(1, Number(e.target.value) || 1))
                    }
                    className="w-full rounded-xl bg-black/50 border border-white/15 px-4 py-3 text-sm font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1.5">
                    PIN de Kiosco (1234)
                  </label>
                  <input
                    type="password"
                    value={kioskPin}
                    onChange={(e) => setKioskPin(e.target.value)}
                    className="w-full rounded-xl bg-black/50 border border-white/15 px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {errorMsg && (
                <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                className="w-full rounded-2xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-extrabold text-sm py-3.5 px-6 transition shadow-lg inline-flex items-center justify-center gap-2"
              >
                <Tablet className="h-4 w-4" />
                Activar {`Kiosco #${kioskNumber}`} en {activeBranch?.name}
              </button>
            </form>
          ) : (
            <form onSubmit={handleAdminSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1.5">
                  Usuario Administrador
                </label>
                <div className="relative">
                  <KeyRound className="h-4 w-4 text-amber-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={adminUser}
                    onChange={(e) => setAdminUser(e.target.value)}
                    className="w-full rounded-xl bg-black/50 border border-white/15 pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1.5">
                  Contraseña / PIN Maestro (2026)
                </label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-amber-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value)}
                    placeholder="Ingresa tu PIN de Administrador (2026)"
                    className="w-full rounded-xl bg-black/50 border border-white/15 pl-10 pr-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {errorMsg && (
                <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                className="w-full rounded-2xl bg-white hover:bg-stone-200 text-stone-950 font-extrabold text-sm py-3.5 px-6 transition shadow-lg inline-flex items-center justify-center gap-2"
              >
                <ShieldCheck className="h-4 w-4" />
                Entrar al Panel Administrador
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
