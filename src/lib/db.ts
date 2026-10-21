import fs from "fs";
import os from "os";
import path from "path";
import {
  AggregatorConnection,
  Booking,
  BookingSource,
  Branch,
  ChatMessage,
  ClassPackage,
  ClassSession,
  Client,
  Coach,
  CRMDatabaseState,
  DayOfWeek,
  ExternalAggregator,
  KioskCheckInResult,
  RoomLayoutCell,
  SpotConfig,
  StudioPromoEvent,
  StudioRoom,
} from "@/types/crm";

const DATA_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), "stiliza-data")
  : path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "crm-store-v4.json");

/**
 * Construye los SpotConfig y las filas exactas (layoutRows) de izquierda a derecha
 * a partir de una matriz donde cada celda es un número de lugar (1..12) o "COACH".
 */
function buildCustomRoomLayout(params: {
  rowsDefinition: Array<Array<number | "COACH">>;
  type: "reformer_machine" | "hot_mat";
}): {
  spots: SpotConfig[];
  layoutRows: RoomLayoutCell[][];
} {
  const spotsMap = new Map<string, SpotConfig>();
  const layoutRows: RoomLayoutCell[][] = [];

  params.rowsDefinition.forEach((rowCells, rowIdx) => {
    const currentRow: RoomLayoutCell[] = [];
    const rowNumber = rowIdx + 1;
    const isFrontRow = rowIdx === 0;

    rowCells.forEach((cell, colIdx) => {
      if (cell === "COACH") {
        currentRow.push({ kind: "coach", label: "COACH" });
      } else {
        const spotId = String(cell);
        const zone = isFrontRow ? "Frente al Espejo" : "Zona Posterior";
        const label =
          params.type === "reformer_machine"
            ? `Reformer #${spotId}`
            : `Tapete #${spotId}`;

        const spotObj: SpotConfig = {
          id: spotId,
          label,
          shortLabel: `#${spotId}`,
          row: rowNumber,
          col: colIdx + 1,
          zone,
          type: params.type,
          status: "available",
        };
        spotsMap.set(spotId, spotObj);
        currentRow.push({ kind: "spot", spotId });
      }
    });

    layoutRows.push(currentRow);
  });

  // Ordenar spots numéricamente en el arreglo general pero manteniendo layoutRows intacto
  const spots = Array.from(spotsMap.values()).sort(
    (a, b) => Number(a.id) - Number(b.id)
  );

  return { spots, layoutRows };
}

