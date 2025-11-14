import db from './db';
import { RowDataPacket, ResultSetHeader, OkPacket } from 'mysql2';

export interface License {
  id: number;
  tenant_id: string;
  license_key: string;
  status: 'active' | 'expired' | 'suspended' | 'grace_period';
  created_date: string;
  expiration_date: string;
  grace_period_days: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  tenant_name?: string;
  tenant_slug?: string;
}

export interface LicenseValidation {
  isValid: boolean;
  status: 'active' | 'expired' | 'suspended' | 'grace_period' | 'not_found';
  message: string;
  license?: License;
  redirectPath?: string;
  daysRemaining?: number;
}

export class LicenseService {
  /**
   * Create a new license for a tenant
   */
  static async createLicense(
    tenantId: string,
    expirationDate: string,
    notes?: string
  ): Promise<License> {
    const licenseKey = this.generateLicenseKey();
    
    const [result] = await db.execute(
      `INSERT INTO licenses (tenant_id, license_key, expiration_date, notes) 
       VALUES (?, ?, ?, ?)`,
      [tenantId, licenseKey, expirationDate, notes || null]
    ) as [OkPacket, any];

    return this.getLicenseById(result.insertId);
  }

  /**
   * Get license by ID
   */
  static async getLicenseById(licenseId: number): Promise<License> {
    const [rows] = await db.execute(
      `SELECT l.*, t.name as tenant_name, t.slug as tenant_slug 
       FROM licenses l 
       LEFT JOIN tenants t ON l.tenant_id = t.id 
       WHERE l.id = ?`,
      [licenseId]
    ) as [RowDataPacket[], any];

    if (rows.length === 0) {
      throw new Error('License not found');
    }

    return rows[0] as License;
  }

  /**
   * Get all licenses with tenant information
   */
  static async getAllLicenses(): Promise<License[]> {
    const [rows] = await db.execute(
      `SELECT l.*, t.name as tenant_name, t.slug as tenant_slug 
       FROM licenses l 
       LEFT JOIN tenants t ON l.tenant_id = t.id 
       ORDER BY l.created_at DESC`
    ) as [RowDataPacket[], any];

    return rows as License[];
  }

  /**
   * Get license for a specific tenant
   */
  static async getTenantLicense(tenantId: string): Promise<License | null> {
    const [rows] = await db.execute(
      `SELECT l.*, t.name as tenant_name, t.slug as tenant_slug 
       FROM licenses l 
       LEFT JOIN tenants t ON l.tenant_id = t.id 
       WHERE l.tenant_id = ? 
       ORDER BY l.created_at DESC 
       LIMIT 1`,
      [tenantId]
    ) as [RowDataPacket[], any];

    return rows.length > 0 ? (rows[0] as License) : null;
  }

  /**
   * Get license by tenant slug
   */
  static async getTenantLicenseBySlug(tenantSlug: string): Promise<License | null> {
    const [rows] = await db.execute(
      `SELECT l.*, t.name as tenant_name, t.slug as tenant_slug 
       FROM licenses l 
       LEFT JOIN tenants t ON l.tenant_id = t.id 
       WHERE t.slug = ? 
       ORDER BY l.created_at DESC 
       LIMIT 1`,
      [tenantSlug]
    ) as [RowDataPacket[], any];

    return rows.length > 0 ? (rows[0] as License) : null;
  }

  /**
   * Validate tenant license
   */
  static async validateTenantLicense(tenantSlug: string): Promise<LicenseValidation> {
    const license = await this.getTenantLicenseBySlug(tenantSlug);

    if (!license) {
      return {
        isValid: false,
        status: 'not_found',
        message: 'No license found for this restaurant',
        redirectPath: `/${tenantSlug}/license-required`
      };
    }

    const today = new Date();
    const expirationDate = new Date(license.expiration_date);
    const gracePeriodEnd = new Date(expirationDate);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + (license.grace_period_days || 7));

    const daysRemaining = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Update license status based on dates
    let newStatus = license.status;
    if (today > gracePeriodEnd && license.status !== 'suspended') {
      newStatus = 'expired';
    } else if (today > expirationDate && today <= gracePeriodEnd && license.status === 'active') {
      newStatus = 'grace_period';
    }

    // Update status in database if changed
    if (newStatus !== license.status) {
      await this.updateLicenseStatus(license.id, newStatus);
      license.status = newStatus;
    }

    // Check if license is valid
    const isValid = license.status === 'active' || license.status === 'grace_period';

