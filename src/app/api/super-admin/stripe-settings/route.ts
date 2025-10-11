import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    // Get Stripe settings from database
    const [rows] = await db.execute(`
      SELECT * FROM stripe_settings WHERE id = 1
    `);

    const settings = (rows as any[])[0];

    return NextResponse.json({
      success: true,
      data: settings || {
        publishableKey: '',
        secretKey: '',
        mode: 'test',
        webhookSecret: ''
      }
    });

  } catch (error) {
    console.error('Error fetching Stripe settings:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch Stripe settings'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const settings = await request.json();

    // Create table if it doesn't exist
    await db.execute(`
      CREATE TABLE IF NOT EXISTS stripe_settings (
        id INT PRIMARY KEY DEFAULT 1,
        publishable_key VARCHAR(500),
        secret_key VARCHAR(500),
        mode ENUM('test', 'live') DEFAULT 'test',
        webhook_secret VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Insert or update settings
    await db.execute(`
      INSERT INTO stripe_settings (
        id, publishable_key, secret_key, mode, webhook_secret
      ) VALUES (
        1, ?, ?, ?, ?
      )
      ON DUPLICATE KEY UPDATE
        publishable_key = VALUES(publishable_key),
        secret_key = VALUES(secret_key),
        mode = VALUES(mode),
        webhook_secret = VALUES(webhook_secret)
    `, [
      settings.publishableKey,
      settings.secretKey,
      settings.mode,
      settings.webhookSecret
    ]);

    return NextResponse.json({
      success: true,
      message: 'Stripe settings saved successfully'
    });

  } catch (error) {
    console.error('Error saving Stripe settings:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to save Stripe settings'
    }, { status: 500 });
  }
}
