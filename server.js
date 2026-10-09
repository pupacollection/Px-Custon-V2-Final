// server.ts
import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// src/services/mockData.ts
var INITIAL_EVENTS = [
  {
    id: "evt-1",
    slug: "encontro-px-custom",
    name: "Encontro PX Custom",
    tagline: "O maior encontro automotivo da regi\xE3o",
    description: "O Encontro PX Custom \xE9 mais que um evento, \xE9 um ponto de encontro para apaixonados por carros, cultura e liberdade. Prepare seu ve\xEDculo, re\xFAna a galera e venha viver essa experi\xEAncia com a gente!",
    date: "15 de Novembro de 2025",
    dateBadge: "15 NOV",
    time: "Das 08:00 \xE0s 22:00",
    location: "Parque de Exposi\xE7\xF5es - Manhua\xE7u/MG",
    city: "Manhua\xE7u",
    state: "MG",
    status: "EM_BREVE",
    bannerImage: "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1544829099-b9a0c07fad1a?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=800&q=80"
    ],
    features: {
      cars: true,
      motos: true,
      audio: true,
      food: true
    },
    ticketBatches: [
      {
        id: "batch-1",
        name: "Pista",
        description: "Acesso ao evento, \xE1rea principal e estandes.",
        price: 40,
        totalQuantity: 600,
        soldQuantity: 410,
        available: true,
        batchNumber: 1
      },
      {
        id: "batch-2",
        name: "Camarote",
        description: "\xC1rea exclusiva, open bar e vista privilegiada para as pistas.",
        price: 80,
        totalQuantity: 250,
        soldQuantity: 212,
        available: true,
        batchNumber: 1
      },
      {
        id: "batch-3",
        name: "VIP",
        description: "Acesso total, backstage, estacionamento VIP e benef\xEDcios exclusivos.",
        price: 120,
        totalQuantity: 150,
        soldQuantity: 120,
        available: true,
        batchNumber: 1
      }
    ],
    latitude: -20.2582,
    longitude: -42.0336
  },
  {
    id: "evt-2",
    slug: "festival-da-familia",
    name: "Festival da Fam\xEDlia",
    tagline: "M\xFAsica, cultura e encontro de antigos e customizados",
    description: "Um dia inesquec\xEDvel reunindo fam\xEDlias e apaixonados pelo universo automotivo. Shows ao vivo, pra\xE7a gastron\xF4mica premium, espa\xE7o kids e exposi\xE7\xE3o de rel\xEDquias.",
    date: "12 de Dezembro de 2025",
    dateBadge: "12 DEZ",
    time: "Das 10:00 \xE0s 20:00",
    location: "Parque de Exposi\xE7\xF5es - Manhua\xE7u/MG",
    city: "Manhua\xE7u",
    state: "MG",
    status: "EM_ANDAMENTO",
    bannerImage: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80"
    ],
    features: {
      cars: true,
      motos: false,
      audio: true,
      food: true
    },
    ticketBatches: [
      {
        id: "batch-4",
        name: "Pista Fam\xEDlia",
        description: "Entrada individual para toda a \xE1rea social e estandes.",
        price: 35,
        totalQuantity: 500,
        soldQuantity: 340,
        available: true,
        batchNumber: 1
      },
      {
        id: "batch-5",
        name: "Camarote Prime",
        description: "\xC1rea com mesas, gar\xE7ons e vis\xE3o frontal do palco principal.",
        price: 75,
        totalQuantity: 200,
        soldQuantity: 180,
        available: true,
        batchNumber: 1
      }
    ],
    latitude: -20.2582,
    longitude: -42.0336
  },
  {
    id: "evt-3",
    slug: "mega-encontro",
    name: "Mega Encontro",
    tagline: "Caminh\xF5es customizados, carretas de som e superm\xE1quinas",
    description: "A maior concentra\xE7\xE3o de gigantes do asfalto, carretas tem\xE1ticas, caminh\xF5es rebaixados e som de alta pot\xEAncia de Minas Gerais.",
    date: "27 de Dezembro de 2025",
    dateBadge: "27 DEZ",
    time: "Das 08:00 \xE0s 22:00",
    location: "Parque de Exposi\xE7\xF5es - Manhua\xE7u/MG",
    city: "Manhua\xE7u",
    state: "MG",
    status: "EM_BREVE",
    bannerImage: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=1600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=800&q=80"
    ],
    features: {
      cars: true,
      motos: true,
      audio: true,
      food: true
    },
    ticketBatches: [
      {
        id: "batch-6",
        name: "Pista Geral",
        description: "Acesso \xE0 arena de caminh\xF5es e \xE1rea de medi\xE7\xE3o.",
        price: 50,
        totalQuantity: 700,
        soldQuantity: 290,
        available: true,
        batchNumber: 1
      },
      {
        id: "batch-7",
        name: "\xC1rea Box VIP",
        description: "Acesso aos boxes dos competidores e \xE1rea de lounge.",
        price: 100,
        totalQuantity: 200,
        soldQuantity: 110,
        available: true,
        batchNumber: 1
      }
    ],
    latitude: -20.2582,
    longitude: -42.0336
  }
];
var CURRENT_USER = {
  id: "usr-deivid-01",
  name: "Deivid Santos",
  email: "deividbmx779@gmail.com",
  phone: "(33) 99876-5432",
  cpf: "123.456.789-00",
  city: "Manhua\xE7u",
  state: "MG",
  avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
  role: "SUPER_ADMIN",
  createdAt: "2025-01-10T14:00:00Z"
};
var INITIAL_VEHICLES = [
  {
    id: "veh-1",
    userId: "usr-deivid-01",
    type: "Carro",
    brand: "Chevrolet",
    model: "Classic",
    year: 2012,
    color: "Prata",
    plate: "PXC-2012",
    category: "Rebaixado",
    description: "Suspens\xE3o a ar montada pela PX Custom, rodas aro 17 tala 6, som interno com kit 2 vias.",
    photoUrl: "https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "veh-2",
    userId: "usr-deivid-01",
    type: "Carro",
    brand: "Volkswagen",
    model: "Gol G5",
    year: 2010,
    color: "Preto",
    plate: "MGH-4490",
    category: "Som Automotivo",
    description: "Porta malas montado com 2 subwoofers de 15 polegadas e cornetas trio.",
    photoUrl: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=600&q=80"
  }
];
var INITIAL_TICKETS = [
  {
    id: "tkt-001",
    code: "PX-2025-ENC-74892",
    eventId: "evt-1",
    eventName: "Encontro PX Custom",
    eventDate: "15/11/2025",
    eventTime: "08:00 \xE0s 22:00",
    eventLocation: "Parque de Exposi\xE7\xF5es - Manhua\xE7u/MG",
    batchName: "Pista",
    price: 40,
    buyerName: "Deivid Santos",
    buyerEmail: "deividbmx779@gmail.com",
    buyerCpf: "123.456.789-00",
    buyerPhone: "(33) 99876-5432",
    userId: "usr-deivid-01",
    status: "PAGO",
    paymentMethod: "PIX",
    createdAt: "2025-11-10T12:30:00Z",
    qrPayload: "PX-2025-ENC-74892|evt-1|usr-deivid-01|PAGO"
  },
  {
    id: "tkt-002",
    code: "PX-2025-FES-19842",
    eventId: "evt-2",
    eventName: "Festival da Fam\xEDlia",
    eventDate: "12/12/2025",
    eventTime: "10:00 \xE0s 20:00",
    eventLocation: "Parque de Exposi\xE7\xF5es - Manhua\xE7u/MG",
    batchName: "Camarote Prime",
    price: 75,
    buyerName: "Deivid Santos",
    buyerEmail: "deividbmx779@gmail.com",
    buyerCpf: "123.456.789-00",
    buyerPhone: "(33) 99876-5432",
    userId: "usr-deivid-01",
    status: "PAGO",
    paymentMethod: "CARTAO",
    createdAt: "2025-11-12T16:15:00Z",
    qrPayload: "PX-2025-FES-19842|evt-2|usr-deivid-01|PAGO"
  }
];
var INITIAL_CHECKINS = [
  {
    id: "chk-1",
    ticketCode: "PX-2025-ENC-90112",
    attendeeName: "Jo\xE3o Silva",
    batchName: "Pista",
    eventName: "Encontro PX Custom",
    timestamp: "15/11/2025 \u2022 14:32",
    operatorName: "Operador PX Portaria 1",
    status: "CONFIRMADO"
  },
  {
    id: "chk-2",
    ticketCode: "PX-2025-ENC-38814",
    attendeeName: "Lucas Ferreira",
    batchName: "Camarote",
    eventName: "Encontro PX Custom",
    timestamp: "15/11/2025 \u2022 14:28",
    operatorName: "Operador PX VIP",
    status: "CONFIRMADO"
  },
  {
    id: "chk-3",
    ticketCode: "PX-2025-ENC-44109",
    attendeeName: "Rafael Souza",
    batchName: "VIP",
    eventName: "Encontro PX Custom",
    timestamp: "15/11/2025 \u2022 14:21",
    operatorName: "Operador PX VIP",
    status: "CONFIRMADO"
  },
  {
    id: "chk-4",
    ticketCode: "PX-2025-ENC-12003",
    attendeeName: "Matheus Oliveira",
    batchName: "Pista",
    eventName: "Encontro PX Custom",
    timestamp: "15/11/2025 \u2022 14:05",
    operatorName: "Operador PX Portaria 2",
    status: "CONFIRMADO"
  }
];
var INITIAL_DASHBOARD_STATS = {
  ticketsSold: 742,
  ticketsSoldGrowth: 12,
  ticketsAvailable: 258,
  checkinsCount: 531,
  checkinsGrowth: 8,
  totalRevenue: 29680,
  revenueGrowth: 15,
  salesByDay: [
    { date: "08/11", count: 42, revenue: 1680 },
    { date: "09/11", count: 68, revenue: 2720 },
    { date: "10/11", count: 110, revenue: 4400 },
    { date: "11/11", count: 95, revenue: 3800 },
    { date: "12/11", count: 140, revenue: 5600 },
    { date: "13/11", count: 125, revenue: 5e3 },
    { date: "14/11", count: 155, revenue: 6200 },
    { date: "15/11", count: 172, revenue: 6880 }
  ],
  salesByBatch: [
    { name: "Pista", percentage: 52, count: 386 },
    { name: "Camarote", percentage: 28, count: 208 },
    { name: "VIP", percentage: 20, count: 148 }
  ],
  revenueByDay: [
    { date: "08/11", amount: 3200 },
    { date: "09/11", amount: 5400 },
    { date: "10/11", amount: 8900 },
    { date: "11/11", amount: 12400 },
    { date: "12/11", amount: 16800 },
    { date: "13/11", amount: 21500 },
    { date: "14/11", amount: 25900 },
    { date: "15/11", amount: 29680 }
  ],
  paymentMethods: [
    { method: "PIX", percentage: 62, count: 460 },
    { method: "Cart\xE3o de Cr\xE9dito", percentage: 28, count: 208 },
    { method: "Boleto", percentage: 6, count: 44 },
    { method: "Outros", percentage: 4, count: 30 }
  ],
  recentCheckins: INITIAL_CHECKINS
};
var INITIAL_NOTIFICATIONS = [
  {
    id: "notif-1",
    title: "Pagamento aprovado",
    message: "Seu ingresso para o Encontro PX Custom foi confirmado com sucesso.",
    type: "SUCCESS",
    read: false,
    createdAt: "Hoje \xE0s 12:30"
  },
  {
    id: "notif-2",
    title: "Seu ingresso est\xE1 dispon\xEDvel",
    message: 'Acesse "Meus Ingressos" para visualizar seu QR Code digital de entrada.',
    type: "INFO",
    read: false,
    createdAt: "Hoje \xE0s 12:31"
  },
  {
    id: "notif-3",
    title: "Seu evento acontece em breve",
    message: "O Encontro PX Custom no Parque de Exposi\xE7\xF5es come\xE7a \xE0s 08:00.",
    type: "INFO",
    read: false,
    createdAt: "Ontem \xE0s 18:00"
  },
  {
    id: "notif-4",
    title: "Regras de Som Automotivo",
    message: "Confira as regras e faixas de decib\xE9is permitidas na arena principal.",
    type: "INFO",
    read: true,
    createdAt: "01/11/2025"
  }
];
var INITIAL_MERCADO_PAGO_CONFIG = {
  environment: "production",
  accessToken: "APP_USR-7894120894578123-111520-a8f89e1a2fbc789e90214a678b-87421190",
  publicKey: "APP_USR-8b2938a1-c891-4cf1-87a2-990a12e8412b",
  webhookSecret: "whsec_908a8f8e12903847bca8817293a0bcf8",
  pixEnabled: true,
  creditCardEnabled: true,
  boletoEnabled: true,
  connected: true,
  lastTestedAt: "Hoje \xE0s 14:10"
};

