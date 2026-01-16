-- MySQL Migration: Create all required tables for MEDPLUS application
-- Excludes: users table
-- Generated from tableDefinitions.php

-- Core multi-tenancy tables
CREATE TABLE IF NOT EXISTS `companies` (
  `id` CHAR(36) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL UNIQUE,
  `email` VARCHAR(255),
  `phone` VARCHAR(50),
  `address` TEXT,
  `city` VARCHAR(100),
  `state` VARCHAR(100),
  `postal_code` VARCHAR(20),
  `country` VARCHAR(100),
  `website` VARCHAR(255),
  `logo_url` VARCHAR(500),
  `primary_color` VARCHAR(7) DEFAULT "#FF8C42",
  `status` VARCHAR(50) DEFAULT "active",
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `customers` (
  `id` CHAR(36) PRIMARY KEY,
  `company_id` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255),
  `phone` VARCHAR(50),
  `address` TEXT,
  `city` VARCHAR(100),
  `state` VARCHAR(100),
  `postal_code` VARCHAR(20),
  `country` VARCHAR(100),
  `tax_id` VARCHAR(50),
  `customer_number` VARCHAR(50),
  `status` VARCHAR(50) DEFAULT "active",
  `credit_limit` DECIMAL(15,2) DEFAULT 0,
  `is_supplier` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_customers_company_id` (`company_id`),
  INDEX `idx_customers_email` (`email`),
  INDEX `idx_customers_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `suppliers` (
  `id` CHAR(36) PRIMARY KEY,
  `company_id` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255),
  `phone` VARCHAR(50),
  `address` TEXT,
  `contact_person` VARCHAR(255),
  `payment_terms` VARCHAR(100),
  `status` VARCHAR(50) DEFAULT "active",
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_suppliers_company_id` (`company_id`),
  INDEX `idx_suppliers_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Products and Inventory
CREATE TABLE IF NOT EXISTS `product_categories` (
  `id` CHAR(36) PRIMARY KEY,
  `company_id` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_product_categories_company_id` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `products` (
  `id` CHAR(36) PRIMARY KEY,
  `company_id` CHAR(36) NOT NULL,
  `category_id` CHAR(36),
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `sku` VARCHAR(100) UNIQUE,
  `unit_of_measure` VARCHAR(50),
  `stock_quantity` DECIMAL(10,3) DEFAULT 0,
  `reorder_level` DECIMAL(10,3) DEFAULT 0,
  `unit_price` DECIMAL(15,2) NOT NULL,
  `cost_price` DECIMAL(15,2) DEFAULT 0,
  `status` VARCHAR(50) DEFAULT "active",
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_products_company_id` (`company_id`),
  INDEX `idx_products_category_id` (`category_id`),
  INDEX `idx_products_sku` (`sku`),
  INDEX `idx_products_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tax and Payments
CREATE TABLE IF NOT EXISTS `tax_settings` (
  `id` CHAR(36) PRIMARY KEY,
  `company_id` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `rate` DECIMAL(6,3) NOT NULL DEFAULT 0,
  `is_active` BOOLEAN DEFAULT TRUE,
  `is_default` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tax_settings_company_id` (`company_id`),
  INDEX `idx_tax_settings_active` (`company_id`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payment_methods` (
  `id` CHAR(36) PRIMARY KEY,
  `company_id` CHAR(36) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `description` TEXT,
  `icon_name` VARCHAR(50),
  `is_active` BOOLEAN DEFAULT TRUE,
  `sort_order` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_payment_methods_company_id` (`company_id`),
  INDEX `idx_payment_methods_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sales Documents
CREATE TABLE IF NOT EXISTS `quotations` (
  `id` CHAR(36) PRIMARY KEY,
  `company_id` CHAR(36) NOT NULL,
  `customer_id` CHAR(36) NOT NULL,
  `quotation_number` VARCHAR(100) UNIQUE NOT NULL,
  `quotation_date` DATE DEFAULT CURDATE(),
  `validity_date` DATE,
  `subtotal` DECIMAL(15,2) DEFAULT 0,
  `tax_amount` DECIMAL(15,2) DEFAULT 0,
  `total_amount` DECIMAL(15,2) DEFAULT 0,
  `notes` TEXT,
  `terms_and_conditions` TEXT,
  `status` VARCHAR(50) DEFAULT "draft",
  `created_by` CHAR(36),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_quotations_company_id` (`company_id`),
  INDEX `idx_quotations_customer_id` (`customer_id`),
  INDEX `idx_quotations_number` (`quotation_number`),
  INDEX `idx_quotations_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `quotation_items` (
  `id` CHAR(36) PRIMARY KEY,
  `quotation_id` CHAR(36) NOT NULL,
  `product_id` CHAR(36),
  `description` TEXT NOT NULL,
  `quantity` DECIMAL(10,3) NOT NULL,
  `unit_price` DECIMAL(15,2) NOT NULL,
  `tax_percentage` DECIMAL(5,2) DEFAULT 0,
  `tax_amount` DECIMAL(15,2) DEFAULT 0,
  `tax_inclusive` BOOLEAN DEFAULT FALSE,
  `tax_setting_id` CHAR(36),
  `line_total` DECIMAL(15,2) NOT NULL,
  `notes` TEXT,
  `sort_order` INT DEFAULT 0,
  INDEX `idx_quotation_items_quotation_id` (`quotation_id`),
  INDEX `idx_quotation_items_product_id` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `invoices` (
  `id` CHAR(36) PRIMARY KEY,
  `company_id` CHAR(36) NOT NULL,
  `customer_id` CHAR(36) NOT NULL,
  `quotation_id` CHAR(36),
  `invoice_number` VARCHAR(100) UNIQUE NOT NULL,
  `invoice_date` DATE DEFAULT CURDATE(),
  `due_date` DATE,
  `subtotal` DECIMAL(15,2) DEFAULT 0,
  `tax_amount` DECIMAL(15,2) DEFAULT 0,
  `total_amount` DECIMAL(15,2) DEFAULT 0,
  `paid_amount` DECIMAL(15,2) DEFAULT 0,
  `balance_due` DECIMAL(15,2) DEFAULT 0,
  `notes` TEXT,
  `terms_and_conditions` TEXT,
  `lpo_number` VARCHAR(255),
  `status` VARCHAR(50) DEFAULT "draft",
  `created_by` CHAR(36),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_invoices_company_id` (`company_id`),
  INDEX `idx_invoices_customer_id` (`customer_id`),
  INDEX `idx_invoices_number` (`invoice_number`),
  INDEX `idx_invoices_status` (`status`),
  INDEX `idx_invoices_due_date` (`due_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `invoice_items` (
  `id` CHAR(36) PRIMARY KEY,
  `invoice_id` CHAR(36) NOT NULL,
  `product_id` CHAR(36),
  `description` TEXT NOT NULL,
  `quantity` DECIMAL(10,3) NOT NULL,
  `unit_price` DECIMAL(15,2) NOT NULL,
  `tax_percentage` DECIMAL(5,2) DEFAULT 0,
  `tax_amount` DECIMAL(15,2) DEFAULT 0,
  `tax_inclusive` BOOLEAN DEFAULT FALSE,
  `discount_before_vat` DECIMAL(15,2) DEFAULT 0,
  `tax_setting_id` CHAR(36),
  `line_total` DECIMAL(15,2) NOT NULL,
  `notes` TEXT,
  `sort_order` INT DEFAULT 0,
  INDEX `idx_invoice_items_invoice_id` (`invoice_id`),
  INDEX `idx_invoice_items_product_id` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Proforma Invoices
CREATE TABLE IF NOT EXISTS `proforma_invoices` (
  `id` CHAR(36) PRIMARY KEY,
  `company_id` CHAR(36) NOT NULL,
  `customer_id` CHAR(36) NOT NULL,
  `proforma_number` VARCHAR(100) UNIQUE NOT NULL,
  `proforma_date` DATE DEFAULT CURDATE(),
  `subtotal` DECIMAL(15,2) DEFAULT 0,
  `tax_amount` DECIMAL(15,2) DEFAULT 0,
  `total_amount` DECIMAL(15,2) DEFAULT 0,
  `notes` TEXT,
  `terms_and_conditions` TEXT,
  `status` VARCHAR(50) DEFAULT "draft",
  `created_by` CHAR(36),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_proforma_invoices_company_id` (`company_id`),
  INDEX `idx_proforma_invoices_customer_id` (`customer_id`),
  INDEX `idx_proforma_invoices_number` (`proforma_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `proforma_items` (
  `id` CHAR(36) PRIMARY KEY,
  `proforma_id` CHAR(36) NOT NULL,
  `product_id` CHAR(36),
  `description` TEXT NOT NULL,
  `quantity` DECIMAL(10,3) NOT NULL,
  `unit_price` DECIMAL(15,2) NOT NULL,
  `tax_percentage` DECIMAL(5,2) DEFAULT 0,
  `tax_amount` DECIMAL(15,2) DEFAULT 0,
  `tax_inclusive` BOOLEAN DEFAULT FALSE,
  `tax_setting_id` CHAR(36),
  `line_total` DECIMAL(15,2) NOT NULL,
  `notes` TEXT,
  `sort_order` INT DEFAULT 0,
  INDEX `idx_proforma_items_proforma_id` (`proforma_id`),
  INDEX `idx_proforma_items_product_id` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Delivery Notes
CREATE TABLE IF NOT EXISTS `delivery_notes` (
  `id` CHAR(36) PRIMARY KEY,
  `company_id` CHAR(36) NOT NULL,
  `customer_id` CHAR(36) NOT NULL,
  `invoice_id` CHAR(36),
  `delivery_note_number` VARCHAR(100) UNIQUE NOT NULL,
  `delivery_date` DATE DEFAULT CURDATE(),
  `delivery_method` VARCHAR(50),
  `notes` TEXT,
  `status` VARCHAR(50) DEFAULT "draft",
  `created_by` CHAR(36),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_delivery_notes_company_id` (`company_id`),
  INDEX `idx_delivery_notes_customer_id` (`customer_id`),
  INDEX `idx_delivery_notes_invoice_id` (`invoice_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `delivery_note_items` (
  `id` CHAR(36) PRIMARY KEY,
  `delivery_note_id` CHAR(36) NOT NULL,
  `product_id` CHAR(36),
  `description` TEXT NOT NULL,
  `quantity` DECIMAL(10,3) NOT NULL,
  `unit_of_measure` VARCHAR(50) DEFAULT "pieces",
  `notes` TEXT,
  `sort_order` INT DEFAULT 0,
  INDEX `idx_delivery_note_items_delivery_note_id` (`delivery_note_id`),
  INDEX `idx_delivery_note_items_product_id` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Credit Notes
CREATE TABLE IF NOT EXISTS `credit_notes` (
  `id` CHAR(36) PRIMARY KEY,
  `company_id` CHAR(36) NOT NULL,
  `customer_id` CHAR(36) NOT NULL,
  `invoice_id` CHAR(36),
  `credit_note_number` VARCHAR(100) NOT NULL,
  `credit_note_date` DATE DEFAULT CURDATE(),
  `status` VARCHAR(50) DEFAULT "draft",
  `reason` TEXT,
  `subtotal` DECIMAL(15,2) DEFAULT 0,
  `tax_amount` DECIMAL(15,2) DEFAULT 0,
  `total_amount` DECIMAL(15,2) DEFAULT 0,
  `applied_amount` DECIMAL(15,2) DEFAULT 0,
  `balance` DECIMAL(15,2) DEFAULT 0,
  `affects_inventory` BOOLEAN DEFAULT FALSE,
  `notes` TEXT,
  `terms_and_conditions` TEXT,
  `created_by` CHAR(36),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_credit_notes_company_id` (`company_id`),
  INDEX `idx_credit_notes_customer_id` (`customer_id`),
  INDEX `idx_credit_notes_invoice_id` (`invoice_id`),
  INDEX `idx_credit_notes_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `credit_note_items` (
  `id` CHAR(36) PRIMARY KEY,
  `credit_note_id` CHAR(36) NOT NULL,
  `product_id` CHAR(36),
  `description` TEXT NOT NULL,
  `quantity` DECIMAL(10,3) DEFAULT 1,
  `unit_price` DECIMAL(15,2) DEFAULT 0,
  `tax_percentage` DECIMAL(5,2) DEFAULT 0,
  `tax_amount` DECIMAL(15,2) DEFAULT 0,
  `tax_inclusive` BOOLEAN DEFAULT FALSE,
  `tax_setting_id` CHAR(36),
  `line_total` DECIMAL(15,2) DEFAULT 0,
  `sort_order` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_credit_note_items_credit_note_id` (`credit_note_id`),
  INDEX `idx_credit_note_items_product_id` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `credit_note_allocations` (
  `id` CHAR(36) PRIMARY KEY,
  `credit_note_id` CHAR(36) NOT NULL,
  `invoice_id` CHAR(36) NOT NULL,
  `allocated_amount` DECIMAL(15,2) DEFAULT 0,
  `allocation_date` DATE DEFAULT CURDATE(),
  `notes` TEXT,
  `created_by` CHAR(36),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_credit_note_allocations_credit_note_id` (`credit_note_id`),
  INDEX `idx_credit_note_allocations_invoice_id` (`invoice_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payments
CREATE TABLE IF NOT EXISTS `payments` (
  `id` CHAR(36) PRIMARY KEY,
  `company_id` CHAR(36) NOT NULL,
  `invoice_id` CHAR(36),
  `payment_date` DATE DEFAULT CURDATE(),
  `payment_method` VARCHAR(50),
  `amount` DECIMAL(15,2) NOT NULL,
  `reference_number` VARCHAR(255),
  `notes` TEXT,
  `created_by` CHAR(36),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_payments_company_id` (`company_id`),
  INDEX `idx_payments_invoice_id` (`invoice_id`),
  INDEX `idx_payments_date` (`payment_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payment_allocations` (
  `id` CHAR(36) PRIMARY KEY,
  `payment_id` CHAR(36) NOT NULL,
  `invoice_id` CHAR(36) NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  INDEX `idx_payment_allocations_payment_id` (`payment_id`),
  INDEX `idx_payment_allocations_invoice_id` (`invoice_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payment_audit_log` (
  `id` CHAR(36) PRIMARY KEY,
  `action` VARCHAR(50) NOT NULL,
  `payment_id` CHAR(36) NOT NULL,
  `invoice_id` CHAR(36) NOT NULL,
  `old_paid_amount` DECIMAL(15,2),
  `new_paid_amount` DECIMAL(15,2),
  `old_balance_due` DECIMAL(15,2),
  `new_balance_due` DECIMAL(15,2),
  `old_status` VARCHAR(50),
  `new_status` VARCHAR(50),
  `payment_amount` DECIMAL(15,2) NOT NULL,
  `payment_method` VARCHAR(50),
  `reference_number` VARCHAR(255),
  `performed_by` CHAR(36),
  `notes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_payment_audit_log_payment_id` (`payment_id`),
  INDEX `idx_payment_audit_log_invoice_id` (`invoice_id`),
  INDEX `idx_payment_audit_log_action` (`action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Stock Management
CREATE TABLE IF NOT EXISTS `stock_movements` (
  `id` CHAR(36) PRIMARY KEY,
  `company_id` CHAR(36) NOT NULL,
  `product_id` CHAR(36) NOT NULL,
  `movement_type` VARCHAR(50) NOT NULL,
  `reference_type` VARCHAR(50),
  `reference_id` CHAR(36),
  `quantity` DECIMAL(10,3) NOT NULL,
  `cost_per_unit` DECIMAL(15,2),
  `notes` TEXT,
  `movement_date` DATE DEFAULT CURDATE(),
  `created_by` CHAR(36),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_stock_movements_company_id` (`company_id`),
  INDEX `idx_stock_movements_product_id` (`product_id`),
  INDEX `idx_stock_movements_reference` (`reference_type`, `reference_id`),
  INDEX `idx_stock_movements_date` (`movement_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- LPOs (Local Purchase Orders)
CREATE TABLE IF NOT EXISTS `lpos` (
  `id` CHAR(36) PRIMARY KEY,
  `company_id` CHAR(36) NOT NULL,
  `supplier_id` CHAR(36),
  `lpo_number` VARCHAR(100) UNIQUE NOT NULL,
  `lpo_date` DATE NOT NULL DEFAULT CURDATE(),
  `delivery_date` DATE,
  `status` ENUM("draft", "sent", "approved", "received", "cancelled") DEFAULT "draft",
  `subtotal` DECIMAL(15,2) DEFAULT 0,
  `tax_amount` DECIMAL(15,2) DEFAULT 0,
  `total_amount` DECIMAL(15,2) DEFAULT 0,
  `notes` TEXT,
  `terms_and_conditions` TEXT,
  `delivery_address` TEXT,
  `contact_person` VARCHAR(255),
  `contact_phone` VARCHAR(50),
  `created_by` CHAR(36),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_lpos_company_id` (`company_id`),
  INDEX `idx_lpos_supplier_id` (`supplier_id`),
  INDEX `idx_lpos_lpo_number` (`lpo_number`),
  INDEX `idx_lpos_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `lpo_items` (
  `id` CHAR(36) PRIMARY KEY,
  `lpo_id` CHAR(36) NOT NULL,
  `product_id` CHAR(36),
  `description` TEXT NOT NULL,
  `quantity` DECIMAL(10,3) NOT NULL,
  `unit_price` DECIMAL(15,2) NOT NULL,
  `unit_of_measure` VARCHAR(50) DEFAULT "pieces",
  `tax_rate` DECIMAL(5,2) DEFAULT 0,
  `tax_amount` DECIMAL(15,2) DEFAULT 0,
  `line_total` DECIMAL(15,2) NOT NULL,
  `notes` TEXT,
  `sort_order` INT DEFAULT 0,
  INDEX `idx_lpo_items_lpo_id` (`lpo_id`),
  INDEX `idx_lpo_items_product_id` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Remittance
CREATE TABLE IF NOT EXISTS `remittance_advice` (
  `id` CHAR(36) PRIMARY KEY,
  `company_id` CHAR(36) NOT NULL,
  `supplier_id` CHAR(36) NOT NULL,
  `remittance_number` VARCHAR(100) UNIQUE NOT NULL,
  `remittance_date` DATE DEFAULT CURDATE(),
  `total_amount` DECIMAL(15,2) DEFAULT 0,
  `payment_method` VARCHAR(50),
  `notes` TEXT,
  `created_by` CHAR(36),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_remittance_advice_company_id` (`company_id`),
  INDEX `idx_remittance_advice_supplier_id` (`supplier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `remittance_advice_items` (
  `id` CHAR(36) PRIMARY KEY,
  `remittance_id` CHAR(36) NOT NULL,
  `invoice_number` VARCHAR(100),
  `invoice_date` DATE,
  `amount` DECIMAL(15,2) NOT NULL,
  `tax_percentage` DECIMAL(5,2) DEFAULT 0,
  `tax_amount` DECIMAL(15,2) DEFAULT 0,
  `tax_inclusive` BOOLEAN DEFAULT FALSE,
  `notes` TEXT,
  `sort_order` INT DEFAULT 0,
  INDEX `idx_remittance_advice_items_remittance_id` (`remittance_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Web Store
CREATE TABLE IF NOT EXISTS `web_categories` (
  `id` CHAR(36) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL UNIQUE,
  `slug` VARCHAR(255) NOT NULL UNIQUE,
  `icon` VARCHAR(50),
  `description` TEXT,
  `display_order` INT DEFAULT 0,
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_web_categories_slug` (`slug`),
  INDEX `idx_web_categories_is_active` (`is_active`),
  INDEX `idx_web_categories_display_order` (`display_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `web_variants` (
  `id` CHAR(36) PRIMARY KEY,
  `category_id` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `sku` VARCHAR(100) NOT NULL UNIQUE,
  `slug` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `image_path` VARCHAR(500),
  `display_order` INT DEFAULT 0,
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_web_variants_category_id` (`category_id`),
  INDEX `idx_web_variants_slug` (`slug`),
  INDEX `idx_web_variants_sku` (`sku`),
  INDEX `idx_web_variants_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Users and Auth (excluding users table as requested)
CREATE TABLE IF NOT EXISTS `profiles` (
  `id` CHAR(36) PRIMARY KEY,
  `email` TEXT NOT NULL,
  `full_name` TEXT,
  `avatar_url` TEXT,
  `password_hash` VARCHAR(255),
  `role` ENUM("admin", "accountant", "stock_manager", "user", "super_admin") DEFAULT "user",
  `status` ENUM("active", "inactive", "pending") DEFAULT "pending",
  `phone` TEXT,
  `company_id` CHAR(36),
  `department` TEXT,
  `position` TEXT,
  `password` TEXT,
  `auth_user_id` CHAR(36),
  `invited_by` CHAR(36),
  `invited_at` TIMESTAMP,
  `last_login` TIMESTAMP,
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_profiles_company_id` (`company_id`),
  INDEX `idx_profiles_role` (`role`),
  INDEX `idx_profiles_status` (`status`),
  INDEX `idx_profiles_email` (`email`(100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_permissions` (
  `id` CHAR(36) PRIMARY KEY,
  `user_id` CHAR(36) NOT NULL,
  `permission_name` TEXT NOT NULL,
  `granted` BOOLEAN DEFAULT TRUE,
  `granted_by` CHAR(36),
  `granted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_user_permissions_user_id` (`user_id`),
  INDEX `idx_user_permissions_permission_name` (`permission_name`(100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_invitations` (
  `id` CHAR(36) PRIMARY KEY,
  `email` TEXT NOT NULL,
  `role` ENUM("admin", "accountant", "stock_manager", "user", "super_admin") DEFAULT "user",
  `company_id` CHAR(36) NOT NULL,
  `invited_by` CHAR(36),
  `invited_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `expires_at` TIMESTAMP DEFAULT (DATE_ADD(NOW(), INTERVAL 7 DAY)),
  `accepted_at` TIMESTAMP,
  `is_approved` BOOLEAN DEFAULT FALSE,
  `approved_by` CHAR(36),
  `approved_at` TIMESTAMP,
  `status` VARCHAR(50) DEFAULT "pending",
  `invitation_token` CHAR(36) DEFAULT (UUID()),
  INDEX `idx_user_invitations_email` (`email`(100)),
  INDEX `idx_user_invitations_company_id` (`company_id`),
  INDEX `idx_user_invitations_status` (`status`),
  INDEX `idx_user_invitations_is_approved` (`is_approved`),
  INDEX `idx_user_invitations_token` (`invitation_token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audit
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` CHAR(36) PRIMARY KEY,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `action` VARCHAR(50) NOT NULL,
  `entity_type` VARCHAR(100) NOT NULL,
  `record_id` CHAR(36),
  `company_id` CHAR(36),
  `actor_user_id` CHAR(36),
  `actor_email` TEXT,
  `details` JSON,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_audit_logs_created_at` (`created_at` DESC),
  INDEX `idx_audit_logs_company_id` (`company_id`),
  INDEX `idx_audit_logs_entity_type` (`entity_type`),
  INDEX `idx_audit_logs_action` (`action`),
  INDEX `idx_audit_logs_actor_user_id` (`actor_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `migration_logs` (
  `id` CHAR(36) PRIMARY KEY,
  `migration_name` VARCHAR(255) NOT NULL,
  `executed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `status` VARCHAR(50) DEFAULT "completed",
  `notes` TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Legacy tables (for backward compatibility with external API)
CREATE TABLE IF NOT EXISTS `contacts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255),
  `email` VARCHAR(255),
  `phone` VARCHAR(20),
  `subject` VARCHAR(255),
  `message` TEXT,
  `status` VARCHAR(50) DEFAULT "new",
  `reply_notes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `newsletter` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(255) UNIQUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `leads` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `business_name` VARCHAR(255),
  `contact_person` VARCHAR(255),
  `phone` VARCHAR(20),
  `email` VARCHAR(255),
  `business_category` VARCHAR(255),
  `location` VARCHAR(255),
  `website_url` VARCHAR(255),
  `website_status` VARCHAR(50),
  `lead_source` VARCHAR(50),
  `expressed_need` TEXT,
  `notes` TEXT,
  `status` VARCHAR(50),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `portfolios` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `admin_id` INT,
  `title` VARCHAR(255),
  `description` TEXT,
  `website_url` VARCHAR(255) UNIQUE,
  `screenshot_url` VARCHAR(255),
  `status` VARCHAR(50) DEFAULT "pending",
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `opportunities` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `source` VARCHAR(2048),
  `snippet` TEXT,
  `url` VARCHAR(2048),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `message` TEXT,
  `level` VARCHAR(50),
  `source` VARCHAR(255),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `chat_messages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT,
  `message` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `web_app_leads` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255),
  `email` VARCHAR(255),
  `phone` VARCHAR(20),
  `message` TEXT,
  `source` VARCHAR(255),
  `status` VARCHAR(50) DEFAULT "new",
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
