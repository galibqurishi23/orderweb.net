-- Complete tenant database schema creation script
-- This creates a tenant database with all required business tables

CREATE DATABASE IF NOT EXISTS `dinedesk_{TENANT_SLUG}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `dinedesk_{TENANT_SLUG}`;

-- Create all tenant business tables with proper constraints
-- Note: We don't create system tables like 'tenants', 'super_admin_users', etc. that belong in main DB

-- Categories table
CREATE TABLE IF NOT EXISTS `categories` (
  `id` varchar(255) NOT NULL,
  `tenant_id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `active` tinyint(1) DEFAULT 1,
  `display_order` int(11) DEFAULT 0,
  `parent_id` varchar(255) DEFAULT NULL,
  `image_url` text DEFAULT NULL,
  `icon` varchar(100) DEFAULT NULL,
  `color` varchar(7) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_tenant_id` (`tenant_id`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_display_order` (`display_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Customers table
CREATE TABLE IF NOT EXISTS `customers` (
  `id` varchar(255) NOT NULL,
  `tenant_id` varchar(255) NOT NULL,
  `first_name` varchar(255) NOT NULL,
  `last_name` varchar(255) DEFAULT '',
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `date_of_birth` date DEFAULT NULL,
  `address` text DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `postal_code` varchar(20) DEFAULT NULL,
  `preferences` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `customer_segment` varchar(50) DEFAULT 'regular',
  `marketing_consent` tinyint(1) DEFAULT 0,
  `last_order_date` datetime DEFAULT NULL,
  `total_orders` int(11) DEFAULT 0,
  `total_spent` decimal(10,2) DEFAULT 0.00,
  `average_order_value` decimal(10,2) DEFAULT 0.00,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_email_per_tenant` (`tenant_id`,`email`),
  UNIQUE KEY `unique_phone_per_tenant` (`tenant_id`,`phone`),
  KEY `idx_customers_tenant_id` (`tenant_id`),
  KEY `idx_customer_segments` (`customer_segment`),
  KEY `idx_customer_last_order` (`last_order_date`),
  KEY `idx_customers_email_tenant` (`email`,`tenant_id`),
  KEY `idx_customers_last_login` (`updated_at`),
  KEY `idx_customers_phone_tenant` (`phone`,`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Menu Items table
CREATE TABLE IF NOT EXISTS `menu_items` (
  `id` varchar(255) NOT NULL,
  `tenant_id` varchar(255) NOT NULL,
  `category_id` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `image_url` text DEFAULT NULL,
  `image_hint` varchar(255) DEFAULT NULL,
  `available` tinyint(1) DEFAULT 1,
  `is_featured` tinyint(1) DEFAULT 0,
  `is_set_menu` tinyint(1) DEFAULT 0,
  `preparation_time` int(11) DEFAULT 15,
  `display_order` int(11) DEFAULT 0,
  `addons` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`addons`)),
  `characteristics` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`characteristics`)),
  `nutrition` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`nutrition`)),
  `set_menu_items` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`set_menu_items`)),
  `smart_set_menu_config` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`smart_set_menu_config`)),
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tags`)),
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `vat_rate` decimal(5,2) DEFAULT 20.00 COMMENT 'VAT rate as percentage (e.g., 20.00 for 20%)',
  `vat_type` enum('simple','mixed') DEFAULT 'simple' COMMENT 'Simple items have single VAT rate, mixed items have components',
  `is_vat_exempt` tinyint(1) DEFAULT 0 COMMENT 'True if item is VAT exempt (0% rate)',
  `vat_notes` text DEFAULT NULL COMMENT 'Admin notes about VAT classification for this item',
  PRIMARY KEY (`id`),
  KEY `idx_tenant_id` (`tenant_id`),
  KEY `idx_category_id` (`category_id`),
  KEY `idx_available` (`available`),
  KEY `idx_featured` (`is_featured`),
  KEY `idx_menu_items_vat_type` (`vat_type`),
  KEY `idx_menu_items_vat_rate` (`vat_rate`),
  KEY `idx_menu_items_vat_exempt` (`is_vat_exempt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Orders table
CREATE TABLE IF NOT EXISTS `orders` (
  `id` varchar(255) NOT NULL,
  `tenant_id` varchar(255) NOT NULL,
  `createdAt` timestamp NULL DEFAULT current_timestamp(),
  `customerName` varchar(255) DEFAULT NULL,
  `customerPhone` varchar(50) DEFAULT NULL,
  `customerEmail` varchar(255) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `total` decimal(10,2) NOT NULL,
  `status` enum('confirmed','cancelled') NOT NULL,
  `orderType` enum('delivery','pickup','advance','collection') NOT NULL,
  `isAdvanceOrder` tinyint(1) DEFAULT 0,
  `scheduledTime` datetime DEFAULT NULL,
  `subtotal` decimal(10,2) NOT NULL,
  `deliveryFee` decimal(10,2) NOT NULL,
  `discount` decimal(10,2) DEFAULT 0.00,
  `tax` decimal(10,2) NOT NULL,
  `voucherCode` varchar(255) DEFAULT NULL,
  `printed` tinyint(1) DEFAULT 0,
  `customerId` varchar(255) DEFAULT NULL,
  `paymentMethod` enum('cash','card','voucher') DEFAULT 'cash',
  `specialInstructions` text DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `orderNumber` varchar(20) DEFAULT NULL,
  `delivery_type` enum('collection','email','delivery_normal','delivery_express') DEFAULT 'collection',
  `delivery_fee` decimal(10,2) DEFAULT 0.00,
  `delivery_address` text DEFAULT NULL,
  `stripe_payment_intent_id` varchar(255) DEFAULT NULL,
  `stripe_charge_id` varchar(255) DEFAULT NULL,
  `delivery_name` varchar(255) DEFAULT NULL,
  `delivery_phone` varchar(20) DEFAULT NULL,
  `delivery_street` varchar(255) DEFAULT NULL,
  `delivery_city` varchar(100) DEFAULT NULL,
  `delivery_postcode` varchar(20) DEFAULT NULL,
  `delivery_notes` text DEFAULT NULL,
  `total_vat_amount` decimal(10,2) DEFAULT 0.00,
  `has_mixed_items` tinyint(1) DEFAULT 0,
  `hmrc_compliant` tinyint(1) DEFAULT 1,
  `vat_info` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`vat_info`)),
  PRIMARY KEY (`id`),
  UNIQUE KEY `orderNumber` (`orderNumber`),
  UNIQUE KEY `unique_order_number` (`orderNumber`),
  KEY `customerId` (`customerId`),
  KEY `idx_orders_tenant_id` (`tenant_id`),
  KEY `idx_orders_status` (`status`),
  KEY `idx_orders_created_at` (`createdAt`),
  KEY `idx_orders_order_number` (`orderNumber`),
  KEY `idx_orders_delivery_type` (`delivery_type`),
  KEY `idx_orders_tenant_status` (`tenant_id`,`status`),
  KEY `idx_orders_total_vat_amount` (`total_vat_amount`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Order Items table
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(255) NOT NULL,
  `orderId` varchar(255) NOT NULL,
  `menuItemId` varchar(255) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `price` decimal(10,2) DEFAULT NULL,
  `quantity` int(11) NOT NULL,
  `selectedAddons` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`selectedAddons`)),
  `specialInstructions` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `is_mixed_item` tinyint(1) DEFAULT 0,
  `total_vat_amount` decimal(10,2) DEFAULT 0.00,
  `vat_info` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`vat_info`)),
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `orderId` (`orderId`),
  KEY `menuItemId` (`menuItemId`),
  KEY `idx_order_items_is_mixed_item` (`is_mixed_item`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tenant Settings table
CREATE TABLE IF NOT EXISTS `tenant_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(255) NOT NULL,
  `settings_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`settings_json`)),
  `global_payments_app_id` varchar(255) DEFAULT NULL,
  `global_payments_app_key` varchar(255) DEFAULT NULL,
  `global_payments_environment` varchar(50) DEFAULT 'sandbox',
  `global_payments_merchant_id` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `stripe_publishable_key` varchar(255) DEFAULT NULL,
  `stripe_secret_key` varchar(255) DEFAULT NULL,
  `stripe_mode` enum('test','live') DEFAULT 'test',
  `active_payment_gateway` enum('stripe','global_payments') DEFAULT 'stripe',
  PRIMARY KEY (`id`),
  UNIQUE KEY `tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Email Templates table
CREATE TABLE IF NOT EXISTS `email_templates` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `tenant_slug` varchar(255) NOT NULL,
  `template_name` varchar(100) NOT NULL,
  `template_type` varchar(50) NOT NULL,
  `subject` varchar(500) NOT NULL,
  `html_content` longtext DEFAULT NULL,
  `text_content` longtext DEFAULT NULL,
  `variables` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`variables`)),
  `customization` longtext DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `is_default` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `logo_url` varchar(500) DEFAULT NULL,
  `primary_color` varchar(7) DEFAULT '#3b82f6',
  `secondary_color` varchar(7) DEFAULT '#64748b',
  `background_color` varchar(7) DEFAULT '#ffffff',
  `text_color` varchar(7) DEFAULT '#1f2937',
  `facebook_url` varchar(500) DEFAULT NULL,
  `instagram_url` varchar(500) DEFAULT NULL,
  `tiktok_url` varchar(500) DEFAULT NULL,
  `website_url` varchar(500) DEFAULT NULL,
  `from_name` varchar(255) DEFAULT NULL,
  `from_email` varchar(255) DEFAULT NULL,
  `reply_to_email` varchar(255) DEFAULT NULL,
  `icon_color` varchar(7) DEFAULT '#666666',
  `enable_social_icons` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_tenant_template_type` (`tenant_slug`,`template_type`,`template_name`),
  KEY `idx_email_templates_tenant` (`tenant_slug`),
  KEY `idx_email_templates_type` (`template_type`),
  KEY `idx_email_templates_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Loyalty system tables
