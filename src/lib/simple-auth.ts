import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const COOKIE_NAME = 'customer_auth';
const TOKEN_EXPIRY = '30d'; // 30 days

interface CustomerPayload {
  id: string;
  email: string;
  tenantId: string;
  phone?: string;
}

interface DecodedToken extends CustomerPayload {
  iat: number;
  exp: number;
}

export class SimpleCustomerAuth {
  /**
   * Generate a JWT token for customer (valid for 30 days)
   */
  static generateToken(payload: CustomerPayload): string {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: TOKEN_EXPIRY,
    });
  }

  /**
   * Verify and decode JWT token
   */
  static verifyToken(token: string): DecodedToken | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
      return decoded;
    } catch (error) {
      console.error('[SimpleAuth] Token verification failed:', error);
      return null;
    }
  }

  /**
   * Set authentication cookie (30 days)
   */
  static setCookie(response: NextResponse, token: string): NextResponse {
    const maxAge = 30 * 24 * 60 * 60; // 30 days in seconds

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: maxAge,
      path: '/',
    });

    return response;
  }

  /**
   * Clear authentication cookie
   */
  static clearCookie(): NextResponse {
    const response = NextResponse.json({ success: true });
    
    response.cookies.delete(COOKIE_NAME);
    
    return response;
  }

  /**
   * Get customer data from request cookies
   */
  static getCustomerFromRequest(request: Request): DecodedToken | null {
    try {
      // Get token from cookie
      const cookieHeader = request.headers.get('cookie');
      if (!cookieHeader) {
        return null;
      }

      const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
      }, {} as Record<string, string>);

      const token = cookies[COOKIE_NAME];
      if (!token) {
        return null;
      }

      // Verify token
      return this.verifyToken(token);
    } catch (error) {
      console.error('[SimpleAuth] Error getting customer from request:', error);
      return null;
    }
  }

  /**
   * Check if customer is authenticated
   */
  static isAuthenticated(request: Request): boolean {
    const customer = this.getCustomerFromRequest(request);
    return customer !== null;
  }

  /**
   * Get customer ID from request
   */
  static getCustomerId(request: Request): string | null {
    const customer = this.getCustomerFromRequest(request);
    return customer?.id || null;
  }

  /**
   * Get tenant ID from request
   */
  static getTenantId(request: Request): string | null {
    const customer = this.getCustomerFromRequest(request);
    return customer?.tenantId || null;
  }
}
