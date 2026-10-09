// PX CUSTOM — Data Mappers (Frontend TypeScript <-> Supabase / PostgreSQL)
// Camada pura de transformação e normalização de dados sem efeitos colaterais.

import type {
  EventItem,
  EventStatus,
  TicketBatch,
  Vehicle,
  Ticket,
  TicketStatus,
  CheckInLog,
  NotificationItem,
} from '../types';

/* ==============================================================================
 * DATABASE ROW & PAYLOAD INTERFACES (PostgreSQL / Supabase Schema)
 * ============================================================================== */

export interface DbEventRow {
  id: string;
  slug: string;
  name: string;
  tagline?: string | null;
  description: string;
  date_badge: string;
  date_display: string;
  time_display: string;
  location: string;
  city?: string | null;
  state?: string | null;
  status?: EventStatus | string | null;
  banner_image: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  has_cars?: boolean | null;
  has_motos?: boolean | null;
  has_audio?: boolean | null;
  has_food?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  // Joins relacionais opcionais
  ticket_batches?: DbTicketBatchRow[] | null;
  ticket_types?: DbTicketBatchRow[] | null;
  event_images?: Array<{
    image_url?: string | null;
    public_url?: string | null;
    is_primary?: boolean | null;
    sort_order?: number | null;
    display_order?: number | null;
  }> | null;
}

export interface DbEventInsert {
  id?: string;
  slug: string;
  name: string;
  tagline?: string | null;
  description: string;
  date_badge: string;
  date_display: string;
  time_display: string;
  location: string;
  city: string;
  state: string;
  status: EventStatus;
  banner_image: string;
  latitude?: number | null;
  longitude?: number | null;
  has_cars: boolean;
  has_motos: boolean;
  has_audio: boolean;
  has_food: boolean;
}

