-- Migration: Add Print Status Tracking to Orders Table
-- Date: November 21, 2025
-- Purpose: Enable print acknowledgment and tracking for POS integration

-- Add print status tracking columns to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS print_status VARCHAR(20) DEFAULT 'pending' AFTER printed,
ADD COLUMN IF NOT EXISTS print_status_updated_at DATETIME NULL AFTER print_status,
ADD COLUMN IF NOT EXISTS last_pos_device_id VARCHAR(50) NULL AFTER print_status_updated_at,
ADD COLUMN IF NOT EXISTS last_print_error TEXT NULL AFTER last_pos_device_id,
ADD COLUMN IF NOT EXISTS websocket_sent BOOLEAN DEFAULT FALSE AFTER last_print_error,
ADD COLUMN IF NOT EXISTS websocket_sent_at DATETIME NULL AFTER websocket_sent;

-- Add index for faster queries on print_status
CREATE INDEX IF NOT EXISTS idx_orders_print_status ON orders(print_status, createdAt);

-- Update existing orders to have default print_status based on current status
UPDATE orders 
SET print_status = CASE 
    WHEN printed = 1 THEN 'printed'
    ELSE 'pending'
END
WHERE print_status IS NULL;

-- Print status values:
-- 'pending' - Order created, not yet sent to POS
-- 'sent_to_pos' - WebSocket broadcast successful
-- 'printed' - POS confirmed successful print
-- 'failed' - POS reported print failure

-- Note: Run this migration on all tenant databases