export function getInitialSeedData(): CRMDatabaseState {
  const today = "2026-10-20";
  const tomorrow = "2026-10-21";

  // LAS 6 SUCURSALES OFICIALES DE STILIZA & DEVOTION CON SUS SIGLAS OFICIALES
  const branches: Branch[] = [
    {
      id: "br-stiliza-san-isidro",
      code: "STSI",
      brand: "Stiliza",
      name: "Stiliza San Isidro",
      address: "San Isidro (STSI) · 5 lugares en fila",
      kiosksCount: 1,
      monthlyRevenueMXN: 165000,
    },
    {
      id: "br-stiliza-juriquilla",
      code: "STJU",
      brand: "Stiliza",
      name: "Stiliza Juriquilla",
      address: "Juriquilla (STJU) · 8 lugares en fila",
      kiosksCount: 1,
      monthlyRevenueMXN: 245000,
    },
    {
      id: "br-stiliza-campanario",
      code: "STCA",
      brand: "Stiliza",
      name: "Stiliza Campanario",
      address: "El Campanario (STCA) · 0 lugares de momento",
      kiosksCount: 1,
      monthlyRevenueMXN: 0,
    },
    {
      id: "br-devotion-zibata",
      code: "DEZI",
      brand: "Devotion",
      name: "Devotion Zibatá",
      address: "Zibatá (DEZI) · 12 lugares (2 filas con Coach al frente)",
      kiosksCount: 1,
      monthlyRevenueMXN: 310000,
    },
    {
      id: "br-devotion-juriquilla",
      code: "DEJU",
      brand: "Devotion",
      name: "Devotion Juriquilla",
      address: "Juriquilla (DEJU) · 12 lugares (2 filas con Coach al frente)",
      kiosksCount: 1,
      monthlyRevenueMXN: 325000,
    },
    {
      id: "br-devotion-campanario",
      code: "DECA",
      brand: "Devotion",
      name: "Devotion Campanario",
      address: "El Campanario (DECA) · 12 lugares (2 filas con Coach al frente)",
      kiosksCount: 1,
      monthlyRevenueMXN: 340000,
    },
  ];

  // 1. Stiliza San Isidro: 1 fila de 5 lugares (1, 2, 3, 4, 5)
  const layoutSanIsidro = buildCustomRoomLayout({
    rowsDefinition: [[1, 2, 3, 4, 5]],
    type: "reformer_machine",
  });

  // 2. Stiliza Juriquilla: 1 fila de 8 lugares (1, 2, 3, 4, 5, 6, 7, 8)
  const layoutStilizaJuriquilla = buildCustomRoomLayout({
    rowsDefinition: [[1, 2, 3, 4, 5, 6, 7, 8]],
    type: "reformer_machine",
  });

  // 3. Stiliza Campanario: 0 lugares de momento
  const layoutStilizaCampanario = {
    spots: [] as SpotConfig[],
    layoutRows: [] as RoomLayoutCell[][],
  };

  // 4. Devotion Zibatá:
  //    Enfrente: 1, 2, coach, 3, 4, 5
  //    Atrás:    12, 11, 10, 9, 8, 7, 6
  const layoutDevotionZibata = buildCustomRoomLayout({
    rowsDefinition: [
      [1, 2, "COACH", 3, 4, 5],
      [12, 11, 10, 9, 8, 7, 6],
    ],
    type: "hot_mat",
  });

  // 5. Devotion Juriquilla:
  //    Enfrente: 6, 5, 4, coach, 3, 2, 1
  //    Atrás:    7, 8, 9, 10, 11, 12
  const layoutDevotionJuriquilla = buildCustomRoomLayout({
    rowsDefinition: [
      [6, 5, 4, "COACH", 3, 2, 1],
      [7, 8, 9, 10, 11, 12],
    ],
    type: "hot_mat",
  });

  // 6. Devotion Campanario:
  //    Enfrente: 1, 2, 3, coach, 4, 5, 6
  //    Atrás:    7, 8, 9, 10, 11, 12
  const layoutDevotionCampanario = buildCustomRoomLayout({
    rowsDefinition: [
      [1, 2, 3, "COACH", 4, 5, 6],
      [7, 8, 9, 10, 11, 12],
    ],
    type: "hot_mat",
  });

  const rooms: StudioRoom[] = [
    {
      id: "room-stiliza-san-isidro",
      branchId: "br-stiliza-san-isidro",
      branchName: "Stiliza San Isidro",
      brand: "Stiliza",
      name: "Salón Reformer · Stiliza San Isidro",
      discipline: "reformer",
      temperature: "5 lugares en 1 fila (Izquierda a Derecha: 1 al 5)",
      rows: 1,
      cols: 5,
      spots: layoutSanIsidro.spots,
      layoutRows: layoutSanIsidro.layoutRows,
    },
    {
      id: "room-stiliza-juriquilla",
      branchId: "br-stiliza-juriquilla",
      branchName: "Stiliza Juriquilla",
      brand: "Stiliza",
      name: "Salón Reformer · Stiliza Juriquilla",
      discipline: "reformer",
      temperature: "8 lugares en 1 fila (Izquierda a Derecha: 1 al 8)",
      rows: 1,
      cols: 8,
      spots: layoutStilizaJuriquilla.spots,
      layoutRows: layoutStilizaJuriquilla.layoutRows,
    },
    {
      id: "room-stiliza-campanario",
      branchId: "br-stiliza-campanario",
      branchName: "Stiliza Campanario",
      brand: "Stiliza",
      name: "Salón Reformer · Stiliza Campanario",
      discipline: "reformer",
      temperature: "0 lugares configurados de momento (Próxima apertura)",
      rows: 0,
      cols: 0,
      spots: layoutStilizaCampanario.spots,
      layoutRows: layoutStilizaCampanario.layoutRows,
    },
    {
      id: "room-devotion-zibata",
      branchId: "br-devotion-zibata",
      branchName: "Devotion Zibatá",
      brand: "Devotion",
      name: "Hot Studio · Devotion Zibatá",
      discipline: "hot_pilates",
      temperature:
        "38.5°C Infrarrojo · Frente: 1,2,Coach,3,4,5 | Atrás: 12,11,10,9,8,7,6",
      rows: 2,
      cols: 7,
      spots: layoutDevotionZibata.spots,
      layoutRows: layoutDevotionZibata.layoutRows,
    },
    {
      id: "room-devotion-juriquilla",
      branchId: "br-devotion-juriquilla",
      branchName: "Devotion Juriquilla",
      brand: "Devotion",
      name: "Hot Studio · Devotion Juriquilla",
      discipline: "hot_pilates",
      temperature:
        "38.5°C Infrarrojo · Frente: 6,5,4,Coach,3,2,1 | Atrás: 7,8,9,10,11,12",
      rows: 2,
      cols: 7,
      spots: layoutDevotionJuriquilla.spots,
      layoutRows: layoutDevotionJuriquilla.layoutRows,
    },
    {
      id: "room-devotion-campanario",
      branchId: "br-devotion-campanario",
      branchName: "Devotion Campanario",
      brand: "Devotion",
      name: "Hot Studio · Devotion Campanario",
      discipline: "hot_pilates",
      temperature:
        "38.5°C Infrarrojo · Frente: 1,2,3,Coach,4,5,6 | Atrás: 7,8,9,10,11,12",
      rows: 2,
      cols: 7,
      spots: layoutDevotionCampanario.spots,
      layoutRows: layoutDevotionCampanario.layoutRows,
    },
  ];

  const coaches: Coach[] = [
    {
      id: "coach-1",
      name: "Coach Daniela R.",
      avatar: "DR",
      specialty: "reformer",
      occupancyRate: 98,
      vibeBadge: "✨ Reina del Core & Reformer",
    },
    {
      id: "coach-2",
      name: "Coach Paulina V.",
      avatar: "PV",
      specialty: "hot_pilates",
      occupancyRate: 95,
      vibeBadge: "🔥 Queen del Inferno 38°C",
    },
    {
      id: "coach-3",
      name: "Coach Alejandra M.",
      avatar: "AM",
      specialty: "reformer",
      occupancyRate: 93,
      vibeBadge: "⚡ Athletic Flow Master",
    },
    {
      id: "coach-4",
      name: "Coach Fernanda L.",
      avatar: "FL",
      specialty: "hot_pilates",
      occupancyRate: 96,
      vibeBadge: "🕯️ Candlelight & Detox Guru",
    },
    {
      id: "coach-5",
      name: "Coach Valentina S.",
      avatar: "VS",
      specialty: "ambas",
      occupancyRate: 91,
      vibeBadge: "🍑 Glute & Sculpt Specialist",
    },
  ];

  const promosAndEvents: StudioPromoEvent[] = [
    {
      id: "ev-1",
      title: "DJ Live Sunset Reformer · Juriquilla",
      description:
        "Sesión especial de 50 min con DJ en vivo e hidratación al terminar.",
      type: "clase_especial",
      dateLabel: "Viernes 19:30 hrs",
      highlightBadge: "🎧 DJ en Vivo",
      priceText: "1 Token de tu paquete",
      branchId: "br-stiliza-juriquilla",
      branchName: "Stiliza Juriquilla",
    },
    {
      id: "ev-2",
      title: "Candlelight Soundbath & Hot Pilates 38°C",
      description:
        "40 min de Sculpt intenso con calor infrarrojo + 15 min de inmersión sonora.",
      type: "evento",
      dateLabel: "Sábado 10:30 hrs",
      highlightBadge: "🕯️ Experiencia Sensorial",
      priceText: "1 Token · Cupo 12 lugares",
      branchId: "br-devotion-campanario",
      branchName: "Devotion Campanario",
    },
    {
      id: "ev-3",
      title: "Promo Kiosco: +3 Tokens Gratis en Pack 16",
      description:
        "Recarga hoy directamente en esta tablet el paquete Sculpt & Burn 16 y recibe 19 tokens.",
      type: "promo",
      dateLabel: "Vigente toda la semana",
      highlightBadge: "🎁 +3 Tokens Gratis",
      priceText: "$4,200 MXN",
      branchId: "all",
      branchName: "Todas las sucursales Stiliza & Devotion",
    },
  ];

  const packages: ClassPackage[] = [
    {
      id: "pkg-dropin",
      name: "Single Drop-In (1 Token)",
      credits: 1,
      priceMXN: 380,
      validityDays: 15,
      allowedDisciplines: ["reformer", "hot_pilates"],
      promoTag: "Acceso inmediato",
    },
    {
      id: "pkg-devotion-8",
      name: "Devotion & Stiliza 8 Tokens",
      credits: 8,
      priceMXN: 2450,
      validityDays: 30,
      allowedDisciplines: ["reformer", "hot_pilates"],
      badge: "Más Vendido",
      promoTag: "$306 por clase",
    },
    {
      id: "pkg-sculpt-16",
      name: "Sculpt & Burn 16 Tokens (+3 Gratis)",
      credits: 19,
      priceMXN: 4200,
      validityDays: 45,
      allowedDisciplines: ["reformer", "hot_pilates"],
      badge: "Promo Kiosco 🔥",
      promoTag: "Incluye 3 tokens de regalo",
    },
    {
      id: "pkg-unlimited",
      name: "Black Pass 30 Tokens (Multi-Sucursal)",
      credits: 30,
      priceMXN: 5400,
      validityDays: 30,
      allowedDisciplines: ["reformer", "hot_pilates"],
      badge: "VIP All-Access",
      promoTag: "San Isidro · Juriquilla · Zibatá · Campanario",
    },
  ];

  const clients: Client[] = [
    {
      id: "cli-1",
      name: "Valeria Montemayor",
      phone: "+52 987 871 0684",
      email: "valeria.m@gmail.com",
      avatarInitials: "VM",
      activePackageName: "Sculpt & Burn 16 Tokens",
      creditsRemaining: 11,
      creditsTotal: 16,
      packageExpiresAt: "2026-11-25",
      status: "activo",
      totalAttended: 42,
      noShowsCount: 0,
      preferredSpot: "3",
      homeBranchName: "Devotion Zibatá",
      medicalNotes: "Ninguna lesión. Prefiere lugar 3 junto al Coach.",
      joinedAt: "2025-08-14",
    },
    {
      id: "cli-2",
      name: "Camila Elizondo",
      phone: "+52 442 910 3341",
      email: "camila.elizondo@outlook.com",
      avatarInitials: "CE",
      activePackageName: "Devotion & Stiliza 8 Tokens",
      creditsRemaining: 2,
      creditsTotal: 8,
      packageExpiresAt: "2026-10-29",
      status: "pocos_creditos",
      totalAttended: 19,
      noShowsCount: 1,
      preferredSpot: "4",
      homeBranchName: "Devotion Juriquilla",
      medicalNotes: "Cuidado muñeca derecha en planchas.",
      joinedAt: "2026-01-10",
    },
    {
      id: "cli-3",
      name: "Sofía Villalobos",
      phone: "+52 442 773 1289",
      email: "sofi.villalobos@icloud.com",
      avatarInitials: "SV",
      activePackageName: "Black Pass 30 Tokens",
      creditsRemaining: 24,
      creditsTotal: 30,
      packageExpiresAt: "2026-11-18",
      status: "activo",
      totalAttended: 86,
      noShowsCount: 0,
      preferredSpot: "1",
      homeBranchName: "Stiliza Juriquilla",
      medicalNotes: "Alumna VIP embajadora.",
      joinedAt: "2025-03-02",
    },
    {
      id: "cli-4",
      name: "Mariana Garza",
      phone: "+52 442 234 6780",
      email: "mariana.garza@gmail.com",
      avatarInitials: "MG",
      activePackageName: "Devotion & Stiliza 8 Tokens",
      creditsRemaining: 6,
      creditsTotal: 8,
      packageExpiresAt: "2026-11-15",
      status: "activo",
      totalAttended: 14,
      noShowsCount: 0,
      preferredSpot: "2",
      homeBranchName: "Devotion Campanario",
      joinedAt: "2026-05-20",
    },
    {
      id: "cli-5",
      name: "Diego Santillán",
      phone: "+52 442 619 4422",
      email: "dsantillan@empresa.mx",
      avatarInitials: "DS",
      activePackageName: "Single Drop-In (1 Token)",
      creditsRemaining: 0,
      creditsTotal: 1,
      packageExpiresAt: "2026-10-22",
      status: "sin_creditos",
      totalAttended: 5,
      noShowsCount: 3,
      preferredSpot: "5",
      homeBranchName: "Stiliza San Isidro",
      medicalNotes: "Tensión lumbar ocasional.",
      joinedAt: "2026-09-01",
    },
    {
      id: "cli-6",
      name: "Renata Altamirano",
      phone: "+52 442 339 1120",
      email: "renata.alt@gmail.com",
      avatarInitials: "RA",
      activePackageName: "Sculpt & Burn 16 Tokens",
      creditsRemaining: 14,
      creditsTotal: 16,
      packageExpiresAt: "2026-11-30",
      status: "activo",
      totalAttended: 31,
      noShowsCount: 0,
      preferredSpot: "6",
      homeBranchName: "Devotion Juriquilla",
      joinedAt: "2025-11-11",
    },
  ];

  // MATRIZ OFICIAL DE HORARIOS POR ESTUDIO Y DÍA (PROPORCIONADA POR EL USUARIO)
  const OFFICIAL_STUDIO_SCHEDULES: Record<
    string,
    Record<string, Record<string, string>>
  > = {
    "HORARIOS STSI": {
      LUNES: {
        "07:15:00 AM": "REFORMER",
        "08:15:00 AM": "REFORMER",
        "06:00:00 PM": "REFORMER",
        "07:00:00 PM": "REFORMER",
        "08:00:00 PM": "REFORMER",
      },
      MARTES: {
        "07:15:00 AM": "REFORMER",
        "08:15:00 AM": "REFORMER",
        "06:00:00 PM": "REFORMER",
        "07:00:00 PM": "REFORMER",
        "08:00:00 PM": "REFORMER",
      },
      MIERCOLES: {
        "07:15:00 AM": "REFORMER",
        "08:15:00 AM": "REFORMER",
        "06:00:00 PM": "REFORMER",
        "07:00:00 PM": "REFORMER",
      },
      JUEVES: {
        "07:15:00 AM": "REFORMER",
        "08:15:00 AM": "REFORMER",
        "06:00:00 PM": "REFORMER",
        "07:00:00 PM": "REFORMER",
        "08:00:00 PM": "REFORMER",
      },
      VIERNES: {
        "07:15:00 AM": "REFORMER",
        "08:15:00 AM": "REFORMER",
        "06:00:00 PM": "REFORMER",
      },
      SABADO: {
        "07:15:00 AM": "REFORMER",
        "08:15:00 AM": "REFORMER",
        "09:15:00 AM": "REFORMER",
      },
      DOMINGO: {
        "09:15:00 AM": "REFORMER",
        "10:15:00 AM": "REFORMER",
      },
    },
    "HORARIO STJU": {
      LUNES: {
        "08:15:00 AM": "REFORMER",
        "09:15:00 AM": "REFORMER",
        "06:00:00 PM": "REFORMER",
        "07:00:00 PM": "REFORMER",
      },
      MARTES: {
        "06:15:00 AM": "REFORMER",
        "07:15:00 AM": "REFORMER",
        "08:15:00 AM": "REFORMER",
        "09:15:00 AM": "REFORMER",
        "06:00:00 PM": "REFORMER",
      },
      MIERCOLES: {
        "06:15:00 AM": "REFORMER",
        "07:15:00 AM": "REFORMER",
        "08:15:00 AM": "REFORMER",
        "06:00:00 PM": "REFORMER",
        "07:00:00 PM": "REFORMER",
      },
      JUEVES: {
        "06:15:00 AM": "REFORMER",
        "07:15:00 AM": "REFORMER",
        "08:15:00 AM": "REFORMER",
        "09:15:00 AM": "REFORMER",
        "06:00:00 PM": "REFORMER",
      },
      VIERNES: {
        "08:15:00 AM": "REFORMER",
        "09:15:00 AM": "REFORMER",
      },
      SABADO: {
        "08:15:00 AM": "REFORMER",
        "09:15:00 AM": "REFORMER",
      },
      DOMINGO: {
        "08:15:00 AM": "REFORMER",
        "09:15:00 AM": "REFORMER",
      },
    },
    "HORARIO STCA": {
      LUNES: {},
      MARTES: {},
      MIERCOLES: {},
      JUEVES: {},
      VIERNES: {},
      SABADO: {},
      DOMINGO: {},
    },
    "HORARIO DEZI": {
      LUNES: {
        "06:15:00 AM": "FULL BODY",
        "07:15:00 AM": "FULL BODY",
        "08:15:00 AM": "FULL BODY",
        "09:15:00 AM": "FULL BODY",
        "06:00:00 PM": "FULL BODY",
        "07:00:00 PM": "FULL BODY",
      },
      MARTES: {
        "06:15:00 AM": "LOWER BODY",
        "07:15:00 AM": "LOWER BODY",
        "08:15:00 AM": "LOWER BODY",
        "09:15:00 AM": "LOWER BODY",
        "10:15:00 AM": "LOWER BODY",
        "06:00:00 PM": "LOWER BODY",
        "07:00:00 PM": "LOWER BODY",
      },
      MIERCOLES: {
        "06:15:00 AM": "UPPER BODY",
        "07:15:00 AM": "UPPER BODY",
        "08:15:00 AM": "UPPER BODY",
        "09:15:00 AM": "UPPER BODY",
        "06:00:00 PM": "UPPER BODY",
        "07:00:00 PM": "UPPER BODY",
      },
      JUEVES: {
        "06:15:00 AM": "FULL BODY",
        "07:15:00 AM": "FULL BODY",
        "08:15:00 AM": "FULL BODY",
        "09:15:00 AM": "FULL BODY",
        "10:15:00 AM": "FULL BODY",
        "06:00:00 PM": "FULL BODY",
        "07:00:00 PM": "FULL BODY",
        "08:00:00 PM": "FULL BODY",
      },
      VIERNES: {
        "06:15:00 AM": "LOWER BODY",
        "07:15:00 AM": "LOWER BODY",
        "08:15:00 AM": "LOWER BODY",
        "09:15:00 AM": "LOWER BODY",
      },
      SABADO: {
        "08:15:00 AM": "FULL BODY",
        "09:15:00 AM": "FULL BODY",
      },
      DOMINGO: {
        "08:15:00 AM": "FULL BODY",
        "09:15:00 AM": "FULL BODY",
      },
    },
    "HORARIO DEJU": {
      LUNES: {
        "08:15:00 AM": "FULL BODY",
        "09:15:00 AM": "FULL BODY",
        "06:00:00 PM": "FULL BODY",
        "07:00:00 PM": "FULL BODY",
      },
      MARTES: {
        "06:15:00 AM": "LOWER BODY",
        "08:15:00 AM": "LOWER BODY",
        "06:00:00 PM": "LOWER BODY",
        "07:00:00 PM": "LOWER BODY",
      },
      MIERCOLES: {
        "07:15:00 AM": "UPPER BODY",
        "08:15:00 AM": "UPPER BODY",
        "09:15:00 AM": "UPPER BODY",
        "06:00:00 PM": "UPPER BODY",
        "07:00:00 PM": "UPPER BODY",
      },
      JUEVES: {
        "06:15:00 AM": "FULL BODY",
        "08:15:00 AM": "FULL BODY",
        "09:15:00 AM": "STRETCHING",
        "06:00:00 PM": "FULL BODY",
        "07:00:00 PM": "FULL BODY",
      },
      VIERNES: {
        "08:15:00 AM": "UPPER BODY",
        "09:15:00 AM": "UPPER BODY",
      },
      SABADO: {
        "08:15:00 AM": "FULL BODY",
        "09:15:00 AM": "FULL BODY",
      },
      DOMINGO: {
        "09:15:00 AM": "FULL BODY",
      },
    },
    "HORARIO DECA": {
      LUNES: {
        "08:15:00 AM": "FULL BODY",
        "06:00:00 PM": "FULL BODY",
        "07:00:00 PM": "FULL BODY",
      },
      MARTES: {
        "08:15:00 AM": "UPPER BODY",
        "09:15:00 AM": "LOWER BODY",
        "06:00:00 PM": "LOWER BODY",
        "07:00:00 PM": "LOWER BODY",
      },
      MIERCOLES: {
        "08:15:00 AM": "UPPER BODY",
        "09:15:00 AM": "UPPER BODY",
      },
      JUEVES: {
        "08:15:00 AM": "FULL BODY",
        "09:15:00 AM": "LOWER BODY",
        "06:00:00 PM": "FULL BODY",
        "07:00:00 PM": "FULL BODY",
      },
      VIERNES: {
        "08:15:00 AM": "LOWER BODY",
        "09:15:00 AM": "LOWER BODY",
      },
      SABADO: {},
      DOMINGO: {},
    },
  };

  const studioKeyToConfig: Record<
    string,
    {
      code: string;
      branchId: string;
      branchName: string;
      brand: "Stiliza" | "Devotion";
      roomId: string;
      roomName: string;
      discipline: "reformer" | "hot_pilates";
      instructor: string;
      instructorAvatar: string;
    }
  > = {
    "HORARIOS STSI": {
      code: "STSI",
      branchId: "br-stiliza-san-isidro",
      branchName: "Stiliza San Isidro",
      brand: "Stiliza",
      roomId: "room-stiliza-san-isidro",
      roomName: "Salón Reformer · Stiliza San Isidro",
      discipline: "reformer",
      instructor: "Coach Daniela R.",
      instructorAvatar: "DR",
    },
    "HORARIO STJU": {
      code: "STJU",
      branchId: "br-stiliza-juriquilla",
      branchName: "Stiliza Juriquilla",
      brand: "Stiliza",
      roomId: "room-stiliza-juriquilla",
      roomName: "Salón Reformer · Stiliza Juriquilla",
      discipline: "reformer",
      instructor: "Coach Alejandra M.",
      instructorAvatar: "AM",
    },
    "HORARIO STCA": {
      code: "STCA",
      branchId: "br-stiliza-campanario",
      branchName: "Stiliza Campanario",
      brand: "Stiliza",
      roomId: "room-stiliza-campanario",
      roomName: "Salón Reformer · Stiliza Campanario",
      discipline: "reformer",
      instructor: "Coach Daniela R.",
      instructorAvatar: "DR",
    },
    "HORARIO DEZI": {
      code: "DEZI",
      branchId: "br-devotion-zibata",
      branchName: "Devotion Zibatá",
      brand: "Devotion",
      roomId: "room-devotion-zibata",
      roomName: "Hot Studio · Devotion Zibatá",
      discipline: "hot_pilates",
      instructor: "Coach Paulina V.",
      instructorAvatar: "PV",
    },
    "HORARIO DEJU": {
      code: "DEJU",
      branchId: "br-devotion-juriquilla",
      branchName: "Devotion Juriquilla",
      brand: "Devotion",
      roomId: "room-devotion-juriquilla",
      roomName: "Hot Studio · Devotion Juriquilla",
      discipline: "hot_pilates",
      instructor: "Coach Fernanda L.",
      instructorAvatar: "FL",
    },
    "HORARIO DECA": {
      code: "DECA",
      branchId: "br-devotion-campanario",
      branchName: "Devotion Campanario",
      brand: "Devotion",
      roomId: "room-devotion-campanario",
      roomName: "Hot Studio · Devotion Campanario",
      discipline: "hot_pilates",
      instructor: "Coach Valentina S.",
      instructorAvatar: "VS",
    },
  };

  const dayKeyToMeta: Record<
    string,
    { dayOfWeek: DayOfWeek; slug: string; date: string }
  > = {
    LUNES: { dayOfWeek: "Lunes", slug: "lunes", date: "2026-10-19" },
    MARTES: { dayOfWeek: "Martes", slug: "martes", date: "2026-10-20" },
    MIERCOLES: { dayOfWeek: "Miércoles", slug: "miercoles", date: "2026-10-21" },
    JUEVES: { dayOfWeek: "Jueves", slug: "jueves", date: "2026-10-22" },
    VIERNES: { dayOfWeek: "Viernes", slug: "viernes", date: "2026-10-23" },
    SABADO: { dayOfWeek: "Sábado", slug: "sabado", date: "2026-10-24" },
    DOMINGO: { dayOfWeek: "Domingo", slug: "domingo", date: "2026-10-25" },
  };

  function parseOfficialTimeKey(rawTime: string): {
    startTime: string;
    timeBlock: "manana" | "tarde";
  } {
    // Ej. "07:15:00 AM" -> "07:15", "06:00:00 PM" -> "18:00"
    const m = rawTime.trim().match(/^(\d{2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
    if (!m) {
      return { startTime: "18:00", timeBlock: "tarde" };
    }
    let hh = Number(m[1]);
    const mm = m[2];
    const ampm = m[3].toUpperCase();
    if (ampm === "PM" && hh < 12) hh += 12;
    if (ampm === "AM" && hh === 12) hh = 0;
    const startTime = `${String(hh).padStart(2, "0")}:${mm}`;
    return {
      startTime,
      timeBlock: hh < 13 ? "manana" : "tarde",
    };
  }

  const sessions: ClassSession[] = [];

  for (const [studioKey, daysMap] of Object.entries(OFFICIAL_STUDIO_SCHEDULES)) {
    const cfg = studioKeyToConfig[studioKey];
    if (!cfg) continue;

    for (const [dayKey, hoursMap] of Object.entries(daysMap)) {
      const dayMeta = dayKeyToMeta[dayKey];
      if (!dayMeta) continue;

      for (const [rawTime, className] of Object.entries(hoursMap)) {
        const { startTime, timeBlock } = parseOfficialTimeKey(rawTime);
        const timeSlug = startTime.replace(":", "");
        const sessionId = `ses-${cfg.code.toLowerCase()}-${dayMeta.slug}-${timeSlug}`;

        sessions.push({
          id: sessionId,
          title: `${className} · ${cfg.branchName} (${cfg.code})`,
          discipline: cfg.discipline,
          branchId: cfg.branchId,
          branchName: cfg.branchName,
          brand: cfg.brand,
          roomId: cfg.roomId,
          roomName: cfg.roomName,
          instructor: cfg.instructor,
          instructorAvatar: cfg.instructorAvatar,
          date: dayMeta.date,
          dayOfWeek: dayMeta.dayOfWeek,
          timeBlock,
          startTime,
          durationMinutes: 50,
          level: "Todos los niveles",
          intensity: cfg.discipline === "hot_pilates" ? "Intensa 🔥" : "Alta",
          isSpecialClass: className === "STRETCHING",
          specialBadge: className === "STRETCHING" ? "🧘‍♀️ Stretching" : undefined,
        });
      }
    }
  }

  const bookings: Booking[] = [
    {
      id: "bk-101",
      qrToken: "SD-2026-ZIB3-7741",
      clientId: "cli-1",
      clientName: "Valeria Montemayor",
      clientPhone: "+52 987 871 0684",
      sessionId: "ses-dezi-martes-1800",
      sessionTitle: "LOWER BODY · Devotion Zibatá (DEZI)",
      discipline: "hot_pilates",
      branchId: "br-devotion-zibata",
      branchName: "Devotion Zibatá",
      roomName: "Hot Studio · Devotion Zibatá",
      instructor: "Coach Paulina V.",
      date: today,
      startTime: "18:00",
      spotId: "3",
      spotLabel: "Tapete #3 (Frente al Espejo)",
      status: "confirmada",
      bookedVia: "whatsapp_bot",
      whatsappSent: true,
      createdAt: "2026-10-20T11:20:00-06:00",
    },
    {
      id: "bk-102",
      qrToken: "SD-2026-ZIB10-9920",
      clientId: "cli-3",
      clientName: "Sofía Villalobos",
      clientPhone: "+52 442 773 1289",
      sessionId: "ses-dezi-martes-1800",
      sessionTitle: "LOWER BODY · Devotion Zibatá (DEZI)",
      discipline: "hot_pilates",
      branchId: "br-devotion-zibata",
      branchName: "Devotion Zibatá",
      roomName: "Hot Studio · Devotion Zibatá",
      instructor: "Coach Paulina V.",
      date: today,
      startTime: "18:00",
      spotId: "10",
      spotLabel: "Tapete #10 (Zona Posterior)",
      status: "asistio",
      bookedVia: "kiosk_tablet",
      whatsappSent: true,
      createdAt: "2026-10-20T09:15:00-06:00",
      checkedInAt: "2026-10-20T17:52:00-06:00",
      checkedInKioskLabel: "Kiosco #1 · Devotion Zibatá",
    },
    {
      id: "bk-103",
      qrToken: "SD-2026-JUR4-3318",
      clientId: "cli-2",
      clientName: "Camila Elizondo",
      clientPhone: "+52 442 910 3341",
      sessionId: "ses-deju-martes-1900",
      sessionTitle: "LOWER BODY · Devotion Juriquilla (DEJU)",
      discipline: "hot_pilates",
      branchId: "br-devotion-juriquilla",
      branchName: "Devotion Juriquilla",
      roomName: "Hot Studio · Devotion Juriquilla",
      instructor: "Coach Fernanda L.",
      date: today,
      startTime: "19:00",
      spotId: "4",
      spotLabel: "Tapete #4 (Frente junto a Coach)",
      status: "confirmada",
      bookedVia: "whatsapp_bot",
      whatsappSent: true,
      createdAt: "2026-10-20T13:05:00-06:00",
    },
    {
      id: "bk-104",
      qrToken: "SD-2026-CAM2-5512",
      clientId: "cli-4",
      clientName: "Mariana Garza",
      clientPhone: "+52 442 234 6780",
      sessionId: "ses-deca-martes-1900",
      sessionTitle: "LOWER BODY · Devotion Campanario (DECA)",
      discipline: "hot_pilates",
      branchId: "br-devotion-campanario",
      branchName: "Devotion Campanario",
      roomName: "Hot Studio · Devotion Campanario",
      instructor: "Coach Valentina S.",
      date: today,
      startTime: "19:00",
      spotId: "2",
      spotLabel: "Tapete #2 (Frente al Espejo)",
      status: "confirmada",
      bookedVia: "wellhub",
      externalReservationCode: "WH-48291",
      whatsappSent: true,
      createdAt: "2026-10-20T14:10:00-06:00",
    },
    {
      id: "bk-105",
      qrToken: "SD-2026-SJUR5-4109",
      clientId: "cli-6",
      clientName: "Renata Altamirano",
      clientPhone: "+52 442 339 1120",
      sessionId: "ses-stju-martes-1800",
      sessionTitle: "REFORMER · Stiliza Juriquilla (STJU)",
      discipline: "reformer",
      branchId: "br-stiliza-juriquilla",
      branchName: "Stiliza Juriquilla",
      roomName: "Salón Reformer · Stiliza Juriquilla",
      instructor: "Coach Alejandra M.",
      date: today,
      startTime: "18:00",
      spotId: "5",
      spotLabel: "Reformer #5",
      status: "confirmada",
      bookedVia: "fitpass",
      externalReservationCode: "FP-99201",
      whatsappSent: true,
      createdAt: "2026-10-20T15:00:00-06:00",
    },
    {
      id: "bk-106",
      qrToken: "SD-2026-SIS2-8821",
      clientId: "cli-3",
      clientName: "Sofía Villalobos",
      clientPhone: "+52 442 773 1289",
      sessionId: "ses-stsi-martes-1800",
      sessionTitle: "REFORMER · Stiliza San Isidro (STSI)",
      discipline: "reformer",
      branchId: "br-stiliza-san-isidro",
      branchName: "Stiliza San Isidro",
      roomName: "Salón Reformer · Stiliza San Isidro",
      instructor: "Coach Daniela R.",
      date: today,
      startTime: "18:00",
      spotId: "2",
      spotLabel: "Reformer #2",
      status: "confirmada",
      bookedVia: "kiosk_tablet",
      whatsappSent: true,
      createdAt: "2026-10-20T16:10:00-06:00",
    },
  ];

  const messages: ChatMessage[] = [
    {
      id: "msg-1",
      clientId: "cli-1",
      sender: "client",
      text: "Hola! Quiero agendar hoy a las 18:30 en Devotion Zibatá en el lugar 3 porfa ✨",
      timestamp: "11:19 AM",
    },
    {
      id: "msg-2",
      clientId: "cli-1",
      sender: "bot",
      text: "¡Hola Valeria! 🤍 Tu lugar en **Inferno Hot Pilates 38°C · Zibatá** (18:30 hrs) en el **Lugar #3** (enfrente, a la derecha del Coach) ha quedado reservado.\n\nTe descontamos 1 token (te quedan **11 tokens** disponibles). Aquí tienes tu código QR de acceso para escanear en el Kiosco al llegar:",
      timestamp: "11:20 AM",
      bookingAttachment: bookings[0],
    },
  ];

  const aggregators: AggregatorConnection[] = [
    {
      id: "wellhub",
      name: "Wellhub",
      connectionType: "api_webhook",
      connected: true,
      autoBlockSpots: true,
      maxSpotsPerSession: 4,
      syncedBookingsToday: 4,
      lastSyncAt: "Hace 2 min",
      colorBadge: "bg-rose-500/20 text-rose-300 border-rose-400/30",
    },
    {
      id: "totalpass",
      name: "TotalPass",
      connectionType: "api_webhook",
      connected: true,
      autoBlockSpots: true,
      maxSpotsPerSession: 4,
      syncedBookingsToday: 3,
      lastSyncAt: "Hace 5 min",
      colorBadge: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
    },
    {
      id: "fitpass",
      name: "FitPass",
      connectionType: "inbound_email_bridge",
      connected: true,
      autoBlockSpots: true,
      maxSpotsPerSession: 4,
      syncedBookingsToday: 5,
      lastSyncAt: "Hace 1 min",
      colorBadge: "bg-sky-500/20 text-sky-300 border-sky-400/30",
    },
    {
      id: "nessty",
      name: "Nessty",
      connectionType: "inbound_email_bridge",
      connected: true,
      autoBlockSpots: true,
      maxSpotsPerSession: 4,
      syncedBookingsToday: 2,
      lastSyncAt: "Hace 8 min",
      colorBadge: "bg-purple-500/20 text-purple-300 border-purple-400/30",
    },
  ];

  return {
    branches,
    coaches,
    promosAndEvents,
    aggregators,
    rooms,
    packages,
    clients,
    sessions,
    bookings,
    messages,
    aiSettings: {
      botName: "Stiliza & Devotion Concierge IA",
      autoSendWhatsAppQR: true,
      reminderMinutesBefore: 120,
      cancellationWindowHours: 6,
      whatsappWebhookMode: "simulator_ready",
    },
  };
}

let memoryCache: CRMDatabaseState | null = null;

export function readDB(): CRMDatabaseState {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const seed = memoryCache || getInitialSeedData();
      memoryCache = seed;
      fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), "utf-8");
      return seed;
    }
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(raw) as CRMDatabaseState;
    memoryCache = parsed;
    return parsed;
  } catch {
    if (!memoryCache) {
      memoryCache = getInitialSeedData();
    }
    return memoryCache;
  }
}