export interface DbTicketBatchRow {
  id: string;
  event_id?: string | null;
  name: string;
  description?: string | null;
  price: number | string;
  total_quantity?: number | string | null;
  quantity?: number | string | null;
  sold_quantity?: number | null;
  batch_number?: number | null;
  available?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface DbTicketBatchInsert {
  id?: string;
  event_id: string;
  name: string;
  description: string;
  price: number;
  total_quantity: number;
  sold_quantity: number;
  batch_number: number;
  available: boolean;
}

export interface DbVehicleRow {
  id: string;
  user_id: string;
  type: 'Carro' | 'Moto' | 'Caminhão' | 'Outro';
  brand: string;
  model: string;
  year: number;
  color: string;
  plate?: string | null;
  category?: 'Rebaixado' | 'Original' | 'Tuning' | 'Som Automotivo' | 'Antigo' | string | null;
  description?: string | null;
  photo_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface DbVehicleInsert {
  id?: string;
  user_id: string;
  type: 'Carro' | 'Moto' | 'Caminhão' | 'Outro';
  brand: string;
  model: string;
  year: number;
  color: string;
  plate?: string | null;
  category?: string | null;
  description?: string | null;
  photo_url?: string | null;
}

export interface DbTicketRow {
  id: string;
  code: string;
  order_id?: string | null;
  event_id: string;
  batch_id?: string | null;
  user_id?: string | null;
  buyer_name: string;
  buyer_email: string;
  buyer_cpf: string;
  batch_name: string;
  price: number | string;
  status?: TicketStatus | string | null;
  qr_payload: string;
  checked_in_at?: string | null;
  checked_in_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  // Joins opcionais
  events?: {
    name?: string | null;
    date_display?: string | null;
    time_display?: string | null;
    location?: string | null;
  } | null;
  orders?: {
    buyer_phone?: string | null;
    payment_method?: 'PIX' | 'CARTAO' | 'BOLETO' | string | null;
  } | null;
}

export interface DbTicketInsert {
  id?: string;
  code: string;
  order_id?: string | null;
  event_id: string;
  batch_id: string;
  user_id?: string | null;
  buyer_name: string;
  buyer_email: string;
  buyer_cpf: string;
  batch_name: string;
  price: number;
  status: TicketStatus;
  qr_payload: string;
  checked_in_at?: string | null;
  checked_in_by?: string | null;
}

export interface DbCheckinRow {
  id: string;
  ticket_id?: string | null;
  ticket_code: string;
  event_id?: string | null;
  operator_id?: string | null;
  operator_name: string;
  attendee_name: string;
  batch_name: string;
  status?: string | null;
  created_at?: string | null;
  events?: {
    name?: string | null;
  } | null;
}

export interface DbCheckinInsert {
  id?: string;
  ticket_id: string;
  ticket_code: string;
  event_id: string;
  operator_id?: string | null;
  operator_name: string;
  attendee_name: string;
  batch_name: string;
  status: string;
}

export interface DbNotificationRow {
  id: string;
  user_id?: string | null;
  title: string;
  message: string;
  type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT' | string | null;
  read?: boolean | null;
  action_url?: string | null;
  created_at?: string | null;
}

export interface DbNotificationInsert {
  id?: string;
  user_id?: string | null;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
  read: boolean;
  action_url?: string | null;
}

/* ==============================================================================
 * 1. EVENTS MAPPERS
 * ============================================================================== */

/**
 * Converte um registro da tabela public.events (com possíveis joins) para EventItem.
 */
export function dbEventToEventItem(row: DbEventRow): EventItem {
  const rawBatches = row.ticket_batches || row.ticket_types || [];
  const ticketBatches: TicketBatch[] = Array.isArray(rawBatches)
    ? rawBatches.map(dbTicketBatchToTicketBatch)
    : [];

  const gallery: string[] = Array.isArray(row.event_images)
    ? row.event_images
        .map((img) => img.public_url || img.image_url || '')
        .filter((url): url is string => Boolean(url))
    : [];

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline ?? undefined,
    description: row.description,
    date: row.date_display,
    dateBadge: row.date_badge,
    time: row.time_display,
    location: row.location,
    city: row.city ?? 'Manhuaçu',
    state: row.state ?? 'MG',
    status: (row.status as EventStatus) ?? 'EM_BREVE',
    bannerImage: row.banner_image,
    gallery,
    features: {
      cars: Boolean(row.has_cars),
      motos: Boolean(row.has_motos),
      audio: Boolean(row.has_audio),
      food: Boolean(row.has_food),
    },
    ticketBatches,
    latitude:
      row.latitude !== null && row.latitude !== undefined
        ? Number(row.latitude)
        : undefined,
    longitude:
      row.longitude !== null && row.longitude !== undefined
        ? Number(row.longitude)
        : undefined,
  };
}

/**
 * Converte um EventItem da aplicação para o formato de inserção/atualização da tabela public.events.
 */
export function eventItemToDbEvent(item: Partial<EventItem>): DbEventInsert {
  return {
    ...(item.id ? { id: item.id } : {}),
    slug: item.slug ?? '',
    name: item.name ?? '',
    tagline: item.tagline ?? null,
    description: item.description ?? '',
    date_badge: item.dateBadge ?? '',
    date_display: item.date ?? '',
    time_display: item.time ?? '',
    location: item.location ?? '',
    city: item.city ?? 'Manhuaçu',
    state: item.state ?? 'MG',
    status: item.status ?? 'EM_BREVE',
    banner_image: item.bannerImage ?? '',
    latitude: item.latitude !== undefined ? item.latitude : null,
    longitude: item.longitude !== undefined ? item.longitude : null,
    has_cars: item.features ? Boolean(item.features.cars) : true,
    has_motos: item.features ? Boolean(item.features.motos) : true,
    has_audio: item.features ? Boolean(item.features.audio) : true,
    has_food: item.features ? Boolean(item.features.food) : true,
  };
}

/* ==============================================================================
 * 2. TICKET BATCHES MAPPERS
 * ============================================================================== */

/**
 * Converte um registro da tabela public.ticket_batches para TicketBatch.
 */
export function dbTicketBatchToTicketBatch(row: DbTicketBatchRow): TicketBatch {
  const total = Number(row.total_quantity ?? row.quantity ?? 0);
  const sold = Number(row.sold_quantity ?? 0);
  const available =
    row.available !== undefined && row.available !== null
      ? Boolean(row.available)
      : total > sold;

  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    price: typeof row.price === 'string' ? parseFloat(row.price) : Number(row.price),
    totalQuantity: total,
    soldQuantity: sold,
    batchNumber: Number(row.batch_number ?? 1),
    available,
  };
}