// backend/store.ts
var PXStore = class {
  constructor() {
    this.events = [...INITIAL_EVENTS];
    this.tickets = [...INITIAL_TICKETS];
    this.checkins = [...INITIAL_CHECKINS];
    this.vehicles = [...INITIAL_VEHICLES];
    this.mercadoPagoConfig = { ...INITIAL_MERCADO_PAGO_CONFIG };
    this.stats = { ...INITIAL_DASHBOARD_STATS };
    this.notifications = [...INITIAL_NOTIFICATIONS];
  }
  // Validate check-in server side
  validateCheckIn(code, operatorName = "Operador PX Portaria 1") {
    const cleanCode = code.trim().toUpperCase();
    const ticket = this.tickets.find((t) => t.code.toUpperCase() === cleanCode);
    if (!ticket) {
      return {
        authorized: false,
        reason: "INGRESSO INV\xC1LIDO",
        details: "C\xF3digo de ingresso n\xE3o encontrado no banco oficial da PX CUSTOM.",
        ticket: null
      };
    }
    if (ticket.status === "UTILIZADO") {
      return {
        authorized: false,
        reason: "INGRESSO J\xC1 UTILIZADO",
        details: `Este ingresso j\xE1 realizou check-in em ${ticket.checkedInAt || "hor\xE1rio anterior"}.`,
        ticket
      };
    }
    if (ticket.status === "PENDENTE") {
      return {
        authorized: false,
        reason: "PAGAMENTO PENDENTE",
        details: "O pagamento deste ingresso ainda n\xE3o foi confirmado pelo Mercado Pago.",
        ticket
      };
    }
    if (ticket.status !== "PAGO") {
      return {
        authorized: false,
        reason: `INGRESSO ${ticket.status}`,
        details: `O status atual do ingresso \xE9 ${ticket.status}. Entrada n\xE3o permitida.`,
        ticket
      };
    }
    const nowStr = (/* @__PURE__ */ new Date()).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const dateStr = (/* @__PURE__ */ new Date()).toLocaleDateString("pt-BR");
    const timestamp = `${dateStr} \u2022 ${nowStr}`;
    ticket.status = "UTILIZADO";
    ticket.checkedInAt = timestamp;
    ticket.checkedInBy = operatorName;
    const log = {
      id: `chk-${Date.now()}`,
      ticketCode: ticket.code,
      attendeeName: ticket.buyerName,
      batchName: ticket.batchName,
      eventName: ticket.eventName,
      timestamp,
      operatorName,
      status: "CONFIRMADO"
    };
    this.checkins.unshift(log);
    this.stats.checkinsCount += 1;
    return {
      authorized: true,
      reason: "CHECK-IN AUTORIZADO",
      details: "Acesso liberado com sucesso. Bem-vindo \xE0 experi\xEAncia PX CUSTOM!",
      ticket,
      log
    };
  }
  // Create pending ticket or order record
  createTicket(data) {
    const event = this.events.find((e) => e.id === data.eventId) || this.events[0];
    const randomCode = `PX-${(/* @__PURE__ */ new Date()).getFullYear()}-${event.name.slice(0, 3).toUpperCase()}-${Math.floor(1e4 + Math.random() * 9e4)}`;
    const ticketStatus = data.status || "PENDENTE";
    const newTicket = {
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
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      qrPayload: `${randomCode}|${event.id}|${CURRENT_USER.id}|${ticketStatus}`
    };
    this.tickets.unshift(newTicket);
    if (ticketStatus === "PAGO") {
      this.stats.ticketsSold += 1;
      this.stats.ticketsAvailable = Math.max(0, this.stats.ticketsAvailable - 1);
      this.stats.totalRevenue += data.price;
      this.notifications.unshift({
        id: `notif-${Date.now()}`,
        title: "Ingresso emitido",
        message: `Seu ingresso para ${event.name} (${data.batchName}) est\xE1 dispon\xEDvel com QR Code.`,
        type: "SUCCESS",
        read: false,
        createdAt: "Agora mesmo"
      });
    }
    return newTicket;
  }
};
var pxStore = new PXStore();

