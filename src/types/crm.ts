export type Discipline = "reformer" | "hot_pilates";
export type StudioBrand = "Stiliza" | "Devotion";
export type ExternalAggregator = "wellhub" | "totalpass" | "fitpass" | "nessty";

export type BookingSource =
  | "whatsapp_bot"
  | "web_portal"
  | "crm_admin"
  | "kiosk_tablet"
  | ExternalAggregator;

export interface AggregatorConnection {
  id: ExternalAggregator;
  name: "Wellhub" | "TotalPass" | "FitPass" | "Nessty";
  connectionType: "api_webhook" | "inbound_email_bridge";
  connected: boolean;
  autoBlockSpots: boolean;
  maxSpotsPerSession: number; // Cupo máximo permitido por clase para esta app
  syncedBookingsToday: number;
  lastSyncAt: string;
  colorBadge: string;
}

export interface Branch {
  id: string;
  brand: StudioBrand;
  name: string;
  address: string;
  kiosksCount: number;
  monthlyRevenueMXN: number;
}

export interface Coach {
  id: string;
  name: string;
  avatar: string;
  specialty: Discipline | "ambas";
  occupancyRate: number;
  vibeBadge: string;
}

export interface StudioPromoEvent {
  id: string;
  title: string;
  description: string;
  type: "evento" | "promo" | "clase_especial";
  dateLabel: string;
  highlightBadge: string;
  priceText: string;
  branchId: string | "all";
  branchName: string;
}

export interface SpotConfig {
  id: string;
  label: string;
  shortLabel: string;
  row: number;
  col: number;
  zone:
    | "Frente al Espejo"
    | "Fila Central"
    | "Zona Posterior"
    | "Cerca de Paneles IR";
  type: "reformer_machine" | "hot_mat";
  status?: "available" | "maintenance";
}

export type RoomLayoutCell =
  | { kind: "spot"; spotId: string }
  | { kind: "coach"; label?: string };

export interface StudioRoom {
  id: string;
  branchId: string;
  branchName: string;
  brand: StudioBrand;
  name: string;
  discipline: Discipline;
  temperature: string;
  rows: number;
  cols: number;
  spots: SpotConfig[];
  layoutRows?: RoomLayoutCell[][];
}

export interface ClassPackage {
  id: string;
  name: string;
  credits: number;
  priceMXN: number;
  validityDays: number;
  allowedDisciplines: Discipline[];
  badge?: string;
  promoTag?: string;
}

export type DayOfWeek =
  | "Lunes"
  | "Martes"
  | "Miércoles"
  | "Jueves"
  | "Viernes"
  | "Sábado"
  | "Domingo";

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  avatarInitials: string;
  activePackageName: string;
  creditsRemaining: number;
  creditsTotal: number;
  packageExpiresAt: string;
  status: "activo" | "pocos_creditos" | "sin_creditos";
  totalAttended: number;
  noShowsCount?: number;
  preferredSpot?: string;
  homeBranchName?: string;
  medicalNotes?: string;
  joinedAt: string;
  conversationDraft?: {
    branchId?: string;
    startTime?: string;
    dayOfWeek?: DayOfWeek;
    sessionId?: string;
  };
}

export interface ClassSession {
  id: string;
  title: string;
  discipline: Discipline;
  branchId: string;
  branchName: string;
  brand: StudioBrand;
  roomId: string;
  roomName: string;
  instructor: string;
  instructorAvatar: string;
  date: string;
  dayOfWeek?: DayOfWeek;
  timeBlock?: "manana" | "tarde";
  startTime: string;
  durationMinutes: number;
  level: "Todos los niveles" | "Intermedio" | "Avanzado" | "Principiantes";
  intensity: "Media" | "Alta" | "Intensa 🔥";
  isSpecialClass?: boolean;
  specialBadge?: string;
}

export interface Booking {
  id: string;
  qrToken: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  sessionId: string;
  sessionTitle: string;
  discipline: Discipline;
  branchId?: string;
  branchName: string;
  roomName: string;
  instructor: string;
  date: string;
  startTime: string;
  spotId: string;
  spotLabel: string;
  status: "confirmada" | "asistio" | "cancelada";
  bookedVia: BookingSource;
  externalReservationCode?: string; // e.g. "WH-99812", "TP-44120", "FP-7721", "NS-1190"
  whatsappSent: boolean;
  createdAt: string;
  checkedInAt?: string;
  checkedInKioskLabel?: string;
}

export interface ChatMessage {
  id: string;
  clientId: string;
  sender: "client" | "bot" | "staff";
  text: string;
  timestamp: string;
  bookingAttachment?: Booking;
  suggestedSpots?: string[];
}

export interface KioskCheckInResult {
  success: boolean;
  alreadyCheckedIn?: boolean;
  message: string;
  booking?: Booking;
  client?: Client;
}

export interface CRMDatabaseState {
  branches: Branch[];
  coaches: Coach[];
  promosAndEvents: StudioPromoEvent[];
  aggregators: AggregatorConnection[];
  rooms: StudioRoom[];
  packages: ClassPackage[];
  clients: Client[];
  sessions: ClassSession[];
  bookings: Booking[];
  messages: ChatMessage[];
  aiSettings: {
    botName: string;
    autoSendWhatsAppQR: boolean;
    reminderMinutesBefore: number;
    cancellationWindowHours: number;
    whatsappWebhookMode: "simulator_ready" | "meta_cloud_api" | "twilio";
  };
}
