import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// Helper function to validate API key
async function validateApiKey(tenant: string, apiKey: string | null): Promise<boolean> {
  if (!apiKey) return false;
  
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: 'dinedesk_db'
    });

    const [rows] = await connection.execute(
      'SELECT id FROM tenants WHERE slug = ? AND pos_api_key = ?',
      [tenant, apiKey]
    );

    await connection.end();
    return Array.isArray(rows) && rows.length > 0;
  } catch (error) {
    console.error('API key validation error:', error);
    return false;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { tenant: string; card: string } }
) {
  try {
    const tenant = params.tenant;
    const cardNumber = params.card;
    const apiKey = request.headers.get('x-api-key');
    const tenantHeader = request.headers.get('x-tenant-id');

    // Validate headers
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing X-API-Key header'
      }, { status: 401 });
    }

    if (tenantHeader !== tenant) {
      return NextResponse.json({
        success: false,
        error: 'Tenant ID mismatch'
      }, { status: 403 });
    }

    // Validate API key
    const isValid = await validateApiKey(tenant, apiKey);
    if (!isValid) {
      return NextResponse.json({
        success: false,
        error: 'Invalid API key'
      }, { status: 401 });
    }

    // Connect to tenant database
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: `dinedesk_${tenant}`
    });

    // Fetch gift card
    const [cards] = await connection.execute(`
      SELECT 
        id,
        cardNumber,
        balance,
        initialAmount,
        status,
        recipientName,
        recipientEmail,
        expiryDate,
        createdAt
      FROM gift_cards
      WHERE cardNumber = ?
    `, [cardNumber]);

    await connection.end();

    const cardArray = cards as any[];
    
    if (cardArray.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Gift card not found'
      }, { status: 404 });
    }

    const card = cardArray[0];

    // Check if expired
    const isExpired = card.expiryDate && new Date(card.expiryDate) < new Date();

    return NextResponse.json({
      success: true,
      data: {
        cardNumber: card.cardNumber,
        balance: parseFloat(card.balance),
        initialAmount: parseFloat(card.initialAmount),
        status: isExpired ? 'expired' : card.status,
        recipientName: card.recipientName,
        expiryDate: card.expiryDate,
        isExpired: isExpired
      }
    });

  } catch (error) {
    console.error('Gift card balance error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch gift card balance'
    }, { status: 500 });
  }
}