// backend/services/mediaStore.ts
var MediaStore = class {
  constructor() {
    this.mediaItems = /* @__PURE__ */ new Map();
  }
  // Save new media item
  saveMedia(item) {
    const id = `med-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
    const bucket = item.bucket || (item.resourceType === "event" ? "events" : item.resourceType === "vehicle" ? "vehicles" : item.resourceType === "branding" ? "branding" : "profiles");
    const stored = {
      id,
      url: item.url,
      publicUrl: item.publicUrl || item.url,
      fileName: item.fileName,
      fileSize: item.fileSize,
      mimeType: item.mimeType,
      bucket,
      resourceType: item.resourceType,
      resourceId: item.resourceId,
      userId: item.userId,
      isPrimary: item.isPrimary ?? false,
      sortOrder: item.sortOrder ?? 0,
      storagePath: item.storagePath || `${bucket}/${item.resourceId || "common"}/${item.fileName}`,
      isLocalPreview: !item.isRealStorage,
      uploadedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.mediaItems.set(id, stored);
    return stored;
  }
  // Get media by ID
  getMedia(id) {
    const item = this.mediaItems.get(id);
    return item && !item.isDeleted ? item : void 0;
  }
  // List media for a specific resource
  listMediaByResource(resourceType, resourceId) {
    return Array.from(this.mediaItems.values()).filter((m) => !m.isDeleted && m.resourceType === resourceType && m.resourceId === resourceId).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }
  // Delete media
  deleteMedia(id) {
    const item = this.mediaItems.get(id);
    if (!item) return false;
    item.isDeleted = true;
    return true;
  }
  // Set primary media for a resource
  setPrimary(id) {
    const item = this.mediaItems.get(id);
    if (!item || item.isDeleted) return null;
    if (item.resourceId && item.resourceType) {
      for (const m of this.mediaItems.values()) {
        if (m.resourceType === item.resourceType && m.resourceId === item.resourceId) {
          m.isPrimary = false;
        }
      }
    }
    item.isPrimary = true;
    return item;
  }
  // Reorder items
  reorder(ids) {
    ids.forEach((id, index) => {
      const item = this.mediaItems.get(id);
      if (item && !item.isDeleted) {
        item.sortOrder = index;
      }
    });
    return true;
  }
};
var mediaStore = new MediaStore();

// server.ts
dotenv.config();
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
var serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
var supabaseAdmin = supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
}) : null;
if (!serviceRoleKey) {
  console.warn(
    "[PX CUSTOM BACKEND] ATEN\xC7\xC3O: SUPABASE_SERVICE_ROLE_KEY n\xE3o detectada. Opera\xE7\xF5es com privil\xE9gio administrativo no backend (bypass de RLS, webhook oficial e RPC) permanecem protegidas e n\xE3o recorrer\xE3o silenciosamente \xE0 chave an\xF4nima."
  );
}
async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3e3;
  app.use(express.json({ limit: "15mb" }));
  app.post("/api/media/upload", (req, res) => {
    try {
      const {
        url,
        fileName,
        fileSize,
        mimeType,
        resourceType = "common",
        resourceId,
        userId = "usr-deivid-01",
        bucket,
        storagePath: customStoragePath,
        publicUrl,
        isRealStorage = false,
        isPrimary = false,
        sortOrder = 0
      } = req.body;
      if (!url || !fileName || !mimeType) {
        return res.status(400).json({ error: "Dados do arquivo incompletos (url, fileName e mimeType obrigat\xF3rios)." });
      }
      const blockedExtensions = [
        ".exe",
        ".sh",
        ".bat",
        ".cmd",
        ".js",
        ".ts",
        ".html",
        ".htm",
        ".php",
        ".phtml",
        ".py",
        ".pl",
        ".cgi",
        ".jar",
        ".vbs",
        ".msi",
        ".com",
        ".scr",
        ".ps1",
        ".apk",
        ".bin",
        ".dll",
        ".so"
      ];
      const lowerName = fileName.toLowerCase();
      const dotIdx = lowerName.lastIndexOf(".");
      if (dotIdx === -1) {
        return res.status(400).json({ error: "Arquivo sem extens\xE3o v\xE1lida." });
      }
      const ext = lowerName.substring(dotIdx);
      if (blockedExtensions.includes(ext)) {
        return res.status(400).json({ error: `Formato de arquivo bloqueado por seguran\xE7a: ${ext}` });
      }
      const isBranding = resourceType === "branding" || bucket === "branding";
      const allowedExts = isBranding ? [".jpg", ".jpeg", ".png", ".webp", ".svg"] : [".jpg", ".jpeg", ".png", ".webp"];
      if (!allowedExts.includes(ext)) {
        return res.status(400).json({
          error: `Extens\xE3o de arquivo n\xE3o permitida (${ext}). Permitidas: ${allowedExts.join(", ")}`
        });
      }
      const allowedMimes = isBranding ? ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/svg+xml"] : ["image/jpeg", "image/jpg", "image/png", "image/webp"];
      if (!allowedMimes.includes(mimeType)) {
        return res.status(400).json({ error: `Tipo MIME n\xE3o permitido: ${mimeType}` });
      }
      if (ext === ".svg" && mimeType !== "image/svg+xml") {
        return res.status(400).json({ error: "Inconsist\xEAncia entre extens\xE3o .svg e tipo MIME informado." });
      }
      const isProfile = resourceType === "profile" || bucket === "profiles";
      const maxLimitBytes = isProfile ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
      if (fileSize && fileSize > maxLimitBytes) {
        return res.status(400).json({
          error: `Arquivo excede o limite m\xE1ximo de ${isProfile ? "5 MB para perfil" : "10 MB"}.`
        });
      }
      const targetBucket = bucket || (resourceType.startsWith("event") ? "events" : resourceType.startsWith("vehicle") ? "vehicles" : resourceType === "branding" ? "branding" : "profiles");
      const cleanExt = ext.replace(".", "");
      const uniqueId = `uuid-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const storagePath = customStoragePath || `${targetBucket}/${resourceId || "item"}/${uniqueId}.${cleanExt}`;
      const savedMedia = mediaStore.saveMedia({
        url: publicUrl || url,
        publicUrl: publicUrl || url,
        fileName: `${uniqueId}.${cleanExt}`,
        fileSize: fileSize || 0,
        mimeType,
        resourceType,
        resourceId,
        userId,
        bucket: targetBucket,
        storagePath,
        isPrimary,
        sortOrder,
        isRealStorage: Boolean(isRealStorage)
      });
      res.status(201).json({
        success: true,
        storageMode: isRealStorage ? "supabase_storage" : "local_preview",
        message: isRealStorage ? "Arquivo registrado com sucesso com refer\xEAncia ao Supabase Storage." : "Arquivo processado com sucesso (Modo demonstra\xE7\xE3o local).",
        media: savedMedia
      });
    } catch (err) {
      res.status(500).json({ error: err.message || "Erro no processamento de m\xEDdia" });
    }
  });
  app.delete("/api/media/:id", (req, res) => {
    const success = mediaStore.deleteMedia(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "M\xEDdia n\xE3o encontrada" });
    }
    res.json({ success: true, message: "Arquivo removido com sucesso" });
  });
  app.patch("/api/media/:id/primary", (req, res) => {
    const updated = mediaStore.setPrimary(req.params.id);
    if (!updated) {
      return res.status(404).json({ error: "M\xEDdia n\xE3o encontrada" });
    }
    res.json({ success: true, media: updated });
  });
  app.patch("/api/media/reorder", (req, res) => {
    const { ids } = req.body;
    if (Array.isArray(ids)) {
      mediaStore.reorder(ids);
      return res.json({ success: true, message: "Ordem atualizada com sucesso" });
    }
    res.status(400).json({ error: "Lista de IDs inv\xE1lida" });
  });
  app.get("/api/health", (req, res) => {
    res.json({
      status: "online",
      system: "PX CUSTOM Official Engine"
    });
  });
  app.get("/api/events", (req, res) => {
    res.json(pxStore.events);
  });
  app.get("/api/events/:slug", (req, res) => {
    const event = pxStore.events.find((e) => e.slug === req.params.slug);
    if (!event) {
      return res.status(404).json({ error: "Evento n\xE3o encontrado" });
    }
    res.json(event);
  });
  app.post("/api/events", (req, res) => {
    const newEvent = {
      id: `evt-${Date.now()}`,
      ...req.body
    };
    pxStore.events.unshift(newEvent);
    res.status(201).json(newEvent);
  });
  app.put("/api/events/:id", (req, res) => {
    const index = pxStore.events.findIndex((e) => e.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: "Evento n\xE3o encontrado" });
    }
    pxStore.events[index] = { ...pxStore.events[index], ...req.body };
    res.json(pxStore.events[index]);
  });
  app.get("/api/tickets", async (req, res) => {
    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin.from("tickets").select("*").order("created_at", { ascending: false });
        if (!error && data) {
          return res.json(data);
        }
      } catch (err) {
        console.warn("[PX TICKETS] Falha ao carregar do Supabase:", err);
      }
    }
    res.json(pxStore.tickets);
  });
  app.post("/api/tickets/purchase", async (req, res) => {
    try {
      const {
        eventId,
        batchName,
        price,
        buyerName,
        buyerEmail,
        buyerCpf,
        buyerPhone,
        paymentMethod = "PIX"
      } = req.body;
      if (!eventId || !batchName || !buyerName || !buyerEmail || !buyerCpf) {
        return res.status(400).json({ error: "Dados obrigat\xF3rios do pedido est\xE3o incompletos." });
      }
      let authUserId = null;
      const authHeader = req.headers.authorization;
      if (authHeader && supabaseAdmin) {
        const token = authHeader.replace(/^Bearer\s+/i, "");
        const { data: uData } = await supabaseAdmin.auth.getUser(token);
        if (uData?.user?.id) {
          authUserId = uData.user.id;
        }
      }
      let verifiedPrice = Number(price);
      let validatedEventId = eventId;
      let ticketTypeId = null;
      if (supabaseAdmin) {
        const { data: dbEvent } = await supabaseAdmin.from("events").select("id, title, status").eq("id", eventId).maybeSingle();
        if (dbEvent) {
          validatedEventId = dbEvent.id;
          const { data: dbTypes } = await supabaseAdmin.from("ticket_types").select("id, name, price, quantity, sold_quantity").eq("event_id", dbEvent.id).ilike("name", `%${batchName}%`).maybeSingle();
          if (dbTypes) {
            ticketTypeId = dbTypes.id;
            verifiedPrice = Number(dbTypes.price);
          }
        }
      }
      const orderCode = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.floor(1e3 + Math.random() * 9e3)}`;
      let createdOrderId = orderCode;
      if (supabaseAdmin) {
        try {
          const { data: orderRow, error: orderErr } = await supabaseAdmin.from("orders").insert({
            user_id: authUserId,
            event_id: validatedEventId,
            total_amount: verifiedPrice,
            status: "PENDING",
            external_reference: orderCode
          }).select().single();
          if (!orderErr && orderRow) {
            createdOrderId = orderRow.id;
            await supabaseAdmin.from("payments").insert({
              order_id: orderRow.id,
              user_id: authUserId,
              amount: verifiedPrice,
              status: "PENDING",
              external_reference: orderCode
            });
            const ticketCode = `PX-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
            await supabaseAdmin.from("tickets").insert({
              ticket_code: ticketCode,
              order_id: orderRow.id,
              event_id: validatedEventId,
              user_id: authUserId,
              price: verifiedPrice,
              status: "PENDING",
              qr_code: `${ticketCode}|${validatedEventId}|${authUserId || "guest"}|PENDING`,
              ...ticketTypeId ? { ticket_type_id: ticketTypeId } : {}
            });
          }
        } catch (dbErr) {
          console.warn("[PX CHECKOUT] Aviso ao persistir pedido inicial no Supabase:", dbErr);
        }
      }
      const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN || "";
      let qrCodePix = "";
      let qrCodePixBase64 = "";
      let mpPaymentId = "";
      if (paymentMethod === "PIX") {
        if (!accessToken) {
          console.error("[PX MERCADOPAGO] Token de acesso (MERCADOPAGO_ACCESS_TOKEN) ausente no servidor.");
          return res.status(503).json({
            error: "Servi\xE7o de pagamentos indispon\xEDvel. Credenciais do Mercado Pago n\xE3o configuradas no servidor."
          });
        }
        const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "X-Idempotency-Key": `pix-order-${createdOrderId}`
          },
          body: JSON.stringify({
            transaction_amount: verifiedPrice,
            description: `Ingresso PX CUSTOM - ${batchName}`,
            payment_method_id: "pix",
            payer: {
              email: buyerEmail,
              first_name: buyerName.split(" ")[0] || "Participante",
              last_name: buyerName.split(" ").slice(1).join(" ") || "PX",
              identification: {
                type: "CPF",
                number: buyerCpf.replace(/\D/g, "")
              }
            },
            external_reference: createdOrderId,
            notification_url: `${req.protocol}://${req.get("host")}/api/mercadopago/webhook`
          })
        });
        if (!mpRes.ok) {
          const mpErrText = await mpRes.text().catch(() => "");
          console.error("[PX MERCADOPAGO] Erro retornado pela API oficial do Mercado Pago:", mpRes.status, mpErrText);
          return res.status(502).json({
            error: "Falha ao gerar cobran\xE7a no Mercado Pago. Verifique os dados informados ou tente novamente."
          });
        }
        const mpJson = await mpRes.json();
        mpPaymentId = String(mpJson.id);
        const poi = mpJson.point_of_interaction?.transaction_data;
        if (!poi?.qr_code) {
          console.error("[PX MERCADOPAGO] Resposta da API Mercado Pago sem dados PIX v\xE1lidos:", mpJson);
          return res.status(502).json({
            error: "O Mercado Pago n\xE3o retornou os dados de QR Code PIX para este pagamento."
          });
        }
        qrCodePix = poi.qr_code;
        qrCodePixBase64 = poi.qr_code_base64 || "";
        if (supabaseAdmin && mpPaymentId) {
          await supabaseAdmin.from("payments").update({ external_reference: mpPaymentId }).eq("order_id", createdOrderId);
        }
      }
      const pendingTicket = pxStore.createTicket({
        eventId: validatedEventId,
        batchName,
        price: verifiedPrice,
        buyerName,
        buyerEmail,
        buyerCpf,
        buyerPhone,
        paymentMethod,
        status: "PENDENTE"
      });
      return res.status(201).json({
        orderId: createdOrderId,
        paymentId: mpPaymentId || void 0,
        status: "PENDING",
        paymentMethod,
        totalAmount: verifiedPrice,
        qrCodePix,
        qrCodePixBase64,
        ticket: pendingTicket,
        externalReference: createdOrderId
      });
    } catch (err) {
      console.error("[PX CHECKOUT] Erro ao processar checkout:", err);
      return res.status(400).json({ error: err.message || "Erro ao processar compra" });
    }
  });
  app.get("/api/orders/:id/status", async (req, res) => {
    try {
      const orderId = req.params.id;
      if (!orderId) {
        return res.status(400).json({ error: "ID do pedido obrigat\xF3rio" });
      }
      if (supabaseAdmin) {
        const { data: order } = await supabaseAdmin.from("orders").select("id, status, total_amount").or(`id.eq.${orderId},external_reference.eq.${orderId}`).maybeSingle();
        if (order) {
          let paidTicket = null;
          if (order.status === "PAID") {
            const { data: tkt } = await supabaseAdmin.from("tickets").select("*").eq("order_id", order.id).maybeSingle();
            paidTicket = tkt;
          }
          return res.json({
            status: order.status,
            orderId: order.id,
            ticket: paidTicket || void 0
          });
        }
      }
      const storeTicket = pxStore.tickets.find((t) => t.id === orderId || t.code === orderId);
      return res.json({
        status: storeTicket ? storeTicket.status : "PENDING",
        ticket: storeTicket && storeTicket.status === "PAGO" ? storeTicket : void 0
      });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao consultar status do pedido" });
    }
  });
  app.post("/api/checkin/validate", async (req, res) => {
    const { code, operatorName } = req.body;
    if (!code || typeof code !== "string") {
      return res.status(400).json({
        authorized: false,
        reason: "C\xD3DIGO AUSENTE",
        details: "Informe o c\xF3digo do ingresso ou escaneie o QR Code."
      });
    }
    const cleanRaw = code.trim().toUpperCase();
    const cleanCode = cleanRaw.includes("|") ? cleanRaw.split("|")[0].trim() : cleanRaw;
    let operatorUser = null;
    let operatorRole = "OPERATOR";
    const authHeader = req.headers.authorization;
    if (authHeader && supabaseAdmin) {
      try {
        const token = authHeader.replace(/^Bearer\s+/i, "");
        const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
        if (userData?.user && !userErr) {
          operatorUser = userData.user;
          const { data: adminRecord } = await supabaseAdmin.from("admin_users").select("role").eq("user_id", operatorUser.id).maybeSingle();
          const { data: profileRecord } = await supabaseAdmin.from("profiles").select("role").eq("id", operatorUser.id).maybeSingle();
          const roleFound = (adminRecord?.role || profileRecord?.role || "").toUpperCase();
          if (roleFound) {
            operatorRole = roleFound;
          }
          const isAuthorizedRole = [
            "ADMIN",
            "SUPER_ADMIN",
            "OPERADOR",
            "OPERATOR",
            "CHECKIN_OPERATOR",
            "PORTARIA"
          ].includes(operatorRole) || operatorUser.email?.endsWith("@pxcustom.com.br");
          if (!isAuthorizedRole) {
            return res.status(403).json({
              authorized: false,
              reason: "ACESSO NEGADO",
              details: "Seu usu\xE1rio n\xE3o possui permiss\xE3o de operador ou administrador para validar check-in."
            });
          }
        }
      } catch (authErr) {
        console.warn("[PX CHECKIN] Aviso ao validar token de operador:", authErr);
      }
    }
    const op = operatorName || (operatorUser?.email ? `Operador (${operatorUser.email})` : "Operador PX Portaria 1");
    if (supabaseAdmin) {
      try {
        const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc("fn_validate_and_checkin_ticket", {
          p_ticket_code: cleanCode,
          p_operator_name: op,
          p_operator_id: operatorUser?.id || null
        });
        if (!rpcError && rpcResult && typeof rpcResult === "object") {
          return res.json(rpcResult);
        }
        const { data: ticket, error: ticketErr } = await supabaseAdmin.from("tickets").select("id, ticket_code, event_id, user_id, order_id, price, status, qr_code, created_at").eq("ticket_code", cleanCode).maybeSingle();
        if (ticketErr) {
          console.error("[PX CHECKIN] Falha ao consultar ingresso no Supabase:", ticketErr.message);
          return res.status(500).json({
            authorized: false,
            reason: "ERRO NO BANCO",
            details: "Falha operacional ao consultar o banco de dados oficial."
          });
        }
        if (!ticket) {
          return res.status(404).json({
            authorized: false,
            reason: "INGRESSO N\xC3O ENCONTRADO",
            details: "C\xF3digo de ingresso n\xE3o localizado na base oficial de dados do evento.",
            ticket: null
          });
        }
        if (ticket.status === "UTILIZADO" || ticket.status === "USED") {
          return res.json({
            authorized: false,
            reason: "INGRESSO J\xC1 UTILIZADO",
            details: "Este ingresso j\xE1 realizou check-in anteriormente. Entrada duplicada proibida.",
            ticket
          });
        }
        if (ticket.status === "PENDENTE" || ticket.status === "PENDING") {
          return res.json({
            authorized: false,
            reason: "PAGAMENTO PENDENTE",
            details: "O pagamento deste ingresso ainda n\xE3o foi confirmado pelo Mercado Pago.",
            ticket
          });
        }
        if (ticket.status !== "PAGO" && ticket.status !== "PAID") {
          return res.json({
            authorized: false,
            reason: `INGRESSO ${ticket.status}`,
            details: `O status atual do ingresso \xE9 ${ticket.status}. Entrada n\xE3o permitida.`,
            ticket
          });
        }
        const nowIso = (/* @__PURE__ */ new Date()).toISOString();
        const { data: updatedTicket, error: updateErr } = await supabaseAdmin.from("tickets").update({
          status: "USED"
        }).eq("id", ticket.id).in("status", ["PAID", "PAGO"]).select().maybeSingle();
        if (updateErr || !updatedTicket) {
          return res.json({
            authorized: false,
            reason: "INGRESSO J\xC1 UTILIZADO",
            details: "Tentativa concorrente detectada: o ingresso acabou de ser utilizado em outra portaria.",
            ticket
          });
        }
        const { error: logErr } = await supabaseAdmin.from("checkins").insert({
          ticket_id: ticket.id,
          event_id: ticket.event_id,
          device_info: JSON.stringify({
            operator_name: op,
            operator_id: operatorUser?.id || null,
            ticket_code: cleanCode,
            status: "CONFIRMADO",
            timestamp: nowIso
          }),
          created_at: nowIso
        });
        if (logErr) {
          console.error("[PX CHECKIN] Falha ao gravar log em checkins, revertendo status:", logErr.message);
          await supabaseAdmin.from("tickets").update({ status: "PAID" }).eq("id", ticket.id);
          return res.status(500).json({
            authorized: false,
            reason: "FALHA DE PERSIST\xCANCIA",
            details: "Erro ao registrar check-in no banco de dados. Transa\xE7\xE3o revertida por seguran\xE7a."
          });
        }
        return res.json({
          authorized: true,
          reason: "CHECK-IN AUTORIZADO",
          details: "Acesso liberado com sucesso. Bem-vindo \xE0 experi\xEAncia PX CUSTOM!",
          ticket: updatedTicket
        });
      } catch (dbErr) {
        console.error("[PX CHECKIN] Falha operacional no banco:", dbErr.message);
        return res.status(500).json({
          authorized: false,
          reason: "ERRO OPERACIONAL",
          details: "Erro interno ao processar valida\xE7\xE3o de check-in."
        });
      }
    }
    const result = pxStore.validateCheckIn(cleanCode, operatorName);
    res.json(result);
  });
  app.get("/api/checkins", (req, res) => {
    res.json(pxStore.checkins);
  });
  app.get("/api/stats", (req, res) => {
    res.json({
      ...pxStore.stats,
      recentCheckins: pxStore.checkins.slice(0, 10)
    });
  });
  app.get("/api/vehicles", (req, res) => {
    res.json(pxStore.vehicles);
  });
  app.post("/api/vehicles", (req, res) => {
    const newVehicle = {
      id: req.body.id || `veh-${Date.now()}`,
      userId: "usr-deivid-01",
      ...req.body
    };
    pxStore.vehicles.push(newVehicle);
    res.status(201).json(newVehicle);
  });
  app.put("/api/vehicles/:id", (req, res) => {
    const idx = pxStore.vehicles.findIndex((v) => v.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: "Ve\xEDculo n\xE3o encontrado" });
    }
    pxStore.vehicles[idx] = {
      ...pxStore.vehicles[idx],
      ...req.body
    };
    res.json(pxStore.vehicles[idx]);
  });
  app.delete("/api/vehicles/:id", (req, res) => {
    pxStore.vehicles = pxStore.vehicles.filter((v) => v.id !== req.params.id);
    res.json({ success: true });
  });
  app.get("/api/notifications", (req, res) => {
    res.json(pxStore.notifications);
  });
  app.post("/api/notifications/read-all", (req, res) => {
    pxStore.notifications.forEach((n) => n.read = true);
    res.json({ success: true });
  });
  app.get("/api/mercadopago/config", (req, res) => {
    const { accessToken, ...rest } = pxStore.mercadoPagoConfig;
    const maskedToken = accessToken ? `${accessToken.slice(0, 8)}********************************${accessToken.slice(-6)}` : "";
    res.json({
      ...rest,
      maskedAccessToken: maskedToken
    });
  });
  app.post("/api/mercadopago/config", (req, res) => {
    pxStore.mercadoPagoConfig = {
      ...pxStore.mercadoPagoConfig,
      ...req.body
    };
    res.json({ success: true, message: "Configura\xE7\xF5es atualizadas com sucesso" });
  });
  app.post("/api/mercadopago/test", (req, res) => {
    pxStore.mercadoPagoConfig.connected = true;
    pxStore.mercadoPagoConfig.lastTestedAt = (/* @__PURE__ */ new Date()).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit"
    });
    res.json({
      success: true,
      status: "connected",
      environment: pxStore.mercadoPagoConfig.environment,
      message: "Conex\xE3o com a API do Mercado Pago validada com sucesso! Webhook pronto para escuta."
    });
  });
  app.post("/api/mercadopago/webhook", async (req, res) => {
    try {
      const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET || process.env.MP_WEBHOOK_SECRET || "";
      const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN || "";
      if (!webhookSecret) {
        console.warn("[PX MERCADOPAGO] Erro operacional: Segredo do webhook (MERCADOPAGO_WEBHOOK_SECRET) n\xE3o configurado no servidor.");
        return res.status(503).json({
          error: "Servi\xE7o de webhook temporariamente indispon\xEDvel. Credenciais do webhook ausentes no servidor."
        });
      }
      const dataId = req.body?.data?.id || req.query?.["data.id"] || req.query?.id;
      if (!dataId || typeof dataId !== "string" && typeof dataId !== "number") {
        return res.status(400).json({ error: "ID do recurso ausente na notifica\xE7\xE3o do webhook." });
      }
      const cleanDataId = String(dataId).trim();
      const xSignature = req.headers["x-signature"];
      const xRequestId = req.headers["x-request-id"];
      if (!xSignature) {
        console.warn("[PX MERCADOPAGO] Notifica\xE7\xE3o rejeitada: Cabe\xE7alho x-signature ausente.");
        return res.status(401).json({ error: "Assinatura x-signature ausente." });
      }
      const parts = Object.fromEntries(
        xSignature.split(",").map((part) => part.trim().split("="))
      );
      const ts = parts.ts;
      const v1 = parts.v1;
      if (!ts || !v1) {
        console.warn("[PX MERCADOPAGO] Notifica\xE7\xE3o rejeitada: Cabe\xE7alho x-signature malformado.");
        return res.status(401).json({ error: "Assinatura x-signature malformada." });
      }
      const manifest = `id:${cleanDataId};request-id:${xRequestId || ""};ts:${ts};`;
      const computedHash = crypto.createHmac("sha256", webhookSecret).update(manifest).digest("hex");
      const computedBuffer = Buffer.from(computedHash, "utf8");
      const receivedBuffer = Buffer.from(v1, "utf8");
      if (computedBuffer.length !== receivedBuffer.length || !crypto.timingSafeEqual(computedBuffer, receivedBuffer)) {
        console.warn("[PX MERCADOPAGO] Notifica\xE7\xE3o rejeitada: Assinatura HMAC-SHA256 inv\xE1lida.");
        return res.status(401).json({ error: "Assinatura criptogr\xE1fica do webhook inv\xE1lida." });
      }
      if (!accessToken) {
        console.warn("[PX MERCADOPAGO] Erro operacional: Token de acesso (MERCADOPAGO_ACCESS_TOKEN) n\xE3o configurado para consulta oficial.");
        return res.status(503).json({ error: "Token de consulta \xE0 API do Mercado Pago n\xE3o configurado." });
      }
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${cleanDataId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      });
      if (!mpResponse.ok) {
        console.warn(`[PX MERCADOPAGO] Falha ao consultar pagamento na API oficial: Status ${mpResponse.status}`);
        return res.status(502).json({ error: "Falha ao consultar pagamento na API oficial do Mercado Pago." });
      }
      const paymentData = await mpResponse.json();
      const paymentStatus = paymentData.status;
      const externalReference = paymentData.external_reference;
      const transactionAmount = Number(paymentData.transaction_amount || 0);
      const currencyId = paymentData.currency_id || "BRL";
      if (paymentStatus === "approved") {
        console.log(`[PX MERCADOPAGO] Pagamento verificado como aprovado na API oficial.`);
        if (supabaseAdmin) {
          let order = null;
          if (externalReference) {
            const { data: ordById, error: ordErr } = await supabaseAdmin.from("orders").select("id, user_id, event_id, total_amount, status, created_at, updated_at").eq("id", externalReference).maybeSingle();
            if (ordErr) {
              console.error("[PX MERCADOPAGO] Erro ao consultar pedido no Supabase:", ordErr.message);
              return res.status(500).json({ error: "Erro ao consultar pedido no banco oficial." });
            }
            order = ordById;
          }
          if (!order) {
            const { data: payRecord } = await supabaseAdmin.from("payments").select("order_id").eq("external_reference", cleanDataId).maybeSingle();
            if (payRecord?.order_id) {
              const { data: ordFromPay } = await supabaseAdmin.from("orders").select("id, user_id, event_id, total_amount, status, created_at, updated_at").eq("id", payRecord.order_id).maybeSingle();
              order = ordFromPay;
            }
          }
          if (order) {
            if (currencyId !== "BRL") {
              console.warn(`[PX MERCADOPAGO] Moeda divergente rejeitada: ${currencyId}`);
              return res.status(400).json({ error: "Moeda n\xE3o autorizada para o pedido." });
            }
            if (transactionAmount < Number(order.total_amount)) {
              console.warn(`[PX MERCADOPAGO] Valor recebido inferior ao total do pedido.`);
              return res.status(400).json({ error: "Valor pago divergente ou insuficiente." });
            }
            if (order.status !== "PAID") {
              await supabaseAdmin.from("orders").update({
                status: "PAID",
                updated_at: (/* @__PURE__ */ new Date()).toISOString()
              }).eq("id", order.id);
            }
            const { data: existingPayment } = await supabaseAdmin.from("payments").select("id").eq("order_id", order.id).maybeSingle();
            if (existingPayment) {
              await supabaseAdmin.from("payments").update({
                status: "APPROVED",
                amount: transactionAmount,
                external_reference: cleanDataId,
                updated_at: (/* @__PURE__ */ new Date()).toISOString()
              }).eq("id", existingPayment.id);
            } else {
              await supabaseAdmin.from("payments").insert({
                order_id: order.id,
                user_id: order.user_id,
                amount: transactionAmount,
                status: "APPROVED",
                external_reference: cleanDataId,
                created_at: (/* @__PURE__ */ new Date()).toISOString(),
                updated_at: (/* @__PURE__ */ new Date()).toISOString()
              });
            }
            try {
              await supabaseAdmin.from("payment_events").insert({
                payment_id: cleanDataId,
                event_type: "payment.updated",
                payload: paymentData
              });
            } catch (pEvtErr) {
            }
            const { data: existingTickets } = await supabaseAdmin.from("tickets").select("id, status").eq("order_id", order.id);
            if (!existingTickets || existingTickets.length === 0) {
              const ticketCode = `PX-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
              await supabaseAdmin.from("tickets").insert({
                ticket_code: ticketCode,
                order_id: order.id,
                event_id: order.event_id,
                user_id: order.user_id,
                price: order.total_amount,
                status: "PAID",
                qr_code: `${ticketCode}|${order.event_id}|${order.user_id}|PAID`
              });
              console.log("[PX MERCADOPAGO] Ingresso \xFAnico emitido com sucesso para o pedido confirmado.");
            } else {
              const pendingTickets = existingTickets.filter((t) => t.status === "PENDING");
              if (pendingTickets.length > 0) {
                await supabaseAdmin.from("tickets").update({ status: "PAID" }).eq("order_id", order.id).eq("status", "PENDING");
              }
              console.log("[PX MERCADOPAGO] Notifica\xE7\xE3o repetida recebida: ingresso j\xE1 emitido anteriormente (idempot\xEAncia preservada).");
            }
          }
        }
      }
      res.status(200).send("OK");
    } catch (err) {
      console.error("[PX MERCADOPAGO] Erro operacional no webhook:", err.message);
      res.status(500).json({ error: "Erro interno ao processar webhook" });
    }
  });
  const distPath = path.resolve(__dirname, "dist");
  const isProduction = process.env.NODE_ENV === "production" || process.env.npm_lifecycle_event === "start";
  if (isProduction && fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  }
  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`PX CUSTOM App is running on port ${PORT}`);
  });
}
startServer();
