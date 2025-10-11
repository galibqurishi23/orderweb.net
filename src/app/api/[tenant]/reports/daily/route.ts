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

export async function POST(
  request: NextRequest,
  { params }: { params: { tenant: string } }
) {
  try {
    const tenant = params.tenant;
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

    // Parse request body
    const body = await request.json();
    const {
      reportDate,
      totalSales,
      totalOrders,
      cashSales,
      cardSales,
      giftCardSales,
      onlineSales,
      discounts,
      refunds,
      netSales,
      topItems,
      busyHours,
      staffShifts,
      notes
    } = body;

    // Validate required fields
    if (!reportDate) {
      return NextResponse.json({
        success: false,
        error: 'Missing reportDate field'
      }, { status: 400 });
    }

    // Connect to tenant database
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: `dinedesk_${tenant}`
    });

    // Check if report already exists for this date
    const [existing] = await connection.execute(`
      SELECT id FROM pos_daily_reports
      WHERE report_date = ?
      LIMIT 1
    `, [reportDate]);

    if (Array.isArray(existing) && existing.length > 0) {
      // Update existing report
      await connection.execute(`
        UPDATE pos_daily_reports
        SET 
          total_sales = ?,
          total_orders = ?,
          cash_sales = ?,
          card_sales = ?,
          gift_card_sales = ?,
          online_sales = ?,
          discounts = ?,
          refunds = ?,
          net_sales = ?,
          top_items = ?,
          busy_hours = ?,
          staff_shifts = ?,
          notes = ?,
          uploaded_at = NOW()
        WHERE report_date = ?
      `, [
        totalSales || 0,
        totalOrders || 0,
        cashSales || 0,
        cardSales || 0,
        giftCardSales || 0,
        onlineSales || 0,
        discounts || 0,
        refunds || 0,
        netSales || totalSales || 0,
        JSON.stringify(topItems || []),
        JSON.stringify(busyHours || {}),
        JSON.stringify(staffShifts || []),
        notes || '',
        reportDate
      ]);

      await connection.end();

      return NextResponse.json({
        success: true,
        message: 'Daily report updated successfully',
        data: {
          reportDate: reportDate,
          totalSales: totalSales || 0,
          totalOrders: totalOrders || 0,
          updated: true
        }
      });
    } else {
      // Insert new report
      await connection.execute(`
        INSERT INTO pos_daily_reports (
          tenant_id,
          report_date,
          total_sales,
          total_orders,
          cash_sales,
          card_sales,
          gift_card_sales,
          online_sales,
          discounts,
          refunds,
          net_sales,
          top_items,
          busy_hours,
          staff_shifts,
          notes,
          uploaded_at,
          created_at
        ) VALUES (
          (SELECT id FROM tenants WHERE slug = ? LIMIT 1),
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW()
        )
      `, [
        tenant,
        reportDate,
        totalSales || 0,
        totalOrders || 0,
        cashSales || 0,
        cardSales || 0,
        giftCardSales || 0,
        onlineSales || 0,
        discounts || 0,
        refunds || 0,
        netSales || totalSales || 0,
        JSON.stringify(topItems || []),
        JSON.stringify(busyHours || {}),
        JSON.stringify(staffShifts || []),
        notes || ''
      ]);

      await connection.end();

      return NextResponse.json({
        success: true,
        message: 'Daily report uploaded successfully',
        data: {
          reportDate: reportDate,
          totalSales: totalSales || 0,
          totalOrders: totalOrders || 0,
          created: true
        }
      });
    }

  } catch (error) {
    console.error('Daily report upload error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to upload daily report'
    }, { status: 500 });
  }
}
