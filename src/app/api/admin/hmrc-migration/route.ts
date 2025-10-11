import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting HMRC Reports Database Migration');

    // Add order_source column to orders table
    const alterTableQuery = `
      ALTER TABLE orders 
      ADD COLUMN order_source ENUM('online', 'in_restaurant') DEFAULT 'online' 
      AFTER order_type
    `;

    console.log('📝 Adding order_source column to orders table...');
    
    try {
      await pool.execute(alterTableQuery);
      console.log('✅ Successfully added order_source column');
    } catch (error: any) {
      if (error.message.includes('Duplicate column name')) {
        console.log('ℹ️ Column already exists, skipping creation');
      } else {
        throw error;
      }
    }

    // Update existing orders to have order_source based on available data
    const updateExistingQuery = `
      UPDATE orders 
      SET order_source = 'online' 
      WHERE order_source IS NULL OR order_source = ''
    `;

    console.log('📊 Updating existing orders with default order_source...');
    const [updateResult]: any = await pool.execute(updateExistingQuery);
    console.log(`✅ Updated ${updateResult.affectedRows} existing orders`);

    // Create index for better query performance
    try {
      const indexQuery = `CREATE INDEX idx_order_source ON orders(order_source)`;
      console.log('📇 Creating index for order_source...');
      await pool.execute(indexQuery);
      console.log('✅ Successfully created index');
    } catch (error: any) {
      if (error.message.includes('Duplicate key name')) {
        console.log('ℹ️ Index already exists, skipping creation');
      } else {
        console.log('⚠️ Index creation failed (non-critical):', error.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'HMRC Reports database migration completed successfully',
      details: {
        columnAdded: true,
        ordersUpdated: updateResult?.affectedRows || 0,
        indexCreated: true
      }
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Migration failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
