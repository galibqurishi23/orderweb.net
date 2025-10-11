import { getTenantBySlug } from "@/lib/tenant-service";
import pool from "@/lib/db";

// Helper function to extract postcode from address
function extractPostcodeFromAddress(address: string): string | null {
  if (!address) return null;
  
  // UK postcode regex pattern (basic)
  const postcodeRegex = /([A-Z]{1,2}[0-9R][0-9A-Z]?\s*[0-9][A-BD-HJLNP-UW-Z]{2})/i;
  const match = address.match(postcodeRegex);
  
  return match ? match[1].trim() : null;
}

// Rotating email greeting messages
const EMAIL_GREETING_MESSAGES = [
  "Great choice!",
  "Good choice!",
  "Yummy Order!",
  "Perfect Order!",
  "Mouth-watering choice!"
];

interface OrderDetails {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  subtotal?: number;
  deliveryFee?: number;
  orderType: string;
  deliveryAddress?: string;
  specialInstructions?: string;
  restaurantName: string;
  // Payment information
  paymentMethod?: string; // 'cash', 'card', 'stripe', etc.
  paymentStatus?: string; // 'paid', 'pending', etc.
  // Timing information
  scheduledTime?: string; // Primary field for customer-selected scheduled time (from frontend)
  scheduledFor?: string; // For advance orders - when customer wants it
  scheduledDate?: string; // Alternative field name for scheduled date
  estimatedReadyTime?: string; // Calculated ready time for collection
  estimatedDeliveryTime?: string; // Calculated delivery time
  orderDate?: string; // When the order was placed
  isAdvanceOrder?: boolean; // Whether this is an advance order
  // Voucher/Discount information
  voucherCode?: string; // Voucher code used
  voucherDiscount?: number; // Discount amount from voucher
  discount?: number; // Total discount amount
}

interface TenantData {
  id?: string; // Tenant UUID
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  // Social media links
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    website?: string;
  };
  settings?: {
    logo?: string;
    primaryColor?: string;
    currency?: string;
    // Timing settings
    collectionTimeMinutes?: number;
    deliveryTimeMinutes?: number;
    collectionTimeSettings?: {
      collectionTimeMinutes: number;
      enabled: boolean;
      displayMessage: string;
    };
    deliveryTimeSettings?: {
      deliveryTimeMinutes: number;
      enabled: boolean;
      displayMessage: string;
    };
    [key: string]: any;
  };
}

interface EmailTemplateCustomization {
  logo: string;
  logoLink: string;
  logoPosition: 'left' | 'center' | 'right';
  footerMessage: string;
  socialLinks: {
    facebook: string;
    instagram: string;
    tiktok: string;
    website: string;
  };
  colors: {
    primary: string;
    secondary: string;
    text: string;
    background: string;
    accent: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
}

export class EmailTemplateService {
  
  /**
   * Generate social media links HTML
   */
  private generateSocialMediaLinks(tenantData: TenantData): string {
    // Social media section completely removed as requested
    return '';
  }

  /**
   * Get rotating greeting message for email templates
   * Each tenant has its own counter that cycles through predefined messages
   * Uses database for persistence with fallback to random selection
   */
  private async getRotatingGreetingMessage(tenantId: string): Promise<string> {
    try {
      console.log('🎯 Getting rotating greeting message for tenant:', tenantId);
      
      // Atomic operation: increment counter and get new value
      const [updateResult] = await pool.execute(`
        INSERT INTO tenant_email_message_counter (tenant_id, message_counter) 
        VALUES (?, 1)
        ON DUPLICATE KEY UPDATE 
        message_counter = message_counter + 1
      `, [tenantId]);

      // Get the current counter value
      const [rows] = await pool.execute(`
        SELECT message_counter FROM tenant_email_message_counter 
        WHERE tenant_id = ?
      `, [tenantId]);

      let messageIndex = 0;
      if (rows && (rows as any[]).length > 0) {
        const counter = (rows as any[])[0].message_counter;
        // Use modulo to cycle through messages (0-4)
        messageIndex = (counter - 1) % EMAIL_GREETING_MESSAGES.length;
        console.log('✅ Counter value:', counter, 'Message index:', messageIndex);
      } else {
        console.log('⚠️ No counter found, using first message');
      }

      const selectedMessage = EMAIL_GREETING_MESSAGES[messageIndex];
      console.log('🎉 Selected greeting message:', selectedMessage);
      
      return selectedMessage;
      
    } catch (error) {
      console.error('❌ Error getting rotating greeting message:', error);
      // Fallback: use random message if database fails
      const randomIndex = Math.floor(Math.random() * EMAIL_GREETING_MESSAGES.length);
      const fallbackMessage = EMAIL_GREETING_MESSAGES[randomIndex];
      console.log('🔄 Using fallback random message:', fallbackMessage);
      return fallbackMessage;
    }
  }

