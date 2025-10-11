// Global Payments REST API Service
// Based on: https://developer.globalpay.com/docs/payments/online/api-guide

// Global Payments Configuration Interface
export interface GlobalPaymentsConfig {
  appId: string;
  appKey: string;
  environment: 'sandbox' | 'production';
  accountName?: string;
}

// Payment Request Interface
export interface PaymentRequest {
  amount: number;
  currency: string;
  reference?: string;
  card: {
    number: string;
    expiry_month: string;
    expiry_year: string;
    cvv: string;
    cardholder_name: string;
  };
  billing_address?: {
    line_1?: string;
    line_2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  description?: string;
}

// Payment Response Interface
export interface PaymentResponse {
  success: boolean;
  id?: string;
  status?: string;
  amount?: number;
  currency?: string;
  reference?: string;
  time_created?: string;
  auth_code?: string;
  batch_id?: string;
  error?: string;
  message?: string;
}

// Access Token Response
interface AccessTokenResponse {
  token: string;
  type: string;
  app_id: string;
  app_name: string;
  time_created: string;
  seconds_to_expire: number;
  email: string;
}

// Global Payments REST API Service Class
export class GlobalPaymentsService {
  private config: GlobalPaymentsConfig;
  private baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: GlobalPaymentsConfig) {
    this.config = config;
    // Updated URLs based on official documentation
    this.baseUrl = config.environment === 'production' 
      ? 'https://apis.globalpay.com/ucp' 
      : 'https://apis.sandbox.globalpay.com/ucp';
  }

  /**
   * Get or refresh access token
   */
  private async getAccessToken(): Promise<string> {
    // Check if current token is still valid (with 5 minute buffer)
    if (this.accessToken && Date.now() < (this.tokenExpiry - 300000)) {
      return this.accessToken;
    }

    try {
      const requestBody = {
        app_id: this.config.appId,
        nonce: this.generateNonce(),
        grant_type: 'client_credentials',
        secret: this.config.appKey
      };

      // Add debugging info
      console.log('Global Payments Auth Request:', {
        url: `${this.baseUrl}/accesstoken`,
        appId: this.config.appId,
        secretLength: this.config.appKey?.length || 0,
        environment: this.baseUrl.includes('sandbox') ? 'sandbox' : 'production'
      });

      const response = await fetch(`${this.baseUrl}/accesstoken`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-GP-Version': '2021-03-22'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Global Payments Auth Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`Token request failed: ${response.status} ${errorText}`);
      }

      const tokenData: AccessTokenResponse = await response.json();
      
      // Add logging to debug token response
      console.log('Token response received:', {
        hasToken: !!tokenData.token,
        expiresIn: tokenData.seconds_to_expire,
        appId: tokenData.app_id
      });
      
      this.accessToken = tokenData.token;
      this.tokenExpiry = Date.now() + (tokenData.seconds_to_expire * 1000);
      
      return this.accessToken;
    } catch (error) {
      console.error('Error getting access token:', error);
      throw new Error('Failed to authenticate with Global Payments');
    }
  }

