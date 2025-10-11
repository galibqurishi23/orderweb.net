import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

class DatabaseSetup {
    private connection: mysql.Connection | null = null;

    async connect(): Promise<boolean> {
        try {
            // Try to connect with environment variables
            this.connection = await mysql.createConnection({
                host: process.env.DB_HOST || process.env.DATABASE_HOST || 'localhost',
                port: Number(process.env.DB_PORT || process.env.DATABASE_PORT) || 3306,
                user: process.env.DB_USER || process.env.DATABASE_USER || 'root',
                password: process.env.DB_PASSWORD || process.env.DATABASE_PASSWORD || '',
                multipleStatements: true,
                charset: 'utf8mb4'
            });

            console.log('✅ Database connection established');
            return true;
        } catch (error) {
            console.error('❌ Database connection failed:', error instanceof Error ? error.message : 'Unknown error');
            return false;
        }
    }

    async createDatabase(): Promise<boolean> {
        const dbName = process.env.DB_NAME || process.env.DATABASE_NAME || 'dinedesk_db';
        
        try {
            // Create database if it doesn't exist
            await this.connection!.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
            
            // Use the database
            await this.connection!.execute(`USE \`${dbName}\``);
            
            console.log(`✅ Database '${dbName}' created/selected`);
            return true;
        } catch (error) {
            console.error('❌ Database creation failed:', error instanceof Error ? error.message : 'Unknown error');
            return false;
        }
    }

