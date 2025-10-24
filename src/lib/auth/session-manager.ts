import crypto from 'crypto';
import db from '../db';
import { TokenService } from './token-service';

/**
 * Session Manager - Handles customer session lifecycle
 */
export class SessionManager {
  /**
   * Create a new session for a customer
   */
  static async createSession(
    customerId: string,
    tenantId: string,
    email: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ sessionId: string; accessToken: string; refreshToken: string }> {
    try {
      // Generate tokens
      const accessToken = TokenService.generateAccessToken(customerId, tenantId, email);
      const refreshToken = TokenService.generateRefreshToken(customerId, tenantId);
      
      // Generate unique session ID
      const sessionId = crypto.randomUUID();
      
      // Calculate expiry (7 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Store session in database
      await db.execute(
        `INSERT INTO customer_sessions 
        (id, customer_id, tenant_id, session_token, refresh_token, ip_address, user_agent, expires_at, last_activity, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [sessionId, customerId, tenantId, accessToken, refreshToken, ipAddress || null, userAgent || null, expiresAt]
      );

      return { sessionId, accessToken, refreshToken };
    } catch (error) {
      console.error('[SessionManager] Create session error:', error);
      throw new Error('Failed to create session');
    }
  }

  /**
   * Validate a session by refresh token
   */
  static async validateSession(refreshToken: string): Promise<{
    valid: boolean;
    customerId?: string;
    tenantId?: string;
    email?: string;
    sessionId?: string;
  }> {
    try {
      process.stderr.write('[SessionManager] Validating session with refresh token\n');
      
      // Verify refresh token
      const tokenData = TokenService.verifyRefreshToken(refreshToken);
      process.stderr.write(`[SessionManager] Token data: ${tokenData ? 'VALID' : 'INVALID'}\n`);
      
      if (!tokenData) {
        process.stderr.write('[SessionManager] Token verification failed\n');
        return { valid: false };
      }

      process.stderr.write(`[SessionManager] Looking for session in database - customerId=${tokenData.customerId} tenantId=${tokenData.tenantId}\n`);

      // Check if session exists in database
      const [sessions] = await db.execute(
        `SELECT s.*, c.email 
         FROM customer_sessions s
         JOIN customers c ON s.customer_id = c.id
         WHERE s.refresh_token = ? 
         AND s.customer_id = ? 
         AND s.tenant_id = ?
         AND s.expires_at > NOW()`,
        [refreshToken, tokenData.customerId, tokenData.tenantId]
      );

  process.stderr.write(`[SessionManager] Database query returned ${(sessions as any[]).length} sessions\n`);

      const session = (sessions as any[])[0];
      if (!session) {
        process.stderr.write('[SessionManager] No valid session found in database\n');
        return { valid: false };
      }

      process.stderr.write('[SessionManager] Session found, updating last activity\n');

      // Update last activity
      await db.execute(
        'UPDATE customer_sessions SET last_activity = NOW() WHERE id = ?',
        [session.id]
      );

      return {
        valid: true,
        customerId: session.customer_id,
        tenantId: session.tenant_id,
        email: session.email,
        sessionId: session.id
      };
    } catch (error) {
      process.stderr.write(`[SessionManager] Validate session error: ${String(error)}\n`);
      return { valid: false };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshAccessToken(refreshToken: string): Promise<{
    success: boolean;
    accessToken?: string;
  }> {
    try {
      const sessionData = await this.validateSession(refreshToken);
      
      if (!sessionData.valid || !sessionData.customerId || !sessionData.tenantId || !sessionData.email) {
        return { success: false };
      }

      // Generate new access token
      const accessToken = TokenService.generateAccessToken(
        sessionData.customerId,
        sessionData.tenantId,
        sessionData.email
      );

      // Update session token in database
      await db.execute(
        'UPDATE customer_sessions SET session_token = ?, last_activity = NOW() WHERE id = ?',
        [accessToken, sessionData.sessionId]
      );

      return { success: true, accessToken };
    } catch (error) {
      console.error('[SessionManager] Refresh token error:', error);
      return { success: false };
    }
  }

  /**
   * Delete a session (logout)
   */
  static async deleteSession(refreshToken: string): Promise<boolean> {
    try {
      await db.execute(
        'DELETE FROM customer_sessions WHERE refresh_token = ?',
        [refreshToken]
      );
      return true;
    } catch (error) {
      console.error('[SessionManager] Delete session error:', error);
      return false;
    }
  }

  /**
   * Delete all sessions for a customer (logout from all devices)
   */
  static async deleteAllCustomerSessions(customerId: string, tenantId: string): Promise<boolean> {
    try {
      await db.execute(
        'DELETE FROM customer_sessions WHERE customer_id = ? AND tenant_id = ?',
        [customerId, tenantId]
      );
      return true;
    } catch (error) {
      console.error('[SessionManager] Delete all sessions error:', error);
      return false;
    }
  }

  /**
   * Cleanup expired sessions (should be run periodically)
   */
  static async cleanupExpiredSessions(): Promise<number> {
    try {
      const [result] = await db.execute(
        'DELETE FROM customer_sessions WHERE expires_at < NOW()'
      ) as any;
      
      return result.affectedRows || 0;
    } catch (error) {
      console.error('[SessionManager] Cleanup error:', error);
      return 0;
    }
  }

  /**
   * Get active sessions for a customer
   */
  static async getCustomerSessions(customerId: string, tenantId: string): Promise<any[]> {
    try {
      const [sessions] = await db.execute(
        `SELECT id, ip_address, user_agent, last_activity, created_at, expires_at
         FROM customer_sessions 
         WHERE customer_id = ? AND tenant_id = ? AND expires_at > NOW()
         ORDER BY last_activity DESC`,
        [customerId, tenantId]
      );
      
      return sessions as any[];
    } catch (error) {
      console.error('[SessionManager] Get sessions error:', error);
      return [];
    }
  }
}
