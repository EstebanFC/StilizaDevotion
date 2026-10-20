export type Discipline = "reformer" | "hot_pilates";

export interface SpotConfig {
  id: string; // e.g. "R-01" or "M-01"
  label: string; // e.g. "Reformer 01" or "Mat 01"
  shortLabel: string; // e.g. "R1" or "M1"
  row: number;
  col: number;
  zone: "Frente al Espejo" | "Fila Central" | "Zona Posterior" | "Cerca de Paneles IR";
  type: "reformer_machine" | "hot_mat";
  status?: "available" | "maintenance";
}

export interface StudioRoom {
  id: string;
  branchName: string; // e.g. "Sucursal Polanco / Principal" or "Sucursal Roma / Sur"
  name: string; // e.g. "Salón Reformer Studio A" or "Hot Chamber Infrared B"
  discipline: Discipline;
  temperature: string; // e.g. "21°C Climatizado" | "38°C Calor Infrarrojo + 45% Humedad"
  rows: number;
  cols: number;
  spots: SpotConfig[];
}

export interface ClassPackage {
  id: string;
  name: string;
  credits: number; // 999 for unlimited
  priceMXN: number;
  validityDays: number;
  allowedDisciplines: Discipline[];
  badge?: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string; // WhatsApp format e.g. "+52 55 4123 8910"
  email: string;
  avatarInitials: string;
  activePackageName: string;
  creditsRemaining: number;
  creditsTotal: number;
  packageExpiresAt: string;
  status: "activo" | "pocos_creditos" | "sin_creditos";
  totalAttended: number;
  preferredSpot?: string;
  medicalNotes?: string;
  joinedAt: string;
}

export interface ClassSession {
  id: string;
  title: string; // e.g. "Sculpt & Flow Reformer", "Inferno Hot Pilates 38°"
  discipline: Discipline;
  roomId: string;
  branchName: string;
  roomName: string;
  instructor: string;
  instructorAvatar: string;
  date: string; // YYYY-MM-DD
  startTime: string; // "07:00", "08:00", etc.
  durationMinutes: number;
  level: "Todos los niveles" | "Intermedio" | "Avanzado" | "Principiantes";
  intensity: "Media" | "Alta" | "Intensa 🔥";
}

export interface Booking {
  id: string;
  qrToken: string; // e.g. "SD-2026-R04-891A"
  clientId: string;
  clientName: string;
  clientPhone: string;
  sessionId: string;
  sessionTitle: string;
  discipline: Discipline;
  branchName: string;
  roomName: string;
  instructor: string;
  date: string;
  startTime: string;
  spotId: string; // e.g. "R-04"
  spotLabel: string; // e.g. "Máquina Reformer #04"
  status: "confirmada" | "asistio" | "cancelada";
  bookedVia: "whatsapp_bot" | "web_portal" | "crm_admin";
  whatsappSent: boolean;
  createdAt: string;
  checkedInAt?: string;
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