CREATE TABLE IF NOT EXISTS `customer_loyalty` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(255) NOT NULL,
  `customer_id` varchar(255) NOT NULL,
  `points_balance` int(11) DEFAULT 0,
  `total_earned` int(11) DEFAULT 0,
  `total_redeemed` int(11) DEFAULT 0,
  `tier` varchar(50) DEFAULT 'bronze',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_tenant_customer` (`tenant_id`,`customer_id`),
  KEY `idx_loyalty_tenant` (`tenant_id`),
  KEY `idx_loyalty_customer` (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `customer_loyalty_points` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(255) NOT NULL,
  `customer_id` varchar(255) NOT NULL,
  `points_balance` int(11) DEFAULT 0,
  `total_earned` int(11) DEFAULT 0,
  `total_redeemed` int(11) DEFAULT 0,
  `tier` varchar(50) DEFAULT 'bronze',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_tenant_customer_loyalty` (`tenant_id`,`customer_id`),
  KEY `idx_loyalty_points_tenant` (`tenant_id`),
  KEY `idx_loyalty_points_customer` (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `loyalty_transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(255) NOT NULL,
  `customer_id` varchar(255) NOT NULL,
  `type` enum('earned','redeemed','adjusted','expired') NOT NULL,
  `points` int(11) NOT NULL,
  `order_id` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_loyalty_trans_tenant` (`tenant_id`),
  KEY `idx_loyalty_trans_customer` (`customer_id`),
  KEY `idx_loyalty_trans_order` (`order_id`),
  KEY `idx_loyalty_trans_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `loyalty_program_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(255) NOT NULL,
  `points_per_pound` decimal(5,2) DEFAULT 1.00,
  `minimum_redemption` int(11) DEFAULT 100,
  `redemption_value` decimal(5,2) DEFAULT 0.01,
  `enabled` tinyint(1) DEFAULT 1,
  `tiers` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tiers`)),
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- POS Integration tables
CREATE TABLE IF NOT EXISTS `pos_daily_reports` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL,
  `report_date` date NOT NULL,
  `total_sales` decimal(10,2) DEFAULT 0.00,
  `total_orders` int(11) DEFAULT 0,
  `cash_sales` decimal(10,2) DEFAULT 0.00,
  `card_sales` decimal(10,2) DEFAULT 0.00,
  `gift_card_sales` decimal(10,2) DEFAULT 0.00,
  `online_sales` decimal(10,2) DEFAULT 0.00,
  `discounts` decimal(10,2) DEFAULT 0.00,
  `refunds` decimal(10,2) DEFAULT 0.00,
  `net_sales` decimal(10,2) DEFAULT 0.00,
  `top_items` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`top_items`)),
  `busy_hours` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`busy_hours`)),
  `staff_shifts` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`staff_shifts`)),
  `notes` text DEFAULT NULL,
  `uploaded_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_tenant_date` (`tenant_id`,`report_date`),
  KEY `idx_report_date` (`report_date`),
  KEY `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `pos_sync_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `event_type` varchar(50) NOT NULL,
  `event_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`event_data`)),
  `status` enum('success','failed','received','broadcast') DEFAULT 'success',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_event_type` (`event_type`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Phone number lookup and loyalty tables for POS integration
CREATE TABLE IF NOT EXISTS `loyalty_phone_lookup` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(255) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `normalized_phone` varchar(20) NOT NULL,
  `customer_id` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_tenant_normalized_phone` (`tenant_id`,`normalized_phone`),
  KEY `idx_tenant_phone` (`tenant_id`,`phone`),
  KEY `idx_customer_id` (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `loyalty_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(255) NOT NULL,
  `points_per_pound_spent` decimal(5,2) DEFAULT 1.00,
  `pounds_per_point_redeemed` decimal(5,2) DEFAULT 0.01,
  `minimum_points_to_redeem` int(11) DEFAULT 100,
  `maximum_redemption_percentage` decimal(5,2) DEFAULT 50.00,
  `points_expiry_days` int(11) DEFAULT NULL,
  `welcome_bonus_points` int(11) DEFAULT 0,
  `birthday_bonus_points` int(11) DEFAULT 0,
  `referral_bonus_points` int(11) DEFAULT 0,
  `enabled` tinyint(1) DEFAULT 1,
  `pos_integration_enabled` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `phone_loyalty_transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(255) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `normalized_phone` varchar(20) NOT NULL,
  `transaction_type` enum('earn','redeem','adjust','expire') NOT NULL,
  `points` int(11) NOT NULL,
  `order_total` decimal(10,2) DEFAULT NULL,
  `pos_transaction_id` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `balance_after` int(11) NOT NULL,
  `processed` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_tenant_phone` (`tenant_id`,`normalized_phone`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_pos_transaction` (`pos_transaction_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `pos_loyalty_transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(255) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `normalized_phone` varchar(20) NOT NULL,
  `transaction_type` enum('earn','redeem','adjust') NOT NULL,
  `points` int(11) NOT NULL,
  `order_total` decimal(10,2) DEFAULT NULL,
  `pos_transaction_id` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `balance_after` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_tenant_phone_pos` (`tenant_id`,`normalized_phone`),
  KEY `idx_pos_transaction_pos` (`pos_transaction_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Test tables (can be removed in production)
CREATE TABLE IF NOT EXISTS `test_phone_loyalty` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `phone` varchar(20) NOT NULL,
  `normalized_phone` varchar(20) NOT NULL,
  `points_balance` int(11) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `normalized_phone` (`normalized_phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Note: We don't add foreign key constraints in tenant databases to avoid 
-- dependencies on tables that don't exist (like 'tenants' table which is in main DB)

-- ========================================
-- POS INTEGRATION SYSTEM (Phase 1 & 2)
-- ========================================

-- Add POS print status tracking columns to orders table
ALTER TABLE `orders` 
ADD COLUMN IF NOT EXISTS `print_status` VARCHAR(20) DEFAULT 'pending' COMMENT 'pending, sent_to_pos, printed, failed',
ADD COLUMN IF NOT EXISTS `print_status_updated_at` DATETIME NULL,
ADD COLUMN IF NOT EXISTS `last_pos_device_id` VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS `last_print_error` TEXT NULL,
ADD COLUMN IF NOT EXISTS `websocket_sent` BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS `websocket_sent_at` DATETIME NULL;

-- Add index for print status queries
ALTER TABLE `orders` 
ADD INDEX IF NOT EXISTS `idx_orders_print_status` (`tenant_id`, `print_status`, `createdAt`);

-- Update existing orders to have print_status if they don't
UPDATE `orders` SET `print_status` = 'pending' WHERE `print_status` IS NULL;

-- POS Devices table for per-device tracking and authentication
CREATE TABLE IF NOT EXISTS `pos_devices` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(255) NOT NULL,
  `device_id` VARCHAR(50) UNIQUE NOT NULL,
  `device_name` VARCHAR(100),
  `api_key` VARCHAR(100) UNIQUE NOT NULL,
  `is_active` BOOLEAN DEFAULT TRUE,
  `last_seen_at` DATETIME,
  `last_heartbeat_at` DATETIME,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_pos_devices_tenant` (`tenant_id`),
  INDEX `idx_pos_devices_api_key` (`api_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- End of POS Integration System