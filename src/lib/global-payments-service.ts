import crypto from 'crypto';

// Global Payments Configuration Interface
export interface GlobalPaymentsConfig {
  appId: string;
  appKey: string;
  environment: 'sandbox' | 'production';
  accountName?: string;
  sharedSecret: string;
  merchantId: string;
  accountId: string;
  refundPassword: string;
}

// Payment Request Interface
export interface PaymentRequest {
  amount: number;
  currency: string;
  orderRef: string;
  card: {
    number: string;
    expMonth: string;
    expYear: string;
    cvn: string;
    cardHolderName: string;
  };
  billingAddress?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  customerReference?: string;
  description?: string;
}

// Payment Response Interface
export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  responseCode?: string;
  responseMessage?: string;
  amount?: number;
  currency?: string;
  timestamp?: string;
  authCode?: string;
  avsResponseCode?: string;
  cvnResponseCode?: string;
  error?: string;
  batchId?: string;
}

// Refund Request Interface
export interface RefundRequest {
  transactionId: string;
  amount?: number;
  currency: string;
  reason?: string;
}

// Global Payments Service Class
export class GlobalPaymentsService {
  private config: GlobalPaymentsConfig;
  private baseUrl: string;

  constructor(config: GlobalPaymentsConfig) {
    this.config = config;
    this.baseUrl = config.environment === 'production' 
      ? 'https://api.globalpay.com' 
      : 'https://cert.api.globalpay.com';
  }

  /**
   * Generate timestamp for requests
   */
  private generateTimestamp(): string {
    return new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  }

  /**
   * Generate hash for Global Payments authentication
   */
  private generateHash(
    timestamp: string,
    merchantId: string,
    orderRef: string,
    amount: string,
    currency: string
  ): string {
    const hashString = `${timestamp}.${merchantId}.${orderRef}.${amount}.${currency}`;
    const hash1 = crypto.createHash('sha1').update(hashString).digest('hex');
    return crypto.createHash('sha1').update(`${hash1}.${this.config.sharedSecret}`).digest('hex');
  }

  /**
   * Generate hash for refund requests
   */
  private generateRefundHash(
    timestamp: string,
    merchantId: string,
    orderRef: string,
    amount: string,
    currency: string,
    password: string
  ): string {
    const hashString = `${timestamp}.${merchantId}.${orderRef}.${amount}.${currency}`;
    const hash1 = crypto.createHash('sha1').update(hashString).digest('hex');
    return crypto.createHash('sha1').update(`${hash1}.${password}`).digest('hex');
  }

