// Worldpay Access API Service
// Based on: https://developer.worldpay.com/products/access/card-payments/

// Worldpay Configuration Interface
export interface WorldpayConfig {
  merchantId: string;
  username: string;
  password: string;
  environment: 'sandbox' | 'production';
  entity?: string; // Default is 'default'
}

// Payment Request Interface
export interface WorldpayPaymentRequest {
  amount: number;
  currency: string;
  orderId: string;
  card: {
    number: string;
    expiry_month: string;
    expiry_year: string;
    cvv: string;
    cardholder_name: string;
  };
  billing_address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  description?: string;
}

// Payment Response Interface
export interface WorldpayPaymentResponse {
  success: boolean;
  paymentId?: string;
  outcome?: string;
  commandId?: string;
  authorizationCode?: string;
  cardBin?: string;
  lastFour?: string;
  cardBrand?: string;
  error?: string;
  message?: string;
  amount?: number;
  currency?: string;
  transactionReference?: string;
}

// Worldpay API Request Structure
interface WorldpayAPIRequest {
  transactionReference: string;
  channel: string;
  merchant: {
    entity: string;
  };
  instruction: {
    requestAutoSettlement: {
      enabled: boolean;
    };
    value: {
      currency: string;
      amount: number;
    };
    narrative: {
      line1: string;
    };
    paymentInstrument: {
      type: string;
      cardNumber: string;
      expiryDate: {
        month: number;
        year: number;
      };
      cvc?: string;
    };
  };
}

// Worldpay API Response Structure
interface WorldpayAPIResponse {
  outcome: string;
  paymentId: string;
  commandId: string;
  issuer?: {
    authorizationCode: string;
  };
  paymentInstrument?: {
    type: string;
    cardBin: string;
    lastFour: string;
    cardBrand: string;
    category: string;
    countryCode: string;
    fundingType: string;
    issuerName: string;
  };
  scheme?: {
    reference: string;
  };
  _links?: {
    [key: string]: {
      href: string;
    };
  };
}

export class WorldpayService {
  private config: WorldpayConfig;
  private baseUrl: string;
  private authHeader: string;

  constructor(config: WorldpayConfig) {
    this.config = config;
    this.baseUrl = config.environment === 'production' 
      ? 'https://access.worldpay.com' 
      : 'https://try.access.worldpay.com';
    
    // Create Basic Auth header
    const credentials = Buffer.from(`${config.username}:${config.password}`).toString('base64');
    this.authHeader = `Basic ${credentials}`;
  }

  /**
   * Test connection to Worldpay API
   */
  async testConnection(): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      // Create a minimal test request to validate credentials
      const testRequest: WorldpayAPIRequest = {
        transactionReference: `test_${Date.now()}`,
        channel: 'ecom',
        merchant: {
          entity: this.config.entity || 'default'
        },
        instruction: {
          requestAutoSettlement: {
            enabled: false
          },
          value: {
            currency: 'GBP',
            amount: 100 // £1.00 test amount
          },
          narrative: {
            line1: 'Connection Test'
          },
          paymentInstrument: {
            type: 'card/plain',
            cardNumber: '4444333322221111', // Test card number
            expiryDate: {
              month: 12,
              year: 2025
            },
            cvc: '123'
          }
        }
      };

