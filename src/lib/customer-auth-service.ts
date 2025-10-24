import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from './db';
import { tenantEmailService } from './tenant-email-service';

interface CustomerAuthResult {
  success: boolean;
  customer?: any;
  token?: string;
  error?: string;
}

export class CustomerAuthService {
  // Use getter to evaluate at runtime, not at class load time
  private static get JWT_SECRET(): string {
    return process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'customer-secret-key';
  }
  private static readonly TOKEN_EXPIRY: string = '7d'; // 7 days
  private static readonly MAX_LOGIN_ATTEMPTS: number = 5;
  private static readonly LOCKOUT_DURATION: number = 15; // minutes

  /**
   * Authenticate customer with email and password
   */
  static async login(email: string, password: string, tenantId: string, ipAddress?: string): Promise<CustomerAuthResult> {
    try {
      // Check for too many failed attempts
      const recentAttempts = await this.getRecentLoginAttempts(email, tenantId, ipAddress);
      if (recentAttempts >= this.MAX_LOGIN_ATTEMPTS) {
        return { success: false, error: 'Too many failed login attempts. Please try again in 15 minutes.' };
      }

      // Find customer
      const [customers] = await db.execute(
        'SELECT * FROM customers WHERE email = ? AND tenant_id = ?',
        [email, tenantId]
      );

      const customer = (customers as any[])[0];
      if (!customer) {
        await this.logLoginAttempt(email, tenantId, false, ipAddress);
        return { success: false, error: 'Invalid email or password' };
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, customer.password);
      if (!isValidPassword) {
        await this.logLoginAttempt(email, tenantId, false, ipAddress);
        return { success: false, error: 'Invalid email or password' };
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          customerId: customer.id,
          tenantId: tenantId,
          email: customer.email,
          type: 'customer'
        },
        CustomerAuthService.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Create session
      const sessionId = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

      await db.execute(
        'INSERT INTO customer_sessions (id, customer_id, tenant_id, expires_at) VALUES (?, ?, ?, ?)',
        [sessionId, customer.id, tenantId, expiresAt]
      );

      // Log successful attempt
      await this.logLoginAttempt(email, tenantId, true, ipAddress);

      // Update customer last login
      await db.execute(
        'UPDATE customers SET updated_at = NOW() WHERE id = ?',
        [customer.id]
      );

      // Remove password from response
      const { password: _, ...customerData } = customer;

      return {
        success: true,
        customer: customerData,
        token: token
      };

    } catch (error) {
      console.error('Customer login error:', error);
      return { success: false, error: 'Login failed. Please try again.' };
    }
  }

