// Phase 2: Component Management Service for MariaDB
// Database operations for component templates and mixed items

import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import {
  ComponentTemplate,
  TemplateComponent,
  ItemComponent,
  CommonComponent,
  CreateComponentTemplateRequest,
  CreateTemplateComponentRequest,
  CreateItemComponentRequest,
  UpdateItemComponentRequest,
  ApplyTemplateRequest,
  ComponentType,
  MixedMenuItem
} from './component-types';

// Database connection (replace with your actual connection)
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: process.env.DB_PASSWORD || '',
  database: 'dinedesk_db',
  charset: 'utf8mb4'
};

export class ComponentService {
  private async getConnection() {
    return await mysql.createConnection(dbConfig);
  }

  // Component Templates Management
  async createComponentTemplate(
    tenantId: string,
    request: CreateComponentTemplateRequest
  ): Promise<ComponentTemplate> {
    const connection = await this.getConnection();
    const templateId = uuidv4();

    try {
      await connection.beginTransaction();

      // Create template
      await connection.execute(
        `INSERT INTO component_templates (id, tenant_id, template_name, description) 
         VALUES (?, ?, ?, ?)`,
        [templateId, tenantId, request.templateName, request.description]
      );

      // Create template components
      for (const component of request.components) {
        await connection.execute(
          `INSERT INTO template_components 
           (id, template_id, component_name, default_cost, vat_rate, component_type, display_order)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            uuidv4(),
            templateId,
            component.componentName,
            component.defaultCost,
            component.vatRate,
            component.componentType,
            component.displayOrder
          ]
        );
      }

      await connection.commit();

      // Return the created template
      const template = await this.getComponentTemplate(templateId);
      return template!;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      await connection.end();
    }
  }

  async getComponentTemplates(tenantId: string): Promise<ComponentTemplate[]> {
    const connection = await this.getConnection();
    
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM component_templates 
         WHERE tenant_id = ? AND is_active = TRUE 
         ORDER BY template_name`,
        [tenantId]
      );

      return (rows as any[]).map(row => ({
        id: row.id,
        tenantId: row.tenant_id,
        templateName: row.template_name,
        description: row.description,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } finally {
      await connection.end();
    }
  }

  async getComponentTemplate(templateId: string): Promise<ComponentTemplate | null> {
    const connection = await this.getConnection();
    
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM component_templates WHERE id = ?',
        [templateId]
      );

      const templates = rows as any[];
      if (templates.length === 0) return null;

      const row = templates[0];
      return {
        id: row.id,
        tenantId: row.tenant_id,
        templateName: row.template_name,
        description: row.description,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } finally {
      await connection.end();
    }
  }

  async getTemplateComponents(templateId: string): Promise<TemplateComponent[]> {
    const connection = await this.getConnection();
    
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM template_components 
         WHERE template_id = ? 
         ORDER BY display_order`,
        [templateId]
      );

      return (rows as any[]).map(row => ({
        id: row.id,
        templateId: row.template_id,
        componentName: row.component_name,
        defaultCost: parseFloat(row.default_cost),
        vatRate: parseFloat(row.vat_rate),
        componentType: row.component_type as ComponentType,
        displayOrder: row.display_order,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } finally {
      await connection.end();
    }
  }

  // Item Components Management
  async addComponentsToMenuItem(
    menuItemId: string,
    components: CreateItemComponentRequest[]
  ): Promise<ItemComponent[]> {
    const connection = await this.getConnection();

    try {
      await connection.beginTransaction();

      const createdComponents: ItemComponent[] = [];

      for (const component of components) {
        const componentId = uuidv4();
        
        await connection.execute(
          `INSERT INTO item_components 
           (id, menu_item_id, component_name, component_cost, vat_rate, component_type, display_order)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            componentId,
            menuItemId,
            component.componentName,
            component.componentCost,
            component.vatRate,
            component.componentType,
            component.displayOrder
          ]
        );

        createdComponents.push({
          id: componentId,
          menuItemId,
          componentName: component.componentName,
          componentCost: component.componentCost,
          vatRate: component.vatRate,
          componentType: component.componentType,
          isActive: true,
          displayOrder: component.displayOrder,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      await connection.commit();
      return createdComponents;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      await connection.end();
    }
  }

  async getItemComponents(menuItemId: string): Promise<ItemComponent[]> {
    const connection = await this.getConnection();
    
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM item_components 
         WHERE menu_item_id = ? AND is_active = TRUE 
         ORDER BY display_order`,
        [menuItemId]
      );

      return (rows as any[]).map(row => ({
        id: row.id,
        menuItemId: row.menu_item_id,
        componentName: row.component_name,
        componentCost: parseFloat(row.component_cost),
        vatRate: parseFloat(row.vat_rate),
        componentType: row.component_type as ComponentType,
        isActive: row.is_active,
        displayOrder: row.display_order,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } finally {
      await connection.end();
    }
  }

  async updateItemComponent(
    componentId: string,
    request: UpdateItemComponentRequest
  ): Promise<ItemComponent | null> {
    const connection = await this.getConnection();

    try {
      const updateFields: string[] = [];
      const updateValues: any[] = [];

      if (request.componentName !== undefined) {
        updateFields.push('component_name = ?');
        updateValues.push(request.componentName);
      }
      if (request.componentCost !== undefined) {
        updateFields.push('component_cost = ?');
        updateValues.push(request.componentCost);
      }
      if (request.vatRate !== undefined) {
        updateFields.push('vat_rate = ?');
        updateValues.push(request.vatRate);
      }
      if (request.componentType !== undefined) {
        updateFields.push('component_type = ?');
        updateValues.push(request.componentType);
      }
      if (request.isActive !== undefined) {
        updateFields.push('is_active = ?');
        updateValues.push(request.isActive);
      }
      if (request.displayOrder !== undefined) {
        updateFields.push('display_order = ?');
        updateValues.push(request.displayOrder);
      }

      if (updateFields.length === 0) {
        return null;
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      updateValues.push(componentId);

      await connection.execute(
        `UPDATE item_components SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      // Return updated component
      const [rows] = await connection.execute(
        'SELECT * FROM item_components WHERE id = ?',
        [componentId]
      );

      const components = rows as any[];
      if (components.length === 0) return null;

      const row = components[0];
      return {
        id: row.id,
        menuItemId: row.menu_item_id,
        componentName: row.component_name,
        componentCost: parseFloat(row.component_cost),
        vatRate: parseFloat(row.vat_rate),
        componentType: row.component_type as ComponentType,
        isActive: row.is_active,
        displayOrder: row.display_order,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } finally {
      await connection.end();
    }
  }

  // Template Application
  async applyTemplateToMenuItem(request: ApplyTemplateRequest): Promise<ItemComponent[]> {
    const connection = await this.getConnection();

    try {
      // Get template components
      const templateComponents = await this.getTemplateComponents(request.templateId);
      
      // Convert to item components with adjustments
      const itemComponents: CreateItemComponentRequest[] = templateComponents.map(tc => {
        const adjustment = request.adjustments?.find(adj => adj.componentName === tc.componentName);
        
        if (adjustment?.exclude) return null;

        return {
          componentName: tc.componentName,
          componentCost: adjustment?.newCost ?? tc.defaultCost,
          vatRate: adjustment?.newVatRate ?? tc.vatRate,
          componentType: tc.componentType,
          displayOrder: tc.displayOrder
        };
      }).filter(Boolean) as CreateItemComponentRequest[];

      // Add components to menu item
      return await this.addComponentsToMenuItem(request.menuItemId, itemComponents);
    } finally {
      await connection.end();
    }
  }

  // Common Components Management
  async getCommonComponents(tenantId: string): Promise<CommonComponent[]> {
    const connection = await this.getConnection();
    
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM common_components 
         WHERE tenant_id = ? AND is_active = TRUE 
         ORDER BY usage_count DESC, component_name`,
        [tenantId]
      );

      return (rows as any[]).map(row => ({
        id: row.id,
        tenantId: row.tenant_id,
        componentName: row.component_name,
        averageCost: parseFloat(row.average_cost),
        vatRate: parseFloat(row.vat_rate),
        componentType: row.component_type as ComponentType,
        usageCount: row.usage_count,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } finally {
      await connection.end();
    }
  }

  async incrementComponentUsage(tenantId: string, componentName: string): Promise<void> {
    const connection = await this.getConnection();
    
    try {
      await connection.execute(
        `UPDATE common_components 
         SET usage_count = usage_count + 1 
         WHERE tenant_id = ? AND component_name = ?`,
        [tenantId, componentName]
      );
    } finally {
      await connection.end();
    }
  }

  // Mixed Item Operations
  async markItemAsMixed(menuItemId: string): Promise<void> {
    const connection = await this.getConnection();
    
    try {
      await connection.execute(
        `UPDATE menu_items 
         SET vat_notes = CONCAT(COALESCE(vat_notes, ''), ' [MIXED_ITEM]')
         WHERE id = ?`,
        [menuItemId]
      );
    } finally {
      await connection.end();
    }
  }

  async getMixedMenuItems(tenantId: string): Promise<string[]> {
    const connection = await this.getConnection();
    
    try {
      const [rows] = await connection.execute(
        `SELECT DISTINCT mi.id 
         FROM menu_items mi 
         INNER JOIN item_components ic ON mi.id = ic.menu_item_id 
         WHERE mi.tenant_id = ? AND ic.is_active = TRUE`,
        [tenantId]
      );

      return (rows as any[]).map(row => row.id);
    } finally {
      await connection.end();
    }
  }
}
