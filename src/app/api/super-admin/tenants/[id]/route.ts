import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { updateTenantStatus, deleteTenant } from '@/lib/tenant-service';
import db from '@/lib/db';

interface Params {
  id: string;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const body = await request.json();
    const { status } = body;

    if (!status || !['active', 'suspended', 'trial', 'cancelled'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      );
    }

    await updateTenantStatus(id, status);

    return NextResponse.json({
      success: true,
      message: 'Tenant status updated successfully'
    });
  } catch (error) {
    console.error('Error updating tenant status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update tenant status' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    await deleteTenant(id);

    return NextResponse.json({
      success: true,
      message: 'Restaurant and all associated data deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting tenant:', error);
    
    if (error.message === 'Tenant not found') {
      return NextResponse.json(
        { success: false, error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to delete restaurant' },
      { status: 500 }
    );
  }
}

// GET tenant by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const { id } = await params;

    const [tenantRows] = await db.execute(
      `SELECT t.*, 
              tu.name as admin_name, 
              tu.email as admin_email,
              tu.username as admin_username
       FROM tenants t 
       LEFT JOIN tenant_users tu ON t.id = tu.tenant_id AND tu.role = 'owner'
       WHERE t.id = ?`,
      [id]
    );

    const tenants = tenantRows as any[];
    if (tenants.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: tenants[0]
    });

  } catch (error) {
    console.error('Error fetching tenant:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// UPDATE tenant
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const { id } = await params;
    const { 
      name, 
      slug, 
      email, 
      phone, 
      address,
      adminName,
      adminUsername,
      adminPassword 
    } = await request.json();

    // Validate required fields
    if (!name || !slug || !email) {
      return NextResponse.json(
        { success: false, error: 'Name, slug, and email are required' },
        { status: 400 }
      );
    }

    // Check if tenant exists
    const [existingTenant] = await db.execute(
      'SELECT id FROM tenants WHERE id = ?',
      [id]
    );

    if ((existingTenant as any[]).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // Check if slug is unique (excluding current tenant)
    const [slugCheck] = await db.execute(
      'SELECT id FROM tenants WHERE slug = ? AND id != ?',
      [slug, id]
    );

    if ((slugCheck as any[]).length > 0) {
      return NextResponse.json(
        { success: false, error: 'URL slug is already taken' },
        { status: 400 }
      );
    }

    // Update tenant details
    await db.execute(
      `UPDATE tenants 
       SET name = ?, slug = ?, email = ?, phone = ?, address = ?, updated_at = NOW()
       WHERE id = ?`,
      [name, slug, email, phone, address, id]
    );

    // Update admin user if admin details are provided
    if (adminName || adminUsername || adminPassword) {
      const [adminUser] = await db.execute(
        'SELECT id, password FROM tenant_users WHERE tenant_id = ? AND role = "owner"',
        [id]
      );

      const adminUsers = adminUser as any[];
      if (adminUsers.length > 0) {
        const adminUserId = adminUsers[0].id;
        let updateQuery = 'UPDATE tenant_users SET ';
        const updateParams: any[] = [];
        const updateFields: string[] = [];

        if (adminName) {
          updateFields.push('name = ?');
          updateParams.push(adminName);
        }

        if (adminUsername) {
          updateFields.push('username = ?');
          updateParams.push(adminUsername);
        }

        if (adminPassword) {
          const hashedPassword = await bcrypt.hash(adminPassword, 12);
          updateFields.push('password = ?');
          updateParams.push(hashedPassword);
        }

        if (updateFields.length > 0) {
          updateFields.push('updated_at = NOW()');
          updateQuery += updateFields.join(', ') + ' WHERE id = ?';
          updateParams.push(adminUserId);

          await db.execute(updateQuery, updateParams);
        }
      } else {
        console.warn('No admin user found for tenant:', id);
      }
    }

    // Fetch updated tenant data
    const [updatedTenant] = await db.execute(
      `SELECT t.*, 
              tu.name as admin_name, 
              tu.email as admin_email,
              tu.username as admin_username
       FROM tenants t 
       LEFT JOIN tenant_users tu ON t.id = tu.tenant_id AND tu.role = 'owner'
       WHERE t.id = ?`,
      [id]
    );

    return NextResponse.json({
      success: true,
      data: (updatedTenant as any[])[0],
      message: 'Restaurant updated successfully'
    });

  } catch (error) {
    console.error('Error updating tenant:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
