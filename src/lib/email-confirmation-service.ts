import pool from '@/lib/db';
import nodemailer from 'nodemailer';
import { randomUUID } from 'crypto';

interface EmailTemplateData {
  ORDER_ID?: string;
  CUSTOMER_NAME?: string;
  RESTAURANT_NAME?: string;
  ORDER_TOTAL?: string;
  ORDER_SUBTOTAL?: string;
  ORDER_ITEMS?: string;
  ORDER_DATE?: string;
  DELIVERY_METHOD?: string;
  ORDER_NOTE?: string;
  // Enhanced food order template fields
  ITEMS_TOTAL?: string;
  DELIVERY_FEE?: string;
  VOUCHER_DISCOUNT?: string;
  TOTAL_AMOUNT?: string;
  PAYMENT_METHOD?: string;
  ESTIMATED_TIME?: string;
  TIMING_MESSAGE?: string;
}

interface TenantSMTP {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  smtp_secure: boolean;
  smtp_from: string;
  name: string;
}

export class EmailConfirmationService {
  
  /**
   * Send order confirmation email using enhanced template system
   */
  static async sendOrderConfirmation(
    tenantSlug: string,
    customerEmail: string,
    orderData: EmailTemplateData
  ): Promise<{ success: boolean; message: string; emailId?: string }> {
    try {
      console.log('📧 EMAIL SERVICE - Order data received:', {
        ORDER_ID: orderData.ORDER_ID,
        CUSTOMER_NAME: orderData.CUSTOMER_NAME,
        ORDER_NOTE: orderData.ORDER_NOTE,
        hasOrderNote: !!orderData.ORDER_NOTE && orderData.ORDER_NOTE.trim() !== '',
        orderNoteLength: orderData.ORDER_NOTE?.length || 0
      });

      // Get tenant SMTP settings
      const smtpSettings = await this.getTenantSMTPSettings(tenantSlug);
      if (!smtpSettings) {
        return { success: false, message: 'SMTP settings not configured for this tenant' };
      }

      // Get Global Template Customization for the enhanced template
      const globalCustomization = await this.getGlobalTemplateCustomization(tenantSlug);
      if (!globalCustomization) {
        return { success: false, message: 'Enhanced email template not configured for this tenant' };
      }

      // Use the enhanced food order template
      const enhancedTemplate = this.getEnhancedFoodOrderTemplate();
      
      // Process the email content with enhanced template
      const processedContent = this.processEnhancedEmailTemplate(enhancedTemplate, orderData, smtpSettings.name, globalCustomization);
      
      // Create subject line
      const subject = `Order Confirmation #${orderData.ORDER_ID} - ${smtpSettings.name}`;
      
      // Send the email
      const emailResult = await this.sendEmail({
        to: customerEmail,
        subject: subject,
        html: processedContent,
        smtpSettings
      });

      if (emailResult.success) {
        // Log the email
        await this.logEmail(
          tenantSlug,
          'food_order',
          customerEmail,
          subject,
          'sent',
          orderData.ORDER_ID
        );
      }

      return emailResult;
    } catch (error) {
      console.error('Error sending order confirmation:', error);
      return { success: false, message: 'Failed to send order confirmation email' };
    }
  }

  /**
   * Send test email using enhanced template system
   */
  static async sendTestEmail(
    tenantSlug: string,
    testEmail: string,
    templateType: 'order_confirmation' | 'gift_card' | 'item_sale'
  ): Promise<{ success: boolean; message: string; emailId?: string }> {
    // Use sample data with enhanced template
    const sampleData: EmailTemplateData = {
      ORDER_ID: 'TEST-001',
      CUSTOMER_NAME: 'Test User',
      ITEMS_TOTAL: '£25.00',
      TOTAL_AMOUNT: '£25.00',
      ORDER_DATE: new Date().toLocaleDateString(),
      DELIVERY_METHOD: 'Collection',
      PAYMENT_METHOD: 'Card Payment',
      ESTIMATED_TIME: '30 minutes',
      ORDER_ITEMS: '<div style="display: flex; justify-content: space-between; padding: 8px 0;"><span>Test Item (x1)</span><span>£25.00</span></div>'
    };
    
    return this.sendOrderConfirmation(tenantSlug, testEmail, sampleData);
  }