  public calculateOrderTiming(orderDetails: OrderDetails, tenantData: TenantData, zoneDeliveryTime?: number) {
    const now = new Date();
    const isDelivery = orderDetails.orderType?.toLowerCase() === 'delivery';
    const isCollection = orderDetails.orderType?.toLowerCase() === 'collection' || orderDetails.orderType?.toLowerCase() === 'pickup';
    
    // Get timing settings from tenant data with better fallback logic
    const collectionMinutes = tenantData.settings?.collectionTimeSettings?.collectionTimeMinutes || 
                              tenantData.settings?.collectionTimeMinutes || 30;
    
    // Use zone-specific delivery time if provided, otherwise use default
    const deliveryMinutes = zoneDeliveryTime || 
                           tenantData.settings?.deliveryTimeSettings?.deliveryTimeMinutes || 
                           tenantData.settings?.deliveryTimeMinutes || 45;
    
    console.log('⏱️ Email Timing Calculation:', {
      isDelivery,
      zoneDeliveryTime,
      deliveryMinutes,
      collectionMinutes,
      usingZoneTime: !!zoneDeliveryTime
    });
    
    // Enhanced advance order detection - must have valid scheduled date/time
    let isAdvanceOrder = false;
    let validScheduledDateTime = null;
    
    console.log('🔍 Advance Order Detection Debug:', {
      isAdvanceOrderFlag: orderDetails.isAdvanceOrder,
      scheduledTime: orderDetails.scheduledTime, // NEW PRIMARY FIELD
      scheduledFor: orderDetails.scheduledFor,
      scheduledDate: orderDetails.scheduledDate,
      orderType: orderDetails.orderType,
      currentTime: now.toISOString(),
      // Check all possible fields that might contain the scheduled date/time
      allOrderDetails: orderDetails
    });
    
    // Check if this is an advance order with valid scheduled date
    // Look for scheduled date/time in multiple possible fields
    const possibleScheduledFields = [
      orderDetails.scheduledFor,
      orderDetails.scheduledDate,
      (orderDetails as any).scheduledTime, // THIS IS THE KEY FIELD - passed from API
      (orderDetails as any).scheduled_for,
      (orderDetails as any).scheduled_date,
      (orderDetails as any).scheduled_time,
      (orderDetails as any).advance_order_date,
      (orderDetails as any).advance_order_time,
      (orderDetails as any).delivery_date,
      (orderDetails as any).collection_date,
      (orderDetails as any).order_date_time,
      (orderDetails as any).scheduledDateTime,
      (orderDetails as any).advanceOrderDate,
      (orderDetails as any).advanceOrderTime
    ];
    
    console.log('🔎 Checking all possible scheduled date fields:', possibleScheduledFields);
    
    if (orderDetails.isAdvanceOrder || orderDetails.scheduledTime || orderDetails.scheduledFor || orderDetails.scheduledDate || possibleScheduledFields.some(field => field)) {
      // Try to find the first valid scheduled date/time from all possible fields
      // Prioritize scheduledTime (from API) first, then other fields
      const scheduledDateTime = orderDetails.scheduledTime || possibleScheduledFields.find(field => field && field.trim() !== '') || orderDetails.scheduledFor || orderDetails.scheduledDate;
      console.log('📅 Found scheduled date/time:', scheduledDateTime, 'from scheduledTime field:', orderDetails.scheduledTime);
      
      if (scheduledDateTime) {
        try {
          const testDate = new Date(scheduledDateTime);
          console.log('📅 Parsed date:', testDate.toISOString(), 'Valid:', !isNaN(testDate.getTime()), 'Future:', testDate > now);
          
          if (!isNaN(testDate.getTime()) && testDate > now) {
            isAdvanceOrder = true;
            validScheduledDateTime = scheduledDateTime;
            console.log('✅ Valid advance order detected with scheduled date:', testDate.toISOString());
          } else {
            console.log('⚠️ Invalid or past scheduled date, treating as immediate order');
          }
        } catch (error) {
          console.log('⚠️ Invalid date format, treating as immediate order:', error);
        }
      }
    } else {
      console.log('❌ No advance order indicators found - treating as immediate order');
    }
    
    // Additional fallback: if isAdvanceOrder is explicitly set to true, force advance order handling
    if (orderDetails.isAdvanceOrder === true && !isAdvanceOrder) {
      console.log('🔄 Forcing advance order due to explicit isAdvanceOrder flag');
      isAdvanceOrder = true;
      
      // Try to construct the scheduled time from separate date and time fields if available
      const advanceOrderDate = (orderDetails as any).advance_order_date || (orderDetails as any).advanceOrderDate;
      const advanceOrderTime = (orderDetails as any).advance_order_time || (orderDetails as any).advanceOrderTime;
      
      if (advanceOrderDate && advanceOrderTime) {
        // Try to combine date and time
        try {
          const combinedDateTime = `${advanceOrderDate} ${advanceOrderTime}`;
          const testCombined = new Date(combinedDateTime);
          if (!isNaN(testCombined.getTime())) {
            validScheduledDateTime = testCombined.toISOString();
            console.log('✅ Successfully combined advance order date and time:', combinedDateTime);
          }
        } catch (error) {
          console.log('⚠️ Could not combine advance order date and time:', error);
        }
      }
      
      // Use current time + 4 hours as fallback if no valid scheduled time found
      validScheduledDateTime = validScheduledDateTime || new Date(now.getTime() + 14400000).toISOString(); // 4 hours
    }
    
    console.log('🕐 Order Timing Debug:', {
      now: now.toISOString(),
      isAdvanceOrder,
      isDelivery,
      isCollection,
      scheduledFor: orderDetails.scheduledFor,
      scheduledDate: orderDetails.scheduledDate,
      validScheduledDateTime,
      collectionMinutes,
      deliveryMinutes,
      orderType: orderDetails.orderType
    });
    
    let readyTime: Date;
    let displayTime: string;
    let timeMessage: string;
    
    if (isAdvanceOrder && validScheduledDateTime) {
      // For advance orders with valid scheduled time
      readyTime = new Date(validScheduledDateTime);
      
      displayTime = readyTime.toLocaleString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Europe/London'
      });
      
