import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST() {
  try {
    console.log('Creating loyalty tables...');
    
    // Create customer_loyalty table
    await db.query(`
      CREATE TABLE IF NOT EXISTS customer_loyalty (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id VARCHAR(255) NOT NULL UNIQUE,
        points_balance INT DEFAULT 0,
        tier_level ENUM('bronze', 'silver', 'gold', 'platinum') DEFAULT 'bronze',
        total_points_earned INT DEFAULT 0,
        total_points_redeemed INT DEFAULT 0,
        next_tier_points INT DEFAULT 500,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_customer_id (customer_id),
        INDEX idx_tier_level (tier_level)
      )
    `);
    
    // Create loyalty_transactions table
    await db.query(`
      CREATE TABLE IF NOT EXISTS loyalty_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id VARCHAR(255) NOT NULL,
        transaction_type ENUM('earned', 'redeemed', 'expired', 'adjusted') NOT NULL,
        points INT NOT NULL,
        reason TEXT,
        admin_action BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_customer_id (customer_id),
        INDEX idx_transaction_type (transaction_type),
        INDEX idx_created_at (created_at)
      )
    `);
    
    return NextResponse.json({
      success: true,
      message: 'Loyalty tables created successfully'
    });
    
  } catch (error) {
    console.error('Error creating loyalty tables:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create loyalty tables',
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}
