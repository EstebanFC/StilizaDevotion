"use client";

import React, { useState } from "react";
import { CRMDatabaseState, ExternalAggregator } from "@/types/crm";
import {
  CheckCircle2,
  Link2,
  MailCheck,
  RefreshCw,
  ShieldAlert,
  Webhook,
  Zap,
} from "lucide-react";

interface ChannelManagerPanelProps {
  db: CRMDatabaseState;
  selectedSessionId: string;
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

export function ChannelManagerPanel({
  db,
  selectedSessionId,
  onSyncExternalBooking,
}: ChannelManagerPanelProps) {
  const [simulatingPlatform, setSimulatingPlatform] =
    useState<ExternalAggregator | null>(null);
  const [syncAlert, setSyncAlert] = useState<string | null>(null);
  const [showIntegrationGuide, setShowIntegrationGuide] = useState(false);

  const activeSession =
    db.sessions.find((s) => s.id === selectedSessionId) || db.sessions[0];

  const sampleNames: Record<ExternalAggregator, string> = {
    wellhub: "Fernanda Castillo (Wellhub)",
    totalpass: "Lucía Mondragón (TotalPass)",
    fitpass: "Ximena Ornelas (FitPass)",
    nessty: "Natalia Soler (Nessty)",
  };

  const handleSimulateExternal = async (platform: ExternalAggregator) => {
    if (!activeSession || simulatingPlatform) return;
    setSimulatingPlatform(platform);
    setSyncAlert(null);
    try {
      const res = await onSyncExternalBooking({
        platform,
        clientName: sampleNames[platform],
        sessionId: activeSession.id,
      });
      if (res.success) {
        setSyncAlert(
          `🔄 [Sincronización Omnicanal OK]: Entró reserva de ${platform.toUpperCase()} para "${activeSession.title}". Se bloqueó automáticamente el lugar ${res.spotAssigned} en el mapa y se actualizó el cupo disponible (${res.remainingSlots} lugares libres) hacia Wellhub, TotalPass, FitPass y Nessty.`
        );
      } else {
        setSyncAlert(`⚠️ ${res.error}`);
      }
    } finally {
      setSimulatingPlatform(null);
    }
  };

  const aggregators = db.aggregators || [
    {
      id: "wellhub" as ExternalAggregator,
      name: "Wellhub" as const,
      connectionType: "api_webhook" as const,
      connected: true,
      autoBlockSpots: true,
      maxSpotsPerSession: 5,
      syncedBookingsToday: 4,
      lastSyncAt: "Hace 2 min",
      colorBadge: "bg-rose-500/20 text-rose-300 border-rose-400/30",
    },
    {
      id: "totalpass" as ExternalAggregator,
      name: "TotalPass" as const,
      connectionType: "api_webhook" as const,
      connected: true,
      autoBlockSpots: true,
      maxSpotsPerSession: 4,
      syncedBookingsToday: 3,
      lastSyncAt: "Hace 5 min",
      colorBadge: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
    },
    {
      id: "fitpass" as ExternalAggregator,
      name: "FitPass" as const,
      connectionType: "inbound_email_bridge" as const,
      connected: true,
      autoBlockSpots: true,
      maxSpotsPerSession: 4,
      syncedBookingsToday: 5,
      lastSyncAt: "Hace 1 min",
      colorBadge: "bg-sky-500/20 text-sky-300 border-sky-400/30",
    },
    {
      id: "nessty" as ExternalAggregator,
      name: "Nessty" as const,
      connectionType: "inbound_email_bridge" as const,
      connected: true,
      autoBlockSpots: true,
      maxSpotsPerSession: 4,
      syncedBookingsToday: 2,
      lastSyncAt: "Hace 8 min",
      colorBadge: "bg-purple-500/20 text-purple-300 border-purple-400/30",
    },
  ];

  return (
    <div className="rounded-3xl bg-gradient-to-br from-[#191513] via-[#231D19] to-[#14110F] text-stone-100 p-5 sm:p-6 shadow-xl border border-stone-800 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-amber-400/15 border border-amber-300/30 flex items-center justify-center shrink-0">
            <Link2 className="h-5 w-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2.5 py-0.5 text-[10px] font-bold uppercase">
                <Zap className="h-3 w-3" /> Channel Manager Anti-Overbooking
              </span>
              <span className="text-xs text-stone-400">
                Sincronización de Inventario de Máquinas y Tapetes
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-white mt-0.5">
              Integración con Wellhub, TotalPass, FitPass y Nessty
            </h3>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowIntegrationGuide((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-amber-200 px-3.5 py-2 border border-white/15 transition"
        >
          <Webhook className="h-4 w-4" />
          ¿Cómo se conectan en producción?
        </button>
      </div>

      {showIntegrationGuide && (
        <div className="rounded-2xl bg-black/50 border border-white/15 p-4 text-xs space-y-2.5 text-stone-300">
          <p className="font-bold text-amber-300">
            🔌 Arquitectura real de conexión para tus 4 plataformas en{" "}
            <code className="text-emerald-300 font-mono">
              POST https://stilizadevotion.vercel.app/api/integrations/aggregator
            </code>
            :
          </p>
          <ul className="space-y-1.5 list-disc pl-5">
            <li>
              <strong className="text-white">
                1. Wellhub (Gympass) y TotalPass (Vía Partner Webhook API):
              </strong>{" "}
              En el portal de Partner de Wellhub/TotalPass pides activar el
              Webhook de reservas apuntando a tu URL. Cada vez que una alumna
              reserva ahí, tu sistema recibe el JSON, bloquea una máquina
              Reformer o tapete libre y actualiza el cupo restante.
            </li>
            <li>
              <strong className="text-white">
                2. FitPass y Nessty (Vía Puente de Correo / Inbound Email
                Bridge):
              </strong>{" "}
              Como FitPass y Nessty envían un correo instantáneo a tu estudio en
              cada reserva o cancelación, conectas un reenvío automático de esos
              correos (con Make.com, Zapier o Cloudflare Email Routing gratis)
              hacia tu endpoint. En menos de 2 segundos bloquea el lugar en tu
              mapa y evita sobrecupo.
            </li>
          </ul>
        </div>
      )}

      {/* 4 Platform Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {aggregators.map((agg) => (
          <div
            key={agg.id}
            className="rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col justify-between space-y-3"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-extrabold ${agg.colorBadge}`}
                >
                  {agg.name}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300 font-semibold">
                  <CheckCircle2 className="h-3 w-3" /> Activo
                </span>
              </div>

              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-stone-300">
                {agg.connectionType === "api_webhook" ? (
                  <>
                    <Webhook className="h-3.5 w-3.5 text-amber-300" />
                    <span>Partner Webhook API</span>
                  </>
                ) : (
                  <>
                    <MailCheck className="h-3.5 w-3.5 text-sky-300" />
                    <span>Email Parser Bridge</span>
                  </>
                )}
              </div>

              <p className="text-xs text-stone-400 mt-1">
                Hoy:{" "}
                <strong className="text-white">
                  {agg.syncedBookingsToday} lugares bloqueados
                </strong>{" "}
                · Sync: {agg.lastSyncAt}
              </p>
            </div>

            <button
              type="button"
              disabled={simulatingPlatform !== null}
              onClick={() => handleSimulateExternal(agg.id)}
              className="w-full rounded-xl bg-white/10 hover:bg-amber-400 hover:text-stone-950 text-white font-bold text-xs py-2 px-3 transition inline-flex items-center justify-center gap-1.5"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${
                  simulatingPlatform === agg.id ? "animate-spin" : ""
                }`}
              />
              Simular Reserva {agg.name}
            </button>
          </div>
        ))}
      </div>

      {syncAlert && (
        <div className="rounded-2xl bg-emerald-950/80 border border-emerald-400/50 p-3.5 text-xs text-emerald-100 flex items-center gap-2.5">
          <ShieldAlert className="h-4 w-4 text-emerald-300 shrink-0" />
          <span>{syncAlert}</span>
        </div>
      )}
    </div>
  );
}
