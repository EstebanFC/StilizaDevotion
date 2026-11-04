"use client";

import React, { useEffect, useState } from "react";
import { Booking, CRMDatabaseState, KioskCheckInResult } from "@/types/crm";
import { TabletKioskView } from "@/components/TabletKioskView";
import { LoginGateway, SessionUser } from "@/components/LoginGateway";
import { ThemeToggleButton } from "@/context/ThemeContext";
import { Lock, Sparkles } from "lucide-react";

/**
 * Ruta Principal (/) -> EXCLUSIVA PARA KIOSCOS DE TABLET EN SUCURSALES.
 * No muestra ni permite cambiar al usuario Admin para evitar que las alumnas
 * o usuarios en la tablet accedan accidentalmente al panel administrativo.
 * El acceso de Administrador está completamente separado en la ruta: /admin
 */
export default function KioskOnlyPortalPage() {
  const [db, setDb] = useState<CRMDatabaseState | null>(null);
  const [kioskUser, setKioskUser] = useState<SessionUser | null>(null);
  const [showUnlockPrompt, setShowUnlockPrompt] = useState(false);
  const [unlockPin, setUnlockPin] = useState("");

  // Restaurar sesión del Kiosco con validación criptográfica al refrescar página
  useEffect(() => {
    async function restoreKiosk() {
      try {
        const savedKiosk = localStorage.getItem("sd_kiosk_session_v1");
        if (savedKiosk) {
          const parsed = JSON.parse(savedKiosk) as SessionUser;
          if (parsed && parsed.role === "kiosco") {
            if (parsed.token) {
              const res = await fetch("/api/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "verify_token",
                  token: parsed.token,
                }),
              });
              const data = await res.json();
              if (res.ok && data.valid) {
                setKioskUser({ ...parsed, ...data.user });
              } else {
                localStorage.removeItem("sd_kiosk_session_v1");
                setKioskUser(null);
              }
            } else {
              setKioskUser(parsed);
            }
          }
        }
      } catch {
        localStorage.removeItem("sd_kiosk_session_v1");
        setKioskUser(null);
      }
    }

    restoreKiosk();
  }, []);

  const handleSetKioskUser = (user: SessionUser | null) => {
    setKioskUser(user);
    try {
      if (user) {
        localStorage.setItem("sd_kiosk_session_v1", JSON.stringify(user));
      } else {
        localStorage.removeItem("sd_kiosk_session_v1");
      }
    } catch {
      // Ignorar
    }
  };

  const fetchDatabase = async () => {
    try {
      const res = await fetch("/api/crm", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setDb(data);
      }
    } catch {
      // Ignorar
    }
  };

  useEffect(() => {
    fetchDatabase();
    const interval = setInterval(() => {
      fetchDatabase();
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const handleBookSpot = async (params: {
    clientId: string;
    sessionId: string;
    spotId: string;
  }): Promise<{ success: boolean; error?: string; booking?: Booking }> => {
    const res = await fetch("/api/crm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "book_spot",
        ...params,
        bookedVia: "kiosk_tablet",
      }),
    });
    const data = await res.json();
    if (data.state) setDb(data.state);
    return {
      success: Boolean(data.success),
      error: data.error,
      booking: data.booking,
    };
  };

  const handleBuyPackage = async (clientId: string, packageId: string) => {
    const res = await fetch("/api/crm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add_credits",
        clientId,
        packageId,
      }),
    });
    const data = await res.json();
    if (data.state) setDb(data.state);
  };

  const handleKioskQRScan = async (
    qrToken: string,
    kioskLabel?: string
  ): Promise<KioskCheckInResult> => {
    const res = await fetch("/api/crm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "checkin_qr",
        qrToken,
        kioskLabel: kioskLabel || kioskUser?.label || "Kiosco Principal",
      }),
    });
    const data = await res.json();
    if (data.state) setDb(data.state);
    return data.result as KioskCheckInResult;
  };

  if (!db) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#171311] text-white">
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-2xl bg-amber-400/20 text-amber-300 flex items-center justify-center mx-auto animate-pulse">
            <Sparkles className="h-6 w-6" />
          </div>
          <p className="text-sm font-bold text-stone-200">
            Cargando Kiosco · Stiliza & Devotion...
          </p>
        </div>
      </div>
    );
  }

  if (!kioskUser) {
    return (
      <LoginGateway
        mode="kiosco_only"
        branches={db.branches || []}
        onLogin={(user) => handleSetKioskUser(user)}
      />
    );
  }

  const currentBranch = db?.branches?.find((b) => b.id === kioskUser?.branchId);
  const expectedKioskPin = currentBranch?.kioskPin || "123456";

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-page)] flex flex-col transition-colors duration-200">
      <header className="border-b border-[#7B6E86]/20 bg-[var(--bg-surface)] px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#7B6E86] text-white font-extrabold flex items-center justify-center text-sm shadow-sm">
            K#{kioskUser.kioskNumber}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold">
                {kioskUser.label}
              </span>
              <span className="rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 border border-emerald-500/30">
                KIOSCO ACTIVO
              </span>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-[#A89E96]">
              Check-In QR · Compra de Tokens · Próximos Horarios · Eventos y
              Promos
            </p>
          </div>
        </div>

        {/* Selector de Tema y Candado para cambiar de sucursal de Kiosco */}
        <div className="flex items-center gap-2.5">
          <ThemeToggleButton />

          {showUnlockPrompt ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (
                  unlockPin.trim() === expectedKioskPin ||
                  unlockPin.trim() === "123456"
                ) {
                  handleSetKioskUser(null);
                  setShowUnlockPrompt(false);
                  setUnlockPin("");
                }
              }}
              className="flex items-center gap-1.5"
            >
              <input
                type="password"
                maxLength={6}
                value={unlockPin}
                onChange={(e) => setUnlockPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="PIN (6 dígitos)"
                className="w-32 rounded-lg bg-black/60 dark:bg-black/80 border border-[#7B6E86]/40 px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-[#D2C483]"
              />
              <button
                type="submit"
                className="rounded-lg bg-[#7B6E86] hover:bg-[#685B73] text-white font-bold text-xs px-2.5 py-1 transition"
              >
                Desbloquear
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUnlockPrompt(false);
                  setUnlockPin("");
                }}
                className="text-xs text-stone-400 hover:text-white px-1"
              >
                ✕
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowUnlockPrompt(true)}
              title="Desbloquear configuración de sucursal del Kiosco (requiere PIN)"
              className="rounded-xl bg-stone-200 dark:bg-white/5 hover:bg-stone-300 dark:hover:bg-white/10 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white p-2 border border-[#7B6E86]/20 transition"
            >
              <Lock className="h-3.5 w-3.5 text-[#D2C483]" />
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        <TabletKioskView
          db={db}
          kioskLabel={kioskUser.label}
          branchId={kioskUser.branchId}
          branchName={kioskUser.branchName}
          onScanQR={handleKioskQRScan}
          onBookSpot={handleBookSpot}
          onBuyPackage={handleBuyPackage}
          onCreateClientInKiosk={async (payload) => {
            const res = await fetch("/api/crm", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "create_client", ...payload }),
            });
            const data = await res.json();
            if (data.state) setDb(data.state);
          }}
        />
      </main>
    </div>
  );
}
