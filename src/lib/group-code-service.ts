import crypto from 'crypto';
import db from '@/lib/db';

interface GroupCodeResult {
  success: boolean;
  groupCode?: string;
  groupId?: string;
  error?: string;
}

interface RestaurantGroup {
  id: string;
  group_name: string;
  group_code: string;
  created_by: string;
  created_at: Date;
  restaurants: Array<{
    id: string;
    name: string;
    joined_at: Date;
    is_admin: boolean;
  }>;
}

export class GroupCodeService {
  
  /**
   * Generate a unique 6-character group code
   */
  static generateGroupCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Create a new restaurant group with unique code
   */
  static async createGroup(
    groupName: string, 
    creatorTenantId: string,
    createdBy: string
  ): Promise<GroupCodeResult> {
    try {
      // Generate unique group code
      let groupCode: string;
      let isUnique = false;
      let attempts = 0;
      const maxAttempts = 10;

      do {
        groupCode = this.generateGroupCode();
        const [existing] = await db.execute(
          'SELECT id FROM restaurant_groups WHERE group_code = ?',
          [groupCode]
        );
        isUnique = (existing as any[]).length === 0;
        attempts++;
      } while (!isUnique && attempts < maxAttempts);

      if (!isUnique) {
        return { success: false, error: 'Failed to generate unique group code. Please try again.' };
      }

      // Create group
      const groupId = crypto.randomUUID();
      await db.execute(
        `INSERT INTO restaurant_groups (id, group_name, group_code, created_by, created_at) 
         VALUES (?, ?, ?, ?, NOW())`,
        [groupId, groupName, groupCode!, creatorTenantId]
      );

      // Add creator as admin member
      await db.execute(
        `INSERT INTO restaurant_group_members (group_id, tenant_id, is_admin, joined_at) 
         VALUES (?, ?, true, NOW())`,
        [groupId, creatorTenantId]
      );

      return {
        success: true,
        groupCode: groupCode!,
        groupId: groupId
      };

    } catch (error) {
      console.error('Create group error:', error);
      return { success: false, error: 'Failed to create group. Please try again.' };
    }
  }

  /**
   * Join a group using group code
   */
  static async joinGroup(
    groupCode: string, 
    tenantId: string
  ): Promise<GroupCodeResult> {
    try {
      // Find group by code
      const [groups] = await db.execute(
        'SELECT id, group_name FROM restaurant_groups WHERE group_code = ?',
        [groupCode.toUpperCase()]
      );

      const group = (groups as any[])[0];
      if (!group) {
        return { success: false, error: 'Invalid group code. Please check and try again.' };
      }

      // Check if already a member
      const [existing] = await db.execute(
        'SELECT id FROM restaurant_group_members WHERE group_id = ? AND tenant_id = ?',
        [group.id, tenantId]
      );

      if ((existing as any[]).length > 0) {
        return { success: false, error: 'You are already a member of this group.' };
      }

      // Add as member (not admin)
      await db.execute(
        `INSERT INTO restaurant_group_members (group_id, tenant_id, is_admin, joined_at) 
         VALUES (?, ?, false, NOW())`,
        [group.id, tenantId]
      );

      return {
        success: true,
        groupId: group.id
      };

    } catch (error) {
      console.error('Join group error:', error);
      return { success: false, error: 'Failed to join group. Please try again.' };
    }
  }

