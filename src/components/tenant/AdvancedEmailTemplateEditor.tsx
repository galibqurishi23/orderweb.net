"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  CheckCircle, 
  AlertCircle, 
  Eye, 
  Save, 
  Plus, 
  Trash2, 
  Upload,
  Palette,
  Image,
  Facebook,
  Instagram,
  Globe,
  Phone,
  Mail,
  Gift,
  Tag,
  ShoppingBag,
  Settings,
  Sparkles,
  Database,
  FileText,
  Edit,
  Loader2,
  Code,
  Package
} from "lucide-react";
import { useTenant } from "@/context/TenantContext";

interface EmailTemplate {
  id?: number;
  name: string;
  type: string;
  category: 'food_order' | 'gift_card' | 'item_sale';
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: EmailVariable[];
  isActive: boolean;
  customization: {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
    logoUrl: string;
    logoWidth: number;
    logoHeight: number;
    showLogo: boolean;
    footerText: string;
    headerStyle: 'modern' | 'classic' | 'minimal';
    buttonStyle: 'rounded' | 'square' | 'pill';
    // Social Media Icons
    enableSocialIcons: boolean;
    iconColor: string;
    instagramUrl: string;
    tiktokUrl: string;
    facebookUrl: string;
    websiteUrl: string;
  };
}

interface EmailVariable {
  key: string;
  description: string;
}

const defaultCustomization = {
  primaryColor: '#667eea',
  secondaryColor: '#764ba2',
  backgroundColor: '#ffffff',
  textColor: '#333333',
  logoUrl: '',
  logoWidth: 200,
  logoHeight: 80,
  showLogo: true,
  footerText: 'Thank you for choosing us!',
  restaurantPhone: '',
  restaurantAddress: '',
  restaurantEmail: '',
  vatNumber: '',
  businessRegistration: '',
  // Social Media Icons
  enableSocialIcons: true,
  iconColor: '#666666',
  instagramUrl: '',
  tiktokUrl: '',
  facebookUrl: '',
  websiteUrl: '',
  headerStyle: 'modern' as const,
  buttonStyle: 'rounded' as const,
};

// Define template types with categories
const templateTypes = [
  { value: 'food_order', label: 'Food Order Confirmation', category: 'food_order', icon: ShoppingBag },
  { value: 'gift_card', label: 'Gift Card Delivery', category: 'gift_card', icon: Gift },
  { value: 'item_sale', label: 'Item Sale Promotion', category: 'item_sale', icon: Package },
];

const availableVariables: Record<string, EmailVariable[]> = {
  food_order: [
    { key: "CUSTOMER_NAME", description: "Customer's full name" },
    { key: "ORDER_ID", description: "Unique order identification number" },
    { key: "ORDER_DATE", description: "Date when order was placed" },
    { key: "DELIVERY_METHOD", description: "Pickup or delivery method" },
    { key: "DELIVERY_ADDRESS", description: "Customer delivery address (conditional)" },
    { key: "ORDER_ITEMS", description: "List of ordered items with prices" },
    { key: "ITEMS_TOTAL", description: "Subtotal before fees and discounts" },
    { key: "DELIVERY_FEE", description: "Delivery charge (hidden if £0.00)" },
    { key: "VOUCHER_DISCOUNT", description: "Voucher discount amount (hidden if none)" },
    { key: "TOTAL_AMOUNT", description: "Final total amount" },
    { key: "PAYMENT_METHOD", description: "Method used for payment" },
    { key: "ESTIMATED_TIME", description: "Estimated delivery/pickup time" },
    { key: "RESTAURANT_NAME", description: "Restaurant name" },
    { key: "SMART_FOOTER", description: "Auto-generated footer with business info" }
  ],
  gift_card: [
    { key: "RECIPIENT_NAME", description: "Gift recipient's name" },
    { key: "SENDER_NAME", description: "Gift sender's name" },
    { key: "PERSONAL_MESSAGE", description: "Personal message from sender" },
    { key: "GIFT_CARD_CODE", description: "Gift card redemption code" },
    { key: "GIFT_CARD_AMOUNT", description: "Gift card value amount" },
    { key: "RESTAURANT_NAME", description: "Restaurant name" },
    { key: "EXPIRY_DATE", description: "Gift card expiry date" },
    { key: "PURCHASE_DATE", description: "Date gift card was purchased" }
  ],
  item_sale: [
    { key: "CUSTOMER_NAME", description: "Customer's full name" },
    { key: "ITEM_NAME", description: "Name of the item on sale" },
    { key: "ITEM_DESCRIPTION", description: "Description of the sale item" },
    { key: "ITEM_PRICE", description: "Current sale price" },
    { key: "ORIGINAL_PRICE", description: "Original item price" },
    { key: "DISCOUNT_PERCENT", description: "Discount percentage" },
    { key: "SALE_END_DATE", description: "When the sale ends" },
    { key: "PROMOTION_TYPE", description: "Type of promotion" },
    { key: "SPECIAL_OFFER", description: "Special offer details" },
    { key: "RESTAURANT_NAME", description: "Restaurant name" }
  ]
};

// Item sale template
const itemSaleTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Special Offer - {{RESTAURANT_NAME}}</title>
</head>
<body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f7fafc; min-height: 100vh;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: {{PRIMARY_COLOR}}; padding: 30px 20px; text-align: center; color: white; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
            {{LOGO}}
            <h1 style="margin: 0; font-size: 28px; font-weight: 700;">Special Offer!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.95;">
                Don't miss out on this amazing deal at <strong>{{RESTAURANT_NAME}}</strong>
            </p>
        </div>

        <!-- Content -->
        <div style="padding: 30px;">
            <h2 style="margin: 0 0 20px 0; color: #000000; font-size: 24px; font-weight: 600;">Hi {{CUSTOMER_NAME}}!</h2>
            
            <!-- Item Showcase -->
            <div style="background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%); border: 2px solid {{PRIMARY_COLOR}}; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center;">
                <h3 style="margin: 0 0 15px 0; color: {{PRIMARY_COLOR}}; font-size: 22px; font-weight: 700;">{{ITEM_NAME}}</h3>
                <p style="margin: 0 0 20px 0; color: #000000; font-size: 16px; font-style: italic;">{{ITEM_DESCRIPTION}}</p>
                
                <div style="background: {{PRIMARY_COLOR}}; color: white; padding: 20px; border-radius: 8px; margin: 15px 0;">
                    <div style="font-size: 16px; opacity: 0.9; margin-bottom: 5px;">Special Price</div>
                    <div style="font-size: 14px; text-decoration: line-through; opacity: 0.7; margin-bottom: 5px;">{{ORIGINAL_PRICE}}</div>
                    <div style="font-size: 28px; font-weight: bold;">{{ITEM_PRICE}}</div>
                    <div style="background: {{SECONDARY_COLOR}}; color: white; padding: 5px 15px; border-radius: 20px; font-weight: bold; font-size: 14px; display: inline-block; margin-top: 10px;">Save {{DISCOUNT_PERCENT}}!</div>
                </div>
            </div>
            
            <!-- Promotion Details -->
            <div style="background: #f0fff4; border-left: 4px solid #38a169; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                <h4 style="margin: 0 0 10px 0; color: #000000; font-size: 18px;">{{PROMOTION_TYPE}}</h4>
                <p style="margin: 0; font-size: 16px; color: #000000;">{{SPECIAL_OFFER}}</p>
            </div>
            
            <!-- Call to Action -->
            <div style="text-align: center; margin: 30px 0;">
                <a href="#" style="display: inline-block; background: {{PRIMARY_COLOR}}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); transition: transform 0.2s;">Order Now & Save!</a>
            </div>
            
            <!-- Urgency -->
            <div style="background: #fffbf0; border: 1px solid #f6ad55; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
                <div style="color: #000000; font-weight: bold;">Limited Time Offer!</div>
                <div style="color: #000000; font-size: 14px; margin-top: 5px;">This special pricing ends on {{SALE_END_DATE}}</div>
            </div>
            
            <p style="text-align: center; color: #000000; font-size: 14px; margin: 30px 0 0 0;">
                Questions? Contact us - we're here to help!
            </p>
        </div>
        
        <!-- Footer -->
        <div style="background: {{SECONDARY_COLOR}}; padding: 25px; text-align: center; color: white; font-size: 14px;">
            <p style="margin: 0;">{{FOOTER_TEXT}}</p>
            <div style="margin: 15px 0;">
                <strong style="color: white;">{{RESTAURANT_NAME}}</strong>
            </div>
        </div>
        {{SOCIAL_MEDIA}}
    </div>
