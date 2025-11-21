import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Updating billing table schema...');

    // Add missing columns to billing table
    const alterQueries = [
      `ALTER TABLE billing ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(255)`,
      `ALTER TABLE billing ADD COLUMN IF NOT EXISTS due_date DATE`,
      `ALTER TABLE billing ADD COLUMN IF NOT EXISTS description TEXT`,
      `ALTER TABLE billing ADD COLUMN IF NOT EXISTS is_custom_invoice BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE billing MODIFY COLUMN subscription_plan VARCHAR(50) DEFAULT 'starter'`,
      `ALTER TABLE billing MODIFY COLUMN billing_period_start DATETIME DEFAULT CURRENT_TIMESTAMP`,
      `ALTER TABLE billing MODIFY COLUMN billing_period_end DATETIME DEFAULT (DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 30 DAY))`
    ];

    for (const query of alterQueries) {
      try {
        await db.execute(query);
        console.log(`✅ Executed: ${query}`);
      } catch (error) {
        // Ignore "duplicate column" errors as they're expected if column already exists
        if (error instanceof Error && !error.message.includes('Duplicate column name')) {
          console.error(`❌ Error executing: ${query}`, error.message);
        } else {
          console.log(`ℹ️  Column already exists: ${query}`);
        }
      }
    }

    // Create invoice_line_items table
    try {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS invoice_line_items (
          id VARCHAR(255) PRIMARY KEY,
          invoice_id VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_invoice_id (invoice_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ Created invoice_line_items table');
    } catch (error) {
      console.log('ℹ️  invoice_line_items table already exists');
    }

    return NextResponse.json({
      success: true,
      message: 'Billing schema updated successfully'
    });

  } catch (error) {
    console.error('Schema update error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to update schema',
        success: false 
      },
      { status: 500 }
    );
  }
}