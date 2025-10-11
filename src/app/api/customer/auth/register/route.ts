import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Helper function to normalize phone number
function normalizePhoneNumber(phone: string): string {
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

// Helper function to format phone number for display
function formatPhoneForDisplay(phone: string): string {
  if (!phone) return '';
  
  const normalized = normalizePhoneNumber(phone);
  
  if (normalized.startsWith('44')) {
    // UK format: 447890123456 -> +44 7890 123456
    return '+44 ' + normalized.substring(2, 6) + ' ' + normalized.substring(6);
  } else if (normalized.startsWith('1')) {
    // US format: 14155551234 -> +1 (415) 555-1234
    return '+1 (' + normalized.substring(1, 4) + ') ' + normalized.substring(4, 7) + '-' + normalized.substring(7);
  }
  
  return '+' + normalized;
}

// Generate loyalty card number
function generateLoyaltyCardNumber(phoneOrId: string, tierName: string = 'Bronze'): string {
  const lastSix = phoneOrId.slice(-6);
  return `TIK-${tierName.toUpperCase()}-${lastSix}`;
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, phone, tenantId } = await request.json();

    console.log('Registration attempt:', { name, email, phone, tenantId });

    if (!name || !email || !password || !tenantId) {
      return NextResponse.json({
        success: false,
        error: 'Name, email, password, and restaurant are required'
      }, { status: 400 });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({
        success: false,
        error: 'Please enter a valid email address'
      }, { status: 400 });
    }

    // Password strength validation
    if (password.length < 6) {
      return NextResponse.json({
        success: false,
        error: 'Password must be at least 6 characters long'
      }, { status: 400 });
    }

    // Normalize phone number for consistency
    const normalizedPhone = normalizePhoneNumber(phone || '');
    const formattedPhone = formatPhoneForDisplay(phone || '');

    // Use the CustomerAuthService for registration
    const { CustomerAuthService } = await import('@/lib/customer-auth-service');
    
    const result = await CustomerAuthService.register(
      name,
      email,
      password,
      phone || '',
      tenantId
    );

    if (result.success && result.customer) {
      console.log('Registration successful for:', email);

      return NextResponse.json({
        success: true,
        customer: {
          id: result.customer.id,
          name: result.customer.name,
          email: result.customer.email,
          phone: result.customer.phone,
          loyaltyCardNumber: result.customer.loyaltyCardNumber
        },
        message: 'Account created successfully! Welcome bonus of 100 points added.'
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Registration failed'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Customer registration API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Registration failed. Please try again.'
    }, { status: 500 });
  }
}
