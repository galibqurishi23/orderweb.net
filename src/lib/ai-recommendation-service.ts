import db from '@/lib/db';

interface RecommendationItem {
  id: string;
  name: string;
  category: string;
  price: number;
  image?: string;
  confidence: number; // 0-1 score
  reason: string; // Why this is recommended
}

interface CustomerOrderPattern {
  customerId: string;
  frequentItems: string[];
  preferredCategories: string[];
  averageOrderValue: number;
  dietaryPreferences: string[];
  lastOrderItems: string[];
}

export class AIRecommendationService {
  
  /**
   * Get personalized recommendations for a customer
   */
  static async getPersonalizedRecommendations(
    customerId: string, 
    tenantId: string, 
    currentCartItems: string[] = [],
    maxRecommendations: number = 5
  ): Promise<RecommendationItem[]> {
    try {
      const recommendations: RecommendationItem[] = [];
      
      // Get customer order history and preferences
      const customerPattern = await this.getCustomerOrderPattern(customerId, tenantId);
      
      // Get complementary items for current cart
      const complementaryItems = await this.getComplementaryItems(currentCartItems, tenantId);
      
      // Get trending items
      const trendingItems = await this.getTrendingItems(tenantId);
      
      // Combine and rank recommendations
      const allRecommendations = [
        ...await this.getPersonalizedFromHistory(customerPattern, tenantId),
        ...complementaryItems,
        ...await this.getDietaryCompatibleItems(customerPattern.dietaryPreferences, tenantId),
        ...trendingItems
      ];
      
      // Remove duplicates and items already in cart
      const uniqueRecommendations = this.removeDuplicatesAndCartItems(
        allRecommendations, 
        currentCartItems
      );
      
      // Sort by confidence score and return top recommendations
      return uniqueRecommendations
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, maxRecommendations);
        
    } catch (error) {
      console.error('Error getting personalized recommendations:', error);
      return [];
    }
  }

  /**
   * Get recommendations for items that go well together
   */
  static async getComplementaryItems(
    mainItems: string[], 
    tenantId: string
  ): Promise<RecommendationItem[]> {
    if (mainItems.length === 0) return [];
    
    try {
      // Find items frequently ordered together
      const [complementaryData] = await db.execute(`
        SELECT 
          mi.id,
          mi.name,
          mi.category,
          mi.price,
          mi.image,
          COUNT(*) as frequency,
          (COUNT(*) / total_orders.count) as confidence
        FROM menu_items mi
        JOIN order_items oi1 ON mi.id = oi1.menu_item_id
        JOIN order_items oi2 ON oi1.order_id = oi2.order_id
        JOIN (
          SELECT COUNT(DISTINCT order_id) as count 
          FROM order_items 
          WHERE menu_item_id IN (${mainItems.map(() => '?').join(',')})
        ) total_orders
        WHERE oi2.menu_item_id IN (${mainItems.map(() => '?').join(',')})
          AND mi.id NOT IN (${mainItems.map(() => '?').join(',')})
          AND mi.tenant_id = ?
          AND mi.is_available = 1
        GROUP BY mi.id
        HAVING frequency >= 3
        ORDER BY confidence DESC
        LIMIT 10
      `, [...mainItems, ...mainItems, ...mainItems, tenantId]);

      return (complementaryData as any[]).map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        price: item.price,
        image: item.image,
        confidence: Math.min(item.confidence * 0.8, 0.9), // Cap at 0.9
        reason: `Frequently ordered with ${this.getMainItemNames(mainItems).join(', ')}`
      }));
      
    } catch (error) {
      console.error('Error getting complementary items:', error);
      return [];
    }
  }

  /**
   * Get trending/popular items
   */
  static async getTrendingItems(tenantId: string): Promise<RecommendationItem[]> {
    try {
      const [trendingData] = await db.execute(`
        SELECT 
          mi.id,
          mi.name,
          mi.category,
          mi.price,
          mi.image,
          COUNT(oi.id) as order_count,
          AVG(or_rating.rating) as avg_rating
        FROM menu_items mi
        JOIN order_items oi ON mi.id = oi.menu_item_id
        JOIN orders o ON oi.order_id = o.id
        LEFT JOIN order_ratings or_rating ON o.id = or_rating.order_id
        WHERE mi.tenant_id = ?
          AND mi.is_available = 1
          AND o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY mi.id
        HAVING order_count >= 5
        ORDER BY order_count DESC, avg_rating DESC
        LIMIT 8
      `, [tenantId]);

      return (trendingData as any[]).map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        price: item.price,
        image: item.image,
        confidence: 0.6, // Medium confidence for trending items
        reason: `Popular choice - ordered ${item.order_count} times this month`
      }));
      
    } catch (error) {
      console.error('Error getting trending items:', error);
      return [];
    }
  }

  /**
   * Get customer's order pattern and preferences
   */
  private static async getCustomerOrderPattern(
    customerId: string, 
    tenantId: string
  ): Promise<CustomerOrderPattern> {
    try {
      // Get customer's frequent items
      const [frequentItems] = await db.execute(`
        SELECT 
          mi.id,
          mi.name,
          mi.category,
          COUNT(*) as frequency
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        JOIN menu_items mi ON oi.menu_item_id = mi.id
        WHERE o.customer_id = ? AND o.tenant_id = ?
        GROUP BY mi.id
        ORDER BY frequency DESC
        LIMIT 10
      `, [customerId, tenantId]);

      // Get customer preferences
      const [preferences] = await db.execute(
        'SELECT dietary_preferences FROM customer_preferences WHERE customer_id = ? AND tenant_id = ?',
        [customerId, tenantId]
      );

      // Get last order items
      const [lastOrder] = await db.execute(`
        SELECT mi.id, mi.name
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        JOIN menu_items mi ON oi.menu_item_id = mi.id
        WHERE o.customer_id = ? AND o.tenant_id = ?
        ORDER BY o.created_at DESC
        LIMIT 1
      `, [customerId, tenantId]);

      const dietaryPrefs = (preferences as any[])[0] ? 
        JSON.parse((preferences as any[])[0].dietary_preferences || '[]') : [];

      return {
        customerId,
        frequentItems: (frequentItems as any[]).map(item => item.id),
        preferredCategories: [...new Set((frequentItems as any[]).map(item => item.category))],
        averageOrderValue: 0, // Would calculate from order history
        dietaryPreferences: dietaryPrefs,
        lastOrderItems: (lastOrder as any[]).map(item => item.id)
      };
      
    } catch (error) {
      console.error('Error getting customer pattern:', error);
      return {
        customerId,
        frequentItems: [],
        preferredCategories: [],
        averageOrderValue: 0,
        dietaryPreferences: [],
        lastOrderItems: []
      };
    }
  }

  /**
   * Get personalized recommendations based on order history
   */
  private static async getPersonalizedFromHistory(
    pattern: CustomerOrderPattern, 
    tenantId: string
  ): Promise<RecommendationItem[]> {
    if (pattern.frequentItems.length === 0) return [];
    
    try {
      const [items] = await db.execute(`
        SELECT 
          mi.id,
          mi.name,
          mi.category,
          mi.price,
          mi.image
        FROM menu_items mi
        WHERE mi.tenant_id = ?
          AND mi.is_available = 1
          AND mi.category IN (${pattern.preferredCategories.map(() => '?').join(',') || "''"})
          AND mi.id NOT IN (${pattern.frequentItems.map(() => '?').join(',') || "''"})
        ORDER BY RAND()
        LIMIT 5
      `, [tenantId, ...pattern.preferredCategories, ...pattern.frequentItems]);

      return (items as any[]).map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        price: item.price,
        image: item.image,
        confidence: 0.7,
        reason: `Based on your preference for ${item.category.toLowerCase()}`
      }));
      
    } catch (error) {
      console.error('Error getting personalized recommendations:', error);
      return [];
    }
  }

  /**
   * Get items compatible with dietary preferences
   */
  private static async getDietaryCompatibleItems(
    dietaryPreferences: string[], 
    tenantId: string
  ): Promise<RecommendationItem[]> {
    if (dietaryPreferences.length === 0) return [];
    
    try {
      const [items] = await db.execute(`
        SELECT 
          mi.id,
          mi.name,
          mi.category,
          mi.price,
          mi.image,
          mi.dietary_info
        FROM menu_items mi
        WHERE mi.tenant_id = ?
          AND mi.is_available = 1
          AND JSON_OVERLAPS(mi.dietary_info, ?)
        ORDER BY RAND()
        LIMIT 3
      `, [tenantId, JSON.stringify(dietaryPreferences)]);

      return (items as any[]).map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        price: item.price,
        image: item.image,
        confidence: 0.8,
        reason: `Matches your dietary preferences`
      }));
      
    } catch (error) {
      console.error('Error getting dietary compatible items:', error);
      return [];
    }
  }

  /**
   * Remove duplicates and items already in cart
   */
  private static removeDuplicatesAndCartItems(
    items: RecommendationItem[], 
    cartItems: string[]
  ): RecommendationItem[] {
    const seen = new Set(cartItems);
    return items.filter(item => {
      if (seen.has(item.id)) {
        return false;
      }
      seen.add(item.id);
      return true;
    });
  }

  /**
   * Helper to get main item names (would normally query database)
   */
  private static getMainItemNames(itemIds: string[]): string[] {
    // This would normally query the database for actual names
    return itemIds.map(id => `Item ${id.slice(-4)}`);
  }

  /**
   * Track recommendation interaction for learning
   */
  static async trackRecommendationInteraction(
    customerId: string,
    tenantId: string,
    recommendedItemId: string,
    action: 'viewed' | 'clicked' | 'added' | 'dismissed'
  ): Promise<void> {
    try {
      await db.execute(`
        INSERT INTO recommendation_interactions 
        (customer_id, tenant_id, recommended_item_id, action, created_at)
        VALUES (?, ?, ?, ?, NOW())
      `, [customerId, tenantId, recommendedItemId, action]);
    } catch (error) {
      console.error('Error tracking recommendation interaction:', error);
    }
  }

  /**
   * Get recommendation performance analytics
   */
  static async getRecommendationAnalytics(
    tenantId: string,
    dateRange: number = 30
  ): Promise<any> {
    try {
      const [analytics] = await db.execute(`
        SELECT 
          COUNT(*) as total_recommendations,
          COUNT(CASE WHEN action = 'clicked' THEN 1 END) as clicks,
          COUNT(CASE WHEN action = 'added' THEN 1 END) as conversions,
          (COUNT(CASE WHEN action = 'clicked' THEN 1 END) / COUNT(*)) * 100 as click_rate,
          (COUNT(CASE WHEN action = 'added' THEN 1 END) / COUNT(*)) * 100 as conversion_rate
        FROM recommendation_interactions
        WHERE tenant_id = ?
          AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      `, [tenantId, dateRange]);

      return (analytics as any[])[0] || {
        total_recommendations: 0,
        clicks: 0,
        conversions: 0,
        click_rate: 0,
        conversion_rate: 0
      };
    } catch (error) {
      console.error('Error getting recommendation analytics:', error);
      return null;
    }
  }
}