  /**
   * Leave a group
   */
  static async leaveGroup(
    groupId: string, 
    tenantId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if user is the creator
      const [groups] = await db.execute(
        'SELECT created_by FROM restaurant_groups WHERE id = ?',
        [groupId]
      );

      const group = (groups as any[])[0];
      if (group?.created_by === tenantId) {
        return { success: false, error: 'Group creator cannot leave. Transfer ownership or delete the group.' };
      }

      // Remove from group
      const [result] = await db.execute(
        'DELETE FROM restaurant_group_members WHERE group_id = ? AND tenant_id = ?',
        [groupId, tenantId]
      );

      if ((result as any).affectedRows === 0) {
        return { success: false, error: 'You are not a member of this group.' };
      }

      return { success: true };

    } catch (error) {
      console.error('Leave group error:', error);
      return { success: false, error: 'Failed to leave group. Please try again.' };
    }
  }

  /**
   * Get group details for a tenant
   */
  static async getGroupForTenant(tenantId: string): Promise<RestaurantGroup | null> {
    try {
      const [groups] = await db.execute(
        `SELECT 
          rg.id, rg.group_name, rg.group_code, rg.created_by, rg.created_at,
          rgm.is_admin
         FROM restaurant_groups rg
         JOIN restaurant_group_members rgm ON rg.id = rgm.group_id
         WHERE rgm.tenant_id = ?`,
        [tenantId]
      );

      const group = (groups as any[])[0];
      if (!group) return null;

      // Get all restaurants in the group
      const [restaurants] = await db.execute(
        `SELECT 
          t.id, t.name, rgm.joined_at, rgm.is_admin
         FROM tenants t
         JOIN restaurant_group_members rgm ON t.id = rgm.tenant_id
         WHERE rgm.group_id = ?
         ORDER BY rgm.joined_at ASC`,
        [group.id]
      );

      return {
        id: group.id,
        group_name: group.group_name,
        group_code: group.group_code,
        created_by: group.created_by,
        created_at: group.created_at,
        restaurants: restaurants as any[]
      };

    } catch (error) {
      console.error('Get group error:', error);
      return null;
    }
  }

  /**
   * Get all restaurants in user's group (for reporting)
   */
  static async getGroupRestaurants(tenantId: string): Promise<string[]> {
    try {
      const [restaurants] = await db.execute(
        `SELECT rgm2.tenant_id
         FROM restaurant_group_members rgm1
         JOIN restaurant_group_members rgm2 ON rgm1.group_id = rgm2.group_id
         WHERE rgm1.tenant_id = ?`,
        [tenantId]
      );

      return (restaurants as any[]).map(r => r.tenant_id);

    } catch (error) {
      console.error('Get group restaurants error:', error);
      return [tenantId]; // Return at least own restaurant
    }
  }

  /**
   * Check if user is group admin
   */
  static async isGroupAdmin(tenantId: string): Promise<boolean> {
    try {
      const [result] = await db.execute(
        'SELECT is_admin FROM restaurant_group_members WHERE tenant_id = ?',
        [tenantId]
      );

      const member = (result as any[])[0];
      return member?.is_admin || false;

    } catch (error) {
      console.error('Check admin error:', error);
      return false;
    }
  }

  /**
   * Validate group code format
   */
  static isValidGroupCode(code: string): boolean {
    return /^[A-Z0-9]{6}$/.test(code);
  }

  /**
   * Delete group (only creator can do this)
   */
  static async deleteGroup(
    groupId: string, 
    tenantId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if user is the creator
      const [groups] = await db.execute(
        'SELECT created_by FROM restaurant_groups WHERE id = ?',
        [groupId]
      );

      const group = (groups as any[])[0];
      if (!group) {
        return { success: false, error: 'Group not found.' };
      }

      if (group.created_by !== tenantId) {
        return { success: false, error: 'Only the group creator can delete the group.' };
      }

      // Delete all members first
      await db.execute(
        'DELETE FROM restaurant_group_members WHERE group_id = ?',
        [groupId]
      );

      // Delete group
      await db.execute(
        'DELETE FROM restaurant_groups WHERE id = ?',
        [groupId]
      );

      return { success: true };

    } catch (error) {
      console.error('Delete group error:', error);
      return { success: false, error: 'Failed to delete group. Please try again.' };
    }
  }

  /**
   * Update group name (only creator can do this)
   */
  static async updateGroupName(
    groupId: string, 
    tenantId: string, 
    newName: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if user is the creator
      const [groups] = await db.execute(
        'SELECT created_by FROM restaurant_groups WHERE id = ?',
        [groupId]
      );

      const group = (groups as any[])[0];
      if (!group) {
        return { success: false, error: 'Group not found.' };
      }

      if (group.created_by !== tenantId) {
        return { success: false, error: 'Only the group creator can update the group name.' };
      }

      // Update name
      await db.execute(
        'UPDATE restaurant_groups SET group_name = ? WHERE id = ?',
        [newName, groupId]
      );

      return { success: true };

    } catch (error) {
      console.error('Update group name error:', error);
      return { success: false, error: 'Failed to update group name. Please try again.' };
    }
  }
}