    async createTables(): Promise<boolean> {
        const tables = [
            // Super admin users table
            `CREATE TABLE IF NOT EXISTS super_admin_users (
                id VARCHAR(255) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

            // Tenants table
            `CREATE TABLE IF NOT EXISTS tenants (
                id VARCHAR(255) PRIMARY KEY,
                slug VARCHAR(255) UNIQUE NOT NULL,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                phone VARCHAR(20),
                address TEXT,
                status ENUM('active', 'inactive', 'suspended', 'trial') DEFAULT 'trial',
                subscription_plan VARCHAR(50) DEFAULT 'starter',
                subscription_status ENUM('active', 'trialing', 'past_due', 'canceled', 'unpaid') DEFAULT 'trialing',
                trial_ends_at TIMESTAMP NULL,
                smtp_host VARCHAR(255),
                smtp_port INT DEFAULT 587,
                smtp_secure TINYINT(1) DEFAULT 0,
                smtp_user VARCHAR(255),
                smtp_password VARCHAR(255),
                smtp_from VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

            // Tenant users table
            `CREATE TABLE IF NOT EXISTS tenant_users (
                id VARCHAR(255) PRIMARY KEY,
                tenant_id VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                password VARCHAR(255) NOT NULL,
                role ENUM('admin', 'manager', 'staff') DEFAULT 'admin',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
                UNIQUE KEY unique_tenant_email (tenant_id, email)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

            // Categories table
            `CREATE TABLE IF NOT EXISTS categories (
                id VARCHAR(255) PRIMARY KEY,
                tenant_id VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                active TINYINT(1) DEFAULT 1,
                display_order INT DEFAULT 0,
                parentId VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                image LONGTEXT,
                icon VARCHAR(50),
                color VARCHAR(7),
                FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
                FOREIGN KEY (parentId) REFERENCES categories(id) ON DELETE SET NULL,
                INDEX idx_tenant_categories (tenant_id),
                INDEX idx_category_parent (parentId)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

            // Menu items table
            `CREATE TABLE IF NOT EXISTS menu_items (
                id VARCHAR(255) PRIMARY KEY,
                tenant_id VARCHAR(255) NOT NULL,
                category_id VARCHAR(255),
                name VARCHAR(255) NOT NULL,
                description TEXT,
                price DECIMAL(10, 2) NOT NULL,
                image LONGTEXT,
                image_hint VARCHAR(255),
                available TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
                FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
                INDEX idx_tenant_menu_items (tenant_id),
                INDEX idx_menu_item_category (category_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

            // Menu item variants table
            `CREATE TABLE IF NOT EXISTS menu_item_variants (
                id VARCHAR(255) PRIMARY KEY,
                menu_item_id VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                price DECIMAL(10, 2) NOT NULL,
                available TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
                INDEX idx_variant_menu_item (menu_item_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

            // Orders table
            `CREATE TABLE IF NOT EXISTS orders (
                id VARCHAR(255) PRIMARY KEY,
                tenant_id VARCHAR(255) NOT NULL,
                order_number VARCHAR(50) NOT NULL,
                customer_name VARCHAR(255) NOT NULL,
                customer_email VARCHAR(255),
                customer_phone VARCHAR(20),
                total_amount DECIMAL(10, 2) NOT NULL,
                status ENUM('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled') DEFAULT 'pending',
                order_type ENUM('delivery', 'pickup', 'dine_in') DEFAULT 'delivery',
                payment_method ENUM('cash', 'card', 'online') DEFAULT 'cash',
                payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
                notes TEXT,
                delivery_address TEXT,
                delivery_fee DECIMAL(10, 2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
                INDEX idx_tenant_orders (tenant_id),
                INDEX idx_order_status (status),
                INDEX idx_order_number (order_number)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

            // Order items table
            `CREATE TABLE IF NOT EXISTS order_items (
                id VARCHAR(255) PRIMARY KEY,
                order_id VARCHAR(255) NOT NULL,
                menu_item_id VARCHAR(255) NOT NULL,
                variant_id VARCHAR(255) NULL,
                quantity INT NOT NULL DEFAULT 1,
                price DECIMAL(10, 2) NOT NULL,
                total DECIMAL(10, 2) NOT NULL,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
                FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
                FOREIGN KEY (variant_id) REFERENCES menu_item_variants(id) ON DELETE SET NULL,
                INDEX idx_order_items (order_id),
                INDEX idx_order_menu_item (menu_item_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

            // Restaurant settings table
            `CREATE TABLE IF NOT EXISTS restaurant_settings (
                id VARCHAR(255) PRIMARY KEY,
                tenant_id VARCHAR(255) NOT NULL,
                settings JSON NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
                UNIQUE KEY unique_tenant_settings (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

            // Allergens table
            `CREATE TABLE IF NOT EXISTS allergens (
                id VARCHAR(255) PRIMARY KEY,
                tenant_id VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                icon VARCHAR(50),
                color VARCHAR(7),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
                UNIQUE KEY unique_tenant_allergen (tenant_id, name)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

            // Menu item allergens table
            `CREATE TABLE IF NOT EXISTS menu_item_allergens (
                id VARCHAR(255) PRIMARY KEY,
                menu_item_id VARCHAR(255) NOT NULL,
                allergen_id VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
                FOREIGN KEY (allergen_id) REFERENCES allergens(id) ON DELETE CASCADE,
                UNIQUE KEY unique_menu_item_allergen (menu_item_id, allergen_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

            // Delivery zones table
            `CREATE TABLE IF NOT EXISTS delivery_zones (
                id VARCHAR(255) PRIMARY KEY,
                tenant_id VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                postcodes TEXT NOT NULL,
                delivery_fee DECIMAL(10, 2) DEFAULT 0,
                minimum_order DECIMAL(10, 2) DEFAULT 0,
                active TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
                INDEX idx_tenant_zones (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

            // Vouchers table
            `CREATE TABLE IF NOT EXISTS vouchers (
                id VARCHAR(255) PRIMARY KEY,
                tenant_id VARCHAR(255) NOT NULL,
                code VARCHAR(50) NOT NULL,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                discount_type ENUM('percentage', 'fixed') NOT NULL,
                discount_value DECIMAL(10, 2) NOT NULL,
                minimum_order DECIMAL(10, 2) DEFAULT 0,
                usage_limit INT DEFAULT NULL,
                used_count INT DEFAULT 0,
                active TINYINT(1) DEFAULT 1,
                valid_from TIMESTAMP NULL,
                valid_to TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
                UNIQUE KEY unique_tenant_voucher_code (tenant_id, code),
                INDEX idx_tenant_vouchers (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

            // Email templates table
            `CREATE TABLE IF NOT EXISTS email_templates (
                id VARCHAR(255) PRIMARY KEY,
                tenant_id VARCHAR(255) NOT NULL,
                template_type ENUM('order_confirmation', 'order_complete', 'restaurant_notification') NOT NULL,
                subject VARCHAR(255) NOT NULL,
                html_content TEXT NOT NULL,
                variables JSON,
                active TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
                UNIQUE KEY unique_tenant_template (tenant_id, template_type),
                INDEX idx_tenant_templates (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

            // Order feedback table
            `CREATE TABLE IF NOT EXISTS order_feedback (
                id VARCHAR(255) PRIMARY KEY,
                order_id VARCHAR(255) NOT NULL,
                tenant_id VARCHAR(255) NOT NULL,
                customer_email VARCHAR(255) NOT NULL,
                customer_name VARCHAR(255),
                rating INT(1) NOT NULL CHECK (rating >= 1 AND rating <= 5),
                review TEXT,
                feedback_token VARCHAR(255) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
                FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
                INDEX idx_tenant_feedback (tenant_id),
                INDEX idx_order_feedback (order_id),
                INDEX idx_feedback_token (feedback_token)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

            // Email logs table
            `CREATE TABLE IF NOT EXISTS email_logs (
                id VARCHAR(255) PRIMARY KEY,
                tenant_id VARCHAR(255) NOT NULL,
                order_id VARCHAR(255),
                email_type ENUM('order_confirmation', 'order_complete', 'restaurant_notification') NOT NULL,
                recipient_email VARCHAR(255) NOT NULL,
                subject VARCHAR(255) NOT NULL,
                status ENUM('sent', 'failed', 'pending') DEFAULT 'pending',
                sent_at TIMESTAMP NULL,
                error_message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
                INDEX idx_tenant_email_logs (tenant_id),
                INDEX idx_order_email_logs (order_id),
                INDEX idx_email_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
        ];

        try {
            for (const table of tables) {
                await this.connection!.execute(table);
            }
            console.log('✅ All database tables created successfully');
            return true;
        } catch (error) {
            console.error('❌ Table creation failed:', error instanceof Error ? error.message : 'Unknown error');
            return false;
        }
    }

    async createDefaultSuperAdmin(): Promise<boolean> {
        try {
            // Check if super admin already exists
            const [existing] = await this.connection!.execute(
                'SELECT id FROM super_admin_users LIMIT 1'
            ) as [any[], any];

            if (existing.length > 0) {
                console.log('✅ Super admin already exists');
                return true;
            }

            // Create default super admin
            const adminId = uuidv4();
            const adminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@dinedesk.com';
            const adminPassword = process.env.SUPER_ADMIN_PASSWORD || 'admin123456';
            const hashedPassword = await bcrypt.hash(adminPassword, 10);

            await this.connection!.execute(
                'INSERT INTO super_admin_users (id, name, email, password) VALUES (?, ?, ?, ?)',
                [adminId, 'Super Admin', adminEmail, hashedPassword]
            );

            console.log('✅ Default super admin created');
            console.log(`📧 Email: ${adminEmail}`);
            console.log(`🔑 Password: ${adminPassword}`);
            console.log('⚠️  Please change the default password after first login!');
            return true;
        } catch (error) {
            console.error('❌ Super admin creation failed:', error instanceof Error ? error.message : 'Unknown error');
            return false;
        }
    }

    async close(): Promise<void> {
        if (this.connection) {
            await this.connection.end();
            console.log('✅ Database connection closed');
        }
    }

    async setupDatabase(): Promise<boolean> {
        console.log('🚀 Starting automatic database setup...');
        
        try {
            // Connect to database
            const connected = await this.connect();
            if (!connected) return false;

            // Create database
            const dbCreated = await this.createDatabase();
            if (!dbCreated) return false;

            // Create all tables
            const tablesCreated = await this.createTables();
            if (!tablesCreated) return false;

            // Create default super admin
            const adminCreated = await this.createDefaultSuperAdmin();
            if (!adminCreated) return false;

            console.log('🎉 Database setup completed successfully!');
            console.log('');
            console.log('🌟 Your restaurant ordering system is ready!');
            console.log('📍 Super Admin Access: /super-admin');
            console.log('📍 Health Check: /api/health');
            console.log('');
            
            return true;
        } catch (error) {
            console.error('❌ Database setup failed:', error instanceof Error ? error.message : 'Unknown error');
            return false;
        } finally {
            await this.close();
        }
    }
}

export default DatabaseSetup;