  /**
   * Process a payment authorization
   */
  async authorize(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const timestamp = this.generateTimestamp();
      const orderRef = request.orderRef || `order_${Date.now()}`;
      const amountStr = (request.amount * 100).toString(); // Convert to cents
      
      const hash = this.generateHash(
        timestamp,
        this.config.merchantId,
        orderRef,
        amountStr,
        request.currency
      );

      const paymentData = {
        MERCHANT_ID: this.config.merchantId,
        ACCOUNT: this.config.accountId,
        ORDER_ID: orderRef,
        AMOUNT: amountStr,
        CURRENCY: request.currency,
        TIMESTAMP: timestamp,
        SHA1HASH: hash,
        AUTO_SETTLE_FLAG: '0', // 0 for auth only, 1 for auth+capture
        CARD_NUMBER: request.card.number,
        CARD_EXPIRY: `${request.card.expMonth}${request.card.expYear.slice(-2)}`,
        CARD_TYPE: this.detectCardType(request.card.number),
        CARD_HOLDER_NAME: request.card.cardHolderName,
        CVN: {
          NUMBER: request.card.cvn,
          PRESIND: '1'
        },
        COMMENT1: request.description || 'Online Order Payment',
        COMMENT2: request.customerReference || '',
        // Add billing address if provided
        ...(request.billingAddress && {
          BILLING_ADDRESS: {
            LINE1: request.billingAddress.line1,
            LINE2: request.billingAddress.line2,
            CITY: request.billingAddress.city,
            STATE: request.billingAddress.state,
            POSTCODE: request.billingAddress.postalCode,
            COUNTRY: request.billingAddress.country || 'GB'
          }
        })
      };

      const xmlRequest = this.buildXmlRequest('auth', paymentData);
      const response = await this.sendRequest(xmlRequest);
      
      return this.parseResponse(response);
    } catch (error) {
      console.error('Global Payments authorization error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Process a payment authorization and capture (sale)
   */
  async charge(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const timestamp = this.generateTimestamp();
      const orderRef = request.orderRef || `order_${Date.now()}`;
      const amountStr = (request.amount * 100).toString(); // Convert to cents
      
      const hash = this.generateHash(
        timestamp,
        this.config.merchantId,
        orderRef,
        amountStr,
        request.currency
      );

      const paymentData = {
        MERCHANT_ID: this.config.merchantId,
        ACCOUNT: this.config.accountId,
        ORDER_ID: orderRef,
        AMOUNT: amountStr,
        CURRENCY: request.currency,
        TIMESTAMP: timestamp,
        SHA1HASH: hash,
        AUTO_SETTLE_FLAG: '1', // 1 for immediate capture
        CARD_NUMBER: request.card.number,
        CARD_EXPIRY: `${request.card.expMonth}${request.card.expYear.slice(-2)}`,
        CARD_TYPE: this.detectCardType(request.card.number),
        CARD_HOLDER_NAME: request.card.cardHolderName,
        CVN: {
          NUMBER: request.card.cvn,
          PRESIND: '1'
        },
        COMMENT1: request.description || 'Online Order Payment',
        COMMENT2: request.customerReference || '',
        // Add billing address if provided
        ...(request.billingAddress && {
          BILLING_ADDRESS: {
            LINE1: request.billingAddress.line1,
            LINE2: request.billingAddress.line2,
            CITY: request.billingAddress.city,
            STATE: request.billingAddress.state,
            POSTCODE: request.billingAddress.postalCode,
            COUNTRY: request.billingAddress.country || 'GB'
          }
        })
      };

      const xmlRequest = this.buildXmlRequest('auth', paymentData);
      const response = await this.sendRequest(xmlRequest);
      
      return this.parseResponse(response);
    } catch (error) {
      console.error('Global Payments charge error:', error);
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
      const timestamp = this.generateTimestamp();
      const orderRef = `capture_${Date.now()}`;
      const amountStr = amount ? (amount * 100).toString() : '';
      
      const hash = this.generateHash(
        timestamp,
        this.config.merchantId,
        orderRef,
        amountStr,
        'GBP' // Default currency for capture
      );

      const captureData = {
        MERCHANT_ID: this.config.merchantId,
        ACCOUNT: this.config.accountId,
        ORDER_ID: orderRef,
        PASREF: transactionId,
        AUTHCODE: '', // Will be filled from original transaction
        TIMESTAMP: timestamp,
        SHA1HASH: hash,
        ...(amount && { AMOUNT: amountStr })
      };

      const xmlRequest = this.buildXmlRequest('settle', captureData);
      const response = await this.sendRequest(xmlRequest);
      
      return this.parseResponse(response);
    } catch (error) {
      console.error('Global Payments capture error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Process a refund
   */
  async refund(request: RefundRequest): Promise<PaymentResponse> {
    try {
      if (!this.config.refundPassword) {
        throw new Error('Refund password not configured');
      }

      const timestamp = this.generateTimestamp();
      const orderRef = `refund_${Date.now()}`;
      const amountStr = request.amount ? (request.amount * 100).toString() : '';
      
      const hash = this.generateRefundHash(
        timestamp,
        this.config.merchantId,
        orderRef,
        amountStr,
        request.currency,
        this.config.refundPassword
      );

      const refundData = {
        MERCHANT_ID: this.config.merchantId,
        ACCOUNT: this.config.accountId,
        ORDER_ID: orderRef,
        PASREF: request.transactionId,
        AUTHCODE: '', // Will be filled from original transaction
        TIMESTAMP: timestamp,
        SHA1HASH: hash,
        REFUND_HASH: this.config.refundPassword,
        CURRENCY: request.currency,
        ...(request.amount && { AMOUNT: amountStr }),
        ...(request.reason && { COMMENT1: request.reason })
      };

      const xmlRequest = this.buildXmlRequest('rebate', refundData);
      const response = await this.sendRequest(xmlRequest);
      
      return this.parseResponse(response);
    } catch (error) {
      console.error('Global Payments refund error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Detect card type from card number
   */
  private detectCardType(cardNumber: string): string {
    const number = cardNumber.replace(/\s/g, '');
    
    if (/^4/.test(number)) return 'VISA';
    if (/^5[1-5]/.test(number)) return 'MC';
    if (/^3[47]/.test(number)) return 'AMEX';
    if (/^6(?:011|5)/.test(number)) return 'DINERS';
    
    return 'VISA'; // Default fallback
  }

  /**
   * Build XML request for Global Payments API
   */
  private buildXmlRequest(type: string, data: any): string {
    const xmlParts = ['<?xml version="1.0" encoding="UTF-8"?>'];
    xmlParts.push(`<request type="${type}" timestamp="${data.TIMESTAMP}">`);
    
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'CVN' && typeof value === 'object') {
        xmlParts.push('<cvn>');
        xmlParts.push(`<number>${(value as any).NUMBER}</number>`);
        xmlParts.push(`<presind>${(value as any).PRESIND}</presind>`);
        xmlParts.push('</cvn>');
      } else if (key === 'BILLING_ADDRESS' && typeof value === 'object') {
        xmlParts.push('<billing>');
        Object.entries(value as object).forEach(([addrKey, addrValue]) => {
          if (addrValue) {
            xmlParts.push(`<${addrKey.toLowerCase()}>${addrValue}</${addrKey.toLowerCase()}>`);
          }
        });
        xmlParts.push('</billing>');
      } else if (typeof value === 'string' || typeof value === 'number') {
        xmlParts.push(`<${key.toLowerCase()}>${value}</${key.toLowerCase()}>`);
      }
    });
    
    xmlParts.push('</request>');
    
    return xmlParts.join('\n');
  }

  /**
   * Send HTTP request to Global Payments API
   */
  private async sendRequest(xmlData: string): Promise<string> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        'User-Agent': 'OrderWeb-GlobalPayments/1.0'
      },
      body: xmlData
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.text();
  }

  /**
   * Parse XML response from Global Payments
   */
  private parseResponse(xmlResponse: string): PaymentResponse {
    try {
      // Simple XML parsing - in production, use a proper XML parser
      const resultMatch = xmlResponse.match(/<result>([^<]+)<\/result>/);
      const messageMatch = xmlResponse.match(/<message>([^<]+)<\/message>/);
      const pasrefMatch = xmlResponse.match(/<pasref>([^<]+)<\/pasref>/);
      const authcodeMatch = xmlResponse.match(/<authcode>([^<]+)<\/authcode>/);
      const batchidMatch = xmlResponse.match(/<batchid>([^<]+)<\/batchid>/);
      const timestampMatch = xmlResponse.match(/<timestamp>([^<]+)<\/timestamp>/);
      const orderidMatch = xmlResponse.match(/<orderid>([^<]+)<\/orderid>/);
      
      const resultCode = resultMatch ? resultMatch[1] : '';
      const isSuccess = resultCode === '00';
      
      return {
        success: isSuccess,
        responseCode: resultCode,
        responseMessage: messageMatch ? messageMatch[1] : '',
        transactionId: pasrefMatch ? pasrefMatch[1] : '',
        authCode: authcodeMatch ? authcodeMatch[1] : '',
        batchId: batchidMatch ? batchidMatch[1] : '',
        timestamp: timestampMatch ? timestampMatch[1] : '',
        error: !isSuccess ? messageMatch?.[1] || 'Transaction failed' : undefined
      };
    } catch (error) {
      console.error('Error parsing Global Payments response:', error);
      return {
        success: false,
        error: 'Failed to parse payment response'
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
    
    const expMonth = parseInt(card.expMonth);
    const expYear = parseInt(card.expYear);
    
    if (expMonth < 1 || expMonth > 12) {
      errors.push('Invalid expiry month');
    }
    
    if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
      errors.push('Card has expired');
    }
    
    // CVN validation
    if (!/^\d{3,4}$/.test(card.cvn)) {
      errors.push('Invalid CVN');
    }
    
    // Cardholder name validation
    if (!card.cardHolderName || card.cardHolderName.length < 2) {
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
}

// Factory function to create Global Payments service
export function createGlobalPaymentsService(config: GlobalPaymentsConfig): GlobalPaymentsService {
  return new GlobalPaymentsService(config);
}

// Types are already exported inline above