  /**
   * Get the enhanced food order template
   */
  private static getEnhancedFoodOrderTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Confirmation - {{RESTAURANT_NAME}}</title>
</head>
<body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background: {{BACKGROUND_COLOR}};">
    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: {{PRIMARY_COLOR}}; padding: 30px 20px; text-align: center; color: white;">
            {{LOGO}}
            <h1 style="margin: 15px 0 0 0; font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">{{RESTAURANT_NAME}}</h1>
            <h2 style="margin: 5px 0 0 0; font-size: 20px; font-weight: 500;">Order Confirmation</h2>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Thank you for your order!</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px;">
            <div style="text-align: center; margin-bottom: 25px;">
                <h2 style="color: #000000; margin: 0;">Hi {{CUSTOMER_NAME}},</h2>
                <p style="color: #666666; margin: 5px 0;">We've received your order and are preparing it with care.</p>
            </div>
            
            <!-- Order Details -->
            <div style="margin-bottom: 25px;">
                <h3 style="color: #000000; margin-bottom: 15px; font-size: 18px; border-bottom: 2px solid #f0f0f0; padding-bottom: 8px;">Order Details</h3>
                <div style="display: flex; justify-content: space-between; margin: 8px 0;">
                    <strong style="color: #000000;">Order ID: </strong>
                    <span style="color: #000000;">{{ORDER_ID}}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin: 8px 0;">
                    <strong style="color: #000000;">Order Date: </strong>
                    <span style="color: #000000;">{{ORDER_DATE}}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin: 8px 0;">
                    <strong style="color: #000000;">Delivery Method: </strong>
                    <span style="color: #000000;">{{DELIVERY_METHOD}}</span>
                </div>
            </div>
            
            <!-- Items Ordered -->
            <div style="margin-bottom: 25px;">
                <h3 style="color: #000000; margin-bottom: 15px; font-size: 18px; border-bottom: 2px solid #f0f0f0; padding-bottom: 8px;">Items Ordered</h3>
                <div style="background: #f8f9fa; border-radius: 6px; padding: 15px;">
                    {{ORDER_ITEMS}}
                </div>
            </div>
            
            <!-- Pricing -->
            <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <span style="color: #000000;">Items Total: </span>
                    <span style="color: #000000; font-weight: 500;">{{ITEMS_TOTAL}}</span>
                </div>
                
                {{DELIVERY_FEE_SECTION}}
                {{VOUCHER_SECTION}}
                
                <div style="border-top: 2px solid {{PRIMARY_COLOR}}; margin-top: 15px; padding-top: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <strong style="color: #000000; font-size: 20px;">Total: </strong>
                        <strong style="color: {{PRIMARY_COLOR}}; font-size: 20px;">{{TOTAL_AMOUNT}}</strong>
                    </div>
                </div>
            </div>
            
            <!-- Order Note Section (Conditional) -->
            {{ORDER_NOTE_SECTION}}
            
            <!-- Payment Information -->
            <div style="margin-bottom: 25px;">
                <h3 style="color: #000000; margin-bottom: 15px; font-size: 18px; border-bottom: 2px solid #f0f0f0; padding-bottom: 8px;">Payment Information</h3>
                <div style="display: flex; justify-content: space-between; margin: 8px 0;">
                    <strong style="color: #000000;">Payment Method: </strong>
                    <span style="color: #22c55e; font-weight: 500;">{{PAYMENT_METHOD}}</span>
                </div>
            </div>
            
            <!-- Timing Information -->
            <div style="background: #e8f5e8; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
                <p style="margin: 0; color: #16a34a; font-weight: 500; font-size: 16px;">
                    {{TIMING_MESSAGE}}
                </p>
            </div>
            
