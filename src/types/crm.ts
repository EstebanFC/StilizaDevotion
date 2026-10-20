export type Discipline = "reformer" | "hot_pilates";
export type StudioBrand = "Stiliza" | "Devotion";

export interface Branch {
  id: string;
  brand: StudioBrand;
  name: string; // e.g. "Stiliza Polanco", "Devotion Roma Norte", "Stiliza Lomas", "Devotion Condesa"
  address: string;
  kiosksCount: number;
  monthlyRevenueMXN: number;
}

export interface Coach {
  id: string;
  name: string;
  avatar: string;
  specialty: Discipline | "ambas";
  occupancyRate: number; // e.g. 96%
  vibeBadge: string; // e.g. "🔥 Queen del Burn", "✨ Técnica Impecable"
}

export interface StudioPromoEvent {
  id: string;
  title: string;
  description: string;
  type: "evento" | "promo" | "clase_especial";
  dateLabel: string;
  highlightBadge: string; // e.g. "2x1 Tokens", "Cupo Limitado", "DJ Live Set"
  priceText: string;
  branchId: string | "all";
  branchName: string;
}

export interface SpotConfig {
  id: string; // e.g. "R-01" or "M-01"
  label: string; // e.g. "Reformer 01" or "Mat 01"
  shortLabel: string; // e.g. "R1" or "M1"
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
  date: string; // YYYY-MM-DD
  startTime: string; // "07:00", "08:00", etc.
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
  bookedVia: "whatsapp_bot" | "web_portal" | "crm_admin" | "kiosk_tablet";
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
