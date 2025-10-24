// ================================================================
// PHONE-BASED LOYALTY SERVICE
// Complete service for managing loyalty points using phone numbers
// ================================================================

import db from './db';

export interface LoyaltyCustomer {
  customerId?: string;
  phone: string;
  displayPhone: string;
  normalizedPhone: string;
  loyaltyCardNumber: string;
  customerName: string;
  email?: string;
  pointsBalance: number;
  totalPointsEarned: number;
  totalPointsRedeemed: number;
  tierLevel: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  nextTierPoints: number;
  isActive: boolean;
  joinedDate: string;
  lastOrderDate?: string;
  totalOrders: number;
  totalSpent: number;
}

export interface LoyaltyTransaction {
  id: string;
  phone: string;
  transactionType: 'earn' | 'redeem' | 'bonus' | 'adjustment' | 'expire';
  pointsAmount: number;
  pointsBalanceBefore: number;
  pointsBalanceAfter: number;
  reason: string;
  orderTotal?: number;
  orderId?: string;
  processedAt: string;
  processedBy?: string;
}

export interface LoyaltySettings {
  programName: string;
  isActive: boolean;
  earnRateType: 'percentage' | 'fixed' | 'pound';
  earnRateValue: number;
  minOrderForPoints: number;
  pointsExpireDays: number;
  bronzeMinPoints: number;
  silverMinPoints: number;
  goldMinPoints: number;
  platinumMinPoints: number;
  diamondMinPoints: number;
  welcomeBonusPoints: number;
  birthdayBonusPoints: number;
  referralBonusPoints: number;
  redemptionMinimum: number;
  redemptionIncrement: number;
  pointValuePounds: number;
  maxRedeemPerOrderPercent: number;
}

export class PhoneLoyaltyService {
  
  /**
   * Normalize phone number to standard format
   */
  static normalizePhoneNumber(phone: string): string {
    if (!phone) return '';
    
    // Remove all non-numeric characters
    let normalized = phone.replace(/[^0-9]/g, '');
    
    // Handle UK numbers starting with 0
    if (normalized.startsWith('0') && normalized.length === 11) {
      normalized = '44' + normalized.substring(1);
    }
    
    // Handle numbers already starting with 44
    if (normalized.startsWith('44') && normalized.length === 12) {
      return normalized;
    }
    
    // Handle numbers starting with +44 (already stripped to numbers)
    if (normalized.startsWith('44') && normalized.length === 13) {
      return normalized.substring(1); // Remove extra digit
    }
    
    return normalized;
  }

  /**
   * Format phone number for display
   */
  static formatPhoneForDisplay(phone: string): string {
    const normalized = this.normalizePhoneNumber(phone);
    
    if (normalized.startsWith('44') && normalized.length === 12) {
      // Format as: 07890 123456
      const ukNumber = '0' + normalized.substring(2);
      return ukNumber.substring(0, 5) + ' ' + ukNumber.substring(5);
    }
    
    return phone; // Return original if can't format
  }

  /**
   * Generate loyalty card number
   */
  static async generateLoyaltyCardNumber(tenantId: string): Promise<string> {
    try {
      // Get tenant name for prefix
      const [tenantResult] = await db.execute(
        'SELECT JSON_UNQUOTE(JSON_EXTRACT(settings, "$.name")) as name FROM tenants WHERE id = ?',
        [tenantId]
      );
      
      const tenant = (tenantResult as any[])[0];
      const prefix = tenant?.name ? tenant.name.substring(0, 3).toUpperCase() : 'LOY';
      
      // Generate unique card number
      let cardNumber: string;
      let isUnique = false;
      
      while (!isUnique) {
        const randomSuffix = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
        cardNumber = `${prefix}${randomSuffix}`;
        
        const [existing] = await db.execute(
          'SELECT COUNT(*) as count FROM loyalty_phone_lookup WHERE loyalty_card_number = ? AND tenant_id = ?',
          [cardNumber, tenantId]
        );
        
        isUnique = (existing as any[])[0].count === 0;
      }
      
      return cardNumber!;
    } catch (error) {
      console.error('Error generating loyalty card number:', error);
      return `LOY${Date.now()}`;
    }
  }