  /**
   * Register new customer with phone-based loyalty integration
   */
  static async register(
    name: string, 
    email: string, 
    password: string, 
    phone: string, 
    tenantId: string
  ): Promise<CustomerAuthResult> {
    try {
      // Check if customer already exists
      const [existing] = await db.execute(
        'SELECT id FROM customers WHERE email = ? AND tenant_id = ?',
        [email, tenantId]
      );

      if ((existing as any[]).length > 0) {
        return { success: false, error: 'Account already exists with this email' };
      }

      // Normalize phone number for consistency
      const normalizedPhone = this.normalizePhoneNumber(phone || '');
      const formattedPhone = this.formatPhoneForDisplay(phone || '');

      // Check if phone number is already registered (if provided)
      if (normalizedPhone) {
        const [phoneExists] = await db.execute(
          'SELECT customer_id FROM loyalty_phone_lookup WHERE normalized_phone = ? AND tenant_id = ?',
          [normalizedPhone, tenantId]
        );

        if ((phoneExists as any[]).length > 0) {
          return { success: false, error: 'Phone number already registered for loyalty program' };
        }
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Generate customer ID
      const customerId = crypto.randomUUID();

      // Create customer
      // Split name into first and last name
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      await db.execute(
        `INSERT INTO customers (id, tenant_id, first_name, last_name, name, email, phone, password, customer_segment, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', NOW())`,
        [customerId, tenantId, firstName, lastName, name, email, formattedPhone, hashedPassword]
      );

      // Create loyalty points record with signup bonus
      await db.execute(
        'INSERT INTO customer_loyalty_points (customer_id, tenant_id, points_balance, total_points_earned, tier_level) VALUES (?, ?, 100, 100, "bronze")',
        [customerId, tenantId]
      );

      // Generate loyalty card number
      const loyaltyCardNumber = this.generateLoyaltyCardNumber(normalizedPhone || customerId, 'Bronze');

      // Create phone lookup entry if phone provided
      if (normalizedPhone) {
        await db.execute(
          `INSERT INTO loyalty_phone_lookup (
            phone, customer_id, tenant_id, normalized_phone, formatted_phone, 
            display_phone, loyalty_card_number, is_primary, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, true, NOW())`,
          [formattedPhone, customerId, tenantId, normalizedPhone, formattedPhone, formattedPhone, loyaltyCardNumber]
        );
      }

      // Log signup bonus transaction
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1 year expiry

      await db.execute(
        'INSERT INTO loyalty_transactions (customer_id, tenant_id, transaction_type, points_amount, description, expires_at) VALUES (?, ?, "bonus", 100, "Welcome signup bonus", ?)',
        [customerId, tenantId, expiresAt]
      );

      // Log phone-based loyalty transaction if phone provided
      if (normalizedPhone) {
        await db.execute(
          `INSERT INTO phone_loyalty_transactions (
            phone, tenant_id, customer_id, operation_type, 
            points_amount, operation_details, created_at
          ) VALUES (?, ?, ?, 'add_points', 100, JSON_OBJECT('description', 'Welcome signup bonus', 'source', 'phone-based-loyalty'), NOW())`,
          [formattedPhone, tenantId, customerId]
        );
      }

      // Create default preferences
      await db.execute(
        'INSERT INTO customer_preferences (customer_id, tenant_id, dietary_preferences, communication_preferences) VALUES (?, ?, "[]", JSON_OBJECT("email_orders", true, "email_promotions", true, "sms_orders", false, "sms_promotions", false))',
        [customerId, tenantId]
      );

      // Send welcome email
      try {
        // TODO: Implement sendWelcomeEmail method
        // await this.sendWelcomeEmail(email, name, tenantId);
        console.log('✅ Welcome email functionality disabled for production build');
      } catch (emailError) {
        // Don't fail registration if email fails
        console.error('⚠️ Failed to send welcome email:', emailError);
      }

      // Auto-login after registration
      return await this.login(email, password, tenantId);

    } catch (error) {
      console.error('Customer registration error:', error);
      return { success: false, error: 'Registration failed. Please try again.' };
    }
  }

  /**
   * Helper function to normalize phone number
   */
  private static normalizePhoneNumber(phone: string): string {
    if (!phone) return '';
    
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Convert common international formats
    if (cleaned.startsWith('44') && cleaned.length === 13) {
      return cleaned; // UK format: 447890123456
    } else if (cleaned.startsWith('0') && cleaned.length === 11) {
      return '44' + cleaned.substring(1); // UK format: 07890123456 -> 447890123456
    } else if (cleaned.startsWith('1') && cleaned.length === 11) {
      return cleaned; // US format: 14155551234
    } else if (cleaned.length === 10) {
      return '1' + cleaned; // US format: 4155551234 -> 14155551234
    }
    
    return cleaned;
  }

  /**
   * Helper function to format phone number for display
   */
  private static formatPhoneForDisplay(phone: string): string {
    if (!phone) return '';
    
    const normalized = this.normalizePhoneNumber(phone);
    
    if (normalized.startsWith('44')) {
      // UK format: 447890123456 -> +44 7890 123456
      return '+44 ' + normalized.substring(2, 6) + ' ' + normalized.substring(6);
    } else if (normalized.startsWith('1')) {
      // US format: 14155551234 -> +1 (415) 555-1234
      return '+1 (' + normalized.substring(1, 4) + ') ' + normalized.substring(4, 7) + '-' + normalized.substring(7);
    }
    
    return '+' + normalized;
  }

  /**
   * Generate loyalty card number
   */
  private static generateLoyaltyCardNumber(phoneOrId: string, tierName: string = 'Bronze'): string {
    const lastSix = phoneOrId.slice(-6);
    return `TIK-${tierName.toUpperCase()}-${lastSix}`;
  }

  /**
   * Verify JWT token and get customer
   */
  static async verifyToken(token: string): Promise<CustomerAuthResult> {
    try {
      // Debug logging - write to stdout
      process.stdout.write(`[VERIFY-TOKEN] Starting verification\n`);
      process.stdout.write(`[VERIFY-TOKEN] Secret: ${this.JWT_SECRET.substring(0, 30)}...\n`);
      process.stdout.write(`[VERIFY-TOKEN] Token: ${token.substring(0, 50)}...\n`);
      
      const decoded = jwt.verify(token, CustomerAuthService.JWT_SECRET) as any;
      process.stdout.write(`[VERIFY-TOKEN] Decoded: ${JSON.stringify(decoded)}\n`);
      
      if (decoded.type !== 'customer') {
        process.stdout.write(`[VERIFY-TOKEN] Invalid type: ${decoded.type}\n`);
        return { success: false, error: 'Invalid token type' };
      }

      // Get customer data
      const [customers] = await db.execute(
        'SELECT * FROM customers WHERE id = ? AND tenant_id = ?',
        [decoded.customerId, decoded.tenantId]
      );

      const customer = (customers as any[])[0];
      if (!customer) {
        process.stdout.write('[VERIFY-TOKEN] Customer not found\n');
        return { success: false, error: 'Customer not found' };
      }

      process.stdout.write(`[VERIFY-TOKEN] Success: ${customer.email}\n`);
      // Remove password from response
      const { password: _, ...customerData} = customer;

      return {
        success: true,
        customer: customerData
      };

    } catch (error) {
      process.stdout.write(`[VERIFY-TOKEN] ERROR: ${error instanceof Error ? error.message : error}\n`);
      return { success: false, error: 'Invalid or expired token' };
    }
  }

  /**
   * Logout customer (invalidate session)
   */
  static async logout(token: string): Promise<boolean> {
    try {
      const decoded = jwt.verify(token, CustomerAuthService.JWT_SECRET) as any;
      
      // Remove all sessions for this customer
      await db.execute(
        'DELETE FROM customer_sessions WHERE customer_id = ? AND tenant_id = ?',
        [decoded.customerId, decoded.tenantId]
      );

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate password reset token
   */
  static async generatePasswordResetToken(email: string, tenantId: string): Promise<string | null> {
    try {
      const [customers] = await db.execute(
        'SELECT id FROM customers WHERE email = ? AND tenant_id = ?',
        [email, tenantId]
      );

      const customer = (customers as any[])[0];
      if (!customer) {
        return null;
      }

      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

      await db.execute(
        'INSERT INTO customer_password_resets (customer_id, tenant_id, token, expires_at) VALUES (?, ?, ?, ?)',
        [customer.id, tenantId, token, expiresAt]
      );

      return token;
    } catch (error) {
      console.error('Password reset token generation error:', error);
      return null;
    }
  }

  /**
   * Reset password with token
   */
  static async resetPassword(token: string, newPassword: string, tenantId: string): Promise<boolean> {
    try {
      // Find valid token
      const [tokens] = await db.execute(
        'SELECT customer_id FROM customer_password_resets WHERE token = ? AND tenant_id = ? AND expires_at > NOW() AND used = false',
        [token, tenantId]
      );

      const tokenData = (tokens as any[])[0];
      if (!tokenData) {
        return false;
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update password
      await db.execute(
        'UPDATE customers SET password = ? WHERE id = ?',
        [hashedPassword, tokenData.customer_id]
      );

      // Mark token as used
      await db.execute(
        'UPDATE customer_password_resets SET used = true WHERE token = ?',
        [token]
      );

      return true;
    } catch (error) {
      console.error('Password reset error:', error);
      return false;
    }
  }

  /**
   * Log login attempt for security
   */
  private static async logLoginAttempt(email: string, tenantId: string, success: boolean, ipAddress?: string): Promise<void> {
    try {
      await db.execute(
        'INSERT INTO customer_login_attempts (email, tenant_id, ip_address, success) VALUES (?, ?, ?, ?)',
        [email, tenantId, ipAddress || null, success]
      );
    } catch (error) {
      console.error('Failed to log login attempt:', error);
    }
  }

  /**
   * Get recent failed login attempts
   */
  private static async getRecentLoginAttempts(email: string, tenantId: string, ipAddress?: string): Promise<number> {
    try {
      const [attempts] = await db.execute(
        `SELECT COUNT(*) as count FROM customer_login_attempts 
         WHERE email = ? AND tenant_id = ? AND success = false 
         AND attempted_at > DATE_SUB(NOW(), INTERVAL ${this.LOCKOUT_DURATION} MINUTE)
         ${ipAddress ? 'AND ip_address = ?' : ''}`,
        ipAddress ? [email, tenantId, ipAddress] : [email, tenantId]
      );

      return (attempts as any[])[0]?.count || 0;
    } catch (error) {
      console.error('Failed to get login attempts:', error);
      return 0;
    }
  }
}
