import jwt from 'jsonwebtoken';

/**
 * Token Service - Handles JWT token generation and validation
 */
export class TokenService {
  private static readonly ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'customer-secret-key';
  private static readonly REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'customer-refresh-secret';
  
  private static readonly ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
  private static readonly REFRESH_TOKEN_EXPIRY = '7d'; // 7 days

  /**
   * Generate access token (short-lived)
   */
  static generateAccessToken(customerId: string, tenantId: string, email: string): string {
    return jwt.sign(
      {
        customerId,
        tenantId,
        email,
        type: 'customer_access'
      },
      this.ACCESS_TOKEN_SECRET,
      { expiresIn: this.ACCESS_TOKEN_EXPIRY }
    );
  }

  /**
   * Generate refresh token (long-lived)
   */
  static generateRefreshToken(customerId: string, tenantId: string): string {
    return jwt.sign(
      {
        customerId,
        tenantId,
        type: 'customer_refresh'
      },
      this.REFRESH_TOKEN_SECRET,
      { expiresIn: this.REFRESH_TOKEN_EXPIRY }
    );
  }

  /**
   * Verify access token
   */
  static verifyAccessToken(token: string): { customerId: string; tenantId: string; email: string } | null {
    try {
      const decoded = jwt.verify(token, this.ACCESS_TOKEN_SECRET) as any;
      
      if (decoded.type !== 'customer_access') {
        return null;
      }

      return {
        customerId: decoded.customerId,
        tenantId: decoded.tenantId,
        email: decoded.email
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Verify refresh token
   */
  static verifyRefreshToken(token: string): { customerId: string; tenantId: string } | null {
    try {
      // Log which secrets are present at runtime (use stderr so it appears in PM2 logs)
      try { process.stderr.write(`[TokenService] ACCESS_SECRET_PRESENT=${!!process.env.JWT_SECRET} REFRESH_SECRET_PRESENT=${!!process.env.JWT_REFRESH_SECRET} NEXTAUTH_SECRET_PRESENT=${!!process.env.NEXTAUTH_SECRET}\n`); } catch (e) {}

      // First, try the configured refresh secret
      let decoded = null as any;
      try {
        decoded = jwt.verify(token, this.REFRESH_TOKEN_SECRET) as any;
        process.stderr.write('[TokenService] Verified refresh token with REFRESH_TOKEN_SECRET\n');
      } catch (err) {
        // If verification failed, try using JWT_SECRET as a fallback (backwards compatibility)
        try {
          decoded = jwt.verify(token, process.env.JWT_SECRET || '') as any;
          process.stderr.write('[TokenService] Verified refresh token with JWT_SECRET fallback\n');
        } catch (err2) {
          process.stderr.write('[TokenService] Refresh token verification failed with configured secrets\n');
          throw err2;
        }
      }
      
      if (decoded.type !== 'customer_refresh') {
        return null;
      }

      return {
        customerId: decoded.customerId,
        tenantId: decoded.tenantId
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if token is about to expire (within 5 minutes)
   */
  static isTokenExpiringSoon(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) return true;

      const expiryTime = decoded.exp * 1000; // Convert to milliseconds
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      return (expiryTime - now) < fiveMinutes;
    } catch (error) {
      return true;
    }
  }
}