/**
 * Converte um TicketBatch para o formato de inserção/atualização da tabela public.ticket_batches.
 */
export function ticketBatchToDbTicketBatch(
  batch: Partial<TicketBatch> & { eventId?: string },
  fallbackEventId: string = ''
): DbTicketBatchInsert {
  return {
    ...(batch.id ? { id: batch.id } : {}),
    event_id: batch.eventId || fallbackEventId,
    name: batch.name ?? '',
    description: batch.description ?? '',
    price: Number(batch.price ?? 0),
    total_quantity: Number(batch.totalQuantity ?? 0),
    sold_quantity: Number(batch.soldQuantity ?? 0),
    batch_number: Number(batch.batchNumber ?? 1),
    available: batch.available !== undefined ? Boolean(batch.available) : true,
  };
}

/* ==============================================================================
 * 3. VEHICLES MAPPERS
 * ============================================================================== */

/**
 * Converte um registro da tabela public.vehicles para Vehicle.
 * Não inclui vehicle_images em photoUrl. Fotos adicionais são mantidas na camada de mídia.
 */
export function dbVehicleToVehicle(row: DbVehicleRow): Vehicle {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type ?? 'Carro',
    brand: row.brand,
    model: row.model,
    year: Number(row.year),
    color: row.color,
    plate: row.plate ?? undefined,
    category: (row.category as Vehicle['category']) ?? undefined,
    description: row.description ?? undefined,
    photoUrl: row.photo_url ?? undefined,
    photos: [],
  };
}

/**
 * Converte um Vehicle para o formato de inserção/atualização da tabela public.vehicles.
 */
export function vehicleToDbVehicle(vehicle: Partial<Vehicle>): DbVehicleInsert {
  return {
    ...(vehicle.id ? { id: vehicle.id } : {}),
    user_id: vehicle.userId ?? '',
    type: vehicle.type ?? 'Carro',
    brand: vehicle.brand ?? '',
    model: vehicle.model ?? '',
    year: Number(vehicle.year ?? new Date().getFullYear()),
    color: vehicle.color ?? '',
    plate: vehicle.plate ?? null,
    category: vehicle.category ?? null,
    description: vehicle.description ?? null,
    photo_url: vehicle.photoUrl ?? null,
  };
}

/* ==============================================================================
 * 4. TICKETS MAPPERS
 * ============================================================================== */

/**
 * Converte um registro da tabela public.tickets (com join opcional de events e orders) para Ticket.
 * Não inventa buyerPhone nem paymentMethod: utiliza dados de orders quando existirem,
 * ou deixa em branco/padrão seguro sem forjar dados falsos.
 */
export function dbTicketToTicket(
  row: DbTicketRow & {
    events?: {
      name?: string | null;
      date_display?: string | null;
      time_display?: string | null;
      location?: string | null;
    } | null;
    orders?: {
      buyer_phone?: string | null;
      payment_method?: 'PIX' | 'CARTAO' | 'BOLETO' | string | null;
    } | null;
  }
): Ticket {
  const events = row.events;
  const orders = row.orders;

  const validPaymentMethods: Array<Ticket['paymentMethod']> = ['PIX', 'CARTAO', 'BOLETO'];
  const paymentMethod: Ticket['paymentMethod'] =
    orders?.payment_method && validPaymentMethods.includes(orders.payment_method as Ticket['paymentMethod'])
      ? (orders.payment_method as Ticket['paymentMethod'])
      : 'PIX';

  return {
    id: row.id,
    code: row.code,
    eventId: row.event_id,
    eventName: events?.name ?? '',
    eventDate: events?.date_display ?? '',
    eventTime: events?.time_display ?? '',
    eventLocation: events?.location ?? '',
    batchName: row.batch_name,
    price: typeof row.price === 'string' ? parseFloat(row.price) : Number(row.price),
    buyerName: row.buyer_name,
    buyerEmail: row.buyer_email,
    buyerCpf: row.buyer_cpf,
    buyerPhone: orders?.buyer_phone ?? '',
    userId: row.user_id ?? undefined,
    status: (row.status as TicketStatus) ?? 'PAGO',
    paymentMethod,
    createdAt: row.created_at ?? new Date().toISOString(),
    checkedInAt: row.checked_in_at ?? undefined,
    checkedInBy: row.checked_in_by ?? undefined,
    qrPayload: row.qr_payload,
  };
}

