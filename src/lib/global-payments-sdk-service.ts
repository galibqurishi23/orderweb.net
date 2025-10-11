// Simple Global Payments service using direct API calls (compatible with Next.js)
// This replaces the SDK approach for better Next.js compatibility

// Global Payments SDK Configuration Interface
import crypto from 'crypto';

interface GlobalPaymentsConfig {
  appId: string;
  appKey: string;
  environment: 'sandbox' | 'production';
  merchantId?: string;
}

// Payment request interface
export interface PaymentRequest {
  amount: number;
  currency: string;
  orderId: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  billingAddress?: {
    streetAddress1: string;
    streetAddress2?: string;
    city: string;
    state?: string;
    postalCode: string;
    countryCode: string;
  };
}

// Global Payments SDK Service Class
export class GlobalPaymentsSDKService {
  private config: GlobalPaymentsConfig;

  constructor(config: GlobalPaymentsConfig) {
    this.config = config;
  }

  /**
   * Get the base URL for Global Payments API
   */
  private getBaseUrl(): string {
    // Using the correct Global Payments Unified Commerce Platform (UCP) endpoints
    return this.config.environment === 'production' 
      ? 'https://apis.globalpay.com/ucp'
      : 'https://apis.sandbox.globalpay.com/ucp';
  }