    let message = '';
    if (license.status === 'expired') {
      message = 'Your license has expired. Please contact OrderWeb Ltd for renewal.';
    } else if (license.status === 'suspended') {
      message = 'Your license has been suspended. Please contact OrderWeb Ltd.';
    } else if (license.status === 'grace_period') {
      message = `Your license expired but you are in grace period. ${Math.ceil((gracePeriodEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))} days remaining.`;
    } else if (daysRemaining <= 7 && daysRemaining > 0) {
      message = `Your license expires in ${daysRemaining} days. Please renew soon.`;
    }

    return {
      isValid,
      status: license.status,
      message,
      license,
      redirectPath: isValid ? undefined : `/${tenantSlug}/license-required`,
      daysRemaining
    };
  }

  /**
   * Update license status
   */
  static async updateLicenseStatus(licenseId: number, status: License['status']): Promise<void> {
    await db.execute(
      'UPDATE licenses SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, licenseId]
    );
  }

  /**
   * Delete a license
   */
  static async deleteLicense(licenseId: number): Promise<void> {
    const [result] = await db.execute(
      'DELETE FROM licenses WHERE id = ?',
      [licenseId]
    ) as [OkPacket, any];

    if (result.affectedRows === 0) {
      throw new Error('License not found');
    }
  }

  /**
   * Extend license expiration date
   */
  static async extendLicense(licenseId: number, newExpirationDate: string): Promise<License> {
    await db.execute(
      'UPDATE licenses SET expiration_date = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newExpirationDate, 'active', licenseId]
    );

    return this.getLicenseById(licenseId);
  }

  /**
   * Generate a unique license key
   */
  private static generateLicenseKey(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const year = new Date().getFullYear().toString().slice(-2);
    
    return `LIC-${year}${timestamp}-${random}`;
  }

  /**
   * Generate activation key (for tenants to activate their license)
   */
  static generateActivationKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    
    // Generate format: XXXX-XXXX-XXXX-XXXX
    for (let i = 0; i < 4; i++) {
      if (i > 0) result += '-';
      for (let j = 0; j < 4; j++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }
    
    return result;
  }

  /**
   * Create license with activation key (Super admin creates, tenant activates)
   */
  static async createLicenseWithActivation(
    durationDays: number,
    notes?: string
  ): Promise<{ licenseKey: string; activationKey: string; expirationDate: string }> {
    const activationKey = this.generateActivationKey();
    const licenseKey = this.generateLicenseKey();
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + durationDays);
    const expirationDateString = expirationDate.toISOString().split('T')[0];

    // Create a pending activation record
    await db.execute(
      `INSERT INTO pending_license_activations (activation_key, license_key, duration_days, expiration_date, notes) 
       VALUES (?, ?, ?, ?, ?)`,
      [activationKey, licenseKey, durationDays, expirationDateString, notes || `License valid for ${durationDays} days`]
    );

    return {
      licenseKey,
      activationKey,
      expirationDate: expirationDateString
    };
  }

  /**
   * Activate license using activation key
   */
  static async activateLicense(
    activationKey: string,
    tenantSlug: string
  ): Promise<{ success: boolean; message: string; license?: License }> {
    try {
      // Find the pending activation
      const [pendingRows] = await db.execute(
        `SELECT * FROM pending_license_activations WHERE activation_key = ?`,
        [activationKey]
      ) as [RowDataPacket[], any];

      if (pendingRows.length === 0) {
        return {
          success: false,
          message: 'Invalid activation key'
        };
      }

      const pendingActivation = pendingRows[0];

      // Check if activation has expired
      const today = new Date();
      const expirationDate = new Date(pendingActivation.expiration_date);
      if (today > expirationDate) {
        return {
          success: false,
          message: 'Activation key has expired'
        };
      }

      // Get tenant ID by slug
      const [tenantRows] = await db.execute(
        'SELECT id FROM tenants WHERE slug = ?',
        [tenantSlug]
      ) as [RowDataPacket[], any];

      if (tenantRows.length === 0) {
        return {
          success: false,
          message: 'Restaurant not found'
        };
      }

      const tenantId = tenantRows[0].id;

      // Check if tenant already has a license
      const existingLicense = await this.getTenantLicense(tenantId);
      
      // If there's an existing license, deactivate it first (we'll replace it)
      if (existingLicense) {
        console.log(`🔄 Replacing existing license ${existingLicense.license_key} with new one for tenant ${tenantId}`);
        
        // Deactivate the old license by setting status to 'expired'
        await db.execute(
          `UPDATE licenses SET status = 'expired', updated_at = NOW() WHERE tenant_id = ?`,
          [tenantId]
        );
      }

      // Calculate actual expiration date (from today + duration)
      const actualExpirationDate = new Date();
      actualExpirationDate.setDate(actualExpirationDate.getDate() + pendingActivation.duration_days);
      const actualExpirationDateString = actualExpirationDate.toISOString().split('T')[0];

      // Create the new license
      const [result] = await db.execute(
        `INSERT INTO licenses (tenant_id, license_key, status, expiration_date, notes) 
         VALUES (?, ?, 'active', ?, ?)`,
        [tenantId, pendingActivation.license_key, actualExpirationDateString, pendingActivation.notes]
      ) as [OkPacket, any];

      // Remove the pending activation
      await db.execute(
        'DELETE FROM pending_license_activations WHERE id = ?',
        [pendingActivation.id]
      );

      const activatedLicense = await this.getLicenseById(result.insertId);

      return {
        success: true,
        message: existingLicense 
          ? `License replaced successfully! Old license deactivated and new license activated.`
          : 'License activated successfully!',
        license: activatedLicense
      };

    } catch (error) {
      console.error('License activation error:', error);
      return {
        success: false,
        message: 'An error occurred during license activation'
      };
    }
  }

  /**
   * Get activation keys (for super admin to see generated keys)
   */
  static async getPendingActivations(): Promise<Array<{
    id: number;
    activation_key: string;
    license_key: string;
    duration_days: number;
    expiration_date: string;
    created_at: string;
    notes?: string;
  }>> {
    const [rows] = await db.execute(
      `SELECT 
        id,
        activation_key,
        license_key,
        duration_days,
        expiration_date,
        created_at,
        notes
       FROM pending_license_activations 
       ORDER BY created_at DESC`
    ) as [RowDataPacket[], any];

    return rows as any[];
  }

  /**
   * Delete pending activation key
   */
  static async deletePendingActivation(activationId: number): Promise<void> {
    const [result] = await db.execute(
      'DELETE FROM pending_license_activations WHERE id = ?',
      [activationId]
    ) as [OkPacket, any];

    if (result.affectedRows === 0) {
      throw new Error('Activation key not found');
    }
  }

  /**
   * Delete tenant's current license (for tenant self-service)
   */
  static async deleteTenantLicense(tenantSlug: string): Promise<{ success: boolean; message: string }> {
    try {
      // Get current license
      const currentLicense = await this.getTenantLicenseBySlug(tenantSlug);
      
      if (!currentLicense) {
        return {
          success: false,
          message: 'No active license found to delete'
        };
      }

      // Delete the license completely
      const [result] = await db.execute(
        'DELETE FROM licenses WHERE id = ?',
        [currentLicense.id]
      ) as [OkPacket, any];

      if (result.affectedRows === 0) {
        return {
          success: false,
          message: 'Failed to delete license'
        };
      }

      return {
        success: true,
        message: 'License deleted successfully. Food ordering is now deactivated.'
      };

    } catch (error) {
      console.error('Error deleting tenant license:', error);
      return {
        success: false,
        message: 'An error occurred while deleting the license'
      };
    }
  }

  /**
   * Get license statistics
   */
  static async getLicenseStats(): Promise<{
    total: number;
    active: number;
    expired: number;
    grace_period: number;
    suspended: number;
  }> {
    const [rows] = await db.execute(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired,
        SUM(CASE WHEN status = 'grace_period' THEN 1 ELSE 0 END) as grace_period,
        SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) as suspended
       FROM licenses`
    ) as [RowDataPacket[], any];

    return rows[0] as any;
  }

  /**
   * Get comprehensive license statistics for dashboard
   */
  static async getLicenseStatistics(): Promise<{
    totalLicenses: number;
    activeLicenses: number;
    expiredLicenses: number;
    expiringSoon: number;
    gracePeriodLicenses: number;
    suspendedLicenses: number;
  }> {
    // Get basic counts
    const [statsRows] = await db.execute(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired,
        SUM(CASE WHEN status = 'grace_period' THEN 1 ELSE 0 END) as grace_period,
        SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) as suspended
       FROM licenses`
    ) as [RowDataPacket[], any];

    // Get count of licenses expiring in the next 30 days (active licenses only)
    const [expiringRows] = await db.execute(
      `SELECT COUNT(*) as expiring_soon 
       FROM licenses 
       WHERE status = 'active' 
       AND expiration_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)`
    ) as [RowDataPacket[], any];

    const stats = statsRows[0] as any;
    const expiring = expiringRows[0] as any;

    return {
      totalLicenses: parseInt(stats.total) || 0,
      activeLicenses: parseInt(stats.active) || 0,
      expiredLicenses: parseInt(stats.expired) || 0,
      expiringSoon: parseInt(expiring.expiring_soon) || 0,
      gracePeriodLicenses: parseInt(stats.grace_period) || 0,
      suspendedLicenses: parseInt(stats.suspended) || 0
    };
  }
}
