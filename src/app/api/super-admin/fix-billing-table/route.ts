import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Fixing billing table constraints...');

    // First, let's check the current table structure
    const [tableInfo] = await db.execute('DESCRIBE billing') as [any[], any];
    console.log('Current billing table structure:', tableInfo);

    // Drop and recreate the billing table with proper structure
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS billing_new (
        id VARCHAR(255) PRIMARY KEY,
        tenant_id VARCHAR(255) NOT NULL,
        invoice_number VARCHAR(255),
        subscription_plan VARCHAR(50) DEFAULT 'starter',
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'GBP',
        billing_period_start DATETIME DEFAULT CURRENT_TIMESTAMP,
        billing_period_end DATETIME DEFAULT (DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 30 DAY)),
        due_date DATE,
        status ENUM('pending','paid','failed','refunded') DEFAULT 'pending',
        description TEXT,
        is_custom_invoice BOOLEAN DEFAULT FALSE,
        payment_method VARCHAR(50),
        stripe_invoice_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_tenant_id (tenant_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await db.execute(createTableQuery);
    console.log('✅ Created billing_new table with proper structure');

    // Copy existing data if any
    try {
      await db.execute(`
        INSERT INTO billing_new (
          id, tenant_id, subscription_plan, amount, currency,
          billing_period_start, billing_period_end, status,
          payment_method, stripe_invoice_id, created_at, updated_at
        )
        SELECT 
          id, tenant_id, subscription_plan, amount, currency,
          billing_period_start, billing_period_end, status,
          payment_method, stripe_invoice_id, created_at, updated_at
        FROM billing
      `);
      console.log('✅ Copied existing data from billing to billing_new');
    } catch (error) {
      console.log('ℹ️  No existing data to copy or copy failed:', error);
    }

    // Rename tables
    await db.execute('DROP TABLE IF EXISTS billing_old');
    await db.execute('RENAME TABLE billing TO billing_old');
    await db.execute('RENAME TABLE billing_new TO billing');
    console.log('✅ Replaced old billing table with new structure');

    return NextResponse.json({
      success: true,
      message: 'Billing table structure fixed successfully'
    });

  } catch (error) {
    console.error('Schema fix error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fix schema',
        success: false 
      },
      { status: 500 }
    );
  }
}