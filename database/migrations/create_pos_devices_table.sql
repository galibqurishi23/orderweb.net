-- Migration: Create POS Devices Table
-- Date: November 21, 2025
-- Purpose: Enable per-device authentication and tracking for POS systems

-- Create pos_devices table
CREATE TABLE IF NOT EXISTS pos_devices (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tenant_id VARCHAR(255) NOT NULL,
  device_id VARCHAR(50) UNIQUE NOT NULL,
  device_name VARCHAR(100),
  api_key VARCHAR(100) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_seen_at DATETIME,
  last_heartbeat_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_pos_devices_tenant (tenant_id),
  INDEX idx_pos_devices_api_key (api_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_pos_devices_tenant ON pos_devices(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_pos_devices_api_key ON pos_devices(api_key);
CREATE INDEX IF NOT EXISTS idx_pos_devices_last_seen ON pos_devices(last_seen_at);

-- Optional: Insert sample device for testing (COMMENT OUT in production)
-- Replace tenant_id with actual tenant ID from your database
-- Generate secure API key using: SELECT MD5(CONCAT(UUID(), NOW(), RAND()))
/*
INSERT INTO pos_devices (tenant_id, device_id, device_name, api_key, is_active) 
SELECT id, 'POS_MAIN_1', 'Main POS Device', CONCAT('pos_', MD5(CONCAT(UUID(), NOW()))), TRUE
FROM tenants 
WHERE slug = 'kitchen'
LIMIT 1;
*/

-- Note: Run this migration on all tenant databases
-- To generate API keys for existing tenants, use the admin endpoint: POST /api/admin/pos-devices/generate-key
