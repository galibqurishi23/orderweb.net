import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const headersList = await headers();
    const tenantId = headersList.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const [rows] = await db.execute(`
      SELECT id, template_type, name, subject, html_content, text_content, variables, is_active as active
      FROM email_templates
      WHERE tenant_id = ?
      ORDER BY template_type
    `, [tenantId]);

    return NextResponse.json(rows);

  } catch (error) {
    console.error('Error fetching email templates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    const tenantId = headersList.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const { id, template_type, name, subject, html_content, text_content, variables, active } = await request.json();

    if (!template_type || !subject || !html_content) {
      return NextResponse.json(
        { error: 'Template type, subject, and HTML content are required' },
        { status: 400 }
      );
    }

    // Update existing template or create new one
    if (id && id.startsWith('custom-')) {
      // Create new custom template
      const newId = uuidv4();
      await db.execute(`
        INSERT INTO email_templates (id, tenant_id, template_type, name, subject, html_content, text_content, variables, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [newId, tenantId, template_type, name || `Custom ${template_type}`, subject, html_content, text_content || '', variables || '{}', active !== false]);
    } else {
      // Update existing template
      const [existingRows] = await db.execute(`
        SELECT id FROM email_templates
        WHERE tenant_id = ? AND template_type = ?
      `, [tenantId, template_type]);

      if (Array.isArray(existingRows) && existingRows.length > 0) {
        // Update existing template
        await db.execute(`
          UPDATE email_templates
          SET name = ?, subject = ?, html_content = ?, text_content = ?, variables = ?, is_active = ?, updated_at = NOW()
          WHERE tenant_id = ? AND template_type = ?
        `, [name || `Custom ${template_type}`, subject, html_content, text_content || '', variables || '{}', active !== false, tenantId, template_type]);
      } else {
        // Create new template
        await db.execute(`
          INSERT INTO email_templates (id, tenant_id, template_type, name, subject, html_content, text_content, variables, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [uuidv4(), tenantId, template_type, name || `Custom ${template_type}`, subject, html_content, text_content || '', variables || '{}', active !== false]);
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error saving email template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
