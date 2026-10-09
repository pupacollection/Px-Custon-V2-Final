// PX CUSTOM — Data Models & Types

export type EventStatus = 'EM_BREVE' | 'EM_ANDAMENTO' | 'FINALIZADO';

export interface MediaItem {
  id: string;
  url: string; // Base64 data URL or storage public URL
  fileName: string;
  fileSize: number;
  mimeType: string;
  bucket?: 'events' | 'vehicles' | 'profiles' | 'branding';
  publicUrl?: string;
  storagePath?: string;
  resourceType?: string;
  resourceId?: string;
  userId?: string;
  isPrimary?: boolean;
  sortOrder?: number;
  isLocalPreview?: boolean;
  uploadedAt?: string;
}

export interface TicketBatch {
  id: string;
  name: string; // Pista, Camarote, VIP
  description: string;
  price: number;
  totalQuantity: number;
  soldQuantity: number;
  available: boolean;
  batchNumber: number; // 1º Lote, 2º Lote, etc.
}

export interface EventItem {
  id: string;
  slug: string;
  name: string;
  tagline?: string;
  description: string;
  date: string; // e.g., '15 de Novembro de 2025'
  dateBadge: string; // e.g., '15 NOV'
  time: string; // e.g., 'Das 08:00 às 22:00'
  location: string; // e.g., 'Parque de Exposições - Manhuaçu/MG'
  city: string; // 'Manhuaçu'
  state: string; // 'MG'
  status: EventStatus;
  bannerImage: string;
  coverImage?: string;
  gallery: string[];
  bannerMedia?: MediaItem;
  coverMedia?: MediaItem;
  galleryMedia?: MediaItem[];
  features: {
    cars: boolean;
    motos: boolean;
    audio: boolean;
    food: boolean;
  };
  ticketBatches: TicketBatch[];
  latitude?: number;
  longitude?: number;
}

export type TicketStatus = 
  | 'PAGO' 
  | 'PENDENTE' 
  | 'UTILIZADO' 
  | 'CANCELADO' 
  | 'ESTORNADO' 
  | 'EXPIRADO';

export interface Ticket {
  id: string;
  code: string; // e.g., 'PX-2025-ENC-74892'
  eventId: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  batchName: string; // 'Pista', 'Camarote', 'VIP'
  price: number;
  buyerName: string;
  buyerEmail: string;
  buyerCpf: string;
  buyerPhone: string;
  userId?: string;
  status: TicketStatus;
  paymentMethod: 'PIX' | 'CARTAO' | 'BOLETO';
  createdAt: string;
  checkedInAt?: string;
  checkedInBy?: string;
  qrPayload: string;
}

export interface Vehicle {
  id: string;
  userId: string;
  type: 'Carro' | 'Moto' | 'Caminhão' | 'Outro';
  brand: string; // e.g., 'Chevrolet'
  model: string; // e.g., 'Classic'
  year: number; // 2012
  color: string; // 'Prata'
  plate?: string;
  description?: string;
  photoUrl?: string;
  photos?: MediaItem[];
  category?: 'Rebaixado' | 'Original' | 'Tuning' | 'Som Automotivo' | 'Antigo';
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  city: string;
  state: string;
  avatarUrl: string;
  avatar_url?: string;
  avatarMedia?: MediaItem;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN' | 'CHECKIN_OPERATOR' | 'FINANCE' | 'SUPPORT';
  is_active?: boolean;
  createdAt: string;
  created_at?: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  cpf?: string;
  city?: string;
  state?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface CheckInLog {
  id: string;
  ticketCode: string;
  attendeeName: string;
  batchName: string;
  eventName: string;
  timestamp: string;
  operatorName: string;
  status: 'CONFIRMADO' | 'NEGADO';
  reason?: string;
}

export interface NotificationItem {
  id: string;
  userId?: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

export interface OrderItem {
  id: string;
  userId?: string;
  eventId: string;
  totalAmount: number;
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED';
  externalReference?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CheckoutResult {
  orderId: string;
  paymentId?: string;
  status: 'PENDING' | 'PAID' | 'APPROVED';
  paymentMethod: 'PIX' | 'CARTAO' | 'BOLETO';
  totalAmount: number;
  qrCodePix?: string;
  qrCodePixBase64?: string;
  ticket?: Ticket;
  externalReference?: string;
  expiresAt?: string;
}

export interface MercadoPagoConfig {
  environment: 'sandbox' | 'production';
  accessToken: string;
  publicKey: string;
  webhookSecret: string;
  pixEnabled: boolean;
  creditCardEnabled: boolean;
  boletoEnabled: boolean;
  connected: boolean;
  lastTestedAt?: string;
}

export interface DashboardStats {
  ticketsSold: number;
  ticketsSoldGrowth: number;
  ticketsAvailable: number;
  checkinsCount: number;
  checkinsGrowth: number;
  totalRevenue: number;
  revenueGrowth: number;
  salesByDay: { date: string; count: number; revenue: number }[];
  salesByBatch: { name: string; percentage: number; count: number }[];
  revenueByDay: { date: string; amount: number }[];
  paymentMethods: { method: string; percentage: number; count: number }[];
  recentCheckins: CheckInLog[];
}
