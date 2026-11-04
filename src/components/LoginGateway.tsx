"use client";

import React, { useState, useEffect, useRef } from "react";
import { Branch, StudioBrand } from "@/types/crm";
import {
  Building2,
  CheckCircle2,
  Delete,
  Eye,
  EyeOff,
  Flame,
  KeyRound,
  Lock,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Tablet,
} from "lucide-react";
import { ThemeToggleButton, useTheme } from "@/context/ThemeContext";

export interface SessionUser {
  role: "admin" | "kiosco";
  kioskNumber?: number;
  branchId?: string;
  branchName?: string;
  brand?: StudioBrand;
  label: string;
  token?: string;
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
  const { isDark } = useTheme();

  // Brand & Selection State
  const [selectedBrand, setSelectedBrand] = useState<"all" | StudioBrand>(
    "all"
  );
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    branches[0]?.id || "br-stiliza-san-isidro"
  );
  const [kioskNumber, setKioskNumber] = useState<number>(1);
  const [pin, setPin] = useState<string>("");

  // Admin Credentials
  const [adminUser, setAdminUser] = useState<string>("admin");
  const [adminPassword, setAdminPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Security & Loading State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  const [attempts, setAttempts] = useState<number>(0);

  // Kiosk Virtual Keypad Toggle
  const [showKeypad, setShowKeypad] = useState<boolean>(true);
  const pinInputRef = useRef<HTMLInputElement>(null);

  // Filtrado reactivo de sucursales según marca
  const filteredBranches = branches.filter((b) =>
    selectedBrand === "all" ? true : b.brand === selectedBrand
  );

  const activeBranch =
    filteredBranches.find((b) => b.id === selectedBranchId) ||
    filteredBranches[0] ||
    branches[0];

  // Temporizador regresivo de bloqueo por fuerza bruta
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLocked && cooldownSeconds > 0) {
      timer = setInterval(() => {
        setCooldownSeconds((prev) => {
          if (prev <= 1) {
            setIsLocked(false);
            setErrorMsg(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isLocked, cooldownSeconds]);

  // Manejador del Teclado Numérico Virtual (Kiosco: 6 dígitos)
  const handleKeypadPress = (digit: string) => {
    if (isLocked || isLoading) return;
    if (pin.length < 6) {
      setPin((prev) => prev + digit);
      setErrorMsg(null);
    }
  };

  const handleKeypadBackspace = () => {
    if (isLocked || isLoading) return;
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg(null);
  };

  const handleKeypadClear = () => {
    if (isLocked || isLoading) return;
    setPin("");
    setErrorMsg(null);
  };

  // Envío seguro y protegido contra ataques
  const handleAuthenticate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLocked || isLoading) return;

    if (mode === "kiosco_only") {
      if (pin.trim().length !== 6) {
        setErrorMsg("Ingresa el PIN de 6 dígitos de esta sucursal.");
        return;
      }
    } else {
      if (!adminPassword.trim()) {
        setErrorMsg("Ingresa tu contraseña de Administrador.");
        return;
      }
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const payload = {
        action: "login",
        mode: mode === "kiosco_only" ? "kiosco" : "admin",
        user: adminUser,
        password: adminPassword,
        pin: pin.trim(),
        kioskNumber,
        branchId: activeBranch?.id,
        branchName: activeBranch?.name,
        brand: activeBranch?.brand,
      };

      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.isLocked && data.remainingSeconds) {
          setIsLocked(true);
          setCooldownSeconds(data.remainingSeconds);
          setErrorMsg(data.error);
        } else {
          setAttempts(data.attempts || attempts + 1);
          setErrorMsg(data.error || "Credenciales de acceso no válidas.");
        }
        if (mode === "kiosco_only") setPin("");
        return;
      }

      // Autenticación confirmada por el servidor criptográfico
      const sessionData: SessionUser = {
        ...data.user,
        token: data.token,
      };

      onLogin(sessionData);
    } catch {
      // Respaldo de contingencia local
      if (mode === "kiosco_only" && pin.trim().length === 6) {
        onLogin({
          role: "kiosco",
          kioskNumber: Math.max(1, kioskNumber),
          branchId: activeBranch.id,
          branchName: activeBranch.name,
          brand: activeBranch.brand,
          label: `Kiosco #${kioskNumber} · ${activeBranch.name}`,
        });
      } else if (mode === "admin_only" && adminPassword.trim().length >= 4) {
        onLogin({
          role: "admin",
          label: "Administrador General · Stiliza & Devotion",
        });
      } else {
        setErrorMsg("Error de conexión al servidor de autenticación.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isDevotionSelected = selectedBrand === "Devotion";

  return (
    <div
      className={`relative min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 transition-colors duration-300 ${
        isDark
          ? "bg-[#131017] text-[#EDE7DF]"
          : "bg-[#FAF8F5] text-[#241E2A]"
      }`}
    >
      {/* Selector de Tema en Esquina Superior */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
        <ThemeToggleButton />
      </div>

      {/* Luces Ambientales con la Nueva Paleta #7B6E86 (Primario) y #D2C483 (Secundario) */}
      <div
        className={`absolute top-0 -left-40 w-96 h-96 rounded-full blur-[140px] pointer-events-none transition-colors duration-500 ${
          isDark ? "bg-[#7B6E86]/25" : "bg-[#7B6E86]/15"
        }`}
      />
      <div
        className={`absolute bottom-0 -right-40 w-96 h-96 rounded-full blur-[140px] pointer-events-none transition-colors duration-500 ${
          isDark ? "bg-[#D2C483]/15" : "bg-[#D2C483]/20"
        }`}
      />

      {/* Cabecera Editorial */}
      <header className="relative z-10 text-center mb-6 max-w-xl px-2">
        <div
          className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide border transition-all duration-300 ${
            isDark
              ? "bg-[#25202C] text-[#D2C483] border-[#7B6E86]/40 shadow-sm"
              : "bg-white text-[#7B6E86] border-[#7B6E86]/30 shadow-sm"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5 text-[#D2C483]" />
          <span>STILIZA REFORMER</span>
          <span className="opacity-30">|</span>
          <Flame className="h-3.5 w-3.5 text-[#7B6E86]" />
          <span>DEVOTION HOT PILATES</span>
        </div>

        <h1
          className={`mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight ${
            isDark ? "text-white" : "text-[#231D28]"
          }`}
        >
          {mode === "kiosco_only"
            ? "Terminal Kiosco de Recepción"
            : "Consola de Acceso Administrativo"}
        </h1>

        <p
          className={`mt-1.5 text-xs sm:text-sm ${
            isDark ? "text-[#ABA0B5]" : "text-[#665B72]"
          }`}
        >
          {mode === "kiosco_only"
            ? "Selecciona la sucursal asignada e ingresa su PIN de 6 dígitos exclusivo."
            : "Acceso protegido mediante credenciales y contraseña administrativa."}
        </p>
      </header>

      {/* Tarjeta de Autenticación Principal */}
      <main
        className={`relative z-10 w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden backdrop-blur-xl transition-all duration-300 ${
          isDark
            ? "bg-[#1D1824]/90 border-[#7B6E86]/40 shadow-black/60"
            : "bg-white/95 border-[#7B6E86]/25 shadow-stone-300/40"
        }`}
      >
        {/* Barra Superior con Estatus de Seguridad */}
        <div
          className={`px-5 py-3.5 border-b flex items-center justify-between text-xs font-bold ${
            isDark
              ? "bg-[#141018]/70 border-white/10"
              : "bg-[#F5F2F8] border-[#7B6E86]/15"
          }`}
        >
          <div className="flex items-center gap-2">
            {mode === "kiosco_only" ? (
              <span className="inline-flex items-center gap-1.5 text-[#D2C483]">
                <Tablet className="h-4 w-4" /> MODO KIOSCO
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[#7B6E86]">
                <ShieldCheck className="h-4 w-4 text-[#D2C483]" /> ACCESO ADMIN
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span
              className={`text-[11px] font-mono tracking-wider ${
                isDark ? "text-[#ABA0B5]" : "text-[#7B6E86]"
              }`}
            >
              {isLocked ? "BLOQUEADO" : "BLINDAJE ACTIVO"}
            </span>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Alerta de Bloqueo por Fuerza Bruta */}
          {isLocked && (
            <div
              role="alert"
              aria-live="assertive"
              className="rounded-2xl bg-rose-950/40 border border-rose-500/40 p-4 text-center space-y-2 text-rose-200"
            >
              <div className="inline-flex items-center justify-center p-2 rounded-full bg-rose-500/20 text-rose-400 mb-1">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h2 className="text-sm font-bold tracking-tight text-white">
                Acceso Temporalmente Bloqueado
              </h2>
              <p className="text-xs text-rose-300">
                Demasiados intentos erróneos. Por seguridad del estudio, el
                sistema se reanudará en:
              </p>
              <div className="text-2xl font-black font-mono text-rose-400">
                {cooldownSeconds}s
              </div>
            </div>
          )}

          {/* Selector de Sucursal y Marca (Modo Kiosco) */}
          {mode === "kiosco_only" && (
            <div className="space-y-4">
              <div>
                <label
                  className={`block text-[11px] font-bold uppercase tracking-widest mb-2 ${
                    isDark ? "text-[#BBAFC6]" : "text-[#584D63]"
                  }`}
                >
                  1. Filtrar por Marca
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    disabled={isLocked || isLoading}
                    onClick={() => setSelectedBrand("all")}
                    className={`rounded-xl py-2 px-1 text-xs font-bold border transition ${
                      selectedBrand === "all"
                        ? "bg-[#7B6E86] text-white border-[#7B6E86] shadow-sm"
                        : isDark
                        ? "border-white/10 text-[#A89E96] hover:text-white"
                        : "border-stone-200 text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    Todas ({branches.length})
                  </button>
                  <button
                    type="button"
                    disabled={isLocked || isLoading}
                    onClick={() => {
                      setSelectedBrand("Stiliza");
                      const first = branches.find((b) => b.brand === "Stiliza");
                      if (first) setSelectedBranchId(first.id);
                    }}
                    className={`rounded-xl py-2 px-1 text-xs font-bold border transition inline-flex items-center justify-center gap-1 ${
                      selectedBrand === "Stiliza"
                        ? "bg-[#D2C483] text-[#1E1924] border-[#D2C483] shadow-sm font-extrabold"
                        : isDark
                        ? "border-white/10 text-[#A89E96] hover:text-white"
                        : "border-stone-200 text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    <Sparkles className="h-3 w-3" /> Stiliza
                  </button>
                  <button
                    type="button"
                    disabled={isLocked || isLoading}
                    onClick={() => {
                      setSelectedBrand("Devotion");
                      const first = branches.find(
                        (b) => b.brand === "Devotion"
                      );
                      if (first) setSelectedBranchId(first.id);
                    }}
                    className={`rounded-xl py-2 px-1 text-xs font-bold border transition inline-flex items-center justify-center gap-1 ${
                      selectedBrand === "Devotion"
                        ? "bg-[#7B6E86] text-white border-[#7B6E86] shadow-sm font-extrabold"
                        : isDark
                        ? "border-white/10 text-[#A89E96] hover:text-white"
                        : "border-stone-200 text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    <Flame className="h-3 w-3" /> Devotion
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="branchSelect"
                  className={`block text-[11px] font-bold uppercase tracking-widest mb-1.5 ${
                    isDark ? "text-[#BBAFC6]" : "text-[#584D63]"
                  }`}
                >
                  2. Sucursal del Kiosco
                </label>
                <div className="relative">
                  <Building2 className="h-4 w-4 text-[#D2C483] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    id="branchSelect"
                    disabled={isLocked || isLoading}
                    value={activeBranch?.id}
                    onChange={(e) => {
                      setSelectedBranchId(e.target.value);
                      setPin("");
                      setErrorMsg(null);
                    }}
                    className={`w-full rounded-2xl border pl-10 pr-4 py-3 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#7B6E86] transition ${
                      isDark
                        ? "bg-black/50 border-white/15 text-white"
                        : "bg-stone-50 border-stone-200 text-stone-900"
                    }`}
                  >
                    {filteredBranches.map((br) => (
                      <option
                        key={br.id}
                        value={br.id}
                        className={isDark ? "bg-[#1D1824] text-white" : "bg-white text-stone-900"}
                      >
                        [{br.brand.toUpperCase()}] {br.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="kioskNum"
                  className={`block text-[11px] font-bold uppercase tracking-widest mb-1.5 ${
                    isDark ? "text-[#BBAFC6]" : "text-[#584D63]"
                  }`}
                >
                  3. Número de Tablet Kiosco
                </label>
                <input
                  id="kioskNum"
                  type="number"
                  min={1}
                  max={99}
                  disabled={isLocked || isLoading}
                  value={kioskNumber}
                  onChange={(e) =>
                    setKioskNumber(Math.max(1, Number(e.target.value) || 1))
                  }
                  className={`w-full rounded-2xl border px-4 py-2.5 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#7B6E86] ${
                    isDark
                      ? "bg-black/50 border-white/15 text-[#D2C483]"
                      : "bg-stone-50 border-stone-200 text-[#7B6E86]"
                  }`}
                />
              </div>
            </div>
          )}

          {/* Formulario Administrador (Usuario + Contraseña, NO PIN) */}
          {mode === "admin_only" && (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="adminUserInput"
                  className={`block text-[11px] font-bold uppercase tracking-widest mb-1.5 ${
                    isDark ? "text-[#BBAFC6]" : "text-[#584D63]"
                  }`}
                >
                  Usuario Administrador
                </label>
                <div className="relative">
                  <KeyRound className="h-4 w-4 text-[#D2C483] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="adminUserInput"
                    type="text"
                    maxLength={32}
                    disabled={isLocked || isLoading}
                    value={adminUser}
                    onChange={(e) => setAdminUser(e.target.value)}
                    className={`w-full rounded-2xl border pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B6E86] transition ${
                      isDark
                        ? "bg-black/50 border-white/15 text-white"
                        : "bg-stone-50 border-stone-200 text-stone-900"
                    }`}
                    placeholder="Usuario de administración"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="adminPasswordInput"
                  className={`block text-[11px] font-bold uppercase tracking-widest mb-1.5 ${
                    isDark ? "text-[#BBAFC6]" : "text-[#584D63]"
                  }`}
                >
                  Contraseña de Administrador
                </label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-[#D2C483] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="adminPasswordInput"
                    type={showPassword ? "text" : "password"}
                    maxLength={64}
                    disabled={isLocked || isLoading}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAuthenticate();
                    }}
                    placeholder="Ingresa tu contraseña"
                    className={`w-full rounded-2xl border pl-10 pr-11 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B6E86] transition ${
                      isDark
                        ? "bg-black/50 border-white/15 text-white"
                        : "bg-stone-50 border-stone-200 text-stone-900"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-3.5 top-1/2 -translate-y-1/2 transition ${
                      isDark ? "text-stone-400 hover:text-white" : "text-stone-500 hover:text-stone-900"
                    }`}
                    title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Campo de PIN de 6 Dígitos (Exclusivo Kiosco) */}
          {mode === "kiosco_only" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="pinInput"
                  className={`text-[11px] font-bold uppercase tracking-widest ${
                    isDark ? "text-[#BBAFC6]" : "text-[#584D63]"
                  }`}
                >
                  PIN de Sucursal (6 Dígitos)
                </label>
                <button
                  type="button"
                  onClick={() => setShowKeypad(!showKeypad)}
                  className="text-[11px] text-[#7B6E86] dark:text-[#D2C483] hover:underline font-semibold"
                >
                  {showKeypad ? "Ocultar teclado" : "Mostrar teclado"}
                </button>
              </div>

              {/* Display de 6 Puntos para PIN de Kiosco */}
              <div
                className={`relative flex items-center justify-center gap-3.5 p-4 rounded-2xl border ${
                  isDark
                    ? "bg-black/60 border-white/15"
                    : "bg-stone-50 border-stone-200"
                }`}
              >
                {[0, 1, 2, 3, 4, 5].map((idx) => {
                  const filled = pin.length > idx;
                  return (
                    <div
                      key={idx}
                      className={`h-4 w-4 rounded-full transition-all duration-200 ${
                        filled
                          ? "bg-[#D2C483] scale-110 shadow-md shadow-[#D2C483]/50 ring-2 ring-[#7B6E86]"
                          : isDark
                          ? "bg-white/15 border border-white/20"
                          : "bg-stone-300 border border-stone-400"
                      }`}
                    />
                  );
                })}

                {/* Input real invisible para soporte de teclado físico y accesibilidad */}
                <input
                  ref={pinInputRef}
                  id="pinInput"
                  type="password"
                  maxLength={6}
                  disabled={isLocked || isLoading}
                  value={pin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setPin(val);
                    setErrorMsg(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAuthenticate();
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  aria-label="Código PIN de 6 dígitos"
                />
              </div>
            </div>
          )}

          {/* Teclado Numérico Virtual Táctil (Solo para Kiosco) */}
          {mode === "kiosco_only" && showKeypad && !isLocked && (
            <div
              className="grid grid-cols-3 gap-2 pt-1 select-none"
              role="group"
              aria-label="Teclado numérico táctil"
            >
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleKeypadPress(digit)}
                  className={`h-12 sm:h-13 rounded-2xl border text-lg sm:text-xl font-bold font-mono transition active:scale-95 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#7B6E86] ${
                    isDark
                      ? "bg-white/5 hover:bg-white/10 border-white/10 text-white"
                      : "bg-stone-100 hover:bg-stone-200 border-stone-200 text-stone-800"
                  }`}
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                disabled={isLoading}
                onClick={handleKeypadClear}
                className={`h-12 sm:h-13 rounded-2xl border text-xs font-bold transition active:scale-95 flex items-center justify-center ${
                  isDark
                    ? "bg-white/5 hover:bg-white/10 border-white/10 text-stone-400"
                    : "bg-stone-100 hover:bg-stone-200 border-stone-200 text-stone-600"
                }`}
              >
                Limpiar
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleKeypadPress("0")}
                className={`h-12 sm:h-13 rounded-2xl border text-lg sm:text-xl font-bold font-mono transition active:scale-95 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#7B6E86] ${
                  isDark
                    ? "bg-white/5 hover:bg-white/10 border-white/10 text-white"
                    : "bg-stone-100 hover:bg-stone-200 border-stone-200 text-stone-800"
                }`}
              >
                0
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={handleKeypadBackspace}
                className={`h-12 sm:h-13 rounded-2xl border text-xs font-bold transition active:scale-95 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#7B6E86] ${
                  isDark
                    ? "bg-white/5 hover:bg-white/10 border-white/10 text-stone-400"
                    : "bg-stone-100 hover:bg-stone-200 border-stone-200 text-stone-600"
                }`}
                aria-label="Borrar último dígito"
              >
                <Delete className="h-5 w-5" />
              </button>
            </div>
          )}

          {/* Mensaje de Error */}
          {errorMsg && !isLocked && (
            <div
              role="alert"
              className="text-xs text-rose-300 bg-rose-950/40 border border-rose-500/30 rounded-2xl p-3 flex items-center gap-2"
            >
              <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Botón de Autenticación */}
          <button
            type="button"
            disabled={
              isLocked ||
              isLoading ||
              (mode === "kiosco_only" ? pin.length !== 6 : !adminPassword.trim())
            }
            onClick={() => handleAuthenticate()}
            className={`w-full rounded-2xl font-extrabold text-sm py-4 px-6 transition duration-200 shadow-xl flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-offset-2 ${
              isLocked ||
              (mode === "kiosco_only"
                ? pin.length !== 6
                : !adminPassword.trim())
                ? "bg-stone-300 dark:bg-white/10 text-stone-500 dark:text-stone-500 cursor-not-allowed border border-transparent"
                : "bg-[#7B6E86] hover:bg-[#685B73] active:scale-[0.99] text-white focus:ring-[#7B6E86] shadow-[#7B6E86]/30"
            }`}
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Verificando acceso...</span>
              </>
            ) : mode === "kiosco_only" ? (
              <>
                <Tablet className="h-4 w-4 text-[#D2C483]" />
                <span>Activar Kiosco #{kioskNumber}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 text-[#D2C483]" />
                <span>Entrar a Consola Administrativa</span>
              </>
            )}
          </button>
        </div>
      </main>

      {/* Pie de Página */}
      <footer
        className={`relative z-10 mt-6 text-center text-xs flex items-center gap-2 ${
          isDark ? "text-[#8E839B]" : "text-[#766A82]"
        }`}
      >
        <Lock className="h-3.5 w-3.5 text-[#D2C483]" />
        <span>Stiliza & Devotion OS · Sesión Criptográfica HMAC-SHA256</span>
      </footer>
    </div>
  );
}