      const response = await fetch(`${this.baseUrl}/other/authorize`, {
        method: 'POST',
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/vnd.worldpay.payments-v7+json',
          'Accept': 'application/vnd.worldpay.payments-v7+json'
        },
        body: JSON.stringify(testRequest)
      });

      if (response.ok) {
        return {
          success: true,
          message: 'Worldpay connection test successful'
        };
      } else {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.message || `Connection test failed: ${response.status}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during connection test'
      };
    }
  }

  /**
   * Process a card payment
   */
  async processPayment(request: WorldpayPaymentRequest): Promise<WorldpayPaymentResponse> {
    try {
      // Convert request to Worldpay API format
      const worldpayRequest: WorldpayAPIRequest = {
        transactionReference: request.orderId,
        channel: 'ecom',
        merchant: {
          entity: this.config.entity || 'default'
        },
        instruction: {
          requestAutoSettlement: {
            enabled: true // Auto-settle payments
          },
          value: {
            currency: request.currency.toUpperCase(),
            amount: Math.round(request.amount * 100) // Convert to smallest currency unit
          },
          narrative: {
            line1: request.description || 'Online Order'
          },
          paymentInstrument: {
            type: 'card/plain',
            cardNumber: request.card.number.replace(/\s/g, ''),
            expiryDate: {
              month: parseInt(request.card.expiry_month),
              year: parseInt(request.card.expiry_year)
            },
            cvc: request.card.cvv
          }
        }
      };

      console.log('Worldpay Payment Request:', {
        url: `${this.baseUrl}/other/authorize`,
        transactionReference: worldpayRequest.transactionReference,
        amount: worldpayRequest.instruction.value.amount,
        currency: worldpayRequest.instruction.value.currency,
        cardLastFour: request.card.number.slice(-4)
      });

      const response = await fetch(`${this.baseUrl}/other/authorize`, {
        method: 'POST',
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/vnd.worldpay.payments-v7+json',
          'Accept': 'application/vnd.worldpay.payments-v7+json'
        },
        body: JSON.stringify(worldpayRequest)
      });

      const result: WorldpayAPIResponse = await response.json();

      if (response.ok && result.outcome === 'authorized') {
        return {
          success: true,
          paymentId: result.paymentId,
          outcome: result.outcome,
          commandId: result.commandId,
          authorizationCode: result.issuer?.authorizationCode,
          cardBin: result.paymentInstrument?.cardBin,
          lastFour: result.paymentInstrument?.lastFour,
          cardBrand: result.paymentInstrument?.cardBrand,
          amount: request.amount,
          currency: request.currency,
          transactionReference: request.orderId,
          message: 'Payment processed successfully'
        };
      } else {
        console.error('Worldpay Payment Error:', result);
        return {
          success: false,
          error: result.outcome === 'refused' ? 'Payment was declined' : 'Payment processing failed',
          message: result.outcome || 'Unknown error'
        };
      }
    } catch (error) {
      console.error('Worldpay Payment Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Payment processing failed'
      };
    }
  }

  /**
   * Authorize a payment (without settlement)
   */
  async authorize(request: WorldpayPaymentRequest): Promise<WorldpayPaymentResponse> {
    try {
      // Create authorization request (similar to processPayment but without auto-settlement)
      const worldpayRequest: WorldpayAPIRequest = {
        transactionReference: request.orderId,
        channel: 'ecom',
        merchant: {
          entity: this.config.entity || 'default'
        },
        instruction: {
          requestAutoSettlement: {
            enabled: false // Don't auto-settle
          },
          value: {
            currency: request.currency.toUpperCase(),
            amount: Math.round(request.amount * 100)
          },
          narrative: {
            line1: request.description || 'Online Order'
          },
          paymentInstrument: {
            type: 'card/plain',
            cardNumber: request.card.number.replace(/\s/g, ''),
            expiryDate: {
              month: parseInt(request.card.expiry_month),
              year: parseInt(request.card.expiry_year)
            },
            cvc: request.card.cvv
          }
        }
      };

      const response = await fetch(`${this.baseUrl}/other/authorize`, {
        method: 'POST',
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/vnd.worldpay.payments-v7+json',
          'Accept': 'application/vnd.worldpay.payments-v7+json'
        },
        body: JSON.stringify(worldpayRequest)
      });

      const result: WorldpayAPIResponse = await response.json();

      if (response.ok && result.outcome === 'authorized') {
        return {
          success: true,
          paymentId: result.paymentId,
          outcome: result.outcome,
          commandId: result.commandId,
          authorizationCode: result.issuer?.authorizationCode,
          cardBin: result.paymentInstrument?.cardBin,
          lastFour: result.paymentInstrument?.lastFour,
          cardBrand: result.paymentInstrument?.cardBrand,
          amount: request.amount,
          currency: request.currency,
          transactionReference: request.orderId,
          message: 'Payment authorized successfully'
        };
      } else {
        return {
          success: false,
          error: result.outcome === 'refused' ? 'Payment authorization declined' : 'Payment authorization failed',
          message: result.outcome || 'Unknown error'
        };
      }
    } catch (error) {
      console.error('Worldpay Authorization Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Payment authorization failed'
      };
    }
  }

  /**
   * Refund a payment
   */
  async refund(paymentId: string, amount?: number): Promise<WorldpayPaymentResponse> {
    try {
      // Note: Worldpay refunds typically use the settlement links returned from the original payment
      // For a full implementation, you'd need to store these links and use them for refunds
      console.log('Worldpay refund requested for payment:', paymentId, 'amount:', amount);
      
      // This is a placeholder - actual implementation would use the refund endpoint
      // with the specific payment links returned from the original transaction
      return {
        success: false,
        error: 'Refund functionality requires payment-specific refund links',
        message: 'Refunds must be processed through the payment-specific refund URLs'
      };
    } catch (error) {
      console.error('Worldpay refund error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Refund processing failed'
      };
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentId: string): Promise<WorldpayPaymentResponse> {
    try {
      // Query payment status using the events endpoint
      const response = await fetch(`${this.baseUrl}/payments/events/${paymentId}`, {
        method: 'GET',
        headers: {
          'Authorization': this.authHeader,
          'Accept': 'application/vnd.worldpay.payments-v7+json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        return {
          success: true,
          paymentId: paymentId,
          outcome: result.outcome,
          message: 'Payment status retrieved successfully'
        };
      } else {
        return {
          success: false,
          error: 'Failed to retrieve payment status',
          message: `Status query failed: ${response.status}`
        };
      }
    } catch (error) {
      console.error('Worldpay status query error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Status query failed'
      };
    }
  }
}

// Factory function to create Worldpay service instance
export function createWorldpayService(config: WorldpayConfig): WorldpayService {
  return new WorldpayService(config);
}