  /**
   * Generate a unique nonce for authentication
   */
  private generateNonce(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * Process a payment charge (sale)
   */
  async charge(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const token = await this.getAccessToken();
      
      console.log('🔧 Preparing Global Payments charge request:', {
        amount: request.amount,
        currency: request.currency,
        reference: request.reference,
        environment: this.baseUrl
      });
      
      const paymentData = {
        account_name: this.config.accountName || 'transaction_processing',
        channel: 'CNP', // Card Not Present
        capture_mode: 'AUTO',
        type: 'SALE',
        amount: Math.round(request.amount * 100).toString(), // Convert to cents as string
        currency: request.currency,
        reference: request.reference || `ref_${Date.now()}`,
        country: 'GB',
        payment_method: {
          name: request.card.cardholder_name,
          entry_mode: 'ECOM',
          card: {
            number: request.card.number.replace(/\s/g, ''),
            expiry_month: request.card.expiry_month.padStart(2, '0'),
            expiry_year: request.card.expiry_year.length === 2 ? `20${request.card.expiry_year}` : request.card.expiry_year,
            cvv: request.card.cvv,
            ...(request.billing_address && {
              avs_address: request.billing_address.line_1,
              avs_postal_code: request.billing_address.postal_code
            })
          }
        },
        ...(request.description && {
          description: request.description
        })
      };

      console.log('🚀 Sending transaction request to Global Payments:', {
        url: `${this.baseUrl}/transactions`,
        amount: paymentData.amount,
        currency: paymentData.currency,
        cardLastFour: paymentData.payment_method.card.number.slice(-4),
        cardExpiry: `${paymentData.payment_method.card.expiry_month}/${paymentData.payment_method.card.expiry_year}`,
        accountName: paymentData.account_name
      });

      const response = await fetch(`${this.baseUrl}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-GP-Version': '2021-03-22',
          'X-GP-Idempotency': this.generateNonce()
        },
        body: JSON.stringify(paymentData)
      });

      const result = await response.json();

      // Enhanced logging to debug transaction response
      console.log('📊 Global Payments transaction response:', {
        status: result.status,
        success: response.ok,
        hasId: !!result.id,
        errorCode: result.error_code,
        responseStatus: response.status,
        responseStatusText: response.statusText,
        fullResult: result
      });

      if (!response.ok) {
        console.error('❌ Transaction failed with response:', {
          status: response.status,
          statusText: response.statusText,
          errorCode: result.error_code,
          errorDescription: result.detailed_error_description,
          fullError: result
        });
        return {
          success: false,
          error: result.error_code || 'TRANSACTION_FAILED',
          message: result.detailed_error_description || result.error_description || 'Payment processing failed'
        };
      }

      const isSuccessful = result.status === 'CAPTURED';
      console.log('✅ Transaction result:', {
        successful: isSuccessful,
        transactionStatus: result.status,
        transactionId: result.id,
        authCode: result.payment_method?.card?.authcode
      });

      return {
        success: isSuccessful,
        id: result.id,
        status: result.status,
        amount: result.amount ? parseInt(result.amount) / 100 : request.amount, // Convert back from cents
        currency: result.currency,
        reference: result.reference,
        time_created: result.time_created,
        auth_code: result.payment_method?.card?.authcode,
        batch_id: result.batch_id,
        message: isSuccessful ? 'Payment successful' : result.payment_method?.message || 'Payment processed'
      };

    } catch (error) {
      console.error('💥 Global Payments charge error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Process a payment authorization (auth only)
   */
  async authorize(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const token = await this.getAccessToken();
      
      const paymentData = {
        account_name: this.config.accountName || 'transaction_processing',
        channel: 'CNP',
        type: 'AUTH', // Authorization only
        amount: Math.round(request.amount * 100).toString(),
        currency: request.currency,
        reference: request.reference || `auth_${Date.now()}`,
        country: 'GB',
        payment_method: {
          name: request.card.cardholder_name,
          entry_mode: 'ECOM',
          card: {
            number: request.card.number.replace(/\s/g, ''),
            expiry_month: request.card.expiry_month.padStart(2, '0'),
            expiry_year: request.card.expiry_year.length === 2 ? `20${request.card.expiry_year}` : request.card.expiry_year,
            cvv: request.card.cvv,
            ...(request.billing_address && {
              avs_address: request.billing_address.line_1,
              avs_postal_code: request.billing_address.postal_code
            })
          }
        },
        ...(request.description && {
          description: request.description
        })
      };

      const response = await fetch(`${this.baseUrl}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-GP-Version': '2021-03-22',
          'X-GP-Idempotency': this.generateNonce()
        },
        body: JSON.stringify(paymentData)
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error_code || 'AUTHORIZATION_FAILED',
          message: result.detailed_error_description || result.error_description || 'Authorization failed'
        };
      }

