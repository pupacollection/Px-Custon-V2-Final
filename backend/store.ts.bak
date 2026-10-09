// PX CUSTOM — Backend State Store & Business Logic
import { INITIAL_EVENTS, INITIAL_TICKETS, INITIAL_CHECKINS, INITIAL_DASHBOARD_STATS, INITIAL_MERCADO_PAGO_CONFIG, INITIAL_VEHICLES, CURRENT_USER, INITIAL_NOTIFICATIONS } from '../src/services/mockData';
import { Ticket, CheckInLog, EventItem, Vehicle, MercadoPagoConfig } from '../src/types';

class PXStore {
  events: EventItem[] = [...INITIAL_EVENTS];
  tickets: Ticket[] = [...INITIAL_TICKETS];
  checkins: CheckInLog[] = [...INITIAL_CHECKINS];
  vehicles: Vehicle[] = [...INITIAL_VEHICLES];
  mercadoPagoConfig: MercadoPagoConfig = { ...INITIAL_MERCADO_PAGO_CONFIG };
  stats = { ...INITIAL_DASHBOARD_STATS };
  notifications = [...INITIAL_NOTIFICATIONS];

  // Validate check-in server side
  validateCheckIn(code: string, operatorName: string = 'Operador PX Portaria 1') {
    const cleanCode = code.trim().toUpperCase();
    const ticket = this.tickets.find((t) => t.code.toUpperCase() === cleanCode);

    if (!ticket) {
      return {
        authorized: false,
        reason: 'INGRESSO INVÁLIDO',
        details: 'Código de ingresso não encontrado no banco oficial da PX CUSTOM.',
        ticket: null,
      };
    }

    if (ticket.status === 'UTILIZADO') {
      return {
        authorized: false,
        reason: 'INGRESSO JÁ UTILIZADO',
        details: `Este ingresso já realizou check-in em ${ticket.checkedInAt || 'horário anterior'}.`,
        ticket,
      };
    }

    if (ticket.status === 'PENDENTE') {
      return {
        authorized: false,
        reason: 'PAGAMENTO PENDENTE',
        details: 'O pagamento deste ingresso ainda não foi confirmado pelo Mercado Pago.',
        ticket,
      };
    }

    if (ticket.status !== 'PAGO') {
      return {
        authorized: false,
        reason: `INGRESSO ${ticket.status}`,
        details: `O status atual do ingresso é ${ticket.status}. Entrada não permitida.`,
        ticket,
      };
    }

    // Success! Authorize check-in
    const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const dateStr = new Date().toLocaleDateString('pt-BR');
    const timestamp = `${dateStr} • ${nowStr}`;

    ticket.status = 'UTILIZADO';
    ticket.checkedInAt = timestamp;
    ticket.checkedInBy = operatorName;

    const log: CheckInLog = {
      id: `chk-${Date.now()}`,
      ticketCode: ticket.code,
      attendeeName: ticket.buyerName,
      batchName: ticket.batchName,
      eventName: ticket.eventName,
      timestamp,
      operatorName,
      status: 'CONFIRMADO',
    };

    this.checkins.unshift(log);
    this.stats.checkinsCount += 1;

    return {
      authorized: true,
      reason: 'CHECK-IN AUTORIZADO',
      details: 'Acesso liberado com sucesso. Bem-vindo à experiência PX CUSTOM!',
      ticket,
      log,
    };
  }

  // Create pending ticket or order record
  createTicket(data: {
    eventId: string;
    batchName: string;
    price: number;
    buyerName: string;
    buyerEmail: string;
    buyerCpf: string;
    buyerPhone: string;
    paymentMethod: 'PIX' | 'CARTAO' | 'BOLETO';
    status?: 'PENDENTE' | 'PAGO';
  }): Ticket {
    const event = this.events.find((e) => e.id === data.eventId) || this.events[0];
    const randomCode = `PX-${new Date().getFullYear()}-${event.name.slice(0, 3).toUpperCase()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const ticketStatus = data.status || 'PENDENTE';

    const newTicket: Ticket = {
      id: `tkt-${Date.now()}`,
      code: randomCode,
      eventId: event.id,
      eventName: event.name,
      eventDate: event.date,
      eventTime: event.time,
      eventLocation: event.location,
      batchName: data.batchName,
      price: data.price,
      buyerName: data.buyerName,
      buyerEmail: data.buyerEmail,
      buyerCpf: data.buyerCpf,
      buyerPhone: data.buyerPhone,
      userId: CURRENT_USER.id,
      status: ticketStatus,
      paymentMethod: data.paymentMethod,
      createdAt: new Date().toISOString(),
      qrPayload: `${randomCode}|${event.id}|${CURRENT_USER.id}|${ticketStatus}`,
    };

    this.tickets.unshift(newTicket);
    if (ticketStatus === 'PAGO') {
      this.stats.ticketsSold += 1;
      this.stats.ticketsAvailable = Math.max(0, this.stats.ticketsAvailable - 1);
      this.stats.totalRevenue += data.price;

      this.notifications.unshift({
        id: `notif-${Date.now()}`,
        title: 'Ingresso emitido',
        message: `Seu ingresso para ${event.name} (${data.batchName}) está disponível com QR Code.`,
        type: 'SUCCESS',
        read: false,
        createdAt: 'Agora mesmo',
      });
    }

    return newTicket;
  }
}

export const pxStore = new PXStore();
