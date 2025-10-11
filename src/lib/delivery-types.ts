// TypeScript interfaces for Stripe Connect and Delivery System

export interface DeliveryOption {
  type: 'collection' | 'email' | 'delivery_normal' | 'delivery_express';
  label: string;
  price: number;
  description: string;
  available: boolean;
}

export interface DeliveryAddress {
  name: string;
  phone: string;
  street: string;
  city: string;
  postcode: string;
  notes?: string;
}

export interface TenantPaymentSettings {
  stripe_connect_account_id?: string;
  delivery_normal_fee: number;
  delivery_express_fee: number;
}

export interface OrderWithDelivery {
  id: string;
  tenant_id: string;
  customer_id?: string;
  total_amount: number;
  delivery_type: 'collection' | 'email' | 'delivery_normal' | 'delivery_express';
  delivery_fee: number;
  delivery_address?: string;
  delivery_name?: string;
  delivery_phone?: string;
  delivery_street?: string;
  delivery_city?: string;
  delivery_postcode?: string;
  delivery_notes?: string;
  stripe_payment_intent_id?: string;
  stripe_charge_id?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentTransaction {
  id: string;
  order_id: string;
  tenant_id: string;
  stripe_payment_intent_id: string;
  stripe_charge_id?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'canceled';
  payment_method_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  type: 'physical' | 'digital' | 'gift_card' | 'service';
  variants?: Array<{
    type: string;
    option: string;
    price_modifier: number;
  }>;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  delivery_type?: 'collection' | 'email' | 'delivery_normal' | 'delivery_express';
  delivery_fee: number;
  total: number;
  delivery_address?: DeliveryAddress;
}

export interface StripePaymentIntent {
  id: string;
  client_secret: string;
  amount: number;
  currency: string;
  status: string;
  application_fee_amount?: number;
  transfer_data?: {
    destination: string;
  };
}

export interface CheckoutFormData {
  customer_email: string;
  customer_name: string;
  customer_phone: string;
  delivery_type: 'collection' | 'email' | 'delivery_normal' | 'delivery_express';
  delivery_address?: DeliveryAddress;
  special_instructions?: string;
}
