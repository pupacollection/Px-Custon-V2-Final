-- ==============================================================================
-- PX CUSTOM — SCHEMA DDL MYSQL 8.0+ / MARIADB 10.5+ (HOMOLOGAÇÃO ISOLADA)
-- Arquivo: migrations/mysql-homolog-schema.sql
-- Versão: 2.0 (Auditado e reconciliado com o código ativo: server.ts, api.ts, mappers.ts)
-- Finalidade: Criação estrita da estrutura relacional InnoDB para testes
--             e homologação controlada, sem qualquer impacto no ambiente ativo.
-- Codificação: utf8mb4 / Collation: utf8mb4_unicode_ci
-- ==============================================================================

-- Desativa temporariamente checagem de chaves para permitir criação limpa e ordenada
SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- ------------------------------------------------------------------------------
-- 1. TABELA: profiles
-- Usuários do sistema (Compradores, operadores e administradores)
-- Suporta UUIDv4 do Supabase Auth no campo id (CHAR(36))
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `profiles` (
  `id` CHAR(36) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(255) DEFAULT NULL,
  `name` VARCHAR(255) DEFAULT NULL,
  `cpf` VARCHAR(20) DEFAULT NULL,
  `phone` VARCHAR(30) DEFAULT NULL,
  `city` VARCHAR(100) DEFAULT 'Manhuaçu',
  `state` VARCHAR(50) DEFAULT 'MG',
  `avatar_url` VARCHAR(500) DEFAULT NULL,
  `role` ENUM('USER', 'ADMIN', 'SUPER_ADMIN', 'CHECKIN_OPERATOR', 'FINANCE', 'SUPPORT', 'OPERATOR', 'OPERADOR', 'PORTARIA', 'STAFF') NOT NULL DEFAULT 'USER',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `is_admin` TINYINT(1) NOT NULL DEFAULT 0,
  `is_superadmin` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_profiles_email` (`email`),
  KEY `idx_profiles_cpf` (`cpf`),
  KEY `idx_profiles_role` (`role`),
  KEY `idx_profiles_is_admin` (`is_admin`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Perfis de usuários, operadores e equipe PX CUSTOM';

-- ------------------------------------------------------------------------------
-- 2. TABELA: admin_users
-- Controle e autorização de privilégios de operadores e equipe do PX CONTROL
-- Consultada diretamente em server.ts (/api/checkin/validate)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `admin_users` (
  `id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `role` VARCHAR(50) NOT NULL DEFAULT 'OPERATOR',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_admin_users_user_id` (`user_id`),
  KEY `idx_admin_users_role` (`role`),
  CONSTRAINT `fk_admin_users_user` FOREIGN KEY (`user_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Mapeamento de operadores e administradores do PX CONTROL';

-- ------------------------------------------------------------------------------
-- 3. TABELA: events
-- Eventos automotivos oficiais da PX CUSTOM
-- Reconciliada com: server.ts, api.ts e mappers.ts (name, banner_image, date_display)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `events` (
  `id` CHAR(36) NOT NULL,
  `slug` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `title` VARCHAR(255) DEFAULT NULL,
  `tagline` VARCHAR(255) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `date_badge` VARCHAR(50) NOT NULL DEFAULT 'EM BREVE',
  `date_display` VARCHAR(100) NOT NULL DEFAULT 'A definir',
  `time_display` VARCHAR(100) NOT NULL DEFAULT 'A definir',
  `date` DATE DEFAULT NULL,
  `time` VARCHAR(30) DEFAULT NULL,
  `end_date` DATE DEFAULT NULL,
  `end_time` VARCHAR(30) DEFAULT NULL,
  `location` VARCHAR(255) NOT NULL DEFAULT 'Parque de Exposições - Manhuaçu/MG',
  `location_name` VARCHAR(255) DEFAULT NULL,
  `location_address` VARCHAR(500) DEFAULT NULL,
  `city` VARCHAR(100) NOT NULL DEFAULT 'Manhuaçu',
  `state` VARCHAR(20) NOT NULL DEFAULT 'MG',
  `maps_url` VARCHAR(500) DEFAULT NULL,
  `banner_image` VARCHAR(500) DEFAULT NULL,
  `banner_url` VARCHAR(500) DEFAULT NULL,
  `logo_url` VARCHAR(500) DEFAULT NULL,
  `latitude` DECIMAL(10, 8) DEFAULT NULL,
  `longitude` DECIMAL(11, 8) DEFAULT NULL,
  `has_cars` TINYINT(1) NOT NULL DEFAULT 1,
  `has_motos` TINYINT(1) NOT NULL DEFAULT 1,
  `has_audio` TINYINT(1) NOT NULL DEFAULT 1,
  `has_food` TINYINT(1) NOT NULL DEFAULT 1,
  `status` ENUM('EM_BREVE', 'EM_ANDAMENTO', 'FINALIZADO', 'CANCELADO', 'DRAFT', 'PUBLISHED', 'OPEN', 'ACTIVE', 'PAUSED', 'FINISHED', 'COMPLETED') NOT NULL DEFAULT 'EM_BREVE',
  `is_featured` TINYINT(1) NOT NULL DEFAULT 0,
  `category` VARCHAR(50) DEFAULT 'ENCONTRO',
  `max_capacity` INT DEFAULT NULL,
  `organizer_name` VARCHAR(255) DEFAULT 'PX CUSTOM',
  `meta_title` VARCHAR(255) DEFAULT NULL,
  `meta_description` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_events_slug` (`slug`),
  KEY `idx_events_status` (`status`),
  KEY `idx_events_date` (`date`),
  KEY `idx_events_is_featured` (`is_featured`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Eventos oficiais PX CUSTOM';

-- ------------------------------------------------------------------------------
-- 4. TABELA: event_images
-- Galeria oficial e fotos dos eventos (Persistência real utilizada em api.ts)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `event_images` (
  `id` CHAR(36) NOT NULL,
  `event_id` CHAR(36) NOT NULL,
  `bucket` VARCHAR(50) NOT NULL DEFAULT 'events',
  `storage_path` VARCHAR(500) NOT NULL,
  `public_url` VARCHAR(500) NOT NULL,
  `image_url` VARCHAR(500) DEFAULT NULL,
  `file_name` VARCHAR(255) DEFAULT NULL,
  `mime_type` VARCHAR(100) DEFAULT NULL,
  `file_size` INT DEFAULT NULL,
  `display_order` INT NOT NULL DEFAULT 0,
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_primary` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_event_images_event_id` (`event_id`),
  KEY `idx_event_images_display_order` (`display_order`),
  CONSTRAINT `fk_event_images_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Imagens vinculadas a eventos (Storage/Galeria)';

-- ------------------------------------------------------------------------------
-- 5. TABELA: ticket_batches
-- Lotes de ingressos vinculados a um evento com controle de estoque e concorrência
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ticket_batches` (
  `id` CHAR(36) NOT NULL,
  `event_id` CHAR(36) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `original_price` DECIMAL(10,2) DEFAULT NULL,
  `total_quantity` INT NOT NULL DEFAULT 0,
  `quantity` INT NOT NULL DEFAULT 0,
  `sold_quantity` INT NOT NULL DEFAULT 0,
  `batch_number` INT NOT NULL DEFAULT 1,
  `available` TINYINT(1) NOT NULL DEFAULT 1,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `status` ENUM('ACTIVE', 'SOLD_OUT', 'INACTIVE', 'CLOSED') NOT NULL DEFAULT 'ACTIVE',
  `start_date` DATETIME DEFAULT NULL,
  `end_date` DATETIME DEFAULT NULL,
  `min_purchase` INT NOT NULL DEFAULT 1,
  `max_purchase` INT NOT NULL DEFAULT 10,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ticket_batches_event_id` (`event_id`),
  KEY `idx_ticket_batches_status` (`status`),
  KEY `idx_ticket_batches_is_active` (`is_active`),
  CONSTRAINT `fk_ticket_batches_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_batches_sold_lte_total` CHECK (`sold_quantity` <= `total_quantity`),
  CONSTRAINT `chk_batches_sold_non_neg` CHECK (`sold_quantity` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lotes e tipos de ingressos com controle concorrente de estoque';

-- ------------------------------------------------------------------------------
-- 6. TABELA: ticket_types
-- Compatibilidade legada consultada diretamente em server.ts e api.ts
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ticket_types` (
  `id` CHAR(36) NOT NULL,
  `event_id` CHAR(36) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `quantity` INT NOT NULL DEFAULT 0,
  `sold_quantity` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ticket_types_event_id` (`event_id`),
  CONSTRAINT `fk_ticket_types_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabela de compatibilidade de tipos de ingressos';

-- ------------------------------------------------------------------------------
-- 7. TABELA: orders
-- Pedidos gerados pelo checkout (/api/tickets/purchase)
-- Campos buyer_* permitidos como NULL no registro inicial de pedido pendente
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `orders` (
  `id` CHAR(36) NOT NULL,
  `code` VARCHAR(50) DEFAULT NULL,
  `external_reference` VARCHAR(100) DEFAULT NULL,
  `user_id` CHAR(36) DEFAULT NULL,
  `event_id` CHAR(36) NOT NULL,
  `ticket_batch_id` CHAR(36) DEFAULT NULL,
  `buyer_name` VARCHAR(255) DEFAULT NULL,
  `buyer_email` VARCHAR(255) DEFAULT NULL,
  `buyer_cpf` VARCHAR(20) DEFAULT NULL,
  `buyer_phone` VARCHAR(30) DEFAULT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `unit_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `subtotal` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `total_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `payment_method` ENUM('PIX', 'CREDIT_CARD', 'CARTAO', 'BOLETO') NOT NULL DEFAULT 'PIX',
  `payment_gateway` VARCHAR(50) NOT NULL DEFAULT 'MERCADO_PAGO',
  `payment_provider_id` VARCHAR(100) DEFAULT NULL,
  `mercadopago_payment_id` VARCHAR(100) DEFAULT NULL,
  `mercadopago_preference_id` VARCHAR(100) DEFAULT NULL,
  `status` ENUM('PENDING', 'PAID', 'CANCELLED', 'REFUNDED', 'EXPIRED', 'PENDENTE', 'PAGO', 'CANCELADO', 'ESTORNADO') NOT NULL DEFAULT 'PENDING',
  `qr_code` TEXT DEFAULT NULL,
  `qr_code_pix` TEXT DEFAULT NULL,
  `qr_code_base64` LONGTEXT DEFAULT NULL,
  `qr_code_pix_base64` LONGTEXT DEFAULT NULL,
  `ticket_code` VARCHAR(100) DEFAULT NULL,
  `expires_at` DATETIME DEFAULT NULL,
  `paid_at` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_orders_user_id` (`user_id`),
  KEY `idx_orders_event_id` (`event_id`),
  KEY `idx_orders_external_ref` (`external_reference`),
  KEY `idx_orders_ticket_batch_id` (`ticket_batch_id`),
  KEY `idx_orders_status` (`status`),
  KEY `idx_orders_payment_provider_id` (`payment_provider_id`),
  KEY `idx_orders_buyer_cpf` (`buyer_cpf`),
  KEY `idx_orders_buyer_email` (`buyer_email`),
  CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`) REFERENCES `profiles` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_orders_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_orders_ticket_batch` FOREIGN KEY (`ticket_batch_id`) REFERENCES `ticket_batches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Pedidos gerados pelo checkout com status de pagamento';

-- ------------------------------------------------------------------------------
-- 8. TABELA: order_items
-- Itens individuais discriminados em um pedido
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` CHAR(36) NOT NULL,
  `order_id` CHAR(36) NOT NULL,
  `batch_id` CHAR(36) DEFAULT NULL,
  `ticket_type_id` CHAR(36) DEFAULT NULL,
  `ticket_batch_id` CHAR(36) DEFAULT NULL,
  `ticket_type_name` VARCHAR(150) NOT NULL,
  `unit_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `quantity` INT NOT NULL DEFAULT 1,
  `subtotal` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order_items_order_id` (`order_id`),
  KEY `idx_order_items_batch_id` (`batch_id`),
  CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_order_items_batch` FOREIGN KEY (`batch_id`) REFERENCES `ticket_batches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Itens discriminados em pedidos';

-- ------------------------------------------------------------------------------
-- 9. TABELA: payments
-- Pagamentos gerados pelo checkout e confirmados pelo webhook do Mercado Pago
-- Utilizada em server.ts (linhas 332, 891, 931, 948)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payments` (
  `id` CHAR(36) NOT NULL,
  `order_id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) DEFAULT NULL,
  `amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'REFUNDED', 'PENDENTE', 'PAGO') NOT NULL DEFAULT 'PENDING',
  `payment_method` ENUM('PIX', 'CREDIT_CARD', 'CARTAO', 'BOLETO') NOT NULL DEFAULT 'PIX',
  `external_reference` VARCHAR(100) DEFAULT NULL,
  `payment_provider_id` VARCHAR(100) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_payments_order_id` (`order_id`),
  KEY `idx_payments_user_id` (`user_id`),
  KEY `idx_payments_external_ref` (`external_reference`),
  KEY `idx_payments_status` (`status`),
  CONSTRAINT `fk_payments_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_payments_user` FOREIGN KEY (`user_id`) REFERENCES `profiles` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Registros auditáveis de pagamentos vinculados a pedidos';

-- ------------------------------------------------------------------------------
-- 10. TABELA: tickets
-- Ingressos emitidos individualmente após aprovação do pagamento ou pré-emissão
-- Suporta emissão por ticket_code (server.ts) e dados cadastrais flexíveis
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `tickets` (
  `id` CHAR(36) NOT NULL,
  `ticket_code` VARCHAR(50) NOT NULL,
  `code` VARCHAR(50) DEFAULT NULL,
  `order_id` CHAR(36) DEFAULT NULL,
  `event_id` CHAR(36) NOT NULL,
  `batch_id` CHAR(36) DEFAULT NULL,
  `ticket_batch_id` CHAR(36) DEFAULT NULL,
  `ticket_type_id` CHAR(36) DEFAULT NULL,
  `user_id` CHAR(36) DEFAULT NULL,
  `buyer_name` VARCHAR(255) DEFAULT NULL,
  `buyer_email` VARCHAR(255) DEFAULT NULL,
  `buyer_cpf` VARCHAR(20) DEFAULT NULL,
  `buyer_phone` VARCHAR(30) DEFAULT NULL,
  `batch_name` VARCHAR(150) DEFAULT NULL,
  `ticket_type_name` VARCHAR(150) DEFAULT NULL,
  `vehicle_model` VARCHAR(100) DEFAULT NULL,
  `vehicle_plate` VARCHAR(20) DEFAULT NULL,
  `price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('PENDING', 'PAID', 'USED', 'CANCELLED', 'REFUNDED', 'EXPIRED', 'PENDENTE', 'PAGO', 'UTILIZADO', 'CANCELADO', 'ESTORNADO', 'VALID', 'ACTIVE', 'CHECKED_IN') NOT NULL DEFAULT 'PENDING',
  `qr_code` TEXT DEFAULT NULL,
  `qr_payload` TEXT DEFAULT NULL,
  `is_used` TINYINT(1) NOT NULL DEFAULT 0,
  `used_at` DATETIME DEFAULT NULL,
  `checked_in_at` DATETIME DEFAULT NULL,
  `checked_in_by` CHAR(36) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tickets_ticket_code` (`ticket_code`),
  KEY `idx_tickets_code` (`code`),
  KEY `idx_tickets_order_id` (`order_id`),
  KEY `idx_tickets_event_id` (`event_id`),
  KEY `idx_tickets_batch_id` (`batch_id`),
  KEY `idx_tickets_user_id` (`user_id`),
  KEY `idx_tickets_status` (`status`),
  KEY `idx_tickets_is_used` (`is_used`),
  KEY `idx_tickets_buyer_cpf` (`buyer_cpf`),
  CONSTRAINT `fk_tickets_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_tickets_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_tickets_batch` FOREIGN KEY (`batch_id`) REFERENCES `ticket_batches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_tickets_user` FOREIGN KEY (`user_id`) REFERENCES `profiles` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_tickets_operator` FOREIGN KEY (`checked_in_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Ingressos individuais emitidos com integridade e prevenção de reuso';

-- ------------------------------------------------------------------------------
-- 11. TABELA: checkins
-- Histórico e auditoria de validação na portaria pelo PX CONTROL
-- Compatível com JSON de device_info gravado em server.ts (/api/checkin/validate)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `checkins` (
  `id` CHAR(36) NOT NULL,
  `ticket_id` CHAR(36) NOT NULL,
  `ticket_code` VARCHAR(50) DEFAULT NULL,
  `event_id` CHAR(36) DEFAULT NULL,
  `operator_id` CHAR(36) DEFAULT NULL,
  `operator_name` VARCHAR(150) DEFAULT NULL,
  `attendee_name` VARCHAR(150) DEFAULT NULL,
  `batch_name` VARCHAR(100) DEFAULT NULL,
  `device_id` VARCHAR(100) DEFAULT NULL,
  `device_info` TEXT DEFAULT NULL,
  `ip_address` VARCHAR(50) DEFAULT NULL,
  `status` ENUM('CONFIRMADO', 'NEGADO', 'SUCCESS', 'ALREADY_USED', 'INVALID', 'CANCELLED', 'EVENT_MISMATCH', 'DENIED') NOT NULL DEFAULT 'CONFIRMADO',
  `validation_result` VARCHAR(50) DEFAULT 'VALID',
  `reason` TEXT DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_checkins_ticket_id` (`ticket_id`),
  KEY `idx_checkins_ticket_code` (`ticket_code`),
  KEY `idx_checkins_event_id` (`event_id`),
  KEY `idx_checkins_operator_id` (`operator_id`),
  KEY `idx_checkins_status` (`status`),
  KEY `idx_checkins_created_at` (`created_at`),
  CONSTRAINT `fk_checkins_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_checkins_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_checkins_operator` FOREIGN KEY (`operator_id`) REFERENCES `profiles` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Auditoria transacional de check-in na portaria';

-- ------------------------------------------------------------------------------
-- 12. TABELA: checkin_devices
-- Dispositivos autorizados para operação de portaria / scanner
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `checkin_devices` (
  `id` CHAR(36) NOT NULL,
  `device_identifier` VARCHAR(100) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `event_id` CHAR(36) DEFAULT NULL,
  `authorized_by` CHAR(36) DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `last_active_at` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_checkin_devices_identifier` (`device_identifier`),
  KEY `idx_checkin_devices_event_id` (`event_id`),
  KEY `idx_checkin_devices_authorized_by` (`authorized_by`),
  CONSTRAINT `fk_checkin_devices_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_checkin_devices_auth_by` FOREIGN KEY (`authorized_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Terminais e dispositivos móveis autorizados para check-in';

-- ------------------------------------------------------------------------------
-- 13. TABELA: payment_events
-- Log de webhooks recebidos do Mercado Pago para auditoria e idempotência
-- Utilizada em server.ts (linha 962: payment_id, event_type, payload)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payment_events` (
  `id` CHAR(36) NOT NULL,
  `order_id` CHAR(36) DEFAULT NULL,
  `payment_id` VARCHAR(100) DEFAULT NULL,
  `provider_payment_id` VARCHAR(100) DEFAULT NULL,
  `event_type` VARCHAR(100) NOT NULL,
  `action` VARCHAR(100) DEFAULT NULL,
  `payload` JSON DEFAULT NULL,
  `raw_payload` JSON DEFAULT NULL,
  `status` VARCHAR(50) DEFAULT NULL,
  `processed_at` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_payment_events_order_id` (`order_id`),
  KEY `idx_payment_events_payment_id` (`payment_id`),
  KEY `idx_payment_events_provider_pay_id` (`provider_payment_id`),
  KEY `idx_payment_events_event_type` (`event_type`),
  KEY `idx_payment_events_created_at` (`created_at`),
  CONSTRAINT `fk_payment_events_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Eventos brutos e webhooks do gateway Mercado Pago';

-- ------------------------------------------------------------------------------
-- 14. TABELA: vehicles
-- Veículos cadastrados pelos usuários na garagem do app
-- Reconciliada com: api.ts e mappers.ts (type, description, category, photos)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `vehicles` (
  `id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `type` ENUM('Carro', 'Moto', 'Caminhão', 'Outro') NOT NULL DEFAULT 'Carro',
  `model` VARCHAR(150) NOT NULL,
  `brand` VARCHAR(100) NOT NULL,
  `year` INT NOT NULL,
  `plate` VARCHAR(20) DEFAULT NULL,
  `color` VARCHAR(50) NOT NULL,
  `category` VARCHAR(50) DEFAULT 'Rebaixado',
  `description` TEXT DEFAULT NULL,
  `modifications` TEXT DEFAULT NULL,
  `photos` JSON DEFAULT NULL,
  `photo_url` VARCHAR(500) DEFAULT NULL,
  `is_approved` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_vehicles_user_id` (`user_id`),
  KEY `idx_vehicles_category` (`category`),
  KEY `idx_vehicles_is_approved` (`is_approved`),
  CONSTRAINT `fk_vehicles_user` FOREIGN KEY (`user_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Veículos de usuários e expositores em eventos';

-- ------------------------------------------------------------------------------
-- 15. TABELA: vehicle_images
-- Fotos adicionais dos veículos (Galeria da garagem)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `vehicle_images` (
  `id` CHAR(36) NOT NULL,
  `vehicle_id` CHAR(36) NOT NULL,
  `bucket` VARCHAR(50) NOT NULL DEFAULT 'vehicles',
  `storage_path` VARCHAR(500) NOT NULL,
  `public_url` VARCHAR(500) NOT NULL,
  `image_url` VARCHAR(500) DEFAULT NULL,
  `file_name` VARCHAR(255) DEFAULT NULL,
  `mime_type` VARCHAR(100) DEFAULT NULL,
  `file_size` INT DEFAULT NULL,
  `display_order` INT NOT NULL DEFAULT 0,
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_primary` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_vehicle_images_vehicle_id` (`vehicle_id`),
  CONSTRAINT `fk_vehicle_images_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Galeria de fotos dos veículos dos usuários';

-- ------------------------------------------------------------------------------
-- 16. TABELA: media_records
-- Registro unificado de mídias enviadas via /api/media/upload
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `media_records` (
  `id` CHAR(36) NOT NULL,
  `storage_path` VARCHAR(500) NOT NULL,
  `bucket` VARCHAR(50) NOT NULL DEFAULT 'events',
  `public_url` VARCHAR(500) NOT NULL,
  `resource_type` VARCHAR(50) NOT NULL,
  `resource_id` VARCHAR(100) DEFAULT NULL,
  `user_id` CHAR(36) DEFAULT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `mime_type` VARCHAR(100) NOT NULL,
  `file_size` INT DEFAULT NULL,
  `is_primary` TINYINT(1) NOT NULL DEFAULT 0,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_media_records_resource` (`resource_type`, `resource_id`),
  KEY `idx_media_records_user_id` (`user_id`),
  CONSTRAINT `fk_media_records_user` FOREIGN KEY (`user_id`) REFERENCES `profiles` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Registro unificado de uploads e mídias';

-- ------------------------------------------------------------------------------
-- 17. TABELA: notifications
-- Notificações do usuário no sistema (api.ts / server.ts)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `message` TEXT NOT NULL,
  `type` ENUM('INFO', 'SUCCESS', 'WARNING', 'ALERT') NOT NULL DEFAULT 'INFO',
  `read` TINYINT(1) NOT NULL DEFAULT 0,
  `action_url` VARCHAR(500) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notifications_user_id` (`user_id`),
  KEY `idx_notifications_read` (`read`),
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Notificações do usuário no sistema';

-- ------------------------------------------------------------------------------
-- 18. TABELA: audit_logs
-- Rastreabilidade de ações administrativas críticas no PX CONTROL
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) DEFAULT NULL,
  `admin_id` CHAR(36) DEFAULT NULL,
  `actor_id` CHAR(36) DEFAULT NULL,
  `action` VARCHAR(100) NOT NULL,
  `resource_type` VARCHAR(100) NOT NULL,
  `target_resource` VARCHAR(100) DEFAULT NULL,
  `resource_id` VARCHAR(100) DEFAULT NULL,
  `details` JSON DEFAULT NULL,
  `old_data` JSON DEFAULT NULL,
  `new_data` JSON DEFAULT NULL,
  `ip_address` VARCHAR(50) DEFAULT NULL,
  `user_agent` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_logs_user_id` (`user_id`),
  KEY `idx_audit_logs_action` (`action`),
  KEY `idx_audit_logs_resource` (`resource_type`, `resource_id`),
  KEY `idx_audit_logs_created_at` (`created_at`),
  CONSTRAINT `fk_audit_logs_user` FOREIGN KEY (`user_id`) REFERENCES `profiles` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Logs de auditoria e segurança operacional';

-- ------------------------------------------------------------------------------
-- 19. TABELA: event_registrations
-- Inscrições de veículos ou expositores em eventos PX CUSTOM
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `event_registrations` (
  `id` CHAR(36) NOT NULL,
  `event_id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `vehicle_id` CHAR(36) DEFAULT NULL,
  `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  `category` VARCHAR(50) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `approved_at` DATETIME DEFAULT NULL,
  `approved_by` CHAR(36) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_reg_event_user_veh` (`event_id`, `user_id`, `vehicle_id`),
  KEY `idx_registrations_event_id` (`event_id`),
  KEY `idx_registrations_user_id` (`user_id`),
  KEY `idx_registrations_vehicle_id` (`vehicle_id`),
  KEY `idx_registrations_status` (`status`),
  CONSTRAINT `fk_registrations_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_registrations_user` FOREIGN KEY (`user_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_registrations_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_registrations_appr_by` FOREIGN KEY (`approved_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Inscrições de expositores e veículos para áreas especiais';

-- ------------------------------------------------------------------------------
-- 20. TABELA: banners
-- Destaques e carrossel de topo da plataforma
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `banners` (
  `id` CHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `subtitle` VARCHAR(255) DEFAULT NULL,
  `image_url` VARCHAR(500) NOT NULL,
  `link_url` VARCHAR(500) DEFAULT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `event_id` CHAR(36) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_banners_is_active` (`is_active`),
  KEY `idx_banners_sort_order` (`sort_order`),
  KEY `idx_banners_event_id` (`event_id`),
  CONSTRAINT `fk_banners_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Banners promocionais e institucionais';

-- ------------------------------------------------------------------------------
-- 21. TABELA: news
-- Artigos, novidades do cenário e comunicados oficiais
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `news` (
  `id` CHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) DEFAULT NULL,
  `summary` TEXT DEFAULT NULL,
  `content` LONGTEXT NOT NULL,
  `image_url` VARCHAR(500) DEFAULT NULL,
  `author_id` CHAR(36) DEFAULT NULL,
  `author_name` VARCHAR(150) DEFAULT 'Equipe PX CUSTOM',
  `is_published` TINYINT(1) NOT NULL DEFAULT 1,
  `published_at` DATETIME DEFAULT NULL,
  `category` VARCHAR(50) DEFAULT 'GERAL',
  `views_count` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_news_slug` (`slug`),
  KEY `idx_news_is_published` (`is_published`),
  KEY `idx_news_published_at` (`published_at`),
  KEY `idx_news_author_id` (`author_id`),
  CONSTRAINT `fk_news_author` FOREIGN KEY (`author_id`) REFERENCES `profiles` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Notícias, matérias e comunicados oficiais';

-- ------------------------------------------------------------------------------
-- 22. TABELA: gallery
-- Fotos oficiais de eventos, projetos e encontros automotivos
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `gallery` (
  `id` CHAR(36) NOT NULL,
  `title` VARCHAR(255) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `image_url` VARCHAR(500) NOT NULL,
  `thumb_url` VARCHAR(500) DEFAULT NULL,
  `event_id` CHAR(36) DEFAULT NULL,
  `category` VARCHAR(50) DEFAULT 'EVENTOS',
  `is_featured` TINYINT(1) NOT NULL DEFAULT 0,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_gallery_event_id` (`event_id`),
  KEY `idx_gallery_category` (`category`),
  KEY `idx_gallery_is_featured` (`is_featured`),
  CONSTRAINT `fk_gallery_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Galeria oficial de fotos PX CUSTOM';

-- ------------------------------------------------------------------------------
-- 23. TABELA: sponsors
-- Patrocinadores e apoiadores oficiais
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sponsors` (
  `id` CHAR(36) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `tier` ENUM('MASTER', 'GOLD', 'SILVER', 'BRONZE', 'APOIO') NOT NULL DEFAULT 'APOIO',
  `logo_url` VARCHAR(500) NOT NULL,
  `website_url` VARCHAR(500) DEFAULT NULL,
  `event_id` CHAR(36) DEFAULT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sponsors_tier` (`tier`),
  KEY `idx_sponsors_is_active` (`is_active`),
  KEY `idx_sponsors_event_id` (`event_id`),
  CONSTRAINT `fk_sponsors_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Patrocinadores e parceiros dos eventos';

-- ------------------------------------------------------------------------------
-- 24. TABELA: app_settings (site_settings)
-- Configurações globais de identidade visual, gateway e termos
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `app_settings` (
  `id` CHAR(36) NOT NULL,
  `key` VARCHAR(100) NOT NULL,
  `value` LONGTEXT DEFAULT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `is_secret` TINYINT(1) NOT NULL DEFAULT 0,
  `updated_by` CHAR(36) DEFAULT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_app_settings_key` (`key`),
  CONSTRAINT `fk_app_settings_user` FOREIGN KEY (`updated_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Configurações gerais e parâmetros da plataforma';

-- Restaura configurações de chaves e modo SQL
SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