export function writeDB(state: CRMDatabaseState): CRMDatabaseState {
  memoryCache = state;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch {
    // Fallback to memoryCache in read-only environments
  }
  return state;
}

export function createBookingTransaction(params: {
  clientId: string;
  sessionId: string;
  spotId: string;
  bookedVia: BookingSource;
  externalReservationCode?: string;
}): {
  success: boolean;
  error?: string;
  booking?: Booking;
  state: CRMDatabaseState;
} {
  const state = readDB();
  const client = state.clients.find((c) => c.id === params.clientId);
  if (!client) {
    return { success: false, error: "Cliente no encontrado en el CRM.", state };
  }

  const session = state.sessions.find((s) => s.id === params.sessionId);
  if (!session) {
    return { success: false, error: "La clase seleccionada no existe.", state };
  }

  const room = state.rooms.find((r) => r.id === session.roomId);
  if (!room) {
    return { success: false, error: "Salón no encontrado.", state };
  }

  if (room.spots.length === 0) {
    return {
      success: false,
      error: `${room.branchName} tiene 0 lugares habilitados de momento.`,
      state,
    };
  }

  const cleanInputSpot = params.spotId
    .replace(/^(R-|M-|#)/i, "")
    .trim()
    .toUpperCase();

  const spot = room.spots.find(
    (s) =>
      s.id.toUpperCase() === cleanInputSpot ||
      s.id.toUpperCase() === params.spotId.toUpperCase() ||
      s.shortLabel.toUpperCase() === params.spotId.toUpperCase()
  );
  if (!spot) {
    return {
      success: false,
      error: `El lugar #${params.spotId} no existe en ${room.branchName}.`,
      state,
    };
  }

  if (spot.status === "maintenance") {
    return {
      success: false,
      error: `El lugar #${spot.id} está actualmente en mantenimiento.`,
      state,
    };
  }

  const existingSpotBooking = state.bookings.find(
    (b) =>
      b.sessionId === session.id &&
      b.spotId === spot.id &&
      b.status !== "cancelada"
  );
  if (existingSpotBooking) {
    return {
      success: false,
      error: `El lugar #${spot.id} (${spot.label}) ya está ocupado en esta clase por ${existingSpotBooking.clientName}.`,
      state,
    };
  }

  if (client.creditsRemaining <= 0) {
    return {
      success: false,
      error: `${client.name} no cuenta con tokens disponibles en su paquete actual (${client.activePackageName}).`,
      state,
    };
  }

  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const qrToken = `SD-2026-L${spot.id}-${randomSuffix}`;

  const newBooking: Booking = {
    id: `bk-${Date.now()}`,
    qrToken,
    clientId: client.id,
    clientName: client.name,
    clientPhone: client.phone,
    sessionId: session.id,
    sessionTitle: session.title,
    discipline: session.discipline,
    branchId: session.branchId,
    branchName: session.branchName,
    roomName: session.roomName,
    instructor: session.instructor,
    date: session.date,
    startTime: session.startTime,
    spotId: spot.id,
    spotLabel: spot.label,
    status: "confirmada",
    bookedVia: params.bookedVia,
    externalReservationCode: params.externalReservationCode,
    whatsappSent: true,
    createdAt: new Date().toISOString(),
  };

  client.creditsRemaining = Math.max(0, client.creditsRemaining - 1);
  if (client.creditsRemaining === 0) {
    client.status = "sin_creditos";
  } else if (client.creditsRemaining <= 2) {
    client.status = "pocos_creditos";
  }

  state.bookings.unshift(newBooking);

  const nowTime = new Date().toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const waMsg: ChatMessage = {
    id: `msg-${Date.now()}-qr`,
    clientId: client.id,
    sender: "bot",
    text: `¡Listo, ${client.name.split(" ")[0]}! ✨ Reservé tu lugar en **${session.title}** (${session.startTime} hrs · ${session.branchName}) en el **Lugar #${spot.id} (${spot.label})**.\n\nTe quedan **${client.creditsRemaining} tokens**. Escanea este código QR en el Kiosco al llegar al estudio:`,
    timestamp: nowTime,
    bookingAttachment: newBooking,
  };

  state.messages.push(waMsg);
  writeDB(state);

  return {
    success: true,
    booking: newBooking,
    state,
  };
}

export function processKioskQRScan(
  qrInput: string,
  kioskLabel?: string
): {
  result: KioskCheckInResult;
  state: CRMDatabaseState;
} {
  const state = readDB();
  const normalized = qrInput.trim().toUpperCase();

  let targetToken = normalized;
  try {
    if (qrInput.trim().startsWith("{")) {
      const parsed = JSON.parse(qrInput.trim());
      if (parsed.qrToken) targetToken = String(parsed.qrToken).toUpperCase();
    }
  } catch {
    // Plain text token
  }

  const booking = state.bookings.find(
    (b) =>
      b.qrToken.toUpperCase() === targetToken ||
      b.id.toUpperCase() === targetToken
  );

  if (!booking) {
    return {
      result: {
        success: false,
        message: `Código QR no reconocido (${targetToken}). Verifica que tu reserva esté activa.`,
      },
      state,
    };
  }

  const client = state.clients.find((c) => c.id === booking.clientId);

  if (booking.status === "cancelada") {
    return {
      result: {
        success: false,
        message: `Esta reserva fue cancelada previamente.`,
        booking,
        client,
      },
      state,
    };
  }

  if (booking.status === "asistio") {
    return {
      result: {
        success: true,
        alreadyCheckedIn: true,
        message: `¡Bienvenida de nuevo, ${booking.clientName}! Tu check-in ya estaba registrado. Pasa al Lugar #${booking.spotId} (${booking.spotLabel}).`,
        booking,
        client,
      },
      state,
    };
  }

  booking.status = "asistio";
  booking.checkedInAt = new Date().toISOString();
  booking.checkedInKioskLabel = kioskLabel || "Kiosco Principal";
  if (client) {
    client.totalAttended += 1;
  }

  const nowTime = new Date().toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
  state.messages.push({
    id: `msg-checkin-${Date.now()}`,
    clientId: booking.clientId,
    sender: "bot",
    text: `✅ Check-in confirmado en ${booking.checkedInKioskLabel} (${nowTime}). ¡Disfruta tu clase **${booking.sessionTitle}** en el **Lugar #${booking.spotId}** con ${booking.instructor}! ✨`,
    timestamp: nowTime,
  });

  writeDB(state);

  return {
    result: {
      success: true,
      alreadyCheckedIn: false,
      message: `¡Bienvenida ${booking.clientName}! Pasa a ${booking.branchName} · Tu lugar asignado es el #${booking.spotId} (${booking.spotLabel}).`,
      booking,
      client,
    },
    state,
  };
}

export function syncExternalAggregatorBooking(params: {
  platform: ExternalAggregator;
  clientName: string;
  clientPhone?: string;
  sessionId: string;
  preferredSpotId?: string;
  externalReservationCode?: string;
}): {
  success: boolean;
  error?: string;
  booking?: Booking;
  channelSyncReport?: {
    totalCapacity: number;
    totalOccupied: number;
    remainingSlotsPublishedToAllApps: number;
    platformsNotified: string[];
  };
  state: CRMDatabaseState;
} {
  const state = readDB();
  const session =
    state.sessions.find((s) => s.id === params.sessionId) || state.sessions[0];
  if (!session) {
    return { success: false, error: "Clase no encontrada.", state };
  }

  const room = state.rooms.find((r) => r.id === session.roomId);
  if (!room || room.spots.length === 0) {
    return {
      success: false,
      error: `${session.branchName} tiene 0 lugares habilitados de momento.`,
      state,
    };
  }

  const occupiedSpotIds = new Set(
    state.bookings
      .filter((b) => b.sessionId === session.id && b.status !== "cancelada")
      .map((b) => b.spotId)
  );

  const freeSpots = room.spots.filter(
    (sp) => !occupiedSpotIds.has(sp.id) && sp.status !== "maintenance"
  );

  if (freeSpots.length === 0) {
    return {
      success: false,
      error: `Clase llena en ${room.branchName}. Los lugares ya están bloqueados en Wellhub, TotalPass, FitPass y Nessty.`,
      state,
    };
  }

  const chosenSpot =
    (params.preferredSpotId &&
      freeSpots.find(
        (s) => s.id.toUpperCase() === params.preferredSpotId!.toUpperCase()
      )) ||
    freeSpots[0];

  const platformUpper = params.platform.toUpperCase();
  const prefixCode =
    params.platform === "wellhub"
      ? "WH"
      : params.platform === "totalpass"
      ? "TP"
      : params.platform === "fitpass"
      ? "FP"
      : "NS";

  const extCode =
    params.externalReservationCode ||
    `${prefixCode}-${Math.floor(10000 + Math.random() * 90000)}`;

  let client = state.clients.find(
    (c) => c.name.toLowerCase() === params.clientName.trim().toLowerCase()
  );

  if (!client) {
    const parts = params.clientName.trim().split(" ");
    const initials =
      parts.length > 1
        ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        : parts[0].slice(0, 2).toUpperCase();

    client = {
      id: `cli-${params.platform}-${Date.now()}`,
      name: params.clientName.trim(),
      phone: params.clientPhone || "+52 442 889 0011",
      email: `${params.platform}@alumna.mx`,
      avatarInitials: initials,
      activePackageName: `Membresía Externa (${platformUpper})`,
      creditsRemaining: 1,
      creditsTotal: 1,
      packageExpiresAt: "2026-12-31",
      status: "activo",
      totalAttended: 1,
      noShowsCount: 0,
      preferredSpot: chosenSpot.id,
      homeBranchName: session.branchName,
      joinedAt: new Date().toISOString().split("T")[0],
    };
    state.clients.unshift(client);
  }

  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const qrToken = `SD-${prefixCode}-L${chosenSpot.id}-${randomSuffix}`;

  const newBooking: Booking = {
    id: `bk-${Date.now()}`,
    qrToken,
    clientId: client.id,
    clientName: client.name,
    clientPhone: client.phone,
    sessionId: session.id,
    sessionTitle: session.title,
    discipline: session.discipline,
    branchId: session.branchId,
    branchName: session.branchName,
    roomName: session.roomName,
    instructor: session.instructor,
    date: session.date,
    startTime: session.startTime,
    spotId: chosenSpot.id,
    spotLabel: chosenSpot.label,
    status: "confirmada",
    bookedVia: params.platform,
    externalReservationCode: extCode,
    whatsappSent: true,
    createdAt: new Date().toISOString(),
  };

  state.bookings.unshift(newBooking);

  const agg = state.aggregators?.find((a) => a.id === params.platform);
  if (agg) {
    agg.syncedBookingsToday += 1;
    agg.lastSyncAt = "Justo ahora";
  }

  const nowTime = new Date().toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
  state.messages.push({
    id: `msg-agg-${Date.now()}`,
    clientId: client.id,
    sender: "bot",
    text: `📲 **[Sincronización ${platformUpper} #${extCode}]** ¡Hola ${client.name.split(" ")[0]}! Recibimos tu reserva desde **${platformUpper}** para **${session.title}** (${session.startTime} hrs · ${session.branchName}).\n\nTe asignamos y bloqueamos automáticamente el **Lugar #${chosenSpot.id} (${chosenSpot.label})**. Escanea este código QR en el Kiosco al llegar al estudio:`,
    timestamp: nowTime,
    bookingAttachment: newBooking,
  });

  writeDB(state);

  const newTotalOccupied = occupiedSpotIds.size + 1;
  const remainingSlots = Math.max(0, room.spots.length - newTotalOccupied);

  return {
    success: true,
    booking: newBooking,
    channelSyncReport: {
      totalCapacity: room.spots.length,
      totalOccupied: newTotalOccupied,
      remainingSlotsPublishedToAllApps: remainingSlots,
      platformsNotified: ["Wellhub", "TotalPass", "FitPass", "Nessty"],
    },
    state,
  };
}