      return {
        success: result.status === 'PREAUTHORIZED',
        id: result.id,
        status: result.status,
        amount: result.amount ? parseInt(result.amount) / 100 : request.amount,
        currency: result.currency,
        reference: result.reference,
        time_created: result.time_created,
        auth_code: result.payment_method?.card?.authcode,
        batch_id: result.batch_id,
        message: result.status === 'PREAUTHORIZED' ? 'Authorization successful' : result.payment_method?.message || 'Authorization processed'
      };

    } catch (error) {
      console.error('Global Payments authorize error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Capture a previously authorized payment
   */
  async capture(transactionId: string, amount?: number): Promise<PaymentResponse> {
    try {
      const token = await this.getAccessToken();
      
      const captureData = {
        ...(amount && { amount: Math.round(amount * 100).toString() })
      };

      const response = await fetch(`${this.baseUrl}/transactions/${transactionId}/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-GP-Version': '2021-03-22'
        },
        body: JSON.stringify(captureData)
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error_code || 'CAPTURE_FAILED',
          message: result.detailed_error_description || result.error_description || 'Capture failed'
        };
      }

      return {
        success: result.status === 'SUCCESS',
        id: result.id,
        status: result.status,
        amount: result.amount ? result.amount / 100 : amount,
        message: result.status === 'SUCCESS' ? 'Capture successful' : result.gateway_response_message
      };

    } catch (error) {
      console.error('Global Payments capture error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Refund a transaction
   */
  async refund(transactionId: string, amount?: number): Promise<PaymentResponse> {
    try {
      const token = await this.getAccessToken();
      
      const refundData = {
        ...(amount && { amount: Math.round(amount * 100).toString() })
      };

      const response = await fetch(`${this.baseUrl}/transactions/${transactionId}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-GP-Version': '2021-03-22'
        },
        body: JSON.stringify(refundData)
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error_code || 'REFUND_FAILED',
          message: result.detailed_error_description || result.error_description || 'Refund failed'
        };
      }

      return {
        success: result.status === 'SUCCESS',
        id: result.id,
        status: result.status,
        amount: result.amount ? result.amount / 100 : amount,
        message: result.status === 'SUCCESS' ? 'Refund successful' : result.gateway_response_message
      };

    } catch (error) {
      console.error('Global Payments refund error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Validate card details
   */
  validateCard(card: PaymentRequest['card']): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Basic card number validation (Luhn algorithm)
    const cardNumber = card.number.replace(/\s/g, '');
    if (!/^\d{13,19}$/.test(cardNumber)) {
      errors.push('Invalid card number format');
    } else if (!this.luhnCheck(cardNumber)) {
      errors.push('Invalid card number');
    }
    
    // Expiry validation
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    const expMonth = parseInt(card.expiry_month);
    const expYear = parseInt(card.expiry_year);
    const fullYear = expYear < 100 ? 2000 + expYear : expYear;
    
    if (expMonth < 1 || expMonth > 12) {
      errors.push('Invalid expiry month');
    }
    
    if (fullYear < currentYear || (fullYear === currentYear && expMonth < currentMonth)) {
      errors.push('Card has expired');
    }
    
    // CVV validation - allow 3-4 digits
    if (!card.cvv || !/^\d{3,4}$/.test(card.cvv.toString())) {
      errors.push('Invalid CVV');
    }
    
    // Cardholder name validation - allow any non-empty string
    if (!card.cardholder_name || card.cardholder_name.trim().length < 1) {
      errors.push('Invalid cardholder name');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Luhn algorithm for card number validation
   */
  private luhnCheck(cardNumber: string): boolean {
    let sum = 0;
    let isEven = false;
    
    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber[i]);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  }

  /**
   * Test connection to Global Payments
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const token = await this.getAccessToken();
      return {
        success: true,
        message: 'Successfully connected to Global Payments'
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }
}

// Factory function to create Global Payments service
export function createGlobalPaymentsService(config: GlobalPaymentsConfig): GlobalPaymentsService {
  return new GlobalPaymentsService(config);
}