  /**
   * Generate authentication token
   */
  private async getAuthToken(): Promise<string> {
    console.log('🔧 Attempting to get auth token...');
    console.log('🔧 App ID:', this.config.appId);
    console.log('🔧 Environment:', this.config.environment);
    console.log('🔧 Base URL:', this.getBaseUrl());
    
    // Global Payments requires app_id in the request body, not just in auth header
    const authUrl = `${this.getBaseUrl()}/accesstoken`;
    const credentials = Buffer.from(`${this.config.appId}:${this.config.appKey}`).toString('base64');
    
    console.log('🔧 Auth URL:', authUrl);
    console.log('🔧 App ID being used:', this.config.appId);
    console.log('🔧 App Key being used:', this.config.appKey);
    console.log('🔧 Credentials (base64 length):', credentials.length);
    console.log('🔧 Basic Auth Header:', `Basic ${credentials}`);
    
    // Generate unique nonce for this request
    const nonce = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    console.log('🔧 Generated nonce:', nonce);
    
    // Calculate secret using SHA512 hash according to Global Payments docs
    // secret = SHA512(nonce + app_key)
    const secretInput = nonce + this.config.appKey;
    const secret = crypto.createHash('sha512').update(secretInput).digest('hex');
    console.log('🔧 Secret input (nonce + app_key):', secretInput);
    console.log('🔧 Calculated SHA512 secret (first 20 chars):', secret.substring(0, 20) + '...');
    
    // Updated approach - include app_id, secret (SHA512 hashed), and nonce in the request body
    try {
      const response = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-GP-Version': '2021-03-22'
        },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          app_id: this.config.appId,
          secret: secret, // SHA512 hashed secret
          nonce: nonce
        })
      });

      console.log('🔧 Auth response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔧 Auth response keys:', Object.keys(data));
        console.log('🔧 Auth response token field:', data.token ? 'token found' : 'token missing');
        console.log('🔧 Auth response access_token field:', data.access_token ? 'access_token found' : 'access_token missing');
        console.log('🔧 Full auth response:', JSON.stringify(data, null, 2));
        
        const token = data.token || data.access_token;
        if (!token) {
          console.error('❌ No token found in JSON response:', data);
          throw new Error('No token found in JSON authentication response');
        }
        
        console.log('✅ Auth token obtained successfully, length:', token.length);
        console.log('🔧 Token (first 20 chars):', token.substring(0, 20) + '...');
        return token;
      }
      
      const errorText = await response.text();
      console.error('❌ JSON auth failed:', errorText);
      
      // Try alternative format if JSON fails
      const formResponse = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'X-GP-Version': '2021-03-22'
        },
        body: `grant_type=client_credentials&app_id=${this.config.appId}&secret=${secret}&nonce=${nonce}`
      });

      console.log('🔧 Form auth response status:', formResponse.status);
      
      if (formResponse.ok) {
        const data = await formResponse.json();
        console.log('🔧 Auth response keys:', Object.keys(data));
        console.log('🔧 Auth response token field:', data.token ? 'token found' : 'token missing');
        console.log('🔧 Auth response access_token field:', data.access_token ? 'access_token found' : 'access_token missing');
        
        const token = data.token || data.access_token;
        if (!token) {
          console.error('❌ No token found in response:', data);
          throw new Error('No token found in authentication response');
        }
        
        console.log('✅ Auth token obtained successfully, length:', token.length);
        console.log('🔧 Token (first 20 chars):', token.substring(0, 20) + '...');
        return token;
      }
      
      const formErrorText = await formResponse.text();
      console.error('❌ Form auth failed:', formErrorText);
      throw new Error(`Authentication failed: ${formResponse.status} ${formResponse.statusText} - ${formErrorText}`);
      
    } catch (error) {
      console.error('❌ Auth request failed:', error);
      throw error instanceof Error ? error : new Error('Authentication failed');
    }
  }

  /**
   * Test the connection to Global Payments
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔧 Testing Global Payments connection...');
      
      const token = await this.getAuthToken();
      
      if (token) {
        return {
          success: true,
          message: 'Connection test successful - authentication token obtained'
        };
      } else {
        return {
          success: false,
          message: 'Failed to obtain authentication token'
        };
      }

    } catch (error) {
      console.error('Global Payments connection test failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed'
      };
    }
  }

  /**
   * Process a direct card payment
   */
  async processCardPayment(
    paymentRequest: PaymentRequest,
    cardData: {
      number: string;
      expMonth: number;
      expYear: number;
      cvv: string;
      holderName: string;
    }
  ): Promise<{
    success: boolean;
    transactionId?: string;
    authCode?: string;
    error?: string;
  }> {
    try {
      console.log('💳 Processing card payment for amount:', paymentRequest.amount);
      
      const token = await this.getAuthToken();
      
    // Prepare payment data following Global Payments official API documentation
    const paymentData: any = {
      account_name: 'transaction_processing', // Use account name instead of ID based on docs
      channel: 'CNP', // Card Not Present
      capture_mode: 'AUTO',
      type: 'SALE',
      amount: (paymentRequest.amount * 100).toString(), // Convert to string as per docs
      currency: paymentRequest.currency,
      reference: paymentRequest.orderId,
      country: 'GB', // UK
      payment_method: {
        name: paymentRequest.customerName || cardData.holderName || 'Customer',
        entry_mode: 'ECOM', // Ecommerce entry mode as per official docs
        card: {
          number: cardData.number,
          expiry_month: cardData.expMonth.toString().padStart(2, '0'),
          expiry_year: cardData.expYear.toString().slice(-2), // Convert to 2-digit year (2028 -> 28)
          cvv: cardData.cvv,
        }
      }
    };

      // Add billing address if provided
      if (paymentRequest.billingAddress) {
        paymentData.payment_method.card.billing_address = {
          line_1: paymentRequest.billingAddress.streetAddress1,
          line_2: paymentRequest.billingAddress.streetAddress2 || '',
          city: paymentRequest.billingAddress.city,
          state: paymentRequest.billingAddress.state || '',
          postal_code: paymentRequest.billingAddress.postalCode,
          country: paymentRequest.billingAddress.countryCode
        };
      }

      console.log('🔧 Payment data prepared:', JSON.stringify(paymentData, null, 2));
      console.log('🔧 Sending payment request to Global Payments...');
      console.log('🔧 Transaction URL:', `${this.getBaseUrl()}/transactions`);
      console.log('🔧 Token being used (first 20 chars):', token?.substring(0, 20) + '...');

      const response = await fetch(`${this.getBaseUrl()}/transactions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-GP-Version': '2021-03-22'
        },
        body: JSON.stringify(paymentData)
      });

      console.log('🔧 Payment response status:', response.status);
      console.log('🔧 Payment response headers:', Object.fromEntries(response.headers.entries()));
      
      const result = await response.json();
      console.log('🔧 Payment response body:', JSON.stringify(result, null, 2));

      if (response.ok && (result.status === 'CAPTURED' || result.status === 'SUCCESS')) {
        console.log('✅ Payment successful!');
        return {
          success: true,
          transactionId: result.id,
          authCode: result.payment_method?.card?.authcode
        };
      } else {
        console.log('❌ Payment failed');
        return {
          success: false,
          error: result.message || result.detailed_error_description || result.error_description || 'Payment failed'
        };
      }

    } catch (error) {
      console.error('Card payment processing failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment processing failed'
      };
    }
  }

  /**
   * Verify a payment transaction
   */
  async verifyTransaction(transactionId: string): Promise<{
    success: boolean;
    status?: string;
    amount?: number;
    currency?: string;
    error?: string;
  }> {
    try {
      const token = await this.getAuthToken();
      
      const response = await fetch(`${this.getBaseUrl()}/transactions/${transactionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-GP-Version': '2021-03-22'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        status: result.status,
        amount: result.amount ? result.amount / 100 : 0, // Convert from cents
        currency: result.currency
      };

    } catch (error) {
      console.error('Transaction verification failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Verification failed'
      };
    }
  }

  /**
   * Refund a transaction
   */
  async refundTransaction(
    transactionId: string, 
    amount?: number
  ): Promise<{
    success: boolean;
    refundId?: string;
    error?: string;
  }> {
    try {
      const token = await this.getAuthToken();
      
      const refundData: any = {
        type: 'REFUND'
      };

      if (amount) {
        refundData.amount = Math.round(amount * 100); // Convert to cents
      }

      const response = await fetch(`${this.getBaseUrl()}/transactions/${transactionId}/refund`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-GP-Version': '2021-03-22'
        },
        body: JSON.stringify(refundData)
      });

      const result = await response.json();

      if (response.ok && result.status === 'SUCCESS') {
        return {
          success: true,
          refundId: result.id
        };
      } else {
        return {
          success: false,
          error: result.detailed_error_description || result.error_description || 'Refund failed'
        };
      }

    } catch (error) {
      console.error('Refund processing failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Refund failed'
      };
    }
  }
}

/**
 * Create a Global Payments SDK service instance
 */
export function createGlobalPaymentsSDKService(config: GlobalPaymentsConfig): GlobalPaymentsSDKService {
  return new GlobalPaymentsSDKService(config);
}