      // For advance orders, show full details with scheduled date and time
      const timeOnly = readyTime.toLocaleString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Europe/London'
      });
      
      const dateOnly = readyTime.toLocaleString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Europe/London'
      });
      
      if (isDelivery) {
        timeMessage = `Advance Order|${dateOnly} at ${timeOnly}`;
      } else {
        timeMessage = `Advance Order|${dateOnly} at ${timeOnly}`;
      }
      console.log('📅 Advance order display:', timeMessage);
    } else if (isAdvanceOrder) {
      // For advance orders without valid scheduled time, show generic advance order message
      console.log('🔄 Advance order detected but no valid scheduled time - using generic message');
      readyTime = new Date(now.getTime() + 14400000); // 4 hours from now as placeholder
      
      displayTime = 'Advance Order - Date and time as specified by customer';
      timeMessage = `Advance Order|Your advance order will be prepared at your requested date and time`;
      console.log('📅 Advance order generic display:', timeMessage);
    } else {
      // For immediate orders, calculate based on current time + preparation time
      const minutesToAdd = isDelivery ? deliveryMinutes : collectionMinutes;
      readyTime = new Date(now.getTime() + (minutesToAdd * 60000));
      
      console.log('⏱️ Immediate order calculation:', {
        minutesToAdd,
        currentTime: now.toISOString(),
        readyTime: readyTime.toISOString()
      });
      
      displayTime = readyTime.toLocaleString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Europe/London'
      });
      
      // For immediate orders, show "approximately X minutes" text
      if (isDelivery) {
        timeMessage = `Your order will be delivered by ${displayTime} (approximately ${deliveryMinutes} minutes)`;
      } else {
        timeMessage = `Your order will be ready for collection by ${displayTime} (approximately ${collectionMinutes} minutes)`;
      }
      console.log('⏰ Immediate order display:', timeMessage);
    }
    
    const result = {
      readyTime,
      displayTime,
      timeMessage,
      isAdvanceOrder,
      isDelivery,
      isCollection,
      minutesToReady: isAdvanceOrder ? 
        Math.max(0, Math.floor((readyTime.getTime() - now.getTime()) / 60000)) : 
        (isDelivery ? deliveryMinutes : collectionMinutes)
    };
    
    console.log('📋 Final timing result:', result);
    return result;
  }

  async getCustomTemplate(tenantSlug: string): Promise<EmailTemplateCustomization | null> {
    try {
      const tenant = await getTenantBySlug(tenantSlug);
      if (!tenant) return null;

      const connection = await pool.getConnection();
      const [customizationResult] = await connection.execute(
        `SELECT customization_data FROM email_template_customization WHERE tenant_id = ?`,
        [tenant.id]
      );
      connection.release();

      if (Array.isArray(customizationResult) && customizationResult.length > 0) {
        try {
          return JSON.parse((customizationResult[0] as any).customization_data);
        } catch (e) {
          console.error("Failed to parse customization data:", e);
          return null;
        }
      }

      return null;
    } catch (error) {
      console.error("Error fetching custom template:", error);
      return null;
    }
  }

  async generateOrderConfirmationEmail(
    tenantSlug: string,
    orderDetails: OrderDetails,
    tenantData: TenantData
  ): Promise<string> {
    // Get rotating greeting message for this tenant
    const greetingMessage = tenantData.id ? 
      await this.getRotatingGreetingMessage(tenantData.id) : 
      EMAIL_GREETING_MESSAGES[0]; // Fallback to first message if no tenant ID
    
    console.log('🎉 Using greeting message for email:', greetingMessage);
    
    // Get custom template
    const customTemplate = await this.getCustomTemplate(tenantSlug);
    
    // If no custom template, use default
    if (!customTemplate) {
      return this.generateDefaultTemplate(orderDetails, tenantData, greetingMessage);
    }

    // Generate custom template
    return this.generateCustomTemplate(orderDetails, tenantData, customTemplate, greetingMessage);
  }

  private generateDefaultTemplate(orderDetails: OrderDetails, tenantData: TenantData, greetingMessage: string): string {
    // Calculate timing information for default template too
    const timing = this.calculateOrderTiming(orderDetails, tenantData);
    
    // Calculate total items count
    const totalItems = orderDetails.items.reduce((sum, item) => sum + item.quantity, 0);
    
    // Determine payment method display
    const paymentMethodDisplay = orderDetails.paymentMethod === 'cash' ? 'Cash on Delivery/Collection' : 
                                orderDetails.paymentMethod === 'card' || orderDetails.paymentMethod === 'stripe' ? 'Card Payment' :
                                orderDetails.paymentMethod || 'Payment Method Not Specified';
    
    // Generate social media links
    const socialMediaLinks = this.generateSocialMediaLinks(tenantData);
    
    // Get current date for professional formatting
    const orderDate = new Date().toLocaleDateString('en-GB', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    console.log('📧 Email Template Generation - Timing Object:', {
      isAdvanceOrder: timing.isAdvanceOrder,
      timeMessage: timing.timeMessage,
      displayTime: timing.displayTime,
      isDelivery: timing.isDelivery,
      isCollection: timing.isCollection
    });
    
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation - ${tenantData.name}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa; margin: 0; padding: 20px; }
          .email-container { max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; padding: 40px 20px; }
          .header h1 { font-size: 28px; margin-bottom: 10px; font-weight: 600; }
          .header .order-number { font-size: 18px; background: rgba(255,255,255,0.2); padding: 8px 20px; border-radius: 25px; display: inline-block; margin: 15px 0; }
          .content { padding: 30px; }
          .greeting { font-size: 18px; color: #2c3e50; margin-bottom: 25px; line-height: 1.6; }
          .order-summary { background: #f8f9fa; border-radius: 8px; padding: 25px; margin: 25px 0; border-left: 4px solid #667eea; }
          .summary-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; }
          .summary-title { font-size: 20px; font-weight: 600; color: #2c3e50; }
          .items-count { background: #e3f2fd; color: #1565c0; padding: 6px 12px; border-radius: 20px; font-size: 14px; font-weight: 500; }
          .order-details { margin: 25px 0; }
          .detail-row { display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid #e9ecef; }
          .detail-row:last-child { border-bottom: none; }
          .detail-label { font-weight: 600; color: #495057; }
          .detail-value { color: #6c757d; }
          .items-list { list-style: none; margin: 20px 0; }
          .item { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #e9ecef; }
          .item:last-child { border-bottom: none; }
          .item-name { font-weight: 500; color: #2c3e50; }
          .item-details { color: #6c757d; font-size: 14px; }
          .item-total { font-weight: 600; color: #2c3e50; }
          .pricing { background: #fff; border: 2px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 25px 0; }
          .pricing-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; }
          .pricing-row.total { border-top: 2px solid #667eea; padding-top: 15px; margin-top: 15px; font-size: 18px; font-weight: bold; color: #2c3e50; }
          .status-badge { display: inline-flex; align-items: center; gap: 8px; background: #d4edda; color: #155724; padding: 12px 20px; border-radius: 25px; font-weight: 600; margin: 20px 0; }
          .timing-info { background: linear-gradient(135deg, #fff3cd, #ffeaa7); border-radius: 8px; padding: 20px; margin: 25px 0; border-left: 4px solid #f39c12; }
          .timing-info h3 { color: #856404; margin-bottom: 10px; }
          .timing-info p { color: #856404; margin: 5px 0; }
          .footer { background: #2c3e50; color: white; padding: 30px; text-align: center; }
          .footer h3 { margin-bottom: 15px; }
          .footer-info { margin: 10px 0; }
          .social-links { margin: 20px 0; }
          .social-links a { display: inline-block; margin: 0 8px; text-decoration: none; }
          .footer-note { font-size: 12px; color: #bdc3c7; margin-top: 20px; line-height: 1.5; }
          @media (max-width: 600px) {
            body { padding: 10px; }
            .content { padding: 20px; }
            .header { padding: 30px 15px; }
            .summary-header { flex-direction: column; gap: 10px; }
            .detail-row { flex-direction: column; align-items: flex-start; gap: 5px; }
            .item { flex-direction: column; align-items: flex-start; gap: 8px; }
            .pricing-row { font-size: 16px; }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <!-- Header -->
          <div class="header">
            <h1>🎉 ${greetingMessage}</h1>
            <div class="order-number">Order #${orderDetails.orderNumber}</div>
            <div style="margin-top: 15px;">
              ✅ Confirmed • ${timing.isDelivery ? '🚚 Delivery' : '🏪 Collection'}${timing.isAdvanceOrder ? ' • ⏰ Pre-Scheduled' : ''}
            </div>
          </div>
          
          <!-- Content -->
          <div class="content">
            <!-- Greeting -->
            <div class="greeting">
              <strong>Dear ${orderDetails.customerName},</strong><br><br>
              Thank you for choosing <strong>${orderDetails.restaurantName}</strong>! We've successfully received your order and our kitchen team is already preparing your delicious meal. 
            </div>
            
            <!-- Order Summary Box -->
            <div class="order-summary">
              <div class="summary-header">
                <h2 class="summary-title">📋 Order Summary</h2>
                <div class="items-count">${totalItems} item${totalItems !== 1 ? 's' : ''}</div>
              </div>
              
              <!-- Order Details -->
              <div class="order-details">
                <div class="detail-row">
                  <span class="detail-label">📅 Order Date:</span>
                  <span class="detail-value">${orderDate}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">🍽️ Service Type:</span>
                  <span class="detail-value">${orderDetails.orderType.charAt(0).toUpperCase() + orderDetails.orderType.slice(1)}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">💳 Payment Method:</span>
                  <span class="detail-value">${paymentMethodDisplay}</span>
                </div>
                ${orderDetails.deliveryAddress ? `
                <div class="detail-row">
                  <span class="detail-label">📍 Delivery Address:</span>
                  <span class="detail-value">${orderDetails.deliveryAddress}</span>
                </div>
                ` : ''}
                ${orderDetails.specialInstructions ? `
                <div class="detail-row">
                  <span class="detail-label">📝 Special Instructions:</span>
                  <span class="detail-value">${orderDetails.specialInstructions}</span>
                </div>
                ` : ''}
              </div>
            </div>
            
            <!-- Items List -->
            <div style="margin: 25px 0;">
              <h3 style="color: #2c3e50; margin-bottom: 15px; font-size: 18px;">🍽️ Your Order Items</h3>
              <ul class="items-list">
                ${orderDetails.items.map((item: any) => `
                  <li class="item">
                    <div>
                      <div class="item-name">${item.name}</div>
                      <div class="item-details">Quantity: ${item.quantity}</div>
                    </div>
                    <div class="item-total">£${(item.price || 0).toFixed(2)}</div>
                  </li>
                `).join('')}
              </ul>
            </div>
            
            <!-- Pricing Breakdown -->
            <div class="pricing">
              <h3 style="color: #2c3e50; margin-bottom: 15px;">💰 Price Breakdown</h3>
              ${orderDetails.subtotal ? `
              <div class="pricing-row">
                <span>Subtotal:</span>
                <span>£${orderDetails.subtotal.toFixed(2)}</span>
              </div>
              ` : ''}
              ${orderDetails.deliveryFee ? `
              <div class="pricing-row">
                <span>Delivery Fee:</span>
                <span>£${orderDetails.deliveryFee.toFixed(2)}</span>
              </div>
              ` : ''}
              ${orderDetails.voucherCode ? `
              <div class="pricing-row" style="color: #28a745;">
                <span>Voucher (${orderDetails.voucherCode}):</span>
                <span>-£${(orderDetails.voucherDiscount || orderDetails.discount || 0).toFixed(2)}</span>
              </div>
              ` : ''}
              <div class="pricing-row total">
                <span>Total Amount:</span>
                <span>£${orderDetails.total.toFixed(2)}</span>
              </div>
            </div>
            
            <!-- Timing Information -->
            <div class="timing-info">
              <h3>${timing.isAdvanceOrder ? '⏰ Scheduled Order' : '🕒 Order Timing'}</h3>
              <p><strong>${timing.timeMessage}</strong></p>
              ${timing.isAdvanceOrder ? `
              <p style="margin-top: 10px; font-size: 14px;">📅 Your order is scheduled in advance. We'll prepare it fresh for your selected time.</p>
              ` : `
              <p style="margin-top: 10px; font-size: 14px;">⚡ We're preparing your order now and will have it ready as scheduled!</p>
              `}
            </div>
            
            <!-- Status Badge -->
            <div style="text-align: center;">
              <div class="status-badge">
                ✅ Order Confirmed & Processing
              </div>
            </div>
          </div>
          
          <!-- Footer -->
          <div class="footer">
            <h3>Thank you for choosing ${orderDetails.restaurantName}! 🍽️</h3>
            
            ${tenantData.phone ? `<div class="footer-info">📞 ${tenantData.phone}</div>` : ''}
            ${tenantData.email ? `<div class="footer-info">✉️ ${tenantData.email}</div>` : ''}
            ${tenantData.address ? `<div class="footer-info">📍 ${tenantData.address}</div>` : ''}
            
            ${socialMediaLinks ? `
            <div class="social-links">
              <p style="margin-bottom: 15px;">Follow us for updates and special offers:</p>
              ${socialMediaLinks}
            </div>
            ` : ''}
            
            <div class="footer-note">
              This is an automated email confirmation. Please keep this for your records.<br>
              If you have any questions about your order, please contact us using the information above.
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateCustomTemplate(
    orderDetails: OrderDetails,
    tenantData: TenantData,
    template: EmailTemplateCustomization,
    greetingMessage: string
  ): string {
    // Calculate timing information
    const timing = this.calculateOrderTiming(orderDetails, tenantData);
    
    console.log('📧 Custom Email Template Generation - Timing Object:', {
      isAdvanceOrder: timing.isAdvanceOrder,
      timeMessage: timing.timeMessage,
      displayTime: timing.displayTime,
      isDelivery: timing.isDelivery,
      isCollection: timing.isCollection
    });
    
    // Enhanced logo URL handling with fallbacks - prioritize logoLink if available, then template.logo, then tenant settings
    const logoUrl = template.logoLink || template.logo || (tenantData as any).settings?.logo || '';
    const logoAlign = template.logoPosition === 'left' ? 'flex-start' : template.logoPosition === 'right' ? 'flex-end' : 'center';
    
    // Ensure we have restaurant name
    const restaurantName = tenantData.name || 'Restaurant';
    
    console.log('Email Template Debug:', {
      logoUrl,
      restaurantName,
      logoLink: template.logoLink,
      templateLogo: template.logo,
      tenantSettings: (tenantData as any).settings,
      tenantSettingsLogo: (tenantData as any).settings?.logo,
      tenantName: tenantData.name,
      logoFallbackChain: [
        { source: 'template.logoLink', value: template.logoLink },
        { source: 'template.logo', value: template.logo },
        { source: 'tenantData.settings.logo', value: (tenantData as any).settings?.logo },
        { source: 'final logoUrl', value: logoUrl }
      ]
    });
    
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation - ${tenantData.name}</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw==" crossorigin="anonymous" referrerpolicy="no-referrer" />
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; padding: 0; }
          .card { border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.12); overflow: hidden; }
          .gradient-bg { background: linear-gradient(135deg, ${template.colors.primary} 0%, ${template.colors.accent} 100%); }
          .status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; background: rgba(34, 197, 94, 0.1); color: #059669; border-radius: 20px; font-weight: 600; font-size: 14px; }
          .section-divider { height: 1px; background: linear-gradient(90deg, transparent, #e5e7eb, transparent); margin: 24px 0; }
          
          /* Desktop styles */
          @media (min-width: 601px) { 
            .main-container { max-width: 650px; margin: 24px auto; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.12); }
            .container-padding { padding: 32px; }
            .header-padding { padding: 40px 32px; }
          }
          
          /* Mobile styles - Full screen with tiny spacing */
          @media (max-width: 600px) { 
            body { padding: 8px !important; background: #ffffff !important; }
            .main-container { margin: 0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
            .container-padding { padding: 16px; }
            .header-padding { padding: 24px 16px; }
            .mobile-text-sm { font-size: 14px; }
            .mobile-spacing { margin-bottom: 16px; }
          }
        </style>
      </head>
      <body style="margin: 0; padding: 24px; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); font-family: ${template.fonts.body}, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif; line-height: 1.6;">
        
        <!-- Main Container -->
        <div style="background: #ffffff;" class="main-container">
          
          <!-- Header Section -->
          <div style="text-align: center; position: relative;" class="gradient-bg header-padding">
            
            <!-- Logo -->
            ${logoUrl ? `
            <div style="display: flex; justify-content: ${logoAlign}; align-items: center; margin-bottom: 24px;">
              <div style="background: rgba(255,255,255,0.95); padding: 16px; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.1);">
                <img src="${logoUrl}" alt="${restaurantName}" style="height: auto; width: auto; max-height: 80px; max-width: 200px; object-fit: contain; display: block;" onerror="this.style.display='none';">
              </div>
            </div>
            ` : ''}
            
            <!-- Main Welcome Message -->
            <h1 style="font-family: ${template.fonts.heading}, 'Segoe UI', sans-serif; font-size: 32px; font-weight: 700; color: white; margin: 0 0 8px; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              ${greetingMessage}
            </h1>
            
            <!-- Customer Name on Second Line -->
            <h2 style="font-family: ${template.fonts.heading}, 'Segoe UI', sans-serif; font-size: 28px; font-weight: 600; color: rgba(255, 255, 255, 0.95); margin: 0 0 8px; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">
              ${orderDetails.customerName || 'Valued Customer'}
            </h2>
            
            <!-- Thank You Message (Smaller) -->
            <h3 style="font-family: ${template.fonts.heading}, 'Segoe UI', sans-serif; font-size: 22px; font-weight: 500; color: rgba(255, 255, 255, 0.9); margin: 0 0 20px; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">
              Thank you for your order
            </h3>
            
            <!-- Status Badge -->
            <div style="margin-bottom: 20px;">
              <span class="status-badge" style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3);">
                ✓ Confirmed • ${timing.isDelivery ? 'Delivery Order' : 'Collection Order'}${timing.isAdvanceOrder ? ' • Pre-Scheduled' : ''}
              </span>
            </div>
            
            <!-- Timing Information -->
            <div style="background: ${timing.isAdvanceOrder ? 'rgba(251, 191, 36, 0.2)' : 'rgba(255, 255, 255, 0.15)'}; backdrop-filter: blur(10px); border: 1px solid ${timing.isAdvanceOrder ? 'rgba(251, 191, 36, 0.4)' : 'rgba(255,255,255,0.2)'}; padding: 24px; border-radius: 12px; font-size: 15px; color: white;">
              ${timing.isAdvanceOrder ? `
              <div style="font-weight: 700; margin-bottom: 12px; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 17px;">
                Advance Order
              </div>
              <div style="font-size: 15px; opacity: 0.95; font-weight: 600; text-align: center; line-height: 1.4;">
                ${timing.timeMessage.split('|')[1] || timing.timeMessage}
              </div>
              ` : `
              <div style="font-weight: 700; margin-bottom: 12px; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 17px;">
                Order Timing
              </div>
              <div style="font-size: 15px; opacity: 0.95; font-weight: 600; text-align: center; line-height: 1.4;">
                ${timing.timeMessage}
              </div>
              `}
            </div>
          </div>
          
          <!-- Content Section -->
          <div class="container-padding">
            
            <!-- Order Summary Card -->
            <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 12px; padding: 24px; margin-bottom: 32px; border: 1px solid #e2e8f0;">
              <h2 style="font-family: ${template.fonts.heading}, 'Segoe UI', sans-serif; font-size: 22px; font-weight: 700; color: ${template.colors.primary}; margin: 0 0 20px;">
                Order Summary
              </h2>
              
              <!-- Order Info -->
              <div style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 20px;">
                <div style="font-size: 12px; font-weight: 600; color: ${template.colors.accent}; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px;">Order Number</div>
                <div style="font-size: 18px; font-weight: 700; color: ${template.colors.primary};">${orderDetails.orderNumber || 'N/A'}</div>
              </div>
              
              <!-- Delivery Address -->
              ${timing.isDelivery && orderDetails.deliveryAddress ? `
              <div style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb;">
                <div style="font-size: 12px; font-weight: 600; color: ${template.colors.accent}; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 8px;">
                  Delivery Address
                </div>
                <div style="font-size: 15px; color: ${template.colors.text}; line-height: 1.5; font-weight: 500;">${orderDetails.deliveryAddress}</div>
              </div>
              ` : ''}
            </div>
            
            <!-- Order Items Section -->
            <div class="mobile-spacing" style="margin-bottom: 32px;">
              <h3 style="font-family: ${template.fonts.heading}, 'Segoe UI', sans-serif; font-size: 22px; font-weight: 700; color: ${template.colors.primary}; margin: 0 0 20px; border-bottom: 2px solid ${template.colors.primary}; padding-bottom: 8px;">
                Order Items
              </h3>
              
              ${orderDetails.items.map((item: any) => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
                  <div style="flex: 1;">
                    <div style="font-size: 16px; font-weight: 600; color: ${template.colors.text}; margin-bottom: 4px;">${item.name || 'Item'}</div>
                    <div style="font-size: 14px; color: #6b7280;">Quantity: ${item.quantity || 1}</div>
                  </div>
                  <div style="text-align: right; margin-left: 16px;">
                    <div style="font-size: 16px; font-weight: 700; color: ${template.colors.primary};">
                      £${(item.price || 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
            
            <!-- Price Breakdown -->
            <div class="mobile-spacing" style="background: ${template.colors.secondary}20; border-radius: 8px; padding: 24px; margin-bottom: 32px; border: 1px solid ${template.colors.secondary}40;">
              <h3 style="font-family: ${template.fonts.heading}, 'Segoe UI', sans-serif; font-size: 20px; font-weight: 700; color: ${template.colors.primary}; margin: 0 0 20px;">
                Payment Summary
              </h3>
              
              ${orderDetails.voucherCode ? `
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-size: 16px; padding: 8px 0;">
                <span style="font-weight: 500; color: ${template.colors.text};">Subtotal</span>
                <span style="font-weight: 600; color: ${template.colors.text};">£${(orderDetails.total + (orderDetails.voucherDiscount || orderDetails.discount || 0)).toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; font-size: 16px; padding: 8px 0;">
                <span style="font-weight: 600; color: #059669;">Voucher Discount</span>
                <span style="font-weight: 700; color: #059669;">-£${(orderDetails.voucherDiscount || orderDetails.discount || 0).toFixed(2)}</span>
              </div>
              ` : ''}
              
              ${timing.isDelivery ? `
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; font-size: 16px; padding: 8px 0;">
                <span style="font-weight: 500; color: ${template.colors.text};">Delivery Fee</span>
                <span style="font-weight: 600; color: ${template.colors.text};">£${orderDetails.deliveryFee !== undefined && orderDetails.deliveryFee !== null ? orderDetails.deliveryFee.toFixed(2) : '2.50'}</span>
              </div>
              ` : ''}
              
              <div style="height: 1px; background: ${template.colors.secondary}60; margin: 16px 0;"></div>
              
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 22px; font-weight: 800; padding: 12px 0; color: ${template.colors.primary};">
                <span>Total Amount</span>
                <span>£${orderDetails.total.toFixed(2)}</span>
              </div>
            </div>
            
            <!-- Special Instructions -->
            ${orderDetails.specialInstructions ? `
            <div style="background: #fef7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <div style="font-size: 14px; font-weight: 600; color: #ea580c; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                Special Instructions
              </div>
              <div style="font-size: 14px; color: #9a3412; line-height: 1.5;">${orderDetails.specialInstructions}</div>
            </div>
            ` : ''}
          </div>
          
          <!-- Footer Section -->
          <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); text-align: center; border-top: 1px solid #e2e8f0;" class="container-padding">
            
            <!-- Thank You Message -->
            <div style="margin-bottom: 24px;">
              <h3 style="font-family: ${template.fonts.heading}, 'Segoe UI', sans-serif; font-size: 20px; font-weight: 700; color: ${template.colors.primary}; margin: 0 0 8px;">Thank You!</h3>
              <p style="font-size: 16px; color: ${template.colors.text}; margin: 0; font-weight: 500;">
                ${template.footerMessage || 'We appreciate your business and look forward to serving you!'}
              </p>
            </div>
            
            <!-- Social Links Removed -->
            
            <!-- Contact Information -->
            <div style="background: white; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e5e7eb;">
              <h4 style="font-family: ${template.fonts.heading}, 'Segoe UI', sans-serif; font-size: 16px; font-weight: 700; color: ${template.colors.primary}; margin: 0 0 12px;">${restaurantName}</h4>
              <div style="font-size: 14px; color: ${template.colors.text}; line-height: 1.6;">
                ${tenantData.address ? `<div style="margin-bottom: 4px; display: flex; align-items: center; justify-content: center; gap: 6px;"><span style="font-size: 12px;">📍</span> ${tenantData.address}</div>` : ''}
                ${tenantData.phone ? `<div style="margin-bottom: 4px; display: flex; align-items: center; justify-content: center; gap: 6px;"><span style="font-size: 12px;">📞</span> ${tenantData.phone}</div>` : ''}
                ${tenantData.email ? `<div style="margin-bottom: 4px; display: flex; align-items: center; justify-content: center; gap: 6px;"><span style="font-size: 12px;">✉️</span> ${tenantData.email}</div>` : ''}
              </div>
              
              <!-- Important Note -->
              <div style="margin-top: 16px; padding: 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
                <p style="margin: 0; font-size: 12px; color: #6b7280; line-height: 1.4;">
                  ${timing.isDelivery ? 'Your order will be delivered to your specified address.' : 'Please bring this confirmation when collecting your order.'}
                  <br>
                  Need help? Contact us using the information above.
                </p>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateSocialLinks(socialLinks: any): string {
    // Social media section completely removed as requested
    return '';
  }

  /**
   * Generate restaurant notification email for new food orders (separate from gift cards)
   */
  async generateRestaurantNotificationEmail(
    orderDetails: OrderDetails,
    tenantData: TenantData
  ): Promise<string> {
    const totalItems = orderDetails.items.reduce((sum, item) => sum + item.quantity, 0);
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Order Alert - ${tenantData.name}</title>
    </head>
    <body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%); padding: 30px 20px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 28px; font-weight: 700;">🚨 New Order Alert!</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.95;">
                    Order #${orderDetails.orderNumber} just came in
                </p>
            </div>

            <!-- Order Details -->
            <div style="padding: 30px;">
                <!-- Key Information -->
                <div style="display: flex; justify-content: center; gap: 15px; margin-bottom: 25px; flex-wrap: wrap;">
                    <div style="background: #e8f5e8; color: #2d5a2d; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 500;">
                        🛍️ ${totalItems} items
                    </div>
                    <div style="background: #e3f2fd; color: #1565c0; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 500;">
                        💳 ${orderDetails.paymentMethod || 'Cash'}
                    </div>
                    <div style="background: #fff3e0; color: #ef6c00; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 500;">
                        🚚 ${orderDetails.orderType === 'delivery' ? 'Delivery' : 'Collection'}
                    </div>
                    <div style="background: #f3e5f5; color: #7b1fa2; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 500;">
                        💰 £${orderDetails.total.toFixed(2)}
                    </div>
                </div>

                <!-- Customer Information -->
                <div style="background: #f0f8ff; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                    <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px; font-weight: 600;">Customer Details:</h3>
                    <p style="margin: 5px 0; color: #495057;"><strong>Name:</strong> ${orderDetails.customerName}</p>
                    <p style="margin: 5px 0; color: #495057;"><strong>Phone:</strong> ${orderDetails.customerPhone}</p>
                    <p style="margin: 5px 0; color: #495057;"><strong>Email:</strong> ${orderDetails.customerEmail}</p>
                    ${orderDetails.deliveryAddress ? `<p style="margin: 5px 0; color: #495057;"><strong>Address:</strong> ${orderDetails.deliveryAddress}</p>` : ''}
                    ${orderDetails.specialInstructions ? `<p style="margin: 5px 0; color: #495057;"><strong>Special Instructions:</strong> ${orderDetails.specialInstructions}</p>` : ''}
                </div>

                <!-- Order Items -->
                <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                    <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px; font-weight: 600;">Order Items:</h3>
                    ${orderDetails.items.map(item => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #e9ecef;">
                            <div>
                                <strong style="color: #495057;">${item.name}</strong>
                                <span style="color: #6c757d; font-size: 14px;"> x${item.quantity}</span>
                            </div>
                            <div style="color: #28a745; font-weight: 600;">£${(item.price * item.quantity).toFixed(2)}</div>
                        </div>
                    `).join('')}
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0 0 0; margin-top: 15px; border-top: 2px solid #28a745;">
                        <strong style="color: #333; font-size: 18px;">Total:</strong>
                        <strong style="color: #28a745; font-size: 20px;">£${orderDetails.total.toFixed(2)}</strong>
                    </div>
                </div>

                <!-- Time Information -->
                <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 8px; color: white;">
                    <h3 style="margin: 0 0 10px 0; font-size: 18px;">⏰ Order Placed: ${new Date().toLocaleString()}</h3>
                    <p style="margin: 0; opacity: 0.9;">Please start preparation as soon as possible</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
  }
}

export const emailTemplateService = new EmailTemplateService();
