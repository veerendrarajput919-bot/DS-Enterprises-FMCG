-- ==========================================================================
-- DS ENTERPRISES — COMPLETE MYSQL DATABASE SCHEMA
-- File: backend/database/schema.sql
-- Database: ds_enterprises
-- ==========================================================================

CREATE DATABASE IF NOT EXISTS `ds_enterprises` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `ds_enterprises`;

-- 1. System Settings & Configuration (PIN, Roles)
CREATE TABLE IF NOT EXISTS `settings` (
  `setting_key` VARCHAR(64) PRIMARY KEY,
  `setting_value` TEXT NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `settings` (`setting_key`, `setting_value`) VALUES
('admin_pin', 'Admin@919'),
('company_name', 'DS Enterprises'),
('company_address', 'GT Road, Transport Nagar, Kanpur, UP'),
('company_gstin', '09AABCD1234E1Z5')
ON DUPLICATE KEY UPDATE `setting_key`=`setting_key`;

-- 2. Staff & Sales Officers Master Table (RBAC & Credentials)
CREATE TABLE IF NOT EXISTS `sales_officers` (
  `id` VARCHAR(32) PRIMARY KEY,
  `name` VARCHAR(128) NOT NULL,
  `user_id` VARCHAR(64) DEFAULT NULL,
  `password` VARCHAR(128) DEFAULT '1234',
  `phone` VARCHAR(32) NOT NULL,
  `route` VARCHAR(128) NOT NULL,
  `target` DECIMAL(12, 2) DEFAULT 300000.00,
  `role` VARCHAR(32) DEFAULT 'so',
  `permissions` TEXT DEFAULT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_so_role` (`role`),
  INDEX `idx_so_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Retail Stores & Kirana Outlets (Parties)
CREATE TABLE IF NOT EXISTS `parties` (
  `id` VARCHAR(32) PRIMARY KEY,
  `name` VARCHAR(191) NOT NULL,
  `contact_person` VARCHAR(128) DEFAULT NULL,
  `phone` VARCHAR(32) DEFAULT NULL,
  `route` VARCHAR(128) NOT NULL,
  `address` TEXT DEFAULT NULL,
  `city` VARCHAR(64) DEFAULT 'Kanpur',
  `category` VARCHAR(64) DEFAULT 'B - Retail Kirana',
  `credit_limit` DECIMAL(12, 2) DEFAULT 50000.00,
  `outstanding` DECIMAL(12, 2) DEFAULT 0.00,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_parties_route` (`route`),
  INDEX `idx_parties_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Warehouse FMCG Stock Catalog
CREATE TABLE IF NOT EXISTS `stock` (
  `code` VARCHAR(64) PRIMARY KEY,
  `name` VARCHAR(191) NOT NULL,
  `brand` VARCHAR(128) NOT NULL,
  `category` VARCHAR(128) NOT NULL,
  `current_stock` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `unit` VARCHAR(32) DEFAULT 'Pcs',
  `rate` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `mrp` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `min_stock` DECIMAL(10, 2) DEFAULT 50.00,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_stock_brand` (`brand`),
  INDEX `idx_stock_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Sales Transactions Ledger
CREATE TABLE IF NOT EXISTS `sales_invoices` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `invoice_no` VARCHAR(64) NOT NULL,
  `invoice_date` DATE NOT NULL,
  `party_name` VARCHAR(191) NOT NULL,
  `party_contact` VARCHAR(32) DEFAULT NULL,
  `item_name` VARCHAR(191) NOT NULL,
  `brand` VARCHAR(128) DEFAULT NULL,
  `category` VARCHAR(128) DEFAULT NULL,
  `route` VARCHAR(128) DEFAULT NULL,
  `city` VARCHAR(64) DEFAULT 'Kanpur',
  `qty` DECIMAL(10, 2) NOT NULL,
  `unit` VARCHAR(32) DEFAULT 'Pcs',
  `rate` DECIMAL(10, 2) NOT NULL,
  `mrp` DECIMAL(10, 2) DEFAULT 0.00,
  `amount` DECIMAL(12, 2) NOT NULL,
  `sales_person` VARCHAR(128) DEFAULT NULL,
  `so_id` VARCHAR(32) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_sales_date` (`invoice_date`),
  INDEX `idx_sales_party` (`party_name`),
  INDEX `idx_sales_route` (`route`),
  INDEX `idx_sales_brand` (`brand`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Punched Field Orders
CREATE TABLE IF NOT EXISTS `orders` (
  `id` VARCHAR(64) PRIMARY KEY,
  `bill_no` VARCHAR(64) DEFAULT NULL,
  `invoice_no` VARCHAR(64) DEFAULT NULL,
  `order_date` DATE NOT NULL,
  `order_datetime` DATETIME NOT NULL,
  `store_name` VARCHAR(191) NOT NULL,
  `party_id` VARCHAR(32) DEFAULT NULL,
  `location` TEXT DEFAULT NULL,
  `city` VARCHAR(64) DEFAULT 'Kanpur',
  `route` VARCHAR(128) DEFAULT NULL,
  `category` VARCHAR(64) DEFAULT 'Retail Kirana',
  `contact_person` VARCHAR(128) DEFAULT NULL,
  `contact_phone` VARCHAR(32) DEFAULT NULL,
  `sales_person` VARCHAR(128) DEFAULT NULL,
  `so_id` VARCHAR(32) DEFAULT NULL,
  `total_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `total_qty` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `status` VARCHAR(64) NOT NULL DEFAULT 'Pending',
  `payment_status` ENUM('Unpaid', 'Partial', 'Paid') NOT NULL DEFAULT 'Unpaid',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_orders_status` (`status`),
  INDEX `idx_orders_date` (`order_date`),
  INDEX `idx_orders_route` (`route`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Punched Order Line Items
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` VARCHAR(64) NOT NULL,
  `item_code` VARCHAR(64) DEFAULT NULL,
  `item_name` VARCHAR(191) NOT NULL,
  `brand` VARCHAR(128) DEFAULT NULL,
  `qty` DECIMAL(10, 2) NOT NULL,
  `unit` VARCHAR(32) DEFAULT 'Pcs',
  `price` DECIMAL(10, 2) NOT NULL,
  `total` DECIMAL(12, 2) NOT NULL,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Field Payment Collections Ledger
CREATE TABLE IF NOT EXISTS `payment_collections` (
  `id` VARCHAR(64) PRIMARY KEY,
  `collection_date` DATE NOT NULL,
  `collection_time` VARCHAR(16) DEFAULT NULL,
  `party_name` VARCHAR(191) NOT NULL,
  `phone` VARCHAR(32) DEFAULT NULL,
  `route` VARCHAR(128) DEFAULT NULL,
  `amount` DECIMAL(12, 2) NOT NULL,
  `payment_mode` ENUM('Cash', 'UPI', 'Cheque') NOT NULL DEFAULT 'Cash',
  `reference_no` VARCHAR(128) DEFAULT NULL,
  `collected_by` VARCHAR(128) DEFAULT NULL,
  `remarks` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_collections_date` (`collection_date`),
  INDEX `idx_collections_party` (`party_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Outstanding Receivables & Invoices
CREATE TABLE IF NOT EXISTS `outstanding_invoices` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `bill_no` VARCHAR(64) NOT NULL,
  `invoice_date` DATE NOT NULL,
  `party_name` VARCHAR(191) NOT NULL,
  `route` VARCHAR(128) DEFAULT NULL,
  `phone` VARCHAR(32) DEFAULT NULL,
  `total_amount` DECIMAL(12, 2) NOT NULL,
  `balance_amount` DECIMAL(12, 2) NOT NULL,
  `due_days` INT DEFAULT 0,
  `age_bucket` VARCHAR(32) DEFAULT '0-15 Days',
  `sales_person` VARCHAR(128) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_out_bucket` (`age_bucket`),
  INDEX `idx_out_party` (`party_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Number Sequences Generator (Atomic Unique Bill & Invoice Numbers)
CREATE TABLE IF NOT EXISTS `number_sequences` (
  `type` VARCHAR(32) PRIMARY KEY,
  `prefix` VARCHAR(32) NOT NULL,
  `year_format` VARCHAR(16) DEFAULT 'calendar',
  `current_year` VARCHAR(16) DEFAULT NULL,
  `current_number` INT NOT NULL DEFAULT 0,
  `padding` INT NOT NULL DEFAULT 4,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Bulk Excel Import Batches
CREATE TABLE IF NOT EXISTS `import_batches` (
  `id` VARCHAR(64) PRIMARY KEY,
  `batch_type` VARCHAR(32) DEFAULT 'bills',
  `file_name` VARCHAR(255) NOT NULL,
  `uploaded_by` VARCHAR(128) DEFAULT 'Admin',
  `mode` VARCHAR(32) DEFAULT 'insert_update',
  `total_rows` INT DEFAULT 0,
  `inserted_rows` INT DEFAULT 0,
  `updated_rows` INT DEFAULT 0,
  `unchanged_rows` INT DEFAULT 0,
  `failed_rows` INT DEFAULT 0,
  `status` VARCHAR(32) DEFAULT 'Success',
  `error_summary` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. System Audit Logs
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `action` VARCHAR(64) NOT NULL,
  `entity_type` VARCHAR(64) NOT NULL,
  `entity_id` VARCHAR(128) NOT NULL,
  `old_values` LONGTEXT DEFAULT NULL,
  `new_values` LONGTEXT DEFAULT NULL,
  `performed_by` VARCHAR(128) DEFAULT 'Admin',
  `batch_id` VARCHAR(64) DEFAULT NULL,
  `ip_address` VARCHAR(64) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_audit_entity` (`entity_type`, `entity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Order Status & Cancellation History
CREATE TABLE IF NOT EXISTS `order_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` VARCHAR(64) NOT NULL,
  `from_status` VARCHAR(64) DEFAULT NULL,
  `to_status` VARCHAR(64) NOT NULL,
  `changed_by` VARCHAR(128) DEFAULT NULL,
  `user_id` VARCHAR(64) DEFAULT NULL,
  `action_type` VARCHAR(32) DEFAULT 'status_change',
  `reason` VARCHAR(255) DEFAULT NULL,
  `remarks` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_order_hist_oid` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Delivery Routes Master
CREATE TABLE IF NOT EXISTS `delivery_routes` (
  `id` VARCHAR(64) PRIMARY KEY,
  `name` VARCHAR(128) NOT NULL,
  `area` VARCHAR(128) DEFAULT NULL,
  `default_delivery_person` VARCHAR(128) DEFAULT NULL,
  `delivery_person_id` VARCHAR(32) DEFAULT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Delivery Assignments & Route Sequence
CREATE TABLE IF NOT EXISTS `delivery_assignments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `route_id` VARCHAR(64) NOT NULL,
  `sequence` INT DEFAULT 1,
  `order_id` VARCHAR(64) DEFAULT NULL,
  `customer_id` VARCHAR(32) DEFAULT NULL,
  `customer_name` VARCHAR(191) NOT NULL,
  `address` TEXT DEFAULT NULL,
  `area` VARCHAR(128) DEFAULT NULL,
  `delivery_person` VARCHAR(128) NOT NULL,
  `delivery_person_id` VARCHAR(32) DEFAULT NULL,
  `assignment_date` DATE DEFAULT (CURRENT_DATE),
  `delivery_status` VARCHAR(32) DEFAULT 'Assigned',
  `import_batch_id` VARCHAR(64) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_deliv_route` (`route_id`),
  INDEX `idx_deliv_order` (`order_id`),
  INDEX `idx_deliv_date` (`assignment_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