</body>
</html>
`;

// Professional food order template
const foodOrderTemplate = `
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
                    <strong style="color: #000000;">Order ID:</strong>
                    <span style="color: #000000;">{{ORDER_ID}}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin: 8px 0;">
                    <strong style="color: #000000;">Order Date:</strong>
                    <span style="color: #000000;">{{ORDER_DATE}}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin: 8px 0;">
                    <strong style="color: #000000;">Delivery Method:</strong>
                    <span style="color: #000000;">{{DELIVERY_METHOD}}</span>
                </div>
                {{#if DELIVERY_ADDRESS}}
                <div style="display: flex; justify-content: space-between; margin: 8px 0;">
                    <strong style="color: #000000;">{{#if_delivery}}Delivery to{{else}}Collection from{{/if_delivery}}:</strong>
                    <span style="color: #000000;">{{DELIVERY_ADDRESS}}</span>
                </div>
                {{/if}}
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
                    <span style="color: #000000;">Items Total:</span>
                    <span style="color: #000000; font-weight: 500;">{{ITEMS_TOTAL}}</span>
                </div>
                
                {{#if DELIVERY_FEE}}
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <span style="color: #000000;">Delivery Fee:</span>
                    <span style="color: #000000; font-weight: 500;">{{DELIVERY_FEE}}</span>
                </div>
                {{/if}}
                
                {{#if VOUCHER_DISCOUNT}}
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <span style="color: #22c55e;">Voucher Applied:</span>
                    <span style="color: #22c55e; font-weight: 500;">{{VOUCHER_DISCOUNT}}</span>
                </div>
                {{/if}}
                
                <div style="border-top: 2px solid {{PRIMARY_COLOR}}; margin-top: 15px; padding-top: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <strong style="color: #000000; font-size: 20px;">Total:</strong>
                        <strong style="color: {{PRIMARY_COLOR}}; font-size: 20px;">{{TOTAL_AMOUNT}}</strong>
                    </div>
                </div>
            </div>
            
            <!-- Payment Information -->
            <div style="margin-bottom: 25px;">
                <h3 style="color: #000000; margin-bottom: 15px; font-size: 18px; border-bottom: 2px solid #f0f0f0; padding-bottom: 8px;">Payment Information</h3>
                <div style="display: flex; justify-content: space-between; margin: 8px 0;">
                    <strong style="color: #000000;">Payment Method:</strong>
                    <span style="color: #22c55e; font-weight: 500;">{{PAYMENT_METHOD}}</span>
                </div>
            </div>
            
            <!-- Timing Information -->
            <div style="background: #e8f5e8; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
                <p style="margin: 0; color: #16a34a; font-weight: 500; font-size: 16px;">
                    Your order will be {{#if_delivery}}estimated delivered{{else}}ready for collection{{/if_delivery}} in approximately {{ESTIMATED_TIME}}.
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

// Gift card template
const giftCardTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gift Card from {{RESTAURANT_NAME}}</title>
</head>
<body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: {{PRIMARY_COLOR}}; padding: 40px 20px; text-align: center; color: white;">
            {{LOGO}}
            <h1 style="margin: 0; font-size: 32px; font-weight: bold;">Gift Card</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">From {{RESTAURANT_NAME}}</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px;">
            <h2 style="color: #000000; margin: 0 0 20px 0; font-size: 24px;">Dear {{RECIPIENT_NAME}},</h2>
            
            <div style="background: #f8f9fa; border-left: 4px solid {{PRIMARY_COLOR}}; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; font-size: 16px; color: #000000; font-style: italic;">{{PERSONAL_MESSAGE}}</p>
                <p style="margin: 10px 0 0 0; text-align: right; color: #000000; font-size: 14px;">- {{SENDER_NAME}}</p>
            </div>
            
            <!-- Gift Card Code -->
            <div style="text-align: center; margin: 30px 0; padding: 30px; background: #f8f9fa; border-radius: 8px; border: 2px dashed {{PRIMARY_COLOR}};">
                <h3 style="margin: 0 0 15px 0; color: {{PRIMARY_COLOR}}; font-size: 20px;">Gift Card Code</h3>
                <div style="background: {{PRIMARY_COLOR}}; color: white; padding: 15px 30px; border-radius: 6px; font-family: monospace; font-size: 24px; font-weight: bold; letter-spacing: 2px;">
                    {{GIFT_CARD_CODE}}
                </div>
                <p style="margin: 15px 0 0 0; color: #000000; font-size: 18px; font-weight: bold;">Value: {{GIFT_CARD_AMOUNT}}</p>
            </div>
            
            <div style="text-align: center; color: #000000; font-size: 14px; margin-top: 30px;">
                <p>Present this code when ordering to redeem your gift card.</p>
                <p>Valid for one year from the date of issue.</p>
            </div>
        </div>
        
        <!-- Footer -->
        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
            <p style="margin: 0; color: #000000; font-size: 14px;">{{FOOTER_TEXT}}</p>
        </div>
        {{SOCIAL_MEDIA}}
    </div>
</body>
</html>
`;

export default function AdvancedEmailTemplateEditor() {
  const { tenantSlug } = useTenant();
  const [activeTab, setActiveTab] = useState<'food_order' | 'gift_card' | 'item_sale'>('food_order');
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingSocialMedia, setIsSavingSocialMedia] = useState(false);
  const [showCustomization, setShowCustomization] = useState(false);
  const [customization, setCustomization] = useState({
    ...defaultCustomization,
    headerStyle: 'modern' as 'modern' | 'classic' | 'minimal',
    buttonStyle: 'rounded' as 'rounded' | 'square' | 'pill'
  });
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Initialize default templates
  useEffect(() => {
    if (tenantSlug) {
      loadTemplatesFromDatabase();
      loadGlobalCustomization();
    }
  }, [tenantSlug]);

  const loadGlobalCustomization = async () => {
    try {
      console.log('🎨 Loading global customization from database...');
      const response = await fetch(`/api/${tenantSlug}/email/get-global-customization`);
      if (response.ok) {
        const globalCustom = await response.json();
        if (globalCustom.success && globalCustom.data) {
          console.log('✅ Global customization loaded:', globalCustom.data);
          setCustomization({
            ...customization,
            primaryColor: globalCustom.data.primaryColor || customization.primaryColor,
            secondaryColor: globalCustom.data.secondaryColor || customization.secondaryColor,
            backgroundColor: globalCustom.data.backgroundColor || customization.backgroundColor,
            textColor: globalCustom.data.textColor || customization.textColor,
            logoUrl: globalCustom.data.logoUrl || customization.logoUrl,
            logoWidth: globalCustom.data.logoWidth || customization.logoWidth,
            logoHeight: globalCustom.data.logoHeight || customization.logoHeight,
            showLogo: globalCustom.data.showLogo !== undefined ? globalCustom.data.showLogo : customization.showLogo,
            footerText: globalCustom.data.footerText || customization.footerText,
            restaurantPhone: globalCustom.data.restaurantPhone || customization.restaurantPhone,
            restaurantAddress: globalCustom.data.restaurantAddress || customization.restaurantAddress,
            restaurantEmail: globalCustom.data.restaurantEmail || customization.restaurantEmail,
            vatNumber: globalCustom.data.vatNumber || customization.vatNumber,
            businessRegistration: globalCustom.data.businessRegistration || customization.businessRegistration,
            iconColor: globalCustom.data.iconColor || customization.iconColor,
            instagramUrl: globalCustom.data.instagramUrl || customization.instagramUrl,
            tiktokUrl: globalCustom.data.tiktokUrl || customization.tiktokUrl,
            facebookUrl: globalCustom.data.facebookUrl || customization.facebookUrl,
            websiteUrl: globalCustom.data.websiteUrl || customization.websiteUrl,
            enableSocialIcons: globalCustom.data.enableSocialIcons !== undefined ? globalCustom.data.enableSocialIcons : customization.enableSocialIcons
          });
        }
      } else {
        console.log('⚠️ No global customization found, using defaults');
      }
    } catch (error) {
      console.error('❌ Error loading global customization:', error);
    }
  };

  const loadTemplatesFromDatabase = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/email-templates?tenant=${tenantSlug}`);
      if (response.ok) {
        const dbTemplates = await response.json();
        
        // Convert database format to component format
        const convertedTemplates: EmailTemplate[] = dbTemplates.map((template: any) => ({
          id: template.id,
          name: template.template_name,
          type: template.template_type,
          category: template.template_type === 'gift_card' ? 'gift_card' : 'item_sale',
          subject: template.subject,
          htmlContent: template.html_content,
          textContent: "",
          variables: availableVariables[template.template_type] || [],
          isActive: template.is_active,
          customization: {
            primaryColor: template.primary_color || '#667eea',
            secondaryColor: template.secondary_color || '#764ba2',
            backgroundColor: template.background_color || '#ffffff',
            textColor: template.text_color || '#333333',
            logoUrl: template.logo_url || '',
            logoWidth: 200,
            logoHeight: 80,
            showLogo: true,
            footerText: 'Thank you for choosing us!',
            headerStyle: 'modern' as const,
            buttonStyle: 'rounded' as const,
            // Social Media Icons
            enableSocialIcons: true,
            iconColor: template.icon_color || '#666666',
            instagramUrl: template.instagram_url || '',
            tiktokUrl: template.tiktok_url || '',
            facebookUrl: template.facebook_url || '',
            websiteUrl: template.website_url || ''
          }
        }));
        
        setTemplates(convertedTemplates);
        if (convertedTemplates.length > 0) {
          setSelectedTemplate(convertedTemplates[0]);
          // Don't override customization from database templates
        }
      } else {
        // Fallback to default templates if API fails
        initializeDefaultTemplates();
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      // Fallback to default templates
      initializeDefaultTemplates();
    } finally {
      setIsLoading(false);
    }
  };

  const initializeDefaultTemplates = () => {
    const defaultTemplates: EmailTemplate[] = [
      {
        id: 1,
        name: "Food Order Confirmation",
        type: "food_order",
        category: "food_order",
        subject: "Order Confirmation #{{ORDER_ID}} - {{RESTAURANT_NAME}}",
        htmlContent: foodOrderTemplate,
        textContent: "Hi {{CUSTOMER_NAME}}, your order #{{ORDER_ID}} has been confirmed. Total: {{ORDER_TOTAL}}. Expected {{DELIVERY_METHOD}}: {{DELIVERY_TIME}}.",
        variables: availableVariables.food_order,
        isActive: true,
        customization: { ...defaultCustomization }
      },
      {
        id: 2,
        name: "Gift Card Delivery",
        type: "gift_card",
        category: "gift_card",
        subject: "Gift Card from {{SENDER_NAME}} - {{RESTAURANT_NAME}}",
        htmlContent: giftCardTemplate,
        textContent: "Dear {{RECIPIENT_NAME}}, {{SENDER_NAME}} has sent you a gift card! Code: {{GIFT_CARD_CODE}} Amount: {{GIFT_CARD_AMOUNT}}",
        variables: availableVariables.gift_card,
        isActive: true,
        customization: { ...defaultCustomization }
      },
      {
        id: 3,
        name: "Item Sale Promotion",
        type: "item_sale",
        category: "item_sale",
        subject: "Special Offer: {{ITEM_NAME}} - {{DISCOUNT_PERCENT}} Off! - {{RESTAURANT_NAME}}",
        htmlContent: itemSaleTemplate,
        textContent: "Special offer: {{ITEM_NAME}} now {{DISCOUNT_PERCENT}} off! {{SPECIAL_OFFER}}. Sale ends {{SALE_END_DATE}}.",
        variables: availableVariables.item_sale,
        isActive: true,
        customization: { ...defaultCustomization }
      }
    ];
    setTemplates(defaultTemplates);
    setSelectedTemplate(defaultTemplates[0]); // Select food order template by default
  };

  const handleTemplateContentChange = (newContent: string) => {
    if (selectedTemplate) {
      setSelectedTemplate({
        ...selectedTemplate,
        htmlContent: newContent
      });
    }
  };

  const handleCustomizationChange = (newCustomization: any) => {
    setCustomization(newCustomization);
    if (selectedTemplate) {
      setSelectedTemplate({
        ...selectedTemplate,
        customization: newCustomization
      });
    }
  };

  const handleSubjectChange = (newSubject: string) => {
    if (selectedTemplate) {
      setSelectedTemplate({
        ...selectedTemplate,
        subject: newSubject
      });
    }
  };

  const handleSaveTemplate = async () => {
    if (!selectedTemplate || !selectedTemplate.id) return;
    
    setIsLoading(true);
    try {
      // Prepare the data for the API
      const updateData = {
        template_name: selectedTemplate.name,
        subject: selectedTemplate.subject,
        html_content: selectedTemplate.htmlContent,
        logo_url: selectedTemplate.customization.logoUrl,
        primary_color: selectedTemplate.customization.primaryColor,
        secondary_color: selectedTemplate.customization.secondaryColor,
        background_color: selectedTemplate.customization.backgroundColor,
        text_color: selectedTemplate.customization.textColor,
        // Social media URLs removed - no longer needed
        facebook_url: '',
        instagram_url: '',
        tiktok_url: '',
        website_url: '',
        from_name: '',
        from_email: '',
        reply_to_email: '',
        is_active: selectedTemplate.isActive
      };

      const response = await fetch(`/api/admin/email-templates/${selectedTemplate.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Template saved successfully!" });
        setIsEditing(false);
        // Reload templates to get updated data
        await loadTemplatesFromDatabase();
      } else {
        const errorData = await response.json();
        setMessage({ type: "error", text: errorData.error || "Failed to save template" });
      }
    } catch (error) {
      console.error('Error saving template:', error);
      setMessage({ type: "error", text: "Failed to save template" });
    } finally {
      setIsLoading(false);
    }
  };

  // New function to save global customization to all templates
  const handleSaveGlobalCustomization = async () => {
    setIsLoading(true);
    try {
      console.log('🎨 Applying global customization:', customization);
      
      // Helper function to ensure URLs have proper protocol
      const ensureHttps = (url: string): string => {
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://')) {
          return url;
        }
        return `https://${url}`;
      };
      
      // Update all templates with the new global customization
      const updatePromises = templates.map(async (template: any) => {
        const updateData = {
          template_name: template.name,
          subject: template.subject,
          html_content: template.htmlContent,
          logo_url: customization.logoUrl,
          primary_color: customization.primaryColor,
          secondary_color: customization.secondaryColor,
          background_color: customization.backgroundColor,
          text_color: customization.textColor,
          // Social Media Icons - NEW SMART SYSTEM
          icon_color: customization.iconColor,
          instagram_url: customization.instagramUrl,
          tiktok_url: customization.tiktokUrl,
          facebook_url: customization.facebookUrl,
          website_url: customization.websiteUrl,
          enable_social_icons: customization.enableSocialIcons,
          from_name: template.from_name || '',
          from_email: template.from_email || '',
          reply_to_email: template.reply_to_email || '',
          is_active: template.isActive
        };

        console.log(`📧 Updating template: ${template.name}`, updateData);

        const response = await fetch(`/api/admin/email-templates/${template.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData)
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error(`❌ Failed to update template ${template.name}:`, errorData);
          throw new Error(`Failed to update template ${template.name || template.id}: ${errorData.error}`);
        }
        
        return response.json();
      });

      await Promise.all(updatePromises);
      
      // Also save to global_template_customization table for EmailConfirmationService
      console.log('🎨 Saving global customization to database...');
      const globalCustomResponse = await fetch(`/api/${tenantSlug}/email/save-global-customization`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          primaryColor: customization.primaryColor,
          secondaryColor: customization.secondaryColor,
          backgroundColor: customization.backgroundColor,
          textColor: customization.textColor,
          logoUrl: customization.logoUrl,
          logoWidth: customization.logoWidth,
          logoHeight: customization.logoHeight,
          showLogo: customization.showLogo,
          footerText: customization.footerText,
          iconColor: customization.iconColor,
          instagramUrl: customization.instagramUrl,
          tiktokUrl: customization.tiktokUrl,
          facebookUrl: customization.facebookUrl,
          websiteUrl: customization.websiteUrl,
          enableSocialIcons: customization.enableSocialIcons
        })
      });

      if (!globalCustomResponse.ok) {
        console.warn('⚠️ Failed to save global customization, but templates were updated');
      } else {
        console.log('✅ Global customization saved successfully');
      }
      
      setMessage({ type: "success", text: `Global customization applied to ${templates.length} templates! Brand colors updated.` });
      
      // Reload templates to get updated data
      await loadTemplatesFromDatabase();
      
      // Update the selected template if one is selected
      if (selectedTemplate) {
        setSelectedTemplate(prev => {
          if (!prev) return null;
          return {
            ...prev,
            customization: {
              ...prev.customization,
              primaryColor: customization.primaryColor,
              secondaryColor: customization.secondaryColor,
              backgroundColor: customization.backgroundColor,
              textColor: customization.textColor,
              logoUrl: customization.logoUrl,
              footerText: customization.footerText
            }
          };
        });
      }
      
      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      console.error('Error applying global customization:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setMessage({ type: "error", text: `Failed to apply global customization: ${errorMessage}` });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle saving header & footer colors only (updated to use global customization)
  const handleSaveColors = async () => {
    setIsLoading(true);
    try {
      console.log('🎨 Saving header & footer colors:', {
        headerColor: customization.primaryColor,
        footerColor: customization.secondaryColor
      });

      // Save to global customization (this applies to all templates)
      const response = await fetch(`/api/${tenantSlug}/email/save-global-customization`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          primaryColor: customization.primaryColor,
          secondaryColor: customization.secondaryColor,
          backgroundColor: customization.backgroundColor,
          textColor: customization.textColor,
          logoUrl: customization.logoUrl,
          logoWidth: customization.logoWidth,
          logoHeight: customization.logoHeight,
          showLogo: customization.showLogo,
          footerText: customization.footerText,
          restaurantPhone: customization.restaurantPhone,
          restaurantAddress: customization.restaurantAddress,
          restaurantEmail: customization.restaurantEmail,
          vatNumber: customization.vatNumber,
          businessRegistration: customization.businessRegistration,
          iconColor: customization.iconColor,
          instagramUrl: customization.instagramUrl,
          tiktokUrl: customization.tiktokUrl,
          facebookUrl: customization.facebookUrl,
          websiteUrl: customization.websiteUrl,
          enableSocialIcons: customization.enableSocialIcons
        })
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ 
          type: "success", 
          text: `Header & footer colors applied to all email templates! Header: ${customization.primaryColor}, Footer: ${customization.secondaryColor}` 
        });
        
        // Reload templates to show updated colors
        await loadTemplatesFromDatabase();
        
        console.log('✅ Header & footer colors saved for all tenant email templates');
      } else {
        throw new Error(result.error || 'Failed to save colors');
      }

      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      console.error('Error saving header & footer colors:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setMessage({ type: "error", text: `Failed to save colors: ${errorMessage}` });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle saving social media settings only (new dedicated function)
  const handleSaveSocialMediaSettings = async () => {
    setIsSavingSocialMedia(true);
    try {
      console.log('📱 Saving social media settings:', {
        enableSocialIcons: customization.enableSocialIcons,
        iconColor: customization.iconColor,
        instagramUrl: customization.instagramUrl,
        tiktokUrl: customization.tiktokUrl,
        facebookUrl: customization.facebookUrl,
        websiteUrl: customization.websiteUrl
      });

      const response = await fetch(`/api/${tenantSlug}/email/save-social-media`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enableSocialIcons: customization.enableSocialIcons,
          iconColor: customization.iconColor,
          instagramUrl: customization.instagramUrl,
          tiktokUrl: customization.tiktokUrl,
          facebookUrl: customization.facebookUrl,
          websiteUrl: customization.websiteUrl
        })
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ 
          type: "success", 
          text: `Social media settings saved successfully! Icons are now ${customization.enableSocialIcons ? 'enabled' : 'disabled'} with color ${customization.iconColor}` 
        });
        
        console.log('✅ Social media settings saved for tenant:', tenantSlug);
      } else {
        throw new Error(result.error || 'Failed to save social media settings');
      }

      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      console.error('Error saving social media settings:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setMessage({ type: "error", text: `Failed to save social media settings: ${errorMessage}` });
    } finally {
      setIsSavingSocialMedia(false);
    }
  };

  // Generate social media icons HTML
  const generateSocialIconsHtml = (customization: any) => {
    if (!customization.enableSocialIcons) {
      return '';
    }

    const iconColor = customization.iconColor || '#666666';
    const iconSize = 24;
    const icons = [];

    // Instagram Icon
    if (customization.instagramUrl) {
      icons.push(`
        <a href="${customization.instagramUrl}" style="text-decoration: none; margin: 0 8px; display: inline-block;">
          <svg width="${iconSize}" height="${iconSize}" fill="${iconColor}" viewBox="0 0 24 24" style="vertical-align: middle;">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
        </a>
      `);
    }

    // TikTok Icon
    if (customization.tiktokUrl) {
      icons.push(`
        <a href="${customization.tiktokUrl}" style="text-decoration: none; margin: 0 8px; display: inline-block;">
          <svg width="${iconSize}" height="${iconSize}" fill="${iconColor}" viewBox="0 0 24 24" style="vertical-align: middle;">
            <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-.88-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
          </svg>
        </a>
      `);
    }

    // Facebook Icon
    if (customization.facebookUrl) {
      icons.push(`
        <a href="${customization.facebookUrl}" style="text-decoration: none; margin: 0 8px; display: inline-block;">
          <svg width="${iconSize}" height="${iconSize}" fill="${iconColor}" viewBox="0 0 24 24" style="vertical-align: middle;">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
        </a>
      `);
    }

    // Website Icon
    if (customization.websiteUrl) {
      icons.push(`
        <a href="${customization.websiteUrl}" style="text-decoration: none; margin: 0 8px; display: inline-block;">
          <svg width="${iconSize}" height="${iconSize}" fill="none" stroke="${iconColor}" viewBox="0 0 24 24" stroke-width="2" style="vertical-align: middle;">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            <path d="M2 12h20"/>
          </svg>
        </a>
      `);
    }

    if (icons.length === 0) {
      return '';
    }

    return `
      <div style="text-align: center; margin: 20px 0; padding: 15px 0; border-top: 1px solid #e1e5e9;">
        <div style="margin-bottom: 8px; font-size: 14px; color: #000000; font-weight: 500;">Follow Us</div>
        <div style="display: inline-block;">
          ${icons.join('')}
        </div>
      </div>
    `;
  };

  const generateSmartFooter = () => {
    let footerContent = '';
    
    // Add main footer text
    if (customization.footerText && customization.footerText.trim()) {
      footerContent += `<div style="text-align: center; padding: 20px; background: ${customization.secondaryColor}; border-radius: 8px; color: white; margin-bottom: 20px;">
        <p style="margin: 0; font-size: 16px;">${customization.footerText}</p>
      </div>`;
    }
    
    // Build business information section
    const businessInfo = [];
    if (customization.restaurantPhone) businessInfo.push(`<strong>Phone:</strong> ${customization.restaurantPhone}`);
    if (customization.restaurantEmail) businessInfo.push(`<strong>Email:</strong> ${customization.restaurantEmail}`);
    if (customization.restaurantAddress) businessInfo.push(`<strong>Address:</strong> ${customization.restaurantAddress}`);
    if (customization.vatNumber) businessInfo.push(`<strong>VAT Number:</strong> ${customization.vatNumber}`);
    if (customization.businessRegistration) businessInfo.push(`<strong>Business Registration:</strong> ${customization.businessRegistration}`);
    
    if (businessInfo.length > 0) {
      footerContent += `<div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 15px;">
        <h4 style="margin: 0 0 10px 0; color: #333; font-size: 16px;">Contact Information</h4>
        <div style="font-size: 14px; color: #666; line-height: 1.6;">
          ${businessInfo.map(info => `<div style="margin: 5px 0;">${info}</div>`).join('')}
        </div>
      </div>`;
    }
    
    return footerContent;
  };

  const previewTemplate = (template: EmailTemplate) => {
    const sampleData = template.category === 'gift_card' ? {
      'RECIPIENT_NAME': 'John Doe',
      'SENDER_NAME': 'Jane Smith',
      'PERSONAL_MESSAGE': 'Happy Birthday! Hope you have a wonderful celebration!',
      'GIFT_CARD_CODE': 'GIFT123456',
      'GIFT_CARD_AMOUNT': '£50.00',
      'RESTAURANT_NAME': 'Kitchen Restaurant'
    } : template.category === 'food_order' ? {
      'CUSTOMER_NAME': 'Galib Qurishi',
      'ORDER_ID': 'KIT-9134',
      'ORDER_DATE': '9/6/2025',
      'DELIVERY_METHOD': 'Delivery to 443A Brockley Road, London, SE23 1JP',
      'DELIVERY_ADDRESS': '443A Brockley Road, London, SE23 1JP',
      'ORDER_ITEMS': '<div style="display: flex; justify-content: space-between; margin: 8px 0; padding: 8px; border-bottom: 1px solid #eee;"><span>Lamb (x3)</span><span style="font-weight: 500;">£30</span></div><div style="display: flex; justify-content: space-between; margin: 8px 0; padding: 8px; border-bottom: 1px solid #eee;"><span>Fried Rice (x1)</span><span style="font-weight: 500;">£30</span></div><div style="display: flex; justify-content: space-between; margin: 8px 0; padding: 8px; border-bottom: 1px solid #eee;"><span>peow (x1)</span><span style="font-weight: 500;">£30</span></div><div style="display: flex; justify-content: space-between; margin: 8px 0; padding: 8px; border-bottom: 1px solid #eee;"><span>Egg Fried (x1)</span><span style="font-weight: 500;">£30</span></div><div style="display: flex; justify-content: space-between; margin: 8px 0; padding: 8px;"><span>normal (x1)</span><span style="font-weight: 500;">£30</span></div>',
      'ITEMS_TOTAL': '£29.00',
      'DELIVERY_FEE': '£2.50',
      'VOUCHER_DISCOUNT': '-£3.50',
      'TOTAL_AMOUNT': '£31.50',
      'PAYMENT_METHOD': 'Cash Payment',
      'ESTIMATED_TIME': '60 minutes',
      'RESTAURANT_NAME': 'Kitchen Restaurant',
      'SMART_FOOTER': generateSmartFooter()
    } : {
      'CUSTOMER_NAME': 'John Doe',
      'ITEM_NAME': 'Chicken Tikka Masala',
      'ITEM_DESCRIPTION': 'Tender chicken in a rich, creamy tomato-based sauce with aromatic spices',
      'ITEM_PRICE': '£18.99',
      'ORIGINAL_PRICE': '£24.99',
      'DISCOUNT_PERCENT': '25%',
      'SALE_END_DATE': 'September 15, 2025',
      'PROMOTION_TYPE': 'Weekly Special',
      'SPECIAL_OFFER': 'Buy One Get One 50% Off',
      'RESTAURANT_NAME': 'Kitchen Restaurant'
    };

    let processedHtml = template.htmlContent;
    
    // Handle conditional logic for food order templates
    if (template.category === 'food_order') {
      // Handle delivery vs collection conditional display
      const deliveryMethod = sampleData['DELIVERY_METHOD'] as string || '';
      const isDelivery = deliveryMethod.includes('Delivery');
      
      // Replace conditional blocks for delivery address
      processedHtml = processedHtml.replace(/\{\{#if DELIVERY_ADDRESS\}\}[\s\S]*?\{\{\/if\}\}/g, (match) => {
        return isDelivery ? match.replace(/\{\{#if DELIVERY_ADDRESS\}\}/, '').replace(/\{\{\/if\}\}/, '') : '';
      });
      
      // Replace conditional blocks for delivery fee (hide if £0.00)
      const deliveryFee = sampleData['DELIVERY_FEE'] as string || '';
      const hasDeliveryFee = deliveryFee && deliveryFee !== '£0.00';
      processedHtml = processedHtml.replace(/\{\{#if DELIVERY_FEE\}\}[\s\S]*?\{\{\/if\}\}/g, (match) => {
        return hasDeliveryFee ? match.replace(/\{\{#if DELIVERY_FEE\}\}/, '').replace(/\{\{\/if\}\}/, '') : '';
      });
      
      // Replace conditional blocks for voucher discount (hide if none)
      const voucherDiscount = sampleData['VOUCHER_DISCOUNT'] as string || '';
      const hasVoucherDiscount = voucherDiscount && voucherDiscount !== '£0.00' && voucherDiscount !== '';
      processedHtml = processedHtml.replace(/\{\{#if VOUCHER_DISCOUNT\}\}[\s\S]*?\{\{\/if\}\}/g, (match) => {
        return hasVoucherDiscount ? match.replace(/\{\{#if VOUCHER_DISCOUNT\}\}/, '').replace(/\{\{\/if\}\}/, '') : '';
      });
      
      // Handle delivery vs collection timing text
      processedHtml = processedHtml.replace(/\{\{#if_delivery\}\}(.*?)\{\{else\}\}(.*?)\{\{\/if_delivery\}\}/g, (match, deliveryText, collectionText) => {
        return isDelivery ? deliveryText : collectionText;
      });
    }
    
    // Replace template variables with both {{}} and #{} format
    Object.entries(sampleData).forEach(([key, value]) => {
      const regexBraces = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      const regexHash = new RegExp(`#\\{${key}\\}`, 'g');
      processedHtml = processedHtml.replace(regexBraces, value);
      processedHtml = processedHtml.replace(regexHash, value);
    });

    // Apply global customization from the customization panel - support both formats
    processedHtml = processedHtml
      .replace(/\{\{PRIMARY_COLOR\}\}/g, customization.primaryColor)
      .replace(/#\{PRIMARY_COLOR\}/g, customization.primaryColor)
      .replace(/\{\{SECONDARY_COLOR\}\}/g, customization.secondaryColor)
      .replace(/#\{SECONDARY_COLOR\}/g, customization.secondaryColor)
      .replace(/\{\{BACKGROUND_COLOR\}\}/g, customization.backgroundColor)
      .replace(/#\{BACKGROUND_COLOR\}/g, customization.backgroundColor)
      .replace(/\{\{TEXT_COLOR\}\}/g, customization.textColor)
      .replace(/#\{TEXT_COLOR\}/g, customization.textColor);

    // Enhanced footer text replacement with line break support
    const formatFooterText = (text: string) => {
      if (!text || text.trim() === '') return '';
      // Convert line breaks to HTML <br> tags and wrap in proper paragraph structure
      return text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => `<div style="margin: 2px 0;">${line}</div>`)
        .join('');
    };

    const formattedFooterText = formatFooterText(customization.footerText);
    processedHtml = processedHtml
      .replace(/\{\{FOOTER_TEXT\}\}/g, formattedFooterText)
      .replace(/#\{FOOTER_TEXT\}/g, formattedFooterText);

    // Apply logo if available and enabled - support both formats
    if (customization.logoUrl && customization.logoUrl.trim() !== '' && customization.showLogo) {
      const logoHtml = 
        '<div style="text-align: center; margin-bottom: 20px;">' +
          '<img src="' + customization.logoUrl + '" ' +
               'alt="Restaurant Logo" ' +
               'style="width: ' + (customization.logoWidth || 200) + 'px; height: ' + (customization.logoHeight || 80) + 'px; object-fit: contain; max-width: 100%;" ' +
               'onerror="this.style.display=\'none\';">' +
        '</div>';
      processedHtml = processedHtml.replace(/\{\{LOGO\}\}/g, logoHtml);
      processedHtml = processedHtml.replace(/#\{LOGO\}/g, logoHtml);
    } else {
      // If no logo is available or disabled, replace with empty string
      processedHtml = processedHtml.replace(/\{\{LOGO\}\}/g, '');
      processedHtml = processedHtml.replace(/#\{LOGO\}/g, '');
    }

    // Apply social media icons - NEW SMART SYSTEM with sample data for preview
    const previewCustomization = {
      ...customization,
      enableSocialIcons: true,
      instagramUrl: customization.instagramUrl || 'https://instagram.com/kitchenrestaurant',
      facebookUrl: customization.facebookUrl || 'https://facebook.com/kitchenrestaurant',
      tiktokUrl: customization.tiktokUrl || 'https://tiktok.com/@kitchenrestaurant',
      websiteUrl: customization.websiteUrl || 'https://kitchenrestaurant.com'
    };
    const socialIconsHtml = generateSocialIconsHtml(previewCustomization);
    processedHtml = processedHtml.replace(/\{\{SOCIAL_ICONS\}\}/g, socialIconsHtml);
    processedHtml = processedHtml.replace(/#\{SOCIAL_ICONS\}/g, socialIconsHtml);
    
    // Remove legacy social media placeholders
    processedHtml = processedHtml.replace(/\{\{SOCIAL_MEDIA\}\}/g, socialIconsHtml);
    processedHtml = processedHtml.replace(/#\{SOCIAL_LINKS\}/g, socialIconsHtml);
    processedHtml = processedHtml.replace(/\{\{SOCIAL_LINKS\}\}/g, socialIconsHtml);

    // Add business name replacement
    processedHtml = processedHtml.replace(/\{\{BUSINESS_NAME\}\}/g, 'Kitchen Restaurant');
    processedHtml = processedHtml.replace(/#\{BUSINESS_NAME\}/g, 'Kitchen Restaurant');

    return processedHtml;
  };

  const filteredTemplates = templates.filter(t => t.category === activeTab);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Email Templates</h1>
          <p className="text-gray-600 mt-1">Manage your food order and gift card email templates</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant={showCustomization ? "default" : "outline"}
            size="sm"
            onClick={() => setShowCustomization(!showCustomization)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Customize
          </Button>
          <Button 
            onClick={() => window.open('/final-professional-email.html', '_blank')}
            variant="outline"
            size="sm"
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview Sample
          </Button>
        </div>
      </div>

      {/* Customization Panel */}
      {showCustomization && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-800">
              <Palette className="h-5 w-5 mr-2" />
              Global Template Customization
            </CardTitle>
            <CardDescription className="text-blue-700">
              Customize colors, logo, and branding that will apply to all email templates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Logo Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm font-medium flex items-center">
                      <Upload className="h-4 w-4 mr-2" />
                      Restaurant Logo
                    </Label>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">Show in emails</span>
                      <button
                        type="button"
                        className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                          customization.showLogo ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                        onClick={() => setCustomization(prev => ({ ...prev, showLogo: !prev.showLogo }))}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                            customization.showLogo ? 'translate-x-3.5' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3 mt-2">
                    {/* File Upload Option */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-normal">Upload Logo File</Label>
                        {customization.logoUrl && (
                          <span className="text-xs text-green-600 flex items-center">
                            ✓ Logo uploaded
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="file"
                          accept="image/*"
                          disabled={isUploading}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setIsUploading(true);
                              try {
                                const formData = new FormData();
                                formData.append('logo', file);
                                
                                const response = await fetch(`/api/${tenantSlug}/upload-logo`, {
                                  method: 'POST',
                                  body: formData,
                                });
                                
                                const result = await response.json();
                                
                                if (result.success) {
                                  // Update customization state
                                  setCustomization(prev => ({ ...prev, logoUrl: result.data.url }));
                                  
                                  // Automatically save the logo to global customization for all templates
                                  console.log('🏢 Auto-applying logo to all email templates...');
                                  const globalCustomResponse = await fetch(`/api/${tenantSlug}/email/save-global-customization`, {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                      ...customization,
                                      logoUrl: result.data.url
                                    })
                                  });

                                  if (globalCustomResponse.ok) {
                                    setMessage({ type: "success", text: 'Logo uploaded and applied to all email templates!' });
                                    // Reload templates to show updated logo
                                    await loadTemplatesFromDatabase();
                                  } else {
                                    setMessage({ type: "success", text: 'Logo uploaded successfully! Click "Apply Global Customization" to update all templates.' });
                                  }
                                } else {
                                  setMessage({ type: "error", text: `Upload failed: ${result.error}` });
                                }
                              } catch (error) {
                                console.error('Upload error:', error);
                                setMessage({ type: "error", text: 'Failed to upload logo. Please try again.' });
                              } finally {
                                setIsUploading(false);
                                e.target.value = '';
                              }
                            }
                          }}
                          className="flex-1"
                        />
                        {isUploading && (
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Upload className="h-4 w-4 animate-spin" />
                            <span>Uploading...</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Supported formats: JPG, PNG, GIF, WebP. Maximum file size: 5MB.
                      </p>
                    </div>

                    {/* Logo Settings */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Width (px)</Label>
                        <Input
                          type="number"
                          value={customization.logoWidth}
                          onChange={(e) => setCustomization(prev => ({ ...prev, logoWidth: Number(e.target.value) }))}
                          className="text-xs"
                          placeholder="200"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Height (px)</Label>
                        <Input
                          type="number"
                          value={customization.logoHeight}
                          onChange={(e) => setCustomization(prev => ({ ...prev, logoHeight: Number(e.target.value) }))}
                          className="text-xs"
                          placeholder="80"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Logo Preview */}
                {customization.logoUrl && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Logo Preview</Label>
                    <div className="p-3 border rounded-md bg-gray-50">
                      <img 
                        src={customization.logoUrl} 
                        alt="Restaurant Logo Preview" 
                        style={{
                          width: customization.logoWidth ? `${customization.logoWidth}px` : 'auto',
                          height: customization.logoHeight ? `${customization.logoHeight}px` : 'auto',
                          maxWidth: '100%',
                          objectFit: 'contain'
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCustomization(prev => ({ ...prev, logoUrl: '' }))}
                        className="mt-2 text-xs"
                      >
                        Remove Logo
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Email Header & Footer Colors */}
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium flex items-center">
                    <Palette className="h-4 w-4 mr-2" />
                    Email Header & Footer Colors
                  </Label>
                  <p className="text-xs text-gray-500 mt-1 mb-3">
                    Set solid colors for email headers and footers. Changes apply to all email templates instantly.
                  </p>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Header Color</Label>
                      <p className="text-xs text-gray-400 mb-1">Applied to email header background</p>
                      <div className="flex space-x-2">
                        <Input
                          type="color"
                          value={customization.primaryColor}
                          onChange={(e) => setCustomization(prev => ({ ...prev, primaryColor: e.target.value }))}
                          className="w-12 h-8 p-1 border rounded"
                        />
                        <Input
                          type="text"
                          value={customization.primaryColor}
                          onChange={(e) => setCustomization(prev => ({ ...prev, primaryColor: e.target.value }))}
                          className="flex-1 text-xs"
                          placeholder="#667eea"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Footer Color</Label>
                      <p className="text-xs text-gray-400 mb-1">Applied to email footer background</p>
                      <div className="flex space-x-2">
                        <Input
                          type="color"
                          value={customization.secondaryColor}
                          onChange={(e) => setCustomization(prev => ({ ...prev, secondaryColor: e.target.value }))}
                          className="w-12 h-8 p-1 border rounded"
                        />
                        <Input
                          type="text"
                          value={customization.secondaryColor}
                          onChange={(e) => setCustomization(prev => ({ ...prev, secondaryColor: e.target.value }))}
                          className="flex-1 text-xs"
                          placeholder="#764ba2"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save Colors Button */}
                <div className="border-t pt-4">
                  <Button 
                    onClick={handleSaveColors}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    size="sm"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Apply Header & Footer Colors
                  </Button>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Updates header and footer colors for all email templates in this tenant
                  </p>
                </div>

                {/* Simple Footer Message */}
                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium flex items-center">
                      <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                      </svg>
                      Footer Message
                    </Label>
                    <div className="text-xs text-gray-500">
                      Shows in ALL email templates
                    </div>
                  </div>
                  
                  <Textarea
                    value={customization.footerText}
                    onChange={(e) => setCustomization(prev => ({ ...prev, footerText: e.target.value }))}
                    placeholder={`Thank you for choosing Kitchen Restaurant!
📞 07306506797 | 📧 mail@kitckehn.com | 📍 443A Brockley Road
VAT: 089474728377 | Reg: Order Web

You can use HTML tags like <br> for line breaks
<strong>Bold text</strong> and <em>italic text</em> are supported`}
                    rows={6}
                    className="text-sm resize-none font-mono"
                  />
                  
                  <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3">
                    <div className="text-xs font-medium text-emerald-800 mb-2">📝 Simple Footer System:</div>
                    <ul className="text-xs text-emerald-700 space-y-1">
                      <li>• <strong>HTML Support:</strong> Use HTML tags like &lt;br&gt;, &lt;strong&gt;, &lt;em&gt;</li>
                      <li>• <strong>Line Breaks:</strong> Use &lt;br&gt; tag or press Enter for new lines</li>
                      <li>• <strong>Global Display:</strong> Footer appears in ALL email templates automatically</li>
                      <li>• <strong>Simple & Flexible:</strong> Write whatever you want in plain text or HTML</li>
                    </ul>
                  </div>
                  
                  <div className="text-xs text-gray-500 bg-gray-50 rounded p-2">
                    <strong>Example with HTML:</strong><br/>
                    Thank you for choosing Kitchen Restaurant!&lt;br&gt;<br/>
                    📞 07306506797 | 📧 mail@kitckehn.com&lt;br&gt;<br/>
                    📍 443A Brockley Road&lt;br&gt;<br/>
                    VAT: 089474728377 | Reg: Order Web
                  </div>
                </div>

                {/* Social Media Icons */}
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium flex items-center">
                      <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                      </svg>
                      Social Media Icons
                    </Label>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">Enable</span>
                      <button
                        type="button"
                        className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                          customization.enableSocialIcons ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                        onClick={() => setCustomization(prev => ({ ...prev, enableSocialIcons: !prev.enableSocialIcons }))}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                            customization.enableSocialIcons ? 'translate-x-3.5' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                  
                  {customization.enableSocialIcons && (
                    <div className="space-y-3">
                      {/* Icon Color */}
                      <div className="space-y-1">
                        <Label className="text-xs">Icon Color</Label>
                        <div className="flex space-x-2">
                          <Input
                            type="color"
                            value={customization.iconColor}
                            onChange={(e) => setCustomization(prev => ({ ...prev, iconColor: e.target.value }))}
                            className="w-12 h-8 p-1 border rounded"
                          />
                          <Input
                            type="text"
                            value={customization.iconColor}
                            onChange={(e) => setCustomization(prev => ({ ...prev, iconColor: e.target.value }))}
                            className="flex-1 text-xs"
                            placeholder="#666666"
                          />
                        </div>
                      </div>
                      
                      {/* Social Media URLs */}
                      <div className="grid grid-cols-1 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs flex items-center">
                            <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                            </svg>
                            Instagram URL
                          </Label>
                          <Input
                            type="url"
                            value={customization.instagramUrl}
                            onChange={(e) => setCustomization(prev => ({ ...prev, instagramUrl: e.target.value }))}
                            placeholder="https://instagram.com/yourrestaurant"
                            className="text-xs"
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <Label className="text-xs flex items-center">
                            <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-.88-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                            </svg>
                            TikTok URL
                          </Label>
                          <Input
                            type="url"
                            value={customization.tiktokUrl}
                            onChange={(e) => setCustomization(prev => ({ ...prev, tiktokUrl: e.target.value }))}
                            placeholder="https://tiktok.com/@yourrestaurant"
                            className="text-xs"
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <Label className="text-xs flex items-center">
                            <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                            </svg>
                            Facebook URL
                          </Label>
                          <Input
                            type="url"
                            value={customization.facebookUrl}
                            onChange={(e) => setCustomization(prev => ({ ...prev, facebookUrl: e.target.value }))}
                            placeholder="https://facebook.com/yourrestaurant"
                            className="text-xs"
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <Label className="text-xs flex items-center">
                            <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                              <circle cx="12" cy="12" r="10"/>
                              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                              <path d="M2 12h20"/>
                            </svg>
                            Website URL
                          </Label>
                          <Input
                            type="url"
                            value={customization.websiteUrl}
                            onChange={(e) => setCustomization(prev => ({ ...prev, websiteUrl: e.target.value }))}
                            placeholder="https://yourrestaurant.com"
                            className="text-xs"
                          />
                        </div>
                      </div>
                      
                      {/* Social Media Preview */}
                      <div className="space-y-2">
                        <Label className="text-xs">Preview</Label>
                        <div className="p-3 border rounded-md bg-gray-50 flex justify-center space-x-4">
                          {customization.instagramUrl && (
                            <a href={customization.instagramUrl} className="transition-opacity hover:opacity-70">
                              <svg width="24" height="24" fill={customization.iconColor} viewBox="0 0 24 24">
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                              </svg>
                            </a>
                          )}
                          {customization.tiktokUrl && (
                            <a href={customization.tiktokUrl} className="transition-opacity hover:opacity-70">
                              <svg width="24" height="24" fill={customization.iconColor} viewBox="0 0 24 24">
                                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-.88-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                              </svg>
                            </a>
                          )}
                          {customization.facebookUrl && (
                            <a href={customization.facebookUrl} className="transition-opacity hover:opacity-70">
                              <svg width="24" height="24" fill={customization.iconColor} viewBox="0 0 24 24">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                              </svg>
                            </a>
                          )}
                          {customization.websiteUrl && (
                            <a href={customization.websiteUrl} className="transition-opacity hover:opacity-70">
                              <svg width="24" height="24" fill="none" stroke={customization.iconColor} viewBox="0 0 24 24" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                                <path d="M2 12h20"/>
                              </svg>
                            </a>
                          )}
                          {!customization.instagramUrl && !customization.tiktokUrl && !customization.facebookUrl && !customization.websiteUrl && (
                            <span className="text-xs text-gray-400">Add URLs above to see icon preview</span>
                          )}
                        </div>
                      </div>
                      
                      {/* Save Social Media Settings Button */}
                      <div className="pt-3 border-t">
                        <Button 
                          onClick={handleSaveSocialMediaSettings}
                          className="w-full bg-blue-600 hover:bg-blue-700"
                          size="sm"
                          disabled={isSavingSocialMedia}
                        >
                          {isSavingSocialMedia ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4 mr-2" />
                          )}
                          Save Social Media Settings
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Apply Button */}
                <Button 
                  onClick={handleSaveGlobalCustomization}
                  className="w-full"
                  size="sm"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Apply Global Customization
                </Button>

              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {message && (
        <Alert className={message.type === "success" ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}>
          {message.type === "success" ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription className={message.type === "success" ? "text-green-800" : "text-red-800"}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Tab Navigation */}
      <Tabs value={activeTab} onValueChange={(value) => {
        setActiveTab(value as 'food_order' | 'gift_card' | 'item_sale');
        const firstTemplate = templates.find(t => t.category === value);
        setSelectedTemplate(firstTemplate || null);
        setIsEditing(false);
      }}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="food_order" className="flex items-center space-x-2">
            <ShoppingBag className="h-4 w-4" />
            <span>Food Order Emails</span>
          </TabsTrigger>
          <TabsTrigger value="gift_card" className="flex items-center space-x-2">
            <Gift className="h-4 w-4" />
            <span>Gift Card Emails</span>
          </TabsTrigger>
          <TabsTrigger value="item_sale" className="flex items-center space-x-2">
            <Tag className="h-4 w-4" />
            <span>Item Sale Emails</span>
          </TabsTrigger>
        </TabsList>

        {/* Food Order Templates */}
        <TabsContent value="food_order" className="space-y-6">
          {/* Template Editor */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center">
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Food Order Email Template
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => setIsEditing(!isEditing)}
                    variant="outline"
                    size="sm"
                  >
                    {isEditing ? (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </>
                    ) : (
                      <>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <CardDescription>
                Create professional order confirmation emails for food orders, pickups, and deliveries
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3">Available Variables</h4>
                      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                        {availableVariables.food_order.map((variable) => (
                          <div
                            key={variable.key}
                            className="p-2 bg-white border rounded cursor-pointer hover:bg-blue-50 text-xs"
                            title={variable.description}
                          >
                            <code className="text-blue-600">{`{{${variable.key}}}`}</code>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-semibold text-lg">Live Preview</h3>
                    <Button
                      onClick={() => {
                        const previewWindow = window.open('', '_blank');
                        if (previewWindow) {
                          const foodOrderTemplate = templates.find(t => t.category === 'food_order');
                          if (foodOrderTemplate) {
                            previewWindow.document.write(previewTemplate(foodOrderTemplate));
                            previewWindow.document.close();
                          }
                        }
                      }}
                      variant="outline"
                      size="sm"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Full Preview
                    </Button>
                  </div>
                  
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-100 px-4 py-2 border-b">
                      <span className="text-sm font-medium">Sample Email Preview</span>
                    </div>
                    <div 
                      key={`food-preview-${customization.primaryColor}-${customization.secondaryColor}-${customization.footerText}-${customization.logoUrl}-${customization.showLogo}`}
                      className="p-4 bg-white max-h-96 overflow-y-auto"
                      dangerouslySetInnerHTML={{
                        __html: previewTemplate({
                          category: 'food_order',
                          htmlContent: templates.find(t => t.category === 'food_order')?.htmlContent || foodOrderTemplate
                        } as EmailTemplate),
                      }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gift Card Templates */}
        <TabsContent value="gift_card" className="space-y-6">
          {/* Template Editor */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center">
                  <Gift className="h-4 w-4 mr-2" />
                  Gift Card Email Template
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Button
                    variant={isEditing ? "outline" : "default"}
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    {isEditing ? 'Preview' : 'Edit'}
                  </Button>
                  {isEditing && (
                    <Button size="sm" onClick={handleSaveTemplate} disabled={isLoading}>
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save Template
                    </Button>
                  )}
                </div>
              </div>
              <CardDescription>
                Send personalized gift cards with custom messages and beautiful design
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-6">
                  {/* Basic Settings */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="subject">Email Subject</Label>
                      <Input
                        id="subject"
                        value="Gift Card from {{RESTAURANT_NAME}} - {{SENDER_NAME}}"
                        placeholder="Use {{VARIABLES}} in subject line"
                        className="font-mono text-sm"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isActive"
                        defaultChecked={true}
                        className="rounded"
                      />
                      <Label htmlFor="isActive" className="font-medium">
                        Template is active
                      </Label>
                    </div>
                  </div>

                  {/* Available Variables */}
                  <div className="bg-gray-50 p-4 rounded">
                    <h4 className="font-medium mb-2 flex items-center">
                      <Code className="h-4 w-4 mr-2" />
                      Available Variables
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {availableVariables.gift_card.map((variable) => (
                        <div
                          key={variable.key}
                          className="p-2 bg-white border rounded cursor-pointer hover:bg-blue-50 text-xs"
                          title={variable.description}
                        >
                          <code className="text-blue-600">{`{{${variable.key}}}`}</code>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-semibold text-lg">Live Preview</h3>
                    <Button
                      onClick={() => {
                        const previewWindow = window.open('', '_blank');
                        if (previewWindow) {
                          const giftCardTemplate = templates.find(t => t.category === 'gift_card');
                          if (giftCardTemplate) {
                            previewWindow.document.write(previewTemplate(giftCardTemplate));
                            previewWindow.document.close();
                          }
                        }
                      }}
                      variant="outline"
                      size="sm"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Full Preview
                    </Button>
                  </div>
                  
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-100 px-4 py-2 border-b">
                      <span className="text-sm font-medium">Sample Email Preview</span>
                    </div>
                    <div 
                      key={`gift-preview-${customization.primaryColor}-${customization.secondaryColor}-${customization.footerText}-${customization.logoUrl}-${customization.showLogo}`}
                      className="p-4 bg-white max-h-96 overflow-y-auto"
                      dangerouslySetInnerHTML={{
                        __html: previewTemplate({
                          category: 'gift_card',
                          htmlContent: templates.find(t => t.category === 'gift_card')?.htmlContent || giftCardTemplate
                        } as EmailTemplate),
                      }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Item Sale Templates */}
        <TabsContent value="item_sale" className="space-y-6">
          {/* Template Editor */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center">
                  <Tag className="h-4 w-4 mr-2" />
                  Item Sale Email Template
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Button
                    variant={isEditing ? "outline" : "default"}
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    {isEditing ? 'Preview' : 'Edit'}
                  </Button>
                  {isEditing && (
                    <Button size="sm" onClick={handleSaveTemplate} disabled={isLoading}>
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save Template
                    </Button>
                  )}
                </div>
              </div>
              <CardDescription>
                Create compelling promotional emails for item sales, special offers, and limited-time deals
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-6">
                  {/* Basic Settings */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="subject">Email Subject</Label>
                      <Input
                        id="subject"
                        value="Special Offer: {{ITEM_NAME}} - Save {{DISCOUNT_PERCENT}}!"
                        placeholder="Use {{VARIABLES}} in subject line"
                        className="font-mono text-sm"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isActive"
                        defaultChecked={true}
                        className="rounded"
                      />
                      <Label htmlFor="isActive" className="font-medium">
                        Template is active
                      </Label>
                    </div>
                  </div>

                  {/* Available Variables */}
                  <div className="bg-gray-50 p-4 rounded">
                    <h4 className="font-medium mb-2 flex items-center">
                      <Code className="h-4 w-4 mr-2" />
                      Available Variables
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {availableVariables.item_sale.map((variable) => (
                        <div
                          key={variable.key}
                          className="p-2 bg-white border rounded cursor-pointer hover:bg-blue-50 text-xs"
                          title={variable.description}
                        >
                          <code className="text-blue-600">{`{{${variable.key}}}`}</code>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-semibold text-lg">Live Preview</h3>
                    <Button
                      onClick={() => {
                        const previewWindow = window.open('', '_blank');
                        if (previewWindow) {
                          const itemSaleTemplateData = templates.find(t => t.category === 'item_sale');
                          if (itemSaleTemplateData) {
                            previewWindow.document.write(previewTemplate(itemSaleTemplateData));
                            previewWindow.document.close();
                          }
                        }
                      }}
                      variant="outline"
                      size="sm"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Full Preview
                    </Button>
                  </div>
                  
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-100 px-4 py-2 border-b">
                      <span className="text-sm font-medium">Sample Email Preview</span>
                    </div>
                    <div 
                      key={`item-preview-${customization.primaryColor}-${customization.secondaryColor}-${customization.footerText}-${customization.logoUrl}-${customization.showLogo}`}
                      className="p-4 bg-white max-h-96 overflow-y-auto"
                      dangerouslySetInnerHTML={{
                        __html: previewTemplate({
                          category: 'item_sale',
                          htmlContent: templates.find(t => t.category === 'item_sale')?.htmlContent || itemSaleTemplate
                        } as EmailTemplate),
                      }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