            <!-- Footer -->
            {{SMART_FOOTER}}
        </div>
        {{SOCIAL_ICONS}}
    </div>
</body>
</html>
`;
  }

  /**
   * Process enhanced email template with conditional logic
   */
  private static processEnhancedEmailTemplate(
    template: string,
    orderData: EmailTemplateData,
    restaurantName: string,
    globalCustomization: any
  ): string {
    let processedHtml = template;

    // Handle conditional delivery fee section
    const hasDeliveryFee = orderData.DELIVERY_FEE && orderData.DELIVERY_FEE !== '£0.00' && orderData.DELIVERY_FEE !== '';
    const deliveryFeeSection = hasDeliveryFee ? 
      `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <span style="color: #000000;">Delivery Fee: </span>
          <span style="color: #000000; font-weight: 500;">${orderData.DELIVERY_FEE}</span>
       </div>` : '';
    
    // Handle conditional voucher section
    const hasVoucher = orderData.VOUCHER_DISCOUNT && orderData.VOUCHER_DISCOUNT !== '£0.00' && orderData.VOUCHER_DISCOUNT !== '';
    const voucherSection = hasVoucher ? 
      `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <span style="color: #22c55e;">Voucher Applied: </span>
          <span style="color: #22c55e; font-weight: 500;">${orderData.VOUCHER_DISCOUNT}</span>
       </div>` : '';

    // Handle conditional order note section
    const hasOrderNote = orderData.ORDER_NOTE && orderData.ORDER_NOTE.trim() !== '';
    const orderNoteSection = hasOrderNote ? 
      `<div style="margin-bottom: 25px;">
          <h3 style="color: #000000; margin-bottom: 15px; font-size: 18px; border-bottom: 2px solid #f0f0f0; padding-bottom: 8px;">Order Note</h3>
          <div style="background: #fff7ed; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 0 8px 8px 0;">
              <p style="margin: 0; color: #92400e; font-style: italic; font-size: 14px;">"${orderData.ORDER_NOTE}"</p>
          </div>
       </div>` : '';

    console.log('🎯 ORDER NOTE PROCESSING:', {
      ORDER_NOTE: orderData.ORDER_NOTE,
      hasOrderNote: hasOrderNote,
      orderNoteTrimmed: orderData.ORDER_NOTE?.trim(),
      orderNoteLength: orderData.ORDER_NOTE?.length,
      sectionGenerated: !!orderNoteSection,
      sectionLength: orderNoteSection.length
    });

    // Smart timing message based on delivery method
    const isDelivery = orderData.DELIVERY_METHOD && orderData.DELIVERY_METHOD.toLowerCase().includes('delivery');
    const timingMessage = isDelivery 
      ? `Your order will be estimated delivered in approximately ${orderData.ESTIMATED_TIME || '60 minutes'}.`
      : `Your order will be ready for collection in approximately ${orderData.ESTIMATED_TIME || '30 minutes'}.`;

    // Replace conditional sections
    processedHtml = processedHtml.replace('{{DELIVERY_FEE_SECTION}}', deliveryFeeSection);
    processedHtml = processedHtml.replace('{{VOUCHER_SECTION}}', voucherSection);
    processedHtml = processedHtml.replace('{{ORDER_NOTE_SECTION}}', orderNoteSection);
    processedHtml = processedHtml.replace('{{TIMING_MESSAGE}}', timingMessage);

    console.log('🔄 TEMPLATE REPLACEMENTS:', {
      deliveryFeeSectionLength: deliveryFeeSection.length,
      voucherSectionLength: voucherSection.length,
      orderNoteSectionLength: orderNoteSection.length,
      hasOrderNoteInTemplate: processedHtml.includes('Order Note'),
      templateContainsPlaceholder: processedHtml.includes('{{ORDER_NOTE_SECTION}}')
    });

    // Generate smart footer
    const smartFooter = this.generateSmartFooter(globalCustomization);
    processedHtml = processedHtml.replace('{{SMART_FOOTER}}', smartFooter);

    // Apply order data variables
    Object.entries(orderData).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      processedHtml = processedHtml.replace(regex, value || '');
    });

    // Apply global customization
    processedHtml = processedHtml
      .replace(/\{\{PRIMARY_COLOR\}\}/g, globalCustomization?.header_color || '#667eea')
      .replace(/\{\{SECONDARY_COLOR\}\}/g, globalCustomization?.footer_color || '#764ba2')
      .replace(/\{\{BACKGROUND_COLOR\}\}/g, '#f8fafc')
      .replace(/\{\{RESTAURANT_NAME\}\}/g, restaurantName);

    // Apply logo
    if (globalCustomization?.logo_url && globalCustomization?.show_logo) {
      const logoHtml = `<div style="text-align: center; margin-bottom: 20px;">
        <img src="${globalCustomization.logo_url}" alt="Restaurant Logo" 
             style="width: ${globalCustomization.logo_width || 200}px; height: ${globalCustomization.logo_height || 80}px; object-fit: contain; max-width: 100%;" 
             onerror="this.style.display='none';">
      </div>`;
      processedHtml = processedHtml.replace(/\{\{LOGO\}\}/g, logoHtml);
    } else {
      processedHtml = processedHtml.replace(/\{\{LOGO\}\}/g, '');
    }

    // Apply social icons
    const socialIcons = this.generateSocialIcons(globalCustomization);
    processedHtml = processedHtml.replace(/\{\{SOCIAL_ICONS\}\}/g, socialIcons);

    return processedHtml;
  }

  /**
   * Generate smart footer from global customization
   */
  private static generateSmartFooter(globalCustomization: any): string {
    if (!globalCustomization || !globalCustomization.footer_text) return '';

    // Simple footer using the footer_text directly with HTML support
    let footerContent = '';
    
    // Get footer color from the footer_color field or use default
    const footerColor = globalCustomization.footer_color || '#764ba2';
    
    console.log('🎨 Footer generation:', {
      hasFooterText: !!globalCustomization.footer_text,
      footerColor: footerColor,
      rawFooterColor: globalCustomization.footer_color,
      fallbackUsed: !globalCustomization.footer_color
    });
    
    // Use the footer text directly - it can contain HTML with background color
    footerContent += `<div style="text-align: center; padding: 20px; margin: 20px 0; font-family: Arial, sans-serif; background: ${footerColor}; color: white; border-radius: 8px;">`;
    footerContent += globalCustomization.footer_text.replace(/\n/g, '<br>'); // Convert line breaks to <br>
    footerContent += `</div>`;
    
    return footerContent;
  }

  /**
   * Generate social media icons with proper SVG icons
   */
  private static generateSocialIcons(globalCustomization: any): string {
    if (!globalCustomization || !globalCustomization.enable_social_icons) return '';

    const icons = [];
    const iconColor = globalCustomization.icon_color || '#666666';
    const iconSize = 24;

    // Instagram Icon
    if (globalCustomization.instagram_url) {
      icons.push(`
        <a href="${globalCustomization.instagram_url}" style="text-decoration: none; margin: 0 8px; display: inline-block;">
          <svg width="${iconSize}" height="${iconSize}" fill="${iconColor}" viewBox="0 0 24 24" style="vertical-align: middle;">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
        </a>
      `);
    }

    // TikTok Icon
    if (globalCustomization.tiktok_url) {
      icons.push(`
        <a href="${globalCustomization.tiktok_url}" style="text-decoration: none; margin: 0 8px; display: inline-block;">
          <svg width="${iconSize}" height="${iconSize}" fill="${iconColor}" viewBox="0 0 24 24" style="vertical-align: middle;">
            <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-.88-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
          </svg>
        </a>
      `);
    }

    // Facebook Icon
    if (globalCustomization.facebook_url) {
      icons.push(`
        <a href="${globalCustomization.facebook_url}" style="text-decoration: none; margin: 0 8px; display: inline-block;">
          <svg width="${iconSize}" height="${iconSize}" fill="${iconColor}" viewBox="0 0 24 24" style="vertical-align: middle;">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
        </a>
      `);
    }

    // Website Icon
    if (globalCustomization.website_url) {
      icons.push(`
        <a href="${globalCustomization.website_url}" style="text-decoration: none; margin: 0 8px; display: inline-block;">
          <svg width="${iconSize}" height="${iconSize}" fill="${iconColor}" viewBox="0 0 24 24" style="vertical-align: middle;">
            <path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm5.568 7.875h-2.076c-.136-.955-.292-1.867-.469-2.734C16.568 5.693 17.91 6.646 18.568 7.875zM16 12c0 .746-.156 1.455-.428 2.094h-1.944C13.784 13.455 13.628 12.746 13.628 12s.156-1.455.428-2.094h1.944C15.844 10.545 16 11.254 16 12zm-4-9.951v3.826h-1.993C10.328 5.543 10.658 4.171 11.044 2.798 11.364 2.343 11.681 2.105 12 2.049zm0 5.826v3.25h-2.628C9.216 10.545 9.372 9.836 9.372 9.125c0-.746.156-1.455.428-2.094H12v-.156zm-4 3.25H5.372c-.272-.639-.428-1.348-.428-2.094s.156-1.455.428-2.094H8v4.188zm0-6.125H5.932c.657-1.229 1.999-2.182 3.544-2.734C9.308 6.008 9.152 6.92 9.016 7.875H8z"/>
          </svg>
        </a>
      `);
    }

    if (icons.length === 0) return '';

    return `<div style="text-align: center; padding: 20px; border-top: 1px solid #e5e7eb;">
      <div style="margin-bottom: 8px; font-size: 14px; color: #000000; font-weight: 500;">Follow Us</div>
      <div style="display: inline-block;">
        ${icons.join('')}
      </div>
    </div>`;
  }

  /**
   * Get tenant SMTP settings
   */
  private static async getTenantSMTPSettings(tenantSlug: string): Promise<TenantSMTP | null> {
    try {
      const [rows] = await pool.execute(
        `SELECT name, smtp_host, smtp_port, smtp_user, smtp_password, smtp_secure, smtp_from 
         FROM tenants WHERE slug = ?`,
        [tenantSlug]
      );

      const tenants = rows as TenantSMTP[];
      return tenants.length > 0 ? tenants[0] : null;
    } catch (error) {
      console.error('Error fetching tenant SMTP settings:', error);
      return null;
    }
  }

  /**
   * Get Global Template Customization settings
   */
  private static async getGlobalTemplateCustomization(tenantSlug: string): Promise<any | null> {
    try {
      // First get tenant ID
      const [tenantRows] = await pool.execute(
        `SELECT id FROM tenants WHERE slug = ?`,
        [tenantSlug]
      );

      const tenants = tenantRows as any[];
      if (tenants.length === 0) {
        console.log('⚠️ Tenant not found for slug:', tenantSlug);
        return null;
      }

      const tenantId = tenants[0].id;

      // Get global template customization data
      const [customRows] = await pool.execute(
        `SELECT * FROM global_template_customization WHERE tenant_id = ?`,
        [tenantId]
      );

      const customizations = customRows as any[];
      let customization: any = {};
      
      if (customizations.length > 0) {
        const row = customizations[0];
        customization = {
          // Logo settings
          logo_url: row.logo_url,
          show_logo: row.show_logo,
          logo_width: row.logo_width,
          logo_height: row.logo_height,
          
          // Color settings  
          header_color: row.header_color || row.primary_color,
          footer_color: row.footer_color || row.secondary_color,
          background_color: row.background_color,
          text_color: row.text_color,
          
          // Footer text
          footer_text: row.footer_text,
          
          // Business information
          restaurant_phone: row.restaurant_phone,
          restaurant_email: row.restaurant_email,
          restaurant_address: row.restaurant_address,
          vat_number: row.vat_number,
          business_registration: row.business_registration,
          
          // Social Media settings
          enable_social_icons: row.enable_social_icons,
          icon_color: row.icon_color,
          instagram_url: row.instagram_url,
          tiktok_url: row.tiktok_url,
          facebook_url: row.facebook_url,
          website_url: row.website_url
        };
      }

      console.log('🎨 Global Template Customization loaded:', {
        hasLogo: !!customization.logo_url,
        logoSource: customization.logo_url ? 'customization' : 'none',
        hasSocialMedia: !!customization.enable_social_icons,
        hasColors: !!(customization.header_color && customization.footer_color),
        primaryColor: customization.header_color,
        secondaryColor: customization.footer_color
      });
      
      return customization;
    } catch (error) {
      console.error('Error fetching Global Template Customization:', error);
      return null;
    }
  }

  /**
   * Send email using nodemailer
   */
  private static async sendEmail({
    to,
    subject,
    html,
    smtpSettings
  }: {
    to: string;
    subject: string;
    html: string;
    smtpSettings: TenantSMTP;
  }): Promise<{ success: boolean; message: string; emailId?: string }> {
    try {
      // Create transporter
      const transporterConfig: any = {
        host: smtpSettings.smtp_host || 'localhost',
        port: smtpSettings.smtp_port || 587,
        secure: smtpSettings.smtp_secure || false,
      };

      if (smtpSettings.smtp_user && smtpSettings.smtp_password) {
        transporterConfig.auth = {
          user: smtpSettings.smtp_user,
          pass: smtpSettings.smtp_password,
        };
      }

      const transporter = nodemailer.createTransport(transporterConfig);

      // Prepare mail options
      const mailOptions = {
        from: smtpSettings.smtp_from || smtpSettings.smtp_user || 'noreply@restaurant.com',
        to: to,
        subject: subject,
        html: html,
        replyTo: smtpSettings.smtp_from || undefined
      };

      // Send email
      const info = await transporter.sendMail(mailOptions);
      
      return { 
        success: true, 
        message: 'Email sent successfully', 
        emailId: info.messageId 
      };
    } catch (error) {
      console.error('Error sending email:', error);
      return { 
        success: false, 
        message: `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Log email to database
   */
  private static async logEmail(
    tenantSlug: string,
    emailType: 'order_confirmation' | 'gift_card' | 'food_order' | 'item_sale',
    recipientEmail: string,
    subject: string,
    status: 'sent' | 'failed',
    orderId?: string
  ): Promise<void> {
    try {
      const emailId = randomUUID();
      await pool.execute(
        `INSERT INTO email_logs (id, tenant_id, recipient_email, subject, status, context_type) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [emailId, tenantSlug, recipientEmail, subject, status, 'tenant']
      );
    } catch (error) {
      console.error('Error logging email:', error);
    }
  }
}

export default EmailConfirmationService;