  /**
   * Look up customer by phone number
   */
  static async lookupByPhone(phone: string, tenantId: string): Promise<LoyaltyCustomer | null> {
    try {
      const normalizedPhone = this.normalizePhoneNumber(phone);
      
      const [result] = await db.execute(`
        SELECT 
          lpl.phone,
          lpl.display_phone,
          lpl.normalized_phone,
          lpl.loyalty_card_number,
          lpl.customer_id,
          lpl.is_active,
          c.name as customer_name,
          c.email,
          c.created_at as joined_date,
          clp.points_balance,
          clp.total_points_earned,
          clp.total_points_redeemed,
          clp.tier_level,
          c.total_orders,
          c.total_spent,
          c.last_order_date,
          ls.silver_min_points,
          ls.gold_min_points,
          ls.platinum_min_points,
          ls.diamond_min_points
        FROM loyalty_phone_lookup lpl
        LEFT JOIN customers c ON lpl.customer_id = c.id
        LEFT JOIN customer_loyalty_points clp ON lpl.customer_id = clp.customer_id AND lpl.tenant_id = clp.tenant_id
        LEFT JOIN loyalty_settings ls ON lpl.tenant_id = ls.tenant_id
        WHERE lpl.normalized_phone = ? AND lpl.tenant_id = ? AND lpl.is_active = 1
      `, [normalizedPhone, tenantId]);

      const customer = (result as any[])[0];
      if (!customer) return null;

      // Calculate next tier points needed
      let nextTierPoints = 0;
      const currentPoints = customer.total_points_earned || 0;
      
      switch (customer.tier_level) {
        case 'bronze':
          nextTierPoints = (customer.silver_min_points || 500) - currentPoints;
          break;
        case 'silver':
          nextTierPoints = (customer.gold_min_points || 1500) - currentPoints;
          break;
        case 'gold':
          nextTierPoints = (customer.platinum_min_points || 3000) - currentPoints;
          break;
        case 'platinum':
          nextTierPoints = (customer.diamond_min_points || 5000) - currentPoints;
          break;
        case 'diamond':
          nextTierPoints = 0; // Already at max tier
          break;
      }

      return {
        customerId: customer.customer_id,
        phone: customer.phone,
        displayPhone: customer.display_phone,
        normalizedPhone: customer.normalized_phone,
        loyaltyCardNumber: customer.loyalty_card_number,
        customerName: customer.customer_name || 'Loyalty Member',
        email: customer.email,
        pointsBalance: customer.points_balance || 0,
        totalPointsEarned: customer.total_points_earned || 0,
        totalPointsRedeemed: customer.total_points_redeemed || 0,
        tierLevel: customer.tier_level || 'bronze',
        nextTierPoints: Math.max(0, nextTierPoints),
        isActive: customer.is_active,
        joinedDate: customer.joined_date,
        lastOrderDate: customer.last_order_date,
        totalOrders: customer.total_orders,
        totalSpent: customer.total_spent || 0
      };

    } catch (error) {
      console.error('Error looking up customer by phone:', error);
      return null;
    }
  }