/**
 * Converte um Ticket para o formato de inserção da tabela public.tickets.
 */
export function ticketToDbTicket(
  ticket: Partial<Ticket> & { batchId?: string; orderId?: string }
): DbTicketInsert {
  return {
    ...(ticket.id ? { id: ticket.id } : {}),
    code: ticket.code ?? '',
    order_id: ticket.orderId ?? null,
    event_id: ticket.eventId ?? '',
    batch_id: ticket.batchId ?? '',
    user_id: ticket.userId ?? null,
    buyer_name: ticket.buyerName ?? '',
    buyer_email: ticket.buyerEmail ?? '',
    buyer_cpf: ticket.buyerCpf ?? '',
    batch_name: ticket.batchName ?? '',
    price: Number(ticket.price ?? 0),
    status: ticket.status ?? 'PAGO',
    qr_payload: ticket.qrPayload ?? '',
    checked_in_at: ticket.checkedInAt ?? null,
    checked_in_by: ticket.checkedInBy ?? null,
  };
}

/* ==============================================================================
 * 5. CHECKINS MAPPERS
 * ============================================================================== */

/**
 * Converte um registro da tabela public.checkins para CheckInLog.
 * Não inventa eventName caso ele não venha de um join.
 */
export function dbCheckinToCheckInLog(row: DbCheckinRow): CheckInLog {
  return {
    id: row.id,
    ticketCode: row.ticket_code,
    attendeeName: row.attendee_name,
    batchName: row.batch_name,
    eventName: row.events?.name ?? '',
    timestamp: row.created_at ?? new Date().toISOString(),
    operatorName: row.operator_name,
    status: (row.status === 'NEGADO' ? 'NEGADO' : 'CONFIRMADO') as CheckInLog['status'],
    reason: undefined,
  };
}

/**
 * Converte um CheckInLog para o formato de inserção na tabela public.checkins.
 */
export function checkInLogToDbCheckin(
  log: Partial<CheckInLog> & { ticketId?: string; eventId?: string; operatorId?: string }
): DbCheckinInsert {
  return {
    ...(log.id ? { id: log.id } : {}),
    ticket_id: log.ticketId ?? '',
    ticket_code: log.ticketCode ?? '',
    event_id: log.eventId ?? '',
    operator_id: log.operatorId ?? null,
    operator_name: log.operatorName ?? '',
    attendee_name: log.attendeeName ?? '',
    batch_name: log.batchName ?? '',
    status: log.status ?? 'CONFIRMADO',
  };
}

/* ==============================================================================
 * 6. NOTIFICATIONS MAPPERS
 * ============================================================================== */

/**
 * Converte um registro da tabela public.notifications para NotificationItem.
 * Preserva o status read exatamente como boolean.
 */
export function dbNotificationToNotification(row: DbNotificationRow): NotificationItem {
  const validTypes: Array<NotificationItem['type']> = ['INFO', 'SUCCESS', 'WARNING', 'ALERT'];
  const type = validTypes.includes(row.type as NotificationItem['type'])
    ? (row.type as NotificationItem['type'])
    : 'INFO';

  return {
    id: row.id,
    userId: row.user_id ?? undefined,
    title: row.title,
    message: row.message,
    type,
    read: Boolean(row.read),
    createdAt: row.created_at ?? new Date().toISOString(),
    actionUrl: row.action_url ?? undefined,
  };
}

/**
 * Converte um NotificationItem para o formato de inserção na tabela public.notifications.
 */
export function notificationToDbNotification(item: Partial<NotificationItem>): DbNotificationInsert {
  return {
    ...(item.id ? { id: item.id } : {}),
    user_id: item.userId ?? null,
    title: item.title ?? '',
    message: item.message ?? '',
    type: item.type ?? 'INFO',
    read: Boolean(item.read),
    action_url: item.actionUrl ?? null,
  };
}