  /**
   * Create new loyalty member with phone number
   */
  static async createLoyaltyMember(
    phone: string, 
    tenantId: string, 
    customerName: string = 'Loyalty Member',
    customerId?: string
  ): Promise<LoyaltyCustomer | null> {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const normalizedPhone = this.normalizePhoneNumber(phone);
      const displayPhone = this.formatPhoneForDisplay(phone);
      const loyaltyCardNumber = await this.generateLoyaltyCardNumber(tenantId);

      // Create phone lookup entry
      await connection.execute(`
        INSERT INTO loyalty_phone_lookup 
        (phone, tenant_id, customer_id, loyalty_card_number, normalized_phone, display_phone)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [phone, tenantId, customerId, loyaltyCardNumber, normalizedPhone, displayPhone]);

      // Create loyalty points entry
      await connection.execute(`
        INSERT INTO customer_loyalty_points 
        (customer_id, tenant_id, points_balance, total_points_earned, total_points_redeemed, tier_level)
        VALUES (?, ?, 0, 0, 0, 'bronze')
      `, [customerId, tenantId]);

      // Add welcome bonus points
      const [settingsResult] = await connection.execute(
        'SELECT welcome_bonus_points FROM loyalty_settings WHERE tenant_id = ?',
        [tenantId]
      );
      
      const settings = (settingsResult as any[])[0];
      const welcomeBonus = settings?.welcome_bonus_points || 100;

      if (welcomeBonus > 0) {
        await this.addPoints(
          phone, 
          tenantId, 
          welcomeBonus, 
          'Welcome bonus for joining loyalty program',
          'bonus',
          connection
        );
      }

      await connection.commit();

      // Return the new member data
      return await this.lookupByPhone(phone, tenantId);

    } catch (error) {
      await connection.rollback();
      console.error('Error creating loyalty member:', error);
      return null;
    } finally {
      connection.release();
    }
  }

  /**
   * Add loyalty points
   */
  static async addPoints(
    phone: string,
    tenantId: string,
    points: number,
    reason: string,
    transactionType: 'earn' | 'bonus' | 'adjustment' = 'earn',
    connection?: any,
    orderId?: string,
    orderTotal?: number
  ): Promise<boolean> {
    const conn = connection || await db.getConnection();
    const shouldRelease = !connection;

    try {
      if (!connection) await conn.beginTransaction();

      const normalizedPhone = this.normalizePhoneNumber(phone);

      // Get customer ID from phone lookup
      const [customerResult] = await conn.execute(
        'SELECT customer_id FROM loyalty_phone_lookup WHERE normalized_phone = ? AND tenant_id = ?',
        [normalizedPhone, tenantId]
      );

      const customer = (customerResult as any[])[0];
      if (!customer) {
        console.error('Customer not found for phone:', phone);
        return false;
      }

      const customerId = customer.customer_id;

      // Get current balance
      const [balanceResult] = await conn.execute(
        'SELECT points_balance, total_points_earned FROM customer_loyalty_points WHERE customer_id = ? AND tenant_id = ?',
        [customerId, tenantId]
      );

      const currentData = (balanceResult as any[])[0];
      const currentBalance = currentData?.points_balance || 0;
      const totalEarned = currentData?.total_points_earned || 0;
      const newBalance = currentBalance + points;
      const newTotalEarned = totalEarned + (transactionType === 'earn' || transactionType === 'bonus' ? points : 0);

      // Update points balance
      await conn.execute(`
        UPDATE customer_loyalty_points 
        SET 
          points_balance = ?,
          total_points_earned = ?,
          updated_at = NOW()
        WHERE customer_id = ? AND tenant_id = ?
      `, [newBalance, newTotalEarned, customerId, tenantId]);

      // Log transaction in loyalty_transactions table  
      // Map transaction types to valid database enum values
      let txType: string;
      switch (transactionType) {
        case 'earn':
          txType = 'earned';
          break;
        case 'bonus':
          txType = 'earned'; // Map bonus to earned
          break;
        case 'adjustment':
          txType = 'adjustment';
          break;
        default:
          txType = 'earned'; // Default to 'earned' for all point additions
      }
      await conn.execute(`
        INSERT INTO loyalty_transactions 
        (customer_id, tenant_id, transaction_type, points_amount, description, order_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [customerId, tenantId, txType, points, reason, orderId || null]);

      // Also log in phone_loyalty_transactions if it exists
      try {
        await conn.execute(`
          INSERT INTO phone_loyalty_transactions 
          (phone, tenant_id, customer_id, operation_type, points_amount, operation_details)
          VALUES (?, ?, ?, 'add_points', ?, JSON_OBJECT('reason', ?, 'order_id', ?))
        `, [phone, tenantId, customerId, points, reason, orderId || null]);
      } catch (phoneLogError) {
        // Don't fail if phone transaction logging fails
        console.warn('Could not log to phone_loyalty_transactions:', phoneLogError);
      }

      // Check for tier upgrade based on total points earned
      await this.checkTierUpgrade(customerId, tenantId, newTotalEarned, conn);

      if (!connection) await conn.commit();
      return true;

    } catch (error) {
      if (!connection) await conn.rollback();
      console.error('Error adding points:', error);
      return false;
    } finally {
      if (shouldRelease) conn.release();
    }
  }

  /**
   * Redeem loyalty points
   */
  static async redeemPoints(
    phone: string,
    tenantId: string,
    points: number,
    reason: string,
    orderId?: string
  ): Promise<{ success: boolean; message: string; newBalance?: number }> {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Get customer ID from phone lookup
      const [lookupResult] = await connection.execute(
        'SELECT customer_id FROM loyalty_phone_lookup WHERE normalized_phone = ? AND tenant_id = ?',
        [this.normalizePhoneNumber(phone), tenantId]
      );

      if (!lookupResult || (lookupResult as any[]).length === 0) {
        await connection.rollback();
        return {
          success: false,
          message: 'Customer not found in loyalty program'
        };
      }

      const customerId = (lookupResult as any[])[0].customer_id;

      // Get current balance
      const [balanceResult] = await connection.execute(
        'SELECT points_balance, total_points_redeemed FROM customer_loyalty_points WHERE customer_id = ? AND tenant_id = ?',
        [customerId, tenantId]
      );

      const currentBalance = (balanceResult as any[])[0]?.points_balance || 0;
      const totalRedeemed = (balanceResult as any[])[0]?.total_points_redeemed || 0;

      if (currentBalance < points) {
        await connection.rollback();
        return {
          success: false,
          message: `Insufficient points. Current balance: ${currentBalance}, Requested: ${points}`
        };
      }

      const newBalance = currentBalance - points;
      const newTotalRedeemed = totalRedeemed + points;

      // Update points balance
      await connection.execute(
        'UPDATE customer_loyalty_points SET points_balance = ?, total_points_redeemed = ?, updated_at = NOW() WHERE customer_id = ? AND tenant_id = ?',
        [newBalance, newTotalRedeemed, customerId, tenantId]
      );

      // Record transaction
      await connection.execute(`
        INSERT INTO phone_loyalty_transactions 
        (customer_id, tenant_id, phone, operation_type, points_amount, operation_details, transaction_reference) 
        VALUES (?, ?, ?, 'redeem_points', ?, ?, ?)
      `, [customerId, tenantId, phone, points, JSON.stringify({ reason, redeemedAt: new Date().toISOString() }), orderId || null]);

      await connection.commit();

      console.log(`✅ Redeemed ${points} points for ${phone}. New balance: ${newBalance}`);

      return {
        success: true,
        message: `Successfully redeemed ${points} points`,
        newBalance: newBalance
      };

    } catch (error) {
      await connection.rollback();
      console.error('❌ Error redeeming points:', error);
      return {
        success: false,
        message: 'Failed to redeem points due to database error'
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Check and upgrade tier level
   */
  static async checkTierUpgrade(customerId: string, tenantId: string, totalPointsEarned: number, connection?: any): Promise<void> {
    const conn = connection || db;

    try {
      // Get loyalty settings and current tier
      const [result] = await conn.execute(`
        SELECT 
          clp.tier_level,
          ls.silver_min_points,
          ls.gold_min_points,
          ls.platinum_min_points,
          ls.diamond_min_points
        FROM customer_loyalty_points clp
        JOIN loyalty_settings ls ON clp.tenant_id = ls.tenant_id
        WHERE clp.customer_id = ? AND clp.tenant_id = ?
      `, [customerId, tenantId]);

      const data = (result as any[])[0];
      if (!data) return;

      let newTier = data.tier_level;
      const currentTier = data.tier_level;

      // Determine new tier based on total points earned
      if (totalPointsEarned >= (data.diamond_min_points || 5000)) {
        newTier = 'diamond';
      } else if (totalPointsEarned >= (data.platinum_min_points || 3000)) {
        newTier = 'platinum';
      } else if (totalPointsEarned >= (data.gold_min_points || 1500)) {
        newTier = 'gold';
      } else if (totalPointsEarned >= (data.silver_min_points || 500)) {
        newTier = 'silver';
      } else {
        newTier = 'bronze';
      }

      // Update tier if it has changed
      if (newTier !== currentTier) {
        await conn.execute(`
          UPDATE customer_loyalty_points 
          SET tier_level = ?, updated_at = NOW()
          WHERE customer_id = ? AND tenant_id = ?
        `, [newTier, customerId, tenantId]);

        console.log(`🎉 Customer ${customerId} upgraded from ${currentTier} to ${newTier} tier!`);

        // Log tier upgrade transaction
        await conn.execute(`
          INSERT INTO loyalty_transactions 
          (customer_id, tenant_id, transaction_type, points_amount, description)
          VALUES (?, ?, 'bonus', 0, ?)
        `, [customerId, tenantId, `Tier upgraded from ${currentTier} to ${newTier}`]);
      }
    } catch (error) {
      console.error('Error checking tier upgrade:', error);
    }
  }

  /**
   * Get loyalty transaction history
   */
  static async getTransactionHistory(
    phone: string, 
    tenantId: string, 
    limit: number = 50
  ): Promise<LoyaltyTransaction[]> {
    try {
      const [result] = await db.execute(`
        SELECT 
          id,
          phone,
          operation_type as transaction_type,
          points_amount,
          0 as points_balance_before,
          0 as points_balance_after,
          transaction_reference as reason,
          0 as order_total,
          transaction_reference as order_id,
          created_at as processed_at,
          staff_member as processed_by
        FROM phone_loyalty_transactions
        WHERE phone = ? AND tenant_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `, [phone, tenantId, limit]);

      return (result as any[]).map(row => ({
        id: row.id,
        phone: row.phone,
        transactionType: row.transaction_type,
        pointsAmount: row.points_amount,
        pointsBalanceBefore: row.points_balance_before,
        pointsBalanceAfter: row.points_balance_after,
        reason: row.reason,
        orderTotal: row.order_total,
        orderId: row.order_id,
        processedAt: row.processed_at,
        processedBy: row.processed_by
      }));

    } catch (error) {
      console.error('Error getting transaction history:', error);
      return [];
    }
  }

  /**
   * Calculate points to earn for order amount
   */
  static async calculatePointsForOrder(
    tenantId: string, 
    orderAmount: number
  ): Promise<number> {
    try {
      const [result] = await db.execute(`
        SELECT 
          earn_rate_type,
          earn_rate_value,
          min_order_for_points
        FROM loyalty_settings 
        WHERE tenant_id = ?
      `, [tenantId]);

      const settings = (result as any[])[0];
      if (!settings || orderAmount < (settings.min_order_for_points || 5)) {
        return 0;
      }

      switch (settings.earn_rate_type) {
        case 'percentage':
          return Math.floor(orderAmount * (settings.earn_rate_value / 100));
        case 'fixed':
          return settings.earn_rate_value;
        case 'pound':
          return Math.floor(orderAmount / (settings.earn_rate_value || 1));
        default:
          return Math.floor(orderAmount); // 1 point per £1
      }
    } catch (error) {
      console.error('Error calculating points for order:', error);
      return Math.floor(orderAmount); // Default: 1 point per £1
    }
  }

  /**
   * Get loyalty program settings
   */
  static async getLoyaltySettings(tenantId: string): Promise<LoyaltySettings | null> {
    try {
      const [result] = await db.execute(
        'SELECT * FROM loyalty_settings WHERE tenant_id = ?',
        [tenantId]
      );

      const settings = (result as any[])[0];
      if (!settings) return null;

      return {
        programName: settings.program_name,
        isActive: settings.is_active,
        earnRateType: settings.earn_rate_type,
        earnRateValue: settings.earn_rate_value,
        minOrderForPoints: settings.min_order_for_points,
        pointsExpireDays: settings.points_expire_days,
        bronzeMinPoints: settings.bronze_min_points,
        silverMinPoints: settings.silver_min_points,
        goldMinPoints: settings.gold_min_points,
        platinumMinPoints: settings.platinum_min_points,
        diamondMinPoints: settings.diamond_min_points,
        welcomeBonusPoints: settings.welcome_bonus_points,
        birthdayBonusPoints: settings.birthday_bonus_points,
        referralBonusPoints: settings.referral_bonus_points,
        redemptionMinimum: settings.redemption_minimum,
        redemptionIncrement: settings.redemption_increment,
        pointValuePounds: settings.point_value_pounds,
        maxRedeemPerOrderPercent: settings.max_redeem_per_order_percent
      };
    } catch (error) {
      console.error('Error getting loyalty settings:', error);
      return null;
    }
  }

  /**
   * Process loyalty points for a completed order
   */
  static async processOrderPoints(
    phone: string,
    tenantId: string,
    orderTotal: number,
    orderId: string,
    customerName: string = 'Customer'
  ): Promise<{ pointsEarned: number; newBalance: number } | null> {
    try {
      // Get loyalty settings
      const settings = await this.getLoyaltySettings(tenantId);
      if (!settings || !settings.isActive) {
        console.log('Loyalty program not active for tenant:', tenantId);
        return null;
      }

      // Check minimum order requirement
      if (orderTotal < parseFloat(settings.minOrderForPoints.toString())) {
        console.log(`Order total ${orderTotal} below minimum ${settings.minOrderForPoints} for points`);
        return null;
      }

      // Calculate points earned based on settings
      let pointsEarned = 0;
      switch (settings.earnRateType) {
        case 'percentage':
          pointsEarned = Math.floor(orderTotal * (parseFloat(settings.earnRateValue.toString()) / 100));
          break;
        case 'fixed':
          pointsEarned = parseInt(settings.earnRateValue.toString());
          break;
        case 'pound':
          pointsEarned = Math.floor(orderTotal / parseFloat(settings.earnRateValue.toString()));
          break;
        default:
          pointsEarned = Math.floor(orderTotal); // Default: 1 point per pound
      }

      if (pointsEarned <= 0) {
        console.log('No points earned for order:', orderId);
        return null;
      }

      // Look up customer by phone
      const customer = await this.lookupByPhone(phone, tenantId);
      if (!customer) {
        // Create new loyalty member if they don't exist
        console.log('Creating new loyalty member for phone:', phone);
        const newCustomer = await this.createLoyaltyMember(phone, tenantId, customerName);
        if (!newCustomer) {
          console.error('Failed to create loyalty member');
          return null;
        }
      }

      // Add points using the existing addPoints method
      const success = await this.addPoints(phone, tenantId, pointsEarned, `Order #${orderId}`, 'earn', undefined, orderId, orderTotal);
      
      if (success) {
        // Get the updated balance
        const updatedCustomer = await this.lookupByPhone(phone, tenantId);
        const newBalance = updatedCustomer?.pointsBalance || 0;
        
        console.log(`✅ Added ${pointsEarned} points for order ${orderId} to phone ${phone}`);
        return {
          pointsEarned,
          newBalance
        };
      }

      return null;
    } catch (error) {
      console.error('Error processing order points:', error);
      throw error;
    }
  }
}

export default PhoneLoyaltyService;
